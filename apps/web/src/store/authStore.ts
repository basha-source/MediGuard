import { create } from "zustand";
import type { User } from "@mediguard/shared";

type AuthState = {
  user:           User | null;
  firebaseUid:    string | null;
  loading:        boolean;
  setUser:        (user: User | null) => void;
  setFirebaseUid: (uid: string | null) => void;
  setLoading:     (loading: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user:           null,
  firebaseUid:    null,
  loading:        true,
  setUser:        (user)    => set({ user }),
  setFirebaseUid: (uid)     => set({ firebaseUid: uid }),
  setLoading:     (loading) => set({ loading }),
}));
