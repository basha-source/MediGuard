import { useState } from "react";
import { checkDrugInteraction } from "@/services/openFDA";

export function DrugInteractionsPage() {
  const [drug1, setDrug1]   = useState("");
  const [drug2, setDrug2]   = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!drug1.trim() || !drug2.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await checkDrugInteraction(drug1, drug2);
      setResult(data);
    } catch {
      setError("Could not check interaction. Ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  const interactions: string[] = result?.interactions ?? [];
  const hasInteraction = interactions.length > 0;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Drug Interaction Checker</h1>
      <p className="text-text-secondary text-sm mb-6">Check if two medicines interact using the OpenFDA database.</p>

      <form onSubmit={handleCheck} className="bg-card rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Drug 1</label>
            <input value={drug1} onChange={(e) => setDrug1(e.target.value)} required placeholder="e.g. Aspirin"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Drug 2</label>
            <input value={drug2} onChange={(e) => setDrug2(e.target.value)} required placeholder="e.g. Warfarin"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-green-dark transition-colors disabled:opacity-60">
          {loading ? "Checking…" : "Check Interaction"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
          <p className="text-alert-red text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className={`rounded-2xl p-5 border ${hasInteraction ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{hasInteraction ? "⚠️" : "✅"}</span>
            <h2 className={`font-bold text-lg ${hasInteraction ? "text-red-700" : "text-green-700"}`}>
              {hasInteraction ? "Interaction Detected" : "No Interaction Found"}
            </h2>
          </div>

          <p className="text-sm text-text-primary mb-2">
            <strong>{drug1}</strong> + <strong>{drug2}</strong>
          </p>

          {hasInteraction ? (
            <ul className="space-y-2 mt-3">
              {interactions.map((line: string, i: number) => (
                <li key={i} className="text-sm text-red-800 bg-white/70 rounded-lg px-3 py-2">{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-green-700">No known interactions found between these two drugs in the OpenFDA database. Always consult your doctor for clinical advice.</p>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl text-xs text-yellow-800">
        ⚠️ This tool is for informational purposes only. Always consult a qualified healthcare provider before making medication decisions.
      </div>
    </div>
  );
}
