// Ověření osobní návštěvy přes GPS (§7.5, §12).
// Preferovaný zdroj: Logbookie (mock). Fallback: poloha zařízení z prohlížeče.
// Ukládá se jen výsledek ověření — ne detailní trasa.

import type { GpsResult, GpsStatus } from "../types.js";
import type { MockCompany } from "./raynet.js";

/** Vzdálenost dvou bodů v metrech (haversine). */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

function statusFromDistance(distanceM: number, toleranceM: number): GpsStatus {
  if (distanceM <= toleranceM * 0.2) return "overeno_v_miste";
  if (distanceM <= toleranceM) return "overeno_v_toleranci";
  return "mimo_misto";
}

/**
 * Mock Logbookie: deterministicky podle ID firmy odvodí polohu vozidla
 * blízko / daleko od zákazníka, aby šly demonstrovat všechny stavy.
 */
export function verifyViaLogbookie(
  company: MockCompany,
  vehicleId: string | undefined,
  toleranceM: number,
): GpsResult {
  const now = new Date().toISOString();
  if (!company.lat || !company.lng) {
    return { status: "gps_nedostupna", source: "logbookie", distanceM: null, verifiedAt: now,
      error: "Zákazník nemá v Raynetu geokódovanou adresu." };
  }
  if (!vehicleId) {
    return { status: "neovereno", source: "logbookie", distanceM: null, verifiedAt: now,
      error: "Obchodník nemá přiřazené služební vozidlo." };
  }

  // Deterministický „offset" vozidla podle ID firmy (stabilní napříč běhy).
  const seed = company.id % 5;
  const offsets = [40, 180, 430, 900, 3200]; // metry od adresy
  const offsetM = offsets[seed];
  const distanceM = offsetM;

  return {
    status: statusFromDistance(distanceM, toleranceM),
    source: "logbookie",
    distanceM,
    verifiedAt: now,
  };
}

/** Fallback: jednorázová poloha z prohlížeče (uživatel ji musí povolit). */
export function verifyViaBrowser(
  company: MockCompany,
  device: { lat: number; lng: number } | null,
  toleranceM: number,
): GpsResult {
  const now = new Date().toISOString();
  if (!device) {
    return { status: "gps_nedostupna", source: "prohlizec", distanceM: null, verifiedAt: now,
      error: "Poloha zařízení nebyla povolena nebo není dostupná." };
  }
  if (!company.lat || !company.lng) {
    return { status: "gps_nedostupna", source: "prohlizec", distanceM: null, verifiedAt: now,
      error: "Zákazník nemá v Raynetu geokódovanou adresu." };
  }
  const distanceM = distanceMeters(device, { lat: company.lat, lng: company.lng });
  return {
    status: statusFromDistance(distanceM, toleranceM),
    source: "prohlizec",
    distanceM,
    verifiedAt: now,
  };
}

/** Karta doplněná vzdáleně (telefon, e-mail, interní). */
export function remoteResult(): GpsResult {
  return { status: "doplneno_vzdalene", source: "zadny", distanceM: null, verifiedAt: new Date().toISOString() };
}
