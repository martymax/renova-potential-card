// Demo karty pro bohatší první spuštění (dashboard, reporting, grafy).
// Spustí se jen tehdy, když v úložišti zatím žádné karty nejsou.

import { genId, getDb } from "./store.js";
import { getSegment } from "./segments.js";
import { recompute } from "./cards.js";
import { raynetGetCompany, raynetWriteback } from "./raynet.js";
import { remoteResult, verifyViaLogbookie } from "./gps.js";
import type { AcquisitionMethod, Card, SegmentKey } from "../types.js";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

interface DemoSpec {
  companyId: number;
  segment: SegmentKey;
  repUsername: string;
  status: "draft" | "complete";
  acquisition: AcquisitionMethod;
  updatedDaysAgo: number;
  values: Record<string, unknown>;
  sync?: boolean;
}

const SPECS: DemoSpec[] = [
  {
    companyId: 1001, segment: "vodarny", repUsername: "obchodnik", status: "complete",
    acquisition: "osobni_navsteva", updatedDaysAgo: 4, sync: true,
    values: {
      typ_zakaznika: "vodarna", pocet_odbernych_mist: 18400,
      meridla_pouzivana: "Sensus, Itron vodoměry DN15–DN40",
      zkusebna: "ČMI – Český metrologický institut",
      spokojenost_dodavatele: "2", cena_dodavatele: "nadprůměrná, smlouva do 2027",
      co_je_trapi: "Vysoká poruchovost odečtů a ruční sběr dat z odlehlých míst.",
      informacni_software: "Helios", zajem_dalkove_odecty: "vysoky",
      termin_tendru: inDays(55), specifikace_tendru: "Dodávka vodoměrů s dálkovým odečtem na 4 roky.",
      bytovy_sektor: "Možná spolupráce přes městské bytové domy.",
    },
  },
  {
    companyId: 1002, segment: "vodarny", repUsername: "novak", status: "draft",
    acquisition: "telefonat", updatedDaysAgo: 12,
    values: {
      typ_zakaznika: "obec", pocet_odbernych_mist: 2100,
      meridla_pouzivana: "starší mechanické vodoměry",
      zajem_dalkove_odecty: "stredni", termin_tendru: inDays(160),
      co_je_trapi: "x",
    },
  },
  {
    companyId: 1003, segment: "vodarny", repUsername: "obchodnik", status: "complete",
    acquisition: "osobni_navsteva", updatedDaysAgo: 30, sync: true,
    values: {
      typ_zakaznika: "teplarna", pocet_odbernych_mist: 5600,
      meridla_pouzivana: "měřiče tepla Kamstrup",
      zkusebna: "Zkušebna Brno (AMS)", spokojenost_dodavatele: "4",
      co_je_trapi: "Potřebují konsolidovat datové toky z více systémů.",
      informacni_software: "Microsoft Dynamics", zajem_dalkove_odecty: "stredni",
      termin_tendru: inDays(300),
    },
  },
  {
    companyId: 2001, segment: "spravce", repUsername: "novak", status: "complete",
    acquisition: "osobni_navsteva", updatedDaysAgo: 8, sync: true,
    values: {
      pocet_spravovanych_bytu: 9800,
      spolecnosti_vymeny: ["ista Česká republika", "Techem"],
      vyhody_nevyhody: "Rychlý servis, ale vyšší cena výměny.",
      prumerna_cena_vymeny: 850,
      podminky_zarazeni: "Doložení referencí a fixace ceny na 3 roky.",
      system_rozuctovani: "ista", zvyhodneni_nabidek: "Množstevní sleva nad 5000 bytů.",
    },
  },
  {
    companyId: 2002, segment: "spravce", repUsername: "obchodnik", status: "draft",
    acquisition: "email", updatedDaysAgo: 18,
    values: {
      pocet_spravovanych_bytu: 3400,
      spolecnosti_vymeny: ["Maddeo"],
      podminky_zarazeni: "nevím",
      system_rozuctovani: "Techem",
    },
  },
  {
    companyId: 3002, segment: "svj", repUsername: "novak", status: "draft",
    acquisition: "osobni_navsteva", updatedDaysAgo: 2,
    values: {
      pocet_bytu: 48, pocet_meridel: 192,
      skladba_meridel: "vodoměry SV/TV + indikátory topných nákladů",
      stavebni_delky: "110 mm, ojediněle 130 mm",
      foto_meridel: { url: "", name: "meridla_brno.jpg", size: 0 },
      technologie_odectu: "Fixní síť wM-Bus",
      specifika_instalace: "Kolísání tlaku v horních patrech, starší ventily.",
      kolisani_vody: "obcasne", funkcnost_ventilu: "castecne",
    },
  },
  {
    companyId: 3003, segment: "svj", repUsername: "obchodnik", status: "complete",
    acquisition: "osobni_navsteva", updatedDaysAgo: 205, sync: true,
    values: {
      pocet_bytu: 36, pocet_meridel: 144,
      skladba_meridel: "vodoměry SV a TV",
      stavebni_delky: "80 mm a 110 mm", znacka_meridel: "Apator",
      technologie_odectu: "Walk-by / drive-by (rádio)",
      specifika_instalace: "Stáří rozvodů přes 25 let, doporučena výměna stoupaček.",
      posledni_dodavatel: "ista", stari_rozvodu: "26",
    },
  },
];

export function seedDemoCards(): void {
  const db = getDb();
  if (db.cards.length > 0) return;

  for (const spec of SPECS) {
    const company = raynetGetCompany(spec.companyId);
    const seg = getSegment(spec.segment);
    const rep = db.users.find((u) => u.username === spec.repUsername);
    if (!company || !seg || !rep) continue;

    const updatedAt = daysAgo(spec.updatedDaysAgo);
    const createdAt = daysAgo(spec.updatedDaysAgo + 1);
    const gps =
      spec.acquisition === "osobni_navsteva"
        ? verifyViaLogbookie(company, rep.vehicleId, db.settings.toleranceMeters)
        : remoteResult();

    const card: Card = {
      id: genId("card_"),
      raynetCompanyId: company.id,
      companyName: company.name,
      segment: seg.key,
      status: spec.status,
      values: spec.values,
      completeness: 0,
      missingRequired: [],
      qualityFlags: [],
      acquisition: spec.acquisition,
      gps,
      createdAt,
      createdBy: rep.id,
      createdByName: rep.name,
      updatedAt,
      updatedBy: rep.id,
      updatedByName: rep.name,
      syncedAt: spec.sync ? updatedAt : null,
      syncResult: spec.sync ? "Synchronizováno do Raynetu." : null,
    };
    recompute(card, db.settings);
    db.cards.push(card);

    db.audit.push({
      id: genId("a_"), cardId: card.id, at: createdAt, userId: rep.id, userName: rep.name,
      action: "create", fieldLabel: "Karta založena", newValue: seg.label,
    });
    db.audit.push({
      id: genId("a_"), cardId: card.id, at: updatedAt, userId: rep.id, userName: rep.name,
      action: spec.status === "complete" ? "save_complete" : "save_draft",
      fieldLabel: spec.status === "complete" ? "Uložena kompletní karta" : "Uložen draft",
      newValue: `${spec.acquisition} · GPS: ${gps.status}`,
    });

    if (spec.sync) {
      try { raynetWriteback(company.id, company.name, card.id, {}); } catch { /* ignore */ }
    }
  }
}
