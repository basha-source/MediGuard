import { Router } from "express";
import axios from "axios";
import { API } from "@mediguard/shared";
import { ENV } from "../config/env";

export const aiRoutes = Router();

// Models in preference order. gemini-2.0-flash / 1.5-* are intentionally excluded:
// on the current free tier they return 429 (quota limit 0) or 404 (retired).
// gemini-2.5-flash is the primary; gemini-flash-latest is a forward-compatible
// fallback so this keeps working if the alias target changes.
const AI_MODELS = ["gemini-2.5-flash", "gemini-flash-latest"];

aiRoutes.post("/ask", async (req, res) => {
  const { question } = req.body as { question?: string };
  if (!question) { res.status(400).json({ error: "question required" }); return; }

  const payload = {
    contents: [{
      parts: [{
        text: `You are MediGuard AI. Answer briefly and safely. Always advise consulting a doctor.\n\nQuestion: ${question}`,
      }],
    }],
  };

  let lastError: unknown = "unknown";
  for (const model of AI_MODELS) {
    try {
      const url = `${API.GEMINI_BASE}/models/${model}:generateContent?key=${ENV.GEMINI_API_KEY}`;
      const { data } = await axios.post(url, payload, { timeout: 15_000 });
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Unable to respond.";
      res.json({ answer });
      return;
    } catch (err: any) {
      lastError = err?.response?.data ?? err?.message ?? "unknown";
      console.error(`[AI] ${model} error:`, JSON.stringify(lastError));
      // try next model
    }
  }
  res.status(500).json({ error: "AI service temporarily unavailable", detail: lastError });
});
