"use client";
import React, { useState } from "react";
import { saveToHistory } from "./HistoryPanel";
import { exportDashboardPDF } from "../utils/exportPDF";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from "recharts";

interface DashboardProps {
  skuId: string;
  stock: number;
  usedUnits: number;
  avgSales: number;
  daysToStockout: number;
  weeklyDistribution: Array<{ day: string; sales: number }>;
  forecastData: Array<{
    date: string;
    predicted_units: number;
    lower_bound: number;
    upper_bound: number;
    is_ramadan?: number;
    is_promo?: number;
  }>;
  advice: string;
  onSave?: () => void;
}

export default function DashboardView({
  skuId, stock, usedUnits, avgSales, daysToStockout,
  weeklyDistribution = [], forecastData = [], advice, onSave
}: DashboardProps) {

  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleSave = () => {
    saveToHistory({
      sku_id: skuId,
      stock,
      days_until_stockout: daysToStockout,
      avg_daily_sales: avgSales,
      advice,
      status: daysToStockout < 7 ? "CRITICAL" : daysToStockout < 15 ? "WARNING" : "SECURE",
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSave?.();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportDashboardPDF({
        skuId,
        stock,
        avgSales,
        daysToStockout,
        usedUnits,
        advice,
      });
    } finally {
      setExporting(false);
    }
  };

  const statusColor = daysToStockout < 7 ? "#FF4444" : daysToStockout < 15 ? "#FFAA00" : "#00E676";
  const statusLabel = daysToStockout < 7 ? "CRITICAL" : daysToStockout < 15 ? "WARNING" : "SECURE";
  const statusGlow = daysToStockout < 7
    ? "0 0 20px rgba(255,68,68,0.4)"
    : daysToStockout < 15
    ? "0 0 20px rgba(255,170,0,0.4)"
    : "0 0 20px rgba(0,230,118,0.4)";

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: "rgba(13,17,23,0.95)",
          border: "1px solid rgba(255,170,0,0.3)",
          padding: "12px 16px",
          borderRadius: "10px",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
        }}>
          <p style={{ margin: 0, fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#8B949E", letterSpacing: "0.08em" }}>
            {data.date}
          </p>
          <p style={{ margin: "6px 0 0 0", fontWeight: 700, color: "#FFAA00", fontSize: "15px", fontFamily: "JetBrains Mono, monospace" }}>
            {data.predicted_units} <span style={{ fontSize: "10px", color: "#8B949E" }}>units</span>
          </p>
          {data.is_ramadan === 1 && (
            <p style={{ margin: "6px 0 0 0", color: "#A855F7", fontSize: "10px", fontWeight: 600 }}>☪ RAMADAN PEAK</p>
          )}
          {data.is_promo === 1 && (
            <p style={{ margin: "4px 0 0 0", color: "#EC4899", fontSize: "10px", fontWeight: 600 }}>⚡ PROMO ACTIVE</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Syne:wght@400;600;700;800&display=swap');
        .kpi-card {
          background: #0D1117;
          border: 1px solid #1C2128;
          border-radius: 16px;
          padding: 20px;
          position: relative;
          overflow: hidden;
          transition: border-color 0.2s, transform 0.2s;
        }
        .kpi-card:hover { transform: translateY(-2px); border-color: #30363D; }
        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
        }
        .chart-card {
          background: #0D1117;
          border: 1px solid #1C2128;
          border-radius: 16px;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }
        .advice-panel {
          background: #0D1117;
          border: 1px solid #1C2128;
          border-radius: 16px;
          padding: 24px;
          height: fit-content;
          position: relative;
          overflow: hidden;
        }
        .advice-panel::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, #FFAA00, rgba(255,170,0,0.1));
        }
        .section-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #484F58;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #1C2128;
        }
        .pulse-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          animation: pulse-anim 2s infinite;
        }
        @keyframes pulse-anim {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        .save-btn {
          width: 100%;
          margin-top: 20px;
          padding: 10px;
          font-family: JetBrains Mono, monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border-radius: 8px;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .save-btn:disabled { cursor: default; opacity: 0.4; }
      `}</style>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 }}>

          {/* KPI ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            <div className="kpi-card" style={{ borderTop: "2px solid #00D2FF" }}>
              <div style={{ fontSize: "9px", fontFamily: "JetBrains Mono, monospace", color: "#484F58", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>Active SKU</div>
              <div style={{ fontSize: "22px", fontFamily: "Syne, sans-serif", fontWeight: 800, color: "#00D2FF" }}>{skuId || "N/A"}</div>
              <div style={{ fontSize: "9px", fontFamily: "JetBrains Mono, monospace", color: "#30363D", marginTop: "6px" }}>LEDGER FOCUS</div>
            </div>

            <div className="kpi-card" style={{ borderTop: "2px solid #00E676" }}>
              <div style={{ fontSize: "9px", fontFamily: "JetBrains Mono, monospace", color: "#484F58", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>Stock Units</div>
              <div style={{ fontSize: "28px", fontFamily: "Syne, sans-serif", fontWeight: 800, color: "#00E676" }}>{stock.toLocaleString()}</div>
              <div style={{ fontSize: "9px", fontFamily: "JetBrains Mono, monospace", color: "#30363D", marginTop: "6px" }}>JAFZA / D3</div>
            </div>

            <div className="kpi-card" style={{ borderTop: "2px solid #FFAA00" }}>
              <div style={{ fontSize: "9px", fontFamily: "JetBrains Mono, monospace", color: "#484F58", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>Daily Velocity</div>
              <div style={{ fontSize: "28px", fontFamily: "Syne, sans-serif", fontWeight: 800, color: "#FFAA00" }}>{avgSales}</div>
              <div style={{ fontSize: "9px", fontFamily: "JetBrains Mono, monospace", color: "#30363D", marginTop: "6px" }}>UNITS / DAY</div>
            </div>

            <div className="kpi-card" style={{ borderTop: `2px solid ${statusColor}`, boxShadow: statusGlow }}>
              <div style={{ fontSize: "9px", fontFamily: "JetBrains Mono, monospace", color: "#484F58", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>Depletion</div>
              <div style={{ fontSize: "28px", fontFamily: "Syne, sans-serif", fontWeight: 800, color: statusColor }}>
                {daysToStockout}<span style={{ fontSize: "14px", marginLeft: "2px" }}>d</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px" }}>
                <div className="pulse-dot" style={{ background: statusColor }} />
                <span style={{ fontSize: "9px", fontFamily: "JetBrains Mono, monospace", color: statusColor, letterSpacing: "0.08em" }}>{statusLabel}</span>
              </div>
            </div>
          </div>

          {/* FORECAST CHART */}
          <div className="chart-card">
            <div className="section-label">Projected Demand · Feb – Mar 2026</div>
            <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
              <span style={{ fontSize: "10px", fontFamily: "JetBrains Mono, monospace", color: "#A855F7", display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#A855F7", display: "inline-block" }} />Ramadan
              </span>
              <span style={{ fontSize: "10px", fontFamily: "JetBrains Mono, monospace", color: "#EC4899", display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#EC4899", display: "inline-block" }} />Promo
              </span>
            </div>
            <div style={{ height: 220, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData} margin={{ left: -20, right: 8, bottom: 0, top: 8 }}>
                  <defs>
                    <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFAA00" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#FFAA00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 6" stroke="#1C2128" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, fill: "#484F58" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, fill: "#484F58" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="predicted_units" stroke="#FFAA00" strokeWidth={2} fill="url(#forecastGrad)" name="Projected Units" dot={false} activeDot={{ r: 4, fill: "#FFAA00", stroke: "#0D1117", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* WEEKLY DISTRIBUTION */}
          <div className="chart-card">
            <div className="section-label">Weekly Demand Pattern</div>
            <div style={{ height: 160, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyDistribution} margin={{ left: -20, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="2 6" stroke="#1C2128" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, fill: "#484F58" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, fill: "#484F58" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "rgba(13,17,23,0.95)", border: "1px solid #1C2128", borderRadius: "10px", fontFamily: "JetBrains Mono, monospace", fontSize: "11px" }} />
                  <Bar dataKey="sales" fill="#00D2FF" radius={[6, 6, 0, 0]} barSize={32} name="Avg Units" opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* LLAMA ADVISOR PANEL */}
        <div className="advice-panel">
          <div style={{ marginBottom: "4px", fontFamily: "Syne, sans-serif", fontSize: "13px", fontWeight: 700, color: "#FFAA00", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            ◈ Llama Advisor
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#30363D", letterSpacing: "0.1em", marginBottom: "20px" }}>
            LIVE · SME RUNBOOK
          </div>

          <div style={{ fontSize: "12.5px", color: "#8B949E", lineHeight: "1.8", whiteSpace: "pre-line", fontFamily: "system-ui, sans-serif", minHeight: "120px" }}>
            {advice}
          </div>

          {/* SAVE BUTTON — single, clean */}
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={!advice || advice.startsWith("◈") || saved}
            style={{
              color: saved ? "#00E676" : "#FFAA00",
              background: saved ? "rgba(0,230,118,0.06)" : "rgba(255,170,0,0.06)",
              border: `1px solid ${saved ? "rgba(0,230,118,0.3)" : "rgba(255,170,0,0.2)"}`,
            }}
          >
            {saved ? "✓ SAVED TO LOG" : "◈ SAVE TO REORDER LOG"}
          </button>

          {/* EXPORT BUTTON */}
          <button
            className="save-btn"
            onClick={handleExport}
            disabled={exporting || !advice || advice.startsWith("◈")}
            style={{
              marginTop: "8px",
              color: exporting ? "#484F58" : "#8B949E",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid #1C2128",
              opacity: (!advice || advice.startsWith("◈")) ? 0.4 : 1,
            }}
          >
            {exporting ? "⏳ GENERATING PDF..." : "⬇ EXPORT TO PDF"}
          </button>

          {/* STATUS */}
          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #1C2128" }}>
            <div style={{ fontSize: "9px", fontFamily: "JetBrains Mono, monospace", color: "#484F58", letterSpacing: "0.1em", marginBottom: "10px" }}>RUNWAY STATUS</div>
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: `rgba(${daysToStockout < 7 ? "255,68,68" : daysToStockout < 15 ? "255,170,0" : "0,230,118"}, 0.08)`,
              border: `1px solid ${statusColor}22`, borderRadius: "8px", padding: "10px 12px"
            }}>
              <div className="pulse-dot" style={{ background: statusColor }} />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: statusColor, fontWeight: 600, letterSpacing: "0.08em" }}>
                {daysToStockout < 7 ? "🔴 CRITICAL" : daysToStockout < 15 ? "🟡 WARNING" : "🟢 SECURE"}
              </span>
              <span style={{ marginLeft: "auto", fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#484F58" }}>
                {daysToStockout}d left
              </span>
            </div>
          </div>

          {/* STOCK BURN BAR */}
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#484F58", letterSpacing: "0.08em" }}>STOCK BURN</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#484F58" }}>{usedUnits} / wk</span>
            </div>
            <div style={{ height: "4px", background: "#1C2128", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, (usedUnits / (stock || 1)) * 100 * 4)}%`,
                background: `linear-gradient(90deg, ${statusColor}, ${statusColor}88)`,
                borderRadius: "2px",
                transition: "width 0.6s ease"
              }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}