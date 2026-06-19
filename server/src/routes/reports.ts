import { Router } from "express";
import { authMiddleware, requireRole } from "../lib/auth.js";
import { getDb } from "../lib/store.js";
import { SEGMENTS, getSegment } from "../lib/segments.js";
import type { Card } from "../types.js";

export const reportsRouter = Router();
reportsRouter.use(authMiddleware, requireRole("reditel", "admin"));

function isStale(card: Card): boolean {
  const days = getDb().settings.stalenessDays;
  return (Date.now() - new Date(card.updatedAt).getTime()) / 86_400_000 > days;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const SEGMENT_LABEL: Record<string, string> = Object.fromEntries(SEGMENTS.map((s) => [s.key, s.label]));

// Souhrnný report (§10.1, §10.3, §10.4)
reportsRouter.get("/overview", (_req, res) => {
  const db = getDb();
  const cards = db.cards;

  const bySegment = SEGMENTS.map((s) => {
    const seg = cards.filter((c) => c.segment === s.key);
    const complete = seg.filter((c) => c.status === "complete").length;
    const avg = seg.length ? Math.round(seg.reduce((a, c) => a + c.completeness, 0) / seg.length) : 0;
    return {
      segment: s.key,
      label: s.label,
      total: seg.length,
      complete,
      drafts: seg.length - complete,
      avgCompleteness: avg,
    };
  });

  const byRep = Object.values(
    cards.reduce<Record<string, { user: string; total: number; complete: number; avg: number; sum: number }>>((acc, c) => {
      const key = c.createdByName;
      acc[key] ??= { user: key, total: 0, complete: 0, avg: 0, sum: 0 };
      acc[key].total += 1;
      acc[key].sum += c.completeness;
      if (c.status === "complete") acc[key].complete += 1;
      return acc;
    }, {}),
  ).map((r) => ({ ...r, avg: r.total ? Math.round(r.sum / r.total) : 0 }));

  res.json({
    totals: {
      cards: cards.length,
      complete: cards.filter((c) => c.status === "complete").length,
      drafts: cards.filter((c) => c.status === "draft").length,
      stale: cards.filter(isStale).length,
      withQualityFlags: cards.filter((c) => c.qualityFlags.length > 0).length,
      qualityFlagCount: cards.reduce((a, c) => a + c.qualityFlags.length, 0),
    },
    bySegment,
    byRep,
    stalenessDays: db.settings.stalenessDays,
  });
});

// Blížící se tendry 3 / 6 / 12 měsíců (§10.6)
reportsRouter.get("/tenders", (_req, res) => {
  const now = Date.now();
  const horizon = (m: number) => now + m * 30 * 86_400_000;
  const rows = getDb().cards
    .filter((c) => c.segment === "vodarny" && c.values["termin_tendru"])
    .map((c) => {
      const date = new Date(String(c.values["termin_tendru"]));
      const t = date.getTime();
      let bucket: "3" | "6" | "12" | "later" | "past" = "later";
      if (t < now) bucket = "past";
      else if (t <= horizon(3)) bucket = "3";
      else if (t <= horizon(6)) bucket = "6";
      else if (t <= horizon(12)) bucket = "12";
      return {
        cardId: c.id,
        company: c.companyName,
        date: c.values["termin_tendru"],
        odbernaMista: num(c.values["pocet_odbernych_mist"]),
        bucket,
      };
    })
    .filter((r) => r.bucket !== "past" && r.bucket !== "later")
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  res.json({ tenders: rows });
});

// Terénní aktivita a GPS ověření (§10.2)
reportsRouter.get("/field-activity", (_req, res) => {
  const cards = getDb().cards;
  const byGps: Record<string, number> = {};
  const byMethod: Record<string, number> = {};
  for (const c of cards) {
    const g = c.gps?.status ?? "neovereno";
    byGps[g] = (byGps[g] ?? 0) + 1;
    const m = c.acquisition ?? "interni_doplneni";
    byMethod[m] = (byMethod[m] ?? 0) + 1;
  }
  const offsite = cards
    .filter((c) => c.gps?.status === "mimo_misto")
    .map((c) => ({ cardId: c.id, company: c.companyName, rep: c.updatedByName, distanceM: c.gps?.distanceM, at: c.gps?.verifiedAt }));
  res.json({ byGps, byMethod, offsite });
});

// Obchodní potenciál podle segmentu (§10.5)
reportsRouter.get("/potential", (_req, res) => {
  const cards = getDb().cards;
  const v = cards.filter((c) => c.segment === "vodarny");
  const s = cards.filter((c) => c.segment === "spravce");
  const j = cards.filter((c) => c.segment === "svj");
  res.json({
    vodarny: { karty: v.length, odbernaMista: v.reduce((a, c) => a + num(c.values["pocet_odbernych_mist"]), 0) },
    spravce: { karty: s.length, spravovaneByty: s.reduce((a, c) => a + num(c.values["pocet_spravovanych_bytu"]), 0) },
    svj: {
      karty: j.length,
      byty: j.reduce((a, c) => a + num(c.values["pocet_bytu"]), 0),
      meridla: j.reduce((a, c) => a + num(c.values["pocet_meridel"]), 0),
    },
  });
});

// CSV export (§13)
reportsRouter.get("/export.csv", (_req, res) => {
  const cards = getDb().cards;
  const header = ["Firma", "IČO_raynetId", "Segment", "Stav", "Dokončenost_%", "Obchodník", "Aktualizováno", "GPS_status", "Quality_flagy"];
  const lines = [header.join(";")];

  for (const c of cards) {
    const seg = getSegment(c.segment);
    const base = [
      c.companyName,
      String(c.raynetCompanyId),
      SEGMENT_LABEL[c.segment] ?? c.segment,
      c.status === "complete" ? "Kompletní" : "Draft",
      String(c.completeness),
      c.createdByName,
      c.updatedAt.slice(0, 10),
      c.gps?.status ?? "",
      String(c.qualityFlags.length),
    ];
    // Reportovatelná pole segmentu
    const reportable = (seg?.fields ?? []).filter((f) => f.reportable);
    for (const f of reportable) {
      const v = c.values[f.key];
      base.push(Array.isArray(v) ? v.join("|") : v == null ? "" : String(v));
    }
    lines.push(base.map(csvCell).join(";"));
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="karty-potencialu.csv"');
  res.send("﻿" + lines.join("\n")); // BOM kvůli Excelu a diakritice
});

function csvCell(v: string): string {
  // Ochrana proti CSV/formula injection: hodnoty začínající =,+,-,@ (a řídicími
  // znaky) by tabulkové editory vyhodnotily jako vzorec. Předřadíme apostrof.
  let s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  if (/[;"\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}
