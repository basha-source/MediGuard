import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

export function ProfilePage() {
  const navigate      = useNavigate();
  const { user, setUser } = useAuthStore();
  const [editing, setEditing]   = useState(false);
  const [name, setName]         = useState(user?.name ?? "");
  const [emergency, setEmergency] = useState(user?.emergencyContact ?? "");
  const [saving, setSaving]     = useState(false);

  const initials = (user?.name ?? user?.email ?? "U").slice(0, 2).toUpperCase();

  async function handleSave() {
    if (!user?.id) return;
    setSaving(true);
    await updateDoc(doc(db(), FIRESTORE.USERS, user.id), { name, emergencyContact: emergency });
    setUser({ ...user, name, emergencyContact: emergency });
    setEditing(false);
    setSaving(false);
  }

  async function handleLogout() {
    if (confirm("Sign out of MediGuard?")) {
      await signOut(auth());
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Profile</h1>

      {/* Avatar + info */}
      <div className="bg-primary rounded-2xl p-6 mb-4 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {initials}
          </div>
          <div>
            <p className="text-xl font-bold">{user?.name ?? "User"}</p>
            <p className="text-sm opacity-75">{user?.email}</p>
            <span className="mt-1 inline-block px-3 py-0.5 bg-white/20 rounded-full text-xs font-semibold capitalize">
              {user?.role === "careGuardian" ? "Care Guardian" : "Patient"}
            </span>
          </div>
        </div>
      </div>

      {/* Edit toggle */}
      <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-text-primary">Account Info</h2>
          {!editing
            ? <button onClick={() => setEditing(true)} className="text-sm text-primary hover:underline">Edit</button>
            : <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="text-sm text-text-secondary hover:underline">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="text-sm text-primary font-semibold hover:underline disabled:opacity-60">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
          }
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-text-secondary mb-0.5">Full Name</p>
            {editing
              ? <input value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              : <p className="text-sm font-medium text-text-primary">{user?.name || "—"}</p>
            }
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-0.5">Email</p>
            <p className="text-sm text-text-primary">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-0.5">Member Since</p>
            <p className="text-sm text-text-primary">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-0.5">Emergency Contact</p>
            {editing
              ? <input value={emergency} onChange={(e) => setEmergency(e.target.value)} placeholder="+91 9876543210"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              : <p className="text-sm text-text-primary">{user?.emergencyContact || "—"}</p>
            }
          </div>
        </div>
      </div>

      {/* Health profile */}
      <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <h2 className="font-bold text-text-primary mb-3">Health Profile</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ["Blood Group",  user?.bloodGroup],
            ["Gender",       user?.gender],
            ["Date of Birth", user?.dateOfBirth],
          ].map(([label, val]) => (
            <div key={label as string}>
              <p className="text-xs text-text-secondary mb-0.5">{label as string}</p>
              <p className="font-medium text-text-primary">{val || "—"}</p>
            </div>
          ))}
        </div>

        {(user?.conditions?.length ?? 0) > 0 && (
          <div className="mt-3">
            <p className="text-xs text-text-secondary mb-1.5">Conditions</p>
            <div className="flex flex-wrap gap-1.5">
              {user?.conditions?.map((c) => (
                <span key={c} className="px-2.5 py-0.5 bg-primary-pale text-primary text-xs rounded-full font-medium">{c}</span>
              ))}
            </div>
          </div>
        )}
        {(user?.allergies?.length ?? 0) > 0 && (
          <div className="mt-3">
            <p className="text-xs text-text-secondary mb-1.5">Allergies</p>
            <div className="flex flex-wrap gap-1.5">
              {user?.allergies?.map((a) => (
                <span key={a} className="px-2.5 py-0.5 bg-red-50 text-alert-red text-xs rounded-full font-medium">{a}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <button onClick={handleLogout}
        className="w-full py-3 border border-alert-red text-alert-red rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors">
        🚪 Sign Out
      </button>
    </div>
  );
}
