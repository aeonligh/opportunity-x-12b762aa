import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { OPPORTUNITY_CATEGORIES } from "@/lib/intelligence.functions";

const careerOptions = [
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
  "Research",
  "Public Policy",
];

const degreeTypes = ["Diploma", "Bachelor", "Master", "PhD", "Postdoc", "Other"];
const levelOptions = [
  "High School",
  "Undergraduate",
  "Graduate",
  "Postgraduate",
  "Working Professional",
];

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Your profile — Opportunity X" }] }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("");
  const [university, setUniversity] = useState("");
  const [course, setCourse] = useState("");
  const [degreeType, setDegreeType] = useState("Bachelor");
  const [levelOfStudy, setLevelOfStudy] = useState("Undergraduate");
  const [graduationYear, setGraduationYear] = useState<number | "">(new Date().getFullYear() + 1);
  const [careerInterests, setCareerInterests] = useState<string[]>([]);
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select(
          "display_name, country, university, course_of_study, degree_type, level_of_study, graduation_year, career_interests, skill_tags, preferred_categories, bio",
        )
        .eq("id", u.user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setCountry(data.country ?? "");
        setUniversity(data.university ?? "");
        setCourse(data.course_of_study ?? "");
        setDegreeType(data.degree_type ?? "Bachelor");
        setLevelOfStudy(data.level_of_study ?? "Undergraduate");
        setGraduationYear(data.graduation_year ?? new Date().getFullYear() + 1);
        setCareerInterests(data.career_interests ?? []);
        setSkillTags(data.skill_tags ?? []);
        setPreferredCategories(data.preferred_categories ?? []);
        setBio(data.bio ?? "");
      }
      setLoading(false);
    })();
  }, []);

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const addSkill = () => {
    const v = skillInput.trim();
    if (!v) return;
    if (!skillTags.includes(v)) setSkillTags([...skillTags, v]);
    setSkillInput("");
  };

  const save = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        country,
        university,
        course_of_study: course,
        degree_type: degreeType,
        level_of_study: levelOfStudy,
        education_level: levelOfStudy,
        graduation_year: graduationYear === "" ? null : Number(graduationYear),
        career_interests: careerInterests,
        skill_tags: skillTags,
        preferred_categories: preferredCategories,
        interests: careerInterests,
        bio,
        onboarded: true,
      })
      .eq("id", u.user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
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

  const steps = [
    { title: "Where you are", desc: "Country, school, and course of study." },
    { title: "Your level", desc: "Degree type, level, and graduation year." },
    { title: "Career & skills", desc: "What you want to do, and what you know." },
    { title: "Opportunity preferences", desc: "Which categories matter most to you." },
  ];

  const canNext =
    step === 0
      ? !!country.trim()
      : step === 1
        ? !!degreeType && !!levelOfStudy
        : step === 2
          ? careerInterests.length > 0
          : preferredCategories.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-text-s hover:text-foreground"
        >
          <ArrowLeft size={14} /> Dashboard
        </Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-text-s">
          Step {step + 1} of {steps.length}
        </div>
        <h1 className="text-3xl font-black tracking-tight mb-1">{steps[step].title}</h1>
        <p className="text-sm text-text-s mb-8">{steps[step].desc}</p>

        <div className="flex gap-1 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= step ? "bg-accent" : "bg-border"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {step === 0 && (
              <>
                <Field label="Display name">
                  <input
                    className={inputCls}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                </Field>
                <Field label="Country">
                  <input
                    className={inputCls}
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. Nigeria, India, Brazil"
                  />
                </Field>
                <Field label="University / Institution">
                  <input
                    className={inputCls}
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="e.g. University of Lagos"
                  />
                </Field>
                <Field label="Course of study">
                  <input
                    className={inputCls}
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="e.g. Computer Science"
                  />
                </Field>
              </>
            )}
            {step === 1 && (
              <>
                <Field label="Degree type">
                  <select
                    className={inputCls}
                    value={degreeType}
                    onChange={(e) => setDegreeType(e.target.value)}
                  >
                    {degreeTypes.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Level of study">
                  <select
                    className={inputCls}
                    value={levelOfStudy}
                    onChange={(e) => setLevelOfStudy(e.target.value)}
                  >
                    {levelOptions.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Graduation year">
                  <input
                    type="number"
                    className={inputCls}
                    value={graduationYear}
                    onChange={(e) =>
                      setGraduationYear(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="2027"
                  />
                </Field>
              </>
            )}
            {step === 2 && (
              <>
                <Field label="Career interests">
                  <div className="flex flex-wrap gap-2">
                    {careerOptions.map((i) => {
                      const active = careerInterests.includes(i);
                      return (
                        <button
                          type="button"
                          key={i}
                          onClick={() => toggle(careerInterests, i, setCareerInterests)}
                          className={chipCls(active)}
                        >
                          {i}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Skill tags">
                  <div className="flex gap-2 mb-2">
                    <input
                      className={inputCls}
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                      placeholder="Add a skill (Python, Public speaking, …) then press Enter"
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="px-3 py-2 rounded-xl bg-surface border border-border text-xs"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {skillTags.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSkillTags(skillTags.filter((x) => x !== s))}
                        className="px-2.5 py-1 rounded-md bg-accent/10 border border-accent/30 text-accent text-xs"
                        title="Click to remove"
                      >
                        {s} ×
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="About you (optional)">
                  <textarea
                    className={inputCls}
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </Field>
              </>
            )}
            {step === 3 && (
              <Field label="Preferred opportunity categories">
                <div className="grid grid-cols-2 gap-2">
                  {OPPORTUNITY_CATEGORIES.map((c) => {
                    const active = preferredCategories.includes(c);
                    return (
                      <button
                        type="button"
                        key={c}
                        onClick={() => toggle(preferredCategories, c, setPreferredCategories)}
                        className={chipCls(active) + " justify-start"}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-8">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-3 py-2 rounded-xl border border-border text-xs font-semibold text-text-s disabled:opacity-40"
          >
            Back
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-bold disabled:opacity-40"
            >
              Continue <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={save}
              disabled={saving || !canNext}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-bold disabled:opacity-40"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save & Start Discovering
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 rounded-xl bg-surface/60 backdrop-blur-sm border border-border focus:border-accent outline-none text-sm";

const chipCls = (active: boolean) =>
  `inline-flex items-center px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
    active
      ? "bg-accent/10 border-accent/40 text-accent"
      : "bg-surface border-border text-text-s hover:text-foreground"
  }`;

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
