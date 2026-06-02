import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin(): App {
  if (getApps().length > 0) return getApps()[0]!;
  const raw = process.env["FIREBASE_SERVICE_ACCOUNT_KEY"];
  try {
    const serviceAccount = raw ? JSON.parse(raw) : null;
    if (serviceAccount?.project_id) {
      return initializeApp({ credential: cert(serviceAccount) });
    }
  } catch {
    // service account key is not valid JSON (e.g. placeholder value)
  }
  // Fallback for local dev without a service account — auth operations will fail gracefully
  return initializeApp();
}

initAdmin();

export const adminAuth = getAuth();
export const adminDb   = getFirestore();
