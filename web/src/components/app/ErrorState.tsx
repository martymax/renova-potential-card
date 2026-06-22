import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Chybový stav načítání s možností opakování — ať se selhání netváří jako loading. */
export function ErrorState({ title, message, onRetry }: { title: string; message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <span className="inline-flex rounded-full bg-destructive/10 p-3">
        <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
      </span>
      <p className="mt-4 font-medium">{title}</p>
      {message ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p> : null}
      {onRetry ? (
        <Button variant="outline" className="mt-5" onClick={onRetry}>Zkusit znovu</Button>
      ) : null}
    </div>
  );
}
