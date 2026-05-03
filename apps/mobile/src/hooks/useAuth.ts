import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseAuth, getDb } from "@mediguard/firebase";
import { FIRESTORE } from "@mediguard/shared";
import type { User } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const { setUser, setFirebaseUid, setLoading } = useAuthStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (fbUser) => {
      if (!fbUser) {
        setFirebaseUid(null);
        setUser(null);
        setLoading(false);
        return;
      }
      setFirebaseUid(fbUser.uid);
      try {
        const snap = await getDoc(doc(getDb(), FIRESTORE.USERS, fbUser.uid));
        if (snap.exists()) setUser({ id: fbUser.uid, ...snap.data() } as User);
      } catch {
        // Firestore unavailable — stay unauthenticated in app state
      }
      setLoading(false);
    });
    return unsub;
  }, []);
}
