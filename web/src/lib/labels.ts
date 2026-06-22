// Lidsky čitelné popisky pro stavové enumy + formátování (Intl).

import type { AcquisitionMethod, GpsStatus, Role, SegmentKey } from "./types";

export const SEGMENT_LABEL: Record<SegmentKey, string> = {
  vodarny: "Vodárny, obce, teplárny",
  spravce: "Správce",
  svj: "SVJ",
};

export const CODEBOOK_LABEL: Record<string, string> = {
  znacky_meridel: "Značky měřidel",
  stavebni_delky: "Stavební délky",
  zkusebny: "Zkušebny",
  software: "Informační software",
  dodavatele_vymen: "Dodavatelé výměn",
  system_rozuctovani: "Systémy rozúčtování",
  technologie_odectu: "Technologie dálkového odečtu",
};

export const ROLE_LABEL: Record<Role, string> = {
  obchodnik: "Obchodník",
  reditel: "Obchodní ředitel",
  admin: "Admin",
};

export const ACQUISITION_LABEL: Record<AcquisitionMethod, string> = {
  osobni_navsteva: "Osobní návštěva",
  telefonat: "Telefonát",
  email: "E-mail",
  interni_doplneni: "Interní doplnění",
  jiny: "Jiný způsob",
};

export const GPS_LABEL: Record<GpsStatus, string> = {
  overeno_v_miste: "Ověřeno v místě",
  overeno_v_toleranci: "Ověřeno v toleranci",
  mimo_misto: "Mimo místo",
  neovereno: "Neověřeno",
  gps_nedostupna: "GPS nedostupná",
  doplneno_vzdalene: "Doplněno vzdáleně",
};

/** „Nálada" GPS statusu pro barevné odlišení (token-based v komponentě). */
export type Tone = "ok" | "warn" | "bad" | "neutral";
export const GPS_TONE: Record<GpsStatus, Tone> = {
  overeno_v_miste: "ok",
  overeno_v_toleranci: "ok",
  mimo_misto: "bad",
  neovereno: "warn",
  gps_nedostupna: "warn",
  doplneno_vzdalene: "neutral",
};

const dateFmt = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
const numberFmt = new Intl.NumberFormat("cs-CZ");
const currencyFmt = new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 });

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateTimeFmt.format(d);
}
export function formatNumber(n: number): string {
  return numberFmt.format(n);
}
export function formatCurrency(n: number): string {
  return currencyFmt.format(n);
}
export function relativeDays(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}
