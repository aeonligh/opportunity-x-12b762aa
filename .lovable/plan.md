
## Goal

Port the uploaded **Opportunity X** app into this TanStack Start project, replacing Firebase with **Lovable Cloud** (Supabase + AI Gateway), and add a **native WhatsApp share** to every opportunity card.

## What ships

### 1. Lovable Cloud backend
- Enable Lovable Cloud.
- Tables (RLS on, grants set):
  - `profiles` — auto-created on signup (country, interests, education_level, etc.) used by Onboarding / ProfileRefiner.
  - `opportunities` — cached AI-discovered items (title, organization, category, location, deadline, description, ai_insight, apply_url, image_url).
  - `saved_opportunities` — per-user vault (`user_id`, `opportunity_id`, unique).
- Auth: email/password + Google (via Lovable broker).
- AI: replace `aeonService` (Gemini) with a `createServerFn` that calls **Lovable AI Gateway** (`google/gemini-2.5-flash`) to discover/rank opportunities for the signed-in user's profile.

### 2. Routes (TanStack Start, file-based)
```
src/routes/
  index.tsx                       (public LandingPage)
  auth.tsx                        (sign in / sign up)
  _authenticated/
    route.tsx                     (managed auth gate — see template note)
    dashboard.tsx                 (main feed; categories, search, filters)
    vault.tsx                     (saved opportunities)
    onboarding.tsx                (first-run profile capture)
  opportunity.$id.tsx             (public shareable detail page — for WhatsApp links)
```
- `opportunity.$id.tsx` is **public** so WhatsApp recipients can open the link without login. It sets per-route `head()` with title/description/OG image (the discovery link in the share message points here).

### 3. Ported components (from the zip, adapted)
- `LandingPage`, `Onboarding`, `ProfileRefiner`, `FilterPanel`, `Sidebar`, `OpportunityCard`.
- Replace Firebase calls with Supabase queries (browser client) and TanStack Query.
- Keep the dark "AEON" aesthetic from `src/index.css` (port tokens into `src/styles.css` as oklch).
- Keep `motion/react` animations (install `motion`).

### 4. WhatsApp share (the core new requirement)

Reusable component `src/components/ShareToWhatsApp.tsx`:
- WhatsApp icon button (lucide `Share2` styled green, with WhatsApp-style SVG).
- On click, builds the formatted message:

```
🎓 OPPORTUNITY ALERT

🎯 {title}
📌 Category: {category}
🌍 Location: {location}
⏳ Deadline: {deadline}

💡 AI Insight:
{ai_insight}

🔗 Apply:
{public detail URL → /opportunity/{id}}

🚀 Discovered via Opportunity X
```

- Opens `https://wa.me/?text={encodeURIComponent(message)}` via `window.open(url, "_blank", "noopener")`.
- WhatsApp's deep link handles mobile (native app) and desktop (WhatsApp Web) automatically.
- Mounted in **every** `OpportunityCard` action row.

### 5. Card action row (final spec)
Each `OpportunityCard` shows exactly:
- **Save** (bookmark toggle, writes to `saved_opportunities`)
- **Share to WhatsApp** (the new button)
- **Apply Now** (opens `apply_url` in a new tab)

All "diagnostics / debug / backend control" UI from the zip is removed per requirement.

## Out of scope
- Migrating the zip's `firestore.rules`, `server.ts`, or `src/server/pipeline/*` Firebase pipeline (Firebase-specific; replaced by Lovable AI + Supabase).
- The zip's `firebase-applet-config.json` / `firebase-blueprint.json`.
- Telegram / SMS share (requirement only mandates WhatsApp; other channels mentioned as ecosystem context).

## Technical notes
- Per-user OAuth not needed; WhatsApp share uses public `wa.me` deep links — no API key, no connector.
- AI server fn: `src/lib/opportunities.functions.ts` calls Lovable AI Gateway with `LOVABLE_API_KEY`, validates with Zod, caches results to `opportunities` table.
- Public detail route uses a public server fn (`supabaseAdmin` inside handler) so it prerenders/SSRs without a bearer token and so OG tags work when the link is unfurled in WhatsApp.
- `attachSupabaseAuth` is auto-wired by the Supabase integration; protected server fns use `requireSupabaseAuth`.
- Tailwind tokens (bg/surface/accent/text-p/text-s/success/border) ported to `src/styles.css` as oklch CSS vars + `@theme inline` mappings — no hardcoded colors in components.

## Build order
1. Enable Lovable Cloud; create tables, RLS, grants, profile trigger.
2. Port design tokens into `src/styles.css`; install `motion`.
3. Build auth route + managed `_authenticated` gate.
4. Build `ShareToWhatsApp` component (the requirement's core).
5. Port `OpportunityCard` with Save / Share / Apply action row.
6. Build AI discovery server fn + dashboard + vault + onboarding + profile refiner + sidebar + filters.
7. Public `opportunity/$id` detail route with OG tags for WhatsApp unfurling.
8. Landing page.

Confirm to proceed and I'll implement.
