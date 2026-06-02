import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, addDoc } from "firebase/firestore";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { Vital } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

type VitalType = Vital["type"];
const VITAL_CONFIG: Record<VitalType, { label: string; unit: string; icon: string; placeholder: string }> = {
  bloodPressure: { label: "Blood Pressure", unit: "mmHg", icon: "🩺", placeholder: "120/80" },
  bloodSugar:    { label: "Blood Sugar",    unit: "mg/dL", icon: "🩸", placeholder: "90" },
  temperature:   { label: "Temperature",   unit: "°C",    icon: "🌡️",  placeholder: "37.0" },
  weight:        { label: "Weight",        unit: "kg",    icon: "⚖️",  placeholder: "70" },
};
const STATUS_STYLE: Record<string, string> = {
  normal:     "bg-green-100 text-green-700",
  borderline: "bg-yellow-100 text-yellow-700",
  high:       "bg-red-100 text-red-700",
  low:        "bg-blue-100 text-blue-700",
};

export function VitalsPage() {
  const { user }           = useAuthStore();
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [type, setType]    = useState<VitalType>("bloodPressure");
  const [value, setValue]  = useState("");
  const [status, setStatus] = useState<Vital["status"]>("normal");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    return onSnapshot(
      query(collection(db(), FIRESTORE.VITALS), where("userId", "==", user.id)),
      (s) => setVitals(s.docs.map((d) => ({ id: d.id, ...d.data() } as Vital))
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)))
    );
  }, [user?.id]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !value) return;
    setSaving(true);
    await addDoc(collection(db(), FIRESTORE.VITALS), {
      userId: user.id, type, value,
      unit: VITAL_CONFIG[type].unit,
      status, recordedAt: new Date().toISOString(),
    });
    setValue(""); setSaving(false);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Vitals</h1>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <h2 className="font-bold text-text-primary mb-4">Record Vital</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as VitalType)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white">
              {(Object.keys(VITAL_CONFIG) as VitalType[]).map((t) => (
                <option key={t} value={t}>{VITAL_CONFIG[t].icon} {VITAL_CONFIG[t].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Value ({VITAL_CONFIG[type].unit})
            </label>
            <input required value={value} onChange={(e) => setValue(e.target.value)}
              placeholder={VITAL_CONFIG[type].placeholder}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5">Status</label>
          <div className="flex gap-2">
            {(["normal", "borderline", "high", "low"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize border transition-colors ${
                  status === s ? STATUS_STYLE[s] + " border-transparent" : "border-gray-200 text-text-secondary hover:border-gray-400"
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-green-dark transition-colors disabled:opacity-60">
          {saving ? "Saving…" : "Record"}
        </button>
      </form>

      {/* History */}
      <div className="bg-card rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-text-primary">Vitals History</h2>
        </div>
        {vitals.length === 0 ? (
          <p className="text-center text-text-secondary text-sm py-8">No vitals recorded yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-text-secondary text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Value</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {vitals.map((v) => (
                <tr key={v.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <span>{VITAL_CONFIG[v.type]?.icon} </span>
                    <span className="font-medium">{VITAL_CONFIG[v.type]?.label ?? v.type}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-text-primary">{v.value} <span className="text-text-secondary font-normal">{v.unit}</span></td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLE[v.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(v.recordedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
