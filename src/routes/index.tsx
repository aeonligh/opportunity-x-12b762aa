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
  Globe2,
  Check,
  AlertTriangle,
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
          "The world’s opportunities already exist. Opportunity X helps you find them — verified, personalized, and ready to apply.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

/*
  These rotate in the globe filter's input.

  They used to read "Scholarships for Pharmacy students", "No IELTS
  scholarships", "AI research grants for undergrads" — natural-language
  questions, promising a system that understood them. The control they sit in
  is `matches()` in OpportunityGlobe: a case-insensitive substring test against
  a node's name, organisation, city, country and kind. Every one of those
  placeholders matched nothing, because no node's text contains the sentence.

  A placeholder is an instruction about what to type. These now demonstrate the
  filter that exists rather than the search engine that does not.
*/
const PLACEHOLDERS = ["Germany", "Fellowship", "Fulbright", "Japan", "Research", "Erasmus Mundus"];

/*
  ══════════════════════════════════════════════════════════════════════════
  A SIMULATED AI PIPELINE STOOD HERE
  ══════════════════════════════════════════════════════════════════════════

  `AI_STEPS = ["Searching", "Discovering", "Reading", "Verifying",
  "Corroborating", "Explaining"]`, driven by a `simulate()` function behind an
  "Ask AI" button next to the hero's input.

  `simulate()` was a `setInterval` that advanced an index every 550ms and then
  stopped. It never read the query. It called nothing, reached no network, and
  produced no result — after six steps of green-ticking progress the page was
  exactly as it had been, with the user's question still sitting in the box.

  This is the most direct fabrication that was on the site, and the hardest to
  read as anything else. The other cases invented data; this one performed the
  act of working. A reader typing a real question and pressing a button labelled
  "Ask AI" was shown their query being searched, read and verified, and none of
  those things happened to it.

  An earlier phase edited this array — it removed "Ranking" and "Matching" on
  CR-21 grounds and left a comment titled "What the engine actually does". The
  list was tidied for constitutional correctness while remaining an animation of
  work that was never performed. Auditing the contents of a fiction is not the
  same as noticing it is one.

  Nothing replaces it in the hero. The input beside it is real — it filters the
  globe — so what remains is that filter, labelled as a filter.

  The stage names themselves survive, below, because they are true: these are
  the stages the observation pipeline is built out of, and naming them is an
  explanation a reader is entitled to. They are used in exactly one place now —
  the diagram in SectionDiscovery, which describes the pipeline. The difference
  between that and what was here is the difference between explaining a process
  and performing it on somebody's question.
*/

