import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}

/** KPI dlaždice. `accent` zvýrazní jeden zlatý moment na obrazovku — používej max. jednou. */
export function StatTile({ icon: Icon, label, value, hint, accent }: Props) {
  return (
    <Card className={cn("border-l-4", accent ? "border-l-accent" : "border-l-primary")}>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-3xl font-bold">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className={cn("inline-flex rounded-lg p-2", accent ? "bg-accent/15" : "bg-primary/10")}>
          <Icon className={cn("h-6 w-6", accent ? "text-accent-foreground" : "text-primary")} aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
}
