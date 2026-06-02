import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { SideEffect, Medicine } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

const SEVERITY_STYLE: Record<string, string> = {
  mild:     "bg-yellow-100 text-yellow-700",
  moderate: "bg-orange-100 text-orange-700",
  severe:   "bg-red-100 text-red-700",
};

export function SideEffectsPage() {
  const { user }                    = useAuthStore();
  const [effects, setEffects]       = useState<SideEffect[]>([]);
  const [medicines, setMedicines]   = useState<Medicine[]>([]);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ medicineId: "", medicineName: "", symptoms: "", severity: "mild" as SideEffect["severity"], notes: "" });
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const unsubE = onSnapshot(
      query(collection(db(), FIRESTORE.SIDE_EFFECTS), where("userId", "==", user.id)),
      (s) => setEffects(s.docs.map((d) => ({ id: d.id, ...d.data() } as SideEffect))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt)))
    );
    const unsubM = onSnapshot(
      query(collection(db(), FIRESTORE.MEDICINES), where("userId", "==", user.id)),
      (s) => setMedicines(s.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine)))
    );
    return () => { unsubE(); unsubM(); };
  }, [user?.id]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    const med = medicines.find((m) => m.id === form.medicineId);
    await addDoc(collection(db(), FIRESTORE.SIDE_EFFECTS), {
      userId: user.id,
      medicineId: form.medicineId,
      medicineName: med?.name ?? form.medicineName,
      symptoms: form.symptoms.split(",").map((s) => s.trim()).filter(Boolean),
      severity: form.severity,
      notes: form.notes,
      startedAt: new Date().toISOString(),
    });
    setForm({ medicineId: "", medicineName: "", symptoms: "", severity: "mild", notes: "" });
    setShowForm(false); setSaving(false);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Side Effects</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-green-dark transition-colors">
          + Log Side Effect
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <h2 className="font-bold text-text-primary mb-4">Log Side Effect</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">Medicine</label>
              <select value={form.medicineId} onChange={(e) => setForm({ ...form, medicineId: e.target.value })} required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white">
                <option value="">Select medicine</option>
                {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Symptoms (comma separated)</label>
              <input value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} required
                placeholder="e.g. nausea, dizziness, headache"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Severity</label>
              <div className="flex gap-2">
                {(["mild", "moderate", "severe"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setForm({ ...form, severity: s })}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                      form.severity === s ? SEVERITY_STYLE[s] : "border border-gray-200 text-text-secondary"
                    }`}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-green-dark disabled:opacity-60">
              {saving ? "Saving…" : "Log"}
            </button>
          </div>
        </form>
      )}

      {effects.length === 0 ? (
        <div className="text-center py-12 text-text-secondary bg-card rounded-2xl border border-gray-100">
          <p className="text-3xl mb-2">😌</p>
          <p className="font-medium">No side effects logged</p>
        </div>
      ) : (
        <div className="space-y-3">
          {effects.map((e) => (
            <div key={e.id} className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-text-primary">{e.medicineName}</p>
                  <p className="text-xs text-text-secondary">{new Date(e.startedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${SEVERITY_STYLE[e.severity]}`}>{e.severity}</span>
                  <button onClick={() => deleteDoc(doc(db(), FIRESTORE.SIDE_EFFECTS, e.id))} className="text-alert-red text-xs hover:underline">Remove</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {e.symptoms.map((s) => (
                  <span key={s} className="px-2 py-0.5 bg-gray-100 text-text-secondary text-xs rounded-full">{s}</span>
                ))}
              </div>
              {e.notes && <p className="text-xs text-text-secondary mt-2 italic">"{e.notes}"</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
