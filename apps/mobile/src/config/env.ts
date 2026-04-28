const required = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
  "EXPO_PUBLIC_BACKEND_URL",
] as const;

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables:\n${missing.join("\n")}\n\nCopy .env.example to .env and fill in the values.`);
}

export const ENV = {
  FIREBASE_API_KEY:             process.env["EXPO_PUBLIC_FIREBASE_API_KEY"]!,
  FIREBASE_AUTH_DOMAIN:         process.env["EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"]!,
  FIREBASE_PROJECT_ID:          process.env["EXPO_PUBLIC_FIREBASE_PROJECT_ID"]!,
  FIREBASE_STORAGE_BUCKET:      process.env["EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"]!,
  FIREBASE_MESSAGING_SENDER_ID: process.env["EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"]!,
  FIREBASE_APP_ID:              process.env["EXPO_PUBLIC_FIREBASE_APP_ID"]!,
  BACKEND_URL:                  process.env["EXPO_PUBLIC_BACKEND_URL"]!,
} as const;
