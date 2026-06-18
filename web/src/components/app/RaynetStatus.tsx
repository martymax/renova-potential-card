import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Drobný indikátor stavu napojení na Raynet (test připojení §9.3). */
export function RaynetStatus() {
  const [state, setState] = useState<"loading" | "ok" | "down">("loading");
  const [instance, setInstance] = useState<string>("");

  useEffect(() => {
    let active = true;
    api
      .get<{ ok: boolean; instance: string }>("/raynet/ping")
      .then((d) => {
        if (!active) return;
        setState(d.ok ? "ok" : "down");
        setInstance(d.instance);
      })
      .catch(() => active && setState("down"));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          state === "ok" ? "bg-secondary" : state === "down" ? "bg-destructive" : "bg-muted-foreground/40",
        )}
        aria-hidden="true"
      />
      <span>
        Raynet:{" "}
        {state === "loading" ? "ověřuji…" : state === "ok" ? `připojeno (${instance})` : "nedostupný"}
      </span>
    </div>
  );
}
