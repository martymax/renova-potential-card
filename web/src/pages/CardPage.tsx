import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Save, CheckCircle2, RefreshCw, ExternalLink, MapPin, Phone, Mail, FilePlus2, HelpCircle,
  AlertTriangle, ShieldCheck, Navigation,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/hooks/useResource";
import { isFieldRequired, missingRequired } from "@/lib/segmentLogic";
import { ACQUISITION_LABEL, GPS_LABEL, SEGMENT_LABEL, formatDate, formatDateTime } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/app/PageHeader";
import { SegmentField } from "@/components/app/SegmentField";
import { AuditTrail } from "@/components/app/AuditTrail";
import { StatusBadge, StaleBadge, GpsBadge } from "@/components/app/StatusBadges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AcquisitionMethod, AuditEntry, Card as CardType, CodebookItem, SegmentDef, Settings } from "@/lib/types";

const ACQ_OPTIONS: { value: AcquisitionMethod; icon: typeof MapPin }[] = [
  { value: "osobni_navsteva", icon: MapPin },
  { value: "telefonat", icon: Phone },
  { value: "email", icon: Mail },
  { value: "interni_doplneni", icon: FilePlus2 },
  { value: "jiny", icon: HelpCircle },
];

function getDeviceLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 60000 },
    );
  });
}

