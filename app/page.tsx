"use client";
import React, { useEffect, useState } from "react";
import DashboardView from "./components/DashboardView";

export default function LogisticsDashboard() {
  const watchlist = ["A1023", "B5421", "C9011"];
  const [activeSku, setActiveSku] = useState("A1023");

  type ForecastApiResponse = {
    sku_id?: string;
    current_stock?: number;
    avg_daily_sales?: number;
    days_until_stockout?: number;
    weekly_distribution?: Array<{ day: string; sales: number }>;
    forecast?: Array<{
      date: string;
      predicted_units: number;
      lower_bound: number;
      upper_bound: number;
      is_ramadan?: number;
      is_promo?: number;
    }>;
  };

  const [apiData, setApiData] = useState<ForecastApiResponse | null>(null);
  const [adviceText, setAdviceText] = useState("");
  const [loadingCharts, setLoadingCharts] = useState(true);

  const BACKEND_BASE_URL = "http://127.0.0.1:8000";

  // ─── STEP 1: Fetch forecast (charts + KPIs) ───────────────────────────────
  useEffect(() => {
    const requestUrl = `${BACKEND_BASE_URL}/api/forecast?sku=${activeSku}`;

    queueMicrotask(() => {
      setLoadingCharts(true);
      setAdviceText("◈ Querying historical records & generating Llama matrix...");
      setApiData(null);
    });

    fetch(requestUrl)
      .then(async (res) => {
        if (!res.ok) {
          let backendErrorDescription = "Server Connection Dropped";
          try {
            const errorJson = await res.json();
            backendErrorDescription =
              errorJson?.detail || errorJson?.message || JSON.stringify(errorJson);
          } catch {
            backendErrorDescription = `HTTP Error Code: ${res.status}`;
          }
          throw new Error(`Backend returned ${res.status} for ${requestUrl}. ${backendErrorDescription}`);
        }
        return res.json();
      })
      .then((data: ForecastApiResponse) => {
        setApiData(data);
        setLoadingCharts(false);
      })
      .catch((err) => {
        console.error("Forecast pipeline failure:", err);
        setLoadingCharts(false);
        setAdviceText(`❌ Forecast Error: ${err instanceof Error ? err.message : String(err)}`);
      });
  }, [activeSku]);

  // ─── STEP 2: Stream advice from /api/stream once forecast data is ready ───
  useEffect(() => {
    // Wait until forecast data is loaded and we have the metrics we need
    if (!apiData || loadingCharts) return;

    const days = apiData.days_until_stockout ?? 14;
    const stock = apiData.current_stock ?? 150;
    const streamUrl = `${BACKEND_BASE_URL}/api/stream?sku=${activeSku}&days=${days}&stock=${stock}`;

    setAdviceText("◈ Generating Llama advisory...");

    let cancelled = false;

    const streamAdvice = async () => {
      try {
        const response = await fetch(streamUrl);

        if (!response.ok) {
          setAdviceText(`❌ Stream Error: HTTP ${response.status}`);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          setAdviceText("❌ Stream Error: No response body");
          return;
        }

        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setAdviceText(fullText); // live token-by-token update
        }

        // Final decode flush
        if (!cancelled && fullText.trim() === "") {
          setAdviceText("No advice provided by core model.");
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Stream pipeline failure:", err);
          setAdviceText(`❌ Stream Error: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    };

    streamAdvice();

    // Cleanup: cancel stream if SKU changes mid-stream
    return () => {
      cancelled = true;
    };
  }, [apiData, activeSku, loadingCharts]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-mark">◈ ORACLE</span>
          <span className="logo-name">LOGISTICS</span>
        </div>

        <div className="sku-list" style={{ marginTop: "20px" }}>
          <div className="nav-label">CSV SKU Watchlist</div>
          {watchlist.map((skuId) => (
            <div
              key={skuId}
              className={`sku-item ${activeSku === skuId ? "selected" : ""}`}
              onClick={() => setActiveSku(skuId)}
              style={{
                padding: "12px",
                cursor: "pointer",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                margin: "6px 0",
              }}
            >
              <span className="mono" style={{ fontWeight: 700, color: "var(--text)" }}>
                {skuId}
              </span>
            </div>
          ))}
        </div>
      </aside>

      <main className="main">
        {loadingCharts ? (
          <div className="loading-box">
            ▶ ANALYZING TIME-SERIES MATRIX FOR {activeSku}...
          </div>
        ) : apiData && apiData.forecast ? (
          <DashboardView
            skuId={apiData.sku_id ?? ""}
            stock={apiData.current_stock ?? 0}
            usedUnits={Math.round((apiData.avg_daily_sales ?? 0) * 7)}
            avgSales={apiData.avg_daily_sales ?? 0}
            daysToStockout={apiData.days_until_stockout ?? 0}
            weeklyDistribution={apiData.weekly_distribution ?? []}
            forecastData={apiData.forecast ?? []}
            advice={adviceText}
          />
        ) : (
          <div className="loading-box">
            <p>❌ ENGINE PIPELINE ERROR</p>
            <p style={{ fontSize: "12px", color: "red", marginTop: "8px" }}>{adviceText}</p>
          </div>
        )}
      </main>
    </div>
  );
}