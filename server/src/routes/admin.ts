import { Router } from "express";
import { authMiddleware, requireRole } from "../lib/auth.js";
import { genId, getDb, mutate } from "../lib/store.js";
import { SEGMENTS } from "../lib/segments.js";

export const adminRouter = Router();
adminRouter.use(authMiddleware);

// Segmentové definice (čte i obchodník — formuláře)
adminRouter.get("/segments", (_req, res) => {
  res.json({ segments: SEGMENTS });
});

// --- Číselníky (§9.3) ---
adminRouter.get("/codebooks", (_req, res) => {
  res.json({ codebooks: getDb().codebooks });
});

adminRouter.post("/codebooks/:key", requireRole("admin"), (req, res) => {
  const key = req.params.key;
  const label = String(req.body?.label ?? "").trim();
  if (!label) {
    res.status(400).json({ error: "Zadej název položky." });
    return;
  }
  const item = { id: genId("cb_"), label, active: true };
  mutate((d) => {
    if (!d.codebooks[key]) d.codebooks[key] = [];
    d.codebooks[key].push(item);
  });
  res.status(201).json({ item });
});

adminRouter.put("/codebooks/:key/:id", requireRole("admin"), (req, res) => {
  const { key, id } = req.params;
  mutate((d) => {
    const item = d.codebooks[key]?.find((i) => i.id === id);
    if (item) {
      if (typeof req.body?.label === "string") item.label = req.body.label;
      if (typeof req.body?.active === "boolean") item.active = req.body.active;
    }
  });
  res.json({ ok: true });
});

adminRouter.delete("/codebooks/:key/:id", requireRole("admin"), (req, res) => {
  const { key, id } = req.params;
  // Soft delete (deaktivace) — historická data v kartách zůstávají platná.
  mutate((d) => {
    const item = d.codebooks[key]?.find((i) => i.id === id);
    if (item) item.active = false;
  });
  res.json({ ok: true });
});

// --- Mapování polí na Raynet (§7.7, §11.4) ---
adminRouter.get("/mappings", (_req, res) => {
  res.json({ mappings: getDb().mappings });
});

adminRouter.put("/mappings", requireRole("admin"), (req, res) => {
  const incoming = Array.isArray(req.body?.mappings) ? req.body.mappings : [];
  mutate((d) => {
    for (const m of incoming) {
      const target = d.mappings.find(
        (x) => x.segment === m.segment && x.internalField === m.internalField,
      );
      if (target) {
        if (typeof m.raynetField === "string") target.raynetField = m.raynetField;
        if (typeof m.raynetLabel === "string") target.raynetLabel = m.raynetLabel;
        if (typeof m.enabled === "boolean") target.enabled = m.enabled;
      }
    }
  });
  res.json({ mappings: getDb().mappings });
});

// --- Systémová nastavení (§9.3) ---
adminRouter.get("/settings", (_req, res) => {
  res.json({ settings: getDb().settings });
});

adminRouter.put("/settings", requireRole("admin"), (req, res) => {
  const s = req.body?.settings ?? {};
  mutate((d) => {
    if (Number.isFinite(s.stalenessDays)) d.settings.stalenessDays = Math.max(1, Math.round(s.stalenessDays));
    if (Number.isFinite(s.toleranceMeters)) d.settings.toleranceMeters = Math.max(10, Math.round(s.toleranceMeters));
    if (s.gpsSource === "logbookie" || s.gpsSource === "prohlizec") d.settings.gpsSource = s.gpsSource;
    if (Number.isFinite(s.maxAttachmentMB)) d.settings.maxAttachmentMB = Math.max(1, Math.round(s.maxAttachmentMB));
    if (Array.isArray(s.qualityTokens)) d.settings.qualityTokens = s.qualityTokens.map((t: unknown) => String(t));
    if (Number.isFinite(s.qualityMinLength)) d.settings.qualityMinLength = Math.max(1, Math.round(s.qualityMinLength));
  });
  res.json({ settings: getDb().settings });
});

// Seznam uživatelů (role mapování) — admin
adminRouter.get("/users", requireRole("admin"), (_req, res) => {
  const users = getDb().users.map((u) => ({
    id: u.id, username: u.username, name: u.name, role: u.role, raynetUserId: u.raynetUserId, vehicleId: u.vehicleId,
  }));
  res.json({ users });
});
