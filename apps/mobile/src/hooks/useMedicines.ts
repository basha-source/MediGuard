import { useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@mediguard/firebase";
import { FIRESTORE, Medicine } from "@mediguard/shared";
import { useMedicineStore } from "@/store/medicineStore";
import { useAuthStore } from "@/store/authStore";

export function useMedicines() {
  const user = useAuthStore((s) => s.user);
  const setMedicines = useMedicineStore((s) => s.setMedicines);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, FIRESTORE.MEDICINES), where("userId", "==", user.id));
    const unsub = onSnapshot(q, (snap) => {
      const meds = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine));
      setMedicines(meds);
    });
    return unsub;
  }, [user]);
}
