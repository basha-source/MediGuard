import { useState } from "react";

export function TravelModePage() {
  const [enabled, setEnabled]     = useState(false);
  const [timezone, setTimezone]   = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [destination, setDest]    = useState("");

  const TIMEZONES = [
    "Asia/Kolkata", "Asia/Dubai", "Europe/London", "America/New_York",
    "America/Los_Angeles", "Asia/Singapore", "Australia/Sydney", "Asia/Tokyo",
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Travel Mode</h1>
      <p className="text-text-secondary text-sm mb-6">Adjust medication reminders when travelling across time zones.</p>

      <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-text-primary">Travel Mode</p>
            <p className="text-xs text-text-secondary mt-0.5">Reminders will adjust to destination time zone</p>
          </div>
          <button onClick={() => setEnabled(!enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : ""}`} />
          </button>
        </div>

        {enabled && (
          <>
            <div>
              <label className="block text-xs font-medium mb-1.5">Destination</label>
              <input value={destination} onChange={(e) => setDest(e.target.value)} placeholder="e.g. Dubai, London…"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Destination Time Zone</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white">
                {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
              </select>
            </div>

            <div className="bg-primary-pale rounded-xl p-4 text-sm text-primary">
              ✈️ Travel mode is <strong>active</strong>. Medication reminders will use <strong>{timezone}</strong> time.
            </div>
          </>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
          💡 Remember to pack all your medicines. Carry prescriptions and doctor notes when travelling internationally.
        </div>
      </div>
    </div>
  );
}
