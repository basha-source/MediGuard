// Expo inlines EXPO_PUBLIC_* variables into the JS bundle at BUILD time, but ONLY
// when they are referenced with STATIC member syntax — `process.env.EXPO_PUBLIC_FOO`.
// Dynamic access (`process.env[key]`) and, to be safe, bracket access are NOT
// reliably inlined and resolve to `undefined` in a release build. The previous
// version checked the vars via `process.env[key]`, so every one read as "missing"
// in the APK and the module threw at load → SIGABRT → black screen on launch.
//
// Every variable below is therefore read with static dot-notation, and the
// "missing" check is derived from those already-resolved values — never a dynamic
// lookup.

const FIREBASE_API_KEY             = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const FIREBASE_AUTH_DOMAIN         = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
const FIREBASE_PROJECT_ID          = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_STORAGE_BUCKET      = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
const FIREBASE_MESSAGING_SENDER_ID = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const FIREBASE_APP_ID              = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
const BACKEND_URL                  = process.env.EXPO_PUBLIC_BACKEND_URL;

const resolved: Record<string, string | undefined> = {
  EXPO_PUBLIC_FIREBASE_API_KEY:             FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN:         FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID:          FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET:      FIREBASE_STORAGE_BUCKET,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: FIREBASE_MESSAGING_SENDER_ID,
  EXPO_PUBLIC_FIREBASE_APP_ID:              FIREBASE_APP_ID,
  EXPO_PUBLIC_BACKEND_URL:                  BACKEND_URL,
};

const missing = Object.keys(resolved).filter((key) => !resolved[key]);
if (missing.length > 0) {
  // Do NOT throw — a throw during module load crashes a release build to a black
  // screen. Record it so ErrorBoundary can display which variables are missing.
  const msg = `Missing required environment variables:\n${missing.join("\n")}\n\nThese must be set in eas.json (build profile env) or .env.`;
  const g = globalThis as unknown as { __STARTUP_ERROR__?: string | null };
  g.__STARTUP_ERROR__ = g.__STARTUP_ERROR__ ? `${g.__STARTUP_ERROR__}\n\n${msg}` : msg;
  if (typeof console !== "undefined") console.error(msg);
}

export const ENV = {
  FIREBASE_API_KEY:             FIREBASE_API_KEY!,
  FIREBASE_AUTH_DOMAIN:         FIREBASE_AUTH_DOMAIN!,
  FIREBASE_PROJECT_ID:          FIREBASE_PROJECT_ID!,
  FIREBASE_STORAGE_BUCKET:      FIREBASE_STORAGE_BUCKET!,
  FIREBASE_MESSAGING_SENDER_ID: FIREBASE_MESSAGING_SENDER_ID!,
  FIREBASE_APP_ID:              FIREBASE_APP_ID!,
  BACKEND_URL:                  BACKEND_URL!,
  GOOGLE_WEB_CLIENT_ID:         process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
  GOOGLE_ANDROID_CLIENT_ID:     process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "",
} as const;