/*
  The stages of the observation pipeline, named as the code names them. Used
  only by the diagram in SectionDiscovery.

  An earlier phase removed "Ranking" and "Matching" from the end of this list.
  Both describe an opaque judgment being formed, which is the thing CR-21 keeps
  separable and CR-33 keeps inspectable — and neither is a step this engine
  performs as a black box. It observes, it corroborates, and it explains;
  ordering is a consequence of that, not a stage that happens to you.
*/
const PIPELINE_STAGES = [
  "Searching",
  "Discovering",
  "Reading",
  "Verifying",
  "Corroborating",
  "Explaining",
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
              Fit
            </a>
            <a href="#execution" className="hover:text-foreground transition">
              Execution
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/*
              The canonical product. This said "Live Search" and pointed at
              `/search`, which was the legacy system's entrance — so the landing
              page's own navigation led away from Opportunity X. Signed out, this
              lands on `/auth?next=%2Fopportunities` and comes back here.
            */}
            <Link
              to="/opportunities"
              className="hidden sm:inline-flex px-3 py-1.5 rounded-xl text-xs font-semibold text-text-s border border-border hover:text-foreground hover:border-accent/40 transition"
            >
              Opportunities
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
  const [query, setQuery] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    if (query) return;
    const t = setInterval(() => setPlaceholderIdx((v) => (v + 1) % PLACEHOLDERS.length), 2600);
    return () => clearInterval(t);
  }, [query]);

  /*
    Same correction as the placeholders. "Scholarships in Germany", "Research in
    Canada" and "Fully funded" were chips a reader could click, and clicking any
    of them emptied the globe — the substring test finds no node containing
    those phrases. A suggestion that produces nothing is worse than no
    suggestion, because the reader reasonably concludes the system has nothing.

    Each of these is checked against `matches()` in the globe and hits at least
    one node.
  */
  const suggestionChips = ["DAAD", "Germany", "Fellowship", "Canada", "Fulbright"];

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
            AI Opportunity Intelligence
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
                aria-label="Filter the globe by organization, country, city or kind"
              />
            </div>
            {/*
              The "Ask AI" button stood here and called `simulate()`. See the
              note where AI_STEPS was defined.

              No button replaces it, because there is nothing for one to submit
              to: the input filters the globe as you type, so pressing anything
              would be the same theatre in a quieter form. The label below says
              what the box does, which is the part that was missing.
            */}
          </motion.div>

          <p className="text-[11px] text-text-s mb-3 px-1">
            Filters the globe by organization, country, city or kind. This is a reference map, not a
            search of live opportunities.
          </p>

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

          {/*
            The step ticker rendered here: a spinner and six words lighting up
            green in sequence, the visible half of `simulate()`.
          */}

          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-accent text-accent-foreground font-semibold hover:opacity-90 transition"
            >
              <Rocket size={16} /> Start discovering
            </Link>
            <Link
              to="/opportunities"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl glass-panel font-semibold hover:border-accent/40 transition"
            >
              <Search size={16} /> See opportunities
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
            <Globe2 size={11} className="text-accent" /> Filter · Hover · Click a country
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
  /* Optional: a section whose fabricated content was removed still has a
     heading worth keeping, and inventing filler to satisfy a prop type would
     be the same mistake in a smaller font. */
  children?: React.ReactNode;
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
          The world&apos;s opportunities <span className="text-gradient">already exist.</span>
        </>
      }
      subtitle="Universities, foundations and governments publish scholarships, fellowships, grants and research programmes constantly. Most people never see them, because seeing them means knowing where to look and checking again next week."
    >
      {/*
        ══════════════════════════════════════════════════════════════════════
        FOUR FABRICATED STATISTICS STOOD HERE
        ══════════════════════════════════════════════════════════════════════

        `$2.4B+ in annual global funding`, `12,000+ opportunity sources`,
        `190+ countries covered`, and `Daily AI refresh cycle` — rendered in
        gradient text at the largest type on the page.

        Every one was invented. The announcer registry holds nine announcers.
        `opportunity_observations` holds zero rows. Discovery has never run, so
        there is no refresh cycle, daily or otherwise, and no country is
        covered.

        This is the failure the rest of the product exists to prevent. Twenty
        phases went into a system that will not say "there are no
        opportunities" without distinguishing *unknown* from *absent*, and the
        front door was claiming two and a half billion dollars.

        Nothing replaces them. A number nobody can support is not improved by
        being smaller or hedged — the honest version of an unmeasured claim is
        no claim. When discovery has run, real counts can be read out of the
        record and shown with the date they were true.
      */}
    </SectionShell>
  );
}

