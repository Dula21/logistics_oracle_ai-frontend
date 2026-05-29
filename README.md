## ◈ Llama Advisor Stream Integration

The frontend consumes live, asynchronous text streams from the FastAPI backend to display real-time logistics and strategic supply chain insights. 

### 📋 Expected Data Formats

#### 1. Operational Dashboard Streams (`/api/stream`)
Streams a 2-sentence risk-calculated action directive based on current warehouse metrics.
* **Format:** Raw text string, no markdown headers or bullet points.
* **Expected UI Component:** Standard text block with a streaming typewriter effect.
* **Example Output:** > WARNING status confirmed for SKU C9011 with 15 days of runway remaining. Prepare procurement documentation this week to coordinate regional JAFZA logistics layout before stock dips further.

#### 2. Strategic 2026 Planning Streams (`/api/stream/insights`)
Streams a highly mathematical, numbers-driven forecasting block optimized for Dubai seasonal demand spikes.
* **Format:** Explicitly includes mathematical formulas in plain text for data transparency.
* **Example Output:** > To beat the pre-Ramadan freight bottleneck, lead orders for SKU A1023 must arrive at Dubai ports by January 20, 2026, with a multiplied volume target of 49.5 units/day (30.0 units/day * 1.65x Ramadan Spike * 1.25x Promo Spike). This order buffer ensures a 60-day lead time prior to Ramadan 2026, accounting for potential delays in customs clearance and warehouse receipt.

---

### 🛡️ Core UI Implementation Rules

1. **Do Not Parse Markdown:** The backend is rigorously instructed to avoid rendering markdown tokens (`**`, `#`, `-`). Render the incoming chunks as a standard plain text stream.
2. **Handle Inline Exceptions/Guardrails:** The backend contains custom Python safety nets. If a stream is forcefully cut off or intercepted by a guardrail, it will prepend an emoji block. The frontend should look out for these exact strings to style them dynamically if needed:
   * `⚠️ [Guardrail]:` (Triggered on domain violations or critical overrides)
   * `◈ [Groq Error]` (Triggered on API or model failures)
3. **Connection Fallbacks:** If the stream drops an HTTP status other than `200`, ensure the UI catches the error state and avoids leaving an empty, spinning loading state on the advisor card.