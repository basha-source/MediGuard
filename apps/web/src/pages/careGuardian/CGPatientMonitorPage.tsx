import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { Medicine, DoseLog, CareGuardianLink } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

export function CGPatientMonitorPage() {
  const { user }                  = useAuthStore();
  const [links, setLinks]         = useState<CareGuardianLink[]>([]);
  const [selPatient, setSelPatient] = useState<string | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [doses, setDoses]         = useState<DoseLog[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    return onSnapshot(
      query(collection(db(), FIRESTORE.CG_LINKS), where("guardianId", "==", user.id)),
      (s) => {
        const ls = s.docs.map((d) => d.data() as CareGuardianLink);
        setLinks(ls);
        if (ls.length > 0 && !selPatient) setSelPatient(ls[0].patientId);
      }
    );
  }, [user?.id]);

  useEffect(() => {
    if (!selPatient) return;
    const today = new Date().toISOString().split("T")[0];
    const unsubMeds = onSnapshot(
      query(collection(db(), FIRESTORE.MEDICINES), where("userId", "==", selPatient)),
      (s) => setMedicines(s.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine)))
    );
    const unsubDoses = onSnapshot(
      query(collection(db(), FIRESTORE.DOSE_LOGS), where("userId", "==", selPatient), where("date", "==", today)),
      (s) => setDoses(s.docs.map((d) => ({ id: d.id, ...d.data() } as DoseLog)))
    );
    return () => { unsubMeds(); unsubDoses(); };
  }, [selPatient]);

  const taken  = doses.filter((d) => d.status === "taken").length;
  const missed = doses.filter((d) => d.status === "missed").length;
  const rate   = doses.length ? Math.round((taken / doses.length) * 100) : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Patient Monitor</h1>

      {links.length === 0 ? (
        <div className="text-center py-16 text-text-secondary bg-card rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-medium">No patients linked</p>
          <p className="text-sm mt-1">Share your guardian code to link a patient</p>
        </div>
      ) : (
        <>
          {links.length > 1 && (
            <div className="flex gap-2 mb-5 flex-wrap">
              {links.map((l) => (
                <button key={l.patientId} onClick={() => setSelPatient(l.patientId)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selPatient === l.patientId ? "bg-primary text-white border-primary" : "border-gray-200 text-text-secondary hover:border-primary"
                  }`}>
                  Patient {l.patientId.slice(0, 6)}
                </button>
              ))}
            </div>
          )}

          {/* Today's stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[["Today's Doses", doses.length, "text-text-primary"],
              ["Taken",  taken,  "text-green-600"],
              ["Missed", missed, "text-alert-red"]].map(([l, v, c]) => (
              <div key={l as string} className="bg-card rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                <p className={`text-2xl font-bold ${c}`}>{v as number}</p>
                <p className="text-xs text-text-secondary mt-0.5">{l as string}</p>
              </div>
            ))}
          </div>

          {/* Adherence bar */}
          <div className="bg-card rounded-2xl p-4 shadow-sm border border-gray-100 mb-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-text-primary">Today's Adherence</span>
              <span className={`font-bold ${rate >= 80 ? "text-green-600" : rate >= 50 ? "text-orange" : "text-alert-red"}`}>{rate}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${rate >= 80 ? "bg-green-500" : rate >= 50 ? "bg-orange" : "bg-alert-red"}`} style={{ width: `${rate}%` }} />
            </div>
          </div>

          {/* Medicine list */}
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
            <h2 className="font-bold text-text-primary mb-3">Medicines ({medicines.length})</h2>
            {medicines.length === 0 ? (
              <p className="text-text-secondary text-sm text-center py-4">No medicines in this patient's inventory</p>
            ) : (
              <div className="space-y-2">
                {medicines.map((m) => (
                  <div key={m.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 text-sm">
                    <div>
                      <p className="font-medium text-text-primary">{m.name}</p>
                      <p className="text-xs text-text-secondary">{m.dosage} · Qty: {m.quantity}</p>
                    </div>
                    <span className={`text-xs font-medium ${m.quantity <= 5 ? "text-alert-red" : "text-text-secondary"}`}>
                      Expires: {m.expiryDate}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Doses today */}
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-bold text-text-primary mb-3">Today's Doses</h2>
            {doses.length === 0 ? (
              <p className="text-text-secondary text-sm text-center py-4">No doses scheduled today</p>
            ) : (
              <div className="space-y-2">
                {doses.map((d) => (
                  <div key={d.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-sm text-text-primary">{d.medicineName}</p>
                      <p className="text-xs text-text-secondary">{d.scheduledTime}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                      d.status === "taken" ? "bg-green-100 text-green-700" : d.status === "missed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                    }`}>{d.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
