import { CheckCircle2, FileEdit, Clock, MapPin, MapPinOff, ShieldCheck, ShieldAlert, Phone, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ACQUISITION_LABEL, GPS_LABEL, GPS_TONE } from "@/lib/labels";
import type { AcquisitionMethod, CardStatus, GpsStatus } from "@/lib/types";

const TONE_VARIANT = { ok: "ok", warn: "warn", bad: "bad", neutral: "muted" } as const;

export function StatusBadge({ status }: { status: CardStatus }) {
  return status === "complete" ? (
    <Badge variant="ok"><CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Kompletní</Badge>
  ) : (
    <Badge variant="muted"><FileEdit className="h-3 w-3" aria-hidden="true" /> Draft</Badge>
  );
}

export function StaleBadge({ stale }: { stale?: boolean }) {
  if (!stale) return null;
  return (
    <Badge variant="warn"><Clock className="h-3 w-3" aria-hidden="true" /> Zastaralá</Badge>
  );
}

export function QualityBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <Badge variant="bad"><AlertTriangle className="h-3 w-3" aria-hidden="true" /> {count}× kvalita</Badge>
  );
}

export function GpsBadge({ status }: { status: GpsStatus }) {
  const tone = GPS_TONE[status];
  const Icon =
    status === "overeno_v_miste" || status === "overeno_v_toleranci"
      ? ShieldCheck
      : status === "mimo_misto"
        ? MapPinOff
        : status === "doplneno_vzdalene"
          ? Phone
          : ShieldAlert;
  return (
    <Badge variant={TONE_VARIANT[tone]}>
      <Icon className="h-3 w-3" aria-hidden="true" /> {GPS_LABEL[status]}
    </Badge>
  );
}

export function AcquisitionBadge({ method }: { method: AcquisitionMethod }) {
  const Icon = method === "osobni_navsteva" ? MapPin : Phone;
  return (
    <Badge variant="outline"><Icon className="h-3 w-3" aria-hidden="true" /> {ACQUISITION_LABEL[method]}</Badge>
  );
}
