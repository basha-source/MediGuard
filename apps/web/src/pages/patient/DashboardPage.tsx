import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseServices";
import { FIRESTORE, ALERT_DAYS } from "@mediguard/shared";
import type { Medicine, DoseLog } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-gray-100">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-text-secondary mt-1 whitespace-pre-line">{label}</p>
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  taken:   "bg-green-100 text-green-700",
  missed:  "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
  snoozed: "bg-gray-100 text-gray-600",
};

export function DashboardPage() {
  const { user }                  = useAuthStore();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [doses, setDoses]         = useState<DoseLog[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const today = new Date().toISOString().split("T")[0];

    const unsubMeds = onSnapshot(
      query(collection(db(), FIRESTORE.MEDICINES), where("userId", "==", user.id)),
      (s) => setMedicines(s.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine)))
    );
    const unsubDoses = onSnapshot(
      query(collection(db(), FIRESTORE.DOSE_LOGS), where("userId", "==", user.id), where("date", "==", today)),
      (s) => setDoses(s.docs.map((d) => ({ id: d.id, ...d.data() } as DoseLog)))
    );
    return () => { unsubMeds(); unsubDoses(); };
  }, [user?.id]);

  const now         = new Date();
  const expiringSoon = medicines.filter((m) => {
    const days = (new Date(m.expiryDate).getTime() - now.getTime()) / 86400000;
    return days >= 0 && days <= ALERT_DAYS.EXPIRY_WARNING_1;
  });
  const lowStock = medicines.filter((m) => m.quantity <= ALERT_DAYS.LOW_STOCK_THRESHOLD);
  const greeting = now.getHours() < 12 ? "Good Morning" : now.getHours() < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-text-secondary text-sm">{greeting} 👋</p>
        <h1 className="text-2xl font-bold text-text-primary">{user?.name ?? "Welcome"}</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard value={medicines.length} label={"Total\nMeds"}      color="text-primary" />
        <StatCard value={expiringSoon.length} label={"Expiring\nSoon"} color="text-alert-red" />
        <StatCard value={lowStock.length}     label={"Low\nStock"}     color="text-orange" />
      </div>

      {/* Today's Doses */}
      <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-text-primary mb-4">Today's Doses</h2>
        {doses.length === 0 ? (
          <p className="text-text-secondary text-sm text-center py-8">No doses scheduled for today</p>
        ) : (
          <div className="space-y-3">
            {doses.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-sm text-text-primary">{d.medicineName}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{d.scheduledTime}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLE[d.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expiry alerts */}
      {expiringSoon.length > 0 && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4">
          <h3 className="font-semibold text-red-700 text-sm mb-2">⚠️ Expiring Soon</h3>
          <div className="space-y-1">
            {expiringSoon.slice(0, 3).map((m) => {
              const days = Math.ceil((new Date(m.expiryDate).getTime() - now.getTime()) / 86400000);
              return (
                <div key={m.id} className="flex justify-between text-sm">
                  <span className="text-text-primary">{m.name}</span>
                  <span className="text-red-600 font-medium">{days}d left</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
