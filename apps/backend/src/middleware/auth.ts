import { Request, Response, NextFunction } from "express";
import { getAuth } from "firebase-admin/auth";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split("Bearer ")?.[1];
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const decoded = await getAuth().verifyIdToken(token);
    (req as any).uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
