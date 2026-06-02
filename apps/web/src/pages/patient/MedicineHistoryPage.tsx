import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { Medicine } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

export function MedicineHistoryPage() {
  const { user }                  = useAuthStore();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch]       = useState("");

  useEffect(() => {
    if (!user?.id) return;
    return onSnapshot(
      query(collection(db(), FIRESTORE.MEDICINES), where("userId", "==", user.id)),
      (s) => setMedicines(s.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine))
        .sort((a, b) => b.addedAt.localeCompare(a.addedAt)))
    );
  }, [user?.id]);

  const filtered = medicines.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.prescribedBy ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Medicine History</h1>
      <p className="text-text-secondary text-sm mb-5">{medicines.length} medicines on record</p>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search medicines…"
        className="w-full max-w-sm px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 mb-5" />

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-text-secondary bg-card rounded-2xl border border-gray-100">
          <p className="text-3xl mb-2">📋</p>
          <p className="font-medium">No medicines found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <div key={m.id} className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold text-text-primary">{m.name}</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {m.dosage} · {m.category} · Added: {new Date(m.addedAt).toLocaleDateString()}
                </p>
                {m.prescribedBy && <p className="text-xs text-text-secondary">Prescribed by: {m.prescribedBy}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-text-primary">Qty: {m.quantity}</p>
                <p className="text-xs text-text-secondary">Expires: {m.expiryDate}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
