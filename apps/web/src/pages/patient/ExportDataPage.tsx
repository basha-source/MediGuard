import { useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { Medicine, DoseLog, Vital } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

function toCSV(headers: string[], rows: Record<string, any>[]): string {
  const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function ExportDataPage() {
  const { user }          = useAuthStore();
  const [exporting, setExporting] = useState<string | null>(null);

  async function exportMedicines() {
    if (!user?.id) return;
    setExporting("medicines");
    const snap = await getDocs(query(collection(db(), FIRESTORE.MEDICINES), where("userId", "==", user.id)));
    const rows = snap.docs.map((d) => d.data() as Medicine);
    download("medicines.csv", toCSV(["name", "dosage", "quantity", "expiryDate", "category", "prescribedBy", "schedule", "addedAt"], rows));
    setExporting(null);
  }

  async function exportDoseLogs() {
    if (!user?.id) return;
    setExporting("doses");
    const snap = await getDocs(query(collection(db(), FIRESTORE.DOSE_LOGS), where("userId", "==", user.id)));
    const rows = snap.docs.map((d) => d.data() as DoseLog);
    download("dose_logs.csv", toCSV(["medicineName", "scheduledTime", "date", "status", "takenAt", "reason"], rows));
    setExporting(null);
  }

  async function exportVitals() {
    if (!user?.id) return;
    setExporting("vitals");
    const snap = await getDocs(query(collection(db(), FIRESTORE.VITALS), where("userId", "==", user.id)));
    const rows = snap.docs.map((d) => d.data() as Vital);
    download("vitals.csv", toCSV(["type", "value", "unit", "status", "recordedAt"], rows));
    setExporting(null);
  }

  const exports = [
    { key: "medicines", icon: "💊", label: "Medicines", desc: "All medicine inventory records", action: exportMedicines },
    { key: "doses",     icon: "📋", label: "Dose Logs", desc: "Complete dose tracking history",  action: exportDoseLogs },
    { key: "vitals",    icon: "❤️",  label: "Vitals",    desc: "All recorded health vitals",      action: exportVitals },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Export Data</h1>
      <p className="text-text-secondary text-sm mb-6">Download your health data as CSV files for offline use or sharing.</p>

      <div className="space-y-4">
        {exports.map((e) => (
          <div key={e.key} className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-3xl">{e.icon}</span>
              <div>
                <p className="font-semibold text-text-primary">{e.label}</p>
                <p className="text-xs text-text-secondary mt-0.5">{e.desc}</p>
              </div>
            </div>
            <button onClick={e.action} disabled={exporting !== null}
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-green-dark transition-colors disabled:opacity-60 flex items-center gap-2">
              {exporting === e.key ? "Exporting…" : "⬇️ Export CSV"}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-800">
        💾 All data is exported as UTF-8 CSV, compatible with Excel, Google Sheets, and most health apps.
      </div>
    </div>
  );
}
