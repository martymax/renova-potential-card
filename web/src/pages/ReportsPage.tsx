import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import { Download, Gauge, CalendarClock, MapPinned, Layers, AlertTriangle, FilePlus2, RefreshCw, FileEdit, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useResource } from "@/hooks/useResource";
import { color, chartPalette } from "@/ds/tokens";
import { ACQUISITION_LABEL, GPS_LABEL, SEGMENT_LABEL, formatDate, formatNumber } from "@/lib/labels";
import { PageHeader } from "@/components/app/PageHeader";
import { StatTile } from "@/components/app/StatTile";
import { ErrorState } from "@/components/app/ErrorState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AcquisitionMethod, GpsStatus } from "@/lib/types";

interface Overview {
  totals: { cards: number; complete: number; drafts: number; stale: number; withQualityFlags: number; qualityFlagCount: number };
  bySegment: { segment: string; label: string; total: number; complete: number; drafts: number; avgCompleteness: number }[];
  byRep: { user: string; total: number; complete: number; avg: number }[];
  stalenessDays: number;
}
interface Tenders { tenders: { cardId: string; company: string; date: string; odbernaMista: number; bucket: "3" | "6" | "12" }[] }
interface FieldActivity { byGps: Record<string, number>; byMethod: Record<string, number>; offsite: { cardId: string; company: string; rep: string; distanceM: number; at: string }[] }
interface Potential {
  vodarny: { karty: number; odbernaMista: number };
  spravce: { karty: number; spravovaneByty: number };
  svj: { karty: number; byty: number; meridla: number };
}

const tooltipStyle = {
  background: color.background,
  border: `1px solid ${color.border}`,
  borderRadius: "0.5rem",
  color: color.foreground,
  fontSize: "0.8rem",
};

