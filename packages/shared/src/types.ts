export type UserRole = "patient" | "careGuardian";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  bloodGroup?: string;
  dateOfBirth?: string;
  gender?: string;
  allergies?: string[];
  conditions?: string[];
  emergencyContact?: string;
  careGuardianCode?: string;
  createdAt: string;
};

export type MedicineCategory = "tablet" | "capsule" | "liquid" | "injection" | "other";

export type Medicine = {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  quantity: number;
  expiryDate: string;
  category: MedicineCategory;
  barcode?: string;
  prescribedBy?: string;
  schedule?: string;
  courseDays?: number;
  addedAt: string;
};

export type DoseStatus = "taken" | "missed" | "snoozed" | "pending";

export type DoseLog = {
  id: string;
  userId: string;
  medicineId: string;
  medicineName: string;
  scheduledTime: string;
  takenAt?: string;
  status: DoseStatus;
  reason?: string;
  date: string;
};

export type Vital = {
  id: string;
  userId: string;
  type: "bloodPressure" | "bloodSugar" | "temperature" | "weight";
  value: string;
  unit: string;
  status: "normal" | "borderline" | "high" | "low";
  recordedAt: string;
};

export type Vaccination = {
  id: string;
  userId: string;
  name: string;
  date: string;
  validUntil?: string;
  status: "completed" | "due" | "overdue";
};

export type SideEffect = {
  id: string;
  userId: string;
  medicineId: string;
  medicineName: string;
  symptoms: string[];
  severity: "mild" | "moderate" | "severe";
  startedAt: string;
  notes?: string;
};

export type FamilyMember = {
  id: string;
  parentUserId: string;
  name: string;
  relation: string;
  pin: string;
};

export type CareGuardianLink = {
  patientId: string;
  guardianId: string;
  code: string;
  linkedAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: "dose" | "expiry" | "refill" | "sos" | "careGuardian";
  read: boolean;
  createdAt: string;
};
