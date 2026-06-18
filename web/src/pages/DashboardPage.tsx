import { Link } from "react-router-dom";
import { Search, FileEdit, Clock, AlertTriangle, FolderOpen, Layers, CheckCircle2, BarChart3, ArrowRight, MapPinOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/app/PageHeader";
import { StatTile } from "@/components/app/StatTile";
import { CardRow } from "@/components/app/CardRow";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Card as CardType } from "@/lib/types";

interface OverviewResp {
  totals: { cards: number; complete: number; drafts: number; stale: number; withQualityFlags: number; qualityFlagCount: number };
  bySegment: { segment: string; label: string; total: number; complete: number; drafts: number; avgCompleteness: number }[];
}

export function DashboardPage() {
  const { user } = useAuth();
  const isManager = user!.role !== "obchodnik";

  return (
    <>
      <PageHeader
        eyebrow={`Vítej, ${user!.name.split(" ")[0]}`}
        title="Přehled"
        description={isManager
          ? "Stav vyplněnosti, rizika a terénní aktivita napříč obchodním týmem."
          : "Tvoje rozpracované a zastaralé karty potenciálu na jednom místě."}
        actions={
          <Button asChild>
            <Link to="/vyhledat"><Search className="h-4 w-4" aria-hidden="true" /> Vyhledat firmu</Link>
          </Button>
        }
      />
      {isManager ? <ManagerDashboard /> : <RepDashboard />}
    </>
  );
}

function RepDashboard() {
  const { data, loading } = useResource<{ cards: CardType[] }>("/cards");
  const cards = data?.cards ?? [];
  const drafts = cards.filter((c) => c.status === "draft");
  const stale = cards.filter((c) => c.stale);
  const quality = cards.filter((c) => c.qualityFlags.length > 0);
  const recent = [...cards].slice(0, 6);

  if (loading) return <LoadingGrid />;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={FolderOpen} label="Moje karty" value={cards.length} />
        <StatTile icon={FileEdit} label="Rozpracované (drafty)" value={drafts.length} />
        <StatTile icon={Clock} label="Zastaralé" value={stale.length} hint="déle než nastavený limit" />
        <StatTile icon={AlertTriangle} label="S quality flagy" value={quality.length} accent />
      </div>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold">Poslední úpravy</h2>
        {recent.length === 0 ? (
          <EmptyState icon={Layers} title="Zatím nemáš žádné karty"
            description="Najdi firmu v Raynetu a založ její první kartu potenciálu."
            action={<Button asChild><Link to="/vyhledat"><Search className="h-4 w-4" aria-hidden="true" /> Vyhledat firmu</Link></Button>} />
        ) : (
          <div className="space-y-3">{recent.map((c) => <CardRow key={c.id} card={c} />)}</div>
        )}
      </section>

      {stale.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-bold">Vyžaduje aktualizaci</h2>
          <div className="space-y-3">{stale.map((c) => <CardRow key={c.id} card={c} />)}</div>
        </section>
      )}
    </div>
  );
}

function ManagerDashboard() {
  const overview = useResource<OverviewResp>("/reports/overview");
  const { data, loading } = useResource<{ cards: CardType[] }>("/cards?stale=1");
  const t = overview.data?.totals;

  if (overview.loading || loading) return <LoadingGrid />;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={FolderOpen} label="Karty celkem" value={t?.cards ?? 0} />
        <StatTile icon={CheckCircle2} label="Kompletní" value={t?.complete ?? 0} hint={`${t?.drafts ?? 0} draftů`} />
        <StatTile icon={Clock} label="Zastaralé" value={t?.stale ?? 0} />
        <StatTile icon={AlertTriangle} label="Karty s quality flagy" value={t?.withQualityFlags ?? 0} accent />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Vyplněnost podle segmentu</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/reporting">Reporting <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {overview.data?.bySegment.map((s) => (
              <div key={s.segment}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{s.label}</span>
                  <span className="text-muted-foreground">{s.complete}/{s.total} kompletních · ⌀ {s.avgCompleteness} %</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-secondary" style={{ width: `${s.avgCompleteness}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPinOff className="h-5 w-5 text-primary" aria-hidden="true" /> Zastaralé karty</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.cards.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Žádné karty po termínu aktualizace. Skvělá práce týmu.</p>
            ) : (
              <div className="space-y-3">{data?.cards.slice(0, 4).map((c) => <CardRow key={c.id} card={c} />)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg bg-accent/10 p-6">
        <div className="flex items-center gap-2 text-accent-foreground">
          <BarChart3 className="h-5 w-5" aria-hidden="true" />
          <p className="font-bold">Potřebuješ hlubší rozpad?</p>
        </div>
        <p className="mt-1 text-sm text-accent-foreground/80">Reporting nabízí tendry podle období, terénní aktivitu s GPS, kvalitu dat a CSV export.</p>
        <Button asChild variant="accent" className="mt-4">
          <Link to="/reporting">Otevřít reporting <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </Button>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
    </div>
  );
}
