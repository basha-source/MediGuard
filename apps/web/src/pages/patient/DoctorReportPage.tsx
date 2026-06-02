import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { Medicine, DoseLog, Vital } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

export function DoctorReportPage() {
  const { user }                = useAuthStore();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [doses, setDoses]       = useState<DoseLog[]>([]);
  const [vitals, setVitals]     = useState<Vital[]>([]);
  const [loading, setLoading]   = useState(false);
  const [loaded, setLoaded]     = useState(false);

  async function loadData() {
    if (!user?.id) return;
    setLoading(true);
    const [mSnap, dSnap, vSnap] = await Promise.all([
      getDocs(query(collection(db(), FIRESTORE.MEDICINES), where("userId", "==", user.id))),
      getDocs(query(collection(db(), FIRESTORE.DOSE_LOGS), where("userId", "==", user.id))),
      getDocs(query(collection(db(), FIRESTORE.VITALS), where("userId", "==", user.id))),
    ]);
    setMedicines(mSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine)));
    setDoses(dSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DoseLog)));
    setVitals(vSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Vital)));
    setLoaded(true); setLoading(false);
  }

  const taken  = doses.filter((d) => d.status === "taken").length;
  const missed = doses.filter((d) => d.status === "missed").length;
  const rate   = doses.length ? Math.round((taken / doses.length) * 100) : 0;

  function printReport() {
    window.print();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Doctor Report</h1>
          <p className="text-text-secondary text-sm mt-0.5">Generate a health summary for your doctor</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} disabled={loading}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-60">
            {loading ? "Loading…" : "Load Data"}
          </button>
          {loaded && (
            <button onClick={printReport} className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-green-dark transition-colors">
              🖨️ Print Report
            </button>
          )}
        </div>
      </div>

      {!loaded ? (
        <div className="text-center py-16 text-text-secondary bg-card rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">Click "Load Data" to generate your report</p>
        </div>
      ) : (
        <div id="print-report" className="space-y-4">
          {/* Patient info */}
          <div className="bg-primary text-white rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-3">Patient Information</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[["Name", user?.name], ["Email", user?.email], ["Blood Group", user?.bloodGroup || "—"], ["Gender", user?.gender || "—"],
                ["Date of Birth", user?.dateOfBirth || "—"], ["Emergency Contact", user?.emergencyContact || "—"]].map(([l, v]) => (
                <div key={l as string}>
                  <p className="opacity-70 text-xs">{l as string}</p>
                  <p className="font-medium">{v as string}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Adherence */}
          <div className="bg-card rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-text-primary mb-3">Medication Adherence</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[["Total Doses", doses.length, "text-text-primary"], ["Taken", taken, "text-green-600"], ["Missed", missed, "text-alert-red"]].map(([l, v, c]) => (
                <div key={l as string} className="bg-gray-50 rounded-xl p-3">
                  <p className={`text-2xl font-bold ${c}`}>{v as number}</p>
                  <p className="text-xs text-text-secondary">{l as string}</p>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1">
                <span>Adherence Rate</span>
                <span className="font-bold">{rate}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${rate >= 80 ? "bg-green-500" : rate >= 50 ? "bg-orange" : "bg-alert-red"}`} style={{ width: `${rate}%` }} />
              </div>
            </div>
          </div>

          {/* Current medicines */}
          <div className="bg-card rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-text-primary mb-3">Current Medicines ({medicines.length})</h2>
            {medicines.length === 0 ? <p className="text-text-secondary text-sm">No medicines recorded</p> : (
              <table className="w-full text-sm">
                <thead><tr className="text-text-secondary text-xs uppercase bg-gray-50">
                  <th className="text-left px-3 py-2">Name</th><th className="text-left px-3 py-2">Dosage</th>
                  <th className="text-left px-3 py-2">Expiry</th><th className="text-left px-3 py-2">Prescribed By</th>
                </tr></thead>
                <tbody>{medicines.map((m) => (
                  <tr key={m.id} className="border-t border-gray-50">
                    <td className="px-3 py-2 font-medium">{m.name}</td>
                    <td className="px-3 py-2 text-text-secondary">{m.dosage}</td>
                    <td className="px-3 py-2 text-text-secondary">{m.expiryDate}</td>
                    <td className="px-3 py-2 text-text-secondary">{m.prescribedBy || "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>

          {/* Vitals */}
          {vitals.length > 0 && (
            <div className="bg-card rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-text-primary mb-3">Recent Vitals ({vitals.length})</h2>
              <table className="w-full text-sm">
                <thead><tr className="text-text-secondary text-xs uppercase bg-gray-50">
                  <th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Value</th>
                  <th className="text-left px-3 py-2">Status</th><th className="text-left px-3 py-2">Date</th>
                </tr></thead>
                <tbody>{vitals.slice(0, 10).map((v) => (
                  <tr key={v.id} className="border-t border-gray-50">
                    <td className="px-3 py-2 capitalize">{v.type}</td>
                    <td className="px-3 py-2 font-medium">{v.value} {v.unit}</td>
                    <td className="px-3 py-2 capitalize">{v.status}</td>
                    <td className="px-3 py-2 text-text-secondary">{new Date(v.recordedAt).toLocaleDateString()}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          <div className="text-xs text-text-secondary text-center py-2">
            Report generated on {new Date().toLocaleString()} · MediGuard v1.0
          </div>
        </div>
      )}
    </div>
  );
}
