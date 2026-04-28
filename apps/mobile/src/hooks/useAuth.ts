import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth } from "@mediguard/firebase";
import { db } from "@mediguard/firebase";
import { FIRESTORE } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { setUser(null); return; }
      const snap = await getDoc(doc(db, FIRESTORE.USERS, firebaseUser.uid));
      if (snap.exists()) setUser({ id: firebaseUser.uid, ...snap.data() } as any);
    });
    return unsub;
  }, []);
}
