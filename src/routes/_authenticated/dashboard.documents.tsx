import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  Sparkles, 
  Loader2, 
  Gauge, 
  BookOpen, 
  HelpCircle,
  FileCheck
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { optimizeCV, getLatestCVOptimization } from "@/lib/execution.functions";

export const Route = createFileRoute("/_authenticated/dashboard/documents")({
  head: () => ({ meta: [{ title: "My Document Vault — Opportunity X" }] }),
  component: DocumentVault,
});

const DOCUMENT_TYPES = [
  "CV",
  "Resume",
  "Transcript",
  "Certificate",
  "Passport",
  "Recommendation Letter",
  "Statement of Purpose",
  "Motivation Letter",
] as const;

type DocumentType = typeof DOCUMENT_TYPES[number];

function DocumentVault() {
  const queryClient = useQueryClient();
  const optimizeCVFn = useServerFn(optimizeCV);
  const getLatestCVFn = useServerFn(getLatestCVOptimization);

  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<DocumentType>("CV");
  const [userId, setUserId] = useState<string | null>(null);

  // CV Optimizer states
  const [cvText, setCvText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Fetch documents
  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_documents")
        .select("*")
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch latest CV analysis
  const { data: latestCV, isLoading: cvLoading } = useQuery({
    queryKey: ["latestCV"],
    queryFn: () => getLatestCVFn(),
  });

  // Upload file mutation
  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    try {
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${userId}/${docType}-${timestamp}-${sanitizedName}`;

      // 1. Upload to Supabase Storage documents bucket
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Insert record into user_documents table
      const { error: dbError } = await supabase
        .from("user_documents")
        .insert({
          user_id: userId,
          document_type: docType,
          file_url: filePath,
        });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success(`${docType} uploaded successfully`);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  // Delete document mutation
  const deleteDoc = useMutation({
    mutationFn: async (doc: any) => {
      // 1. Delete from storage
      const { error: storageErr } = await supabase.storage
        .from("documents")
        .remove([doc.file_url]);
      if (storageErr) throw storageErr;

      // 2. Delete from db
      const { error: dbErr } = await supabase
        .from("user_documents")
        .delete()
        .eq("id", doc.id);
      if (dbErr) throw dbErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
    },
    onError: (err: any) => toast.error(err.message || "Delete failed"),
  });

  // Download document helper
  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.file_url, 300); // 5 min expiry

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not retrieve document url");
    }
  };

  // Run CV optimization
  const handleOptimizeCV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvText.trim() || cvText.length < 50) {
      toast.error("Please paste a CV of at least 50 characters.");
      return;
    }

    setAnalyzing(true);
    try {
      await optimizeCVFn({ data: { cvText } });
      queryClient.invalidateQueries({ queryKey: ["latestCV"] });
      setCvText("");
      toast.success("CV Optimization complete!");
    } catch (err: any) {
      toast.error(err.message || "AI Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Vault Documents */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <FileCheck className="text-accent" size={24} /> Document Vault
            </h1>
            <p className="text-xs text-text-s">
              Store CVs, academic transcripts, passports, and SOPs securely. Recycled directly for your applications.
            </p>
          </div>

          {/* Upload card */}
          <div className="p-5 rounded-2xl border border-border bg-surface/40 backdrop-blur-md space-y-4">
            <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-foreground">Upload Document</h3>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:w-1/2 space-y-1">
                <label className="text-[10px] font-mono text-text-s uppercase">Document Category</label>
                <select 
                  value={docType} 
                  onChange={(e) => setDocType(e.target.value as DocumentType)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none text-xs text-foreground focus:border-accent"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="w-full md:w-1/2">
                <label className="relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border bg-background hover:bg-surface/60 hover:border-accent/40 cursor-pointer transition text-xs font-semibold w-full text-center">
                  {uploading ? (
                    <Loader2 size={14} className="animate-spin text-accent" />
                  ) : (
                    <Upload size={14} className="text-text-s" />
                  )}
                  <span>{uploading ? "Uploading..." : "Select & Upload file"}</span>
                  <input 
                    type="file" 
                    onChange={uploadFile} 
                    disabled={uploading} 
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-text-s">Vault Contents</h3>
            
            {docsLoading ? (
              <div className="p-8 text-center"><Loader2 size={24} className="animate-spin text-accent mx-auto" /></div>
            ) : documents.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-surface/10 text-text-s">
                <FileText className="mx-auto mb-3 opacity-30" size={36} />
                <p className="text-xs">Your vault is currently empty.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="p-4 rounded-xl border border-border bg-surface flex items-center justify-between hover:border-accent/20 transition">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/5 border border-accent/20 text-accent">
                        <FileText size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{doc.document_type}</h4>
                        <p className="text-[10px] text-text-s font-mono mt-0.5 truncate max-w-[200px]">
                          {doc.file_url.split("/").pop()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-1.5 rounded-lg bg-background border border-border hover:border-accent/40 text-text-s hover:text-foreground transition"
                        title="Download / View"
                      >
                        <Download size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete this ${doc.document_type} from your vault?`)) {
                            deleteDoc.mutate(doc);
                          }
                        }}
                        disabled={deleteDoc.isPending}
                        className="p-1.5 rounded-lg bg-background border border-border hover:border-destructive/40 text-text-s hover:text-destructive transition"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: AI CV Optimizer */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Sparkles className="text-accent" size={24} /> AI CV Optimizer
            </h2>
            <p className="text-xs text-text-s">
              Paste your CV content below. The intelligence engine rates it and checks for missing keywords or weak impact sections.
            </p>
          </div>

          {/* Analysis Form */}
          <form onSubmit={handleOptimizeCV} className="p-5 rounded-2xl border border-border bg-surface/40 backdrop-blur-md space-y-4">
            <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-foreground">Paste CV Text</h3>
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Paste formatting details, career descriptions, achievements, and technical skills..."
              rows={6}
              className="w-full p-3 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs leading-relaxed resize-none custom-scrollbar"
            />
            <button
              type="submit"
              disabled={analyzing || !cvText.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:opacity-90 transition disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Analyzing CV content...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Optimize CV
                </>
              )}
            </button>
          </form>

          {/* Results Output */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-text-s">Latest Optimization Score</h3>
            
            {cvLoading ? (
              <div className="p-8 text-center"><Loader2 size={24} className="animate-spin text-accent mx-auto" /></div>
            ) : !latestCV ? (
              <div className="p-8 text-center rounded-2xl border border-border bg-surface/10 text-text-s">
                <Gauge className="mx-auto mb-2 opacity-30" size={28} />
                <p className="text-xs">No CV analyses performed yet.</p>
              </div>
            ) : (
              <div className="p-5 rounded-2xl border border-border bg-surface space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-full border-2 border-accent flex items-center justify-center font-mono font-black text-sm text-accent">
                      {latestCV.score}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">Optimization Score</h4>
                      <p className="text-[10px] text-text-s">Generated on {new Date(latestCV.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  {(() => {
                    const s = (latestCV.suggestions ?? {}) as {
                      formatting?: string[];
                      keywords?: string[];
                      achievements?: string[];
                      relevance?: string[];
                    };
                    return (
                      <>
                        {s.formatting && s.formatting.length > 0 && (
                          <div className="space-y-1">
                            <h5 className="font-bold text-accent text-[10px] uppercase font-mono">Formatting & Structure</h5>
                            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-foreground/90">
                              {s.formatting.map((t, idx) => (<li key={idx}>{t}</li>))}
                            </ul>
                          </div>
                        )}
                        {s.keywords && s.keywords.length > 0 && (
                          <div className="space-y-1">
                            <h5 className="font-bold text-accent text-[10px] uppercase font-mono">Target Keywords</h5>
                            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-foreground/90">
                              {s.keywords.map((t, idx) => (<li key={idx}>{t}</li>))}
                            </ul>
                          </div>
                        )}
                        {s.achievements && s.achievements.length > 0 && (
                          <div className="space-y-1">
                            <h5 className="font-bold text-accent text-[10px] uppercase font-mono">Achievements & Quantification</h5>
                            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-foreground/90">
                              {s.achievements.map((t, idx) => (<li key={idx}>{t}</li>))}
                            </ul>
                          </div>
                        )}
                        {s.relevance && s.relevance.length > 0 && (
                          <div className="space-y-1">
                            <h5 className="font-bold text-accent text-[10px] uppercase font-mono">Scholarship Relevance</h5>
                            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-foreground/90">
                              {s.relevance.map((t, idx) => (<li key={idx}>{t}</li>))}
                            </ul>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