export function ReportsPage() {
  const overview = useResource<Overview>("/reports/overview");
  const tenders = useResource<Tenders>("/reports/tenders");
  const activity = useResource<FieldActivity>("/reports/field-activity");
  const potential = useResource<Potential>("/reports/potential");
  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
    setExporting(true);
    try {
      await api.download("/reports/export.csv", "karty-potencialu.csv");
      toast.success("CSV export stažen.");
    } catch {
      toast.error("Export se nezdařil.");
    } finally {
      setExporting(false);
    }
  }

  if (overview.loading) return <Skeleton className="h-96" />;
  if (overview.error || !overview.data)
    return <ErrorState title="Reporting se nepodařilo načíst" message={overview.error ?? undefined} onRetry={overview.refetch} />;
  const t = overview.data.totals;

  return (
    <>
      <PageHeader
        eyebrow="Řízení obchodu"
        title="Reporting"
        description={`Vyplněnost, kvalita dat, tendry a terénní aktivita. Zastaralé = bez aktualizace déle než ${overview.data.stalenessDays} dní.`}
        actions={
          <Button onClick={exportCsv} disabled={exporting}>
            <Download className="h-4 w-4" aria-hidden="true" /> {exporting ? "Exportuji…" : "Export CSV"}
          </Button>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Layers} label="Karty celkem" value={t.cards} hint={`${t.complete} kompletních · ${t.drafts} draftů`} />
        <StatTile icon={Gauge} label="Kompletnost týmu" value={`${t.cards ? Math.round((t.complete / t.cards) * 100) : 0} %`} />
        <StatTile icon={CalendarClock} label="Zastaralé karty" value={t.stale} />
        <StatTile icon={AlertTriangle} label="Quality flagy" value={t.qualityFlagCount} hint={`${t.withQualityFlags} karet`} accent />
      </div>

      <Tabs defaultValue="completeness">
        <TabsList className="flex-wrap">
          <TabsTrigger value="completeness">Vyplněnost</TabsTrigger>
          <TabsTrigger value="monthly">Měsíční report</TabsTrigger>
          <TabsTrigger value="tenders">Tendry</TabsTrigger>
          <TabsTrigger value="field">Terénní aktivita</TabsTrigger>
          <TabsTrigger value="potential">Potenciál</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly"><MonthlyTab /></TabsContent>

        {/* Vyplněnost */}
        <TabsContent value="completeness" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Průměrná vyplněnost podle segmentu</CardTitle>
                <CardDescription>Podíl vyplněných povinných polí.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={overview.data.bySegment} margin={{ left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={color.border} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: color.mutedForeground }} tickLine={false} axisLine={false} interval={0} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: color.mutedForeground }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} %`, "Vyplněnost"]} cursor={{ fill: color.muted }} />
                    <Bar dataKey="avgCompleteness" fill={color.secondary} radius={[6, 6, 0, 0]} maxBarSize={64} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vyplněnost podle obchodníka</CardTitle>
                <CardDescription>Počet karet a podíl kompletních.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Obchodník</TableHead>
                      <TableHead>Karty</TableHead>
                      <TableHead>Kompletní</TableHead>
                      <TableHead>⌀ vyplněnost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.data.byRep.map((r) => (
                      <TableRow key={r.user}>
                        <TableCell className="font-medium">{r.user}</TableCell>
                        <TableCell>{r.total}</TableCell>
                        <TableCell>{r.complete}</TableCell>
                        <TableCell><Badge variant={r.avg >= 80 ? "ok" : "muted"}>{r.avg} %</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tendry */}
        <TabsContent value="tenders">
          <Card>
            <CardHeader>
              <CardTitle>Blížící se tendry</CardTitle>
              <CardDescription>Termíny poptávkových řízení v segmentu vodárny, obce, teplárny.</CardDescription>
            </CardHeader>
            <CardContent>
              {tenders.loading ? <Skeleton className="h-32" /> : tenders.error ? (
                <ErrorState title="Tendry se nepodařilo načíst" message={tenders.error} onRetry={tenders.refetch} />
              ) : (
                <>
                  <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    {(["3", "6", "12"] as const).map((b) => {
                      const items = (tenders.data?.tenders ?? []).filter((x) => x.bucket === b);
                      return (
                        <div key={b} className="rounded-lg border border-l-4 border-l-primary p-4">
                          <p className="text-xs text-muted-foreground">do {b} měsíců</p>
                          <p className="font-display text-2xl font-bold">{items.length}</p>
                        </div>
                      );
                    })}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Firma</TableHead><TableHead>Termín</TableHead><TableHead>Odběrná místa</TableHead><TableHead>Horizont</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {(tenders.data?.tenders ?? []).length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Žádné tendry v nejbližších 12 měsících.</TableCell></TableRow>
                      ) : (
                        tenders.data!.tenders.map((x) => (
                          <TableRow key={x.cardId}>
                            <TableCell className="font-medium">{x.company}</TableCell>
                            <TableCell>{formatDate(x.date)}</TableCell>
                            <TableCell>{formatNumber(x.odbernaMista)}</TableCell>
                            <TableCell><Badge variant={x.bucket === "3" ? "bad" : x.bucket === "6" ? "warn" : "muted"}>do {x.bucket} měs.</Badge></TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Terénní aktivita */}
        <TabsContent value="field" className="space-y-6">
          {activity.loading ? <Skeleton className="h-64" /> : activity.error || !activity.data ? (
            <ErrorState title="Terénní aktivitu se nepodařilo načíst" message={activity.error ?? undefined} onRetry={activity.refetch} />
          ) : (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>Stav GPS ověření</CardTitle><CardDescription>Výsledek ověření osobních návštěv.</CardDescription></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={Object.entries(activity.data.byGps).map(([k, v]) => ({ name: GPS_LABEL[k as GpsStatus] ?? k, value: v }))}
                          dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                          {Object.keys(activity.data.byGps).map((_, i) => <Cell key={i} fill={chartPalette[i % chartPalette.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: "0.78rem" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Způsob získání údajů</CardTitle><CardDescription>Jak byly karty doplněny.</CardDescription></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={Object.entries(activity.data.byMethod).map(([k, v]) => ({ name: ACQUISITION_LABEL[k as AcquisitionMethod] ?? k, value: v }))} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={color.border} horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: color.mutedForeground }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: color.mutedForeground }} tickLine={false} axisLine={false} width={120} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: color.muted }} />
                        <Bar dataKey="value" fill={color.primary} radius={[0, 6, 6, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-l-4 border-l-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><MapPinned className="h-5 w-5 text-primary" aria-hidden="true" /> Návštěvy mimo místo zákazníka</CardTitle>
                  <CardDescription>Osobní návštěvy, kde GPS poloha přesáhla toleranční okruh.</CardDescription>
                </CardHeader>
                <CardContent>
                  {activity.data.offsite.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Žádné návštěvy mimo toleranci. Terénní data sedí.</p>
                  ) : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Firma</TableHead><TableHead>Obchodník</TableHead><TableHead>Vzdálenost</TableHead><TableHead>Kdy</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {activity.data.offsite.map((o) => (
                          <TableRow key={o.cardId}>
                            <TableCell className="font-medium">{o.company}</TableCell>
                            <TableCell>{o.rep}</TableCell>
                            <TableCell><Badge variant="bad">{formatNumber(o.distanceM)} m</Badge></TableCell>
                            <TableCell>{formatDate(o.at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Potenciál */}
        <TabsContent value="potential">
          {potential.loading ? <Skeleton className="h-40" /> : potential.error || !potential.data ? (
            <ErrorState title="Potenciál se nepodařilo načíst" message={potential.error ?? undefined} onRetry={potential.refetch} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-l-4 border-l-primary">
                <CardHeader><CardTitle className="text-base">Vodárny, obce, teplárny</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Karty" value={potential.data.vodarny.karty} />
                  <Row label="Odběrná místa" value={formatNumber(potential.data.vodarny.odbernaMista)} />
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-primary">
                <CardHeader><CardTitle className="text-base">Správce</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Karty" value={potential.data.spravce.karty} />
                  <Row label="Spravované byty" value={formatNumber(potential.data.spravce.spravovaneByty)} />
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-primary">
                <CardHeader><CardTitle className="text-base">SVJ</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Karty" value={potential.data.svj.karty} />
                  <Row label="Byty" value={formatNumber(potential.data.svj.byty)} />
                  <Row label="Měřidla" value={formatNumber(potential.data.svj.meridla)} />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-display text-lg font-bold">{value}</span>
    </div>
  );
}

interface Monthly {
  period: { month: string; from: string; to: string };
  newCards: number;
  updatedCards: number;
  incomplete: { count: number; items: { cardId: string; company: string; segment: keyof typeof SEGMENT_LABEL; rep: string; missing: number }[] };
  qualityFlagCards: number;
  tenders: { "3": number; "6": number; "12": number };
  visits: { osobni: number; overeno: number; neovereno: number; mimo: number; vzdalene: number };
}

function MonthlyTab() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const { data, loading, error, refetch } = useResource<Monthly>(`/reports/monthly?month=${month}`);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="rep-month">Období</Label>
          <Input id="rep-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-48" />
        </div>
        <p className="text-sm text-muted-foreground">Manažerský souhrn za vybraný měsíc dle zadání §10.6.</p>
      </div>

      {loading ? <Skeleton className="h-72" /> : error || !data ? (
        <ErrorState title="Měsíční report se nepodařilo načíst" message={error ?? undefined} onRetry={refetch} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={FilePlus2} label="Nově založené karty" value={data.newCards} hint="v období" />
            <StatTile icon={RefreshCw} label="Aktualizované karty" value={data.updatedCards} hint="v období" />
            <StatTile icon={FileEdit} label="Nekompletní (drafty)" value={data.incomplete.count} />
            <StatTile icon={AlertTriangle} label="Karty s quality flagy" value={data.qualityFlagCards} accent />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" /> Blížící se tendry</CardTitle>
                <CardDescription>Termíny v následujících 3 / 6 / 12 měsících.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {(["3", "6", "12"] as const).map((b) => (
                    <div key={b} className="rounded-lg border p-4 text-center">
                      <p className="text-xs text-muted-foreground">do {b} měs.</p>
                      <p className="font-display text-2xl font-bold">{data.tenders[b]}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" /> Ověření návštěv v období</CardTitle>
                <CardDescription>Osobní návštěvy podle výsledku GPS a vzdálené doplnění.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Osobní návštěvy" value={data.visits.osobni} />
                <Row label="— ověřené GPS" value={data.visits.overeno} />
                <Row label="— mimo místo" value={data.visits.mimo} />
                <Row label="— neověřené" value={data.visits.neovereno} />
                <Row label="Vzdáleně doplněné" value={data.visits.vzdalene} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileEdit className="h-5 w-5 text-primary" aria-hidden="true" /> Nekompletní karty</CardTitle>
              <CardDescription>Drafty a počet chybějících povinných polí (top 10).</CardDescription>
            </CardHeader>
            <CardContent>
              {data.incomplete.items.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Žádné nekompletní karty. Pěkná práce.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Firma</TableHead><TableHead>Segment</TableHead><TableHead>Obchodník</TableHead><TableHead>Chybí polí</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.incomplete.items.map((it) => (
                      <TableRow key={it.cardId}>
                        <TableCell className="font-medium">{it.company}</TableCell>
                        <TableCell><Badge variant="muted">{SEGMENT_LABEL[it.segment] ?? it.segment}</Badge></TableCell>
                        <TableCell>{it.rep}</TableCell>
                        <TableCell><Badge variant={it.missing > 0 ? "warn" : "ok"}>{it.missing}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
