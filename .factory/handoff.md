# Repair handoff — Meal List Boundaries

> **Independent verification 3 (2026-09-05): FAIL.** Candidate and documentation SHA: `893a1849be75baa97b32c9fa90755abf1edcf916`. Core separation, demo isolation, claims declared in `claims.json`, offline reload, response policies, MIME/cache policies, mobile targets, and rate limiting passed. Six release findings remain: the Field Kit checkout link returns 404; the first screen/copy audit violate the plain-words contract; public promises are missing required claim entries/tests; a designed 404 is absent; required site shell/metadata is incomplete; and `/demo` has a minor invalid ARIA role. See `.factory/verification-3.md` for evidence and repair steps. Do not release as PASS.

**Work order:** `meal-list-boundaries-repair-1`
**Base verifier report:** `e0e4c847cd83582f9dd19ef653249dd192da7916` (candidate `10f33f01638a57f4205e8db867cb2afdc2e2e49f`)
**Deployed URL:** <https://meal-list-boundaries.sociobot.in/>
**Deployed:** 2026-08-28 UTC — Azure Static Web Apps deployment `658e691a-e4a2-446f-8a8f-3f1929775cdf`

## Result

All documented release blockers are repaired.

- Bought state is now keyed by `weekStart + boundary + normalized ingredient`. A version-1 local record migrates at load: an old tick is retained only if it can be assigned to exactly one planned week; ambiguous old ticks are reset rather than incorrectly carried into multiple weeks. Imports accept both v1 and v2 exports.
- Added the exact adjacent-week regression in Vitest and Playwright: Basil checked in one week is unchecked when planned in the next week.
- All meal Edit/Remove and boundary Save/Remove controls are at least 44 px high at 390 px; the brand and footer links have 44 px targets too.
- Replaced the single-file build with external hashed JS/CSS/font assets. The build now ships only two WOFF2 assets (44,016 bytes total), not duplicated WOFF/WOFF2 payloads.
- Added `staticwebapp.config.json`: strict CSP without inline script/style allowances, Permissions-Policy, frame protection, correct AVIF/manifest MIME types, immutable hashed asset caching, and update-safe HTML/service-worker caching.
- Updated the worker to cache CORS-tagged external assets correctly (`ignoreVary`) and precache self-hosted fonts. Cache name is now `meal-list-boundaries-shell-v4`.
- Added the required isolated `/demo` sample: Home/Cabin and four sample meals live under IndexedDB key `demo:planner`, with Reset demo and Start for real (which deletes demo data). Documentation is in `.factory/demo.md`; claim coverage is in `.factory/claims.json`.

## Verification

From a clean install in `/work/repo`:

```text
npm ci                         PASS — 130 packages, 0 vulnerabilities
npm run lint                   PASS — TypeScript noEmit
npm test                       PASS — 7 Vitest tests
npm run build                  PASS — dist/index.html at root
npm run test:e2e               PASS — 13 passed, 3 intentional project skips
```

Browser coverage used Chromium desktop and 390 × 844 mobile. It covers two-boundary separation, keyboard reachable dialogs and skip link, QR handoff, empty/error states, light/dark axe, touch targets, reduced motion, demo isolation, adjacent-week state isolation, and offline reload. The live `/demo` check found no browser errors, no horizontal overflow at 390 px, and zero serious/critical axe violations in both themes. First Tab reached **Skip to planner**.

The executable claim entries pass from a clean demo context:

```text
npm run test:e2e -- --grep @claim:demo-sandbox       PASS
npm run test:e2e -- --grep @claim:offline-reload    PASS
npm run test:e2e -- --grep @claim:local-only-data   PASS
```

`@claim:local-only-data` intercepts the whole sample planning flow and observed only the product origin. The PWA test waits for the service worker, switches the browser context offline, reloads `/demo`, and finds the planner plus the offline status.

## Production evidence

- `/opt/fleet/lib/verify-url.sh https://meal-list-boundaries.sociobot.in …` passed: HTTP 200, title, `lang=en`, one `h1`, `main`, image alt text, labelled buttons, and no console/page errors (879 ms scripted load).
- SHA-256 comparison matched all **22 deployable files** in `dist/` against the live paths.
- Live root has the deployed CSP, Permissions-Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and strict referrer policy. Hashed JS, images, and icons return `Cache-Control: public, max-age=31536000, immutable`; HTML and `sw.js` return no-store/no-cache. Live `manifest.webmanifest` is `application/manifest+json`; AVIF is `image/avif`.
- Production budgets: JS 59,352 bytes raw / 20,703 bytes gzip; CSS 17,923 bytes raw / 4,814 bytes gzip; self-hosted fonts 44,016 bytes; mobile AVIF 20,512 bytes.
- Live mobile Lighthouse (Chrome remote-debugging run): Performance **99**, Accessibility **99**, FCP **1.2 s**, LCP **1.6 s**, CLS **0**, TBT **100 ms**.
- The external license endpoint is not part of this static artifact, but live validation observed its repaired finite limit: 30 normal invalid-token responses and 5 `429` responses in a 35-request burst, with `Retry-After: 4`. The independent report records the fresh threshold as 30 allowed / 31st limited.

## Known limits

- Very large selected lists can exceed a practical QR URL capacity; Copy/CSV remain available.
- Data remains deliberately local-first: there is no account, sync service, or collaboration merge.
- No package/consumer test applies because this is a static PWA, not a library or CLI.
