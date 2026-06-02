import { Router } from "express";
import axios from "axios";
import { ENV } from "../config/env";

export const aiRoutes = Router();

aiRoutes.post("/ask", async (req, res) => {
  const { question } = req.body as { question?: string };
  if (!question) { res.status(400).json({ error: "question required" }); return; }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${ENV.GEMINI_API_KEY}`;
    const { data } = await axios.post(url, {
      contents: [{
        parts: [{
          text: `You are MediGuard AI. Answer briefly and safely. Always advise consulting a doctor.\n\nQuestion: ${question}`,
        }],
      }],
    }, { timeout: 15_000 });
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Unable to respond.";
    res.json({ answer });
  } catch (err: any) {
    const geminiError = err?.response?.data ?? err?.message ?? "unknown";
    console.error("[AI] Gemini error:", JSON.stringify(geminiError, null, 2));
    res.status(500).json({ error: "AI service temporarily unavailable", detail: geminiError });
  }
});
