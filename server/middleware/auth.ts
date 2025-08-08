// server/middleware/auth.ts
import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) return res.status(401).json({ message: "Not authenticated" });
  next();
}

export function requireAdminOrPartner(req: Request, res: Response, next: NextFunction) {
  const user = req.session.user as any;
  if (!user) return res.status(401).json({ message: "Not authenticated" });
  if (user.role === "admin" || user.role === "partner") return next();
  return res.status(403).json({ message: "Forbidden: insufficient role" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.session.user as any;
  if (!user) return res.status(401).json({ message: "Not authenticated" });
  if (user.role === "admin") return next();
  return res.status(403).json({ message: "Forbidden: insufficient role" });
}

