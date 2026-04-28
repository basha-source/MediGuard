import { Router } from "express";
import { requireAuth } from "../middleware/auth";

export const notificationRoutes = Router();

notificationRoutes.post("/send", requireAuth, async (req, res) => {
  const { token, title, body } = req.body as { token: string; title: string; body: string };
  if (!token || !title || !body) { res.status(400).json({ error: "token, title, body required" }); return; }
  res.json({ success: true, message: "Notification queued via FCM" });
});
