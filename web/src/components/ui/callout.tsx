import * as React from "react";
import { cn } from "@/lib/utils";

/* Callout — jemné akcentní pozadí (gold) s tmavým text-accent-foreground.
   Gold NIKDY jako barva textu na světlém pozadí — jen výplň. */
export interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  size?: "sm" | "md";
}

export function Callout({ title, size = "md", className, children, ...props }: CalloutProps) {
  return (
    <div className={cn("rounded-lg bg-accent/10", size === "sm" ? "p-4" : "p-6", className)} {...props}>
      {title ? <p className="font-bold text-accent-foreground">{title}</p> : null}
      <div className={cn("text-accent-foreground/80", title && "mt-1")}>{children}</div>
    </div>
  );
}