export function CardPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const cardRes = useResource<{ card: CardType; audit: AuditEntry[] }>(`/cards/${id}`);
  const segments = useResource<{ segments: SegmentDef[] }>("/segments");
  const codebooksRes = useResource<{ codebooks: Record<string, CodebookItem[]> }>("/codebooks");
  const settingsRes = useResource<{ settings: Settings }>("/settings");

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [acquisition, setAcquisition] = useState<AcquisitionMethod>("osobni_navsteva");
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<null | "draft" | "complete">(null);
  const [syncing, setSyncing] = useState(false);
  const [dirty, setDirty] = useState(false);

  const card = cardRes.data?.card;
  const readOnly = user!.role === "reditel";

  useEffect(() => {
    if (card) {
      setValues(card.values ?? {});
      setAcquisition(card.acquisition ?? "osobni_navsteva");
    }
  }, [card?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const segment = useMemo(
    () => segments.data?.segments.find((s) => s.key === card?.segment),
    [segments.data, card?.segment],
  );

  if (cardRes.loading || !card || !segment || !settingsRes.data || !codebooksRes.data) {
    return <Skeleton className="h-96" />;
  }

  const codebooks = codebooksRes.data.codebooks;
  const settings = settingsRes.data.settings;
  const qualityByField = new Map(card.qualityFlags.map((f) => [f.field, f.reason]));

  function update(key: string, value: unknown) {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setInvalid((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  async function save(mode: "draft" | "complete") {
    if (!segment) return;
    if (mode === "complete") {
      const miss = missingRequired(segment, values);
      if (miss.length > 0) {
        setInvalid(new Set(miss));
        toast.error(`Doplň povinná pole (${miss.length}). Kompletní kartu nelze uložit s mezerami.`);
        return;
      }
    }
    setSaving(mode);
    let deviceLocation: { lat: number; lng: number } | null = null;
    if (acquisition === "osobni_navsteva") {
      toast.info("Ověřuji polohu pro osobní návštěvu…");
      deviceLocation = await getDeviceLocation();
    }
    try {
      const d = await api.put<{ card: CardType }>(`/cards/${id}`, { values, mode, acquisition, deviceLocation });
      cardRes.setData((prev) => (prev ? { ...prev, card: d.card } : prev));
      setValues(d.card.values);
      setInvalid(new Set());
      setDirty(false);
      cardRes.refetch();
      const gpsNote = d.card.gps ? ` · GPS: ${GPS_LABEL[d.card.gps.status]}` : "";
      toast.success(mode === "complete" ? `Kompletní karta uložena.${gpsNote}` : `Draft uložen.${gpsNote}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        const miss = (e.payload.missingRequired as string[]) ?? [];
        setInvalid(new Set(miss));
        toast.error(e.message);
      } else {
        toast.error(e instanceof Error ? e.message : "Uložení se nezdařilo.");
      }
    } finally {
      setSaving(null);
    }
  }

  async function sync() {
    setSyncing(true);
    try {
      const d = await api.post<{ fields: Record<string, unknown> }>(`/cards/${id}/sync`);
      toast.success(`Synchronizováno ${Object.keys(d.fields).length} polí do Raynetu.`);
      cardRes.refetch();
    } catch (e) {
      // Lokální uložení má prioritu — chyba Raynetu neblokuje data.
      toast.error(e instanceof Error ? `${e.message} Data v aplikaci zůstávají uložená.` : "Synchronizace selhala.");
      cardRes.refetch();
    } finally {
      setSyncing(false);
    }
  }

  const liveMissing = missingRequired(segment, values).length;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to={`/firma/${card.raynetCompanyId}`}><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Zpět na firmu</Link>
      </Button>

      <PageHeader
        eyebrow={SEGMENT_LABEL[card.segment]}
        title={card.companyName}
        actions={
          <>
            <Button variant="outline" onClick={sync} disabled={syncing}>
              <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} aria-hidden="true" />
              {syncing ? "Synchronizuji…" : "Synchronizovat do Raynetu"}
            </Button>
            <Button variant="ghost" asChild>
              <a href={`https://renova.raynet.cz/company/${card.raynetCompanyId}`} target="_blank" rel="noreferrer">
                Raynet <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </>
        }
      />

      {/* Shrnutí stavu */}
      <Card className="mb-6 border-l-4 border-l-primary">
        <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-4 p-5">
          <div>
            <p className="text-xs text-muted-foreground">Stav</p>
            <div className="mt-1 flex items-center gap-2"><StatusBadge status={card.status} /><StaleBadge stale={card.stale} /></div>
          </div>
          <div className="min-w-[180px]">
            <p className="text-xs text-muted-foreground">Vyplněnost</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Progress value={card.completeness} indicatorClassName={card.completeness === 100 ? "bg-primary" : "bg-secondary"} className="max-w-[140px]" />
              <span className="text-sm font-medium">{card.completeness} %</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Poslední aktualizace</p>
            <p className="mt-1 text-sm font-medium">{formatDate(card.updatedAt)} · {card.updatedByName}</p>
          </div>
          {card.gps ? (
            <div>
              <p className="text-xs text-muted-foreground">Ověření návštěvy</p>
              <div className="mt-1"><GpsBadge status={card.gps.status} /></div>
            </div>
          ) : null}
          {card.syncResult ? (
            <div>
              <p className="text-xs text-muted-foreground">Raynet</p>
              <p className="mt-1 text-sm font-medium">{card.syncedAt ? `Synchronizováno ${formatDate(card.syncedAt)}` : card.syncResult}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Tabs defaultValue="form">
        <TabsList>
          <TabsTrigger value="form">Formulář</TabsTrigger>
          <TabsTrigger value="history">Historie změn{cardRes.data ? ` (${cardRes.data.audit.length})` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="form">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {card.qualityFlags.length > 0 && (
                <div className="rounded-lg bg-accent/10 p-4">
                  <p className="flex items-center gap-2 font-bold text-accent-foreground">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Kontrola kvality dat
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-accent-foreground/80">
                    {card.qualityFlags.map((f) => <li key={f.field}>• <strong>{f.label}:</strong> {f.reason}</li>)}
                  </ul>
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Údaje o potenciálu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {readOnly && (
                    <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                      Obchodní ředitel kartu pouze prohlíží. Editace je na obchodníkovi.
                    </p>
                  )}
                  <fieldset disabled={readOnly} className="space-y-6">
                    {segment.fields.map((field) => (
                      <SegmentField
                        key={field.key}
                        field={field}
                        value={values[field.key]}
                        required={isFieldRequired(field, segment, values)}
                        invalid={invalid.has(field.key)}
                        qualityReason={qualityByField.get(field.key)}
                        codebooks={codebooks}
                        maxAttachmentMB={settings.maxAttachmentMB}
                        onChange={update}
                      />
                    ))}
                  </fieldset>
                </CardContent>
              </Card>
            </div>

            {/* Pravý sloupec: způsob získání + GPS + uložení */}
            <div className="space-y-6">
              <div className="lg:sticky lg:top-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Navigation className="h-5 w-5 text-primary" aria-hidden="true" /> Způsob získání údajů</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <fieldset disabled={readOnly} className="grid gap-2">
                      {ACQ_OPTIONS.map((o) => (
                        <button key={o.value} type="button" onClick={() => { setAcquisition(o.value); setDirty(true); }}
                          className={cn(
                            "flex items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60",
                            acquisition === o.value ? "border-l-4 border-l-primary bg-primary/10 text-primary" : "border-input hover:bg-muted",
                          )}
                          aria-pressed={acquisition === o.value}>
                          <o.icon className="h-4 w-4" aria-hidden="true" /> {ACQUISITION_LABEL[o.value]}
                        </button>
                      ))}
                    </fieldset>
                    {acquisition === "osobni_navsteva" ? (
                      <p className="flex items-start gap-2 text-xs text-muted-foreground">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        Při uložení aplikace ověří návštěvu přes GPS (Logbookie, případně poloha zařízení).
                      </p>
                    ) : null}

                    {card.gps && card.gps.verifiedAt ? (
                      <div className="rounded-md bg-muted/50 p-3 text-xs">
                        <p className="font-medium text-foreground">{GPS_LABEL[card.gps.status]}</p>
                        <p className="mt-1 text-muted-foreground">
                          Zdroj: {card.gps.source === "logbookie" ? "Logbookie (vozidlo)" : card.gps.source === "prohlizec" ? "poloha zařízení" : "—"}
                          {card.gps.distanceM != null ? ` · ${card.gps.distanceM} m od adresy` : ""}
                        </p>
                        {card.gps.error ? <p className="mt-1 text-muted-foreground">{card.gps.error}</p> : null}
                        <p className="mt-1 text-muted-foreground">Ověřeno {formatDateTime(card.gps.verifiedAt)}</p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                {!readOnly && (
                  <Card>
                    <CardContent className="space-y-3 p-5">
                      {liveMissing > 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Pro kompletní kartu zbývá vyplnit <strong className="text-foreground">{liveMissing}</strong> povinných polí.
                        </p>
                      ) : (
                        <p className="flex items-center gap-2 text-sm text-primary">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Všechna povinná pole jsou vyplněná.
                        </p>
                      )}
                      <Button className="w-full" onClick={() => save("complete")} disabled={saving !== null}>
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        {saving === "complete" ? "Ukládám…" : "Uložit jako kompletní"}
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => save("draft")} disabled={saving !== null}>
                        <Save className="h-4 w-4" aria-hidden="true" />
                        {saving === "draft" ? "Ukládám…" : "Uložit draft"}
                      </Button>
                      {dirty ? <p className="text-center text-xs text-muted-foreground">Máš neuložené změny.</p> : null}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>Audit změn</CardTitle></CardHeader>
            <CardContent>
              <AuditTrail entries={cardRes.data?.audit ?? []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
