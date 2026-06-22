import { useState } from "react";
import { Upload, Paperclip, X, ScanEye } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuthedImage } from "@/components/app/AuthedImage";
import type { CodebookItem, FieldDef, UploadedFile } from "@/lib/types";

const OTHER = "Jiné";

interface Props {
  field: FieldDef;
  value: unknown;
  /** Hodnota doprovodného pole `${key}_jine` pro volbu „Jiné". */
  otherValue?: unknown;
  required: boolean;
  invalid?: boolean;
  qualityReason?: string;
  codebooks: Record<string, CodebookItem[]>;
  maxAttachmentMB: number;
  onChange: (key: string, value: unknown) => void;
}

function optionsFor(field: FieldDef, codebooks: Record<string, CodebookItem[]>) {
  const base = field.options
    ? field.options
    : field.codebook
      ? (codebooks[field.codebook] ?? []).filter((i) => i.active).map((i) => ({ value: i.label, label: i.label }))
      : [];
  return field.allowOther ? [...base, { value: OTHER, label: OTHER }] : base;
}

export function SegmentField({ field, value, otherValue, required, invalid, qualityReason, codebooks, maxAttachmentMB, onChange }: Props) {
  const id = `f_${field.key}`;
  const describedBy: string[] = [];
  if (field.help) describedBy.push(`${id}_help`);
  if (invalid) describedBy.push(`${id}_err`);
  if (qualityReason) describedBy.push(`${id}_q`);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id} className={cn(invalid && "text-destructive")}>
          {field.label}
          {required ? <span className="ml-0.5 text-destructive" aria-hidden="true">*</span> : null}
        </Label>
        {field.scored ? (
          <Badge variant="outline" className="gap-1 text-[11px]">
            <ScanEye className="h-3 w-3" aria-hidden="true" /> skórované · Raynet
          </Badge>
        ) : null}
      </div>

      <FieldControl id={id} field={field} value={value} otherValue={otherValue} invalid={invalid} describedBy={describedBy.join(" ") || undefined}
        codebooks={codebooks} maxAttachmentMB={maxAttachmentMB} onChange={onChange} />

      {field.help ? <p id={`${id}_help`} className="text-xs text-muted-foreground">{field.help}</p> : null}
      {invalid ? <p id={`${id}_err`} className="text-xs font-medium text-destructive">Toto pole je povinné pro kompletní kartu.</p> : null}
      {qualityReason ? (
        <p id={`${id}_q`} className="text-xs font-medium text-accent-foreground">⚠ {qualityReason} Ověř hodnotu.</p>
      ) : null}
    </div>
  );
}

