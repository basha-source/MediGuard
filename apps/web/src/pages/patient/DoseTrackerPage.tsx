import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { DoseLog, Medicine, DoseStatus } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

const STATUS_STYLE: Record<DoseStatus, string> = {
  taken:   "bg-green-100 text-green-700 border-green-200",
  missed:  "bg-red-100 text-red-700 border-red-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  snoozed: "bg-gray-100 text-gray-600 border-gray-200",
};

export function DoseTrackerPage() {
  const { user }                  = useAuthStore();
  const [doses, setDoses]         = useState<DoseLog[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selDate, setSelDate]     = useState(new Date().toISOString().split("T")[0]);
  const [schedTime, setSchedTime] = useState("08:00");

  useEffect(() => {
    if (!user?.id) return;
    const unsubMeds = onSnapshot(
      query(collection(db(), FIRESTORE.MEDICINES), where("userId", "==", user.id)),
      (s) => setMedicines(s.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine)))
    );
    return unsubMeds;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const unsubDoses = onSnapshot(
      query(collection(db(), FIRESTORE.DOSE_LOGS), where("userId", "==", user.id), where("date", "==", selDate)),
      (s) => setDoses(s.docs.map((d) => ({ id: d.id, ...d.data() } as DoseLog)))
    );
    return unsubDoses;
  }, [user?.id, selDate]);

  async function logDose(medicineId: string, medicineName: string) {
    if (!user?.id) return;
    await addDoc(collection(db(), FIRESTORE.DOSE_LOGS), {
      userId: user.id, medicineId, medicineName,
      scheduledTime: schedTime, date: selDate,
      status: "pending", takenAt: null,
    });
  }

  async function updateStatus(id: string, status: DoseStatus) {
    await updateDoc(doc(db(), FIRESTORE.DOSE_LOGS, id), {
      status,
      takenAt: status === "taken" ? new Date().toISOString() : null,
    });
  }

  const loggedMedIds = new Set(doses.map((d) => d.medicineId));
  const stats = {
    taken:   doses.filter((d) => d.status === "taken").length,
    missed:  doses.filter((d) => d.status === "missed").length,
    pending: doses.filter((d) => d.status === "pending").length,
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Dose Tracker</h1>
        <input type="date" value={selDate} onChange={(e) => setSelDate(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[["✅ Taken", stats.taken, "bg-green-50 border-green-200"],
          ["❌ Missed", stats.missed, "bg-red-50 border-red-200"],
          ["⏳ Pending", stats.pending, "bg-yellow-50 border-yellow-200"]].map(([label, val, cls]) => (
          <div key={label as string} className={`rounded-xl p-3 border text-center ${cls}`}>
            <p className="text-xl font-bold text-text-primary">{val as number}</p>
            <p className="text-xs text-text-secondary mt-0.5">{label as string}</p>
          </div>
        ))}
      </div>

      {/* Dose list */}
      <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <h2 className="font-bold text-text-primary mb-3">Doses for {selDate}</h2>
        {doses.length === 0 ? (
          <p className="text-text-secondary text-sm text-center py-6">No doses logged for this date</p>
        ) : (
          <div className="space-y-3">
            {doses.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-sm text-text-primary">{d.medicineName}</p>
                  <p className="text-xs text-text-secondary">{d.scheduledTime}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${STATUS_STYLE[d.status]}`}>
                    {d.status}
                  </span>
                  <select value={d.status} onChange={(e) => updateStatus(d.id, e.target.value as DoseStatus)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none bg-white">
                    <option value="pending">Pending</option>
                    <option value="taken">Taken</option>
                    <option value="missed">Missed</option>
                    <option value="snoozed">Snoozed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log a dose */}
      <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-text-primary mb-3">Log a Dose</h2>
        <div className="flex gap-2 mb-3">
          <input type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          <span className="text-sm text-text-secondary self-center">scheduled time</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {medicines.filter((m) => !loggedMedIds.has(m.id)).map((m) => (
            <button key={m.id} onClick={() => logDose(m.id, m.name)}
              className="text-left px-3 py-2.5 border border-gray-200 rounded-xl text-sm hover:border-primary hover:bg-primary-pale transition-colors">
              <span className="font-medium text-text-primary">{m.name}</span>
              <span className="text-xs text-text-secondary block">{m.dosage}</span>
            </button>
          ))}
        </div>
        {medicines.filter((m) => !loggedMedIds.has(m.id)).length === 0 && (
          <p className="text-text-secondary text-sm text-center py-4">All medicines logged for this date</p>
        )}
      </div>
    </div>
  );
}
