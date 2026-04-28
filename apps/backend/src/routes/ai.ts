import { Router } from "express";
import axios from "axios";
import { ENV } from "../config/env";

export const aiRoutes = Router();

aiRoutes.post("/ask", async (req, res) => {
  const { question } = req.body as { question?: string };
  if (!question) { res.status(400).json({ error: "question required" }); return; }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${ENV.GEMINI_API_KEY}`;
    const { data } = await axios.post(url, {
      contents: [{
        parts: [{
          text: `You are MediGuard AI. Answer briefly and safely. Always advise consulting a doctor.\n\nQuestion: ${question}`,
        }],
      }],
    });
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Unable to respond.";
    res.json({ answer });
  } catch {
    res.status(500).json({ error: "AI service temporarily unavailable" });
  }
});
