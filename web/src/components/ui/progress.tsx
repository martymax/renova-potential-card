import * as React from "react";
import { cn } from "@/lib/utils";

/** Vyplněnost karty (0–100). Barvu lze řídit přes `indicatorClassName`. */
export function Progress({
  value = 0,
  className,
  indicatorClassName,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value?: number; indicatorClassName?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <div
        className={cn("h-full rounded-full bg-secondary transition-all", indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
