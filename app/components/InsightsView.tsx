"use client";
import React, { useEffect, useState } from "react";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

interface InsightsProps {
  skuId: string;
}

type ForecastRow = {
  date: string;
  predicted_units: number;
  is_ramadan?: number;
  is_promo?: number;
};

type InsightsMetadata = {
  ramadan_impact_factor: number;
  promo_impact_factor: number;
  historical_data_points: number;
};

const BACKEND_BASE_URL = "http://127.0.0.1:8000";

export default function InsightsView({ skuId }: InsightsProps) {
  const [data2024, setData2024] = useState<ForecastRow[]>([]);
  const [data2025, setData2025] = useState<ForecastRow[]>([]);
  const [metadata, setMetadata] = useState<InsightsMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [llamaAdvice, setLlamaAdvice] = useState("");
  const [llamaLoading, setLlamaLoading] = useState(false);

  // ─── Fetch 2-year data ────────────────────────────────────────────
  useEffect(() => {
    if (!skuId) return;
    setLoading(true);
    setError("");
    setLlamaAdvice("");
    setData2024([]);
    setData2025([]);
    setMetadata(null);

    fetch(`${BACKEND_BASE_URL}/api/insights?sku=${skuId}`)
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((payload) => {
        const allRows: ForecastRow[] = payload.forecast ?? [];
        setData2024(allRows.filter((r) => r.date.startsWith("2024")).map((r) => ({ ...r, date: r.date.slice(5) })));
        setData2025(allRows.filter((r) => r.date.startsWith("2025")).map((r) => ({ ...r, date: r.date.slice(5) })));
        setMetadata(payload.insights_metadata ?? null);
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [skuId]);

  // ─── Stream Llama advice ──────────────────────────────────────────
  useEffect(() => {
    if (!metadata || !data2025.length) return;
    const avg = data2025.reduce((s, r) => s + r.predicted_units, 0) / data2025.length;
    const { ramadan_impact_factor, promo_impact_factor, historical_data_points } = metadata;
    const url = `${BACKEND_BASE_URL}/api/stream/insights?sku=${skuId}`
      + `&ramadan_factor=${ramadan_impact_factor}&promo_factor=${promo_impact_factor}`
      + `&avg_daily_sales=${avg.toFixed(1)}&data_points=${historical_data_points}`;

    setLlamaAdvice("◈ Generating 2026 strategic advisory...");
    setLlamaLoading(true);
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) { setLlamaAdvice(`❌ HTTP ${res.status}`); return; }
        const reader = res.body?.getReader();
        if (!reader) { setLlamaAdvice("❌ No stream body."); return; }
        const dec = new TextDecoder();
        let full = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          full += dec.decode(value, { stream: true });
          setLlamaAdvice(full);
        }
        if (!cancelled && !full.trim()) setLlamaAdvice("No advice generated.");
      } catch (e) {
        if (!cancelled) setLlamaAdvice(`❌ ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        if (!cancelled) setLlamaLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [metadata, skuId, data2025]);

  // ─── Merge 2024 + 2025 ────────────────────────────────────────────
  const mergedData = React.useMemo(() => {
    const map: Record<string, { date: string; sales_2024?: number; sales_2025?: number; is_ramadan?: number; is_promo?: number }> = {};
    data2024.forEach((r) => { map[r.date] = { date: r.date, sales_2024: r.predicted_units }; });
    data2025.forEach((r) => {
      map[r.date] = { ...(map[r.date] ?? { date: r.date }), sales_2025: r.predicted_units, is_ramadan: r.is_ramadan, is_promo: r.is_promo };
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [data2024, data2025]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const row = mergedData.find((r) => r.date === label);
    return (
      <div style={{
        background: "rgba(13,17,23,0.97)", border: "1px solid #1C2128",
        padding: "12px 16px", borderRadius: "10px",
        fontFamily: "JetBrains Mono, monospace", fontSize: "10px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}>
        <div style={{ color: "#484F58", marginBottom: "6px", letterSpacing: "0.06em" }}>📅 {label}</div>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.color ?? p.fill, marginBottom: "3px" }}>
            {p.name}: <strong>{p.value}</strong> <span style={{ color: "#484F58" }}>units</span>
          </div>
        ))}
        {row?.is_ramadan === 1 && <div style={{ color: "#A855F7", marginTop: "6px", fontWeight: 600 }}>☪ Ramadan Season</div>}
        {row?.is_promo === 1 && <div style={{ color: "#EC4899", marginTop: "3px", fontWeight: 600 }}>⚡ Promo Active</div>}
      </div>
    );
  };

  if (loading) return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "60vh", gap: "16px",
    }}>
      <div style={{
        width: "40px", height: "40px",
        border: "2px solid #1C2128", borderTopColor: "#FFAA00",
        borderRadius: "50%", animation: "spin 0.8s linear infinite",
      }} />
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#484F58", letterSpacing: "0.12em" }}>
        LOADING 2024–2025 DATA FOR {skuId}...
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#FF4444" }}>❌ {error}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Syne:wght@700;800&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        .ins-card {
          background: #0D1117;
          border: 1px solid #1C2128;
          border-radius: 16px;
          padding: 20px;
          animation: fadeUp 0.4s ease forwards;
          position: relative;
          overflow: hidden;
        }
        .ins-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
        }
        .ins-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #484F58;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ins-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #1C2128;
        }
      `}</style>

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", animation: "fadeUp 0.3s ease" }}>
        <div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: "20px", fontWeight: 800, color: "#C9D1D9", marginBottom: "4px" }}>
            Seasonal Intelligence
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#484F58", letterSpacing: "0.1em" }}>
            2024 VS 2025 · FULL YEAR COMPARISON · SKU {skuId}
          </div>
        </div>
        <div style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#30363D",
          background: "#0D1117", border: "1px solid #1C2128",
          borderRadius: "8px", padding: "6px 12px", letterSpacing: "0.1em",
        }}>
          {metadata?.historical_data_points ?? "—"} DATA POINTS
        </div>
      </div>

      {/* IMPACT FACTOR CARDS */}
      {metadata && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            {
              label: "Ramadan Spike",
              value: `${metadata.ramadan_impact_factor}x`,
              sub: "vs avg daily sales",
              color: "#A855F7" as string,
              glow: "rgba(168,85,247,0.15)",
              delay: "0s",
            },
            {
              label: "Promo Spike",
              value: `${metadata.promo_impact_factor}x`,
              sub: "vs avg daily sales",
              color: "#EC4899" as string,
              glow: "rgba(236,72,153,0.15)",
              delay: "0.05s",
            },
            {
              label: "2026 Buffer Signal",
              value: `+${Math.round(metadata.ramadan_impact_factor * 100 - 100)}%`,
              sub: "extra stock before Ramadan",
              color: "#00D2FF" as string,
              glow: "rgba(0,210,255,0.15)",
              delay: "0.1s",
            },
          ].map((card) => (
            <div key={card.label} className="ins-card" style={{
              borderTop: `2px solid ${card.color}`,
              animationDelay: card.delay,
              boxShadow: `0 4px 24px ${card.glow}`,
            }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#484F58", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "10px" }}>
                {card.label}
              </div>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: "32px", fontWeight: 800, color: card.color, letterSpacing: "-0.02em", marginBottom: "4px" }}>
                {card.value}
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#30363D" }}>
                {card.sub}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OVERLAY CHART */}
      <div className="ins-card" style={{ animationDelay: "0.15s", padding: "24px" }}>
        <div className="ins-label">2024 vs 2025 Daily Sales Overlay</div>
        <div style={{ display: "flex", gap: "20px", marginBottom: "16px" }}>
          {[
            { label: "2024 Sales", color: "#00D2FF" },
            { label: "2025 Sales", color: "#FFAA00" },
            { label: "Ramadan", color: "#A855F7" },
            { label: "Promo", color: "#EC4899" },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: l.color }} />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#484F58", letterSpacing: "0.06em" }}>{l.label}</span>
            </div>
          ))}
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={mergedData} margin={{ left: -10, right: 8, bottom: 24, top: 4 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D2FF" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#00D2FF" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 6" stroke="#1C2128" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontFamily: "JetBrains Mono, monospace", fontSize: 7, fill: "#484F58" }}
                interval={Math.floor(mergedData.length / 12)}
                angle={-45}
                textAnchor="end"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, fill: "#484F58" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ display: "none" }}
              />
              <Bar dataKey="sales_2024" name="2024 Sales" fill="url(#barGrad)" radius={[2, 2, 0, 0]} barSize={3} />
              <Line dataKey="sales_2025" name="2025 Sales" type="monotone" stroke="#FFAA00" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: "#FFAA00", stroke: "#0D1117", strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#30363D", marginTop: "8px", letterSpacing: "0.06em" }}>
          Hover any point to see Ramadan & Promo annotations
        </div>
      </div>

      {/* LLAMA 2026 STRATEGIC ADVICE */}
      <div className="ins-card" style={{ animationDelay: "0.2s", padding: "24px" }}>
        {/* Amber top accent */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, #FFAA00, rgba(255,170,0,0.1))" }} />

        <div style={{ marginBottom: "4px", fontFamily: "Syne, sans-serif", fontSize: "13px", fontWeight: 800, color: "#FFAA00", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          ◈ Llama 2026 Strategic Advisor
        </div>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#30363D", letterSpacing: "0.12em", marginBottom: "20px" }}>
          AI-GENERATED · 2-YEAR PATTERN ANALYSIS · {skuId}
        </div>

        <div style={{
          fontSize: "13px",
          color: llamaLoading ? "#484F58" : "#C9D1D9",
          lineHeight: "1.85",
          whiteSpace: "pre-line",
          fontFamily: "system-ui, sans-serif",
          minHeight: "80px",
          transition: "color 0.3s ease",
        }}>
          {llamaAdvice || "◈ Awaiting data..."}
        </div>

        {llamaLoading && (
          <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#FFAA00", animation: "blink 1.2s infinite" }} />
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#FFAA00", animation: "blink 1.2s infinite 0.2s" }} />
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#FFAA00", animation: "blink 1.2s infinite 0.4s" }} />
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#484F58", letterSpacing: "0.1em", marginLeft: "4px" }}>
              LLAMA GENERATING
            </span>
          </div>
        )}
      </div>

    </div>
  );
}