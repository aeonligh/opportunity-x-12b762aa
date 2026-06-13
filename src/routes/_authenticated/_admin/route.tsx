import { createFileRoute, Outlet, Link, redirect } from "@tanstack/react-router";
import { isAdmin } from "@/lib/admin.functions";
import { Shield, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: async () => {
    try {
      const res = await isAdmin();
      if (!res?.admin) throw redirect({ to: "/dashboard" });
    } catch {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/70 backdrop-blur-xl flex items-center justify-between px-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-text-s hover:text-foreground">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <div className="inline-flex items-center gap-2 text-sm font-bold">
          <Shield size={14} className="text-accent" /> Admin
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/admin/queue" className="px-3 py-1.5 text-xs font-semibold rounded-lg text-text-s hover:text-foreground [&.active]:text-accent" activeProps={{ className: "active" }}>
            Queue
          </Link>
          <Link to="/admin/featured" className="px-3 py-1.5 text-xs font-semibold rounded-lg text-text-s hover:text-foreground" activeProps={{ className: "text-accent" }}>
            Featured
          </Link>
          <Link to="/admin/analytics" className="px-3 py-1.5 text-xs font-semibold rounded-lg text-text-s hover:text-foreground" activeProps={{ className: "text-accent" }}>
            Analytics
          </Link>
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
