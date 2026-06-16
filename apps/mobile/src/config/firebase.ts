import AsyncStorage from "@react-native-async-storage/async-storage";
import { ENV } from "./env";
import { recordStartupError } from "./installErrorHandler";

// Call initializeApp from the same firebase/app module that firebase/auth uses.
// Previously this was delegated to @mediguard/firebase which resolves firebase/app
// from packages/firebase/node_modules — a separate instance with its own component
// registry — so the auth component registered by firebase/auth was invisible to
// the app, causing "Component auth has not been registered yet".
//
// The firebase modules are loaded via require() INSIDE this try block (not static
// imports at the top) so that even a module-load throw inside firebase is captured
// and surfaced in ErrorBoundary instead of killing the release build to a black
// screen.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { initializeApp, getApps, getApp } = require("firebase/app");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { initializeAuth, getReactNativePersistence } = require("firebase/auth");

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
} catch (e) {
  recordStartupError("Firebase initialization failed", e);
}
