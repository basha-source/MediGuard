import { useState } from "react";

type Pref = { key: string; label: string; desc: string; defaultOn: boolean };

const PREFS: Pref[] = [
  { key: "doseReminders",   label: "Dose Reminders",        desc: "Get reminded before each scheduled dose",           defaultOn: true  },
  { key: "missedDoseAlert", label: "Missed Dose Alerts",    desc: "Notify when a dose is not taken after schedule",    defaultOn: true  },
  { key: "expiryAlert30",   label: "Expiry Alert (30 days)", desc: "Warn when a medicine expires within 30 days",      defaultOn: true  },
  { key: "expiryAlert7",    label: "Expiry Alert (7 days)",  desc: "Urgent alert when a medicine expires within 7 days", defaultOn: true },
  { key: "lowStockAlert",   label: "Low Stock Alert",        desc: "Notify when medicine quantity falls below 5",      defaultOn: true  },
  { key: "careGuardianAlerts", label: "Care Guardian Alerts", desc: "Receive alerts from your linked Care Guardian",  defaultOn: false },
  { key: "weeklyReport",    label: "Weekly Report",          desc: "Get a weekly adherence summary",                   defaultOn: false },
];

export function NotificationPrefsPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(PREFS.map((p) => [p.key, p.defaultOn]))
  );
  const [saved, setSaved] = useState(false);

  function toggle(key: string) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  function handleSave() {
    // In a real app, persist to Firestore
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Notification Preferences</h1>
      <p className="text-text-secondary text-sm mb-6">Choose which notifications you want to receive.</p>

      <div className="bg-card rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 mb-5">
        {PREFS.map((p) => (
          <div key={p.key} className="flex items-center justify-between px-5 py-4">
            <div className="flex-1 mr-4">
              <p className="font-medium text-sm text-text-primary">{p.label}</p>
              <p className="text-xs text-text-secondary mt-0.5">{p.desc}</p>
            </div>
            <button onClick={() => toggle(p.key)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${prefs[p.key] ? "bg-primary" : "bg-gray-300"}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${prefs[p.key] ? "translate-x-5" : ""}`} />
            </button>
          </div>
        ))}
      </div>

      <button onClick={handleSave}
        className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${saved ? "bg-green-500 text-white" : "bg-primary text-white hover:bg-green-dark"}`}>
        {saved ? "✓ Preferences Saved!" : "Save Preferences"}
      </button>
    </div>
  );
}
