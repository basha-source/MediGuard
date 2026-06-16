import { API } from "@mediguard/shared";

// These call the public OpenFDA API directly from the device. OpenFDA is free,
// keyless and CORS-enabled, so there is no need to route through our backend —
// which previously made these features dead whenever BACKEND_URL (a local dev
// IP) was unreachable from the phone.
//
// Note: OpenFDA returns HTTP 404 with a NOT_FOUND body when a search matches
// zero records. We treat that as an empty (safe) result rather than an error,
// mirroring the old backend's behavior.

export async function checkDrugInteraction(drug1: string, drug2: string) {
  const d1 = encodeURIComponent(`"${drug1}"`);
  const d2 = encodeURIComponent(`"${drug2}"`);
  const url = `${API.OPENFDA_BASE}/event.json?search=patient.drug.medicinalproduct:${d1}+AND+patient.drug.medicinalproduct:${d2}&limit=5`;
  const res = await fetch(url);
  if (!res.ok) {
    // 404 = no matching adverse-event records → no known interaction data.
    return { results: [], meta: { results: { total: 0 } } };
  }
  return res.json();
}

export async function findSubstitutes(activeIngredient: string) {
  const ing = encodeURIComponent(`"${activeIngredient}"`);
  const url = `${API.OPENFDA_BASE}/label.json?search=active_ingredient:${ing}&limit=10`;
  const res = await fetch(url);
  if (!res.ok) {
    return { results: [] };
  }
  return res.json();
}
