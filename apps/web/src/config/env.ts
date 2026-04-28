const required = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_BACKEND_URL",
] as const;

const missing = required.filter((key) => !import.meta.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables:\n${missing.join("\n")}\n\nCopy .env.example to .env and fill in the values.`);
}

export const ENV = {
  FIREBASE_API_KEY:             import.meta.env["VITE_FIREBASE_API_KEY"]!,
  FIREBASE_AUTH_DOMAIN:         import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"]!,
  FIREBASE_PROJECT_ID:          import.meta.env["VITE_FIREBASE_PROJECT_ID"]!,
  FIREBASE_STORAGE_BUCKET:      import.meta.env["VITE_FIREBASE_STORAGE_BUCKET"]!,
  FIREBASE_MESSAGING_SENDER_ID: import.meta.env["VITE_FIREBASE_MESSAGING_SENDER_ID"]!,
  FIREBASE_APP_ID:              import.meta.env["VITE_FIREBASE_APP_ID"]!,
  BACKEND_URL:                  import.meta.env["VITE_BACKEND_URL"]!,
} as const;
