# Verify separate shopping lists across homes — FAIL

**Work order:** `meal-list-boundaries-verify-4`

**Implementation candidate:** `483d67bc6a545e97b9ad3dfb145ffa5e564530ca`

**Documentation reviewed:** `0e693fc8de7a4178976c40c6ee5318065242b8fc`

**Live URL:** <https://meal-list-boundaries.sociobot.in/>

**Verified:** 6 September 2026 UTC

## Verdict

**FAIL — 2 findings, 0 untested declared claims.**

The main local-first planning job, demo isolation, offline reload, accessibility, route handling, and all 12 declared claim commands pass. The product cannot receive a PASS because the public Field Kit purchase path returns 404 and several phone links remain smaller than the required 44 × 44 CSS px target.

The Field Kit action is directly tested and failed, so it is not counted as untested. It is also missing a dedicated claim command: the existing `field-kit-offer` fixture test proves the displayed price and post-license features, not that **Buy Field Kit** starts checkout.

## Job, audience, and first action before scrolling

The job is to make separate shopping lists from one weekly meal plan so items do not cross between homes or pickups.

The audience is households planning meals for more than one home or pickup.

The first action is **Try it with sample data**. The adjacent text says it loads four meals and two shopping lists. Desktop and 390 px phone sessions showed the job, audience, action, and three privacy/offline/price facts before scrolling.

## Clean candidate checks

A detached checkout at the exact implementation SHA was installed and tested independently in `/tmp/meal-list-boundaries-verify4`.

| Check | Result |
| --- | --- |
| Candidate identity | PASS — exact SHA `483d67bc6a545e97b9ad3dfb145ffa5e564530ca` |
| `npm ci` | PASS — 130 packages, 0 vulnerabilities |
| `npm test` | PASS — 7/7 Vitest tests |
| `npm run lint` | PASS — TypeScript `noEmit` |
| `npm run build` | PASS — `dist/index.html` at the root |
| `npm run test:e2e` | PASS — 37 passed, 3 intentional project skips |

The build contains 62,202 bytes of JavaScript, 19,280 bytes of CSS, 44,016 bytes of self-hosted fonts, and a 20,512-byte mobile AVIF hero. These pass the supplied static PWA budgets.

## Declared claims

Every command in `.factory/claims.json` was invoked separately from the detached checkout. All passed.

| Claim | Result | Observed outcome |
| --- | --- | --- |
| `demo-sandbox` | PASS | Real planner state survived demo edits, reset, and exit |
| `offline-reload` | PASS | 1 desktop pass; 1 intentional mobile duplicate skip |
| `local-only-data` | PASS | Sample planning requests stayed on the product origin |
| `list-separation` | PASS | Shared ingredients stayed in their own lists; duplicates merged within one list |
| `bought-state` | PASS | Bought state survived reload and did not enter the next week |
| `single-list-sharing` | PASS | Copied and QR links contained only the selected list |
| `csv-export` | PASS | Selected list produced the expected CSV only |
| `json-backup` | PASS | Complete planner exported and imported |
| `selected-list-print` | PASS | Print state contained only the selected list |
| `free-two-places` | PASS | Two places remained; a third free place was rejected |
| `field-kit-offer` | PASS | Recorded valid response enabled unlimited places and templates |
| `license-revocation` | PASS | Recorded revoked response removed paid controls and kept the free planner |

The public checkout action is not covered by `field-kit-offer`; its live failure is Finding 1.

## Live product exercise

Fresh desktop and 390 × 844 phone contexts were used. No existing profile or saved site data was reused.

- The one-click sample opened `/demo` with four named meals and Home/Cabin lists.
- Home contained Basil and tomatoes but not Cabin-only Bread. Cabin contained Basil and Bread but not Home-only tomatoes.
- The demo label remained visible: “Demo — sample data, nothing is saved to your planner.”
- Marking a sample item and selecting **Reset demo** restored the unchecked state. **Start for real** retained a pre-existing `Real home` and removed the sample.
- A fresh real planner separated Home Pasta night from Cabin soup, merged duplicate Basil lines only inside Home, and kept both unique ingredients in the right list.
- Bought state survived reload. Basil in the next week started unchecked.
- Blank meal submission remained in the dialog with native required-field state. A malformed JSON backup showed the recovery message and left real data unchanged.
- The free third-place boundary, share/QR, CSV, JSON, print, valid-license, and revoked-license boundaries passed their clean claim commands.

No test changed production data: all live interaction used fresh browser-local IndexedDB/localStorage and disposable contexts. This is a static PWA, so backend tenant isolation, SQLite restart persistence, health checks, and package-consumer checks do not apply.

## Accessibility, keyboard, phone, and motion

