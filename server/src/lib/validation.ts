// Validace a kvalita dat (§7.4).
// - Tvrdá validace: povinná pole, typy (číslo, datum), podmíněné SVJ pravidlo.
// - Měkká kontrola: quality flags pro podezřelé / zástupné hodnoty.

import type { FieldDef, QualityFlag, SegmentDef, Settings } from "../types.js";

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** Příloha je „vyplněná" jen se skutečnou URL — placeholder {} / {url:""} neprojde. */
function isFileEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v !== "object") return true;
  const rec = v as Record<string, unknown>;
  return typeof rec.url !== "string" || rec.url.trim() === "";
}

/** Je pole v daném kontextu povinné? Řeší i podmíněná pravidla segmentu. */
export function isFieldRequired(
  field: FieldDef,
  segment: SegmentDef,
  values: Record<string, unknown>,
): boolean {
  if (field.required === true) return true;
  if (field.required === false) return false;

  // conditional — zatím jen SVJ: značka NEBO fotografie
  if (segment.conditionalRule === "svjMarkOrPhoto") {
    if (field.key === "znacka_meridel" || field.key === "foto_meridel") {
      const hasMark = !isEmpty(values["znacka_meridel"]);
      const hasPhoto = !isFileEmpty(values["foto_meridel"]);
      // Pole je povinné jen tehdy, když ani jedno z dvojice není vyplněné.
      return !hasMark && !hasPhoto;
    }
  }
  return false;
}

export interface HardValidationResult {
  missingRequired: string[];
  typeErrors: { field: string; label: string; message: string }[];
}

export function validateHard(
  segment: SegmentDef,
  values: Record<string, unknown>,
): HardValidationResult {
  const missingRequired: string[] = [];
  const typeErrors: HardValidationResult["typeErrors"] = [];

  for (const field of segment.fields) {
    const value = values[field.key];
    const required = isFieldRequired(field, segment, values);

    if (required && isEmpty(value)) {
      missingRequired.push(field.key);
      continue;
    }
    if (isEmpty(value)) continue;

    if ((field.type === "number" || field.type === "currency") && value !== "") {
      const n = Number(value);
      if (Number.isNaN(n)) {
        typeErrors.push({ field: field.key, label: field.label, message: "Zadej číslo." });
      } else if (n < 0) {
        typeErrors.push({ field: field.key, label: field.label, message: "Zadej nezáporné číslo." });
      }
    }

    if (field.type === "date") {
      const d = new Date(String(value));
      if (Number.isNaN(d.getTime())) {
        typeErrors.push({ field: field.key, label: field.label, message: "Zadej platné datum." });
      }
    }
  }

  return { missingRequired, typeErrors };
}

/** Procento vyplněnosti podle povinných polí segmentu. */
export function completeness(segment: SegmentDef, values: Record<string, unknown>): number {
  const requiredFields = segment.fields.filter((f) => isFieldRequired(f, segment, values));
  if (requiredFields.length === 0) return 100;
  const filled = requiredFields.filter((f) => !isEmpty(values[f.key])).length;
  return Math.round((filled / requiredFields.length) * 100);
}

/** Měkká kontrola — quality flags pro podezřelé textové hodnoty. */
export function qualityFlags(
  segment: SegmentDef,
  values: Record<string, unknown>,
  settings: Settings,
): QualityFlag[] {
  const flags: QualityFlag[] = [];
  const tokens = settings.qualityTokens.map((t) => t.toLowerCase());

  for (const field of segment.fields) {
    if (field.type !== "text" && field.type !== "textarea") continue;
    const raw = values[field.key];
    if (isEmpty(raw)) continue;
    const text = String(raw).trim();
    const lower = text.toLowerCase();

    if (tokens.includes(lower)) {
      flags.push({
        field: field.key,
        label: field.label,
        reason: `Zástupná hodnota „${text}".`,
        value: text,
      });
      continue;
    }
    if (text.length < settings.qualityMinLength) {
      flags.push({
        field: field.key,
        label: field.label,
        reason: `Příliš krátká odpověď (${text.length} znaků).`,
        value: text,
      });
    }
  }
  return flags;
}
