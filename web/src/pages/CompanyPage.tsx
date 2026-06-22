import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Building2, Mail, Phone, User, ExternalLink, Plus, FileText, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/app/PageHeader";
import { CardRow } from "@/components/app/CardRow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SEGMENT_LABEL } from "@/lib/labels";
import type { Card as CardType, Company, SegmentDef, SegmentKey } from "@/lib/types";

export function CompanyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const company = useResource<{ company: Company }>(`/raynet/companies/${id}`);
  const cards = useResource<{ cards: CardType[] }>(`/cards?companyId=${id}`);
  const segments = useResource<{ segments: SegmentDef[] }>("/segments");
  const [creating, setCreating] = useState<SegmentKey | null>(null);

  async function openCard(segment: SegmentKey) {
    setCreating(segment);
    try {
      const d = await api.post<{ card: CardType; created: boolean }>("/cards", { raynetCompanyId: Number(id), segment });
      toast.success(d.created ? "Karta potenciálu založena." : "Otevírám existující kartu.");
      navigate(`/karta/${d.card.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kartu se nepodařilo otevřít.");
      setCreating(null);
    }
  }

  if (company.loading) return <Skeleton className="h-64" />;
  if (company.error || !company.data) {
    return <PageHeader title="Firma nenalezena" description="Tato firma není v Raynetu dostupná." />;
  }

  const c = company.data.company;
  const existing = cards.data?.cards ?? [];
  const existingSegments = new Set(existing.map((x) => x.segment));
  const hint = c.segmentHint as SegmentKey | undefined;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/vyhledat"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Zpět na hledání</Link>
      </Button>

      <PageHeader
        eyebrow="Firma z Raynetu"
        title={c.name}
        description={`IČO ${c.ico} · ${c.address}, ${c.city}`}
        actions={
          <Button variant="outline" asChild>
            <a href={`https://renova.raynet.cz/company/${c.id}`} target="_blank" rel="noreferrer">
              Otevřít v Raynetu <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" aria-hidden="true" /> Kontakt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> {c.contactName}</div>
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> <a className="hover:text-primary" href={`mailto:${c.contactEmail}`}>{c.contactEmail}</a></div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> {c.contactPhone}</div>
            {hint ? (
              <div className="mt-4 rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Segment dohledaný z Raynetu</p>
                <Badge variant="muted" className="mt-1"><Sparkles className="h-3 w-3" aria-hidden="true" /> {SEGMENT_LABEL[hint]}</Badge>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="mb-3 font-display text-xl font-bold">Karty potenciálu</h2>
            {existing.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                Tato firma zatím nemá žádnou kartu. Vyber segment a založ první.
              </p>
            ) : (
              <div className="space-y-3">{existing.map((card) => <CardRow key={card.id} card={card} />)}</div>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl font-bold">Založit kartu podle segmentu</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Jeden zákazník může mít výjimečně více karet, pokud spadá do více segmentů (např. správce i konkrétní SVJ).
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {(segments.data?.segments ?? []).map((s) => {
                const has = existingSegments.has(s.key);
                const recommended = hint === s.key;
                return (
                  <Card key={s.key} className={recommended ? "border-l-4 border-l-accent" : "border-l-4 border-l-primary"}>
                    <CardHeader>
                      <CardTitle className="text-base">{s.label}</CardTitle>
                      <CardDescription>{s.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant={has ? "outline" : recommended ? "accent" : "default"}
                        className="w-full"
                        disabled={creating !== null}
                        onClick={() => openCard(s.key)}
                      >
                        {has ? <><FileText className="h-4 w-4" aria-hidden="true" /> Otevřít kartu</> : <><Plus className="h-4 w-4" aria-hidden="true" /> Založit kartu</>}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
