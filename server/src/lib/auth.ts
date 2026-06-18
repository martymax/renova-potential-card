// Jednoduchá tokenová autentizace s rolemi (§4).
// Demo: token v paměti serveru. V produkci JWT / session store + hashovaná hesla.

import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { getDb } from "./store.js";
import type { Role, User } from "../types.js";

const sessions = new Map<string, string>(); // token → userId

export function login(username: string, password: string): { token: string; user: PublicUser } | null {
  const user = getDb().users.find((u) => u.username === username && u.password === password);
  if (!user) return null;
  const token = randomBytes(24).toString("hex");
  sessions.set(token, user.id);
  return { token, user: toPublic(user) };
}

export function logout(token: string): void {
  sessions.delete(token);
}

export interface PublicUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  raynetUserId: number;
  vehicleId?: string;
}

export function toPublic(u: User): PublicUser {
  return { id: u.id, username: u.username, name: u.name, role: u.role, raynetUserId: u.raynetUserId, vehicleId: u.vehicleId };
}

export interface AuthedRequest extends Request {
  user?: User;
}

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.header("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const userId = sessions.get(token);
  if (!userId) {
    res.status(401).json({ error: "Přihlaš se prosím." });
    return;
  }
  const user = getDb().users.find((u) => u.id === userId);
  if (!user) {
    res.status(401).json({ error: "Relace vypršela. Přihlaš se znovu." });
    return;
  }
  req.user = user;
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Na tuto akci nemáš oprávnění." });
      return;
    }
    next();
  };
}
