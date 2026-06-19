import { Router } from "express";
import { authMiddleware, type AuthedRequest } from "../lib/auth.js";
import { genId, getDb, mutate } from "../lib/store.js";
import { getSegment } from "../lib/segments.js";
import { raynetGetCompany, raynetWriteback } from "../lib/raynet.js";
import { remoteResult, verifyViaBrowser, verifyViaLogbookie } from "../lib/gps.js";
import { diffAudit, hardErrors, recompute, selectWriteback } from "../lib/cards.js";
import type { AcquisitionMethod, Card, GpsResult, User } from "../types.js";

export const cardsRouter = Router();
cardsRouter.use(authMiddleware);

/** Smí daný uživatel kartu vidět/upravovat? Obchodník jen vlastní karty. */
function canAccessCard(user: User, card: Card): boolean {
  if (user.role === "obchodnik") {
    return card.createdBy === user.id || card.updatedBy === user.id;
  }
  return true;
}

function visibleCards(req: AuthedRequest): Card[] {
  return getDb().cards.filter((c) => canAccessCard(req.user!, c));
}

function isStale(card: Card): boolean {
  const days = getDb().settings.stalenessDays;
  const ageDays = (Date.now() - new Date(card.updatedAt).getTime()) / 86_400_000;
  return ageDays > days;
}

// Seznam karet s filtry (§9, §10)
cardsRouter.get("/", (req: AuthedRequest, res) => {
  const { companyId, segment, status, stale, quality, gps, mine } = req.query;
  let cards = visibleCards(req);

  if (companyId) cards = cards.filter((c) => c.raynetCompanyId === Number(companyId));
  if (segment) cards = cards.filter((c) => c.segment === segment);
  if (status) cards = cards.filter((c) => c.status === status);
  if (mine === "1") cards = cards.filter((c) => c.createdBy === req.user!.id);
  if (stale === "1") cards = cards.filter(isStale);
  if (quality === "1") cards = cards.filter((c) => c.qualityFlags.length > 0);
  if (gps) cards = cards.filter((c) => c.gps?.status === gps);

  cards = [...cards].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  res.json({
    cards: cards.map((c) => ({ ...c, stale: isStale(c) })),
  });
});

// Detail karty + audit
cardsRouter.get("/:id", (req: AuthedRequest, res) => {
  const card = visibleCards(req).find((c) => c.id === req.params.id);
  if (!card) {
    res.status(404).json({ error: "Karta nebyla nalezena." });
    return;
  }
  const audit = getDb().audit.filter((a) => a.cardId === card.id).sort((a, b) => b.at.localeCompare(a.at));
  res.json({ card: { ...card, stale: isStale(card) }, audit });
});

// Založení / otevření karty pro firmu + segment (§7.1, §7.2)
cardsRouter.post("/", (req: AuthedRequest, res) => {
  const { raynetCompanyId, segment } = req.body ?? {};
  const company = raynetGetCompany(Number(raynetCompanyId));
  const segDef = getSegment(String(segment));
  if (!company) {
    res.status(400).json({ error: "Firma musí nejdřív existovat v Raynetu." });
    return;
  }
  if (!segDef) {
    res.status(400).json({ error: "Neznámý segment." });
    return;
  }

  const db = getDb();
  const existing = db.cards.find((c) => c.raynetCompanyId === company.id && c.segment === segDef.key);
  if (existing) {
    res.json({ card: existing, created: false });
    return;
  }

  // Předvyplnění z volitelných polí Raynetu (§7.3)
  const values: Record<string, unknown> = {};
  for (const f of segDef.fields) {
    if (f.prefillFromRaynet && company.optionalFields[f.prefillFromRaynet] !== undefined) {
      values[f.key] = company.optionalFields[f.prefillFromRaynet];
    }
  }

  const now = new Date().toISOString();
  const card: Card = {
    id: genId("card_"),
    raynetCompanyId: company.id,
    companyName: company.name,
    segment: segDef.key,
    status: "draft",
    values,
    completeness: 0,
    missingRequired: [],
    qualityFlags: [],
    acquisition: null,
    gps: null,
    createdAt: now,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    updatedAt: now,
    updatedBy: req.user!.id,
    updatedByName: req.user!.name,
    syncedAt: null,
    syncResult: null,
  };
  recompute(card, db.settings);

  mutate((d) => {
    d.cards.push(card);
    d.audit.push({
      id: genId("a_"), cardId: card.id, at: now, userId: req.user!.id, userName: req.user!.name,
      action: "create", fieldLabel: "Karta založena", newValue: segDef.label,
    });
  });
  res.status(201).json({ card, created: true });
});

