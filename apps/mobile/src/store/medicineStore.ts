import { create } from "zustand";
import { Medicine } from "@mediguard/shared";

type MedicineState = {
  medicines: Medicine[];
  setMedicines: (medicines: Medicine[]) => void;
  addMedicine: (medicine: Medicine) => void;
  removeMedicine: (id: string) => void;
};

export const useMedicineStore = create<MedicineState>((set) => ({
  medicines: [],
  setMedicines: (medicines) => set({ medicines }),
  addMedicine:  (medicine) => set((s) => ({ medicines: [...s.medicines, medicine] })),
  removeMedicine: (id) => set((s) => ({ medicines: s.medicines.filter((m) => m.id !== id) })),
}));
