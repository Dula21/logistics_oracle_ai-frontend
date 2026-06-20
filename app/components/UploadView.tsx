"use client";
import React, { useCallback, useState, useEffect } from "react";

interface UploadViewProps {
  onSuccess: (skus: string[], firstSku: string, fileName: string) => void;
  onReset?: () => void;
  isCustomActive?: boolean;
  activeFileName?: string;
  authToken: string | null;
}

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;


type UploadState = "idle" | "dragging" | "uploading" | "success" | "error" | "resetting";

export default function UploadView({
  onSuccess,
  onReset,
  isCustomActive = false,
  activeFileName = "",
  authToken,
}: UploadViewProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");
  const [detectedSkus, setDetectedSkus] = useState<string[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [fileName, setFileName] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [pendingCallback, setPendingCallback] = useState<{ skus: string[]; first: string } | null>(null);

  useEffect(() => {
    if (isCustomActive && activeFileName && uploadState === "idle") {
      setFileName(activeFileName);
    }
  }, [isCustomActive, activeFileName]);

  // ─── Countdown timer after success ───────────────────────────────
  useEffect(() => {
    if (uploadState !== "success" || !pendingCallback) return;

    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          onSuccess(pendingCallback.skus, pendingCallback.first, fileName);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [uploadState, pendingCallback, onSuccess]);

  // ─── Drag & Drop handlers ─────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState("dragging");
  }, []);

  const onDragLeave = useCallback(() => {
    setUploadState("idle");
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  // ─── Upload handler ───────────────────────────────────────────────
  const handleUpload = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setUploadState("error");
      setMessage("Only .csv files are accepted.");
      return;
    }

    setUploadState("uploading");
    setFileName(file.name);
    setMessage("Uploading and validating...");
    setPendingCallback(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
       
      const res = await fetch(`${BACKEND_BASE_URL}/api/upload`, {
        method: "POST",
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadState("error");
        setMessage(data.detail || "Upload failed.");
        return;
      }

      setUploadState("success");
      setDetectedSkus(data.skus_detected ?? []);
      setRowCount(data.row_count ?? 0);
      setMessage(data.message);
      setPendingCallback({ skus: data.skus_detected, first: data.first_sku });

    } catch (err) {
      setUploadState("error");
      setMessage(`Connection error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // ─── Manual "Go Now" button ───────────────────────────────────────
  const handleGoNow = () => {
    if (pendingCallback) {
      onSuccess(pendingCallback.skus, pendingCallback.first, fileName);
    }
  };

  // ─── Reset handler (calls backend) ───────────────────────────────
  const handleReset = async () => {
    setUploadState("resetting");
    setMessage("Reverting to original dataset...");
    setPendingCallback(null);

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/upload/reset`, {
        method: "POST",
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      const data = await res.json();

      if (!res.ok) {
        setUploadState("error");
        setMessage(data.detail || "Reset failed.");
        return;
      }

      setUploadState("idle");
      setFileName("");
      setMessage("");
      onReset?.();

    } catch (err) {
      setUploadState("error");
      setMessage(`Reset failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // ─── Cancel handler ───────────────────────────────────────────────
  const handleCancel = () => {
    setPendingCallback(null);
    setUploadState("idle");
    setDetectedSkus([]);
    setFileName(activeFileName);
    setMessage("");
    onReset?.();
  };

  const isDragging = uploadState === "dragging";
  const isUploading = uploadState === "uploading";
  const isSuccess = uploadState === "success";
  const isError = uploadState === "error";
  const isResetting = uploadState === "resetting";

  const displayFileName = isSuccess && fileName
    ? fileName
    : activeFileName || fileName;

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 0" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes checkPop {
          0%   { transform: scale(0); opacity: 0; }
          70%  { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .upload-zone { transition: all 0.2s ease; }
        .upload-zone:hover {
          border-color: rgba(255,170,0,0.4) !important;
          background: rgba(255,170,0,0.03) !important;
        }
        .go-btn {
          font-family: JetBrains Mono, monospace;
          font-size: 10px; letter-spacing: 0.1em;
          padding: 8px 16px; border-radius: 8px; cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid rgba(0,210,255,0.3);
          background: rgba(0,210,255,0.08); color: #00D2FF;
        }
        .go-btn:hover { background: rgba(0,210,255,0.14); }
        .cancel-btn {
          font-family: JetBrains Mono, monospace;
          font-size: 10px; letter-spacing: 0.1em;
          padding: 8px 16px; border-radius: 8px; cursor: pointer;
          border: 1px solid #1C2128; background: transparent;
          color: #484F58; transition: all 0.15s ease;
        }
        .cancel-btn:hover { border-color: #30363D; color: #8B949E; }
      `}</style>

      {/* Header — no reset button here anymore */}
      <div style={{ marginBottom: "32px", animation: "fadeUp 0.5s ease" }}>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: "20px", fontWeight: 800, color: "#C9D1D9", marginBottom: "6px" }}>
          Upload Sales Data
        </div>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#484F58", letterSpacing: "0.1em" }}>
          CSV FORMAT · SKU_ID · DATE · SALES_UNITS REQUIRED
        </div>
      </div>

      {/* ── STATUS BAR — single reset button lives here only ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#0D1117", border: "1px solid #1C2128",
        borderRadius: "10px", padding: "12px 16px", marginBottom: "24px",
        animation: "fadeUp 0.5s ease 0.1s both",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: (isCustomActive || isSuccess) ? "#FFAA00" : "#00E676",
          }} />
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#8B949E", letterSpacing: "0.06em" }}>
            {isSuccess
              ? `PENDING COMMIT · ${fileName}`
              : isCustomActive
              ? `USING UPLOAD · ${displayFileName}`
              : "USING ORIGINAL · historic_sales.csv"}
          </span>
        </div>

        {/* THE ONE reset button — only when a custom CSV is committed, not during success countdown */}
        {isCustomActive && !isSuccess && (
          <button
            onClick={handleReset}
            disabled={isResetting || isUploading}
            style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: "9px",
              color: "#FF4444", background: "rgba(255,68,68,0.08)",
              border: "1px solid rgba(255,68,68,0.2)", borderRadius: "6px",
              padding: "5px 10px", cursor: "pointer", letterSpacing: "0.08em",
              transition: "all 0.15s ease",
              opacity: isResetting || isUploading ? 0.5 : 1,
            }}
          >
            {isResetting ? "RESETTING..." : "↺ RESET TO ORIGINAL"}
          </button>
        )}
      </div>

      {/* Drop zone */}
      <label htmlFor="csv-upload">
        <div
          className="upload-zone"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${
              isDragging ? "rgba(255,170,0,0.6)" :
              isSuccess  ? "rgba(0,230,118,0.4)" :
              isError    ? "rgba(255,68,68,0.4)" :
              "rgba(255,255,255,0.06)"
            }`,
            borderRadius: "16px", padding: "56px 32px", textAlign: "center",
            cursor: isUploading || isSuccess ? "default" : "pointer",
            background: isDragging ? "rgba(255,170,0,0.04)" : "#0D1117",
            position: "relative", overflow: "hidden",
            animation: "fadeUp 0.5s ease 0.2s both", transition: "all 0.2s ease",
          }}
        >
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `
              linear-gradient(rgba(255,170,0,0.015) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,170,0,0.015) 1px, transparent 1px)`,
            backgroundSize: "32px 32px", pointerEvents: "none",
          }} />

          <div style={{ position: "relative", marginBottom: "20px" }}>
            {isUploading || isResetting ? (
              <div style={{
                width: "48px", height: "48px", margin: "0 auto",
                border: "2px solid #1C2128", borderTopColor: "#FFAA00",
                borderRadius: "50%", animation: "spin 0.8s linear infinite",
              }} />
            ) : isSuccess ? (
              <div style={{
                width: "48px", height: "48px", margin: "0 auto",
                background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.3)",
                borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", animation: "checkPop 0.4s ease forwards", fontSize: "20px",
              }}>✓</div>
            ) : isError ? (
              <div style={{
                width: "48px", height: "48px", margin: "0 auto",
                background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)",
                borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "20px",
              }}>✕</div>
            ) : (
              <div style={{
                width: "48px", height: "48px", margin: "0 auto",
                background: "rgba(255,170,0,0.06)", border: "1px solid rgba(255,170,0,0.15)",
                borderRadius: "12px", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "20px",
              }}>📂</div>
            )}
          </div>

          <div style={{ fontFamily: "Syne, sans-serif", fontSize: "15px", fontWeight: 700, color: "#C9D1D9", marginBottom: "8px" }}>
            {isUploading  ? "Processing CSV..."        :
             isResetting  ? "Reverting..."             :
             isSuccess    ? "Upload Successful"        :
             isError      ? "Upload Failed"            :
             isDragging   ? "Drop it here"             :
             "Drop CSV here or click to browse"}
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: isError ? "#FF4444" : "#484F58", letterSpacing: "0.06em" }}>
            {message || "Accepts .csv files with SKU_ID, Date, Sales_Units columns"}
          </div>
        </div>
      </label>

      <input id="csv-upload" type="file" accept=".csv" onChange={onFileInput} style={{ display: "none" }} />

      {/* Success panel — only GO NOW and CANCEL, no restore button */}
      {isSuccess && detectedSkus.length > 0 && (
        <div style={{
          marginTop: "20px", background: "#0D1117",
          border: "1px solid rgba(0,230,118,0.2)", borderRadius: "12px", padding: "20px",
          animation: "fadeUp 0.4s ease",
        }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#00E676", letterSpacing: "0.12em", marginBottom: "14px" }}>
            ✓ {rowCount} ROWS LOADED · {detectedSkus.length} SKUS DETECTED
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
            {detectedSkus.map((sku) => (
              <div key={sku} style={{
                fontFamily: "JetBrains Mono, monospace", fontSize: "11px", fontWeight: 700,
                color: "#00D2FF", background: "rgba(0,210,255,0.06)",
                border: "1px solid rgba(0,210,255,0.2)", borderRadius: "6px",
                padding: "5px 12px", letterSpacing: "0.06em",
              }}>
                {sku}
              </div>
            ))}
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#484F58", letterSpacing: "0.08em" }}>
                AUTO-LOADING IN {countdown}s...
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="go-btn" onClick={handleGoNow}>▶ GO NOW</button>
                <button className="cancel-btn" onClick={handleCancel}>✕ CANCEL</button>
              </div>
            </div>

            <div style={{ height: "2px", background: "#1C2128", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${(countdown / 5) * 100}%`,
                background: "linear-gradient(90deg, #00E676, #00D2FF)",
                borderRadius: "2px", transition: "width 1s linear",
                boxShadow: "0 0 6px rgba(0,230,118,0.5)",
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Error retry */}
      {isError && (
        <div style={{ marginTop: "16px", textAlign: "center", animation: "fadeUp 0.3s ease" }}>
          <button
            onClick={() => { setUploadState("idle"); setMessage(""); }}
            style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: "9px",
              color: "#8B949E", background: "transparent",
              border: "1px solid #1C2128", borderRadius: "8px",
              padding: "8px 16px", cursor: "pointer", letterSpacing: "0.08em",
            }}
          >
            ↺ TRY AGAIN
          </button>
        </div>
      )}

      {/* Format guide */}
      {(uploadState === "idle" || uploadState === "dragging") && (
        <div style={{
          marginTop: "24px", background: "#0D1117",
          border: "1px solid #1C2128", borderRadius: "12px", padding: "20px",
          animation: "fadeUp 0.5s ease 0.3s both",
        }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#484F58", letterSpacing: "0.12em", marginBottom: "14px" }}>
            REQUIRED CSV FORMAT
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "JetBrains Mono, monospace", fontSize: "10px" }}>
              <thead>
                <tr>
                  {["SKU_ID", "Date", "Sales_Units", "Stock_On_Hand", "Ramadan", "Promo_Active"].map(col => (
                    <th key={col} style={{ padding: "6px 10px", textAlign: "left", color: "#FFAA00", borderBottom: "1px solid #1C2128", whiteSpace: "nowrap" }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["A1023", "2025-03-01", "42", "500", "1", "0"],
                  ["A1023", "2025-03-02", "38", "458", "1", "1"],
                ].map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: "6px 10px", color: "#8B949E", borderBottom: "1px solid #1C2128" }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: "12px", fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#30363D", letterSpacing: "0.06em" }}>
            Stock_On_Hand · Ramadan · Promo_Active are optional but recommended
          </div>
        </div>
      )}
    </div>
  );
}