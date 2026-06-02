import { Colors, ALERT_DAYS } from "@mediguard/shared";

export type ExpiryStatus = { label: string; color: string; days: number };

export function getExpiryStatus(expiryDate: string): ExpiryStatus {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  const days = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0)   return { label: "Expired",  color: Colors.alertRed, days };
  if (days <= 7)  return { label: "Critical", color: Colors.alertRed, days };
  if (days <= 30) return { label: "Soon",     color: Colors.orange,   days };
  return { label: "OK", color: Colors.primary, days };
}

export function isLowStock(quantity: number): boolean {
  return quantity <= ALERT_DAYS.LOW_STOCK_THRESHOLD;
}
