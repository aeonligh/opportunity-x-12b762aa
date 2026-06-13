# Opportunity X — Intelligence Engine Upgrade

Builds on the already-shipped base (auth, cards, WhatsApp share, public detail pages). This plan layers the requested intelligence engine, expanded data model, dashboard sections, analytics, and admin panel.

## 1. Database migrations (Lovable Cloud)

### `opportunities` — extend
Add: `verification_score numeric(3,2)`, `match_score_default numeric(3,2)`, `ai_reasoning text`, `deadline_urgency text` (computed at read time but cached), `source_url text`, `opportunity_type text`, `tags text[] default '{}'`, `categories text[] default '{}'` (multi-category), `featured boolean default false`, `verified boolean default false`, `views_count int default 0`, `trending_score numeric default 0`, `image_url text` (already present).

Only `verified = true` rows are visible to users. RLS: public SELECT where verified; admin full access.

### `profiles` — extend
Add: `university text`, `course_of_study text`, `degree_type text`, `level_of_study text`, `graduation_year int`, `career_interests text[]`, `skill_tags text[]`, `preferred_categories text[]`. Keep existing fields.

### New tables
- `opportunity_analytics(opportunity_id, event_type [view|save|share|apply_click], user_id nullable, created_at)` — append-only.
- `user_roles(user_id, role app_role)` + `app_role` enum (`admin`, `user`) + `has_role()` SECURITY DEFINER function (per the user-roles knowledge — never store role on profile).
- `match_scores(user_id, opportunity_id, score, reasoning, created_at)` — cached per-user scoring.

All with GRANTs (authenticated + service_role; anon SELECT only on `opportunities` where verified).

## 2. Intelligence Engine (server functions)

Replace single `discoverOpportunities` with a pipeline in `src/lib/intelligence.functions.ts`:

```
discoverOpportunities(query, filters)
  ├─ Stage 1 Discovery     → Gemini 2.5 Flash, sources prioritized
  │                          (universities, gov portals, NGOs, foundations,
  │                           international orgs, corporates) — must return source_url
  ├─ Stage 2 Verification  → 2nd AI pass scores realism + URL plausibility
  │                          (verification_score 0-1; drop < 0.6)
  ├─ Stage 3 Classification → assign categories[] + opportunity_type + tags[]
  ├─ Stage 4 Deduplication  → fuzzy match on (title, organization) against
  │                          existing rows; skip duplicates
  ├─ Stage 5 Scoring        → match_score vs user profile + ai_reasoning
  ├─ Stage 6 Persistence    → insert verified rows only
  └─ Stage 7 Recommendation → return ordered list
```

All AI calls go through Lovable AI Gateway with `google/gemini-2.5-flash` and structured JSON output. Strict prompts forbid fabrication; missing source_url → reject. Deadline_urgency derived from `deadline` string parsed to date (`Closing Soon` <7d, `7 Days Left`, `Deadline Passed`).

Additional server fns:
- `recommendedForUser`, `trendingOpportunities`, `newThisWeek`, `endingSoon`, `listByCategory(category)`.
- `trackEvent({opportunity_id, event_type})` — public, rate-limited via simple per-IP check inside handler.
- Admin fns guarded by `has_role(userId, 'admin')`: `approveOpportunity`, `deleteOpportunity`, `featureOpportunity`, `adminAnalytics`.

## 3. Onboarding flow upgrade

`_authenticated/onboarding.tsx` becomes multi-step (motion transitions):
1. Country + University + Course
2. Degree Type + Level + Graduation Year
3. Career Interests + Skill Tags (chip input)
4. Preferred Categories (multi-select from the 10 categories)

Writes to `profiles` then redirects to dashboard.

## 4. Dashboard sections

`_authenticated/dashboard.tsx` rebuilt as a sectioned layout with horizontal scroll rows + search bar + filter chips:

- Recommended For You (uses `match_scores`)
- Trending Opportunities
- New This Week
- Ending Soon
- Scholarships / Internships / Certifications / Fellowships (category rows)
- Saved Opportunities (last 6, link to /vault)

Each section uses TanStack Query with its own server fn + queryKey.

## 5. OpportunityCard upgrade

Displays: image (with fallback gradient), title, organization, category chips, location, deadline, **MatchScoreBadge** (`92% Match` with circular ring), **UrgencyBadge** (color-coded), AI insight (truncated), opportunity_type pill. Action row: Save · Share to WhatsApp · Apply Now. Fires `trackEvent` on view (Intersection Observer), save, share, apply.

## 6. WhatsApp share — new message format

Update `ShareToWhatsApp.tsx` message builder to the exact spec including `📖 Read Full Details`, `📣 Shared via Opportunity X`, and the AEON X Early Access Hub invite link. Fires `trackEvent('share')`.

## 7. Public detail page `/opportunity/{id}`

Already exists. Enhance with: image hero, OG image (`og:image` = opportunity.image_url), Twitter card, JSON-LD `Event`/`EducationalOccupationalProgram` schema, view tracking, "Sign in to save" CTA for unauth users.

## 8. Saved Vault upgrade

`_authenticated/vault.tsx`: search + filter by category + remove action.

## 9. Admin panel `/admin` (hidden)

Pathless layout `_authenticated/_admin/route.tsx` with `beforeLoad` calling `has_role` check; non-admins redirected to dashboard (no UI hint).
- `/admin/queue` — pending (unverified) opportunities → approve/delete
- `/admin/featured` — toggle feature
- `/admin/analytics` — aggregate views/saves/shares/apply_clicks

## 10. Branding & design

Update tagline everywhere to **Opportunity X · Powered by AEON X**. Keep dark OKLCH palette already in `src/styles.css`; add glass utility classes (`backdrop-blur`, translucent surfaces), motion stagger on card grids, mobile-first responsive grid (1 col → 2 → 3).

## 11. Future-proofing

- Generic `modules` enum-style column on opportunities (`module text default 'opportunity_x'`) so Scholarship X / Internship X / Career X can filter on the same table.
- All server fns colocated by domain (`intelligence.functions.ts`, `analytics.functions.ts`, `admin.functions.ts`, `profiles.functions.ts`) — easy to split per module later.
- Shared `ShareableOpportunity` type already extracted.

## Build order

1. Migration: extend tables, add `user_roles` + `has_role`, analytics, match_scores, GRANTs, RLS.
2. Profile + onboarding upgrade.
3. Intelligence engine server fns (7 stages).
4. Dashboard sections + section server fns.
5. OpportunityCard upgrade (match score, urgency, image, type).
6. WhatsApp message format update + analytics tracking.
7. Public detail page polish (OG image, JSON-LD, view tracking).
8. Vault search/filter.
9. Admin panel + role guard.
10. Branding pass.

## Out of scope (call out)

- Real web scraping — AI generates candidates with `source_url`; a real crawler is a later phase.
- Per-IP rate limiting beyond a basic in-memory guard.
- Email notifications for "Ending Soon" — DB structure supports it; sending is later.

Confirm to proceed and I will implement in this order, batching files per step.