function computeGps(
  card: Card,
  acquisition: AcquisitionMethod,
  device: { lat: number; lng: number } | null,
  userVehicleId: string | undefined,
): GpsResult {
  const db = getDb();
  const company = raynetGetCompany(card.raynetCompanyId)!;
  const tol = db.settings.toleranceMeters;
  if (acquisition !== "osobni_navsteva") return remoteResult();

  if (db.settings.gpsSource === "prohlizec") {
    return verifyViaBrowser(company, device, tol);
  }
  // Preferovaně Logbookie; fallback na prohlížeč, pokud vozidlo/GPS chybí.
  const viaVehicle = verifyViaLogbookie(company, userVehicleId, tol);
  if ((viaVehicle.status === "neovereno" || viaVehicle.status === "gps_nedostupna") && device) {
    return verifyViaBrowser(company, device, tol);
  }
  return viaVehicle;
}

// Uložení draftu / kompletní karty (§7.4, §7.5, §7.6)
cardsRouter.put("/:id", (req: AuthedRequest, res) => {
  const db = getDb();
  const card = db.cards.find((c) => c.id === req.params.id);
  if (!card || !canAccessCard(req.user!, card)) {
    res.status(404).json({ error: "Karta nebyla nalezena." });
    return;
  }
  if (req.user!.role === "reditel") {
    res.status(403).json({ error: "Obchodní ředitel karty needituje, jen prohlíží a reportuje." });
    return;
  }

  const { values, mode, acquisition, deviceLocation } = req.body ?? {};
  const newValues: Record<string, unknown> = { ...card.values, ...(values ?? {}) };
  const oldValues = card.values;

  // Příprava kandidátní karty
  const candidate: Card = { ...card, values: newValues };
  recompute(candidate, db.settings);

  // Tvrdá validace při kompletní kartě (§7.6)
  if (mode === "complete") {
    const errors = hardErrors(candidate);
    if (errors.missingRequired.length > 0 || errors.typeErrors.length > 0) {
      res.status(422).json({
        error: "Kompletní kartu nelze uložit — chybí povinná pole nebo jsou neplatné hodnoty.",
        missingRequired: errors.missingRequired,
        typeErrors: errors.typeErrors,
      });
      return;
    }
  }

  const method: AcquisitionMethod = acquisition ?? card.acquisition ?? "interni_doplneni";
  const gps = computeGps(candidate, method, deviceLocation ?? null, req.user!.vehicleId);

  const now = new Date().toISOString();
  const auditEntries = diffAudit(card.id, req.user!.id, req.user!.name, card.segment, oldValues, newValues);

  mutate((d) => {
    const target = d.cards.find((c) => c.id === card.id)!;
    target.values = newValues;
    target.status = mode === "complete" ? "complete" : "draft";
    target.acquisition = method;
    target.gps = gps;
    target.updatedAt = now;
    target.updatedBy = req.user!.id;
    target.updatedByName = req.user!.name;
    recompute(target, d.settings);

    d.audit.push(...auditEntries);
    d.audit.push({
      id: genId("a_"), cardId: card.id, at: now, userId: req.user!.id, userName: req.user!.name,
      action: mode === "complete" ? "save_complete" : "save_draft",
      fieldLabel: mode === "complete" ? "Uložena kompletní karta" : "Uložen draft",
      newValue: `${method} · GPS: ${gps.status}`,
    });
  });

  const saved = db.cards.find((c) => c.id === card.id)!;
  res.json({ card: { ...saved, stale: false } });
});

// Synchronizace vybraných polí do Raynetu (§7.7, §11.4)
cardsRouter.post("/:id/sync", (req: AuthedRequest, res) => {
  const db = getDb();
  const card = db.cards.find((c) => c.id === req.params.id);
  if (!card || !canAccessCard(req.user!, card)) {
    res.status(404).json({ error: "Karta nebyla nalezena." });
    return;
  }
  const company = raynetGetCompany(card.raynetCompanyId)!;
  const fields = selectWriteback(card, db.mappings);

  try {
    const entry = raynetWriteback(company.id, company.name, card.id, fields);
    const now = new Date().toISOString();
    mutate((d) => {
      const target = d.cards.find((c) => c.id === card.id)!;
      target.syncedAt = now;
      target.syncResult = `Zapsáno ${Object.keys(fields).length} polí do Raynetu.`;
      d.audit.push({
        id: genId("a_"), cardId: card.id, at: now, userId: req.user!.id, userName: req.user!.name,
        action: "sync", fieldLabel: "Synchronizace do Raynetu", newValue: `${Object.keys(fields).length} polí`,
      });
    });
    res.json({ ok: true, writeback: entry, fields });
  } catch (e) {
    // Lokální uložení má prioritu — chyba Raynetu neblokuje data (§7.7)
    const now = new Date().toISOString();
    mutate((d) => {
      const target = d.cards.find((c) => c.id === card.id)!;
      target.syncResult = `Synchronizace selhala: ${(e as Error).message}`;
      void now;
    });
    res.status(502).json({ ok: false, error: (e as Error).message, fields });
  }
});
