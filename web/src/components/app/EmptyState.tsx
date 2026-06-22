import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Prázdný stav = výzva k akci, ne jen „nic tu není". */
export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 py-14 text-center">
      <span className="inline-flex rounded-full bg-primary/10 p-3">
        <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
      </span>
      <p className="mt-4 font-medium">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
