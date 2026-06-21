// Typy sdílené napříč frontendem (zrcadlí kontrakt backendu).

export type Role = "obchodnik" | "reditel" | "admin";

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  raynetUserId: number;
  vehicleId?: string;
}

export type SegmentKey = "vodarny" | "spravce" | "svj";

export type FieldType =
  | "text" | "textarea" | "number" | "currency"
  | "date" | "select" | "radio" | "multiselect" | "scale" | "file";

export interface FieldOption { value: string; label: string }

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required: boolean | "conditional";
  help?: string;
  unit?: string;
  options?: FieldOption[];
  codebook?: string;
  multi?: boolean;
  allowOther?: boolean;
  scored?: boolean;
  reportable?: boolean;
  prefillFromRaynet?: string;
  group?: string;
}

export interface SegmentDef {
  key: SegmentKey;
  label: string;
  short: string;
  description: string;
  fields: FieldDef[];
  conditionalRule?: "svjMarkOrPhoto";
}

export type CardStatus = "draft" | "complete";
export type AcquisitionMethod = "osobni_navsteva" | "telefonat" | "email" | "interni_doplneni" | "jiny";
export type GpsStatus =
  | "overeno_v_miste" | "overeno_v_toleranci" | "mimo_misto"
  | "neovereno" | "gps_nedostupna" | "doplneno_vzdalene";

export interface GpsResult {
  status: GpsStatus;
  source: "logbookie" | "prohlizec" | "zadny";
  distanceM: number | null;
  verifiedAt: string | null;
  error?: string;
}

export interface QualityFlag { field: string; label: string; reason: string; value: string }

export interface Card {
  id: string;
  raynetCompanyId: number;
  companyName: string;
  segment: SegmentKey;
  status: CardStatus;
  values: Record<string, unknown>;
  completeness: number;
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
  stale?: boolean;
}

export interface AuditEntry {
  id: string;
  cardId: string;
  at: string;
  userId: string;
  userName: string;
  action: string;
  field?: string;
  fieldLabel?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface Company {
  id: number;
  name: string;
  ico: string;
  address: string;
  city: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  segmentHint?: string;
  optionalFields: Record<string, unknown>;
  lat?: number;
  lng?: number;
}

export interface CodebookItem { id: string; label: string; active: boolean }

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

export interface UploadedFile { url: string; name: string; size: number }
