"use client";
import React, { useEffect, useState } from "react";

interface LoadingScreenProps {
  skuId: string;
}

const STEPS = [
  "CONNECTING TO JAFZA LEDGER",
  "PARSING HISTORICAL MATRIX",
  "COMPUTING RAMADAN FACTORS",
  "CALIBRATING FORECAST ENGINE",
  "INITIALIZING LLAMA ADVISOR",
];

export default function LoadingScreen({ skuId }: LoadingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setCurrentStep(0);
    setProgress(0);
    const interval = setInterval(() => {
      setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
      setProgress((p) => Math.min(p + 100 / STEPS.length, 92));
    }, 550);
    return () => clearInterval(interval);
  }, [skuId]);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#080C10",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      fontFamily: "JetBrains Mono, monospace",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;700&family=Syne:wght@800&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .ls-fadein { animation: fadeUp 0.5s ease forwards; }
      `}</style>

      {/* Grid background */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,170,0,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,170,0,0.025) 1px, transparent 1px)`,
        backgroundSize: "48px 48px",
        maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black, transparent)",
      }} />

      {/* Scanline sweep */}
      <div style={{
        position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", left: 0, right: 0, height: "2px",
          background: "linear-gradient(90deg, transparent, rgba(255,170,0,0.08), transparent)",
          animation: "scanline 3s linear infinite",
        }} />
      </div>

      {/* Content */}
      <div style={{ position: "relative", textAlign: "center", width: "360px" }}>

        {/* Logo */}
        <div className="ls-fadein" style={{
          fontFamily: "Syne, sans-serif", fontSize: "22px", fontWeight: 800,
          color: "#FFAA00", letterSpacing: "0.06em", marginBottom: "6px",
          animationDelay: "0s",
        }}>
          ◈ ORACLE
        </div>
        <div className="ls-fadein" style={{
          fontSize: "9px", letterSpacing: "0.25em", color: "#30363D",
          marginBottom: "40px", animationDelay: "0.1s",
        }}>
          LOGISTICS INTELLIGENCE ENGINE
        </div>

        {/* SKU pill */}
        <div className="ls-fadein" style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          background: "rgba(0,210,255,0.05)",
          border: "1px solid rgba(0,210,255,0.18)",
          borderRadius: "100px", padding: "7px 18px",
          marginBottom: "44px", animationDelay: "0.2s",
        }}>
          <div style={{
            width: "5px", height: "5px", borderRadius: "50%",
            background: "#00D2FF", animation: "blink 1.4s infinite",
          }} />
          <span style={{ fontSize: "11px", color: "#00D2FF", letterSpacing: "0.14em" }}>
            LOADING · {skuId}
          </span>
        </div>

        {/* Active step */}
        <div className="ls-fadein" style={{
          fontSize: "11px", color: "#FFAA00",
          letterSpacing: "0.1em", marginBottom: "12px",
          minHeight: "16px", animationDelay: "0.3s",
        }}>
          {STEPS[currentStep]}{dots}
        </div>

        {/* Completed steps */}
        <div style={{ marginBottom: "36px", minHeight: "72px" }}>
          {STEPS.slice(0, currentStep).map((step, i) => (
            <div key={i} style={{
              fontSize: "9px", color: "#2A3040",
              letterSpacing: "0.08em", marginBottom: "5px",
              display: "flex", alignItems: "center",
              justifyContent: "center", gap: "8px",
            }}>
              <span style={{ color: "#00E676", fontSize: "8px" }}>✓</span>
              {step}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="ls-fadein" style={{
          height: "2px", background: "#1C2128",
          borderRadius: "2px", overflow: "hidden",
          animationDelay: "0.4s",
        }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #FFAA00, #FFD060)",
            borderRadius: "2px",
            transition: "width 0.4s ease",
            boxShadow: "0 0 10px rgba(255,170,0,0.7)",
          }} />
        </div>

        <div style={{
          marginTop: "10px", fontSize: "9px",
          color: "#30363D", letterSpacing: "0.12em",
        }}>
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
}