import { Router } from "express";
import axios from "axios";
import { API } from "@mediguard/shared";
import { ENV } from "../config/env";

export const medicineRoutes = Router();

function mapCategory(dosageForm: string): string {
  if (dosageForm.includes("tablet"))   return "tablet";
  if (dosageForm.includes("capsule"))  return "capsule";
  if (dosageForm.includes("solution") || dosageForm.includes("suspension") ||
      dosageForm.includes("liquid")   || dosageForm.includes("syrup"))      return "liquid";
  if (dosageForm.includes("inject"))   return "injection";
  return "other";
}

async function fdaLookup(searchParam: string): Promise<any[] | null> {
  try {
    const url = `${API.OPENFDA_BASE}/label.json?search=${searchParam}&limit=1`;
    const { data } = await axios.get(url, { timeout: 8000 });
    return data.results?.length ? data.results : null;
  } catch {
    return null;
  }
}

async function upcitemdbLookup(barcode: string): Promise<{ name: string; category: string } | null> {
  try {
    const { data } = await axios.get(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
      { timeout: 6000 }
    );
    const item = data.items?.[0];
    if (!item) return null;
    const title    = item.title ?? item.brand ?? "";
    const category = item.category?.toLowerCase() ?? "";
    return {
      name:     title || "Unknown Medicine",
      category: mapCategory(category),
    };
  } catch {
    return null;
  }
}

medicineRoutes.get("/lookup", async (req, res) => {
  const { barcode } = req.query as { barcode?: string };
  if (!barcode) { res.status(400).json({ error: "barcode required" }); return; }

  // 1. Try OpenFDA (US medicines)
  let results = await fdaLookup(`openfda.upc:"${barcode}"`);
  if (!results) results = await fdaLookup(`openfda.ean_pc:"${barcode}"`);

  if (results) {
    const r = results[0];
    const name       = r.openfda?.brand_name?.[0] ?? r.openfda?.generic_name?.[0] ?? "Unknown Medicine";
    const dosage     = r.openfda?.strength?.[0] ?? "";
    const dosageForm = r.openfda?.dosage_form?.[0]?.toLowerCase() ?? "";
    res.json({ name, dosage, category: mapCategory(dosageForm), source: "openfda" });
    return;
  }

  // 2. Fallback: UPCitemdb (global coverage including Indian products)
  const upc = await upcitemdbLookup(barcode);
  if (upc) {
    res.json({ name: upc.name, dosage: "", category: upc.category, source: "upcitemdb" });
    return;
  }

  res.status(404).json({ error: "Medicine not found for this barcode" });
});

medicineRoutes.post("/ocr", async (req, res) => {
  const { image, mode } = req.body as {
    image?: string;
    mode?: "expiry" | "prescription" | "packaging";
  };
  if (!image || !mode) { res.status(400).json({ error: "image and mode required" }); return; }

  let prompt: string;
  if (mode === "expiry") {
    prompt = `Find the expiry date on this medicine packaging. Return ONLY valid JSON with no markdown: {"expiry": "YYYY-MM-DD"}. If no date is visible, return {"expiry": null}.`;
  } else if (mode === "packaging") {
    prompt = `You are reading a medicine box or packaging (could be Indian or any country). Extract all visible information and return ONLY valid JSON with no markdown:
{"name": "brand or generic medicine name", "dosage": "strength like 500mg or 10ml, empty string if not visible", "category": "tablet|capsule|liquid|injection|other", "expiryDate": "YYYY-MM-DD if visible else null"}
Make your best guess for category based on the packaging. Never return null for name — use whatever is printed.`;
  } else {
    prompt = `Read this prescription image and list all medicines. Return ONLY valid JSON with no markdown: {"medicines": [{"name": "...", "dosage": "...", "category": "tablet|capsule|liquid|injection|other"}]}. Return empty array if nothing detected.`;
  }

  try {
    const url = `${API.GEMINI_BASE}/models/gemini-flash-latest:generateContent?key=${ENV.GEMINI_API_KEY}`;
    const { data } = await axios.post(url, {
      contents: [{
        parts: [
          { inline_data: { mime_type: "image/jpeg", data: image } },
          { text: prompt },
        ],
      }],
    }, { timeout: 30000 });

    let raw: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    console.log("[OCR] Gemini raw response:", raw);
    raw = raw.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err: any) {
    const detail = err?.response?.data?.error?.message ?? err?.message ?? "unknown";
    console.error("[OCR] failed:", detail);
    if (err?.response?.data) {
      console.error("[OCR] full Gemini response:", JSON.stringify(err.response.data));
    }
    res.status(500).json({ error: "OCR failed", detail });
  }
});
