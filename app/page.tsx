"use client";
import React, { useEffect, useState } from "react";
import DashboardView from "./components/DashboardView";
import InsightsView from "./components/InsightsView";
import LoadingScreen from "./components/LoadingScreen";

export default function LogisticsDashboard() {
  const watchlist = ["A1023", "B5421", "C9011"];
  const [activeSku, setActiveSku] = useState("A1023");
  const [activeView, setActiveView] = useState<"dashboard" | "insights">("dashboard");

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
    insights_metadata?: {
      ramadan_impact_factor: number;
      promo_impact_factor: number;
    };
  };

  const [apiData, setApiData] = useState<ForecastApiResponse | null>(null);
  const [adviceText, setAdviceText] = useState("");
  const [loadingCharts, setLoadingCharts] = useState(true);

  // Loading screen states
  const [showLoader, setShowLoader] = useState(true);
  const [loaderFading, setLoaderFading] = useState(false);
  const [dashboardVisible, setDashboardVisible] = useState(false);

  const BACKEND_BASE_URL = "http://127.0.0.1:8000";

  // ─── Fetch forecast ───────────────────────────────────────────────
  useEffect(() => {
    if (activeView !== "dashboard") return;

    // Reset loading state on SKU change
    setShowLoader(true);
    setLoaderFading(false);
    setDashboardVisible(false);
    setLoadingCharts(true);
    setAdviceText("◈ Querying records...");
    setApiData(null);

    fetch(`${BACKEND_BASE_URL}/api/forecast?sku=${activeSku}`)
      .then(async (res) => {
        if (!res.ok) {
          const errorJson = await res.json().catch(() => ({}));
          throw new Error(errorJson?.detail || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: ForecastApiResponse) => {
        setApiData(data);
        setLoadingCharts(false);

        // Minimum 2.8s loader for UX then fade out
        setTimeout(() => {
          setLoaderFading(true);
          setTimeout(() => {
            setShowLoader(false);
            setDashboardVisible(true);
          }, 600);
        }, 2800);
      })
      .catch((err) => {
        setLoadingCharts(false);
        setShowLoader(false);
        setDashboardVisible(true);
        setAdviceText(`❌ ${err instanceof Error ? err.message : String(err)}`);
      });
  }, [activeSku, activeView]);

  // ─── Stream Llama advice ──────────────────────────────────────────
  useEffect(() => {
    if (!apiData || loadingCharts || activeView !== "dashboard") return;

    const days = apiData.days_until_stockout ?? 14;
    const stock = apiData.current_stock ?? 150;
    const ramadan = apiData.insights_metadata?.ramadan_impact_factor ?? 1.8;
    const promo = apiData.insights_metadata?.promo_impact_factor ?? 1.3;
    const streamUrl = `${BACKEND_BASE_URL}/api/stream?sku=${activeSku}&days=${days}&stock=${stock}&ramadan_factor=${ramadan}&promo_factor=${promo}`;

    setAdviceText("◈ Generating advisory...");
    let cancelled = false;

    const streamAdvice = async () => {
      try {
        const response = await fetch(streamUrl);
        if (!response.ok) { setAdviceText(`❌ HTTP ${response.status}`); return; }
        const reader = response.body?.getReader();
        if (!reader) { setAdviceText("❌ No response body"); return; }
        const decoder = new TextDecoder();
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          fullText += decoder.decode(value, { stream: true });
          setAdviceText(fullText);
        }
        if (!cancelled && !fullText.trim()) setAdviceText("No advice generated.");
      } catch (err) {
        if (!cancelled) setAdviceText(`❌ ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    streamAdvice();
    return () => { cancelled = true; };
  }, [apiData, activeSku, loadingCharts, activeView]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Syne:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .shell {
          display: flex;
          min-height: 100vh;
          background: #080C10;
          color: #C9D1D9;
        }
        .sidebar {
          width: 220px;
          min-width: 220px;
          background: #0D1117;
          border-right: 1px solid #1C2128;
          padding: 28px 16px;
          display: flex;
          flex-direction: column;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #484F58;
          border: 1px solid transparent;
          transition: all 0.15s ease;
          margin-bottom: 4px;
        }
        .nav-item:hover { color: #8B949E; background: #161B22; }
        .nav-item.active {
          color: #FFAA00;
          background: rgba(255,170,0,0.06);
          border-color: rgba(255,170,0,0.2);
        }
        .sku-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          border: 1px solid #1C2128;
          margin-bottom: 6px;
          transition: all 0.15s ease;
        }
        .sku-item:hover { border-color: #30363D; background: #161B22; }
        .sku-item.active {
          border-color: rgba(0,210,255,0.3);
          background: rgba(0,210,255,0.04);
        }
        .main {
          flex: 1;
          padding: 28px;
          overflow-y: auto;
        }
        .divider { height: 1px; background: #1C2128; margin: 20px 0; }

        /* Loader fade */
        .loader-wrap {
          transition: opacity 0.6s ease;
        }
        .loader-wrap.fading { opacity: 0; }

        /* Dashboard fade in */
        @keyframes dashIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dash-reveal {
          animation: dashIn 0.6s ease forwards;
        }

        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
      `}</style>

      {/* FULL SCREEN LOADER */}
      {showLoader && (
        <div className={`loader-wrap ${loaderFading ? "fading" : ""}`}>
          <LoadingScreen skuId={activeSku} />
        </div>
      )}

      {/* MAIN APP — revealed after loader */}
      {dashboardVisible && (
        <div className="shell dash-reveal">
          <aside className="sidebar">
            {/* Logo */}
            <div style={{ marginBottom: "32px" }}>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: "15px", fontWeight: 800, color: "#FFAA00", letterSpacing: "0.04em" }}>
                ◈ ORACLE
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#30363D", letterSpacing: "0.15em", marginTop: "2px" }}>
                LOGISTICS INTEL
              </div>
            </div>

            {/* Nav */}
            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#30363D", letterSpacing: "0.12em", textTransform: "uppercase", padding: "0 4px", marginBottom: "6px" }}>
                Views
              </div>
              <div className={`nav-item ${activeView === "dashboard" ? "active" : ""}`} onClick={() => setActiveView("dashboard")}>
                ⬡ Dashboard
              </div>
              <div className={`nav-item ${activeView === "insights" ? "active" : ""}`} onClick={() => setActiveView("insights")}>
                ↗ Insights
              </div>
            </div>

            <div className="divider" />

            {/* SKU list */}
            <div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#30363D", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "10px" }}>
                SKU Watchlist
              </div>
              {watchlist.map((skuId) => (
                <div
                  key={skuId}
                  className={`sku-item ${activeSku === skuId ? "active" : ""}`}
                  onClick={() => {
                    setActiveSku(skuId);
                    setActiveView("dashboard");
                  }}
                >
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "12px", fontWeight: 700, color: activeSku === skuId ? "#00D2FF" : "#8B949E" }}>
                    {skuId}
                  </span>
                  {activeSku === skuId && (
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#00D2FF", display: "inline-block", animation: "blink 2s infinite" }} />
                  )}
                </div>
              ))}
            </div>

            {/* Version */}
            <div style={{ marginTop: "auto", paddingTop: "20px" }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#21262D", letterSpacing: "0.1em" }}>
                v2.0 · DUBAI SME ENGINE
              </div>
            </div>
          </aside>

          <main className="main">
            {activeView === "insights" && <InsightsView skuId={activeSku} />}

            {activeView === "dashboard" && (
              <>
                {apiData && apiData.forecast ? (
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
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#FF4444", gap: "8px" }}>
                    <p>❌ PIPELINE ERROR</p>
                    <p style={{ fontSize: "10px", color: "#484F58" }}>{adviceText}</p>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      )}
    </>
  );
}