"use client";
import React, { useEffect, useState } from "react";

export type ReorderEntry = {
  id: string;
  timestamp: string;
  sku_id: string;
  stock: number;
  days_until_stockout: number;
  avg_daily_sales: number;
  advice: string;
  status: "CRITICAL" | "WARNING" | "SECURE";
};

const STORAGE_KEY = "oracle_reorder_history";

export function saveToHistory(entry: Omit<ReorderEntry, "id" | "timestamp">) {
  const existing = loadHistory();
  const newEntry: ReorderEntry = {
    ...entry,
    id: `${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  const updated = [newEntry, ...existing].slice(0, 50); // max 50 entries
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newEntry;
}

export function loadHistory(): ReorderEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

const statusColor = (s: string) =>
  s === "CRITICAL" ? "#FF4444" : s === "WARNING" ? "#FFAA00" : "#00E676";

export default function HistoryPanel() {
  const [entries, setEntries] = useState<ReorderEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setEntries(loadHistory());

    // Sync across tabs
    const onStorage = () => setEntries(loadHistory());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleClear = () => {
    if (confirmClear) {
      clearHistory();
      setEntries([]);
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  const handleDelete = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setEntries(updated);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-AE", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .history-row {
          background: #0D1117;
          border: 1px solid #1C2128;
          border-radius: 12px;
          overflow: hidden;
          transition: border-color 0.2s;
          animation: fadeUp 0.4s ease forwards;
        }
        .history-row:hover { border-color: #30363D; }
        .history-row-header {
          display: flex;
          align-items: center;
          padding: 14px 18px;
          cursor: pointer;
          gap: 12px;
        }
        .del-btn {
          background: transparent;
          border: 1px solid rgba(255,68,68,0.2);
          color: #FF4444;
          border-radius: 6px;
          padding: 4px 8px;
          font-family: JetBrains Mono, monospace;
          font-size: 9px;
          cursor: pointer;
          transition: all 0.15s;
          letter-spacing: 0.06em;
        }
        .del-btn:hover { background: rgba(255,68,68,0.1); }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: "20px", fontWeight: 800, color: "#C9D1D9", marginBottom: "6px" }}>
            Reorder History
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#484F58", letterSpacing: "0.1em" }}>
            {entries.length} SAVED ADVISORY LOGS · STORED LOCALLY
          </div>
        </div>

        {entries.length > 0 && (
          <button onClick={handleClear} style={{
            fontFamily: "JetBrains Mono, monospace", fontSize: "9px",
            color: confirmClear ? "#FF4444" : "#484F58",
            background: confirmClear ? "rgba(255,68,68,0.08)" : "transparent",
            border: `1px solid ${confirmClear ? "rgba(255,68,68,0.3)" : "#1C2128"}`,
            borderRadius: "8px", padding: "8px 14px",
            cursor: "pointer", letterSpacing: "0.08em",
            transition: "all 0.2s ease",
          }}>
            {confirmClear ? "⚠ CONFIRM CLEAR ALL" : "↺ CLEAR ALL"}
          </button>
        )}
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div style={{
          background: "#0D1117", border: "1px dashed #1C2128",
          borderRadius: "16px", padding: "60px 32px",
          textAlign: "center", animation: "fadeUp 0.4s ease",
        }}>
          <div style={{ fontSize: "32px", marginBottom: "16px" }}>📋</div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: "15px", fontWeight: 700, color: "#30363D", marginBottom: "8px" }}>
            No history yet
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#21262D", letterSpacing: "0.08em" }}>
            Click "Save to Log" in the dashboard advisor panel to record an entry
          </div>
        </div>
      )}

      {/* Entries */}
      {entries.map((entry, idx) => {
        const sc = statusColor(entry.status);
        const isOpen = expanded === entry.id;

        return (
          <div key={entry.id} className="history-row" style={{ animationDelay: `${idx * 0.05}s` }}>

            {/* Row header — click to expand */}
            <div
              className="history-row-header"
              onClick={() => setExpanded(isOpen ? null : entry.id)}
            >
              {/* Status dot */}
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: sc, flexShrink: 0, boxShadow: `0 0 6px ${sc}88` }} />

              {/* SKU */}
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 800, color: "#00D2FF", minWidth: "60px" }}>
                {entry.sku_id}
              </div>

              {/* Date */}
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#484F58", flex: 1 }}>
                {formatDate(entry.timestamp)}
              </div>

              {/* Quick metrics */}
              <div style={{ display: "flex", gap: "16px", marginRight: "8px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#30363D", marginBottom: "2px" }}>STOCK</div>
                  <div style={{ fontFamily: "Syne, sans-serif", fontSize: "13px", fontWeight: 700, color: "#00E676" }}>{entry.stock}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#30363D", marginBottom: "2px" }}>RUNWAY</div>
                  <div style={{ fontFamily: "Syne, sans-serif", fontSize: "13px", fontWeight: 700, color: sc }}>{entry.days_until_stockout}d</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#30363D", marginBottom: "2px" }}>VELOCITY</div>
                  <div style={{ fontFamily: "Syne, sans-serif", fontSize: "13px", fontWeight: 700, color: "#FFAA00" }}>{entry.avg_daily_sales}/d</div>
                </div>
              </div>

              {/* Status badge */}
              <div style={{
                fontFamily: "JetBrains Mono, monospace", fontSize: "8px",
                color: sc, background: `${sc}15`,
                border: `1px solid ${sc}30`, borderRadius: "100px",
                padding: "3px 8px", letterSpacing: "0.1em", marginRight: "8px",
              }}>
                {entry.status}
              </div>

              {/* Chevron */}
              <div style={{ color: "#30363D", fontSize: "10px", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}>
                ▼
              </div>
            </div>

            {/* Expanded advice */}
            {isOpen && (
              <div style={{
                padding: "0 18px 18px 18px",
                borderTop: "1px solid #1C2128",
                paddingTop: "16px",
                animation: "fadeUp 0.3s ease",
              }}>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#484F58", letterSpacing: "0.1em", marginBottom: "10px" }}>
                  ◈ LLAMA ADVISORY LOGGED
                </div>
                <div style={{
                  fontFamily: "system-ui, sans-serif", fontSize: "12.5px",
                  color: "#8B949E", lineHeight: "1.7",
                  background: "#080C10", borderRadius: "8px",
                  padding: "14px 16px", marginBottom: "12px",
                  border: "1px solid #1C2128",
                }}>
                  {entry.advice}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="del-btn" onClick={() => handleDelete(entry.id)}>
                    ✕ DELETE ENTRY
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}