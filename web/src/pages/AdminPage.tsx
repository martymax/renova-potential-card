import { useEffect, useState } from "react";
import { Plug, ListChecks, ArrowLeftRight, SlidersHorizontal, Plus, Power, RefreshCw, Save, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useResource } from "@/hooks/useResource";
import { CODEBOOK_LABEL, ROLE_LABEL, SEGMENT_LABEL } from "@/lib/labels";
import { PageHeader } from "@/components/app/PageHeader";
import { ErrorState } from "@/components/app/ErrorState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CodebookItem, FieldMapping, Settings, User } from "@/lib/types";

export function AdminPage() {
  return (
    <>
      <PageHeader
        eyebrow="Systémová nastavení"
        title="Administrace"
        description="Číselníky, mapování polí na Raynet, pravidla GPS a kvality dat — bez zásahu do kódu."
      />
      <Tabs defaultValue="raynet">
        <TabsList className="flex-wrap">
          <TabsTrigger value="raynet">Raynet</TabsTrigger>
          <TabsTrigger value="codebooks">Číselníky</TabsTrigger>
          <TabsTrigger value="mappings">Mapování polí</TabsTrigger>
          <TabsTrigger value="settings">GPS a systém</TabsTrigger>
        </TabsList>
        <TabsContent value="raynet"><RaynetTab /></TabsContent>
        <TabsContent value="codebooks"><CodebooksTab /></TabsContent>
        <TabsContent value="mappings"><MappingsTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </>
  );
}

