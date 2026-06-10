import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

const interestOptions = [
  "Technology",
  "AI / Data",
  "Business",
  "Health",
  "Engineering",
  "Arts & Design",
  "Education",
  "Finance",
  "Climate",
  "Social Impact",
];

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Your profile — Opportunity X" }] }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("");
  const [educationLevel, setEducationLevel] = useState("Undergraduate");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, country, education_level, interests, bio")
        .eq("id", u.user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setCountry(data.country ?? "");
        setEducationLevel(data.education_level ?? "Undergraduate");
        setBio(data.bio ?? "");
        setInterests(data.interests ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const toggleInterest = (i: string) =>
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        country,
        education_level: educationLevel,
        bio,
        interests,
        onboarded: true,
      })
      .eq("id", u.user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved");
    navigate({ to: "/dashboard" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-text-s" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-text-s hover:text-foreground">
          <ArrowLeft size={14} /> Dashboard
        </Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-black mb-2">Your profile</h1>
        <p className="text-sm text-text-s mb-8">
          Tell us about yourself so we can personalize opportunity discovery.
        </p>

        <form onSubmit={save} className="space-y-5">
          <Field label="Display name">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputCls}
              placeholder="How should we greet you?"
            />
          </Field>
          <Field label="Country">
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={inputCls}
              placeholder="e.g. Nigeria, India, Brazil"
            />
          </Field>
          <Field label="Education level">
            <select
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className={inputCls}
            >
              {["High School", "Undergraduate", "Masters", "PhD", "Working professional"].map(
                (o) => (
                  <option key={o}>{o}</option>
                ),
              )}
            </select>
          </Field>
          <Field label="Interests">
            <div className="flex flex-wrap gap-2">
              {interestOptions.map((i) => {
                const active = interests.includes(i);
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => toggleInterest(i)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                      active
                        ? "bg-accent/10 border-accent/40 text-accent"
                        : "bg-surface border-border text-text-s hover:text-foreground"
                    }`}
                  >
                    {i}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="About you (optional)">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className={inputCls}
              placeholder="A sentence about what you're looking for…"
            />
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition inline-flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save and continue
          </button>
        </form>
      </main>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 rounded-xl bg-surface border border-border focus:border-accent outline-none text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-text-s uppercase tracking-wider mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}
