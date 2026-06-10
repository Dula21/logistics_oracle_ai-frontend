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

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const STORAGE_KEY = "oracle_reorder_history";

function getToken(): string | null {
  return process.env.NEXT_PUBLIC_ADMIN_TOKEN || null;
}

// ── DB functions ────────────────────────────────────────────────────
export async function saveToHistory(
  entry: Omit<ReorderEntry, "id" | "timestamp">
): Promise<ReorderEntry> {
  const token = getToken();
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/history/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(entry),
    });
    if (res.ok) {
      const data = await res.json();
      return { ...entry, id: data.id, timestamp: data.created_at };
    }
  } catch {}
  // Fallback to localStorage if API fails
  return saveToLocalStorage(entry);
}

export async function deleteFromHistory(id: string): Promise<void> {
  const token = getToken();
  try {
    await fetch(`${BACKEND_BASE_URL}/api/history/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {}
}

export async function clearAllHistory(): Promise<void> {
  const token = getToken();
  try {
    await fetch(`${BACKEND_BASE_URL}/api/history`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {}
  localStorage.removeItem(STORAGE_KEY);
}

// ── localStorage fallback ────────────────────────────────────────────
function saveToLocalStorage(
  entry: Omit<ReorderEntry, "id" | "timestamp">
): ReorderEntry {
  const existing = loadFromLocalStorage();
  const newEntry: ReorderEntry = {
    ...entry,
    id: `${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  const updated = [newEntry, ...existing].slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newEntry;
}

function loadFromLocalStorage(): ReorderEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const statusColor = (s: string) =>
  s === "CRITICAL" ? "#FF4444" : s === "WARNING" ? "#FFAA00" : "#00E676";

export default function HistoryPanel() {
  const [entries, setEntries] = useState<ReorderEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchHistory() {
    const token = getToken();
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setLoading(false);
        return;
      }
    } catch {}
    // Fallback to localStorage
    setEntries(loadFromLocalStorage());
    setLoading(false);
  }

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClear = async () => {
    if (confirmClear) {
      await clearAllHistory();
      setEntries([]);
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteFromHistory(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
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
            {loading ? "LOADING..." : `${entries.length} SAVED ADVISORY LOGS · SYNCED TO DATABASE`}
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

      {/* Loading state */}
      {loading && (
        <div style={{
          background: "#0D1117", border: "1px dashed #1C2128",
          borderRadius: "16px", padding: "60px 32px", textAlign: "center",
        }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#484F58", letterSpacing: "0.1em" }}>
            FETCHING FROM DATABASE...
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
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
      {!loading && entries.map((entry, idx) => {
        const sc = statusColor(entry.status);
        const isOpen = expanded === entry.id;
        return (
          <div key={entry.id} className="history-row" style={{ animationDelay: `${idx * 0.05}s` }}>
            <div className="history-row-header" onClick={() => setExpanded(isOpen ? null : entry.id)}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: sc, flexShrink: 0, boxShadow: `0 0 6px ${sc}88` }} />
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 800, color: "#00D2FF", minWidth: "60px" }}>
                {entry.sku_id}
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#484F58", flex: 1 }}>
                {formatDate(entry.timestamp)}
              </div>
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
              <div style={{
                fontFamily: "JetBrains Mono, monospace", fontSize: "8px",
                color: sc, background: `${sc}15`,
                border: `1px solid ${sc}30`, borderRadius: "100px",
                padding: "3px 8px", letterSpacing: "0.1em", marginRight: "8px",
              }}>
                {entry.status}
              </div>
              <div style={{ color: "#30363D", fontSize: "10px", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}>
                ▼
              </div>
            </div>
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