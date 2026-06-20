import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Building2, ArrowRight, Info, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SEGMENT_LABEL } from "@/lib/labels";
import type { Company, SegmentKey } from "@/lib/types";

export function SearchPage() {
  const [q, setQ] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      setLoading(true);
      api
        .get<{ companies: Company[] }>(`/raynet/companies?q=${encodeURIComponent(q)}`)
        .then((d) => { if (!cancelled) { setCompanies(d.companies); setError(null); } })
        .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Vyhledávání selhalo."); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [q]);

  return (
    <>
      <PageHeader
        eyebrow="Zdroj zákazníků: Raynet"
        title="Vyhledat firmu"
        description="Najdi zákazníka podle názvu nebo IČO. Vyhledávání běží nad Raynetem; aplikace nezakládá nové firmy."
      />

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" autoFocus
          placeholder="Název firmy nebo IČO…" aria-label="Vyhledat firmu v Raynetu" />
      </div>

      <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>Firma musí nejdřív existovat v Raynetu. Pokud zákazníka nenajdeš, založ ho v Raynetu a teprve poté vyplň Kartu potenciálu.</p>
      </div>

      <div className="mt-8 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : error ? (
          <EmptyState icon={Building2} title="Raynet je dočasně nedostupný" description={error} />
        ) : companies.length === 0 ? (
          <EmptyState icon={Search} title="Žádná firma neodpovídá hledání" description="Zkus jiný název nebo IČO. Vyhledávání probíhá v Raynetu." />
        ) : (
          companies.map((c) => <CompanyResult key={c.id} company={c} />)
        )}
      </div>
    </>
  );
}

function CompanyResult({ company }: { company: Company }) {
  return (
    <Card className="transition-colors hover:bg-muted/40">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="font-medium">{company.name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">IČO {company.ico} · {company.address}, {company.city}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {company.segmentHint ? (
                <Badge variant="muted"><MapPin className="h-3 w-3" aria-hidden="true" /> {SEGMENT_LABEL[company.segmentHint as SegmentKey] ?? company.segmentHint}</Badge>
              ) : (
                <Badge variant="outline">Segment z Raynetu neznámý</Badge>
              )}
              {typeof company.optionalFields?.pocet_odbernych_mist === "number" ? (
                <Badge variant="outline">{company.optionalFields.pocet_odbernych_mist as number} odběrných míst</Badge>
              ) : null}
            </div>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link to={`/firma/${company.id}`}>Otevřít <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}
