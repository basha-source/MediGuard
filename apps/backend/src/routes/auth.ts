import { Router } from "express";
import rateLimit   from "express-rate-limit";
import { adminAuth } from "../config/firebaseAdmin";

export const authRoutes = Router();

// 10 requests per 15 min per IP for general auth queries
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: "Too many requests, please try again later." },
});

// 3 attempts per hour for password reset
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      3,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: "Too many reset attempts, please try again in an hour." },
});

// POST /api/auth/check-email
// Returns { exists: boolean } — used by forgot-password flow for better UX
authRoutes.post("/check-email", authLimiter, async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "email is required" });
    return;
  }
  try {
    await adminAuth.getUserByEmail(email.trim().toLowerCase());
    res.json({ exists: true });
  } catch (e: any) {
    if (e?.code === "auth/user-not-found") {
      res.json({ exists: false });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// POST /api/auth/revoke-tokens
// Revokes all refresh tokens for a user (call on suspicious activity)
authRoutes.post("/revoke-tokens", resetLimiter, async (req, res) => {
  const { uid } = req.body as { uid?: string };
  if (!uid || typeof uid !== "string") {
    res.status(400).json({ error: "uid is required" });
    return;
  }
  try {
    await adminAuth.revokeRefreshTokens(uid);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to revoke tokens" });
  }
});
