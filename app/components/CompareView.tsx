"use client";
import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

const BACKEND_BASE_URL = "http://127.0.0.1:8000";

type SkuMetrics = {
  sku_id: string;
  current_stock: number;
  avg_daily_sales: number;
  days_until_stockout: number;
  insights_metadata?: {
    ramadan_impact_factor: number;
    promo_impact_factor: number;
  };
};

type SkuState = {
  data: SkuMetrics | null;
  loading: boolean;
  error: string;
};

const SKU_COLORS = ["#00D2FF", "#FFAA00", "#A855F7"];

const statusColor = (days: number) =>
  days < 7 ? "#FF4444" : days < 15 ? "#FFAA00" : "#00E676";

const statusLabel = (days: number) =>
  days < 7 ? "CRITICAL" : days < 15 ? "WARNING" : "SECURE";

interface CompareViewProps {
  watchlist: string[];
}

export default function CompareView({ watchlist }: CompareViewProps) {
  const [skuStates, setSkuStates] = useState<Record<string, SkuState>>({});

  useEffect(() => {
    watchlist.forEach((sku) => {
      setSkuStates((prev) => ({
        ...prev,
        [sku]: { data: null, loading: true, error: "" },
      }));

      fetch(`${BACKEND_BASE_URL}/api/forecast?sku=${sku}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setSkuStates((prev) => ({
            ...prev,
            [sku]: { data, loading: false, error: "" },
          }));
        })
        .catch((err) => {
          setSkuStates((prev) => ({
            ...prev,
            [sku]: { data: null, loading: false, error: err.message },
          }));
        });
    });
  }, [watchlist.join(",")]);

  const allLoaded = watchlist.every(
    (sku) => skuStates[sku] && !skuStates[sku].loading
  );

  // Build chart data for side-by-side bars
  const stockChartData = [
    {
      metric: "Stock",
      ...Object.fromEntries(
        watchlist.map((sku) => [sku, skuStates[sku]?.data?.current_stock ?? 0])
      ),
    },
  ];

  const velocityChartData = [
    {
      metric: "Velocity",
      ...Object.fromEntries(
        watchlist.map((sku) => [sku, skuStates[sku]?.data?.avg_daily_sales ?? 0])
      ),
    },
  ];

  const runwayChartData = [
    {
      metric: "Runway",
      ...Object.fromEntries(
        watchlist.map((sku) => [sku, skuStates[sku]?.data?.days_until_stockout ?? 0])
      ),
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: "rgba(13,17,23,0.95)", border: "1px solid #1C2128",
        padding: "12px 16px", borderRadius: "10px",
        fontFamily: "JetBrains Mono, monospace", fontSize: "11px"
      }}>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.fill, marginBottom: "4px" }}>
            {p.name}: <strong>{p.value}</strong>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #1C2128 25%, #21262D 50%, #1C2128 75%);
          background-size: 400px 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 8px;
        }
        .compare-card {
          background: #0D1117;
          border: 1px solid #1C2128;
          border-radius: 16px;
          padding: 20px;
          transition: border-color 0.2s, transform 0.2s;
          animation: fadeUp 0.5s ease forwards;
        }
        .compare-card:hover {
          border-color: #30363D;
          transform: translateY(-2px);
        }
      `}</style>

      {/* Header */}
      <div>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: "20px", fontWeight: 800, color: "#C9D1D9", marginBottom: "6px" }}>
          SKU Comparison
        </div>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#484F58", letterSpacing: "0.1em" }}>
          SIDE-BY-SIDE INVENTORY RISK ANALYSIS · ALL SKUS
        </div>
      </div>

      {/* SKU CARDS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${watchlist.length}, 1fr)`, gap: "16px" }}>
        {watchlist.map((sku, idx) => {
          const state = skuStates[sku];
          const color = SKU_COLORS[idx] ?? "#8B949E";

          if (!state || state.loading) {
            return (
              <div key={sku} className="compare-card" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="skeleton" style={{ height: "12px", width: "60px", marginBottom: "16px" }} />
                <div className="skeleton" style={{ height: "36px", width: "80px", marginBottom: "8px" }} />
                <div className="skeleton" style={{ height: "10px", width: "100px" }} />
              </div>
            );
          }

          if (state.error) {
            return (
              <div key={sku} className="compare-card" style={{ borderColor: "rgba(255,68,68,0.2)" }}>
                <div style={{ color: "#FF4444", fontFamily: "JetBrains Mono, monospace", fontSize: "10px" }}>
                  ❌ {sku}: {state.error}
                </div>
              </div>
            );
          }

          const d = state.data!;
          const sc = statusColor(d.days_until_stockout);
          const sl = statusLabel(d.days_until_stockout);

          return (
            <div key={sku} className="compare-card"
              style={{ borderTop: `2px solid ${color}`, animationDelay: `${idx * 0.1}s` }}>

              {/* SKU label */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ fontFamily: "Syne, sans-serif", fontSize: "16px", fontWeight: 800, color }}>
                  {d.sku_id}
                </div>
                <div style={{
                  fontFamily: "JetBrains Mono, monospace", fontSize: "8px",
                  color: sc, background: `${sc}15`,
                  border: `1px solid ${sc}30`, borderRadius: "100px",
                  padding: "3px 8px", letterSpacing: "0.1em"
                }}>
                  {sl}
                </div>
              </div>

              {/* Metrics */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

                <div>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#484F58", letterSpacing: "0.1em", marginBottom: "3px" }}>
                    STOCK UNITS
                  </div>
                  <div style={{ fontFamily: "Syne, sans-serif", fontSize: "26px", fontWeight: 800, color: "#00E676" }}>
                    {d.current_stock.toLocaleString()}
                  </div>
                </div>

                <div>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#484F58", letterSpacing: "0.1em", marginBottom: "3px" }}>
                    DAILY VELOCITY
                  </div>
                  <div style={{ fontFamily: "Syne, sans-serif", fontSize: "22px", fontWeight: 800, color: "#FFAA00" }}>
                    {d.avg_daily_sales} <span style={{ fontSize: "12px", color: "#484F58" }}>u/day</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#484F58", letterSpacing: "0.1em", marginBottom: "3px" }}>
                    RUNWAY
                  </div>
                  <div style={{ fontFamily: "Syne, sans-serif", fontSize: "22px", fontWeight: 800, color: sc }}>
                    {d.days_until_stockout}<span style={{ fontSize: "12px", color: "#484F58", marginLeft: "2px" }}>days</span>
                  </div>
                </div>

                {/* Runway bar */}
                <div>
                  <div style={{ height: "3px", background: "#1C2128", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(100, (d.days_until_stockout / 60) * 100)}%`,
                      background: `linear-gradient(90deg, ${sc}, ${sc}88)`,
                      borderRadius: "2px",
                      transition: "width 0.8s ease",
                      boxShadow: `0 0 6px ${sc}66`,
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#30363D" }}>0d</span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#30363D" }}>60d</span>
                  </div>
                </div>

                {/* Seasonal factors */}
                {d.insights_metadata && (
                  <div style={{ display: "flex", gap: "8px", paddingTop: "8px", borderTop: "1px solid #1C2128" }}>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#484F58", marginBottom: "2px" }}>RAMADAN</div>
                      <div style={{ fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, color: "#A855F7" }}>
                        {d.insights_metadata.ramadan_impact_factor}x
                      </div>
                    </div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#484F58", marginBottom: "2px" }}>PROMO</div>
                      <div style={{ fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, color: "#EC4899" }}>
                        {d.insights_metadata.promo_impact_factor}x
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* COMPARISON CHARTS */}
      {allLoaded && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>

          {/* Stock comparison */}
          <div style={{ background: "#0D1117", border: "1px solid #1C2128", borderRadius: "16px", padding: "20px", animation: "fadeUp 0.5s ease 0.3s both" }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#484F58", letterSpacing: "0.12em", marginBottom: "16px" }}>
              STOCK UNITS
            </div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ metric: "Stock", ...Object.fromEntries(watchlist.map(s => [s, skuStates[s]?.data?.current_stock ?? 0])) }]} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid strokeDasharray="2 6" stroke="#1C2128" vertical={false} />
                  <XAxis dataKey="metric" hide />
                  <YAxis tick={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, fill: "#484F58" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px" }} />
                  {watchlist.map((sku, i) => (
                    <Bar key={sku} dataKey={sku} fill={SKU_COLORS[i]} radius={[4, 4, 0, 0]} barSize={40} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Velocity comparison */}
          <div style={{ background: "#0D1117", border: "1px solid #1C2128", borderRadius: "16px", padding: "20px", animation: "fadeUp 0.5s ease 0.4s both" }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#484F58", letterSpacing: "0.12em", marginBottom: "16px" }}>
              DAILY VELOCITY
            </div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ metric: "Velocity", ...Object.fromEntries(watchlist.map(s => [s, skuStates[s]?.data?.avg_daily_sales ?? 0])) }]} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid strokeDasharray="2 6" stroke="#1C2128" vertical={false} />
                  <XAxis dataKey="metric" hide />
                  <YAxis tick={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, fill: "#484F58" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px" }} />
                  {watchlist.map((sku, i) => (
                    <Bar key={sku} dataKey={sku} fill={SKU_COLORS[i]} radius={[4, 4, 0, 0]} barSize={40} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Runway comparison */}
          <div style={{ background: "#0D1117", border: "1px solid #1C2128", borderRadius: "16px", padding: "20px", animation: "fadeUp 0.5s ease 0.5s both" }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#484F58", letterSpacing: "0.12em", marginBottom: "16px" }}>
              RUNWAY (DAYS)
            </div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ metric: "Runway", ...Object.fromEntries(watchlist.map(s => [s, skuStates[s]?.data?.days_until_stockout ?? 0])) }]} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid strokeDasharray="2 6" stroke="#1C2128" vertical={false} />
                  <XAxis dataKey="metric" hide />
                  <YAxis tick={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, fill: "#484F58" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px" }} />
                  {watchlist.map((sku, i) => (
                    <Bar key={sku} dataKey={sku} fill={SKU_COLORS[i]} radius={[4, 4, 0, 0]} barSize={40} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* Risk summary table */}
      {allLoaded && (
        <div style={{ background: "#0D1117", border: "1px solid #1C2128", borderRadius: "16px", padding: "20px", animation: "fadeUp 0.5s ease 0.6s both" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#484F58", letterSpacing: "0.12em", marginBottom: "16px" }}>
            RISK SUMMARY TABLE
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "JetBrains Mono, monospace", fontSize: "11px" }}>
            <thead>
              <tr>
                {["SKU", "Stock", "Velocity", "Runway", "Ramadan", "Promo", "Status"].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#484F58", fontSize: "9px", letterSpacing: "0.1em", borderBottom: "1px solid #1C2128" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {watchlist.map((sku, idx) => {
                const d = skuStates[sku]?.data;
                if (!d) return null;
                const sc = statusColor(d.days_until_stockout);
                return (
                  <tr key={sku} style={{ borderBottom: "1px solid #1C2128" }}>
                    <td style={{ padding: "10px 12px", color: SKU_COLORS[idx], fontWeight: 700 }}>{d.sku_id}</td>
                    <td style={{ padding: "10px 12px", color: "#C9D1D9" }}>{d.current_stock.toLocaleString()}</td>
                    <td style={{ padding: "10px 12px", color: "#C9D1D9" }}>{d.avg_daily_sales}/day</td>
                    <td style={{ padding: "10px 12px", color: sc, fontWeight: 700 }}>{d.days_until_stockout}d</td>
                    <td style={{ padding: "10px 12px", color: "#A855F7" }}>{d.insights_metadata?.ramadan_impact_factor ?? "—"}x</td>
                    <td style={{ padding: "10px 12px", color: "#EC4899" }}>{d.insights_metadata?.promo_impact_factor ?? "—"}x</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        color: sc, background: `${sc}15`,
                        border: `1px solid ${sc}30`, borderRadius: "100px",
                        padding: "3px 10px", fontSize: "9px", letterSpacing: "0.1em"
                      }}>
                        {statusLabel(d.days_until_stockout)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}