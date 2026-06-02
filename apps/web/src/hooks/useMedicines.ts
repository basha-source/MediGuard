import { useEffect } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseServices";
import { FIRESTORE } from "@mediguard/shared";
import type { Medicine } from "@mediguard/shared";
import { create } from "zustand";

type MedicineState = {
  medicines: Medicine[];
  setMedicines: (m: Medicine[]) => void;
};

export const useMedicineStore = create<MedicineState>((set) => ({
  medicines: [],
  setMedicines: (medicines) => set({ medicines }),
}));

export function useMedicines(userId: string | null) {
  const { setMedicines } = useMedicineStore();

  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db(), FIRESTORE.MEDICINES),
      where("userId", "==", userId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMedicines(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine)));
    });
    return unsub;
  }, [userId]);
}
