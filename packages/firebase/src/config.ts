import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";

export function initFirebase(config: FirebaseOptions) {
  if (getApps().length > 0) return getApp();
  return initializeApp(config);
}

export function getFirebaseApp() {
  if (getApps().length === 0) {
    throw new Error("Firebase not initialized. Call initFirebase(config) before using Firebase services.");
  }
  return getApp();
}
