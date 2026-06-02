import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { Medicine, MedicineCategory } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

const CATEGORIES: MedicineCategory[] = ["tablet", "capsule", "liquid", "injection", "other"];
const CATEGORY_ICON: Record<MedicineCategory, string> = {
  tablet: "💊", capsule: "💊", liquid: "🧴", injection: "💉", other: "🏥",
};

const EMPTY: Omit<Medicine, "id" | "userId" | "addedAt"> = {
  name: "", dosage: "", quantity: 0, expiryDate: "", category: "tablet",
  barcode: "", prescribedBy: "", schedule: "", courseDays: undefined,
};

export function InventoryPage() {
  const { user }                    = useAuthStore();
  const [medicines, setMedicines]   = useState<Medicine[]>([]);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState<Medicine | null>(null);
  const [form, setForm]             = useState(EMPTY);
  const [search, setSearch]         = useState("");
  const [saving, setSaving]         = useState(false);
  const [deleteId, setDeleteId]     = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const q = query(collection(db(), FIRESTORE.MEDICINES), where("userId", "==", user.id));
    return onSnapshot(q, (s) => setMedicines(s.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine))));
  }, [user?.id]);

  function openAdd() { setEditing(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(m: Medicine) {
    setEditing(m);
    setForm({ name: m.name, dosage: m.dosage, quantity: m.quantity, expiryDate: m.expiryDate,
      category: m.category, barcode: m.barcode ?? "", prescribedBy: m.prescribedBy ?? "",
      schedule: m.schedule ?? "", courseDays: m.courseDays });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db(), FIRESTORE.MEDICINES, editing.id), { ...form });
      } else {
        await addDoc(collection(db(), FIRESTORE.MEDICINES), {
          ...form, userId: user.id, addedAt: new Date().toISOString(),
        });
      }
      setShowModal(false);
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    await deleteDoc(doc(db(), FIRESTORE.MEDICINES, id));
    setDeleteId(null);
  }

  const filtered = medicines.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.prescribedBy ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const now = new Date();
  function expiryClass(dateStr: string) {
    const days = (new Date(dateStr).getTime() - now.getTime()) / 86400000;
    if (days < 0) return "text-alert-red font-semibold";
    if (days <= 7) return "text-alert-red";
    if (days <= 30) return "text-orange";
    return "text-green-600";
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Medicine Inventory</h1>
          <p className="text-text-secondary text-sm mt-0.5">{medicines.length} medicines tracked</p>
        </div>
        <button onClick={openAdd}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-green-dark transition-colors flex items-center gap-2">
          + Add Medicine
        </button>
      </div>

      <div className="mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search medicines…"
          className="w-full max-w-sm px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <p className="text-4xl mb-3">💊</p>
          <p className="font-medium">No medicines found</p>
          <p className="text-sm mt-1">Click "Add Medicine" to get started</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-text-secondary text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Medicine</th>
                <th className="text-left px-4 py-3">Dosage</th>
                <th className="text-left px-4 py-3">Qty</th>
                <th className="text-left px-4 py-3">Expiry</th>
                <th className="text-left px-4 py-3">Prescribed By</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{CATEGORY_ICON[m.category]}</span>
                      <div>
                        <p className="font-medium text-text-primary">{m.name}</p>
                        <p className="text-xs text-text-secondary capitalize">{m.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{m.dosage}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${m.quantity <= 5 ? "text-alert-red" : "text-text-primary"}`}>
                      {m.quantity}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${expiryClass(m.expiryDate)}`}>{m.expiryDate}</td>
                  <td className="px-4 py-3 text-text-secondary">{m.prescribedBy || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(m)} className="text-primary hover:underline text-xs">Edit</button>
                      <button onClick={() => setDeleteId(m.id)} className="text-alert-red hover:underline text-xs">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-lg text-text-primary mb-4">{editing ? "Edit Medicine" : "Add Medicine"}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Medicine Name *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Dosage</label>
                  <input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="e.g. 500mg"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Quantity *</label>
                  <input required type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Expiry Date *</label>
                  <input required type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as MedicineCategory })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white">
                    {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Prescribed By</label>
                  <input value={form.prescribedBy} onChange={(e) => setForm({ ...form, prescribedBy: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Schedule</label>
                  <input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="e.g. 8:00 AM, 8:00 PM"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Course Days</label>
                  <input type="number" min={1} value={form.courseDays ?? ""} onChange={(e) => setForm({ ...form, courseDays: e.target.value ? +e.target.value : undefined })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-green-dark transition-colors disabled:opacity-60">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-text-primary mb-2">Delete Medicine?</h3>
            <p className="text-text-secondary text-sm mb-4">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 bg-alert-red text-white rounded-xl text-sm font-semibold hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
