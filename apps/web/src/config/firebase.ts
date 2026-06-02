import { initializeApp, getApps } from "firebase/app";
import { initializeAuth, browserLocalPersistence } from "firebase/auth";
import { ENV } from "./env";

if (getApps().length === 0) {
  const app = initializeApp({
    apiKey:            ENV.FIREBASE_API_KEY,
    authDomain:        ENV.FIREBASE_AUTH_DOMAIN,
    projectId:         ENV.FIREBASE_PROJECT_ID,
    storageBucket:     ENV.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
    appId:             ENV.FIREBASE_APP_ID,
  });
  initializeAuth(app, { persistence: browserLocalPersistence });
}
