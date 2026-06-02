import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { FamilyMember } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

const RELATIONS = ["Spouse", "Parent", "Child", "Sibling", "Grandparent", "Other"];

export function FamilyProfilesPage() {
  const { user }                  = useAuthStore();
  const [members, setMembers]     = useState<FamilyMember[]>([]);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ name: "", relation: "Spouse", pin: "" });
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    return onSnapshot(
      query(collection(db(), FIRESTORE.FAMILY), where("parentUserId", "==", user.id)),
      (s) => setMembers(s.docs.map((d) => ({ id: d.id, ...d.data() } as FamilyMember)))
    );
  }, [user?.id]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    await addDoc(collection(db(), FIRESTORE.FAMILY), { ...form, parentUserId: user.id });
    setForm({ name: "", relation: "Spouse", pin: "" });
    setShowForm(false); setSaving(false);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Family Profiles</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-green-dark transition-colors">
          + Add Member
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <h2 className="font-bold text-text-primary mb-4">Add Family Member</h2>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium mb-1">Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Relation</label>
              <select value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white">
                {RELATIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">PIN (4 digits)</label>
              <input value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.slice(0, 4) })} maxLength={4}
                placeholder="1234" pattern="[0-9]{4}"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-green-dark disabled:opacity-60">
              {saving ? "Saving…" : "Add"}
            </button>
          </div>
        </form>
      )}

      {members.length === 0 ? (
        <div className="text-center py-12 text-text-secondary bg-card rounded-2xl border border-gray-100">
          <p className="text-4xl mb-2">👨‍👩‍👧</p>
          <p className="font-medium">No family members added</p>
          <p className="text-sm mt-1">Add family members to manage their health together</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {members.map((m) => {
            const initials = m.name.slice(0, 2).toUpperCase();
            return (
              <div key={m.id} className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-primary-pale flex items-center justify-center text-primary font-bold">
                    {initials}
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{m.name}</p>
                    <p className="text-xs text-text-secondary">{m.relation}</p>
                  </div>
                </div>
                <button onClick={() => deleteDoc(doc(db(), FIRESTORE.FAMILY, m.id))}
                  className="text-xs text-alert-red hover:underline">Remove</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
