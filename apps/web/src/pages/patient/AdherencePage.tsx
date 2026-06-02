import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { DoseLog } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

export function AdherencePage() {
  const { user }          = useAuthStore();
  const [logs, setLogs]   = useState<DoseLog[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const from = new Date();
    from.setDate(from.getDate() - 29);
    const fromStr = from.toISOString().split("T")[0];
    return onSnapshot(
      query(collection(db(), FIRESTORE.DOSE_LOGS), where("userId", "==", user.id), where("date", ">=", fromStr)),
      (s) => setLogs(s.docs.map((d) => ({ id: d.id, ...d.data() } as DoseLog)))
    );
  }, [user?.id]);

  const chartData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayLogs = logs.filter((l) => l.date === dateStr);
    const total   = dayLogs.length;
    const taken   = dayLogs.filter((l) => l.status === "taken").length;
    return {
      date: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
      adherence: total ? Math.round((taken / total) * 100) : 0,
      taken, missed: dayLogs.filter((l) => l.status === "missed").length,
    };
  });

  const total  = logs.length;
  const taken  = logs.filter((l) => l.status === "taken").length;
  const missed = logs.filter((l) => l.status === "missed").length;
  const rate   = total ? Math.round((taken / total) * 100) : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Adherence Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          ["Overall Rate", `${rate}%`,  rate >= 80 ? "text-green-600" : rate >= 50 ? "text-orange" : "text-alert-red"],
          ["Total Doses",  total,       "text-text-primary"],
          ["Taken",        taken,       "text-green-600"],
          ["Missed",       missed,      "text-alert-red"],
        ].map(([label, val, color]) => (
          <div key={label as string} className="bg-card rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className={`text-2xl font-bold ${color}`}>{val}</p>
            <p className="text-xs text-text-secondary mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">30-day Adherence</span>
          <span className={`text-sm font-bold ${rate >= 80 ? "text-green-600" : rate >= 50 ? "text-orange" : "text-alert-red"}`}>{rate}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${rate >= 80 ? "bg-green-500" : rate >= 50 ? "bg-orange" : "bg-alert-red"}`}
            style={{ width: `${rate}%` }} />
        </div>
        <p className="text-xs text-text-secondary mt-2">
          {rate >= 80 ? "Excellent adherence! Keep it up." : rate >= 50 ? "Moderate adherence. Try to be more consistent." : "Low adherence. Please consult your doctor."}
        </p>
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-bold text-text-primary mb-4">Last 14 Days</h2>
        {total === 0 ? (
          <p className="text-center text-text-secondary text-sm py-8">No dose logs found for the last 30 days</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
              <Tooltip formatter={(v) => [`${v}%`, "Adherence"]} />
              <Bar dataKey="adherence" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.adherence >= 80 ? "#4CAF50" : entry.adherence >= 50 ? "#FB8C00" : "#E53935"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
