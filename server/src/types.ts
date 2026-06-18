// Sdílené typy backendu Karty potenciálu.

export type Role = "obchodnik" | "reditel" | "admin";

export interface User {
  id: string;
  username: string;
  password: string; // demo only — v produkci hash + Raynet/SSO
  name: string;
  role: Role;
  raynetUserId: number;
  vehicleId?: string; // mapování obchodník → služební vozidlo (Logbookie)
}

export type SegmentKey = "vodarny" | "spravce" | "svj";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "date"
  | "select"
  | "multiselect"
  | "scale"
  | "file";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  /** true = vždy povinné, "conditional" = řízeno pravidlem segmentu, false = nepovinné */
  required: boolean | "conditional";
  help?: string;
  unit?: string;
  /** Pevné možnosti pro select/scale (jinak codebook). */
  options?: FieldOption[];
  /** Klíč číselníku pro select/multiselect spravovaný adminem. */
  codebook?: string;
  multi?: boolean;
  /** Vstup do skóringu → strukturované + write-back do Raynetu. */
  scored?: boolean;
  /** Pole, které jde do reportingu / CSV. */
  reportable?: boolean;
  /** Předvyplnění z volitelného pole firmy v Raynetu. */
  prefillFromRaynet?: string;
  group?: string;
}

export interface SegmentDef {
  key: SegmentKey;
  label: string;
  short: string;
  description: string;
  fields: FieldDef[];
  /** Speciální podmíněná pravidla (např. SVJ: značka nebo fotografie). */
  conditionalRule?: "svjMarkOrPhoto";
}

export type CardStatus = "draft" | "complete";

export type AcquisitionMethod =
  | "osobni_navsteva"
  | "telefonat"
  | "email"
  | "interni_doplneni"
  | "jiny";

export type GpsStatus =
  | "overeno_v_miste"
  | "overeno_v_toleranci"
  | "mimo_misto"
  | "neovereno"
  | "gps_nedostupna"
  | "doplneno_vzdalene";

export interface GpsResult {
  status: GpsStatus;
  source: "logbookie" | "prohlizec" | "zadny";
  distanceM: number | null;
  verifiedAt: string | null;
  error?: string;
}

export interface QualityFlag {
  field: string;
  label: string;
  reason: string;
  value: string;
}

export interface Card {
  id: string;
  raynetCompanyId: number;
  companyName: string;
  segment: SegmentKey;
  status: CardStatus;
  values: Record<string, unknown>;
  completeness: number; // 0–100 podle povinných polí segmentu
  missingRequired: string[];
  qualityFlags: QualityFlag[];
  acquisition: AcquisitionMethod | null;
  gps: GpsResult | null;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
  syncedAt: string | null;
  syncResult: string | null;
}

export interface AuditEntry {
  id: string;
  cardId: string;
  at: string;
  userId: string;
  userName: string;
  action: "create" | "update" | "save_draft" | "save_complete" | "sync";
  field?: string;
  fieldLabel?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface CodebookItem {
  id: string;
  label: string;
  active: boolean;
}

export interface FieldMapping {
  segment: SegmentKey;
  internalField: string;
  internalLabel: string;
  raynetField: string;
  raynetLabel: string;
  type: string;
  scored: boolean;
  enabled: boolean;
}

export interface Settings {
  stalenessDays: number;
  toleranceMeters: number;
  gpsSource: "logbookie" | "prohlizec";
  maxAttachmentMB: number;
  qualityTokens: string[];
  qualityMinLength: number;
}

export interface RaynetWriteback {
  id: string;
  at: string;
  companyId: number;
  companyName: string;
  cardId: string;
  fields: Record<string, unknown>;
  ok: boolean;
}

export interface DbShape {
  users: User[];
  cards: Card[];
  audit: AuditEntry[];
  codebooks: Record<string, CodebookItem[]>;
  mappings: FieldMapping[];
  settings: Settings;
  writeback: RaynetWriteback[];
}
