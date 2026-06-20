"use client";
import React, { useState } from "react";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface LoginPageProps {
  onLogin: (token: string, role: string, email: string) => void;
}

type AuthMode = "login" | "register";

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"manager" | "warehouse" | "finance">("manager");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("Email and password required.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const endpoint = mode === "login" ? "/auth/login" : "/auth/register";

    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);
    if (mode === "register") {
      formData.append("role", selectedRole);
    }

    try {
      const res = await fetch(`${BACKEND_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Authentication failed.");
        return;
      }

      if (mode === "register") {
        setSuccess("Account created. Logging you in...");
        setTimeout(() => onLogin(data.access_token, data.role, email), 1000);
      } else {
        onLogin(data.access_token, data.role, email);
      }
    } catch (err) {
      setError("Connection error. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#080C10",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-input {
          width: 100%;
          background: #0D1117;
          border: 1px solid #1C2128;
          border-radius: 8px;
          padding: 12px 16px;
          color: #C9D1D9;
          font-family: JetBrains Mono, monospace;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .auth-input:focus { border-color: #FFAA00; }
        .auth-btn {
          width: 100%;
          background: #FFAA00;
          color: #080C10;
          border: none;
          border-radius: 8px;
          padding: 13px;
          font-family: JetBrains Mono, monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .auth-btn:hover { opacity: 0.85; }
        .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .mode-btn {
          background: transparent;
          border: none;
          color: #FFAA00;
          font-family: JetBrains Mono, monospace;
          font-size: 11px;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
        }
        .role-btn {
          flex: 1;
          font-family: JetBrains Mono, monospace;
          font-size: 9px;
          letter-spacing: 0.08em;
          padding: 8px 4px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }
      `}</style>

      <div style={{
        width: "100%", maxWidth: "400px", padding: "0 24px",
        animation: "fadeUp 0.5s ease",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{
            fontFamily: "Syne, sans-serif", fontSize: "24px",
            fontWeight: 800, color: "#FFAA00", marginBottom: "6px",
          }}>
            LOGISTICS ORACLE
          </div>
          <div style={{
            fontFamily: "JetBrains Mono, monospace", fontSize: "9px",
            color: "#484F58", letterSpacing: "0.2em",
          }}>
            DUBAI SME INTELLIGENCE PLATFORM
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "#0D1117", border: "1px solid #1C2128",
          borderRadius: "16px", padding: "32px",
        }}>
          <div style={{
            fontFamily: "JetBrains Mono, monospace", fontSize: "11px",
            color: "#484F58", letterSpacing: "0.1em", marginBottom: "24px",
            textAlign: "center",
          }}>
            {mode === "login" ? "SIGN IN TO YOUR ACCOUNT" : "CREATE AN ACCOUNT"}
          </div>

          {/* Email */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: "9px",
              color: "#484F58", letterSpacing: "0.1em", marginBottom: "6px",
            }}>
              EMAIL
            </div>
            <input
              className="auth-input"
              type="email"
              placeholder="you@company.ae"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: mode === "register" ? "16px" : "24px" }}>
            <div style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: "9px",
              color: "#484F58", letterSpacing: "0.1em", marginBottom: "6px",
            }}>
              PASSWORD
            </div>
            <input
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {/* Role selector — only on register */}
          {mode === "register" && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{
                fontFamily: "JetBrains Mono, monospace", fontSize: "9px",
                color: "#484F58", letterSpacing: "0.1em", marginBottom: "8px",
              }}>
                ROLE
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {(["manager", "warehouse", "finance"] as const).map((r) => (
                  <button
                    key={r}
                    className="role-btn"
                    onClick={() => setSelectedRole(r)}
                    style={{
                      border: `1px solid ${selectedRole === r ? "#FFAA00" : "#1C2128"}`,
                      background: selectedRole === r ? "rgba(255,170,0,0.1)" : "transparent",
                      color: selectedRole === r ? "#FFAA00" : "#484F58",
                    }}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: "10px",
              color: "#FF4444", marginBottom: "16px",
              background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.2)",
              borderRadius: "6px", padding: "10px 12px",
            }}>
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: "10px",
              color: "#00E676", marginBottom: "16px",
              background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.2)",
              borderRadius: "6px", padding: "10px 12px",
            }}>
              {success}
            </div>
          )}

          {/* Submit */}
          <button
            className="auth-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "AUTHENTICATING..." : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>

          {/* Switch mode */}
          <div style={{
            textAlign: "center", marginTop: "20px",
            fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#484F58",
          }}>
            {mode === "login" ? (
              <>No account?{" "}
                <button className="mode-btn" onClick={() => { setMode("register"); setError(""); }}>
                  Register here
                </button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button className="mode-btn" onClick={() => { setMode("login"); setError(""); }}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{
          textAlign: "center", marginTop: "20px",
          fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#30363D",
        }}>
          ADMIN ACCOUNTS ARE CREATED BY SYSTEM ADMINISTRATORS ONLY
        </div>
      </div>
    </div>
  );
}