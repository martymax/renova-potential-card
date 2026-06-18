import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/* FeatureCard — Simon Says: Card s levým akcentem (border-l-4 border-l-primary),
   ikona v boxu (bg-primary/10), popis text-muted-foreground. */
export interface FeatureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  hoverElevate?: boolean;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  hoverElevate = false,
  className,
  children,
  ...props
}: FeatureCardProps) {
  return (
    <Card
      className={cn("border-l-4 border-l-primary", hoverElevate && "transition-shadow hover:shadow-lg", className)}
      {...props}
    >
      <CardHeader>
        {Icon ? (
          <div className="mb-2 inline-flex w-fit rounded-lg bg-primary/10 p-2">
            <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
        ) : null}
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription className="text-sm leading-relaxed">{description}</CardDescription> : null}
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}
