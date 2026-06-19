// Počáteční data: uživatelé (synchronizovaní z Raynetu), číselníky,
// mapování polí na Raynet a systémová nastavení.

import { randomBytes } from "node:crypto";
import { genId } from "./store.js";
import { hashPassword } from "./password.js";
import { SEGMENTS } from "./segments.js";
import type { CodebookItem, DbShape, FieldMapping } from "../types.js";

/**
 * Heslo uživatele: 1) z env (KP_PASSWORD_<JMENO>), 2) demo (= jméno) jen mimo
 * produkci nebo když je KP_DEMO_MODE=true, 3) jinak náhodné a jednou vypsané do
 * logu. V produkci tedy nikdy nevznikne výchozí účet admin/admin.
 */
function resolvePassword(username: string): string {
  const envKey = `KP_PASSWORD_${username.toUpperCase()}`;
  const fromEnv = process.env[envKey];
  if (fromEnv) return fromEnv;

  const demoAllowed = process.env.NODE_ENV !== "production" || process.env.KP_DEMO_MODE === "true";
  if (demoAllowed) return username;

  const generated = randomBytes(9).toString("base64url");
  console.warn(`[seed] ${envKey} není nastaveno — vygenerováno dočasné heslo pro „${username}": ${generated}`);
  return generated;
}

function items(labels: string[]): CodebookItem[] {
  return labels.map((label) => ({ id: genId("cb_"), label, active: true }));
}

export function seed(): DbShape {
  const codebooks: Record<string, CodebookItem[]> = {
    zkusebny: items([
      "ČMI – Český metrologický institut",
      "Zkušebna Brno (AMS)",
      "Zkušebna Praha-Letňany",
      "Autorizované metrologické středisko K-12",
    ]),
    software: items([
      "Helios",
      "ABRA",
      "Microsoft Dynamics",
      "Vlastní řešení",
      "Žádný / tabulky",
    ]),
    dodavatele_vymen: items([
      "ista Česká republika",
      "Techem",
      "Maddeo",
      "Enbra",
      "Apator Metra",
    ]),
    system_rozuctovani: items([
      "ista",
      "Techem",
      "ENBRA WebService",
      "Domovní rozúčtování s.r.o.",
      "Vlastní",
    ]),
    technologie_odectu: items([
      "Walk-by / drive-by (rádio)",
      "Fixní síť LoRaWAN",
      "Fixní síť wM-Bus",
      "NB-IoT",
      "Mechanická (bez dálkového odečtu)",
    ]),
  };

  // Mapování skórovaných a reportovatelných polí na volitelná pole Raynetu.
  const mappings: FieldMapping[] = [];
  for (const seg of SEGMENTS) {
    for (const f of seg.fields) {
      if (f.scored || f.reportable) {
        mappings.push({
          segment: seg.key,
          internalField: f.key,
          internalLabel: f.label,
          raynetField: `cf_${seg.key}_${f.key}`,
          raynetLabel: f.label,
          type: f.type,
          scored: !!f.scored,
          enabled: !!f.scored, // ve výchozím stavu zapnutá jen skórovaná pole
        });
      }
    }
  }

  const users = [
    { id: genId("u_"), username: "obchodnik", passwordHash: hashPassword(resolvePassword("obchodnik")), name: "Karel Obchodník", role: "obchodnik" as const, raynetUserId: 501, vehicleId: "1AB-2345" },
    { id: genId("u_"), username: "novak", passwordHash: hashPassword(resolvePassword("novak")), name: "Jiří Novák", role: "obchodnik" as const, raynetUserId: 502, vehicleId: "2CD-6789" },
    { id: genId("u_"), username: "reditel", passwordHash: hashPassword(resolvePassword("reditel")), name: "Petra Ředitelová", role: "reditel" as const, raynetUserId: 401 },
    { id: genId("u_"), username: "admin", passwordHash: hashPassword(resolvePassword("admin")), name: "Admin Simon Says", role: "admin" as const, raynetUserId: 301 },
  ];

  return {
    users,
    cards: [],
    audit: [],
    codebooks,
    mappings,
    settings: {
      stalenessDays: 180,
      toleranceMeters: 500,
      gpsSource: "logbookie",
      maxAttachmentMB: 8,
      qualityTokens: ["x", "xx", "xxx", "-", "--", "nevím", "nevim", "doplnit", "test", "tbd", "?", "n/a", "na"],
      qualityMinLength: 4,
    },
    writeback: [],
  };
}
