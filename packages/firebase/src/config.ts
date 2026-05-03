import { getApps, getApp, FirebaseOptions } from "firebase/app";

// initFirebase is kept for API compatibility but the app MUST be initialized
// by apps/mobile/src/config/firebase.ts before this is called.  That file
// calls initializeApp directly so that initializeApp and initializeAuth share
// the same firebase/app module instance (and thus the same component registry).
export function initFirebase(_config: FirebaseOptions) {
  if (getApps().length === 0) {
    throw new Error(
      "Firebase app has not been initialized. Make sure apps/mobile/src/config/firebase.ts is imported first."
    );
  }
  return getApp();
}

export function getFirebaseApp() {
  if (getApps().length === 0) {
    throw new Error(
      "Firebase not initialized. Import apps/mobile/src/config/firebase before using Firebase services."
    );
  }
  return getApp();
}
