import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, Shield, CheckCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/execution.functions";
import { isAdmin } from "@/lib/admin.functions";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { toast } from "sonner";
import ThemeToggle from "./ThemeToggle";
import { BrandMark } from "./BrandMark";

export default function Header() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationsFn = useServerFn(getNotifications);
  const markReadFn = useServerFn(markNotificationRead);
  const markAllReadFn = useServerFn(markAllNotificationsRead);
  const adminFn = useServerFn(isAdmin);

  const { data: admin } = useQuery({
    queryKey: ["isAdmin"],
    queryFn: () => adminFn(),
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotificationsFn(),
    refetchInterval: 15000, // Poll every 15s for new notifications
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markReadFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => markAllReadFn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/70 backdrop-blur-xl flex items-center justify-between px-6">
      <Link
        to="/"
        className="flex items-center gap-2.5 hover:opacity-95 transition"
        aria-label="Opportunity X home"
      >
        <BrandMark size={26} className="text-accent shrink-0" />
        <span className="flex flex-col leading-tight">
          <span className="font-mono text-lg font-bold tracking-tighter">
            OPPORTUNITY <span className="text-accent">X</span>
          </span>
          <span className="text-[9px] uppercase tracking-widest text-text-s">
            Opportunity Intelligence
          </span>
        </span>
      </Link>

      <nav className="flex items-center gap-1 md:gap-2">
        <Link
          to="/dashboard"
          activeProps={{ className: "text-accent bg-accent/5 border border-accent/20" }}
          inactiveProps={{
            className: "text-text-s hover:text-foreground border border-transparent",
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition"
        >
          Discover
        </Link>
        <Link
          to="/search"
          activeProps={{ className: "text-accent bg-accent/5 border border-accent/20" }}
          inactiveProps={{
            className: "text-text-s hover:text-foreground border border-transparent",
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition"
        >
          Live Search
        </Link>
        <Link
          to="/dashboard/applications"
          activeProps={{ className: "text-accent bg-accent/5 border border-accent/20" }}
          inactiveProps={{
            className: "text-text-s hover:text-foreground border border-transparent",
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition"
        >
          Tracker
        </Link>
        <Link
          to="/dashboard/documents"
          activeProps={{ className: "text-accent bg-accent/5 border border-accent/20" }}
          inactiveProps={{
            className: "text-text-s hover:text-foreground border border-transparent",
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition"
        >
          Vault
        </Link>
        <Link
          to="/vault"
          activeProps={{ className: "text-accent bg-accent/5 border border-accent/20" }}
          inactiveProps={{
            className: "text-text-s hover:text-foreground border border-transparent",
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition"
        >
          Saved
        </Link>
        <Link
          to="/onboarding"
          activeProps={{ className: "text-accent bg-accent/5 border border-accent/20" }}
          inactiveProps={{
            className: "text-text-s hover:text-foreground border border-transparent",
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition"
        >
          Profile
        </Link>

        {admin?.admin && (
          <Link
            to="/admin/queue"
            activeProps={{ className: "text-accent bg-accent/5 border border-accent/20" }}
            inactiveProps={{
              className: "text-text-s hover:text-foreground border border-transparent",
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1 transition"
          >
            <Shield size={12} /> Admin
          </Link>
        )}
      </nav>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        {/* Notifications Popover */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative p-2 rounded-xl bg-surface/80 border border-border text-text-s hover:text-foreground hover:border-accent/40 transition"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-accent text-[9px] font-black text-background animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 bg-surface/90 backdrop-blur-xl border border-border rounded-2xl shadow-xl z-50">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="text-xs font-bold font-mono tracking-wider uppercase">
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  className="text-[10px] text-accent hover:underline flex items-center gap-1 font-semibold"
                >
                  {markAllRead.isPending ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <CheckCheck size={10} />
                  )}
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-text-s flex justify-center">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-s">No notifications yet.</div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.read && markRead.mutate(n.id)}
                      className={`p-3.5 text-left transition cursor-pointer hover:bg-background/40 ${!n.read ? "bg-accent/5 border-l-2 border-accent" : ""}`}
                    >
                      <h4 className="text-xs font-bold text-foreground mb-0.5">{n.title}</h4>
                      <p className="text-[11px] text-text-s leading-snug">{n.message}</p>
                      <span className="text-[9px] text-text-s/50 block mt-1 font-mono">
                        {new Date(n.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Logout */}
        <button
          onClick={signOut}
          title="Sign out"
          className="p-2 rounded-xl bg-surface/80 border border-border text-text-s hover:text-foreground hover:border-destructive/40 hover:text-destructive transition"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
