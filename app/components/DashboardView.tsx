"use client";
import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine, Label } from "recharts";

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
}

export default function DashboardView({ 
  skuId, stock, usedUnits, avgSales, daysToStockout, weeklyDistribution = [], forecastData = [], advice 
}: DashboardProps) {
  
  // Traffic light status flag based on cold remaining warehouse runway metrics
  const statusColor = daysToStockout < 7 ? "#FF3333" : daysToStockout < 15 ? "#FFAA00" : "#00CC66";

  // Custom Tooltip component to highlight contextual business factors inside the charts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: "#0D1117", border: "1px solid #21262D", padding: "12px", borderRadius: "8px" }}>
          <p style={{ margin: 0, fontFamily: "Space Mono", fontSize: "11px", color: "#8B949E" }}>Date: {data.date}</p>
          <p style={{ margin: "4px 0 0 0", fontWeight: 700, color: "var(--amber)" }}>Sales: {data.predicted_units} Units</p>
          {data.is_ramadan === 1 && <p style={{ margin: "4px 0 0 0", color: "#A855F7", fontSize: "11px", fontWeight: "bold" }}>☪ Ramadan Holiday Peak</p>}
          {data.is_promo === 1 && <p style={{ margin: "4px 0 0 0", color: "#EC4899", fontSize: "11px", fontWeight: "bold" }}>⚡ Promo Drive Active</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="body-grid" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px" }}>
      <div className="left-col" style={{ display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>
        
        {/* --- EXECUTIVES REORDER METRIC KPI ROW --- */}
        <div className="kpi-row" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          <div className="kpi" style={{ borderLeft: "4px solid #00D2FF", background: "#161B22", padding: "16px", borderRadius: "12px" }}>
            <div style={{ fontSize: "11px", color: "#8B949E", textTransform: "uppercase" }}>Active Target SKU</div>
            <div className="mono" style={{ color: "#00D2FF", fontSize: "24px", fontWeight: 700, marginTop: "4px" }}>{skuId || "N/A"}</div>
            <div style={{ fontSize: "11px", color: "#484F58", marginTop: "2px" }}>Active Ledger Focus</div>
          </div>
          <div className="kpi" style={{ borderLeft: "4px solid #00CC66", background: "#161B22", padding: "16px", borderRadius: "12px" }}>
            <div style={{ fontSize: "11px", color: "#8B949E", textTransform: "uppercase" }}>Remaining Units</div>
            <div className="mono" style={{ color: "#00CC66", fontSize: "24px", fontWeight: 700, marginTop: "4px" }}>{stock}</div>
            <div style={{ fontSize: "11px", color: "#484F58", marginTop: "2px" }}>Physical JAFZA / D3 Stock</div>
          </div>
          <div className="kpi" style={{ borderLeft: "4px solid #FFAA00", background: "#161B22", padding: "16px", borderRadius: "12px" }}>
            <div style={{ fontSize: "11px", color: "#8B949E", textTransform: "uppercase" }}>Avg Daily Velocity</div>
            <div className="mono" style={{ color: "#FFAA00", fontSize: "24px", fontWeight: 700, marginTop: "4px" }}>{avgSales}</div>
            <div style={{ fontSize: "11px", color: "#484F58", marginTop: "2px" }}>Units Consumed / Day</div>
          </div>
          <div className="kpi" style={{ borderLeft: `4px solid ${statusColor}`, background: "#161B22", padding: "16px", borderRadius: "12px" }}>
            <div style={{ fontSize: "11px", color: "#8B949E", textTransform: "uppercase" }}>Estimated Depletion</div>
            <div className="mono" style={{ color: statusColor, fontSize: "24px", fontWeight: 700, marginTop: "4px" }}>{daysToStockout}d</div>
            <div style={{ fontSize: "11px", color: "#484F58", marginTop: "2px" }}>Runway Risk Window</div>
          </div>
        </div>

        {/* --- TIME SERIES TREND TIMELINE (REFLECTING REAL CHRONOLOGICAL DATA ROWS) --- */}
        <div className="chart-block" style={{ background: "#161B22", padding: "20px", borderRadius: "12px", border: "1px solid #30363D" }}>
          <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ fontFamily: "Space Mono", fontSize: "12px", color: "#C9D1D9", textTransform: "uppercase" }}>
              📊 Historical Sales Consumption Timeline View (2024 - 2025)
            </div>
            <div style={{ display: "flex", gap: "12px", fontSize: "10px", fontFamily: "Space Mono" }}>
              <span style={{ color: "#A855F7" }}>● Ramadan Peaks</span>
              <span style={{ color: "#EC4899" }}>● Promo Days</span>
            </div>
          </div>
          <div style={{ height: 240, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData} margin={{ left: -20, right: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262D" vertical={false} />
                <XAxis dataKey="date" tick={{ fontFamily: "Space Mono", fontSize: 9, fill: "#8B949E" }} />
                <YAxis tick={{ fontFamily: "Space Mono", fontSize: 9, fill: "#8B949E" }} />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Visual Mapping Base Line */}
                <Area 
                  type="monotone" 
                  dataKey="predicted_units" 
                  stroke="#FFAA00" 
                  fill="rgba(255, 170, 0, 0.04)" 
                  strokeWidth={2} 
                  name="Historical Sales Volume" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- HISTORICAL DAY-OF-WEEK RUN RATE BREAKDOWN --- */}
        <div className="chart-block" style={{ background: "#161B22", padding: "20px", borderRadius: "12px", border: "1px solid #30363D" }}>
          <div style={{ fontFamily: "Space Mono", fontSize: "12px", color: "#C9D1D9", textTransform: "uppercase", marginBottom: "16px" }}>
            🗓️ Average Weekly Demand Distribution Weight
          </div>
          <div style={{ height: 180, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyDistribution} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#21262D" vertical={false} />
                <XAxis dataKey="day" tick={{ fontFamily: "Space Mono", fontSize: 10, fill: "#8B949E" }} />
                <YAxis tick={{ fontFamily: "Space Mono", fontSize: 10, fill: "#8B949E" }} />
                <Tooltip contentStyle={{ background: "#0D1117", borderColor: "#30363D" }} />
                <Bar dataKey="sales" fill="#00D2FF" radius={[4, 4, 0, 0]} barSize={40} name="Average Units Sold" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* --- BUSINESS INTELLIGENCE RUNBOOK STRATEGY PANEL --- */}
      <div className="right-col" style={{ background: "#161B22", padding: "24px", borderRadius: "12px", border: "1px solid #30363D", height: "fit-content" }}>
        <div style={{ fontFamily: "Space Mono", fontSize: "14px", fontWeight: 700, color: "#FFAA00", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          ◈ Llama Core Advisor
        </div>
        <div style={{ fontSize: "10px", color: "#8B949E", marginBottom: "20px", fontFamily: "Space Mono" }}>LIVE SME RUNBOOK PROTOCOL</div>
        <div style={{ fontSize: "13px", color: "#C9D1D9", lineHeight: "1.7", whiteSpace: "pre-line", fontFamily: "system-ui" }}>
          {advice}
        </div>
        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #21262D", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyBetween: "space-between", fontSize: "11px" }}>
            <span style={{ color: "#8B949E" }}>Traffic Status Threshold:</span>
            <span style={{ color: statusColor, fontWeight: "bold", textTransform: "uppercase" }}>
              {daysToStockout < 7 ? "🔴 CRITICAL" : daysToStockout < 15 ? "🟡 WARNING" : "🟢 SECURE"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}