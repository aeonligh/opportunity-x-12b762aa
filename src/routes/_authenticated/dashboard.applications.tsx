import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getUserApplications,
  trackApplication,
  deleteApplication,
} from "@/lib/execution.functions";
import Header from "@/components/Header";
import {
  Briefcase,
  MapPin,
  Calendar,
  Trash2,
  ChevronRight,
  MessageSquare,
  Check,
  TrendingUp,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { WhatsAppIcon } from "@/components/ShareToWhatsApp";

export const Route = createFileRoute("/_authenticated/dashboard/applications")({
  head: () => ({ meta: [{ title: "My Applications — Opportunity X" }] }),
  component: ApplicationsPipeline,
});

const STATUS_COLUMNS = [
  { key: "Interested", label: "Interested", color: "border-text-s/30 bg-surface/40 text-text-s" },
  { key: "Preparing", label: "Preparing", color: "border-accent/40 bg-accent/5 text-accent" },
  {
    key: "Submitted",
    label: "Submitted",
    color:
      "border-[oklch(0.85_0.20_150)]/40 bg-[oklch(0.85_0.20_150)]/5 text-[oklch(0.85_0.20_150)]",
  },
  {
    key: "Interview",
    label: "Interviewing",
    color: "border-[oklch(0.88_0.18_95)]/40 bg-[oklch(0.88_0.18_95)]/5 text-[oklch(0.88_0.18_95)]",
  },
  {
    key: "Accepted",
    label: "Accepted",
    color:
      "border-[oklch(0.72_0.17_152)]/40 bg-[oklch(0.72_0.17_152)]/5 text-[oklch(0.72_0.17_152)] font-black",
  },
  {
    key: "Rejected",
    label: "Rejected",
    color: "border-destructive/40 bg-destructive/5 text-destructive",
  },
] as const;

type ApplicationStatus = (typeof STATUS_COLUMNS)[number]["key"];

function ApplicationsPipeline() {
  const queryClient = useQueryClient();
  const getAppsFn = useServerFn(getUserApplications);
  const trackAppFn = useServerFn(trackApplication);
  const deleteAppFn = useServerFn(deleteApplication);

  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [notesInput, setNotesInput] = useState("");
  const [isUpdatingNotes, setIsUpdatingNotes] = useState(false);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: () => getAppsFn(),
  });

  const updateStatus = useMutation({
    mutationFn: ({
      opportunityId,
      status,
      notes,
    }: {
      opportunityId: string;
      status: ApplicationStatus;
      notes?: string;
    }) => trackAppFn({ data: { opportunityId, status, notes } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["successMetrics"] });
      toast.success("Status updated successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const removeTracking = useMutation({
    mutationFn: (opportunityId: string) => deleteAppFn({ data: { opportunityId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["successMetrics"] });
      setSelectedApp(null);
      toast.success("Stopped tracking opportunity");
    },
    onError: (err) => toast.error(err.message),
  });

  const saveNotes = async () => {
    if (!selectedApp) return;
    setIsUpdatingNotes(true);
    try {
      await trackAppFn({
        data: {
          opportunityId: selectedApp.opportunity_id,
          status: selectedApp.status,
          notes: notesInput,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setSelectedApp((prev: any) => ({ ...prev, notes: notesInput }));
      toast.success("Notes saved");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUpdatingNotes(false);
    }
  };

  const handleShareProgress = (app: any) => {
    const opp = app.opportunity;
    const COMMUNITY_INVITE = "https://chat.whatsapp.com/JGZehs9fzCfEsLmXZYCXej";
    const msg = [
      "🚀 APPLICATION UPDATE",
      "",
      `I'm currently tracking my application to "${opp.title}" on Opportunity X!`,
      `📍 Status: ${app.status}`,
      "",
      "📣 Shared via Opportunity X",
      "🚀 Join Opportunity X Early Access Hub",
      COMMUNITY_INVITE,
    ].join("\n");

    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleShareSuccess = (app: any) => {
    const opp = app.opportunity;
    const COMMUNITY_INVITE = "https://chat.whatsapp.com/JGZehs9fzCfEsLmXZYCXej";
    const msg = [
      "🎉 APPLICATION WIN!",
      "",
      `I'm thrilled to share that I have been ACCEPTED to "${opp.title}"! 🏆`,
      "Prepared, tracked, and won using Opportunity X!",
      "",
      "📣 Shared via Opportunity X",
      "🚀 Join Opportunity X Early Access Hub",
      COMMUNITY_INVITE,
    ].join("\n");

    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  // Group applications by status
  const groupedApps = STATUS_COLUMNS.reduce(
    (acc, col) => {
      acc[col.key] = applications.filter((app: any) => app.status === col.key);
      return acc;
    },
    {} as Record<ApplicationStatus, any[]>,
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full flex flex-col">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
              <TrendingUp className="text-accent" size={24} /> Application Pipeline
            </h1>
            <p className="text-xs text-text-s">
              Manage your opportunity lifecycle visually. Drag or select statuses to monitor your
              wins.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="w-fit inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:opacity-90 transition"
          >
            Find Opportunities
          </Link>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-accent" size={32} />
          </div>
        ) : applications.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-2xl bg-surface/30">
            <Briefcase className="text-text-s mb-4" size={48} />
            <h3 className="text-base font-bold mb-1">Your pipeline is empty</h3>
            <p className="text-xs text-text-s max-w-xs mb-6">
              Track your first opportunity to visualize your progress.
            </p>
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 transition"
            >
              Start Discovering
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-start flex-1 overflow-x-auto pb-4">
            {STATUS_COLUMNS.map((col) => {
              const colApps = groupedApps[col.key] || [];
              return (
                <div
                  key={col.key}
                  className="rounded-2xl border border-border/80 bg-surface/40 p-4 flex flex-col gap-3 min-h-[300px] lg:min-h-[500px]"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider rounded-md border ${col.color}`}
                    >
                      {col.label}
                    </span>
                    <span className="text-[10px] font-mono text-text-s font-bold">
                      {colApps.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5 flex-1">
                    {colApps.map((app) => (
                      <motion.div
                        key={app.id}
                        layoutId={app.id}
                        onClick={() => {
                          setSelectedApp(app);
                          setNotesInput(app.notes || "");
                        }}
                        className="p-3.5 rounded-xl border border-border bg-surface hover:border-accent/40 cursor-pointer transition flex flex-col gap-2"
                      >
                        <h4 className="text-xs font-bold leading-snug line-clamp-2">
                          {app.opportunity.title}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-text-s">
                          <span className="truncate max-w-[80px]">
                            {app.opportunity.organization}
                          </span>
                          {app.opportunity.deadline && (
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar size={10} /> {app.opportunity.deadline}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Side-Drawer Details Panel */}
      <AnimatePresence>
        {selectedApp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedApp(null)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface border-l border-border z-50 p-6 flex flex-col gap-6 shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-s">
                  Application Workspace
                </span>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="p-1.5 rounded-lg border border-border hover:bg-background transition text-text-s"
                >
                  Close
                </button>
              </div>

              <div>
                <span className="inline-flex px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-accent text-[9px] font-mono uppercase tracking-wider mb-2">
                  {selectedApp.opportunity.category}
                </span>
                <h2 className="text-lg font-bold leading-snug mb-1">
                  <Link
                    to="/opportunity/$id"
                    params={{ id: selectedApp.opportunity_id }}
                    className="hover:text-accent transition flex items-center gap-1"
                  >
                    {selectedApp.opportunity.title} <ExternalLink size={12} />
                  </Link>
                </h2>
                <p className="text-xs text-text-s">{selectedApp.opportunity.organization}</p>
              </div>

              {/* Status Picker */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-s">
                  Pipeline Stage
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_COLUMNS.map((col) => (
                    <button
                      key={col.key}
                      onClick={() =>
                        updateStatus.mutate({
                          opportunityId: selectedApp.opportunity_id,
                          status: col.key,
                        })
                      }
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition ${
                        selectedApp.status === col.key
                          ? "bg-accent/10 border-accent/60 text-accent"
                          : "bg-background border-border text-text-s hover:text-foreground"
                      }`}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-2 flex-1 flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-s flex items-center gap-1.5">
                  <MessageSquare size={12} /> Personal Notes
                </span>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Paste application portals, credentials, essay prompts, or reminders..."
                  className="w-full flex-1 p-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs leading-relaxed resize-none custom-scrollbar"
                />
                <button
                  onClick={saveNotes}
                  disabled={isUpdatingNotes}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:opacity-90 transition disabled:opacity-50"
                >
                  {isUpdatingNotes && <Loader2 size={12} className="animate-spin" />}
                  Save Notes
                </button>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-s">
                  Share Updates
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleShareProgress(selectedApp)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-whatsapp/40 bg-whatsapp/5 text-whatsapp text-xs font-semibold rounded-lg hover:bg-whatsapp/10 transition"
                  >
                    <WhatsAppIcon size={12} /> Share Progress
                  </button>
                  <button
                    onClick={() => handleShareSuccess(selectedApp)}
                    disabled={selectedApp.status !== "Accepted"}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-whatsapp/40 bg-whatsapp/5 text-whatsapp text-xs font-semibold rounded-lg hover:bg-whatsapp/10 transition disabled:opacity-30"
                  >
                    <WhatsAppIcon size={12} /> Share Win
                  </button>
                </div>
              </div>

              {/* AI Copilot shortcut */}
              <div className="p-4 rounded-xl border border-accent/20 bg-accent/5 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-accent font-bold">
                  <Sparkles size={12} /> AI Application Copilot
                </div>
                <p className="text-[11px] text-foreground/90 leading-relaxed">
                  Need custom Statement of Purpose materials or an optimized CV tailored
                  specifically for this opportunity?
                </p>
                <Link
                  to="/opportunity/$id"
                  params={{ id: selectedApp.opportunity_id }}
                  className="text-xs text-accent underline flex items-center gap-1 mt-1 font-semibold"
                >
                  Launch Copilot Workspace <ChevronRight size={12} />
                </Link>
              </div>

              {/* Delete tracking */}
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to stop tracking this application?")) {
                    removeTracking.mutate(selectedApp.opportunity_id);
                  }
                }}
                disabled={removeTracking.isPending}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-destructive/20 text-destructive text-xs font-semibold rounded-xl hover:bg-destructive/5 transition"
              >
                <Trash2 size={12} /> Stop Tracking
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
