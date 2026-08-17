-- ══════════════════════════════════════════════════════════════════════════
-- Phase 13 — mark the legacy tables retired. Drop nothing.
-- ══════════════════════════════════════════════════════════════════════════
--
-- Phase 13 retired the pre-migration product from the application: its routes,
-- components, services and every read and write it performed. The tables it used
-- are still here, and this migration deliberately does not remove them.
--
-- ── Why nothing is dropped ────────────────────────────────────────────────
--
-- Because nobody has looked inside them. This environment cannot reach the
-- canonical database (`anfiojmbgonrtympzjch`), so the row counts are unknown,
-- and `saved_opportunities` in particular may hold real statements real people
-- made about their own lives. Dropping a table to tidy a diff is not a
-- reversible act, and "the code no longer reads it" is not evidence that it is
-- empty.
--
-- What this does instead is make the situation legible to anyone who opens the
-- schema: each table says, in the database itself, that it belongs to a retired
-- system and what replaced it. A future engineer finding `saved_opportunities`
-- next to `opportunity_pursuits` would otherwise have to guess which is live.
--
-- ── What must happen before any of these is dropped ───────────────────────
--
-- Per table, in order, recorded in `docs/PHASE_13_CONSOLIDATION.md` §I:
--
--   1. count the rows;
--   2. decide whether the contents are meaningful to a person or only to the
--      retired machinery;
--   3. for anything meaningful — `saved_opportunities`, `applications`,
--      `user_documents`, `generated_sops` — export it before anything else;
--   4. only then write a separate, explicitly destructive migration.
--
-- **Declarations are not migrated between the two models by this or any
-- migration.** `saved_opportunities.opportunity_id` references the legacy
-- `opportunities` table; `opportunity_pursuits.entity_id` references an entity
-- resolved from observations. There is no correspondence between those
-- identifiers, and inventing one would manufacture declarations nobody made.
--
-- ── Safety ────────────────────────────────────────────────────────────────
--
-- `COMMENT ON` is metadata. It changes no data, no constraint, no policy and no
-- privilege, and re-running it is a no-op. The four canonical Opportunity X
-- tables are untouched; `npm run verify:migrations` is re-run after this.

DO $$
DECLARE
  legacy_table text;
  note text;
BEGIN
  FOR legacy_table, note IN
    SELECT * FROM (VALUES
      ('opportunities',
       'RETIRED (Phase 13). The legacy opportunity model. Superseded by opportunity_observations -> entity resolution. Not read by the application.'),
      ('match_scores',
       'RETIRED (Phase 13). A composite 0-1 score per person/opportunity, rendered as a "% Match" ring. CR-21 forbids collapsing the mechanisms into a single opaque score; this table is that score. Not read by the application.'),
      ('saved_opportunities',
       'RETIRED (Phase 13). The legacy saved list. Superseded by opportunity_pursuits. MAY CONTAIN REAL USER STATEMENTS - export before dropping. Its opportunity_id refers to the legacy opportunities table and has no correspondence to opportunity_pursuits.entity_id.'),
      ('eligibility_results',
       'RETIRED (Phase 13). Legacy eligibility checks against the legacy opportunity model. The capability has authority under CR-09; the data model does not survive.'),
      ('generated_sops',
       'RETIRED (Phase 13). Legacy statement-of-purpose drafts. CR-09 preparation; MAY CONTAIN USER-AUTHORED CONTENT - export before dropping.'),
      ('cv_optimizations',
       'RETIRED (Phase 13). Legacy CV suggestions. CR-09 preparation; may reference user documents.'),
      ('user_documents',
       'RETIRED (Phase 13). Legacy document vault. MAY CONTAIN USER-UPLOADED FILES OR REFERENCES - export before dropping.'),
      ('applications',
       'RETIRED (Phase 13). Legacy application tracking. MAY CONTAIN REAL USER RECORDS - export before dropping.'),
      ('notifications',
       'RETIRED (Phase 13). Legacy in-app notifications, written by the deadline-reminder job.'),
      ('sent_reminders',
       'RETIRED (Phase 13). De-duplication ledger for the legacy reminder job, which is gone. Reminders have authority under CR-08 and need a canonical implementation over opportunity_pursuits.'),
      ('discovery_runs',
       'RETIRED (Phase 13). Legacy crawl-run log. Superseded by opportunity_observations, which record what was read rather than that a run happened.'),
      ('opportunity_analytics',
       'RETIRED (Phase 13). Legacy event counts (view/save/share/apply_click). CR-04 makes engagement metrics constitutionally void as a measure of success.')
    ) AS t(name, note)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = legacy_table AND c.relkind = 'r'
    ) THEN
      EXECUTE format('COMMENT ON TABLE public.%I IS %L', legacy_table, note);
    END IF;
  END LOOP;
END $$;

-- The canonical four keep saying what they are, next to the retired ones.
COMMENT ON TABLE public.opportunity_observations IS
  'CANONICAL. Append-only evidence: a claim encountered at a source at a time (CR-36, CR-37).';
COMMENT ON TABLE public.opportunity_verification_events IS
  'CANONICAL. Append-only verification history. A verdict is a live claim with an expiry, not a stored flag (CR-11).';
COMMENT ON TABLE public.opportunity_pursuits IS
  'CANONICAL, and the only declaration store. What a person said about an opportunity. Append-only between declaration and withdrawal; withdrawal is a real delete because the record belongs to them.';
COMMENT ON TABLE public.opportunity_deliveries IS
  'CANONICAL. What was shown to a person, retained as evidence (retention principle). No writer yet - see docs/PHASE_12_COMPLETENESS_AUDIT.md B.6.';
