import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Rocket,
  Search,
  ShieldCheck,
  Target,
  BriefcaseBusiness,
  FileText,
  Bell,
  FolderLock,
  ListChecks,
  ArrowRight,
  Globe2,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { BrandMark } from "@/components/BrandMark";

const OpportunityGlobe = lazy(() => import("@/components/landing/OpportunityGlobe"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Opportunity X — Your next life-changing opportunity is closer than you think." },
      {
        name: "description",
        content:
          "Opportunity X is an AI Opportunity Intelligence Platform that discovers, verifies, personalizes, and helps you secure scholarships, fellowships, internships, grants, and research programs from across the world.",
      },
      { property: "og:title", content: "Opportunity X — AI Opportunity Intelligence" },
      {
        property: "og:description",
        content:
          "The world's opportunities already exist. Opportunity X helps you find them — verified, personalized, and ready to apply.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const PLACEHOLDERS = [
  "Scholarships for Pharmacy students",
  "Research internships in Germany",
  "Fully funded Master's programs",
  "No IELTS scholarships",
  "Healthcare fellowships in Europe",
  "AI research grants for undergrads",
];

const AI_STEPS = [
  "Searching",
  "Discovering",
  "Reading",
  "Verifying",
  "Ranking",
  "Matching",
] as const;

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />
      <Hero />
      <SectionWorld />
      <SectionDiscovery />
      <SectionVerification />
      <SectionPersonalization />
      <SectionExecution />
      <SectionTransformation />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
        <div className="glass-panel rounded-2xl h-14 px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Opportunity X home">
            <BrandMark size={24} className="text-accent shrink-0" />
            <span className="flex flex-col leading-tight">
              <span className="font-mono text-sm font-bold tracking-tighter">
                OPPORTUNITY <span className="text-accent">X</span>
              </span>
              <span className="text-[8px] uppercase tracking-widest text-text-s">
                AI Opportunity Intelligence
              </span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-xs text-text-s">
            <a href="#discovery" className="hover:text-foreground transition">
              Discovery
            </a>
            <a href="#verification" className="hover:text-foreground transition">
              Verification
            </a>
            <a href="#personalization" className="hover:text-foreground transition">
              Match
            </a>
            <a href="#execution" className="hover:text-foreground transition">
              Execution
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/search"
              className="hidden sm:inline-flex px-3 py-1.5 rounded-xl text-xs font-semibold text-text-s border border-border hover:text-foreground hover:border-accent/40 transition"
            >
              Live Search
            </Link>
            <Link
              to="/auth"
              className="px-3 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:opacity-90 transition"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    if (query) return;
    const t = setInterval(() => setPlaceholderIdx((v) => (v + 1) % PLACEHOLDERS.length), 2600);
    return () => clearInterval(t);
  }, [query]);

  const simulate = () => {
    if (running) return;
    setRunning(true);
    setStep(0);
    let s = 0;
    const t = setInterval(() => {
      s += 1;
      if (s >= AI_STEPS.length) {
        clearInterval(t);
        setTimeout(() => setRunning(false), 800);
      } else {
        setStep(s);
      }
    }, 550);
  };

  const suggestionChips = [
    "DAAD",
    "Scholarships in Germany",
    "Research in Canada",
    "Fully funded",
    "Fulbright",
  ];

  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="absolute inset-0 aurora-bg pointer-events-none" />
      <div className="absolute inset-0 grid-fade opacity-40 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 glass-panel px-3 py-1.5 rounded-full text-[11px] text-text-s mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.75_0.18_152)] animate-pulse" />
            AI Opportunity Intelligence · Live across 190+ countries
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.02] mb-6"
          >
            Your next <span className="text-gradient">life-changing</span> opportunity is closer
            than you think.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-base md:text-lg text-text-s max-w-xl mb-8 leading-relaxed"
          >
            Opportunity X is an AI platform that discovers, verifies, and personalizes scholarships,
            fellowships, internships, grants, and research programs from across the world — then
            helps you actually secure them.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="glass-panel rounded-2xl p-2 flex items-center gap-2 mb-3"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0 px-3">
              <Search size={16} className="text-accent shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={PLACEHOLDERS[placeholderIdx]}
                className="w-full bg-transparent outline-none text-sm placeholder:text-text-s"
                aria-label="Explore the opportunity globe"
              />
            </div>
            <button
              type="button"
              onClick={simulate}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:opacity-90 transition shrink-0"
            >
              <Sparkles size={12} /> Ask AI
            </button>
          </motion.div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {suggestionChips.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQuery(s)}
                className="px-2.5 py-1 rounded-full border border-border bg-surface/50 text-[10px] text-text-s hover:text-accent hover:border-accent/40 transition"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="h-6 mb-6">
            {running && (
              <div className="flex items-center gap-2 text-[11px] font-mono text-text-s flex-wrap">
                <Loader2 size={12} className="animate-spin text-accent" />
                {AI_STEPS.map((s, i) => (
                  <span
                    key={s}
                    className={`transition ${
                      i < step
                        ? "text-[oklch(0.75_0.18_152)]"
                        : i === step
                          ? "text-foreground"
                          : "opacity-40"
                    }`}
                  >
                    {s}
                    {i < AI_STEPS.length - 1 && <span className="mx-1 opacity-40">·</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-accent text-accent-foreground font-semibold hover:opacity-90 transition"
            >
              <Rocket size={16} /> Start discovering
            </Link>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl glass-panel font-semibold hover:border-accent/40 transition"
            >
              <Search size={16} /> Try live search
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-6 text-[11px] text-text-s flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-[oklch(0.75_0.18_152)]" /> Every opportunity
              verified
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Target size={12} className="text-accent" /> Personalized to your profile
            </span>
          </div>
        </div>

        <div className="relative aspect-square w-full max-w-[560px] mx-auto">
          <div className="absolute inset-0 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative w-full h-full">
            <Suspense fallback={<GlobeFallback />}>
              <OpportunityGlobe query={query} />
            </Suspense>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 glass-panel px-3 py-1.5 rounded-full text-[10px] font-mono text-text-s inline-flex items-center gap-2 whitespace-nowrap">
            <Globe2 size={11} className="text-accent" /> Search · Hover · Click a country
          </div>
        </div>
      </div>
    </section>
  );
}

function GlobeFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-3/4 aspect-square rounded-full border border-border animate-pulse" />
    </div>
  );
}

function SectionShell({
  id,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mb-14"
        >
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent mb-3">
            {eyebrow}
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.05] mb-4">
            {title}
          </h2>
          {subtitle && <p className="text-text-s text-base md:text-lg max-w-2xl">{subtitle}</p>}
        </motion.div>
        {children}
      </div>
    </section>
  );
}

function SectionWorld() {
  return (
    <SectionShell
      eyebrow="The World"
      title={
        <>
          The world's opportunities <span className="text-gradient">already exist.</span>
        </>
      }
      subtitle="Across 190+ countries, thousands of universities, foundations, and governments publish scholarships, fellowships, grants, and research programs every single week. Most people never see them."
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { n: "$2.4B+", l: "In annual global funding" },
          { n: "12,000+", l: "Opportunity sources" },
          { n: "190+", l: "Countries covered" },
          { n: "Daily", l: "AI refresh cycle" },
        ].map((s) => (
          <motion.div
            key={s.l}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass-panel rounded-2xl p-6"
          >
            <div className="text-3xl md:text-4xl font-black text-gradient mb-1">{s.n}</div>
            <div className="text-xs text-text-s">{s.l}</div>
          </motion.div>
        ))}
      </div>
    </SectionShell>
  );
}

