import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { DoseLog } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return dateStr(d);
  });
}

export function MissedDoseInsightsPage() {
  const { user }          = useAuthStore();
  const [logs, setLogs]   = useState<DoseLog[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const from = new Date(); from.setDate(from.getDate() - 29);
    return onSnapshot(
      query(
        collection(db(), FIRESTORE.DOSE_LOGS),
        where("userId", "==", user.id),
        where("status", "==", "missed"),
        where("date", ">=", dateStr(from)),
      ),
      (s) => setLogs(s.docs.map((d) => ({ id: d.id, ...d.data() } as DoseLog)))
    );
  }, [user?.id]);

  const total = logs.length;

  const worstHour = (() => {
    const counts: Record<number, number> = {};
    logs.forEach((l) => {
      const h = parseInt(l.scheduledTime?.split(":")[0] ?? "0", 10);
      counts[h] = (counts[h] ?? 0) + 1;
    });
    if (!Object.keys(counts).length) return null;
    const h = Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
    return `${String(h).padStart(2, "0")}:00 – ${String(h).padStart(2, "0")}:59`;
  })();

  const worstMed = (() => {
    const counts: Record<string, number> = {};
    logs.forEach((l) => { counts[l.medicineName] = (counts[l.medicineName] ?? 0) + 1; });
    if (!Object.keys(counts).length) return null;
    const [name, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return `${name} (${count})`;
  })();

  const days30 = buildDays(30);
  const countByDay: Record<string, number> = {};
  logs.forEach((l) => { countByDay[l.date] = (countByDay[l.date] ?? 0) + 1; });

  const barData = (() => {
    const counts: Record<string, number> = {};
    logs.forEach((l) => { counts[l.medicineName] = (counts[l.medicineName] ?? 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  })();

  function cellColor(date: string) {
    if (!(date in countByDay) && logs.length > 0) return "bg-gray-100";
    const c = countByDay[date] ?? 0;
    if (c === 0) return "bg-green-100";
    if (c === 1) return "bg-orange-200";
    return "bg-red-300";
  }
  function cellColorNoData(date: string) {
    if (logs.length === 0) return "bg-gray-100";
    return cellColor(date);
  }

  if (total === 0) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-text-primary mb-6">Missed Dose Insights</h1>
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-semibold text-text-primary">No missed doses in the last 30 days!</p>
          <p className="text-text-secondary text-sm mt-1">Keep up the great adherence.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Missed Dose Insights</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Missed (30d)", val: total,      color: "text-alert-red" },
          { label: "Worst Time of Day",  val: worstHour ?? "—", color: "text-orange" },
          { label: "Most Missed Med",    val: worstMed ?? "—",  color: "text-text-primary" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
            <p className={`text-xl font-bold ${color} leading-tight`}>{val}</p>
            <p className="text-xs text-text-secondary mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Calendar heatmap */}
      <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <h2 className="font-bold text-text-primary mb-4">30-Day Calendar</h2>
        <div className="grid grid-cols-7 gap-1.5">
          {days30.map((d) => {
            const day = parseInt(d.split("-")[2], 10);
            return (
              <div key={d} title={d}
                className={`rounded-lg aspect-square flex items-center justify-center text-xs font-medium ${cellColorNoData(d)}`}>
                {day}
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 flex-wrap">
          {[
            { color: "bg-green-100",  label: "None" },
            { color: "bg-orange-200", label: "1 missed" },
            { color: "bg-red-300",    label: "2+ missed" },
            { color: "bg-gray-100",   label: "No data" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-4 h-4 rounded ${color}`} />
              <span className="text-xs text-text-secondary">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-medicine bar chart */}
      <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-text-primary mb-4">Missed by Medicine</h2>
        <ResponsiveContainer width="100%" height={Math.max(150, barData.length * 40)}>
          <BarChart layout="vertical" data={barData} margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
            <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
            <Tooltip />
            <Bar dataKey="count" fill="#E53935" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
