import { useState } from "react";
import { findSubstitutes } from "@/services/openFDA";

export function SubstituteFinderPage() {
  const [ingredient, setIngredient] = useState("");
  const [results, setResults]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [searched, setSearched]     = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!ingredient.trim()) return;
    setLoading(true); setError(""); setResults([]); setSearched(false);
    try {
      const data = await findSubstitutes(ingredient);
      setResults(data?.substitutes ?? data?.results ?? []);
      setSearched(true);
    } catch {
      setError("Could not fetch substitutes. Ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Substitute Finder</h1>
      <p className="text-text-secondary text-sm mb-6">Find alternative medicines by active ingredient using OpenFDA.</p>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input value={ingredient} onChange={(e) => setIngredient(e.target.value)} required placeholder="Enter active ingredient (e.g. ibuprofen)"
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        <button type="submit" disabled={loading}
          className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-green-dark transition-colors disabled:opacity-60 whitespace-nowrap">
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 text-alert-red text-sm">{error}</div>
      )}

      {searched && results.length === 0 && !error && (
        <div className="text-center py-12 text-text-secondary bg-card rounded-2xl border border-gray-100">
          <p className="text-3xl mb-2">🔍</p>
          <p className="font-medium">No substitutes found</p>
          <p className="text-sm mt-1">Try a different active ingredient name</p>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <p className="text-sm text-text-secondary mb-3">{results.length} result(s) for <strong>{ingredient}</strong></p>
          <div className="space-y-3">
            {results.map((r: any, i: number) => (
              <div key={i} className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="font-semibold text-text-primary">{r.brand_name ?? r.name ?? "Unknown"}</p>
                {r.generic_name && <p className="text-sm text-text-secondary mt-0.5">Generic: {r.generic_name}</p>}
                {r.manufacturer_name && <p className="text-xs text-text-secondary mt-1">Manufacturer: {r.manufacturer_name}</p>}
                {r.dosage_form && <p className="text-xs text-text-secondary">Form: {r.dosage_form}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl text-xs text-yellow-800">
        ⚠️ Always consult a pharmacist or doctor before switching medicines.
      </div>
    </div>
  );
}
