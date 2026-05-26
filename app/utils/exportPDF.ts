import jsPDF from "jspdf";

export type PDFExportData = {
  skuId: string;
  stock: number;
  avgSales: number;
  daysToStockout: number;
  usedUnits: number;
  advice: string;
  ramadanFactor?: number;
  promoFactor?: number;
};

const STATUS = (days: number) =>
  days < 7 ? "CRITICAL" : days < 15 ? "WARNING" : "SECURE";

const STATUS_COLOR = (days: number): [number, number, number] =>
  days < 7 ? [255, 68, 68] : days < 15 ? [255, 170, 0] : [0, 230, 118];

// Strip any non-Latin1 characters jsPDF can't render
function sanitizeForPDF(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Keep only printable ASCII (32-126) and newline (10)
    if ((code >= 32 && code <= 126) || code === 10) {
      result += text[i];
    }
  }
  return result.replace(/ +/g, " ").trim();
}

export async function exportDashboardPDF(data: PDFExportData) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210;
  const MARGIN = 16;
  const COL = W - MARGIN * 2;
  let y = 0;

  // ─── Helpers ─────────────────────────────────────────────────────
  const hex = (r: number, g: number, b: number) => pdf.setTextColor(r, g, b);
  const fill = (r: number, g: number, b: number) => pdf.setFillColor(r, g, b);
  const draw = (r: number, g: number, b: number) => pdf.setDrawColor(r, g, b);

  // ─── HEADER BAND ─────────────────────────────────────────────────
  fill(13, 17, 23);
  pdf.rect(0, 0, W, 28, "F");

  // Logo text
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  hex(255, 170, 0);
  pdf.text(">> ORACLE LOGISTICS", MARGIN, 12);

  // Subtitle
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  hex(72, 79, 88);
  pdf.text("DUBAI SME INVENTORY INTELLIGENCE REPORT", MARGIN, 18);

  // Date stamp
  const now = new Date().toLocaleDateString("en-AE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
  pdf.text(`GENERATED: ${now}`, W - MARGIN, 18, { align: "right" });

  // Amber accent line
  fill(255, 170, 0);
  pdf.rect(0, 26, W, 1.2, "F");

  y = 36;

  // ─── SKU SECTION LABEL ───────────────────────────────────────────
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  hex(72, 79, 88);
  pdf.text("TARGET SKU", MARGIN, y);

  pdf.setFontSize(20);
  hex(0, 210, 255);
  pdf.text(data.skuId, MARGIN, y + 8);

  // Status badge
  const sc = STATUS_COLOR(data.daysToStockout);
  const sl = STATUS(data.daysToStockout);
  fill(...sc);
  pdf.roundedRect(W - MARGIN - 28, y - 2, 28, 12, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  hex(13, 17, 23);
  pdf.text(sl, W - MARGIN - 14, y + 5.5, { align: "center" });

  y += 20;

  // ─── DIVIDER ─────────────────────────────────────────────────────
  draw(28, 33, 40);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN, y, W - MARGIN, y);
  y += 8;

  // ─── KPI CARDS ROW ───────────────────────────────────────────────
  const kpis = [
    { label: "STOCK UNITS", value: data.stock.toLocaleString(), color: [0, 230, 118] as [number,number,number] },
    { label: "DAILY VELOCITY", value: `${data.avgSales} u/day`, color: [255, 170, 0] as [number,number,number] },
    { label: "RUNWAY LEFT", value: `${data.daysToStockout} days`, color: sc },
    { label: "WEEKLY BURN", value: `${data.usedUnits} u/wk`, color: [0, 210, 255] as [number,number,number] },
  ];

  const cardW = (COL - 9) / 4;
  kpis.forEach((kpi, i) => {
    const x = MARGIN + i * (cardW + 3);

    // Card background
    fill(13, 17, 23);
    draw(28, 33, 40);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, y, cardW, 22, 2, 2, "FD");

    // Top accent bar
    fill(...kpi.color);
    pdf.roundedRect(x, y, cardW, 1.2, 1, 1, "F");

    // Label
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    hex(72, 79, 88);
    pdf.text(kpi.label, x + cardW / 2, y + 7, { align: "center" });

    // Value
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    hex(...kpi.color);
    pdf.text(kpi.value, x + cardW / 2, y + 16, { align: "center" });
  });

  y += 30;

  // ─── SEASONAL FACTORS ─────────────────────────────────────────────
  if (data.ramadanFactor || data.promoFactor) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    hex(72, 79, 88);
    pdf.text("SEASONAL IMPACT FACTORS", MARGIN, y);
    y += 6;

    const factors = [
      { label: "Ramadan Spike", value: `${data.ramadanFactor ?? 1.8}x`, color: [168, 85, 247] as [number,number,number] },
      { label: "Promo Spike", value: `${data.promoFactor ?? 1.3}x`, color: [236, 72, 153] as [number,number,number] },
      { label: "2026 Buffer Needed", value: `+${Math.round((data.ramadanFactor ?? 1.8) * 100 - 100)}%`, color: [0, 210, 255] as [number,number,number] },
    ];

    factors.forEach((f, i) => {
      const x = MARGIN + i * ((COL - 6) / 3 + 3);
      const fw = (COL - 6) / 3;

      fill(13, 17, 23);
      draw(28, 33, 40);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(x, y, fw, 18, 2, 2, "FD");

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6);
      hex(72, 79, 88);
      pdf.text(f.label.toUpperCase(), x + fw / 2, y + 6, { align: "center" });

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      hex(...f.color);
      pdf.text(f.value, x + fw / 2, y + 14, { align: "center" });
    });

    y += 26;
  }

  // ─── DIVIDER ─────────────────────────────────────────────────────
  draw(28, 33, 40);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN, y, W - MARGIN, y);
  y += 8;

  // ─── LLAMA ADVISORY ──────────────────────────────────────────────
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  hex(255, 170, 0);
  pdf.text(">> LLAMA ADVISOR RECOMMENDATION", MARGIN, y);
  y += 6;

  // Advisory box
  fill(8, 12, 16);
  draw(255, 170, 0);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(MARGIN, y, COL, 2, 2, 2, "F"); // top amber line

  fill(13, 17, 23);
  draw(28, 33, 40);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(MARGIN, y + 2, COL, 50, 2, 2, "FD");

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  hex(139, 148, 158);

  const adviceLines = pdf.splitTextToSize(sanitizeForPDF(data.advice || "No advisory generated."), COL - 8);
  pdf.text(adviceLines, MARGIN + 4, y + 10);

  y += 60;

  // ─── DIVIDER ─────────────────────────────────────────────────────
  draw(28, 33, 40);
  pdf.line(MARGIN, y, W - MARGIN, y);
  y += 8;

  // ─── RUNWAY STATUS ───────────────────────────────────────────────
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  hex(72, 79, 88);
  pdf.text("RUNWAY STATUS", MARGIN, y);
  y += 5;

  // Progress bar background
  fill(28, 33, 40);
  pdf.roundedRect(MARGIN, y, COL, 5, 1, 1, "F");

  // Progress bar fill
  const pct = Math.min(1, data.daysToStockout / 60);
  fill(...sc);
  pdf.roundedRect(MARGIN, y, COL * pct, 5, 1, 1, "F");

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6);
  hex(...sc);
  pdf.text(`${data.daysToStockout} days remaining`, MARGIN, y + 10);
  hex(72, 79, 88);
  pdf.text("60 day window", W - MARGIN, y + 10, { align: "right" });

  y += 18;

  // ─── FOOTER ──────────────────────────────────────────────────────
  fill(13, 17, 23);
  pdf.rect(0, 280, W, 17, "F");

  fill(255, 170, 0);
  pdf.rect(0, 280, W, 0.8, "F");

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6);
  hex(72, 79, 88);
  pdf.text(">> Oracle Logistics - Dubai SME Intelligence Engine - Confidential", MARGIN, 288);
  pdf.text("Powered by Prophet + Llama AI", W - MARGIN, 288, { align: "right" });

  // ─── SAVE ────────────────────────────────────────────────────────
  pdf.save(`Oracle_${data.skuId}_${new Date().toISOString().slice(0, 10)}.pdf`);
}