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

  // ─── Fetch full 2-year data ───────────────────────────────────────
  useEffect(() => {
    if (!skuId) return;
    setLoading(true);
    setError("");
    setLlamaAdvice("");

    fetch(`${BACKEND_BASE_URL}/api/insights?sku=${skuId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((payload) => {
        const allRows: ForecastRow[] = payload.forecast ?? [];
        setData2024(
          allRows.filter((r) => r.date.startsWith("2024")).map((r) => ({ ...r, date: r.date.slice(5) }))
        );
        setData2025(
          allRows.filter((r) => r.date.startsWith("2025")).map((r) => ({ ...r, date: r.date.slice(5) }))
        );
        setMetadata(payload.insights_metadata ?? null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [skuId]);

  // ─── Stream Llama strategic advice once metadata ready ────────────
  useEffect(() => {
    if (!metadata || !data2025.length) return;

    const avg = data2025.reduce((sum, r) => sum + r.predicted_units, 0) / data2025.length;
    const { ramadan_impact_factor, promo_impact_factor, historical_data_points } = metadata;

    const url = `${BACKEND_BASE_URL}/api/stream/insights?sku=${skuId}`
      + `&ramadan_factor=${ramadan_impact_factor}`
      + `&promo_factor=${promo_impact_factor}`
      + `&avg_daily_sales=${avg.toFixed(1)}`
      + `&data_points=${historical_data_points}`;

    setLlamaAdvice("◈ Generating 2026 strategic advisory...");
    setLlamaLoading(true);
    let cancelled = false;

    const stream = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) { setLlamaAdvice(`❌ Stream Error: HTTP ${response.status}`); return; }

        const reader = response.body?.getReader();
        if (!reader) { setLlamaAdvice("❌ No response body."); return; }

        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          fullText += decoder.decode(value, { stream: true });
          setLlamaAdvice(fullText);
        }

        if (!cancelled && !fullText.trim()) setLlamaAdvice("No strategic advice generated.");
      } catch (err) {
        if (!cancelled) setLlamaAdvice(`❌ ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        if (!cancelled) setLlamaLoading(false);
      }
    };

    stream();
    return () => { cancelled = true; };
  }, [metadata, skuId, data2025]);

  // ─── Merge 2024 + 2025 by MM-DD ──────────────────────────────────
  const mergedData = React.useMemo(() => {
    const map: Record<string, { date: string; sales_2024?: number; sales_2025?: number; is_ramadan?: number; is_promo?: number }> = {};
    data2024.forEach((r) => { map[r.date] = { date: r.date, sales_2024: r.predicted_units }; });
    data2025.forEach((r) => {
      if (map[r.date]) {
        map[r.date].sales_2025 = r.predicted_units;
        map[r.date].is_ramadan = r.is_ramadan;
        map[r.date].is_promo = r.is_promo;
      } else {
        map[r.date] = { date: r.date, sales_2025: r.predicted_units, is_ramadan: r.is_ramadan, is_promo: r.is_promo };
      }
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [data2024, data2025]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const row = mergedData.find((r) => r.date === label);
    return (
      <div style={{ background: "#0D1117", border: "1px solid #21262D", padding: "12px", borderRadius: "8px", fontFamily: "Space Mono", fontSize: "11px" }}>
        <p style={{ color: "#8B949E", margin: 0 }}>📅 {label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color, margin: "4px 0 0 0" }}>{p.name}: <strong>{p.value}</strong> units</p>
        ))}
        {row?.is_ramadan === 1 && <p style={{ color: "#A855F7", marginTop: "6px" }}>☪ Ramadan Season</p>}
        {row?.is_promo === 1 && <p style={{ color: "#EC4899", marginTop: "4px" }}>⚡ Promo Active</p>}
      </div>
    );
  };

  if (loading) return (
    <div style={{ color: "#8B949E", fontFamily: "Space Mono", padding: "40px", textAlign: "center" }}>
      ▶ LOADING 2024–2025 SEASONAL INTELLIGENCE FOR {skuId}...
    </div>
  );

  if (error) return (
    <div style={{ color: "#FF3333", fontFamily: "Space Mono", padding: "40px" }}>❌ {error}</div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "Space Mono", fontSize: "18px", fontWeight: 700, color: "#C9D1D9" }}>
            📈 Seasonal Demand Intelligence
          </div>
          <div style={{ fontFamily: "Space Mono", fontSize: "11px", color: "#8B949E", marginTop: "4px" }}>
            2024 vs 2025 — Full Year Comparison · SKU {skuId}
          </div>
        </div>
        <div style={{ fontSize: "11px", color: "#8B949E", fontFamily: "Space Mono" }}>
          {metadata?.historical_data_points} data points
        </div>
      </div>

      {/* IMPACT CARDS */}
      {metadata && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          <div style={{ background: "#161B22", borderLeft: "4px solid #A855F7", padding: "16px", borderRadius: "12px" }}>
            <div style={{ fontSize: "11px", color: "#8B949E", textTransform: "uppercase" }}>Ramadan Spike</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#A855F7", fontFamily: "Space Mono" }}>{metadata.ramadan_impact_factor}x</div>
            <div style={{ fontSize: "11px", color: "#484F58" }}>vs average daily sales</div>
          </div>
          <div style={{ background: "#161B22", borderLeft: "4px solid #EC4899", padding: "16px", borderRadius: "12px" }}>
            <div style={{ fontSize: "11px", color: "#8B949E", textTransform: "uppercase" }}>Promo Spike</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#EC4899", fontFamily: "Space Mono" }}>{metadata.promo_impact_factor}x</div>
            <div style={{ fontSize: "11px", color: "#484F58" }}>vs average daily sales</div>
          </div>
          <div style={{ background: "#161B22", borderLeft: "4px solid #00D2FF", padding: "16px", borderRadius: "12px" }}>
            <div style={{ fontSize: "11px", color: "#8B949E", textTransform: "uppercase" }}>2026 Buffer Signal</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#00D2FF", fontFamily: "Space Mono" }}>
              +{Math.round(metadata.ramadan_impact_factor * 100 - 100)}%
            </div>
            <div style={{ fontSize: "11px", color: "#484F58" }}>extra stock before Ramadan</div>
          </div>
        </div>
      )}

      {/* CHART */}
      <div style={{ background: "#161B22", padding: "20px", borderRadius: "12px", border: "1px solid #30363D" }}>
        <div style={{ fontFamily: "Space Mono", fontSize: "12px", color: "#C9D1D9", textTransform: "uppercase", marginBottom: "8px" }}>
          📊 2024 vs 2025 Daily Sales Overlay
        </div>
        <div style={{ fontSize: "10px", color: "#8B949E", fontFamily: "Space Mono", marginBottom: "16px" }}>
          Bars = 2024 · Line = 2025 · Hover to see Ramadan & Promo flags
        </div>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={mergedData} margin={{ left: -10, right: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontFamily: "Space Mono", fontSize: 8, fill: "#8B949E" }}
                interval={Math.floor(mergedData.length / 12)}
                angle={-45}
                textAnchor="end"
              />
              <YAxis tick={{ fontFamily: "Space Mono", fontSize: 9, fill: "#8B949E" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontFamily: "Space Mono", fontSize: "10px", paddingTop: "16px" }} />
              <Bar dataKey="sales_2024" name="2024 Sales" fill="#00D2FF" fillOpacity={0.4} radius={[2, 2, 0, 0]} barSize={3} />
              <Line dataKey="sales_2025" name="2025 Sales" type="monotone" stroke="#FFAA00" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LLAMA 2026 STRATEGIC ADVICE */}
      <div style={{ background: "#161B22", padding: "24px", borderRadius: "12px", border: "1px solid #30363D" }}>
        <div style={{ fontFamily: "Space Mono", fontSize: "14px", fontWeight: 700, color: "#FFAA00", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          ◈ Llama 2026 Strategic Advisor
        </div>
        <div style={{ fontSize: "10px", color: "#8B949E", marginBottom: "16px", fontFamily: "Space Mono" }}>
          AI-GENERATED REORDER STRATEGY · BASED ON 2-YEAR PATTERN ANALYSIS
        </div>
        <div style={{
          fontSize: "13px",
          color: llamaLoading ? "#8B949E" : "#C9D1D9",
          lineHeight: "1.8",
          whiteSpace: "pre-line",
          fontFamily: "system-ui",
          minHeight: "80px"
        }}>
          {llamaAdvice || "◈ Awaiting data..."}
        </div>
        {llamaLoading && (
          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#FFAA00" }} />
            <span style={{ fontFamily: "Space Mono", fontSize: "10px", color: "#8B949E" }}>LLAMA GENERATING...</span>
          </div>
        )}
      </div>

    </div>
  );
}