// Mock Raynet adaptér (§11).
// V produkci tato vrstva volá Raynet REST API s API klíčem drženým na serveru.
// Frontend se na Raynet NIKDY nedívá přímo — jde přes tento backend.

import { getDb, genId } from "./store.js";
import type { RaynetWriteback } from "../types.js";

export interface MockCompany {
  id: number; // raynetCompanyId
  name: string;
  ico: string;
  address: string;
  city: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  /** Segment dohledatelný z Raynetu (může chybět → ruční výběr). */
  segmentHint?: string;
  /** Volitelná pole firmy v Raynetu (předvyplnění). */
  optionalFields: Record<string, unknown>;
  lat?: number;
  lng?: number;
}

// Stálá mock databáze firem (Raynet je zdroj zákazníků).
const COMPANIES: MockCompany[] = [
  {
    id: 1001, name: "Vodárny Kladno – Mělník, a.s.", ico: "46356991",
    address: "U Vodojemu 3085", city: "Kladno",
    contactName: "Ing. Petr Dvořák", contactEmail: "dvorak@vkm.cz", contactPhone: "+420 312 812 111",
    segmentHint: "vodarny",
    optionalFields: { pocet_odbernych_mist: 18400 },
    lat: 50.1477, lng: 14.1027,
  },
  {
    id: 1002, name: "Město Říčany", ico: "00240702",
    address: "Masarykovo nám. 53", city: "Říčany",
    contactName: "Bc. Jana Nováková", contactEmail: "podatelna@ricany.cz", contactPhone: "+420 323 618 111",
    segmentHint: "vodarny",
    optionalFields: { pocet_odbernych_mist: 2100 },
    lat: 49.9921, lng: 14.6536,
  },
  {
    id: 1003, name: "Teplárna Strakonice, a.s.", ico: "60826843",
    address: "Komenského 59", city: "Strakonice",
    contactName: "Ing. Martin Hájek", contactEmail: "info@tst.cz", contactPhone: "+420 383 318 211",
    segmentHint: "vodarny",
    optionalFields: { pocet_odbernych_mist: 5600 },
    lat: 49.2616, lng: 13.9023,
  },
  {
    id: 2001, name: "SBD Pokrok, stavební bytové družstvo", ico: "00033448",
    address: "Kollárova 157/18", city: "Praha 8",
    contactName: "Ing. Eva Marková", contactEmail: "info@pokrok.cz", contactPhone: "+420 234 711 111",
    segmentHint: "spravce",
    optionalFields: {},
    lat: 50.0995, lng: 14.4621,
  },
  {
    id: 2002, name: "Správa nemovitostí Hradec Králové, s.r.o.", ico: "64829799",
    address: "Kydlinovská 1521", city: "Hradec Králové",
    contactName: "Mgr. Tomáš Kučera", contactEmail: "spravce@snhk.cz", contactPhone: "+420 495 774 111",
    segmentHint: "spravce",
    optionalFields: {},
    lat: 50.2300, lng: 15.8322,
  },
  {
    id: 3001, name: "SVJ Bělohorská 142, Praha 6", ico: "27082341",
    address: "Bělohorská 142", city: "Praha 6",
    contactName: "Předseda Jan Svoboda", contactEmail: "svj.belohorska@email.cz", contactPhone: "+420 602 111 222",
    segmentHint: "svj",
    optionalFields: {},
    lat: 50.0833, lng: 14.3667,
  },
  {
    id: 3002, name: "SVJ Brno, Lesná – Halasovo náměstí 7", ico: "29213470",
    address: "Halasovo náměstí 7", city: "Brno",
    contactName: "Předsedkyně Lenka Horáková", contactEmail: "vybor@svj-lesna.cz", contactPhone: "+420 603 222 333",
    segmentHint: "svj",
    optionalFields: {},
    lat: 49.2287, lng: 16.6100,
  },
  {
    id: 3003, name: "Bytové družstvo Olomouc – Nové Sady", ico: "47683074",
    address: "Schweitzerova 88", city: "Olomouc",
    contactName: "Ing. Pavel Říha", contactEmail: "bd.novesady@seznam.cz", contactPhone: "+420 585 333 444",
    segmentHint: "svj",
    optionalFields: {},
    lat: 49.5733, lng: 17.2509,
  },
];

let connected = true; // admin může simulovat výpadek

export function raynetSetConnected(v: boolean): void {
  connected = v;
}
export function raynetPing(): { ok: boolean; instance: string; checkedAt: string } {
  return { ok: connected, instance: "renova.raynet.cz", checkedAt: new Date().toISOString() };
}

export function raynetSearch(q: string): MockCompany[] {
  if (!connected) throw new Error("Raynet je dočasně nedostupný.");
  const needle = q.trim().toLowerCase();
  if (!needle) return COMPANIES.slice(0, 8);
  return COMPANIES.filter(
    (c) => c.name.toLowerCase().includes(needle) || c.ico.includes(needle) || c.city.toLowerCase().includes(needle),
  );
}

export function raynetGetCompany(id: number): MockCompany | undefined {
  return COMPANIES.find((c) => c.id === id);
}

export function raynetAllCompanies(): MockCompany[] {
  return COMPANIES;
}

/**
 * Write-back vybraných polí. Lokální uložení má prioritu (§7.7) — pokud je
 * Raynet nedostupný, zápis selže, ale karta v aplikaci zůstává uložená.
 */
export function raynetWriteback(
  companyId: number,
  companyName: string,
  cardId: string,
  fields: Record<string, unknown>,
): RaynetWriteback {
  const entry: RaynetWriteback = {
    id: genId("wb_"),
    at: new Date().toISOString(),
    companyId,
    companyName,
    cardId,
    fields,
    ok: connected,
  };
  const db = getDb();
  db.writeback.unshift(entry);
  if (!connected) {
    throw Object.assign(new Error("Raynet je dočasně nedostupný — synchronizaci zopakuj později."), { writeback: entry });
  }
  return entry;
}
