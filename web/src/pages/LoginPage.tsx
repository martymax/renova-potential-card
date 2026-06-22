import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPinned, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO = [
  { username: "obchodnik", label: "Obchodník" },
  { username: "reditel", label: "Obchodní ředitel" },
  { username: "admin", label: "Admin" },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Přihlášení se nezdařilo. Zkus to prosím znovu.");
    } finally {
      setBusy(false);
    }
  }

  function quick(u: string) {
    setUsername(u);
    setPassword(u);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
            <MapPinned className="h-5 w-5 text-accent" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">RENOVA, s.r.o.</p>
            <p className="font-display text-xl font-bold leading-tight">Karta potenciálu</p>
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold">Přihlášení</h1>
        <p className="mt-1 text-sm text-muted-foreground">Účty se synchronizují z Raynetu.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Uživatelské jméno</Label>
            <Input id="username" value={username} autoComplete="username" autoFocus
              onChange={(e) => setUsername(e.target.value)} placeholder="napr. obchodnik" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Heslo</Label>
            <Input id="password" type="password" value={password} autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </div>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Přihlašuji…" : "Přihlásit se"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>

        <div className="mt-8 border-t pt-5">
          <p className="text-xs text-muted-foreground">Demo přístupy — heslo je shodné s uživatelským jménem.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEMO.map((d) => (
              <button key={d.username} type="button" onClick={() => quick(d.username)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
