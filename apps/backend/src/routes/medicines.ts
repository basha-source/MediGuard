import { Router } from "express";
import { requireAuth } from "../middleware/auth";

export const medicineRoutes = Router();

medicineRoutes.get("/", requireAuth, (req, res) => {
  res.json({ message: "Get medicines — handled via Firestore on client" });
});
