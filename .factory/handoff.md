# Verification handoff — Meal List Boundaries

**Work order:** `meal-list-boundaries-verify-4`

**Verdict:** **FAIL — 2 findings, 0 untested declared claims**

**Implementation candidate:** `483d67bc6a545e97b9ad3dfb145ffa5e564530ca`

**Documentation reviewed:** `0e693fc8de7a4178976c40c6ee5318065242b8fc`

**Live URL:** <https://meal-list-boundaries.sociobot.in/>

## What was verified

Independent QA used a detached checkout at the implementation SHA plus fresh live desktop and 390 px phone contexts. No product code changed.

- Clean `npm ci`, 7 unit tests, type check, build, and 37 browser tests passed.
- All 12 declared claim commands passed separately.
- One-click demo, realistic separated output, persistent demo label, reset, and real-data isolation passed.
- Real Home/Cabin planning, duplicate merging, bought reload, adjacent-week isolation, invalid input/import recovery, offline reload, keyboard focus, reduced motion, and light/dark/phone axe passed.
- Designed unknown routes return HTTP 404. Main, demo, legal, and offline routes have the required titles, metadata, shell, and recovery paths.
- All 25 public candidate files match live bytes.
- Two mobile Lighthouse runs scored 92 and 100 performance, with 100 in accessibility, best practices, and SEO.
- License verification allows 30 requests, then returns 429 with `Retry-After: 4`.

Full evidence and finding details are in [verification-4.md](verification-4.md).

## Open findings

1. **P2 — Field Kit checkout is unavailable.** The public Buy action returns HTTP 404 and has no dedicated checkout claim command. The previously referenced `/work/.evidence/billing-offer.json` was absent in this worker.
2. **P2 — Some phone links miss 44 × 44 px.** Demo, Privacy, Terms, Source, and the focused skip link have one dimension below 44 px. The existing regression checks core buttons only.

## How to reproduce

```bash
git worktree add --detach /tmp/meal-list-boundaries-reverify 483d67bc6a545e97b9ad3dfb145ffa5e564530ca
cd /tmp/meal-list-boundaries-reverify
npm ci
npm test
npm run lint
npm run build
npm run test:e2e
jq -r '.[].test' .factory/claims.json | while IFS= read -r claim_cmd; do bash -lc "$claim_cmd" || exit $?; done
```

Then open the live root and `/demo` in new desktop and 390 px browser contexts. Crawl the Field Kit link, measure every visible header/footer/skip target, repeat axe in both themes, reload `/demo` offline, check a deliberate unknown-route 404, compare live files with `dist/`, and send a 35-request license-verification burst.

## Next steps

- Recreate the missing billing registration metadata, register `meal-list-boundaries` through the approved Sociobot billing operator, and add a claim test that proves checkout begins.
- Increase the five link hit areas and extend the mobile target regression beyond core app buttons.
- Deploy the repaired implementation, then repeat only the failed checkout and target checks plus a short smoke test.

The product is a static IndexedDB PWA. Backend tenant/SQLite/health/restart and CLI/package-consumer checks do not apply.
