import "dotenv/config";

const required = [
  "FIREBASE_SERVICE_ACCOUNT_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_MAPS_API_KEY",
] as const;

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables:\n${missing.join("\n")}\n\nCopy .env.example to .env and fill in the values.`);
}

export const ENV = {
  FIREBASE_SERVICE_ACCOUNT_KEY: process.env["FIREBASE_SERVICE_ACCOUNT_KEY"]!,
  GEMINI_API_KEY:               process.env["GEMINI_API_KEY"]!,
  GOOGLE_MAPS_API_KEY:          process.env["GOOGLE_MAPS_API_KEY"]!,
  PORT:                         Number(process.env["PORT"] ?? 4000),
} as const;
