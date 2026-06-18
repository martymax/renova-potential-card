// Počáteční data: uživatelé (synchronizovaní z Raynetu), číselníky,
// mapování polí na Raynet a systémová nastavení.

import { genId } from "./store.js";
import { SEGMENTS } from "./segments.js";
import type { CodebookItem, DbShape, FieldMapping } from "../types.js";

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
    { id: genId("u_"), username: "obchodnik", password: "obchodnik", name: "Karel Obchodník", role: "obchodnik" as const, raynetUserId: 501, vehicleId: "1AB-2345" },
    { id: genId("u_"), username: "novak", password: "novak", name: "Jiří Novák", role: "obchodnik" as const, raynetUserId: 502, vehicleId: "2CD-6789" },
    { id: genId("u_"), username: "reditel", password: "reditel", name: "Petra Ředitelová", role: "reditel" as const, raynetUserId: 401 },
    { id: genId("u_"), username: "admin", password: "admin", name: "Admin Simon Says", role: "admin" as const, raynetUserId: 301 },
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
