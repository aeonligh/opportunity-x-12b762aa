# Nigerian undergraduate pilot

Status as of 3 October 2026: prepared for review; live acquisition and authenticated user journey remain blocked.

## Verified baseline

The canonical repository is `aeonligh/opportunity-x-12b762aa`. Vercel production serves commit `6b7439b08b77dfb052b243f7047e12d2fcc9dce2` at https://opportunity-x-12b762aa.vercel.app. The protected route's HTML returned HTTP 200; this is not proof of an authenticated journey.

Supabase project `anfiojmbgonrtympzjch` is INACTIVE. A read-only count query timed out. A restore request was refused because the account has reached its two-active-project Free limit, a limit assessed across organisations. Current observation and user counts are unknown. The earlier phase's zero counts have not been re-used as a current measurement.

Recovery requires an owner decision to free a project slot or choose a paid plan. This change does not pause another project or change billing.

## Scope

The pilot targets Nigerian undergraduates, initially reachable through UNIBEN. Its source pack has 25 pages across 20 publishers. Sources are starting points for review, not a claim that 25 opportunities are open or eligible for a particular person.

The default publisher registry adds the pilot publishers. General discovery remains available and therefore has a larger seed registry. The explicit pilot command reads only the selected pages, subject to the existing robots rules, politeness, recent-observation window and transport. It does not follow links, recheck unrelated observations or run open-web search. It uses the existing append-only observation and verification pipeline. No database schema, auth flow or product surface changes.

## Commands

Install with Bun and the committed lockfile:

```sh
bun install --frozen-lockfile
bun run sweep --pilot --dry-run
```

The dry run prints 25 seed URLs without credentials, requests or writes. Any unknown ID or option is refused, including a mixed list containing valid and invalid IDs.

After project recovery, server-only credentials and a network with ordinary outbound HTTPS are verified:

```sh
bun run sweep --pilot
```

This live command writes immutable observations. A blocked development network must not be used to write environmental failures against healthy publishers. The existing transport choice is explicit: Firecrawl when configured, direct otherwise. Robots requests add to retrieval cost. No scheduler or cron is installed by this change.

For normal discovery:

```sh
bun run sweep ng-uniben
bun run sweep --dry-run ng-uniben
```

A named publisher in a general run bounds its institutional seeds; general change detection and open-web search retain their existing wider scope, printed in the dry run.

## Source and extraction review

Research evidence is in `sources-20261003.json`. A web research retrieval is not an engine observation. No research output was inserted into the production store.

Current source review confirms closed rounds, a Millennium 2027 waitlist and several pages requiring cycle checks. It confirms no open award in this pack. A new application round needs a new cycle identity. A closed call can support document preparation, not an Apply-now recommendation.

The default extractor reads JSON-LD opportunity types and page metadata. A prose-only scholarship page can be retrieved yet produce no opportunity entity. The pilot therefore needs manual review alongside the engine. Adding prose extraction or operator-reviewed claims is a separate acquisition task with explicit provenance; converting page titles into verified opportunities would violate the current model.

## Launch checks after recovery

1. Confirm project is ACTIVE_HEALTHY and run a read-only query.
2. Confirm the existing server variables are set in Vercel, using `.env.example` and server client code as the authority. Keep privileged keys server-only.
3. Use an actual consenting test account to verify signup/confirmation, sign-in, deep-link return, opportunities, saved and sign-out.
4. Run a bounded live acquisition from an unrestricted network. Inspect actual observations, unreadable pages and retrieval watermark.
5. Promote only manually checked open calls that fit a real participant. Do not treat successful retrieval as successful extraction or verified eligibility.

The operating pilot can conduct interviews and document preparation while these checks remain open.

## Validation

- Build passes.
- TypeScript: zero errors.
- ESLint: zero errors; eight pre-existing React refresh warnings, unchanged.
- Full suite: 410 tests, 409 passed, one build-artifact test skipped while the build was still in progress. The affected consolidation file was run after the build: 11/11 passed, including that check.
- New pilot tests: six passed, covering actual CLI invocation, mixed invalid IDs, immutable pilot selection, publisher ownership, exact seed retrieval and preservation of the general mechanisms.
- Artifact verification: 56 passed, zero failed.
- Live database, authenticated journey and acquisition: blocked/unverified, not claimed complete.

No new frontend flow was added. The product's existing local UI evidence is not represented as a new production browser test.
