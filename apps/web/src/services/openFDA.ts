import { ENV } from "@/config/env";

export async function checkDrugInteraction(drug1: string, drug2: string) {
  const res = await fetch(
    `${ENV.BACKEND_URL}/api/interactions/check?drug1=${encodeURIComponent(drug1)}&drug2=${encodeURIComponent(drug2)}`
  );
  if (!res.ok) throw new Error("Interaction check failed");
  return res.json();
}

export async function findSubstitutes(activeIngredient: string) {
  const res = await fetch(
    `${ENV.BACKEND_URL}/api/interactions/substitutes?ingredient=${encodeURIComponent(activeIngredient)}`
  );
  if (!res.ok) throw new Error("Substitute search failed");
  return res.json();
}
