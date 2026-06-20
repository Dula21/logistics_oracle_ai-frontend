"use client";
import React, { useState, useEffect } from "react";
import DashboardView from "./components/DashboardView";
import InsightsView from "./components/InsightsView";
import LoadingScreen from "./components/LoadingScreen";
import UploadView from "./components/UploadView";
import CompareView from "./components/CompareView";
import HistoryPanel from "./components/HistoryPanel";
import InventoryView from "./components/InventoryView";
import LoginPage from "./components/LoginPage";

type ViewType = "dashboard" | "insights" | "compare" | "upload" | "history"|"inventory";

const ORIGINAL_WATCHLIST = ["A1023", "B5421", "C9011"];
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function Page() {
  const [watchlist, setWatchlist] = useState<string[]>(ORIGINAL_WATCHLIST);
  const [usingCustomCsv, setUsingCustomCsv] = useState(false);
  const [activeFileName, setActiveFileName] = useState("");
  const [activeSku, setActiveSku] = useState("A1023");
  const [activeView, setActiveView] = useState<ViewType>("dashboard");

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
  const [showLoader, setShowLoader] = useState(true);
  const [loaderFading, setLoaderFading] = useState(false);
  const [dashboardVisible, setDashboardVisible] = useState(false);

  // ─── Auth state ───────────────────────────────────────────────────
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");

  const handleLogin = (token: string, role: string, email: string) => {
  setAuthToken(token);
  setUserRole(role);
  setUserEmail(email);
  setDashboardVisible(false);
  setShowLoader(true);
  setLoaderFading(false);
  setActiveView("dashboard");
};

  const handleLogout = () => {
    setAuthToken(null);
    setUserRole("");
    setUserEmail("");
  };

  const handleUploadSuccess = (skus: string[], firstSku: string, fileName?: string) => {
    setTimeout(() => {
      setWatchlist(skus);
      setUsingCustomCsv(true);
      if (fileName) setActiveFileName(fileName);
      setActiveSku(firstSku);
      setActiveView("dashboard");
    }, 0);
  };

  const handleUploadComponentReset = () => {
    setTimeout(() => {
      setWatchlist(ORIGINAL_WATCHLIST);
      setUsingCustomCsv(false);
      setActiveFileName("");
      setActiveSku(ORIGINAL_WATCHLIST[0]);
      setActiveView("dashboard");
    }, 0);
  };

  // ─── Fetch forecast ───────────────────────────────────────────────
  useEffect(() => {
    if (!authToken || activeView !== "dashboard") return;

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
        setTimeout(() => {
          setLoaderFading(true);
          setTimeout(() => {
            setShowLoader(false);
            setDashboardVisible(true);
          }, 600);
        }, 800);
      })
      .catch((err) => {
        setLoadingCharts(false);
        setShowLoader(false);
        setDashboardVisible(true);
        setAdviceText(`❌ ${err instanceof Error ? err.message : String(err)}`);
      });
  }, [activeSku, activeView,authToken]);

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
    (async () => {
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
    })();
    return () => { cancelled = true; };
  }, [apiData, activeSku, loadingCharts, activeView]);

  // ─── Auth gate ──────────────────────────────────────────────────────
  if (!authToken) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const NAV_LABELS: Record<ViewType, string> = {
    dashboard: "⬡ Dashboard",
    insights:  "↗ Insights",
    compare:   "⊞ Compare",
    upload:    "↑ Upload",
    history:   "◷ History",
    inventory: "⬡ Inventory",
  };

  const daysToStockout = apiData?.days_until_stockout ?? 0;
  const statusColor = daysToStockout < 7 ? "#FF4444" : daysToStockout < 15 ? "#FFAA00" : "#00E676";
  const showSkuContext = activeView === "dashboard" || activeView === "insights";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Syne:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .shell {
          display: flex; 
          flex-direction: column;
          min-height: 100vh;
          background: #080C10; 
          color: #E6EDF3;
        }
        
        .body-row { 
          display: flex; 
          flex: 1; 
          overflow: hidden; 
          min-height: 0; 
        }

        .sku-sidebar {
          width: 220px;
          min-width: 220px;
          background: #0D1117;
          border-right: 1px solid #1C2128;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
        }

        .sidebar-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #8B949E;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 14px;
          padding-left: 6px;
          font-weight: 700;
        }
        
        .sku-item {
          display: flex; 
          align-items: center; 
          justify-content: space-between;
          padding: 12px 14px; 
          border-radius: 8px; 
          cursor: pointer;
          border: 1px solid #21262D; 
          background: #080C10;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: #C9D1D9;
          transition: all 0.15s ease;
        }
        .sku-item:hover { border-color: #8B949E; color: #FFFFFF; background: #161B22; }
        .sku-item.active { border-color: #00D2FF; background: rgba(0,210,255,0.08); color: #00D2FF; font-weight: 700; }
        
        .main { 
          flex: 1; 
          padding: 24px; 
          overflow-y: auto; 
        }
        
        .loader-wrap { transition: opacity 0.6s ease; }
        .loader-wrap.fading { opacity: 0; }
        
        @keyframes dashIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dash-reveal { animation: dashIn 0.6s ease forwards; }
        @keyframes pulse-anim { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }

        .app-header {
          min-height: 56px;
          background: #0D1117;
          border-bottom: 1px solid #1C2128;
          display: flex; 
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          position: sticky; 
          top: 0; 
          z-index: 100;
        }
        
        .header-navbar-right {
          display: flex; 
          align-items: center; 
          gap: 6px;
          margin-left: auto;
        }
        
        .header-nav-btn {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; 
          letter-spacing: 0.08em; 
          text-transform: uppercase;
          padding: 6px 12px; 
          border-radius: 6px;
          border: 1px solid transparent;
          background: transparent; 
          color: #C9D1D9;
          cursor: pointer; 
          transition: all 0.15s ease;
        }
        .header-nav-btn:hover { color: #FFFFFF; background: #161B22; }
        .header-nav-btn.active { color: #FFAA00; background: rgba(255,170,0,0.08); border-color: rgba(255,170,0,0.3); font-weight: 700; }

        .app-footer {
          min-height: 44px;
          background: #0D1117;
          border-top: 1px solid #1C2128;
          display: flex; 
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          gap: 16px;
        }
        
        .footer-link {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; 
          letter-spacing: 0.08em;
          text-decoration: none; 
          transition: opacity 0.15s;
        }
        .footer-link:hover { opacity: 0.8; color: #FFFFFF !important; }

        @media (max-width: 1024px) {
          .app-header {
            flex-direction: column;
            align-items: flex-start;
            padding: 16px;
            gap: 16px;
          }
          .header-navbar-right {
            width: 100%;
            margin-left: 0;
            overflow-x: auto;
            padding-bottom: 4px;
            -webkit-overflow-scrolling: touch;
          }
          .header-nav-btn { white-space: nowrap; }
        }

        @media (max-width: 768px) {
          .body-row { flex-direction: column; overflow-y: auto; }
          .sku-sidebar {
            width: 100%;
            min-width: 100%;
            border-right: none;
            border-bottom: 1px solid #1C2128;
            padding: 16px;
            flex-direction: row;
            align-items: center;
            overflow-x: auto;
            gap: 12px;
          }
          .sidebar-title { margin-bottom: 0; padding-left: 0; white-space: nowrap; }
          .sku-item { padding: 8px 14px; white-space: nowrap; }
          .main { padding: 16px; }
          .app-footer { flex-direction: column; align-items: center; text-align: center; gap: 12px; }
        }
      `}</style>

      {/* LOADER */}
      {showLoader && (
        <div className={`loader-wrap ${loaderFading ? "fading" : ""}`}>
          <LoadingScreen skuId={activeSku} />
        </div>
      )}

      {/* MAIN APP */}
      {dashboardVisible && (
        <div className="shell dash-reveal">

          {/* ── HEADER ── */}
          <header className="app-header">
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontFamily: "Syne, sans-serif", fontSize: "15px", fontWeight: 800, color: "#FFAA00", letterSpacing: "0.04em" }}>
                  ◈ ORACLE
                </span>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#8B949E", letterSpacing: "0.15em" }}>
                  LOGISTICS INTEL
                </span>
              </div>

              {showSkuContext && (
                <>
                  {activeView === "dashboard" && apiData && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      background: `${statusColor}15`,
                      border: `1px solid ${statusColor}40`,
                      borderRadius: "100px", padding: "4px 12px",
                    }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusColor, animation: "pulse-anim 2s infinite" }} />
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: statusColor, letterSpacing: "0.1em", fontWeight: 500 }}>
                        {activeSku} · {daysToStockout}d
                      </span>
                    </div>
                  )}
                  {activeView !== "dashboard" && (
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#C9D1D9", letterSpacing: "0.1em", background: "#161B22", padding: "4px 12px", borderRadius: "6px" }}>
                      SKU {activeSku}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="header-navbar-right">
              {(Object.keys(NAV_LABELS) as ViewType[]).map((v) => (
                <button
                  key={v}
                  className={`header-nav-btn ${activeView === v ? "active" : ""}`}
                  onClick={() => setActiveView(v)}
                >
                  {NAV_LABELS[v]}
                </button>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "12px" }}>
                <span style={{
                  fontFamily: "JetBrains Mono, monospace", fontSize: "9px",
                  color: "#484F58", letterSpacing: "0.08em",
                }}>
                  {userEmail} · {userRole.toUpperCase()}
                </span>
                <button
                  onClick={handleLogout}
                  style={{
                    fontFamily: "JetBrains Mono, monospace", fontSize: "9px",
                    color: "#FF4444", background: "rgba(255,68,68,0.08)",
                    border: "1px solid rgba(255,68,68,0.2)", borderRadius: "6px",
                    padding: "5px 10px", cursor: "pointer", letterSpacing: "0.08em",
                  }}
                >
                  SIGN OUT
                </button>
              </div>
            </div>
          </header>

          {/* ── BODY ── */}
          <div className="body-row">

            {/* ── SKU SIDEBAR ── */}
            {showSkuContext && (
              <aside className="sku-sidebar">
                <div className="sidebar-title">
                  {usingCustomCsv ? "Uploaded SKUs" : "Tracked SKUs"}
                </div>
                {watchlist.map((sku) => (
                  <div
                    key={sku}
                    className={`sku-item ${activeSku === sku ? "active" : ""}`}
                    onClick={() => setActiveSku(sku)}
                  >
                    <span>{sku}</span>
                    {activeSku === sku && <span style={{ fontSize: "10px", marginLeft: "6px" }}>●</span>}
                  </div>
                ))}
              </aside>
            )}

            {/* ── MAIN CONTENT AREA ── */}
            <main className="main">
              {activeView === "insights" && <InsightsView skuId={activeSku} />}
              {activeView === "upload" && (
                <UploadView
                  onSuccess={handleUploadSuccess}
                  onReset={handleUploadComponentReset}
                  isCustomActive={usingCustomCsv}
                  activeFileName={activeFileName}
                />
              )}
              {activeView === "compare"  && <CompareView watchlist={watchlist} />}
              {activeView === "history"  && <HistoryPanel />}
              {activeView === "inventory" && (<InventoryView onSelectSku={(sku) => {
                      setActiveSku(sku);
                      setActiveView("dashboard");
                 }} />
               )}
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
                      onSave={() => {}}
                    />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", fontFamily: "JetBrains Mono, monospace", fontSize: "13px", color: "#FF4444", gap: "8px" }}>
                      <p style={{ fontWeight: 700 }}>❌ PIPELINE ERROR</p>
                      <p style={{ fontSize: "11px", color: "#C9D1D9" }}>{adviceText}</p>
                    </div>
                  )}
                </>
              )}
            </main>
          </div>

          {/* ── FOOTER ── */}
          <footer className="app-footer">
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#8B949E", letterSpacing: "0.1em" }}>
              ◈ ORACLE LOGISTICS · DUBAI SME INTELLIGENCE ENGINE
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#C9D1D9", letterSpacing: "0.08em" }}>
              BUILT BY <span style={{ color: "#FFAA00", fontWeight: 700 }}>DULASI NETHMA</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <a href="https://www.linkedin.com/in/dulasi-nethma-913577229/" target="_blank" rel="noopener noreferrer"
                className="footer-link" style={{ color: "#58A6FF" }}>
                ↗ LINKEDIN
              </a>
              <a href="https://github.com/Dula21" target="_blank" rel="noopener noreferrer"
                className="footer-link" style={{ color: "#FFFFFF" }}>
                ↗ GITHUB
              </a>
            </div>
          </footer>

        </div>
      )}
    </>
  );
}