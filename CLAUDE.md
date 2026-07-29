# Opportunity X — Program Management & Governance System

> This file is loaded automatically at the start of every session. It is the
> canonical operating contract for anyone — human or AI — working on this
> repository. Read `docs/ROADMAP.md` for phase status and `docs/DECISION_LOG.md`
> for the engineering journal before starting work.

## What this product is

**Opportunity X is an AI-powered Opportunity Intelligence Platform.**

It is not a scholarship website, not a search engine, not a job board. It
discovers opportunities from the live web, verifies they are real, explains why
each one fits a specific person, and helps them actually win it.

Every engineering decision must strengthen that. If a requested feature does not,
pause and say so before implementing.

## Operating mode

The primary responsibility is **not** writing code — it is ensuring the product
is built to its long-term vision without architectural drift. Code is the
output, not the objective.

### Before implementing anything

1. Identify which phase the task belongs to (`docs/ROADMAP.md`).
2. Verify its dependencies exist and work — don't assume, check.
3. Decide whether implementation should proceed now or later.
4. State architectural implications.
5. Produce a short plan.
6. Ask if genuinely ambiguous; otherwise proceed under a stated assumption.

Do not jump straight to code on milestone work.

**Calibration:** this ceremony is for milestone-level work. A typo fix, a
one-line answer, or a direct question does not need a phase check and a plan —
applying heavyweight process to trivial work is its own failure mode. Use
judgment; the goal is preventing drift, not generating paperwork.

### Verify, don't assume

Claims about system state must be grounded in a command that was actually run.
A `grep` hit is not proof a feature exists — `Interview` matched this codebase
as an application *status enum*, and `Calendar` as an *icon import*, neither of
which were the features they appeared to be. Confirm what a match actually is
before reporting it as done.

## Stop conditions

Stop and explain rather than continue when:

- The feature belongs to a later phase and its prerequisites are absent.
- A dependency is incomplete.
- A security issue surfaces.
- Authentication is broken.
- The database schema must change.
- Architecture would become inconsistent.
- Existing functionality would be duplicated.
- Requirements are genuinely ambiguous in a way that changes the outcome.

When stopping: say why, recommend the correct order, ask focused questions.
"Stop" means stop *that thread* — finish everything else in scope and report
plainly what was left and why.

## Quality gates

A phase may not be marked complete until all hold:

| Gate | Command / check |
|---|---|
| Zero TypeScript errors | `bunx tsc --noEmit -p .` |
| Zero ESLint errors | `bun run lint` |
| Builds clean | `bun run build` |
| Dev server runs | `bun run dev` |
| No runtime/console errors | manual, in browser |
| Light + dark mode | both themes verified |
| Mobile / tablet / desktop | responsive at all three |
| Accessible | keyboard nav, contrast, labels |
| Tested | see note below |
| Performance acceptable | no obvious regressions |

**These gates currently fail repo-wide** (see `docs/ROADMAP.md` → Quality Gate
Status). Until they pass, no phase can be honestly closed. Report gate status
truthfully — a failing gate reported as passing is worse than the failure.

## Architecture Review Board (ARB)

Before any significant technical decision, answer:

- Is it consistent with the Opportunity Intelligence vision?
- Does it duplicate something that already exists?
- Will it scale?
- Is it secure?
- Is it maintainable and reusable?
- Does it strengthen the AI platform, or just add surface area?

Any "no" → stop, explain, propose a better approach.

**Vendor lock-in rule:** this codebase was extracted from a proprietary
platform (Lovable) at real cost — a wrapped build config, a proxied auth SDK, a
metered AI gateway, and a managed database, all of which had to be unwound. Do
not reintroduce a dependency that owns the build, auth, data, or AI layer
without explicitly flagging the lock-in tradeoff first.

## Founder Vision Guard (FVG)

Continuously check the product against its identity:

- AI-first, not a CRUD app with AI bolted on
- Explainable AI — every opportunity explains itself
- Trust and verification — never surface unverified opportunities as fact
- Premium visual identity (glassmorphism, Opportunity Globe, dark-first)
- Global scale and accessibility

If a feature would make this a generic scholarship listing site, say so.

## Decision log

Every completed milestone task appends an entry to `docs/DECISION_LOG.md`:
feature, purpose, files changed, dependencies, risks, testing, future work.

## Progress reporting

On milestone work, close with a status block: phase, current task, completed,
in progress, blocked, next recommended task, risks, open questions.

Do not print it on trivial exchanges — a status dashboard attached to a one-line
answer is noise, not governance.

## Project facts

- **Runtime/package manager:** Bun (`bun.lock`, `bunfig.toml`). Not npm.
- **Framework:** TanStack Start (file-based routing, `src/routes/`, SSR).
  `routeTree.gen.ts` is generated — never hand-edit.
- **Styling:** Tailwind v4, shadcn/Radix primitives in `src/components/ui/`.
- **Database/auth:** Supabase (project `anfiojmbgonrtympzjch`). RLS enforced.
  Migrations in `supabase/migrations/`, applied in filename order.
- **AI:** Anthropic Claude, direct via `src/lib/ai.server.ts` (`callClaude`).
  Never reintroduce an intermediary gateway.
- **Dev server:** port 5173 (Vite default).
- **Build target:** Cloudflare Workers via Nitro.
- **Secrets:** `.env` holds only public/anon values. `ANTHROPIC_API_KEY` and
  `SUPABASE_SERVICE_ROLE_KEY` are secrets — never commit them. See `.env.example`.

## Server function conventions

- Server-only code lives in `*.server.ts` or a `createServerFn` handler.
  Vite will not bundle `.server.ts` into the client.
- Read `process.env` **inside** handlers, not at module scope — Cloudflare
  Workers bind env per request.
- Public config uses `VITE_`-prefixed vars via `import.meta.env`. Never put a
  secret behind a `VITE_` prefix; it ships to the browser.
- Auth-gated server functions use the `requireSupabaseAuth` middleware.
  Admin-only functions additionally check `has_role(userId, 'admin')`.
