import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { Vaccination } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  due:       "bg-yellow-100 text-yellow-700",
  overdue:   "bg-red-100 text-red-700",
};

export function VaccinationPage() {
  const { user }                = useAuthStore();
  const [vaccines, setVaccines] = useState<Vaccination[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name: "", date: "", validUntil: "", status: "completed" as Vaccination["status"] });
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    return onSnapshot(
      query(collection(db(), FIRESTORE.VACCINATIONS), where("userId", "==", user.id)),
      (s) => setVaccines(s.docs.map((d) => ({ id: d.id, ...d.data() } as Vaccination))
        .sort((a, b) => b.date.localeCompare(a.date)))
    );
  }, [user?.id]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    await addDoc(collection(db(), FIRESTORE.VACCINATIONS), { ...form, userId: user.id });
    setForm({ name: "", date: "", validUntil: "", status: "completed" });
    setShowForm(false); setSaving(false);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Vaccination Records</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-green-dark transition-colors">
          + Add Vaccine
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <h2 className="font-bold text-text-primary mb-4">Add Vaccination</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Vaccine Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. COVID-19 Booster"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Date Taken *</label>
              <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Valid Until</label>
              <input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Vaccination["status"] })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white">
                <option value="completed">Completed</option>
                <option value="due">Due</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-green-dark disabled:opacity-60">
              {saving ? "Saving…" : "Add"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {vaccines.length === 0 ? (
          <div className="text-center py-12 text-text-secondary bg-card rounded-2xl">
            <p className="text-3xl mb-2">💉</p>
            <p className="font-medium">No vaccination records</p>
          </div>
        ) : (
          vaccines.map((v) => (
            <div key={v.id} className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-text-primary">{v.name}</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Date: {v.date}{v.validUntil ? ` · Valid until: ${v.validUntil}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLE[v.status]}`}>{v.status}</span>
                <button onClick={() => deleteDoc(doc(db(), FIRESTORE.VACCINATIONS, v.id))} className="text-alert-red text-xs hover:underline">Remove</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
