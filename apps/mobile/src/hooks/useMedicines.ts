import { useEffect, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { getDb } from "@mediguard/firebase";
import { FIRESTORE, Medicine } from "@mediguard/shared";
import { useMedicineStore } from "@/store/medicineStore";
import { useAuthStore } from "@/store/authStore";
import { checkAndScheduleExpiryAlerts } from "@/services/notifications";

export function useMedicines() {
  const user = useAuthStore((s) => s.user);
  const setMedicines = useMedicineStore((s) => s.setMedicines);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    checkedRef.current = false;
    const q = query(collection(getDb(), FIRESTORE.MEDICINES), where("userId", "==", user.id));
    const unsub = onSnapshot(q, (snap) => {
      const meds = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine));
      setMedicines(meds);
      if (!checkedRef.current) {
        checkedRef.current = true;
        checkAndScheduleExpiryAlerts(meds, user.id).catch(() => {});
      }
    });
    return unsub;
  }, [user]);
}
