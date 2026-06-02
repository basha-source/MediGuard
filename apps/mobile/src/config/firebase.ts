import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ENV } from "./env";

// Call initializeApp from the same firebase/app module that firebase/auth uses.
// Previously this was delegated to @mediguard/firebase which resolves firebase/app
// from packages/firebase/node_modules — a separate instance with its own component
// registry — so the auth component registered by firebase/auth was invisible to
// the app, causing "Component auth has not been registered yet".
const app = getApps().length === 0
  ? initializeApp({
      apiKey:            ENV.FIREBASE_API_KEY,
      authDomain:        ENV.FIREBASE_AUTH_DOMAIN,
      projectId:         ENV.FIREBASE_PROJECT_ID,
      storageBucket:     ENV.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
      appId:             ENV.FIREBASE_APP_ID,
    })
  : getApp();

// initializeAuth must only be called once per app.
// Guard against hot-reload / fast-refresh re-evaluation of this module.
try {
  initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Auth already initialized — getAuth(app) in @mediguard/firebase returns the existing instance.
}
