import { Router } from "express";
import { authMiddleware, requireRole, toPublic } from "../lib/auth.js";
import { getDb } from "../lib/store.js";
import {
  raynetGetCompany,
  raynetPing,
  raynetSearch,
  raynetSetConnected,
} from "../lib/raynet.js";

export const raynetRouter = Router();
raynetRouter.use(authMiddleware);

// Test připojení (§9.3)
raynetRouter.get("/ping", (_req, res) => {
  res.json(raynetPing());
});

// Synchronizace uživatelů z Raynetu (§9.3) — admin
raynetRouter.get("/users", requireRole("admin"), (_req, res) => {
  res.json({ users: getDb().users.map(toPublic) });
});

// Vyhledání firmy (§7.1)
raynetRouter.get("/companies", (req, res) => {
  const q = String(req.query.q ?? "");
  try {
    res.json({ companies: raynetSearch(q) });
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

// Detail firmy (§11.3)
raynetRouter.get("/companies/:id", (req, res) => {
  const company = raynetGetCompany(Number(req.params.id));
  if (!company) {
    res.status(404).json({ error: "Firma nebyla v Raynetu nalezena." });
    return;
  }
  res.json({ company });
});

// Admin: simulace výpadku Raynetu (pro demonstraci „lokální uložení má prioritu")
raynetRouter.post("/connection", requireRole("admin"), (req, res) => {
  const connected = Boolean(req.body?.connected);
  raynetSetConnected(connected);
  res.json(raynetPing());
});

// Přehled write-back zápisů (§11.4) — ředitel + admin
raynetRouter.get("/writeback", requireRole("admin", "reditel"), (_req, res) => {
  res.json({ writeback: getDb().writeback.slice(0, 50) });
});
