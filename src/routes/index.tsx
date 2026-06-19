import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Sparkles, Share2, Bookmark, Rocket, Zap, Globe2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Opportunity X — AI-discovered opportunities, shared on WhatsApp" },
      {
        name: "description",
        content:
          "Opportunity X surfaces scholarships, internships, fellowships and grants, then makes them effortless to share on WhatsApp with friends, classmates, and community groups.",
      },
      { property: "og:title", content: "Opportunity X" },
      {
        property: "og:description",
        content:
          "AI-discovered opportunities, instantly shareable on WhatsApp. Built for students and communities.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto h-16 px-6 flex items-center justify-between">
          <Link to="/" className="flex flex-col leading-tight">
            <span className="font-mono text-lg font-bold tracking-tighter">
              OPPORTUNITY <span className="text-accent">X</span>
            </span>
            <span className="text-[9px] uppercase tracking-widest text-text-s">
              Powered by AEON X
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              to="/search"
              className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-text-s hover:text-foreground hover:border-accent/40 transition"
            >
              Live Search
            </Link>
            <Link
              to="/auth"
              className="px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6">
        <section className="pt-24 pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-xs text-text-s mb-6"
          >
            <Sparkles size={12} className="text-accent" /> AI-powered discovery
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            Opportunities that <span className="text-accent">spread</span>
            <br /> through your community.
          </h1>
          <p className="text-lg text-text-s max-w-2xl mx-auto mb-10">
            Discover scholarships, internships, fellowships, grants and webinars — then share them
            to WhatsApp in one tap. Built for students, campus groups, and community organizers.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/auth"
              className="px-6 py-3 rounded-xl bg-accent text-accent-foreground font-semibold hover:opacity-90 transition inline-flex items-center gap-2"
            >
              <Rocket size={18} /> Start discovering
            </Link>
            <Link
              to="/search"
              className="px-6 py-3 rounded-xl border border-border font-semibold hover:border-accent/40 transition inline-flex items-center gap-2"
            >
              <Sparkles size={18} /> Try live search
            </Link>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-4 pb-24">
          {[
            {
              icon: Zap,
              title: "AI-curated feed",
              body: "Personalized opportunities matched to your profile, refreshed on demand.",
            },
            {
              icon: Share2,
              title: "WhatsApp-native sharing",
              body: "Every card has a one-tap share — formatted, emoji-rich, ready to forward.",
            },
            {
              icon: Bookmark,
              title: "Personal vault",
              body: "Save opportunities you want to apply to and come back to them anytime.",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl border border-border bg-surface"
            >
              <div className="p-2 inline-flex rounded-lg bg-accent/10 text-accent mb-4">
                <f.icon size={18} />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-text-s">{f.body}</p>
            </motion.div>
          ))}
        </section>

        <section className="pb-24 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-text-s uppercase tracking-widest">
            <Globe2 size={12} /> Built for global student communities
          </div>
        </section>
      </main>
    </div>
  );
}
