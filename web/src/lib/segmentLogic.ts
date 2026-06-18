// Zrcadlí serverovou logiku povinnosti polí (kvůli správnému zobrazení * a předkontrole).

import type { FieldDef, SegmentDef } from "./types";

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return !o.url && !o.name;
  }
  return false;
}

export function isFieldRequired(field: FieldDef, segment: SegmentDef, values: Record<string, unknown>): boolean {
  if (field.required === true) return true;
  if (field.required === false) return false;
  if (segment.conditionalRule === "svjMarkOrPhoto") {
    if (field.key === "znacka_meridel" || field.key === "foto_meridel") {
      return isEmpty(values["znacka_meridel"]) && isEmpty(values["foto_meridel"]);
    }
  }
  return false;
}

export function missingRequired(segment: SegmentDef, values: Record<string, unknown>): string[] {
  return segment.fields.filter((f) => isFieldRequired(f, segment, values) && isEmpty(values[f.key])).map((f) => f.key);
}
