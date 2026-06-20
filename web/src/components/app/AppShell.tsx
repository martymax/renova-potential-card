import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Search, BarChart3, Settings2, LogOut, Menu, X, Moon, Sun, MapPinned,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RaynetStatus } from "@/components/app/RaynetStatus";
import type { Role } from "@/lib/types";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
}

const NAV: NavItem[] = [
  { to: "/", label: "Přehled", icon: LayoutDashboard },
  { to: "/vyhledat", label: "Vyhledat firmu", icon: Search },
  { to: "/reporting", label: "Reporting", icon: BarChart3, roles: ["reditel", "admin"] },
  { to: "/administrace", label: "Administrace", icon: Settings2, roles: ["admin"] },
];

function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.filter((n) => !n.roles || n.roles.includes(role)).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md border-l-4 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-l-primary bg-primary/10 text-primary"
                : "border-l-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
            )
          }
        >
          <item.icon className="h-4 w-4" aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/" className="block">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary px-5 py-6">
        <div aria-hidden="true" className="geometric-rotate pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-2xl border border-primary-foreground/10" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary-foreground">
            <MapPinned className="h-5 w-5 text-accent" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">RENOVA, s.r.o.</span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold leading-tight text-primary-foreground">Karta potenciálu</p>
        </div>
      </div>
    </Link>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    </Button>
  );
}

function SidebarFooter() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div className="mt-auto border-t p-3">
      <RaynetStatus />
      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-muted/50 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <Badge variant="muted" className="mt-1">{ROLE_LABEL[user.role]}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="icon" aria-label="Odhlásit se" onClick={logout}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  // Escape zavře mobilní menu (modal a11y).
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <Brand />
        <div className="mt-4 flex flex-1 flex-col overflow-y-auto pb-4">
          <NavLinks role={user.role} />
          <SidebarFooter />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
        <Button variant="ghost" size="icon" aria-label="Otevřít menu" onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
        <span className="font-display text-lg font-bold">Karta potenciálu</span>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="Hlavní menu"
            className="absolute left-0 top-0 flex h-full w-72 flex-col bg-sidebar shadow-xl">
            <div className="flex items-center justify-between">
              <Brand />
              <Button variant="ghost" size="icon" aria-label="Zavřít menu" className="mr-2" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>
            <div className="mt-4 flex flex-1 flex-col overflow-y-auto pb-4">
              <NavLinks role={user.role} onNavigate={() => setMobileOpen(false)} />
              <SidebarFooter />
            </div>
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
