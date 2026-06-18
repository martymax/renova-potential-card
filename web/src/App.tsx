import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/app/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SearchPage } from "@/pages/SearchPage";
import { CompanyPage } from "@/pages/CompanyPage";
import { CardPage } from "@/pages/CardPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { AdminPage } from "@/pages/AdminPage";
import type { Role } from "@/lib/types";

function BrandSplash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-primary to-secondary">
      <div className="font-display text-2xl font-bold text-primary-foreground geometric-pulse">Karta potenciálu</div>
    </div>
  );
}

function Protected({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <BrandSplash />;
  if (!user) return <Navigate to="/prihlaseni" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/prihlaseni"
        element={loading ? <BrandSplash /> : user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/" element={<Protected><DashboardPage /></Protected>} />
      <Route path="/vyhledat" element={<Protected><SearchPage /></Protected>} />
      <Route path="/firma/:id" element={<Protected><CompanyPage /></Protected>} />
      <Route path="/karta/:id" element={<Protected><CardPage /></Protected>} />
      <Route path="/reporting" element={<Protected roles={["reditel", "admin"]}><ReportsPage /></Protected>} />
      <Route path="/administrace" element={<Protected roles={["admin"]}><AdminPage /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
