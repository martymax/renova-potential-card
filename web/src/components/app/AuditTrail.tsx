import { History, Plus, Save, CheckCircle2, RefreshCw, Pencil } from "lucide-react";
import { formatDateTime } from "@/lib/labels";
import type { AuditEntry } from "@/lib/types";

const ACTION_ICON: Record<string, typeof Pencil> = {
  create: Plus,
  update: Pencil,
  save_draft: Save,
  save_complete: CheckCircle2,
  sync: RefreshCw,
};

/** Audit změn — kdo, kdy a co změnil (§7.6). */
export function AuditTrail({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
        <History className="h-6 w-6" aria-hidden="true" />
        <p>Zatím žádné změny. Historie se začne plnit po prvním uložení.</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-5 border-l border-border pl-6">
      {entries.map((e) => {
        const Icon = ACTION_ICON[e.action] ?? Pencil;
        return (
          <li key={e.id} className="relative">
            <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border bg-background">
              <Icon className="h-3 w-3 text-primary" aria-hidden="true" />
            </span>
            <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-medium">{e.fieldLabel ?? "Změna"}</span>
              {e.field && e.oldValue !== undefined ? (
                <span className="text-muted-foreground">
                  <span className="line-through">{String(e.oldValue)}</span> → <span className="text-foreground">{String(e.newValue)}</span>
                </span>
              ) : e.newValue !== undefined ? (
                <span className="text-muted-foreground">{String(e.newValue)}</span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{e.userName} · {formatDateTime(e.at)}</p>
          </li>
        );
      })}
    </ol>
  );
}
