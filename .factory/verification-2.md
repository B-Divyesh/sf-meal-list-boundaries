# Independent verification 2 — FAIL

**Work order:** `meal-list-boundaries-verify-2`<br>
**Candidate:** `10f33f01638a57f4205e8db867cb2afdc2e2e49f`<br>
**Live URL:** https://meal-list-boundaries.sociobot.in/<br>
**Verified:** 2026-08-28 UTC

## Decision

**FAIL.** The candidate builds cleanly, the live deployment matches all 17 built files, the main two-household workflow works, and the previously reported external rate-limit failure is fixed. However, bought state leaks across weeks: an ingredient marked gathered this week starts already gathered when the same boundary and ingredient are planned next week. That is a P1 failure of the product's recurring weekly checklist boundary.

The live deployment also misses the acceptance contract's 44 px touch-target, font, repeatable Lighthouse, immutable caching, browser-policy, and MIME requirements. No product code was changed during this verification.

## Clean-checkout gates

Verification ran from a new detached worktree at `/tmp/meal-list-boundaries-verify2.0jq5xG`, checked out at the exact candidate SHA.

| Check | Result | Evidence |
| --- | --- | --- |
| Candidate identity | PASS | Detached checkout resolved exactly to `10f33f01638a57f4205e8db867cb2afdc2e2e49f`. |
| Clean install | PASS | `npm ci` installed 137 packages; audit reported 0 vulnerabilities. |
| Unit/integration tests | PASS | `npm test`: 5/5 Vitest tests passed. |
| Type check and production build | PASS | `npm run build` ran `tsc --noEmit && vite build`, produced `dist/`, and exited 0. |
| Lint | N/A | The repository defines no lint script or separate lint configuration. |
| Browser suite | PASS | `npm run test:e2e`: 6 passed and 2 intentional project skips across desktop and 390 px projects. |
| Library/CLI consumer check | N/A | This artifact is a static PWA, not a package or CLI. |

## End-to-end product exercise

Fresh live Chromium profiles were used rather than relying only on the builder's tests.

- Created `Home` and `Cabin`; a 45-character boundary value was constrained to the declared 40-character maximum. A third free boundary was rejected with the Field Kit explanation and the first two remained intact.
- Attempted a blank meal submission. Native required-field validation kept the dialog open; completing the meal then recovered normally.
- Planned `Pasta night` for Home with `Basil`, whitespace/case duplicate `basil`, and `2 cans tomatoes`; planned `Cabin soup & bread` for Cabin with `Basil` and `Bread`.
- Home produced one Basil row with count 2 plus tomatoes. Cabin produced Basil and Bread. Neither list contained the other boundary's unique item.
- Bought state persisted across reload. Undo returned an item to the list immediately, and a subsequent gathered state persisted.
- JSON export contained exactly two boundaries and two meals. Importing structurally invalid JSON showed the documented error and left the existing planner unchanged.
- QR/share payload decoded to the Home boundary and its two items only; it contained neither `Cabin` nor `Bread`. Shared-list bought state survived reload. An invalid share payload showed a recovery screen and `Open my planner` action.
- The empty plan/list states, next-week plan, one-time Field Kit copy, legal pages, export/import controls, and destructive confirmations were present.

### Core persistence failure

The following live reproduction failed:

1. Add Home / `Week one dinner` / `Basil` for **Aug 24–30, 2026**.
2. Mark Basil gathered; the first-week checkbox is checked.
3. Navigate to **Aug 31 – Sep 6, 2026** and add a different meal with Basil for Home.
4. Open Lists. The new week immediately reports **`1 of 1 gathered`**, with Basil already checked.

The implementation keys bought state as boundary ID plus normalized ingredient text, without the week. Meal records are week-scoped, but checklist state is not.

## Accessibility, mobile, and browser quality

- Live structure has `lang="en"`, the expected title, exactly one `h1`, and one `main`.
- Keyboard-only setup, meal entry, boundary selection, view switching, checkbox use, undo, and dialog closing worked. The first Tab exposed `Skip to planner` with `rgb(147, 106, 22) solid 3px` focus.
- Fresh axe scans of a populated live planner in both light and dark themes found **0 serious/critical violations** and no violations at any impact level. The repository suite separately covers the empty home state.
- At 390 x 844 there was no horizontal overflow. The stacked plan/list layout was visually reviewed in Chromium.
- Several interactive targets are below the required 44 x 44 CSS px: meal `Edit` and `Remove` are 56 x 36; boundary `Save` is 178 x 42 and `Remove` is 74 x 42. The brand and footer links also have less than 44 px height.
- Under `prefers-reduced-motion: reduce`, animation and transition duration computed to `1e-05s` and root scrolling became `auto`.
- The representative live journey produced no console errors, page errors, failed requests, or HTTP responses >=400.

## Privacy, network, and legal checks

- A fresh no-license planner journey contacted only `https://meal-list-boundaries.sociobot.in`; no analytics, trackers, retailer APIs, recipe services, CDN fonts, or account providers were observed.
- Planner data is stored in IndexedDB. Theme, shared-list check state, and license metadata use localStorage. Export and import provide local data ownership.
- The invalid license restore sent only the license token to the documented Sociobot endpoint. It returned `200`, `{"expires_at":null,"reason":"invalid","valid":false}`, with CORS restricted to the product origin. The free planner remained usable.
- Privacy and terms pages accurately disclose device storage, URL-embedded handoff data, Sociobot/Dodo purchase handling, the $12 one-time price, and refund revocation.
- The product has no sign-in; the Entra authority requirement is not applicable.

## PWA, offline, and update behavior

