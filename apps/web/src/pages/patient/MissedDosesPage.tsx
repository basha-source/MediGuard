import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { DoseLog } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

export function MissedDosesPage() {
  const { user }          = useAuthStore();
  const [logs, setLogs]   = useState<DoseLog[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user?.id) return;
    return onSnapshot(
      query(collection(db(), FIRESTORE.DOSE_LOGS), where("userId", "==", user.id), where("status", "==", "missed")),
      (s) => setLogs(s.docs.map((d) => ({ id: d.id, ...d.data() } as DoseLog))
        .sort((a, b) => b.date.localeCompare(a.date)))
    );
  }, [user?.id]);

  const today  = new Date().toISOString().split("T")[0];
  const week   = new Date(); week.setDate(week.getDate() - 7);
  const weekStr = week.toISOString().split("T")[0];

  const filtered = filter === "today" ? logs.filter((l) => l.date === today)
    : filter === "week" ? logs.filter((l) => l.date >= weekStr)
    : logs;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Missed Doses</h1>
      <p className="text-text-secondary text-sm mb-6">{logs.length} total missed doses</p>

      <div className="flex gap-2 mb-5">
        {[["all", "All Time"], ["week", "This Week"], ["today", "Today"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === val ? "bg-primary text-white border-primary" : "border-gray-200 text-text-secondary hover:border-primary"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-text-secondary bg-card rounded-2xl border border-gray-100">
          <p className="text-3xl mb-2">✅</p>
          <p className="font-medium">No missed doses</p>
          <p className="text-sm mt-1">Great adherence!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <div key={d.id} className="bg-card rounded-xl shadow-sm border border-red-100 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-text-primary">{d.medicineName}</p>
                  <p className="text-xs text-text-secondary mt-0.5">Scheduled: {d.scheduledTime} · Date: {d.date}</p>
                </div>
                <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">Missed</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
