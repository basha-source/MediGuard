import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { WellnessLog } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

const MOOD_EMOJI: Record<number, string> = { 1: "😢", 2: "😟", 3: "😐", 4: "🙂", 5: "😄" };

function shiftDays(date: Date, delta: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeStreak(logs: WellnessLog[]) {
  const set = new Set(logs.map((l) => l.date));
  let streak = 0;
  let cursor = dateStr(new Date());
  while (set.has(cursor)) { streak++; cursor = dateStr(shiftDays(new Date(cursor + "T00:00:00"), -1)); }
  return streak;
}

export function WellnessProgressPage() {
  const { user }            = useAuthStore();
  const [range, setRange]   = useState<7 | 30>(30);
  const [logs, setLogs]     = useState<WellnessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    const from = shiftDays(new Date(), -(range - 1));
    const fromStr = dateStr(from);
    getDocs(query(
      collection(db(), FIRESTORE.WELLNESS_LOGS),
      where("userId", "==", user.id),
      where("date", ">=", fromStr),
      orderBy("date", "asc"),
    )).then((snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WellnessLog)));
    }).finally(() => setLoading(false));
  }, [user?.id, range]);

  const streak = computeStreak(logs);
  const n      = logs.length;
  const avg    = (key: keyof WellnessLog) =>
    n ? Math.round(logs.reduce((s, l) => s + (l[key] as number), 0) / n * 10) / 10 : null;

  const chartData = logs.map((l) => {
    const d = new Date(l.date + "T00:00:00");
    return {
      date: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
      mood: l.mood,
    };
  });

  const recent = [...logs].reverse().slice(0, 10);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Wellness Progress</h1>
          <p className="text-text-secondary text-sm mt-0.5">Your health trends over time</p>
        </div>
        <div className="flex gap-2">
          {([7, 30] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                range === r ? "bg-primary text-white border-primary" : "border-gray-200 text-text-secondary hover:border-primary"
              }`}>
              {r} Days
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Streak + Stats */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4 text-center col-span-1">
              <p className="text-3xl">{streak > 0 ? "🔥" : "💤"}</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{streak}</p>
              <p className="text-xs text-text-secondary mt-0.5">Day streak</p>
            </div>
            {[
              { label: "Avg Mood",   val: avg("mood"),       suffix: "/5" },
              { label: "Avg Energy", val: avg("energy"),     suffix: "/5" },
              { label: "Avg Pain",   val: avg("pain"),       suffix: "/10" },
              { label: "Avg Sleep",  val: avg("sleepHours"), suffix: "h" },
            ].map(({ label, val, suffix }) => (
              <div key={label} className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                <p className="text-2xl font-bold text-primary">{val !== null ? `${val}${suffix}` : "—"}</p>
                <p className="text-xs text-text-secondary mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Mood Chart */}
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-bold text-text-primary mb-4">Mood Trend</h2>
            {logs.length === 0 ? (
              <div className="text-center py-10 text-text-secondary text-sm">No wellness logs yet. Start logging daily!</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} ticks={[1, 2, 3, 4, 5]} />
                  <Tooltip formatter={(v) => [`${MOOD_EMOJI[v as number]} ${v}`, "Mood"]} />
                  <Line type="monotone" dataKey="mood" stroke="#2E7D32" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent Entries */}
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-bold text-text-primary mb-4">Recent Entries</h2>
            {recent.length === 0 ? (
              <p className="text-center text-text-secondary text-sm py-6">No entries yet.</p>
            ) : (
              <div className="space-y-3">
                {recent.map((l) => {
                  const d = new Date(l.date + "T00:00:00");
                  return (
                    <div key={l.id} className="flex items-start gap-4 py-3 border-b border-gray-50 last:border-0">
                      <span className="text-2xl">{MOOD_EMOJI[l.mood]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary">
                          {d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {[
                            { label: `Energy: ${l.energy}` },
                            { label: `Pain: ${l.pain}` },
                            { label: `Sleep: ${l.sleepHours}h` },
                          ].map(({ label }) => (
                            <span key={label} className="px-2 py-0.5 bg-gray-100 text-text-secondary text-xs rounded-full">{label}</span>
                          ))}
                        </div>
                        {l.notes && (
                          <p className="text-xs text-text-secondary mt-1 truncate">{l.notes.slice(0, 60)}{l.notes.length > 60 ? "…" : ""}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