- Manifest content declares standalone display, versioned start URL, matching theme/background colors, and 192/512 PNG icons with maskable purpose.
- The live page was controlled by `https://meal-list-boundaries.sociobot.in/sw.js` with cache `meal-list-boundaries-shell-v3`. After `context.setOffline(true)`, live reload retained the planner heading and displayed `Offline · changes stay here`, with no errors.
- A local in-memory server served the unmodified production build, then returned a changed service-worker response to simulate a deployment. The running app displayed `An updated field sheet is ready`; before action, the new worker was `installed`/waiting. Activating `Reload` moved it to active/activated with no waiting worker. Offline reload then passed.
- Source review confirms versioned cache cleanup, navigation network-first behavior, asset cache-first behavior, client claiming, update notification, and explicit `SKIP_WAITING` handling.

## Candidate/live identity

Every one of the 17 files under the candidate's `dist/` was fetched from the matching live path and compared byte-for-byte. All returned `200` and all SHA-256 values matched. Important examples:

```text
index.html           88ba89b85b6a0ad0b00f25dee46ec3108abca7197f76f32ff347bcf8089d6114
sw.js                90feea68f518f6647f1396a150dc6d1599f7de96c4f45a690629c9c76ee7084a
manifest.webmanifest abcd8ee3ce29aa8b476c64e394ce5464c67f491c43d28283f195dcff8d63e36a
```

This confirms the live product is the candidate, not a stale or different build.

## Rate limiting

**PASS; the earlier deployment-only failure is resolved.** A fresh concurrent burst sent 200 requests in 1,524 ms to:

```text
GET https://api.sociobot.in/api/v1/products/meal-list-boundaries/verify?license=qa-verify2-rate-limit-invalid
```

Results were 30 x `200` and 170 x `429`. The first limited request was request **31**, so the observed burst threshold was **30 allowed / 31st limited**. Every `429` included `Retry-After: 4`; there were no transport errors.

## Performance and bundle evidence

| Measure | Result |
| --- | --- |
| `dist/index.html` | 255,030 bytes raw / 161,678 bytes gzip |
| Inline application JavaScript | 56,611 bytes raw / 20,220 bytes gzip — PASS against 200 KB |
| CSS excluding embedded font data | 17,083 bytes raw / 4,596 bytes gzip — PASS against 50 KB |
| Embedded font binaries | 135,332 bytes (3 WOFF2 + 3 duplicate WOFF fallbacks) — FAIL against 120 KB |
| Mobile AVIF hero | 20,512 bytes — PASS against 300 KB |

Two fresh throttled mobile Lighthouse runs against live scored:

| Run | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | **84** | 100 | 100 | 100 | 1.6 s | 2.1 s | 530 ms | 0.062 |
| 2 | **90** | 100 | 100 | 100 | 1.6 s | 2.1 s | 340 ms | 0.062 |

LCP and CLS satisfy their stated budgets, but the first run misses the required Lighthouse performance score and performance is not repeatably >=90. Lighthouse identified unused inline CSS/JavaScript and image-delivery savings; the inline duplicate font formats are the largest bundle-policy issue.

## Response headers and caching

The live root supplies HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`. It does not supply Content-Security-Policy, Permissions-Policy, X-Frame-Options, or a CSP `frame-ancestors` directive.

Root HTML, service worker, manifest, hero, legal pages, and icons all use `Cache-Control: public, must-revalidate, max-age=30`. Static images/icons are not long-lived or immutable. The root is Brotli-compressed when requested with compression.

`manifest.webmanifest` and the checked AVIF hero are served as `application/octet-stream`; the manifest should be `application/manifest+json` or JSON and AVIF should be `image/avif`.

## Defects by severity

### P1 — bought state leaks across weeks

An ingredient checked in one week is already checked in every other week where the same normalized ingredient appears under the same boundary. This makes a new week's shopping list incorrectly claim items are already gathered. Include the week in the bought-state identity and migrate existing stored state safely; add a regression test covering the same ingredient/boundary in adjacent weeks.

### P2 — mobile touch targets miss the 44 px acceptance baseline

Core meal Edit/Remove controls are 36 px tall and boundary Save/Remove controls are 42 px tall at 390 px. Increase the interactive hit areas to at least 44 x 44 CSS px; review the brand/legal links at the same time.

### P2 — static cache policy is short-lived and not immutable

All checked assets revalidate after 30 seconds. Configure long-lived immutable caching for versioned/content-stable images and icons while keeping HTML and the service worker on an update-safe policy.

### P2 — browser response hardening is incomplete

The root has no CSP, Permissions-Policy, or effective frame-ancestor protection. Add a least-privilege policy compatible with the inline single-file build, or revise the build so a strict nonce/hash-based CSP can be deployed.

### P2 — font/performance acceptance is not met consistently

The single-file build embeds both WOFF2 and WOFF copies for each of three faces, totaling 135,332 font bytes against the 120 KB limit. Fresh Lighthouse performance was 84 then 90, not consistently >=90. Remove duplicate fallback payloads/subset further and remeasure.

### P3 — manifest and AVIF MIME types are generic

The host serves both as `application/octet-stream`. Configure `application/manifest+json` (or JSON) for the manifest and `image/avif` for AVIF images.

## Reverification

After fixing the P1 state key and deployment/accessibility budgets, repeat:

```bash
git worktree add --detach /tmp/meal-list-boundaries-reverify <new-candidate-sha>
cd /tmp/meal-list-boundaries-reverify
npm ci
npm test
npm run build
npm run test:e2e
```

Then reproduce the same ingredient in adjacent weeks, measure the 390 px targets, run two mobile Lighthouse passes, compare every live `dist/` file, perform live offline/update checks, inspect headers/MIME/caching, and repeat the 200-request license-verification burst.
