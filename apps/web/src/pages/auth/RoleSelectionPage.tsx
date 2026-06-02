import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { UserRole } from "@mediguard/shared";

export function RoleSelectionPage() {
  const navigate        = useNavigate();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!role) return;
    setLoading(true);
    const fbUser = auth().currentUser;
    if (!fbUser) { navigate("/login", { replace: true }); return; }
    await setDoc(doc(db(), FIRESTORE.USERS, fbUser.uid), {
      id: fbUser.uid, email: fbUser.email ?? "",
      name: fbUser.displayName ?? (fbUser.email?.split("@")[0] ?? "User"),
      role, createdAt: new Date().toISOString(),
    }, { merge: true });
    navigate("/health-setup", { replace: true });
  }

  const cards: { role: UserRole; icon: string; title: string; desc: string }[] = [
    { role: "patient",      icon: "🏥", title: "Patient",       desc: "Track your medicines, doses, vitals, and get AI-powered health insights." },
    { role: "careGuardian", icon: "👁️",  title: "Care Guardian", desc: "Monitor a loved one's medications, adherence, and receive missed-dose alerts." },
  ];

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Who are you?</h1>
          <p className="text-text-secondary mt-1">Choose your role to personalise MediGuard</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {cards.map((c) => (
            <button key={c.role} onClick={() => setRole(c.role)}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${role === c.role ? "border-primary bg-primary-pale shadow-md" : "border-gray-200 bg-card hover:border-primary/40"}`}>
              <div className="text-4xl mb-3">{c.icon}</div>
              <h3 className="font-bold text-text-primary">{c.title}</h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">{c.desc}</p>
              {role === c.role && (
                <div className="mt-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
        <button onClick={handleContinue} disabled={!role || loading}
          className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-green-dark transition-colors disabled:opacity-40">
          {loading ? "Saving…" : "Continue →"}
        </button>
      </div>
    </div>
  );
}