function FieldControl({
  id, field, value, otherValue, invalid, describedBy, codebooks, maxAttachmentMB, onChange,
}: {
  id: string; field: FieldDef; value: unknown; otherValue?: unknown; invalid?: boolean; describedBy?: string;
  codebooks: Record<string, CodebookItem[]>; maxAttachmentMB: number; onChange: (key: string, value: unknown) => void;
}) {
  const invalidRing = invalid ? "border-destructive focus-visible:ring-destructive" : "";

  switch (field.type) {
    case "textarea":
      return (
        <Textarea id={id} aria-describedby={describedBy} value={(value as string) ?? ""} className={invalidRing}
          onChange={(e) => onChange(field.key, e.target.value)} rows={3} />
      );
    case "number":
    case "currency":
      return (
        <div className="relative">
          <Input id={id} type="number" inputMode="numeric" aria-describedby={describedBy} value={(value as string) ?? ""}
            className={cn(invalidRing, field.unit && "pr-12")} onChange={(e) => onChange(field.key, e.target.value)} />
          {field.unit ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{field.unit}</span> : null}
        </div>
      );
    case "date":
      return (
        <Input id={id} type="date" aria-describedby={describedBy} value={(value as string)?.slice(0, 10) ?? ""}
          className={cn(invalidRing, "w-fit")} onChange={(e) => onChange(field.key, e.target.value)} />
      );
    case "scale":
      // Škála jako přepínací tlačítka (segmentovaný výběr), ne dropdown.
      return <Radio id={id} describedBy={describedBy} invalid={invalid} field={field} value={(value as string) ?? ""} otherValue={(otherValue as string) ?? ""} codebooks={codebooks} onChange={onChange} />;
    case "select": {
      const opts = optionsFor(field, codebooks);
      return (
        <Select value={(value as string) ?? ""} onValueChange={(v) => onChange(field.key, v)}>
          <SelectTrigger id={id} aria-describedby={describedBy} className={invalidRing}>
            <SelectValue placeholder="Vyber hodnotu…" />
          </SelectTrigger>
          <SelectContent>
            {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    case "radio":
      return <Radio id={id} describedBy={describedBy} invalid={invalid} field={field} value={(value as string) ?? ""} otherValue={(otherValue as string) ?? ""} codebooks={codebooks} onChange={onChange} />;
    case "multiselect":
      return <MultiSelect id={id} describedBy={describedBy} invalid={invalid} field={field} value={(value as string[]) ?? []} otherValue={(otherValue as string) ?? ""} codebooks={codebooks} onChange={onChange} />;
    case "file":
      return <FileField id={id} describedBy={describedBy} invalid={invalid} field={field} value={value as UploadedFile | null} maxAttachmentMB={maxAttachmentMB} onChange={onChange} />;
    default:
      return (
        <Input id={id} aria-describedby={describedBy} value={(value as string) ?? ""} className={invalidRing}
          onChange={(e) => onChange(field.key, e.target.value)} />
      );
  }
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn(
        "rounded-md border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active ? "border-transparent bg-primary text-primary-foreground" : "border-input bg-background hover:bg-muted",
      )}>
      {label}
    </button>
  );
}

function OtherInput({ field, value, describedBy, onChange }: {
  field: FieldDef; value: string; describedBy?: string; onChange: (key: string, value: unknown) => void;
}) {
  return (
    <Input className="mt-2" aria-describedby={describedBy} placeholder="Dopiš ručně…"
      value={value} onChange={(e) => onChange(`${field.key}_jine`, e.target.value)} />
  );
}

function MultiSelect({ id, describedBy, invalid, field, value, otherValue, codebooks, onChange }: {
  id: string; describedBy?: string; invalid?: boolean; field: FieldDef; value: string[];
  otherValue: string; codebooks: Record<string, CodebookItem[]>; onChange: (key: string, value: unknown) => void;
}) {
  const opts = optionsFor(field, codebooks);
  const toggle = (v: string) => {
    const next = value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
    onChange(field.key, next);
  };
  return (
    <div>
      <div id={id} role="group" aria-describedby={describedBy} aria-invalid={invalid || undefined} className="flex flex-wrap gap-2">
        {opts.map((o) => <Chip key={o.value} active={value.includes(o.value)} label={o.label} onClick={() => toggle(o.value)} />)}
        {opts.length === 0 ? <p className="text-sm text-muted-foreground">Číselník je prázdný — doplň ho v administraci.</p> : null}
      </div>
      {field.allowOther && value.includes(OTHER) ? <OtherInput field={field} value={otherValue} describedBy={describedBy} onChange={onChange} /> : null}
    </div>
  );
}

function Radio({ id, describedBy, invalid, field, value, otherValue, codebooks, onChange }: {
  id: string; describedBy?: string; invalid?: boolean; field: FieldDef; value: string;
  otherValue: string; codebooks: Record<string, CodebookItem[]>; onChange: (key: string, value: unknown) => void;
}) {
  const opts = optionsFor(field, codebooks);
  return (
    <div>
      <div id={id} role="radiogroup" aria-describedby={describedBy} aria-invalid={invalid || undefined} className="flex flex-wrap gap-2">
        {opts.map((o) => <Chip key={o.value} active={value === o.value} label={o.label} onClick={() => onChange(field.key, value === o.value ? "" : o.value)} />)}
        {opts.length === 0 ? <p className="text-sm text-muted-foreground">Číselník je prázdný — doplň ho v administraci.</p> : null}
      </div>
      {field.allowOther && value === OTHER ? <OtherInput field={field} value={otherValue} describedBy={describedBy} onChange={onChange} /> : null}
    </div>
  );
}

function FileField({ id, describedBy, invalid, field, value, maxAttachmentMB, onChange }: {
  id: string; describedBy?: string; invalid?: boolean;
  field: FieldDef; value: UploadedFile | null; maxAttachmentMB: number; onChange: (key: string, value: unknown) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (file.size > maxAttachmentMB * 1024 * 1024) {
      toast.error(`Fotografie je větší než povolených ${maxAttachmentMB} MB.`);
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const d = await api.upload<{ file: UploadedFile }>("/uploads", form);
      onChange(field.key, d.file);
      toast.success("Fotografie nahrána.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nahrání se nezdařilo.");
    } finally {
      setBusy(false);
    }
  }

  if (value && (value.url || value.name)) {
    return (
      <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-3">
        {value.url ? (
          <AuthedImage url={value.url} alt="Náhled stávajících měřidel" className="h-14 w-14 rounded object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded bg-muted"><Paperclip className="h-5 w-5 text-muted-foreground" aria-hidden="true" /></div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{value.name || "fotografie.jpg"}</p>
          <p className="text-xs text-muted-foreground">{value.size ? `${(value.size / 1024).toFixed(0)} kB` : "nahráno"}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label="Odebrat fotografii" onClick={() => onChange(field.key, null)}>
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-input bg-background p-4 text-sm text-muted-foreground transition-colors hover:bg-muted">
      <Upload className="h-5 w-5" aria-hidden="true" />
      <span>{busy ? "Nahrávám…" : `Nahrát fotografii (JPG, PNG, WebP do ${maxAttachmentMB} MB)`}</span>
      <input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined}
        type="file" accept="image/*" className="sr-only" disabled={busy}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
    </label>
  );
}