function SectionDiscovery() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const stepIndex = useTransform(scrollYProgress, [0, 1], [0, AI_STEPS.length - 0.01]);
  const [active, setActive] = useState(0);
  useEffect(() => {
    return stepIndex.on("change", (v) => setActive(Math.floor(v)));
  }, [stepIndex]);

  return (
    <SectionShell
      id="discovery"
      eyebrow="Discovery"
      title={
        <>
          An AI that <span className="text-gradient">reads the entire web</span> for you.
        </>
      }
      subtitle="Opportunity X continuously scans official sources — universities, ministries, foundations, research labs — surfacing what matters, in real time."
    >
      <div ref={ref} className="grid lg:grid-cols-2 gap-6 md:gap-8">
        <div className="glass-panel rounded-3xl p-6 md:p-8">
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-s mb-4">
            Live discovery pipeline
          </div>
          <ul className="space-y-3">
            {AI_STEPS.map((s, i) => {
              const done = i < active;
              const current = i === active;
              return (
                <li
                  key={s}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                    current
                      ? "border-accent/40 bg-accent/5"
                      : done
                        ? "border-[oklch(0.6_0.12_152)]/30 bg-[oklch(0.6_0.12_152)]/5"
                        : "border-border bg-background/30"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      done
                        ? "bg-[oklch(0.6_0.12_152)]/20 text-[oklch(0.78_0.15_152)]"
                        : current
                          ? "bg-accent/20 text-accent"
                          : "bg-surface text-text-s"
                    }`}
                  >
                    {done ? <Check size={12} /> : i + 1}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      done
                        ? "text-[oklch(0.78_0.15_152)]"
                        : current
                          ? "text-foreground"
                          : "text-text-s"
                    }`}
                  >
                    {s}…
                  </span>
                  {current && <Loader2 size={12} className="ml-auto animate-spin text-accent" />}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="glass-panel rounded-3xl p-6 md:p-8">
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-s mb-4">
            Live results
          </div>
          <div className="space-y-3">
            {[
              { org: "DAAD", country: "Germany", title: "EPOS Development-Related Postgrad" },
              {
                org: "Chevening",
                country: "United Kingdom",
                title: "Chevening Master's Scholarships",
              },
              { org: "MEXT", country: "Japan", title: "MEXT Research Student Program" },
              { org: "Fulbright", country: "United States", title: "Foreign Student Program" },
            ].map((r, i) => (
              <motion.div
                key={r.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-3 rounded-xl border border-border bg-background/40 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-black text-xs shrink-0">
                  {r.org.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{r.title}</div>
                  <div className="text-[11px] text-text-s">
                    {r.org} · {r.country}
                  </div>
                </div>
                <ShieldCheck size={14} className="text-[oklch(0.78_0.15_152)] shrink-0" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function SectionVerification() {
  const items = [
    {
      icon: ShieldCheck,
      title: "Official sources only",
      body: "Every opportunity is traced back to an authoritative provider before it reaches you.",
    },
    {
      icon: Check,
      title: "Deadline validated",
      body: "AI cross-checks deadlines against source pages so you never chase expired listings.",
    },
    {
      icon: Sparkles,
      title: "Duplicates removed",
      body: "URL hashing and semantic dedup keep your feed clean and signal-rich.",
    },
    {
      icon: AlertTriangle,
      title: "AI verified",
      body: "Confidence scoring on every listing. Anything below 0.6 never gets published.",
    },
  ];
  return (
    <SectionShell
      id="verification"
      eyebrow="Verification"
      title={
        <>
          Trust is not optional. <span className="text-gradient">It's the product.</span>
        </>
      }
      subtitle="Opportunity X is built on a verification-first pipeline. If we can't confirm it, we don't publish it."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((it, i) => (
          <motion.div
            key={it.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="glass-panel rounded-2xl p-6"
          >
            <div className="inline-flex p-2 rounded-lg bg-accent/10 text-accent mb-3">
              <it.icon size={18} />
            </div>
            <div className="font-semibold mb-1">{it.title}</div>
            <p className="text-xs text-text-s leading-relaxed">{it.body}</p>
          </motion.div>
        ))}
      </div>
    </SectionShell>
  );
}

function SectionPersonalization() {
  return (
    <SectionShell
      id="personalization"
      eyebrow="Personalization"
      title={
        <>
          Matched to <span className="text-gradient">who you actually are.</span>
        </>
      }
      subtitle="Your degree, field, country, funding needs and goals shape every recommendation — with reasoning you can see."
    >
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 md:gap-8 items-start">
        <div className="glass-panel rounded-3xl p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-widest text-text-s mb-1">
                Recommended for you
              </div>
              <h3 className="text-lg md:text-xl font-bold leading-snug">
                Mastercard Foundation Scholars Program
              </h3>
              <div className="text-xs text-text-s mt-1">University of Toronto · Canada</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-3xl font-black text-gradient leading-none">94%</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-text-s mt-1">
                Match
              </div>
            </div>
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-s mt-4 mb-2">
            Why this matches you
          </div>
          <ul className="space-y-2 text-sm">
            {[
              { ok: true, t: "Undergraduate student" },
              { ok: true, t: "Pharmacy / health sciences" },
              { ok: true, t: "Nigeria eligible" },
              { ok: false, t: "Missing research experience" },
            ].map((r) => (
              <li key={r.t} className="flex items-center gap-2">
                {r.ok ? (
                  <span className="w-5 h-5 rounded-full bg-[oklch(0.6_0.12_152)]/15 text-[oklch(0.78_0.15_152)] inline-flex items-center justify-center">
                    <Check size={12} />
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full bg-[oklch(0.65_0.18_75)]/15 text-[oklch(0.82_0.15_75)] inline-flex items-center justify-center">
                    <AlertTriangle size={11} />
                  </span>
                )}
                <span className={r.ok ? "text-foreground" : "text-text-s"}>{r.t}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center gap-2 flex-wrap">
            <button className="px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold">
              Apply now
            </button>
            <button className="px-4 py-2 rounded-xl glass-panel text-xs font-semibold">Save</button>
            <button className="px-4 py-2 rounded-xl glass-panel text-xs font-semibold">
              Share on WhatsApp
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { p: 92, t: "Chevening Master's Scholarship", s: "UK · Fully Funded" },
            { p: 88, t: "DAAD EPOS Postgraduate", s: "Germany · Fully Funded" },
            { p: 84, t: "MEXT Research Student", s: "Japan · Research" },
          ].map((r, i) => (
            <motion.div
              key={r.t}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass-panel rounded-2xl p-4 flex items-center gap-4"
            >
              <div className="text-2xl font-black text-gradient w-14 shrink-0">{r.p}%</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{r.t}</div>
                <div className="text-[11px] text-text-s">{r.s}</div>
              </div>
              <ArrowRight size={14} className="text-text-s shrink-0" />
            </motion.div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

function SectionExecution() {
  const items = [
    {
      icon: FileText,
      title: "AI SOP & Motivation Letters",
      body: "Generate tailored statements grounded in your profile and the opportunity.",
    },
    {
      icon: BriefcaseBusiness,
      title: "CV Optimization",
      body: "Actionable improvements matched to what each program looks for.",
    },
    {
      icon: ListChecks,
      title: "Application Tracker",
      body: "Kanban-style pipeline from Interested to Submitted to Outcome.",
    },
    {
      icon: Bell,
      title: "Deadline Reminders",
      body: "Smart nudges at 30, 14, 7, 3 and 1 day before you miss the window.",
    },
    {
      icon: FolderLock,
      title: "Document Vault",
      body: "Private, encrypted storage for CVs, passports, transcripts and SOPs.",
    },
    {
      icon: ShieldCheck,
      title: "Eligibility Engine",
      body: "Instant match check against every requirement — before you spend hours applying.",
    },
  ];
  return (
    <SectionShell
      id="execution"
      eyebrow="Execution"
      title={
        <>
          Discovery is step one.{" "}
          <span className="text-gradient">We take you the rest of the way.</span>
        </>
      }
      subtitle="Opportunity X doesn't stop at finding the opportunity. It helps you actually secure it."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it, i) => (
          <motion.div
            key={it.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="glass-panel rounded-2xl p-6 group hover:border-accent/40 transition"
          >
            <div className="inline-flex p-2.5 rounded-xl bg-accent/10 text-accent mb-4 group-hover:scale-105 transition">
              <it.icon size={20} />
            </div>
            <div className="font-semibold mb-1">{it.title}</div>
            <p className="text-sm text-text-s leading-relaxed">{it.body}</p>
          </motion.div>
        ))}
      </div>
    </SectionShell>
  );
}

function SectionTransformation() {
  return (
    <section className="relative py-32 md:py-40">
      <div className="absolute inset-0 aurora-bg pointer-events-none" />
      <div className="max-w-4xl mx-auto px-4 md:px-6 text-center relative">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05] mb-6"
        >
          The opportunity to <span className="text-gradient">change your life</span> is already out
          there.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="text-lg text-text-s mb-10"
        >
          Opportunity X helps you find it.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25 }}
          className="flex items-center justify-center gap-3 flex-wrap"
        >
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-accent text-accent-foreground font-semibold hover:opacity-90 transition"
          >
            <Rocket size={16} /> Start discovering
          </Link>
          <Link
            to="/search"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl glass-panel font-semibold hover:border-accent/40 transition"
          >
            <Sparkles size={16} /> Try live search
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  const socials = [
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/company/opportunity-x",
      tag: "Professional network",
      accent: "0,119,181",
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
        </svg>
      ),
    },
    {
      label: "Facebook",
      href: "https://www.facebook.com/opportunityx",
      tag: "Community & stories",
      accent: "24,119,242",
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
          <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.7c0-.93.26-1.56 1.6-1.56h1.7V4.28c-.3-.04-1.32-.13-2.5-.13-2.48 0-4.18 1.51-4.18 4.29v2.36H7.4V14h2.72v8h3.38z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="border-t border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-14">
        <div className="glass-panel rounded-3xl p-6 md:p-10 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8">
          <div className="flex items-start gap-4 max-w-md text-center lg:text-left">
            <BrandMark size={40} className="text-accent shrink-0 hidden sm:block" />
            <div className="flex flex-col gap-2 items-center lg:items-start">
              <span className="font-mono text-sm font-bold tracking-tighter">
                OPPORTUNITY <span className="text-accent">X</span>
              </span>
              <h3 className="text-lg md:text-xl font-semibold">Connect with Opportunity X</h3>
              <p className="text-xs text-text-s leading-relaxed">
                An AI-powered Opportunity Intelligence Platform — and a growing global community of
                students, researchers, and dreamers.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Opportunity X on ${s.label}`}
                className="group relative flex items-center gap-3 rounded-2xl border border-border bg-surface/40 backdrop-blur px-4 py-3 min-w-[200px] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-accent/50 hover:bg-surface/70"
                style={{ boxShadow: `0 0 0 0 rgba(${s.accent},0)` }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 8px 30px rgba(${s.accent},0.25)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 0 rgba(${s.accent},0)`;
                }}
              >
                <span
                  className="grid place-items-center h-9 w-9 rounded-xl transition-colors"
                  style={{ color: `rgb(${s.accent})`, backgroundColor: `rgba(${s.accent},0.12)` }}
                >
                  {s.icon}
                </span>
                <span className="flex flex-col leading-tight text-left">
                  <span className="text-sm font-semibold">{s.label}</span>
                  <span className="text-[10px] text-text-s">{s.tag}</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-text-s">
          <span>© {new Date().getFullYear()} Opportunity X</span>
          <span>Built for those whose next opportunity is waiting somewhere on the web.</span>
        </div>
      </div>
    </footer>
  );
}
