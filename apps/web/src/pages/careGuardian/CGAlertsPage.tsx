import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseServices";
import { FIRESTORE, ALERT_DAYS } from "@mediguard/shared";
import type { DoseLog, Medicine, CareGuardianLink } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

export function CGAlertsPage() {
  const { user }              = useAuthStore();
  const [links, setLinks]     = useState<CareGuardianLink[]>([]);
  const [missedDoses, setMissedDoses] = useState<DoseLog[]>([]);
  const [expiryMeds, setExpiryMeds]   = useState<Medicine[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const unsubLinks = onSnapshot(
      query(collection(db(), FIRESTORE.CG_LINKS), where("guardianId", "==", user.id)),
      async (s) => {
        const ls = s.docs.map((d) => d.data() as CareGuardianLink);
        setLinks(ls);
        if (ls.length === 0) return;
        const patientId = ls[0].patientId;
        const week = new Date(); week.setDate(week.getDate() - 7);
        onSnapshot(
          query(collection(db(), FIRESTORE.DOSE_LOGS), where("userId", "==", patientId), where("status", "==", "missed"), where("date", ">=", week.toISOString().split("T")[0])),
          (ds) => setMissedDoses(ds.docs.map((d) => ({ id: d.id, ...d.data() } as DoseLog)).sort((a, b) => b.date.localeCompare(a.date)))
        );
        onSnapshot(
          query(collection(db(), FIRESTORE.MEDICINES), where("userId", "==", patientId)),
          (ms) => {
            const now = new Date();
            setExpiryMeds(ms.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine))
              .filter((m) => {
                const days = (new Date(m.expiryDate).getTime() - now.getTime()) / 86400000;
                return days >= 0 && days <= ALERT_DAYS.EXPIRY_WARNING_1;
              }));
          }
        );
      }
    );
    return unsubLinks;
  }, [user?.id]);

  const totalAlerts = missedDoses.length + expiryMeds.length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Alerts</h1>
        {totalAlerts > 0 && (
          <span className="px-2.5 py-0.5 bg-alert-red text-white text-xs font-bold rounded-full">{totalAlerts}</span>
        )}
      </div>

      {links.length === 0 ? (
        <div className="text-center py-16 text-text-secondary bg-card rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">🔔</p>
          <p className="font-medium">No patients linked</p>
          <p className="text-sm mt-1">Link a patient to start receiving alerts</p>
        </div>
      ) : totalAlerts === 0 ? (
        <div className="text-center py-16 text-text-secondary bg-card rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-medium">All clear!</p>
          <p className="text-sm mt-1">No missed doses or expiry alerts in the last 7 days</p>
        </div>
      ) : (
        <div className="space-y-4">
          {missedDoses.length > 0 && (
            <div>
              <h2 className="font-bold text-alert-red mb-3 flex items-center gap-2">
                ❌ Missed Doses <span className="text-sm font-normal text-text-secondary">({missedDoses.length})</span>
              </h2>
              <div className="space-y-2">
                {missedDoses.map((d) => (
                  <div key={d.id} className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex justify-between">
                      <p className="font-semibold text-text-primary">{d.medicineName}</p>
                      <span className="text-xs text-red-600 font-medium">{d.date}</span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">Scheduled: {d.scheduledTime}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expiryMeds.length > 0 && (
            <div>
              <h2 className="font-bold text-orange mb-3 flex items-center gap-2">
                ⏰ Expiring Soon <span className="text-sm font-normal text-text-secondary">({expiryMeds.length})</span>
              </h2>
              <div className="space-y-2">
                {expiryMeds.map((m) => {
                  const days = Math.ceil((new Date(m.expiryDate).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={m.id} className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                      <div className="flex justify-between">
                        <p className="font-semibold text-text-primary">{m.name}</p>
                        <span className={`text-xs font-bold ${days <= 7 ? "text-alert-red" : "text-orange"}`}>{days}d left</span>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">{m.dosage} · Expires: {m.expiryDate}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
