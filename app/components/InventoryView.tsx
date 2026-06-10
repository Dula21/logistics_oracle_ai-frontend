"use client";
import React, { useEffect, useState } from "react";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

type AlertEntry = {
  sku_id: string;
  status: "red" | "amber" | "green";
  days_until_stockout: number;
  current_stock: number;
  avg_daily_sales: number;
  message: string;
};

type FilterType = "all" | "red" | "amber" | "green";

const statusColor = (s: string) =>
  s === "red" ? "#FF4444" : s === "amber" ? "#FFAA00" : "#00E676";

const statusLabel = (s: string) =>
  s === "red" ? "CRITICAL" : s === "amber" ? "WARNING" : "STABLE";

interface InventoryViewProps {
  onSelectSku: (sku: string) => void;
}

export default function InventoryView({ onSelectSku }: InventoryViewProps) {
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  async function fetchAlerts() {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/alerts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAlerts(data.alerts);
      setLastUpdated(new Date().toLocaleTimeString("en-AE"));
    } catch (err) {
      console.error("Alerts fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.status === filter);

  const counts = {
    all: alerts.length,
    red: alerts.filter((a) => a.status === "red").length,
    amber: alerts.filter((a) => a.status === "amber").length,
    green: alerts.filter((a) => a.status === "green").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .inv-row {
          background: #0D1117;
          border: 1px solid #1C2128;
          border-radius: 12px;
          padding: 16px 20px;
          display: grid;
          grid-template-columns: 8px 80px 1fr 100px 100px 100px 120px 80px;
          align-items: center;
          gap: 16px;
          transition: border-color 0.2s;
          animation: fadeUp 0.4s ease forwards;
          cursor: pointer;
        }
        .inv-row:hover { border-color: #30363D; }
        .filter-btn {
          font-family: JetBrains Mono, monospace;
          font-size: 9px;
          letter-spacing: 0.1em;
          padding: 6px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid #1C2128;
          background: transparent;
          color: #484F58;
        }
        .filter-btn.active { color: #080C10; }
        .view-btn {
          font-family: JetBrains Mono, monospace;
          font-size: 9px;
          letter-spacing: 0.08em;
          padding: 5px 12px;
          border-radius: 6px;
          cursor: pointer;
          border: 1px solid rgba(0,210,255,0.3);
          background: rgba(0,210,255,0.06);
          color: #00D2FF;
          transition: all 0.15s ease;
        }
        .view-btn:hover { background: rgba(0,210,255,0.12); }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: "20px", fontWeight: 800, color: "#C9D1D9", marginBottom: "6px" }}>
            Inventory Status
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#484F58", letterSpacing: "0.1em" }}>
            {loading ? "LOADING..." : `ALL SKUS · LAST UPDATED ${lastUpdated} · AUTO-REFRESH 60s`}
          </div>
        </div>
        <button
          onClick={fetchAlerts}
          style={{
            fontFamily: "JetBrains Mono, monospace", fontSize: "9px",
            color: "#484F58", background: "transparent",
            border: "1px solid #1C2128", borderRadius: "8px",
            padding: "8px 14px", cursor: "pointer", letterSpacing: "0.08em",
          }}
        >
          ↺ REFRESH
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {(["red", "amber", "green"] as const).map((s) => (
          <div key={s} style={{
            background: "#0D1117", border: `1px solid ${statusColor(s)}22`,
            borderRadius: "12px", padding: "16px 20px",
            animation: "fadeUp 0.4s ease",
          }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#484F58", letterSpacing: "0.1em", marginBottom: "8px" }}>
              {statusLabel(s)}
            </div>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: "32px", fontWeight: 800, color: statusColor(s) }}>
              {counts[s]}
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#30363D", marginTop: "4px" }}>
              {s === "red" ? "≤7 days" : s === "amber" ? "8–14 days" : "15+ days"}
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "8px" }}>
        {(["all", "red", "amber", "green"] as const).map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? statusColor(f === "all" ? "green" : f) : "transparent",
              borderColor: filter === f ? statusColor(f === "all" ? "green" : f) : "#1C2128",
              color: filter === f ? "#080C10" : "#484F58",
            }}
          >
            {f.toUpperCase()} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{
          background: "#0D1117", border: "1px dashed #1C2128",
          borderRadius: "16px", padding: "60px", textAlign: "center",
        }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#484F58", letterSpacing: "0.1em" }}>
            FETCHING INVENTORY STATUS...
          </div>
        </div>
      )}

      {/* Table header */}
      {!loading && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "8px 80px 1fr 100px 100px 100px 120px 80px",
          gap: "16px", padding: "0 20px",
        }}>
          {["", "SKU", "MESSAGE", "STOCK", "VELOCITY", "RUNWAY", "STATUS", ""].map((h, i) => (
            <div key={i} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#30363D", letterSpacing: "0.1em" }}>
              {h}
            </div>
          ))}
        </div>
      )}

      {/* Rows */}
      {!loading && filtered.map((alert, idx) => {
        const sc = statusColor(alert.status);
        return (
          <div
            key={alert.sku_id}
            className="inv-row"
            style={{ animationDelay: `${idx * 0.05}s` }}
            onClick={() => onSelectSku(alert.sku_id)}
          >
            {/* Status dot */}
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: sc, boxShadow: `0 0 6px ${sc}88` }} />

            {/* SKU */}
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 800, color: "#00D2FF" }}>
              {alert.sku_id}
            </div>

            {/* Message */}
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#484F58" }}>
              {alert.message}
            </div>

            {/* Stock */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#30363D", marginBottom: "2px" }}>STOCK</div>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, color: "#00E676" }}>
                {alert.current_stock.toLocaleString()}
              </div>
            </div>

            {/* Velocity */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#30363D", marginBottom: "2px" }}>VELOCITY</div>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, color: "#FFAA00" }}>
                {alert.avg_daily_sales}/d
              </div>
            </div>

            {/* Runway */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#30363D", marginBottom: "2px" }}>RUNWAY</div>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, color: sc }}>
                {alert.days_until_stockout}d
              </div>
            </div>

            {/* Status badge */}
            <div style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: "8px",
              color: sc, background: `${sc}15`,
              border: `1px solid ${sc}30`, borderRadius: "100px",
              padding: "4px 10px", letterSpacing: "0.1em", textAlign: "center",
            }}>
              {statusLabel(alert.status)}
            </div>

            {/* View button */}
            <button
              className="view-btn"
              onClick={(e) => { e.stopPropagation(); onSelectSku(alert.sku_id); }}
            >
              VIEW →
            </button>
          </div>
        );
      })}

      {/* Empty filtered state */}
      {!loading && filtered.length === 0 && (
        <div style={{
          background: "#0D1117", border: "1px dashed #1C2128",
          borderRadius: "16px", padding: "40px", textAlign: "center",
        }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#484F58", letterSpacing: "0.1em" }}>
            NO {filter.toUpperCase()} ALERTS
          </div>
        </div>
      )}
    </div>
  );
}