function SectionDiscovery() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const stepIndex = useTransform(scrollYProgress, [0, 1], [0, PIPELINE_STAGES.length - 0.01]);
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
      subtitle="Opportunity X reads official sources directly — universities, ministries, foundations, research labs — and keeps what each page actually said, so every claim can be traced back to it."
    >
      <div ref={ref} className="grid lg:grid-cols-2 gap-6 md:gap-8">
        <div className="glass-panel rounded-3xl p-6 md:p-8">
          {/*
            "Live discovery pipeline". The list is a static diagram scrubbed by
            scroll position — nothing about it is live, and the stages it names
            have never run against the web. As a labelled explanation of how
            discovery works it is honest; the word "Live" was the part making a
            claim about right now.
          */}
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-s mb-4">
            How discovery works
          </div>
          {/*
            Three separate liveness signals were layered onto this static list,
            all of them driven by nothing but how far the page had been
            scrolled: a green tick replacing the step number once you scrolled
            past it, a trailing "…" on every stage name, and a spinning
            Loader2 on whichever stage the scroll position happened to be
            nearest. Together they read as a job in flight, with a progress
            record behind it.

            The list is worth keeping — these are the real stages, and a reader
            deserves to know what they are. What it must not do is dress the
            act of scrolling as the act of running. The highlight stays, because
            following the reader down an explanation is what a diagram does;
            the tick, the ellipsis and the spinner are gone, because each one
            asserted a state the system was not in.
          */}
          <ul className="space-y-3">
            {PIPELINE_STAGES.map((s, i) => {
              const current = i === active;
              return (
                <li
                  key={s}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                    current ? "border-accent/40 bg-accent/5" : "border-border bg-background/30"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      current ? "bg-accent/20 text-accent" : "bg-surface text-text-s"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      current ? "text-foreground" : "text-text-s"
                    }`}
                  >
                    {s}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/*
          ══════════════════════════════════════════════════════════════════
          FOUR INVENTED PROGRAMMES, ATTRIBUTED TO FOUR REAL INSTITUTIONS,
          UNDER A HEADING THAT SAID "LIVE RESULTS"
          ══════════════════════════════════════════════════════════════════

          DAAD, Chevening, MEXT and Fulbright, each with a programme title,
          presented as results this system had found. It had found nothing.
          `opportunity_observations` holds zero rows and discovery has never
          run against the live web.

          Worse than a placeholder: the organisations are real, so a reader
          had no way to tell this from a genuine finding, and the label
          "Live results" told them not to try. That is precisely what CR-11
          and the verification pipeline exist to make impossible — and it was
          on the page that introduces them.

          A "94% Match" ring was removed from this same file in an earlier
          phase, with a comment explaining why. The sweep stopped at that one
          component and never reached this block or the statistics above it.

          Nothing replaces it. Showing real opportunities here requires having
          some.
        */}
      </div>
    </SectionShell>
  );
}

/*
  ══════════════════════════════════════════════════════════════════════════
  THIS SECTION DESCRIBED A DIFFERENT PRODUCT, AND IN TWO PLACES THE OPPOSITE ONE
  ══════════════════════════════════════════════════════════════════════════

  Three of the four cards were wrong, and the two worst were wrong by
  inversion — they advertised as a feature the exact behaviour this pipeline
  was designed to refuse.

  · "Duplicates removed — URL hashing and semantic dedup keep your feed clean
    and signal-rich."

    There is no deduplication in `src/lib/opportunity/`. There was never meant
    to be. `surface/demo.ts` states the principle directly: "The disagreement
    survives to the surface instead of being deduplicated away. Opportunity X
    will not pick one, and says which sources said what." Collapsing two
    sources that disagree into one clean row is how a system quietly chooses a
    deadline on your behalf. The card sold that as a benefit.

    ("feed", "clean" and "signal-rich" are also engagement vocabulary, and
    CR-04 makes engagement void as a measure of this product working.)

  · "AI verified — Confidence scoring on every listing. Anything below 0.6
    never gets published."

    `observation/types.ts` line 109: "There is deliberately no `confidence`."
    No confidence score exists on an observation, by explicit design, because a
    confidence written into the immutable record is a judgment hiding in it.
    The threshold `0.6` appears nowhere in the codebase. A precise-sounding
    number was invented for a mechanism that had been deliberately excluded,
    and a reader would reasonably have quoted it back.

  · "Deadline validated — AI cross-checks deadlines against source pages so you
    never chase expired listings."

    Closer, but it promises certainty the system refuses to claim.
    `deriveOpenState` never reads a source's own statement about closure, and
    when two sources give different deadlines it answers `unknown` rather than
    choosing — "a contested deadline is not a deadline, and picking the later
    one would be optimism written into a function."

  Only "Official sources only" survived contact with the code.

  The replacements below are drawn from `verification/service.ts`,
  `verification/types.ts` and `observation/types.ts`. This was not a case of
  the truth being less impressive than the marketing: verification that expires
  on its own clock, and contradiction as a first-class verdict, are stronger
  claims than a confidence threshold. They are just harder to write if you have
  not read the code.
*/
function SectionVerification() {
  const items = [
    {
      icon: ShieldCheck,
      title: "Official sources only",
      body: "Every opportunity is traced back to the provider that published it, and the page it was read from is kept.",
    },
    {
      icon: Check,
      title: "Verification expires",
      body: "A verdict is checked against the clock every time it is read, so nothing stays verified because it once was.",
    },
    {
      icon: AlertTriangle,
      title: "Disagreement survives",
      body: "When two sources conflict, both are shown and neither is chosen. A contested deadline is reported as unknown, not resolved in your favour.",
    },
    {
      icon: Sparkles,
      title: "No single score",
      body: "Eligibility, fit and risk stay separate, each with the evidence behind it. There is no one number to trust instead of reading.",
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
      subtitle="Opportunity X is built on a verification-first pipeline. If we can’t confirm it, we don’t publish it."
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
          {/*
            This panel said "Recommended for you" above a real, named programme,
            to a reader the system has never met — signed out, no profile, no
            observation of the programme, and discovery never run. Every part of
            that label was false: not recommended, since nothing computed it;
            not for you, since there is no you yet.

            The four verdicts below are the same problem one level down. "Nigeria
            eligible" and "Missing research experience" are checkable claims
            about a real Mastercard Foundation programme and about a reader's
            history, and neither was checked.

            The product already has the honest form of this and has had it for
            some time: `/opportunities/examples`, where fixtures carry the marker
            "Fixture — nothing here was retrieved from a real source" on the card
            itself, so the label travels with the component. The landing page was
            making the same kind of claim with none of that discipline. It now
            uses the same marker, in the same words, and says whose profile the
            verdicts belong to.
          */}
          <p className="mb-5 rounded-md border border-border bg-surface/40 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-text-s">
            Fixture — nothing here was retrieved from a real source
          </p>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-widest text-text-s mb-1">
                How a verdict reads
              </div>
              <h3 className="text-lg md:text-xl font-bold leading-snug">
                Mastercard Foundation Scholars Program
              </h3>
              <div className="text-xs text-text-s mt-1">University of Toronto · Canada</div>
            </div>
            {/*
              A "94% Match" ring stood here, beside a named real programme.

              Two things wrong with it, either of which is disqualifying. CR-21
              forbids collapsing the mechanisms into a single opaque score, and a
              percentage is the composite number that rule names. And the number
              was invented — a fabricated claim about a real opportunity, on the
              product's most public surface.

              What replaces it is what the product actually produces: the reasons,
              which are already listed below. They were always the evidence; the
              number was a summary that had nothing behind it.
            */}
            {/*
              And the phase that removed the ring left this behind in its
              place: a right-aligned label reading "Why", with nothing beneath
              it, one line above a heading that also begins "Why". A word
              hanging in the space a deleted component used to occupy.
            */}
          </div>
          {/* "Why this matches you" — it does not match you; there is no you. */}
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-s mt-4 mb-2">
            Why it matched an example applicant
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
          {/*
            Three buttons stood here — "Apply now", "Save", "Share on WhatsApp"
            — styled as the primary action of the panel. All three were bare
            `<button>` elements with no handler, no href and no form. Clicking
            any of them did nothing at all, silently: no navigation, no error,
            no feedback. Keyboard users reached them in the tab order and got
            the same nothing.

            "Apply now" is the worst of the three, because it is the action the
            whole product is for, and a reader who pressed it had every reason
            to believe an application had begun.

            What replaces them is a link that goes somewhere real. Saving and
            sharing exist on the actual opportunity surface; they do not exist
            here, and a control that cannot act must not be drawn as one.
          */}
          {/*
            `/opportunities/examples` sits under `_authenticated`, so signed out
            this lands on `/auth?next=%2Fopportunities%2Fexamples` and returns
            after signing in. Verified in a browser rather than assumed.

            The label says so. A link that quietly turns into a sign-in wall is
            a smaller version of the same problem as the buttons that did
            nothing: the reader pressed one thing and got another. Whether the
            examples should be public at all is a real question, and a bigger
            one than this phase — it is recorded in the report rather than
            decided here.
          */}
          <Link
            to="/opportunities/examples"
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-panel text-xs font-semibold hover:border-accent/40 transition"
          >
            See worked examples
            <span className="font-normal text-text-s">— sign-in required</span>
          </Link>
        </div>

        {/*
          ══════════════════════════════════════════════════════════════════
          A RANKED LIST OF MATCH PERCENTAGES STOOD HERE
          ══════════════════════════════════════════════════════════════════

          `92%` beside Chevening, `88%` beside DAAD EPOS, `84%` beside MEXT —
          set in gradient text at the largest size in the panel, so the number
          was the first thing the eye reached.

          Two separate violations. CR-21 forbids collapsing the mechanisms into
          a single opaque score, and this product computes no such number: the
          engine produces eligibility, fit, risk and recommendation as separate
          verdicts, each with the evidence that decided it, precisely so that no
          percentage can exist. And the programmes are real, so the figures read
          as findings about real scholarships rather than as illustration.

          A "94% Match" ring was removed from this file in an earlier phase and
          its removal explained a few lines above. The same number came back in
          a different shape three sections later, which is what happens when a
          fabricated signal is deleted one instance at a time instead of swept.
        */}
      </div>
    </SectionShell>
  );
}

/*
  ══════════════════════════════════════════════════════════════════════════
  SIX FEATURES WERE ADVERTISED HERE. FIVE OF THEM WERE DELETED IN PHASE 13.
  ══════════════════════════════════════════════════════════════════════════

  The grid read: "AI SOP & Motivation Letters", "CV Optimization",
  "Application Tracker", "Deadline Reminders", "Document Vault", "Eligibility
  Engine" — each in the present tense, each describing a working capability.

  What the repository says about each, checked rather than assumed. Every one
  of these quotes is a `COMMENT ON TABLE` written into the database itself by
  `20260817190000_mark_legacy_tables_retired.sql`:

    sop_drafts        "RETIRED (Phase 13). Legacy statement-of-purpose drafts."
    cv_suggestions    "RETIRED (Phase 13). Legacy CV suggestions."
    documents         "RETIRED (Phase 13). Legacy document vault."
    applications      "RETIRED (Phase 13). Legacy application tracking."
    sent_reminders    "RETIRED (Phase 13). De-duplication ledger for the legacy
                       reminder job, which is gone."

  Outside `src/routes/index.tsx`, the strings "statement of purpose", "SOP",
  "CV optimi", "kanban" and "vault" appear nowhere in `src/`. There is no
  route, no server function and no table behind five of these six cards. They
  are not unfinished; they were deliberately removed, and the front door went
  on selling them for eight phases afterwards.

  The two partial survivors, stated precisely:

  · Application Tracker — "Kanban-style pipeline from Interested to Submitted
    to Outcome". `opportunity_pursuits` is real and canonical, but
    `PursuitState` is exactly two values: `interested` and `not-interested`.
    There is no Submitted, no Outcome, no pipeline and no board. The claim
    named four things that exist in neither the type nor the schema.

  · Eligibility Engine — this one is genuinely built, in
    `src/lib/opportunity/judgment/`. But "Instant match check" misdescribes
    it in the specific way CR-21 forbids: the engine's whole design is that
    eligibility, fit, risk and recommendation stay separate verdicts with
    their own evidence, so that no single "match" can be quoted. The feature
    was real and the sentence describing it was not.

  This is the largest gap on the site, and it is a different kind from the
  others. The invented statistics and the fake pipeline were things that had
  never been true. These were true once, were removed on purpose, and kept
  being advertised — which is why an audit that only looks for suspicious
  numbers would not have caught them.

  What replaces the grid is the same section, split honestly: what the product
  does today, and what it is built toward, with the second labelled as such.
  CR-09 gives these capabilities real authority — they belong on the roadmap,
  and `docs/ROADMAP.md` carries them. A roadmap stated as a roadmap is not a
  fabrication. A roadmap stated in the present tense is.
*/

const EXECUTION_TODAY = [
  {
    icon: ShieldCheck,
    title: "Separate verdicts, each with its evidence",
    body: "Eligibility, fit, risk and recommendation are decided independently and shown with what decided them. There is deliberately no single match score to quote.",
  },
  {
    icon: ListChecks,
    title: "A record of what you said",
    body: "Say you are interested, or say you are not. Both are kept, because a system that forgets a decline will show it to you again.",
  },
  {
    icon: FileText,
    title: "Every claim traced to a page",
    body: "What a source said, when it was read, and whether anything since has contradicted it.",
  },
];

const EXECUTION_PLANNED = [
  { icon: BriefcaseBusiness, title: "SOP and CV support" },
  { icon: Bell, title: "Deadline reminders" },
  { icon: FolderLock, title: "Document storage" },
  { icon: ListChecks, title: "Application tracking through to outcome" },
];

function SectionExecution() {
  return (
    <SectionShell
      id="execution"
      eyebrow="Execution"
      title={
        <>
          Discovery is step one.{" "}
          <span className="text-gradient">Deciding well is the rest of it.</span>
        </>
      }
      subtitle="What Opportunity X does once it has found something — and, said plainly, what it does not do yet."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXECUTION_TODAY.map((it, i) => (
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

      <div className="mt-8 rounded-2xl border border-border p-6">
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-s mb-1">
          Not built yet
        </div>
        <p className="text-sm text-text-s leading-relaxed mb-4 max-w-[68ch]">
          These are on the roadmap and are not in the product. They are listed here so that the page
          cannot be read as offering them.
        </p>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
          {EXECUTION_PLANNED.map((it) => (
            <li key={it.title} className="flex items-center gap-2.5 text-sm text-text-s">
              <it.icon size={15} className="shrink-0 opacity-60" />
              {it.title}
            </li>
          ))}
        </ul>
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
            to="/opportunities"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl glass-panel font-semibold hover:border-accent/40 transition"
          >
            <Sparkles size={16} /> See opportunities
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
