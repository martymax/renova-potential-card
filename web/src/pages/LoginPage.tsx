import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPinned, ArrowRight, ShieldCheck, Layers, BarChart3 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO = [
  { username: "obchodnik", label: "Obchodník", note: "vlastní karty, terénní práce" },
  { username: "reditel", label: "Obchodní ředitel", note: "reporting a kontrola" },
  { username: "admin", label: "Admin", note: "číselníky, mapování, GPS" },
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
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Levý panel — značkový gradient (signature moment) */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary p-12 lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="geometric-float pointer-events-none absolute -left-16 top-24 h-72 w-72 rounded-full border border-primary-foreground/10" />
        <div aria-hidden="true" className="geometric-rotate pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-3xl border border-primary-foreground/10" />

        <div className="relative flex items-center gap-2 text-primary-foreground">
          <MapPinned className="h-6 w-6 text-accent" aria-hidden="true" />
          <span className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/80">RENOVA, s.r.o.</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-display text-5xl font-bold leading-tight text-primary-foreground">
            Obchodní potenciál na jednom místě.
          </h1>
          <p className="mt-5 text-lg text-primary-foreground/90">
            Segmentově řízené karty nad Raynetem. Méně přepisování, lepší data, jasná kontrola terénní práce.
          </p>
          <ul className="mt-8 space-y-3 text-primary-foreground/90">
            {[
              { icon: Layers, text: "Tři segmentové formuláře: vodárny, správci, SVJ" },
              { icon: ShieldCheck, text: "Ověření osobní návštěvy přes GPS" },
              { icon: BarChart3, text: "Reporting vyplněnosti, kvality a tendrů" },
            ].map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                <span className="inline-flex rounded-lg bg-primary-foreground/10 p-2"><f.icon className="h-5 w-5 text-accent" aria-hidden="true" /></span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-primary-foreground/70">Implementace: Simon Says · nad CRM Raynet</p>
      </div>

      {/* Pravý panel — přihlášení */}
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2 text-secondary">
              <MapPinned className="h-6 w-6" aria-hidden="true" />
              <span className="text-sm font-semibold uppercase tracking-widest">RENOVA, s.r.o.</span>
            </div>
          </div>

          <h2 className="font-display text-3xl font-bold">Přihlášení</h2>
          <p className="mt-2 text-sm text-muted-foreground">Účty se synchronizují z Raynetu. Použij firemní jméno a heslo.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
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

          <div className="mt-8 rounded-lg bg-accent/10 p-4">
            <p className="text-sm font-bold text-accent-foreground">Demo přístupy</p>
            <p className="mt-1 text-xs text-accent-foreground/80">Heslo je shodné s uživatelským jménem. Klikni pro předvyplnění.</p>
            <div className="mt-3 grid gap-2">
              {DEMO.map((d) => (
                <button key={d.username} type="button" onClick={() => quick(d.username)}
                  className="flex items-center justify-between rounded-md border border-accent-foreground/15 bg-background/60 px-3 py-2 text-left text-sm transition-colors hover:bg-background">
                  <span className="font-medium">{d.label}</span>
                  <span className="text-xs text-muted-foreground">{d.username} · {d.note}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
