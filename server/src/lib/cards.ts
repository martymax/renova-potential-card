// Odvozená logika karty: vyplněnost, quality flags, audit diff, výběr polí pro write-back.

import { getSegment } from "./segments.js";
import { completeness, qualityFlags, validateHard } from "./validation.js";
import type { AuditEntry, Card, CodebookItem, FieldMapping, SegmentDef, Settings } from "../types.js";
import { genId } from "./store.js";

/**
 * „Učení" tagů: hodnoty polí typu tags (learn) zadané obchodníkem se přidají do
 * číselníku jako varianty pro další použití (porovnatelnost), case-insensitive.
 */
export function learnTagValues(
  codebooks: Record<string, CodebookItem[]>,
  segment: SegmentDef,
  values: Record<string, unknown>,
): void {
  for (const f of segment.fields) {
    if (f.type !== "tags" || !f.learn || !f.codebook) continue;
    const v = values[f.key];
    if (!Array.isArray(v)) continue;
    const list = (codebooks[f.codebook] ??= []);
    for (const raw of v) {
      const label = String(raw).trim();
      if (label && !list.some((i) => i.label.toLowerCase() === label.toLowerCase())) {
        list.push({ id: genId("cb_"), label, active: true });
      }
    }
  }
}

/** Přepočítá odvozená pole karty z aktuálních hodnot. */
export function recompute(card: Card, settings: Settings): Card {
  const segment = getSegment(card.segment);
  if (!segment) return card;
  const hard = validateHard(segment, card.values);
  card.completeness = completeness(segment, card.values);
  card.missingRequired = hard.missingRequired;
  card.qualityFlags = qualityFlags(segment, card.values, settings);
  return card;
}

/** Vrátí seznam tvrdých chyb bránících uložení kompletní karty. */
export function hardErrors(card: Card): { missingRequired: string[]; typeErrors: { field: string; label: string; message: string }[] } {
  const segment = getSegment(card.segment);
  if (!segment) return { missingRequired: [], typeErrors: [] };
  return validateHard(segment, card.values);
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.name === "string" && o.name) return o.name; // příloha → název souboru
    if (typeof o.url === "string" && o.url) return o.url;
    try { return JSON.stringify(value); } catch { return "[data]"; }
  }
  return String(value);
}

/** Porovná staré a nové hodnoty a vytvoří auditní záznamy pro změněná pole. */
export function diffAudit(
  cardId: string,
  userId: string,
  userName: string,
  segmentKey: string,
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
): AuditEntry[] {
  const segment = getSegment(segmentKey);
  const entries: AuditEntry[] = [];
  const fields = segment?.fields ?? [];
  for (const f of fields) {
    const before = oldValues[f.key];
    const after = newValues[f.key];
    if (JSON.stringify(before ?? null) !== JSON.stringify(after ?? null)) {
      entries.push({
        id: genId("a_"),
        cardId,
        at: new Date().toISOString(),
        userId,
        userName,
        action: "update",
        field: f.key,
        fieldLabel: f.label,
        oldValue: display(before),
        newValue: display(after),
      });
    }
  }
  return entries;
}

/** Vybere pole, která se mají zapsat zpět do Raynetu podle mapování. */
export function selectWriteback(card: Card, mappings: FieldMapping[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const m of mappings) {
    if (!m.enabled || m.segment !== card.segment) continue;
    const v = card.values[m.internalField];
    if (v !== undefined && v !== "" && v !== null) {
      out[m.raynetField] = v;
    }
  }
  return out;
}