- `/opt/fleet/lib/verify-url.sh` passed: HTTP 200, title, `lang=en`, one H1, main landmark, alt text, labelled buttons, and no console/page errors.
- Live Playwright axe scans found zero violations on light demo, dark demo, and the populated phone demo.
- First Tab focused **Skip to planner** with `3px solid rgb(147, 106, 22)` focus. Enter moved focus to main. The settings dialog received focus and returned it to its opener on Escape.
- The phone layout had no horizontal overflow. Job, audience, sample action, and all three facts were visible before scrolling.
- Reduced motion computed `scroll-behavior: auto` and `0.00001s` transition/animation durations.
- The visible target-size gap is Finding 2.

## PWA, privacy, routes, and links

- `/demo` reloaded offline under service-worker control with the sample retained and the visible offline state.
- The worker uses a versioned `meal-list-boundaries-shell-v5` cache, cleans old caches, claims clients, and exposes the in-app update/reload path. No newer live worker existed to trigger a real update transition.
- The representative live planning flow produced no console errors, page errors, trackers, CDN fonts, retailer calls, or cross-origin product-data requests.
- `/`, `/demo`, `/privacy/`, `/terms/`, and `/offline.html` returned 200 with their own titles, one H1, main navigation, footer/build id, canonical URL, social image, and Apple icon.
- `/verification-4-not-found` deliberately returned HTTP 404 with `Page not found — Meal List Boundaries` and a working route home. This expected 404 is not a defect.
- Every internal route and the source link returned 200. The only broken link was Field Kit checkout.

## Live identity, response policy, and performance

All 25 web-served files in the candidate `dist/` matched live bytes. `staticwebapp.config.json` is consumed by the host and was excluded from the public comparison.

The live root sends the expected CSP, `Permissions-Policy`, HSTS, `X-Frame-Options: DENY`, `nosniff`, and strict referrer policy. Hashed JS/CSS, fonts, images, and icons use one-year immutable caching. The manifest is `application/manifest+json`; AVIF is `image/avif`.

Two fresh mobile Lighthouse runs produced:

| Run | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 92 | 100 | 100 | 100 | 1.1 s | 1.6 s | 340 ms | 0.001 |
| 2 | 100 | 100 | 100 | 100 | 1.2 s | 1.7 s | 0 ms | 0.001 |

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| License verification lacked 429/`Retry-After` | PASS — 30 responses were 200; 5 were 429 with `Retry-After: 4` |
| Bought state leaked across weeks | PASS — adjacent-week live regression remained unchecked |
| Core mobile controls were under 44 px | PARTIAL — core buttons pass, but nav/footer/skip links still miss 44 px; Finding 2 |
| Assets lacked immutable caching | PASS |
| CSP, permissions, and frame protection missing | PASS |
| Manifest and AVIF MIME types incorrect | PASS |
| Font and repeatable mobile performance budgets failed | PASS — 44,016 font bytes; Lighthouse 92 and 100 |
| Field Kit checkout returned 404 | OPEN — Finding 1 |
| First-screen and metaphor copy failed | PASS — job, audience, action explanation, and facts are direct |
| Public behavior claims were missing | PASS for the 12 declared behaviors; checkout coverage remains part of Finding 1 |
| Unknown routes returned the planner | PASS — designed HTTP 404 |
| Site shell and metadata were incomplete | PASS |
| Demo banner had invalid ARIA role | PASS — live axe is clean |
| Demo reset lagged behind UI state | PASS — reset state updated after the completion notice |

## Findings

### P2 — Field Kit cannot be purchased and checkout lacks claim coverage

The landing page and settings expose **Buy Field Kit** and say “Sociobot hosts checkout.” The linked production endpoint returned HTTP 404 with no redirect. Visitors cannot start the advertised $12 one-time purchase.

The `field-kit-offer` claim test mocks license verification and proves post-license features. It never follows the Buy action or asserts a hosted checkout response, so the public purchase path has no dedicated claim command.

The handoff also says registration metadata is available at `/work/.evidence/billing-offer.json`, but that file was absent in this worker. Recreate the metadata, register the product through the approved billing operator, add a checkout outcome claim, and verify a hosted-checkout redirect.

### P2 — phone links remain smaller than 44 × 44 px

At 390 px, visible interactive boxes measured:

- **Demo:** 38 × 44 px
- **Privacy:** 40 × 44 px
- **Terms:** 34 × 44 px
- **Source:** 38 × 44 px
- focused **Skip to planner:** 123 × 39 px

The local target test checks only meal and settings buttons, so it does not catch these links. Give every interactive link at least a 44 × 44 CSS px hit area and extend the phone regression to header, footer, and skip-link targets.

## Evidence

- `/work/.evidence/verification-4/live-qa.json`
- `/work/.evidence/verification-4/desktop-first-screen.png`
- `/work/.evidence/verification-4/phone-first-screen.png`
- `/work/.evidence/verification-4/lighthouse-mobile.json`
- `/work/.evidence/verification-4/lighthouse-mobile-2.json`
- `/work/.evidence/verification-4/verify-root/verify.json`

No product code was modified during this verification.
