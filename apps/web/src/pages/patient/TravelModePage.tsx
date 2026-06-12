import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { Medicine } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";
import { useMedicineStore, useMedicines } from "@/hooks/useMedicines";

const TIMEZONES = [
  "Asia/Kolkata", "Asia/Dubai", "Europe/London", "America/New_York",
  "America/Los_Angeles", "Asia/Singapore", "Australia/Sydney", "Asia/Tokyo",
];

function parseDosesPerDay(schedule?: string): number {
  if (!schedule) return 1;
  try {
    const p = JSON.parse(schedule) as { frequency?: string; times?: string[] };
    if (p.times && p.times.length > 0) return p.times.length;
    if (p.frequency === "twice") return 2;
    if (p.frequency === "thrice") return 3;
    return 1;
  } catch { return 1; }
}

function daysBetween(from: string, to: string) {
  return Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
}

export function TravelModePage() {
  const user      = useAuthStore((s) => s.user);
  const medicines = useMedicineStore((s) => s.medicines);
  useMedicines(user?.id ?? null);

  const [loading,       setLoading]   = useState(true);
  const [enabled,       setEnabled]   = useState(false);
  const [destination,   setDest]      = useState("");
  const [departureDate, setDeparture] = useState("");
  const [returnDate,    setReturn]    = useState("");
  const [timezone,      setTimezone]  = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [saved,         setSaved]     = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getDoc(doc(db(), FIRESTORE.USERS, user.id)).then((snap) => {
      if (snap.exists()) {
        const plan = snap.data().travelPlan;
        if (plan?.isActive) {
          setEnabled(true);
          setDest(plan.destination ?? "");
          setDeparture(plan.departureDate ?? "");
          setReturn(plan.returnDate ?? "");
          setTimezone(plan.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
        }
      }
    }).finally(() => setLoading(false));
  }, [user?.id]);

  const today    = new Date().toISOString().split("T")[0];
  const tripDays = departureDate && returnDate && returnDate > departureDate
    ? daysBetween(departureDate, returnDate) : null;

  type PackRow = Medicine & { needed: number; sufficient: boolean };
  const packingList: PackRow[] = enabled && tripDays !== null
    ? medicines.map((m) => {
        const needed = parseDosesPerDay(m.schedule) * tripDays;
        return { ...m, needed, sufficient: m.quantity >= needed };
      })
    : [];

  const hasInsufficient = packingList.some((r) => !r.sufficient);

  async function handleSave() {
    if (!user?.id) return;
    const travelPlan = enabled
      ? { destination, departureDate, returnDate, timezone, isActive: true }
      : { destination: "", departureDate: "", returnDate: "", timezone, isActive: false };
    await setDoc(doc(db(), FIRESTORE.USERS, user.id), { travelPlan }, { merge: true });
    if (!enabled) { setDest(""); setDeparture(""); setReturn(""); }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex justify-center items-center min-h-40">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-1">Travel Mode</h1>
        <p className="text-text-secondary text-sm">Adjust medication reminders when travelling across time zones.</p>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
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
              <input value={destination} onChange={(e) => setDest(e.target.value)}
                placeholder="e.g. Dubai, London…"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">Departure Date</label>
                <input type="date" value={departureDate} min={today}
                  onChange={(e) => setDeparture(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Return Date</label>
                <input type="date" value={returnDate} min={departureDate || today}
                  onChange={(e) => setReturn(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>

            {tripDays !== null && (
              <span className="inline-flex items-center gap-1.5 bg-primary-pale text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                ✈️ {tripDays} day{tripDays !== 1 ? "s" : ""} trip
              </span>
            )}

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

        <button onClick={handleSave}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${saved ? "bg-green-500 text-white" : "bg-primary text-white hover:bg-green-dark"}`}>
          {saved ? "✓ Saved!" : "Save Travel Plan"}
        </button>
      </div>

      {packingList.length > 0 && (
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-text-primary mb-4">Medicine Packing List</h2>

          {hasInsufficient && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-alert-red">
              <span>⚠️</span>
              <span>Some medicines have insufficient quantity for this trip. Please refill before departure.</span>
            </div>
          )}

          <div className="divide-y divide-gray-50">
            <div className="grid grid-cols-5 gap-2 pb-2 text-xs font-semibold text-text-secondary uppercase tracking-wide">
              <span className="col-span-2">Medicine</span>
              <span className="text-center">Needed</span>
              <span className="text-center">In Stock</span>
              <span className="text-center">Status</span>
            </div>
            {packingList.map((row) => (
              <div key={row.id} className="grid grid-cols-5 gap-2 py-3 text-sm items-center">
                <div className="col-span-2">
                  <p className="font-medium text-text-primary truncate">{row.name}</p>
                  <p className="text-xs text-text-secondary">{row.dosage}</p>
                </div>
                <p className="text-center text-text-primary">{row.needed}</p>
                <p className={`text-center font-medium ${row.sufficient ? "text-text-primary" : "text-alert-red"}`}>{row.quantity}</p>
                <p className="text-center text-lg">{row.sufficient ? "✅" : "⚠️"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
