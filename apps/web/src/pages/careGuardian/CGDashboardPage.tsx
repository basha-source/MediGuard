import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { CareGuardianLink } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

export function CGDashboardPage() {
  const { user }              = useAuthStore();
  const [links, setLinks]     = useState<CareGuardianLink[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    return onSnapshot(
      query(collection(db(), FIRESTORE.CG_LINKS), where("guardianId", "==", user.id)),
      (s) => setLinks(s.docs.map((d) => ({ ...d.data() } as CareGuardianLink)))
    );
  }, [user?.id]);

  const guardianCode = user?.careGuardianCode ?? user?.id?.slice(0, 8).toUpperCase();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <p className="text-text-secondary text-sm">Welcome back 👋</p>
        <h1 className="text-2xl font-bold text-text-primary">{user?.name ?? "Care Guardian"}</h1>
      </div>

      {/* Guardian code */}
      <div className="bg-primary text-white rounded-2xl p-5 mb-6">
        <p className="text-sm opacity-75 mb-1">Your Guardian Code</p>
        <p className="text-3xl font-bold tracking-widest">{guardianCode}</p>
        <p className="text-xs opacity-70 mt-2">Share this code with a patient to link their account to yours</p>
      </div>

      {/* Linked patients */}
      <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-text-primary mb-4">Linked Patients ({links.length})</h2>
        {links.length === 0 ? (
          <div className="text-center py-10 text-text-secondary">
            <p className="text-4xl mb-2">👥</p>
            <p className="font-medium">No patients linked yet</p>
            <p className="text-sm mt-1">Ask the patient to enter your guardian code in the MediGuard app</p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((l, i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-primary transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-pale flex items-center justify-center text-primary font-bold text-sm">
                    {l.patientId.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-text-primary">Patient ID: {l.patientId.slice(0, 8)}…</p>
                    <p className="text-xs text-text-secondary">Linked: {new Date(l.linkedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Active</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
