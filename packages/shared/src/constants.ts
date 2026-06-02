export const API = {
  OPENFDA_BASE:  "https://api.fda.gov/drug",
  GEMINI_BASE:   "https://generativelanguage.googleapis.com/v1beta",
  BACKEND_DEV:   "http://localhost:4000",
  BACKEND_PROD:  "https://api.mediguard.app",
} as const;

export const ALERT_DAYS = {
  EXPIRY_WARNING_1: 30,
  EXPIRY_WARNING_2: 7,
  EXPIRY_WARNING_3: 1,
  LOW_STOCK_THRESHOLD: 5,
} as const;

export const APP = {
  NAME:          "MediGuard",
  VERSION:       "1.0.0",
  TAGLINE:       "Your Personal Medicine Guardian",
} as const;

export const FIRESTORE = {
  USERS:         "users",
  MEDICINES:     "medicines",
  DOSE_LOGS:     "doseLogs",
  VITALS:        "vitals",
  VACCINATIONS:  "vaccinations",
  SIDE_EFFECTS:  "sideEffects",
  FAMILY:        "familyMembers",
  CG_LINKS:      "careGuardianLinks",
  NOTIFICATIONS: "notifications",
  CHAT_HISTORY:  "chatHistory",
  WELLNESS_LOGS: "wellnessLogs",
} as const;

export const STORAGE_PATHS = {
  PRESCRIPTIONS:  "prescriptions",
  PROFILE_PHOTOS: "profilePhotos",
  REPORTS:        "reports",
} as const;
