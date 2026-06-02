import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { Medicine } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

export function ExpiryAlertsPage() {
  const { user }                  = useAuthStore();
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    return onSnapshot(
      query(collection(db(), FIRESTORE.MEDICINES), where("userId", "==", user.id)),
      (s) => setMedicines(s.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine)))
    );
  }, [user?.id]);

  const now = new Date();

  type Group = { label: string; bg: string; text: string; border: string; days: number };
  const groups: Group[] = [
    { label: "⛔ Expired",    bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    days: 0   },
    { label: "🔴 1–7 Days",   bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", days: 7   },
    { label: "🟡 8–30 Days",  bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", days: 30  },
    { label: "✅ Safe (30+)", bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  days: Infinity },
  ];

  function getDaysLeft(dateStr: string) {
    return Math.ceil((new Date(dateStr).getTime() - now.getTime()) / 86400000);
  }

  function getGroup(m: Medicine): Group {
    const d = getDaysLeft(m.expiryDate);
    if (d < 0)  return groups[0];
    if (d <= 7)  return groups[1];
    if (d <= 30) return groups[2];
    return groups[3];
  }

  const sorted = [...medicines].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Expiry Alerts</h1>
      <p className="text-text-secondary text-sm mb-6">{medicines.length} medicines tracked</p>

      {medicines.length === 0 ? (
        <div className="text-center py-12 text-text-secondary bg-card rounded-2xl border border-gray-100">
          <p className="text-3xl mb-2">💊</p>
          <p className="font-medium">No medicines in inventory</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const items = sorted.filter((m) => getGroup(m).label === g.label);
            if (items.length === 0) return null;
            return (
              <div key={g.label} className={`rounded-2xl border p-4 ${g.bg} ${g.border}`}>
                <h2 className={`font-bold text-sm mb-3 ${g.text}`}>{g.label} ({items.length})</h2>
                <div className="space-y-2">
                  {items.map((m) => {
                    const days = getDaysLeft(m.expiryDate);
                    return (
                      <div key={m.id} className="bg-white/70 rounded-xl px-4 py-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm text-text-primary">{m.name}</p>
                          <p className="text-xs text-text-secondary">{m.dosage} · Qty: {m.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${g.text}`}>
                            {days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? "Today" : `${days}d`}
                          </p>
                          <p className="text-xs text-text-secondary">{m.expiryDate}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
