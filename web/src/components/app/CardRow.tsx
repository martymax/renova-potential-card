import { Link } from "react-router-dom";
import { ChevronRight, Building2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { StatusBadge, StaleBadge, QualityBadge, GpsBadge } from "@/components/app/StatusBadges";
import { SEGMENT_LABEL, formatDate } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Card } from "@/lib/types";

/** Klikací řádek karty potenciálu — používá dashboard, firma i výsledky hledání. */
export function CardRow({ card }: { card: Card }) {
  return (
    <Link
      to={`/karta/${card.id}`}
      className="group flex items-center gap-4 rounded-lg border border-l-4 border-l-transparent bg-card p-4 transition-colors hover:border-l-primary hover:bg-muted/40"
    >
      <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:flex">
        <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{card.companyName}</p>
          <StatusBadge status={card.status} />
          <StaleBadge stale={card.stale} />
          <QualityBadge count={card.qualityFlags.length} />
          {card.gps ? <GpsBadge status={card.gps.status} /> : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {SEGMENT_LABEL[card.segment]} · {card.createdByName} · aktualizováno {formatDate(card.updatedAt)}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Progress value={card.completeness}
            indicatorClassName={cn(card.completeness === 100 ? "bg-primary" : "bg-secondary")}
            className="max-w-[160px]" />
          <span className="text-xs font-medium text-muted-foreground">{card.completeness} %</span>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}
