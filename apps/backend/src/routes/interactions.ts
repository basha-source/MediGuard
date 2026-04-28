import { Router } from "express";
import axios from "axios";
import { API } from "@mediguard/shared";

export const interactionRoutes = Router();

interactionRoutes.get("/check", async (req, res) => {
  const { drug1, drug2 } = req.query as { drug1?: string; drug2?: string };
  if (!drug1 || !drug2) { res.status(400).json({ error: "drug1 and drug2 required" }); return; }
  try {
    const url = `${API.OPENFDA_BASE}/event.json?search=patient.drug.medicinalproduct:"${drug1}"+AND+patient.drug.medicinalproduct:"${drug2}"&limit=5`;
    const { data } = await axios.get(url);
    res.json(data);
  } catch {
    res.json({ results: [], meta: { results: { total: 0 } } });
  }
});

interactionRoutes.get("/substitutes", async (req, res) => {
  const { ingredient } = req.query as { ingredient?: string };
  if (!ingredient) { res.status(400).json({ error: "ingredient required" }); return; }
  try {
    const url = `${API.OPENFDA_BASE}/label.json?search=active_ingredient:"${ingredient}"&limit=10`;
    const { data } = await axios.get(url);
    res.json(data);
  } catch {
    res.json({ results: [] });
  }
});
