# Repair handoff — Meal List Boundaries

**Work order:** `meal-list-boundaries-repair-2`

**Implementation and deployed artifact SHA:** `483d67bc6a545e97b9ad3dfb145ffa5e564530ca`

**Previous failed implementation:** `893a1849be75baa97b32c9fa90755abf1edcf916`

**Live URL:** <https://meal-list-boundaries.sociobot.in/>

**Production deployment:** `59111ad6-3ee5-4ffa-ab9a-d8aee271785b`, 6 September 2026 UTC

## Result

Five repository findings are fixed and deployed. Field Kit checkout still needs the controller’s billing-registration operator. The exact public offer is in `/work/.evidence/billing-offer.json`; the free planner and license handling remain complete.

- Replaced metaphor copy with a verb-first job title, named audience, explained sample action, and three plain facts before scrolling.
- Expanded `.factory/copy-audit.md` across the first screen, planner states, forms, demo, and footer. No audited line exceeds 22 words or uses a banned marketing term.
- Expanded `.factory/claims.json` from 3 to 12 claims. Each has one tagged outcome test against a clean sample or recorded license response.
- Added an original 1200 × 630 social image derived from the reviewed botanical plate, plus an Apple touch icon and provenance.
- Added canonical, Open Graph, Twitter, route title, navigation, footer, version, and build metadata across all routes.
- Added a styled `404.html`. Unknown production paths now return HTTP 404 with that page and a working route home.
- Removed the invalid `status` role from the interactive demo banner.
- Fixed demo reset so checkbox state updates immediately and real planner data remains unchanged.
- Removed color transitions that briefly produced invalid dark-theme contrast during a theme change.
- Added browser checks for invalid input recovery, keyboard focus return, reduced motion, route metadata, and 404 recovery.

## Clean-checkout verification

The final implementation was checked from a detached worktree at the exact implementation SHA.

```text
npm ci              PASS — 130 packages, 0 vulnerabilities
npm test            PASS — 7 Vitest tests
npm run lint        PASS — TypeScript noEmit
npm run build       PASS — dist/index.html at root
npm run test:e2e    PASS — 37 passed, 3 intentional project skips
```

All 12 commands declared in `.factory/claims.json` were then run separately. Every command passed. The only skip is the intentional mobile duplicate of the service-worker offline check.

Browser coverage includes list separation, duplicate merging, week-scoped bought state, copy/QR, CSV, selected-list print, JSON round-trip, free limits, licensed templates, revocation, demo isolation, reset, invalid import, keyboard focus, 390 px layout, dark/light axe, reduced motion, and offline reload.

## Live verification

- `/opt/fleet/lib/verify-url.sh` passed in `/work/.evidence/repair-2-live-final`: HTTP 200, 702 ms scripted load, correct title/lang/main/H1/alt text, and no console errors.
- Fresh 1440 × 1000 and 390 × 844 sessions showed the job, audience, sample action, and all three facts before scrolling.
- The one-click demo loaded four meals and two separated lists. Reset cleared the sample checkmark. Leaving demo preserved a pre-existing real place.
- Fresh phone and desktop sessions had no horizontal overflow or console errors. Demo axe scans found zero violations in light and dark themes.
- Offline `/demo` reload retained the sample and showed `Offline · changes stay on this device`.
- `/`, `/demo`, `/privacy/`, and `/terms/` return 200 with distinct titles, canonical URLs, one H1, navigation, and footer.
- `/repair-2-not-found` returns a deliberate HTTP 404 with `Page not found — Meal List Boundaries` and a working home link.
- All 25 public files in `dist/` match the live bytes. The host consumes `staticwebapp.config.json`, so that file is excluded from the public comparison.
- Live mobile Lighthouse: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.2 s, LCP 1.7 s, TBT 0 ms, CLS 0.001.
- Final bundle: JavaScript 62,200 bytes raw / 21,620 gzip; CSS 19,280 bytes raw / 5,000 gzip; fonts 44,016 bytes; mobile hero AVIF 20,512 bytes.
- Static assets retain one-year immutable caching. HTML and the service worker remain update-safe. CSP, Permissions-Policy, frame protection, referrer policy, MIME types, and HSTS are live.
- License verification still limits a burst at 30 requests: 30 responses were 200, 5 were 429, and every 429 sent `Retry-After: 4`.

## Finding disposition

| Finding | Disposition |
| --- | --- |
| Field Kit checkout returned 404 | **External dependency remains.** The exact $12 one-time offer metadata was supplied for registration. The live checkout still returned 404 at final check. |
| First-screen and metaphor copy | **Fixed and live.** |
| Missing claims and tagged tests | **Fixed.** Twelve declared claims pass independently. |
| Missing designed 404 | **Fixed and live.** Unknown routes return 404, not the planner. |
| Missing shell and metadata | **Fixed and live.** |
| Invalid demo banner ARIA role | **Fixed.** Live axe is clean in both themes. |
| Earlier week-state leak | **Still fixed.** Adjacent-week regression passes. |
| Earlier targets, cache, headers, MIME, and font budgets | **Still fixed and rechecked.** |
| Earlier license rate limit | **Still fixed.** Threshold remains 30 allowed / 31st limited. |

## Known limits and next step

- The billing-registration operator must register `meal-list-boundaries` from `/work/.evidence/billing-offer.json`, then confirm the checkout redirects to hosted payment. A redirect alone does not prove entitlement; valid, invalid, and revoked license behavior is already covered with recorded responses.
- Large shopping lists can exceed practical QR URL capacity. Copy and CSV remain available.
- Data stays local by design. There is no account, cloud sync, retailer integration, or shared database.
- Backend tenant, restart, and persistence checks do not apply to this static IndexedDB PWA. Package-consumer checks do not apply.
