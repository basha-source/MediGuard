import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

const MOODS = ["😢", "😟", "😐", "🙂", "😄"];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DailyLogPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [isEdit,  setIsEdit]  = useState(false);

  const [mood,       setMood]       = useState(3);
  const [energy,     setEnergy]     = useState(3);
  const [pain,       setPain]       = useState(0);
  const [sleepHours, setSleepHours] = useState(7);
  const [notes,      setNotes]      = useState("");

  useEffect(() => {
    if (!user?.id) return;
    const today = todayStr();
    getDoc(doc(db(), FIRESTORE.WELLNESS_LOGS, `${user.id}_${today}`)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setMood(d.mood ?? 3);
        setEnergy(d.energy ?? 3);
        setPain(d.pain ?? 0);
        setSleepHours(d.sleepHours ?? 7);
        setNotes(d.notes ?? "");
        setIsEdit(true);
      }
    }).finally(() => setLoading(false));
  }, [user?.id]);

  async function handleSave() {
    if (!user?.id) return;
    setSaving(true);
    const today = todayStr();
    await setDoc(doc(db(), FIRESTORE.WELLNESS_LOGS, `${user.id}_${today}`), {
      userId: user.id, date: today, mood, energy, pain, sleepHours, notes,
      createdAt: new Date().toISOString(),
    });
    setSaving(false);
    setSaved(true);
    setIsEdit(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function painColor(v: number) {
    if (v <= 2) return "bg-green-500 text-white border-green-500";
    if (v <= 5) return "bg-orange text-white border-orange";
    return "bg-alert-red text-white border-alert-red";
  }
  function painOutline(v: number) {
    if (v <= 2) return "border-green-300 text-green-700 hover:bg-green-50";
    if (v <= 5) return "border-orange/60 text-orange hover:bg-orange/10";
    return "border-red-300 text-red-700 hover:bg-red-50";
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Daily Wellness Log</h1>
      <p className="text-text-secondary text-sm mb-6">
        {isEdit ? "Update today's entry" : "How are you feeling today?"}
      </p>

      <div className="space-y-5">
        {/* Mood */}
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="font-semibold text-text-primary mb-3">Mood</p>
          <div className="flex gap-3 justify-center">
            {MOODS.map((emoji, i) => {
              const val = i + 1;
              return (
                <button key={val} onClick={() => setMood(val)}
                  className={`w-14 h-14 rounded-full text-2xl border-2 transition-all ${
                    mood === val ? "bg-primary border-primary shadow-md scale-110" : "bg-gray-50 border-gray-200 hover:border-primary/50"
                  }`}>
                  {emoji}
                </button>
              );
            })}
          </div>
          <p className="text-center text-xs text-text-secondary mt-2">
            {["", "Very Bad", "Bad", "Okay", "Good", "Great"][mood]}
          </p>
        </div>

        {/* Energy */}
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="font-semibold text-text-primary mb-3">Energy Level</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} onClick={() => setEnergy(v)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  energy === v ? "bg-primary text-white border-primary" : "border-gray-200 text-text-secondary hover:border-primary/50"
                }`}>
                {v} {v === 1 ? "Low" : v === 5 ? "High" : ""}
              </button>
            ))}
          </div>
        </div>

        {/* Pain */}
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="font-semibold text-text-primary mb-3">Pain Level <span className="text-xs text-text-secondary font-normal">(0 = none, 10 = severe)</span></p>
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: 11 }, (_, i) => (
              <button key={i} onClick={() => setPain(i)}
                className={`w-9 h-9 rounded-lg text-sm font-semibold border-2 transition-all ${
                  pain === i ? painColor(i) : `bg-white ${painOutline(i)}`
                }`}>
                {i}
              </button>
            ))}
          </div>
        </div>

        {/* Sleep */}
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="font-semibold text-text-primary mb-3">Sleep Hours</p>
          <div className="flex items-center gap-4">
            <input type="number" min={0} max={16} step={0.5} value={sleepHours}
              onChange={(e) => setSleepHours(Math.min(16, Math.max(0, Number(e.target.value))))}
              className="w-28 px-4 py-2.5 border border-gray-200 rounded-xl text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <span className="text-text-secondary text-sm">hours last night</span>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="font-semibold text-text-primary mb-3">Notes <span className="text-xs font-normal text-text-secondary">(optional)</span></p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 300))}
            rows={3} placeholder="How was your day? Any symptoms or observations…"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" />
          <p className="text-right text-xs text-text-secondary mt-1">{notes.length}/300</p>
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving}
          className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-colors ${
            saved ? "bg-green-500 text-white" : "bg-primary text-white hover:bg-green-dark disabled:opacity-60"
          }`}>
          {saving ? "Saving…" : saved ? "✓ Logged!" : isEdit ? "Update Today's Log" : "Log Today's Wellness"}
        </button>
      </div>
    </div>
  );
}
