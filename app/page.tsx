"use client";
import React, { useEffect, useState } from "react";
import DashboardView from "./components/DashboardView";

export default function LogisticsDashboard() {
  const [activeSku, setActiveSku] = useState("A1023");
  const [apiData, setApiData] = useState<any>(null);
  const [streamingAdvice, setStreamingAdvice] = useState("");
  const [loadingCharts, setLoadingCharts] = useState(true);

  const watchlist = ["A1023", "B5842", "C9011"]; 

  useEffect(() => {
    // 1. Reset metrics and show loading hooks when switching SKUs
    setLoadingCharts(true);
    setStreamingAdvice("◈ Connecting to Llama Core streaming port...");
    setApiData(null);

    // 2. Fetch primary static time-series data for the charts
    fetch(`http://127.0.0.1:8000/api/forecast?sku=${activeSku}`)
      .then(res => {
        if (!res.ok) throw new Error("API Data handshake blocked.");
        return res.json();
      })
      .then(data => {
        setApiData(data);
        setLoadingCharts(false);
        
        // 3. Trigger the dynamic live stream immediately after charts load
        triggerAdviceStream(activeSku);
      })
      .catch(err => {
        console.error("Pipeline failure:", err);
        setLoadingCharts(false);
        setStreamingAdvice("❌ Data orchestration pipeline offline.");
      });
  }, [activeSku]);

  // Consumes chunked transmission blocks from /api/stream down the wire
  const triggerAdviceStream = async (skuId: string) => {
    try {
      setStreamingAdvice(""); // Clear loading text container
      const response = await fetch(`http://127.0.0.1:8000/api/stream?sku=${skuId}`);
      
      if (!response.body) {
        setStreamingAdvice("⚠️ Stream channel broken or unreachable.");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let textBuffer = "";

      // Asynchronous data block loop reads packets live
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Turn raw bytes back to visible letters and update React state instantly
        const chunk = decoder.decode(value, { stream: true });
        textBuffer += chunk;
        setStreamingAdvice(textBuffer);
      }
    } catch (error) {
      console.error("Streaming error:", error);
      setStreamingAdvice("⚠️ Advisory stream interrupted.");
    }
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-mark">◈ ORACLE</span>
          <span className="logo-name">LOGISTICS</span>
        </div>
        
        <div className="sku-list" style={{ marginTop: "20px" }}>
          <div className="nav-label">CSV SKU Watchlist</div>
          {watchlist.map(skuId => (
            <div 
              key={skuId} 
              className={`sku-item ${activeSku === skuId ? "selected" : ""}`}
              onClick={() => setActiveSku(skuId)}
              style={{ padding: "12px", cursor: "pointer", border: "1px solid var(--border)", borderRadius: "8px", margin: "6px 0" }}
            >
              <span className="mono" style={{ fontWeight: 700, color: "var(--text)" }}>{skuId}</span>
            </div>
          ))}
        </div>
      </aside>

      <main className="main">
        {loadingCharts ? (
          <div className="loading-box">▶ ANALYZING TIME-SERIES MATRIX FOR {activeSku}...</div>
        ) : apiData ? (
          <DashboardView 
            skuId={apiData.sku_id}
            stock={150} 
            usedUnits={Math.round(apiData.avg_daily_sales * 7)} 
            avgSales={apiData.avg_daily_sales}
            daysToStockout={apiData.days_until_stockout}
            weeklyDistribution={apiData.weekly_distribution || []}
            forecastData={apiData.forecast || []}
            // PIPING THE LIVE UPDATING REACTION DATA HERE
            advice={streamingAdvice}
          />
        ) : (
          <div className="loading-box">❌ ENGINE PIPELINE OFFLINE</div>
        )}
      </main>
    </div>
  );
}