function RaynetTab() {
  const [ping, setPing] = useState<{ ok: boolean; instance: string; checkedAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const users = useResource<{ users: User[] }>("/raynet/users");

  async function refresh() {
    setBusy(true);
    try {
      setPing(await api.get("/raynet/ping"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test připojení selhal.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => { void refresh(); }, []);

  async function toggle(connected: boolean) {
    try {
      const p = await api.post<{ ok: boolean; instance: string; checkedAt: string }>("/raynet/connection", { connected });
      setPing(p);
      toast[connected ? "success" : "warning"](connected ? "Raynet připojení obnoveno." : "Raynet výpadek nasimulován — lokální uložení má prioritu.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Změna stavu připojení selhala.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plug className="h-5 w-5 text-primary" aria-hidden="true" /> Připojení k Raynetu</CardTitle>
          <CardDescription>Test připojení a simulace výpadku pro ověření chování „lokální uložení má prioritu".</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div>
              <p className="text-sm text-muted-foreground">Instance</p>
              <p className="font-medium">{ping?.instance ?? "—"}</p>
            </div>
            <Badge variant={ping?.ok ? "ok" : "bad"}>{ping?.ok ? "Připojeno" : "Nedostupný"}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={refresh} disabled={busy}>
              <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" /> Otestovat připojení
            </Button>
            {ping?.ok ? (
              <Button variant="destructive" onClick={() => toggle(false)}><Power className="h-4 w-4" aria-hidden="true" /> Simulovat výpadek</Button>
            ) : (
              <Button onClick={() => toggle(true)}><Power className="h-4 w-4" aria-hidden="true" /> Obnovit připojení</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" aria-hidden="true" /> Uživatelé z Raynetu</CardTitle>
          <CardDescription>Synchronizované účty a jejich role v aplikaci.</CardDescription>
        </CardHeader>
        <CardContent>
          {users.loading ? <Skeleton className="h-32" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Jméno</TableHead><TableHead>Role</TableHead><TableHead>Vozidlo</TableHead></TableRow></TableHeader>
              <TableBody>
                {users.data?.users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}<span className="block text-xs text-muted-foreground">@{u.username}</span></TableCell>
                    <TableCell><Badge variant="muted">{ROLE_LABEL[u.role]}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{u.vehicleId ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CodebooksTab() {
  const { data, loading, error, refetch } = useResource<{ codebooks: Record<string, CodebookItem[]> }>("/codebooks");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (loading) return <Skeleton className="h-64" />;
  if (error || !data) return <ErrorState title="Číselníky se nepodařilo načíst" message={error ?? undefined} onRetry={refetch} />;

  async function add(key: string) {
    const label = (drafts[key] ?? "").trim();
    if (!label) return;
    try {
      await api.post(`/codebooks/${key}`, { label });
      setDrafts((d) => ({ ...d, [key]: "" }));
      toast.success("Položka přidána.");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Přidání položky selhalo.");
    }
  }
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Object.entries(data.codebooks).map(([key, items]) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ListChecks className="h-5 w-5 text-primary" aria-hidden="true" /> {CODEBOOK_LABEL[key] ?? key}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2">
              {items.map((item) => (
                <CodebookItemRow key={item.id} codeKey={key} item={item} refetch={refetch} />
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">Název uprav přímo v poli (uloží se po opuštění). Přepínačem položku skryješ, košem natrvalo smažeš. Historické karty si hodnotu vždy ponechají.</p>
            <div className="flex gap-2">
              <Input value={drafts[key] ?? ""} placeholder="Nová položka…"
                onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") void add(key); }} />
              <Button variant="outline" size="icon" aria-label="Přidat položku" onClick={() => add(key)}><Plus className="h-4 w-4" aria-hidden="true" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CodebookItemRow({ codeKey, item, refetch }: { codeKey: string; item: CodebookItem; refetch: () => void }) {
  const [label, setLabel] = useState(item.label);
  const [busy, setBusy] = useState(false);
  useEffect(() => setLabel(item.label), [item.label]);

  async function rename() {
    const next = label.trim();
    if (!next || next === item.label) { setLabel(item.label); return; }
    setBusy(true);
    try {
      await api.put(`/codebooks/${codeKey}/${item.id}`, { label: next });
      toast.success("Položka přejmenována.");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Přejmenování selhalo.");
      setLabel(item.label);
    } finally {
      setBusy(false);
    }
  }
  async function toggle() {
    try {
      await api.put(`/codebooks/${codeKey}/${item.id}`, { active: !item.active });
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aktualizace položky selhala.");
    }
  }
  async function remove() {
    try {
      await api.del(`/codebooks/${codeKey}/${item.id}`);
      toast.success("Položka smazána.");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Smazání selhalo.");
    }
  }

  return (
    <li className="flex items-center gap-2 rounded-md border p-1.5">
      <Input
        value={label}
        disabled={busy}
        aria-label={`Název položky ${item.label}`}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={rename}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setLabel(item.label); }}
        className={`h-8 ${item.active ? "" : "text-muted-foreground line-through"}`}
      />
      <span className="hidden w-12 shrink-0 text-right text-xs text-muted-foreground sm:block">{item.active ? "aktivní" : "skrytá"}</span>
      <Switch checked={item.active} onCheckedChange={toggle} aria-label={`${item.active ? "Skrýt" : "Zobrazit"} ${item.label}`} />
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" aria-label={`Smazat ${item.label}`}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Smazat položku?</DialogTitle>
            <DialogDescription>
              „{item.label}“ se odebere z nabídky. Historické karty si hodnotu ponechají. Akci nelze vrátit — položku můžeš místo toho jen skrýt přepínačem.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Zrušit</Button></DialogClose>
            <DialogClose asChild><Button variant="destructive" onClick={remove}><Trash2 className="h-4 w-4" aria-hidden="true" /> Smazat</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

function MappingsTab() {
  const { data, loading, error, refetch } = useResource<{ mappings: FieldMapping[] }>("/mappings");
  const [rows, setRows] = useState<FieldMapping[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data) setRows(data.mappings); }, [data]);

  if (loading) return <Skeleton className="h-64" />;
  if (error || !data) return <ErrorState title="Mapování se nepodařilo načíst" message={error ?? undefined} onRetry={refetch} />;

  function set(i: number, patch: Partial<FieldMapping>) {
    setRows((r) => r.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }
  async function saveAll() {
    if (!data) return; // nikdy nepřepiš server prázdným polem, když se mapování nenačetlo
    setSaving(true);
    try {
      await api.put("/mappings", { mappings: rows });
      toast.success("Mapování polí uloženo.");
    } catch {
      toast.error("Uložení mapování selhalo.");
    } finally { setSaving(false); }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2"><ArrowLeftRight className="h-5 w-5 text-primary" aria-hidden="true" /> Mapování interních polí na Raynet</CardTitle>
          <CardDescription>Vazba interního pole na volitelné pole v Raynetu. Zapsaná jsou jen zapnutá pole. Aplikace pole v Raynetu nezakládá.</CardDescription>
        </div>
        <Button onClick={saveAll} disabled={saving}><Save className="h-4 w-4" aria-hidden="true" /> {saving ? "Ukládám…" : "Uložit mapování"}</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Segment</TableHead><TableHead>Interní pole</TableHead><TableHead>Volitelné pole v Raynetu</TableHead><TableHead>Skórované</TableHead><TableHead>Zápis</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m, i) => (
              <TableRow key={`${m.segment}_${m.internalField}`}>
                <TableCell><Badge variant="muted">{SEGMENT_LABEL[m.segment]}</Badge></TableCell>
                <TableCell className="font-medium">{m.internalLabel}</TableCell>
                <TableCell>
                  <Input value={m.raynetField} className="h-9 w-48 font-mono text-xs" onChange={(e) => set(i, { raynetField: e.target.value })} aria-label={`Raynet pole pro ${m.internalLabel}`} />
                </TableCell>
                <TableCell>{m.scored ? <Badge variant="ok">ano</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell><Switch checked={m.enabled} onCheckedChange={(v) => set(i, { enabled: v })} aria-label={`Zápis ${m.internalLabel}`} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SettingsTab() {
  const { data, loading, error, refetch } = useResource<{ settings: Settings }>("/settings");
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) setS(data.settings); }, [data]);

  if (loading) return <Skeleton className="h-64" />;
  if (error || !s) return <ErrorState title="Nastavení se nepodařilo načíst" message={error ?? undefined} onRetry={refetch} />;

  async function save() {
    if (!s) return;
    setSaving(true);
    try {
      await api.put("/settings", { settings: s });
      toast.success("Nastavení uloženo.");
    } catch {
      toast.error("Uložení nastavení selhalo.");
    } finally { setSaving(false); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-primary" aria-hidden="true" /> GPS ověření návštěv</CardTitle>
          <CardDescription>Toleranční okruh a preferovaný zdroj GPS dat.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Toleranční okruh (metry)" htmlFor="tol" help="Vzdálenost od adresy zákazníka, ve které se návštěva považuje za ověřenou.">
            <Input id="tol" type="number" value={s.toleranceMeters} onChange={(e) => setS({ ...s, toleranceMeters: Number(e.target.value) })} />
          </Field>
          <Field label="Preferovaný zdroj GPS" htmlFor="src" help="Logbookie (vozidla) nebo poloha zařízení z prohlížeče.">
            <Select value={s.gpsSource} onValueChange={(v) => setS({ ...s, gpsSource: v as Settings["gpsSource"] })}>
              <SelectTrigger id="src"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="logbookie">Logbookie (služební vozidla)</SelectItem>
                <SelectItem value="prohlizec">Poloha zařízení (prohlížeč)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-primary" aria-hidden="true" /> Pravidla karet a kvality</CardTitle>
          <CardDescription>Zastarávání, velikost příloh a měkká kontrola odpovědí.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Zastarávání karty (dny)" htmlFor="stale" help="Po kolika dnech bez aktualizace je karta zastaralá.">
            <Input id="stale" type="number" value={s.stalenessDays} onChange={(e) => setS({ ...s, stalenessDays: Number(e.target.value) })} />
          </Field>
          <Field label="Maximální velikost fotografie (MB)" htmlFor="att">
            <Input id="att" type="number" value={s.maxAttachmentMB} onChange={(e) => setS({ ...s, maxAttachmentMB: Number(e.target.value) })} />
          </Field>
          <Field label="Minimální délka textu" htmlFor="qmin" help="Kratší textové odpovědi dostanou quality flag.">
            <Input id="qmin" type="number" value={s.qualityMinLength} onChange={(e) => setS({ ...s, qualityMinLength: Number(e.target.value) })} />
          </Field>
          <Field label="Zástupné hodnoty (quality flag)" htmlFor="qtok" help="Oddělené čárkou. Tyto odpovědi se označí jako podezřelé.">
            <Input id="qtok" value={s.qualityTokens.join(", ")} onChange={(e) => setS({ ...s, qualityTokens: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
          </Field>
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <Button onClick={save} disabled={saving}><Save className="h-4 w-4" aria-hidden="true" /> {saving ? "Ukládám…" : "Uložit nastavení"}</Button>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, help, children }: { label: string; htmlFor: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
    </div>
  );
}
