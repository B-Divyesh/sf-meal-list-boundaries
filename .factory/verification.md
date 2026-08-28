# Independent verification — FAIL

**Work order:** `meal-list-boundaries-verify-1`
**Candidate:** `10f33f01638a57f4205e8db867cb2afdc2e2e49f`
**Live URL:** https://meal-list-boundaries.sociobot.in/
**Verified:** 2026-08-28 (UTC)

## Decision

**FAIL.** The product’s core local-first planning job works and the deployed files match the candidate exactly. However, the only server-side product endpoint used by the application—the Sociobot license verification endpoint—did not return `429` or a `Retry-After` header in the required rapid-request check. This does not meet the work-order rate-limiting acceptance condition.

## Clean-checkout gates

Verification ran from a new detached worktree at `/tmp/meal-list-boundaries-verify`, checked out at the candidate SHA.

| Check | Result | Evidence |
| --- | --- | --- |
| Clean install | PASS | `npm ci`: 137 packages installed; audit reported 0 vulnerabilities. |
| Unit/integration | PASS | `npm test`: 5/5 Vitest tests passed. |
| Type check / production build | PASS | `npm run build` runs `tsc --noEmit && vite build`; completed successfully and produced `dist/`. No separate lint script is defined. |
| Browser suite | PASS | Fresh standalone `npm run test:e2e`: 6 passed, 2 intentional project skips. It covers desktop + 390px, core separation, QR handoff, axe, and offline reload. |
| Build budget | PASS | `dist/index.html` is 255,030 bytes raw / 161.68 KB gzip; the shipped inlined application stays inside the 200 KB initial-JS budget. CSS before inlining is 23.8 KB, inside 50 KB. The mobile AVIF hero is 20,512 bytes. |

An attempted Lighthouse CLI run could not produce a report because the supplied Chromium closed its DevTools connection (`Connection closed` / `Unable to connect to Chrome`). This is a QA-container tooling limitation, not counted as a product defect; static budgets and browser behavior above were independently checked.

## Product exercise

Fresh Chromium sessions against the live URL verified all of the following:

- Added `Home` and `Cabin`, then planned `Pasta` for Home (`Basil`, `2 cans tomatoes`, duplicate `Basil`) and `Cabin soup` for Cabin (`Basil`, `Bread`).
- Lists were exactly separated: Home contained `Basil` (one deduplicated row, count 2) and `2 cans tomatoes`; Cabin contained `Basil` and `Bread`. No cross-boundary item appeared.
- The two-boundary free-tier edge showed the clear Field Kit message and retained exactly two boundaries.
- Empty meal submission remained in the dialog with the browser-required validation message; after completing the fields, normal saving recovered correctly.
- Invalid JSON import showed “That file uses an unsupported or incomplete export format” and did not replace planner data.
- Bought state survived reload. A generated QR code and selected-boundary share URL were present; the payload contained Home’s two items only.
- Export/import controls, CSV/print/share actions, and destructive-action confirmations are available in the UI. The project is an application, not a library/CLI, so consumer package checks are not applicable.

## Browser, accessibility, privacy, and PWA evidence

- Live page: title present, `lang="en"`, exactly one `h1`, and one `main` landmark.
- Keyboard: the first Tab focuses “Skip to planner” with a visible `rgb(147, 106, 22) solid 3px` outline. Dialog controls and normal planner flow were exercised by keyboard-addressable controls.
- axe (live desktop): **0 serious/critical** findings. No browser console errors, page errors, or HTTP responses >=400 occurred during the representative journey.
- 390 x 844 mobile: no horizontal overflow; visually reviewed alongside the desktop rendering. The intended stacked layout and controls were visible.
- Reduced-motion context: animation and transition durations computed as `1e-05s`.
- Fresh no-license session made requests only to `https://meal-list-boundaries.sociobot.in`; no trackers, CDN fonts, accounts, recipe calls, retailer calls, or analytics were observed. Planner state persists in IndexedDB and the privacy/terms pages are live. Sign-in is not part of this product.
- PWA: manifest declares standalone display, versioned start URL, 192/512 icons including maskable purpose. The live page was controlled by `meal-list-boundaries-shell-v3`; after `context.setOffline(true)`, reload retained the app heading and showed “Offline · changes stay here”, without errors. The service-worker source includes versioned cache cleanup, `skipWaiting`, `clientsClaim`, and an update-available toast/reload path. A new live worker revision was not available during this verification to produce a real deployment-update transition.

## Live/candidate identity and response policies

`sha256sum` matched live and built `index.html` exactly:

```text
88ba89b85b6a0ad0b00f25dee46ec3108abca7197f76f32ff347bcf8089d6114
```

The following live files also matched their `dist/` counterparts: `sw.js`, `manifest.webmanifest`, `offline.html`, privacy and terms pages, `legal.css`, both checked AVIF hero variants, and both PNG icons.

The root response supplies HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`. It does not supply CSP, Permissions-Policy, X-Frame-Options, or cross-origin isolation headers. All checked static responses (`index.html`, `sw.js`, hero AVIF, icon) have `Cache-Control: public, must-revalidate, max-age=30`; the manifest is served as `application/octet-stream`.

## Defects

### P1 — required rate limit absent on license verification

`GET https://api.sociobot.in/api/v1/products/meal-list-boundaries/verify?license=qa-invalid-license-token` is the API called by the optional license-restore flow. Two immediate request sets were sent from this verifier: 40 followed by 120 requests (160 total). Every response was `200` with the normal invalid-token JSON response; none was `429`, and no `Retry-After` or rate-limit header was returned. The limit threshold is therefore **not observed through at least 160 rapid requests**.

This is an explicit work-order failure even though the normal invalid-token response is correct (`{"valid":false,"reason":"invalid","expires_at":null}`). Configure a finite limit that returns `429` with `Retry-After`, then reverify and record the first threshold.

### P2 — static cache policy does not meet the stated immutable-asset policy

Live static files, including versioned service-worker assets and image/icon files, are only cacheable for 30 seconds and are not marked immutable. This conflicts with the supplied long-lived immutable-cache requirement and reduces offline/performance efficiency. Configure long-lived immutable caching for content-addressed/static assets while retaining an appropriate service-worker policy.

### P2 — browser response hardening is incomplete

The live root has no Content-Security-Policy or Permissions-Policy. Add a restrictive CSP appropriate for the inlined Vite application and a least-privilege Permissions-Policy; consider frame protection as part of the deployment policy. This did not cause an observed functional or axe failure, but it is a response-policy gap.

### P3 — manifest MIME type is generic

`/manifest.webmanifest` is served as `application/octet-stream`, rather than a manifest/JSON MIME type. Chromium accepted it in this check, but it should be served as `application/manifest+json` (or `application/json`) for interoperable PWA delivery.

## Reverification command set

```bash
git worktree add --detach /tmp/meal-list-boundaries-verify 10f33f01638a57f4205e8db867cb2afdc2e2e49f
cd /tmp/meal-list-boundaries-verify
npm ci
npm test
npm run build
npm run test:e2e
```

Then compare the deployed root and static-file SHA-256 values to `dist/`, repeat the live browser journey, offline reload, axe scan, response-header review, and the license verification burst. Do not mark PASS until the API returns `429` with `Retry-After` at a documented finite threshold.
