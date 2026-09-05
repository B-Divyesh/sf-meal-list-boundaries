# Independent verification 3 — FAIL

**Work order:** `meal-list-boundaries-verify-3`  
**Implementation candidate:** `893a1849be75baa97b32c9fa90755abf1edcf916`  
**Documentation SHA:** `893a1849be75baa97b32c9fa90755abf1edcf916` (same commit)  
**Live URL:** <https://meal-list-boundaries.sociobot.in/>  
**Verified:** 2026-09-05 UTC

## Verdict

**FAIL — 6 findings, 0 untested declared claims.**

The main local-first planning flow is sound and the repaired P1/P2/P3 items from the two earlier reports are now verified. This candidate cannot receive a PASS because the live purchase action is a dead link and it still misses mandatory plain-words, claims, 404, site-shell/metadata, and minor accessibility requirements.

## Job, audience, and first action observed before scrolling

The intended job is to turn a weekly meal plan into separate shopping lists, so ingredients do not cross between homes or pickup contexts. The intended audience is households shopping for more than one home, pantry, store, or pickup. The visible first action is **Try it with sample data**.

The first action opens a populated Home/Cabin sample as required. The first screen itself does not state the job and audience in the required plain words; this is a finding below.

## Clean-checkout quality gates

A new local clone at the candidate SHA was used; it was clean before install.

| Check | Result | Evidence |
| --- | --- | --- |
| Candidate identity | PASS | `git rev-parse HEAD` = `893a1849be75baa97b32c9fa90755abf1edcf916` |
| Clean install | PASS | `npm ci`: 130 packages, 0 vulnerabilities |
| Unit tests | PASS | `npm test`: 7/7 Vitest tests passed |
| Type/lint gate | PASS | `npm run lint` (`tsc --noEmit`) passed |
| Production build | PASS | `npm run build` passed and produced `dist/index.html` |
| Browser suite | PASS | `npm run test:e2e`: 13 passed, 3 intentional project skips |
| Declared claim: demo sandbox | PASS | `npm run test:e2e -- --grep @claim:demo-sandbox`: 2 passed |
| Declared claim: offline reload | PASS | `npm run test:e2e -- --grep @claim:offline-reload`: 1 passed, 1 intentional mobile skip |
| Declared claim: local-only data | PASS | `npm run test:e2e -- --grep @claim:local-only-data`: 2 passed |

All three `claims.json` commands ran from the clean checkout. Each declared claim has an executable tagged test and none is untested. Finding 3 concerns additional public promises omitted from `claims.json`, not a failed declared claim.

## Live desktop and phone exercise

Fresh desktop and 390 x 844 Pixel 5 profiles opened the live root and `/demo`. No console or page errors occurred. The 390 px page had no horizontal overflow; core controls met the repository's 44 px mobile test. First Tab focused **Skip to planner** with a visible `3px solid rgb(147, 106, 22)` outline. Reduced-motion computed `scroll-behavior: auto` and `0.01ms` animation/transition durations.

The normal flow passed: added Home and Cabin; planned Home Pasta night (`Basil`, duplicate `basil`, `2 cans tomatoes`) and Cabin soup (`Basil`, `Bread`); and received exactly two separate lists. Home showed Basil x2 and tomatoes, while Cabin showed Basil and Bread. A checked item survived reload. Adding Basil next week showed `0 of 1 gathered` and an unchecked box, proving the repaired week-scoped bought key works.

Boundary limit, invalid input, and recovery also passed. A third free boundary displayed the Field Kit explanation without adding it. A malformed JSON import displayed “That file uses an unsupported or incomplete export format,” left the settings dialog open, and retained the planner. A blank meal submission stayed in its dialog for native required-field recovery.

Demo isolation passed in a fresh profile: entering `/demo`, changing a sample item, and inspecting IndexedDB produced both `planner` and `demo:planner`; **Start for real** removed only `demo:planner` and preserved a real `Real home` boundary. The banner remained visible and the sample contained four realistic meals. Live offline reload passed after service-worker control: the demo reloaded offline with the planner heading and “Offline · changes stay here,” without errors.

Privacy/network behavior passed for the representative sample flow: only `https://meal-list-boundaries.sociobot.in` requests occurred. Privacy and terms routes loaded with their own correct titles and one `<h1>`. The live rate-limit regression is fixed: a 35-request invalid-token burst received 30 normal `200` responses and 5 `429` responses; every limited response sent `Retry-After: 4`.

## Accessibility and performance

- `/opt/fleet/lib/verify-url.sh https://meal-list-boundaries.sociobot.in/ <evidence-dir>` passed: HTTP 200, title, `lang=en`, one `<h1>`, `main`, image alt text, labelled buttons, and zero console/page errors (874 ms scripted load).
- Axe on live light root and dark root found **0 serious/critical** violations. The demo banner has one minor violation, recorded as Finding 6.
- Fresh mobile Lighthouse: Performance **99**, Accessibility **100**, FCP **1.2 s**, LCP **1.5 s**, CLS **0.072**, TBT **0 ms**. A desktop run was 83 performance / 100 accessibility; the PWA budget is mobile and the mobile score passes.
- Candidate build budgets pass: JS 59,352 bytes raw / 20,703 gzip; CSS 17,923 bytes raw / 4,827 gzip; self-hosted fonts 44,016 bytes; mobile AVIF 20,512 bytes.

## Live candidate identity and earlier-finding disposition

All 22 web-served `dist/` files matched the live bytes by SHA-256. `staticwebapp.config.json` is correctly consumed by Static Web Apps and is not served; requesting that filename returns the navigation fallback, so it is not a deployable public file.

| Earlier finding | Current disposition |
| --- | --- |
| License verification rate limit absent | PASS — 30 `200`, 5 `429`, `Retry-After: 4` |
| Bought state leaked across weeks | PASS — adjacent-week live regression reproduced as unchecked |
| 44 px mobile controls | PASS — mobile Playwright target test passed |
| Immutable asset caching | PASS — hashed JS/CSS/fonts/images/icons return `max-age=31536000, immutable` |
| CSP, Permissions-Policy, frame protection | PASS — live root sends strict CSP, Permissions-Policy, `X-Frame-Options: DENY`, `nosniff`, and strict referrer policy |
| Manifest/AVIF MIME types | PASS — manifest is `application/manifest+json`; AVIF is `image/avif` |
| Font budget / mobile Lighthouse repeatability | PASS — 44,016 font bytes; fresh mobile Lighthouse 99 |

## Findings

### P2 — Field Kit purchase action is a dead public link

**Buy Field Kit** points to `https://api.sociobot.in/api/v1/products/meal-list-boundaries/checkout`. A direct live `GET` and `HEAD` both return HTTP `404` with JSON. The product promises a $12 one-time Field Kit and exposes this CTA in Settings, but a visitor cannot begin checkout. This also fails the no-dead-links site requirement.

Register or correct the product checkout endpoint, then verify the button reaches the hosted checkout (a successful redirect is acceptable) without embedding a payment provider.

### P2 — The first screen and copy audit fail the plain-words contract

The first-screen H1 is “One week. Every ingredient in the right hands.” It is metaphorical rather than a direct statement of the job. The supporting sentence does not identify the multi-home/pickup household audience, the button has no adjacent explanation of what follows, and the required three privacy/offline/price facts are absent. The landing and app also repeatedly use brand-lore/metaphor language such as “Field note,” “field sheet,” “specimen,” and “gathered,” which the plain-words contract expressly prohibits.

`.factory/copy-audit.md` records only five strings, not every landing-page sentence, and therefore incorrectly reports a complete audit.

Rewrite the first screen in direct user language, include the named audience, next-step explanation, and three facts; remove decorative field-guide language from user-facing copy; then regenerate a complete copy audit.

### P2 — Public product promises are missing required claims records and tagged tests

`claims.json` contains only demo isolation, offline reload, and local-only data. Public text makes further visitor-reliant promises with no corresponding entry or `@claim:` test, including separated/no-crossed lists, deduplication, bought-state persistence, one-boundary QR/share handoff, CSV/print/export/import behavior, the two-boundary free tier, and the $12 Field Kit/unlimited-boundary offer. Some are incidentally covered by untagged browser tests, but the claims contract requires each public claim to be listed and demonstrated by its own tagged sandbox test.

Either remove each untestable promise or add a precise `claims.json` entry and one tagged test proving its observable result. The checkout claim must remain blocked until Finding 1 is fixed.

### P2 — Unknown routes do not provide the required designed 404 page

`https://meal-list-boundaries.sociobot.in/no-such-page` returns HTTP `200` and renders the ordinary planner with the ordinary root title/H1. There is no `404.html`, response override, or client-side not-found state. This is not a deliberate 404 with a styled recovery route as required by the site-structure contract.

Add a product-styled 404 page with a clear way home and configure the host response override so unknown paths return a deliberate `404` rather than the planner fallback.

### P2 — Required site shell and metadata are incomplete

The root, demo, privacy, and terms pages have no canonical link, Open Graph metadata, Twitter card metadata, Apple touch icon, or required 1200 x 630 product social image. The header lacks the required visible Demo/product/Privacy navigation, and the footer lacks “Built by Param Factory” and a version/build identifier. These are explicit site-structure requirements, not optional decoration.

Add route-appropriate canonical/social metadata and self-hosted social art; complete the consistent header and footer while retaining the existing visual identity.

### P3 — Demo banner uses an invalid ARIA role

Live axe on `/demo` reports `aria-allowed-role` (minor): `<aside class="demo-banner" role="status">` assigns `status` to an element that does not allow that role. The banner contains interactive buttons, so it should not be a live-status container.

Use a valid structural element and a separate, non-interactive live region only for text that must be announced, then rerun axe on demo in both themes.

## Reverification

After repair, use a clean checkout and run:

```bash
npm ci
npm test
npm run lint
npm run build
npm run test:e2e
npm run test:e2e -- --grep @claim:demo-sandbox
npm run test:e2e -- --grep @claim:offline-reload
npm run test:e2e -- --grep @claim:local-only-data
```

Then run every newly added claim command, open the live desktop and 390 px phone views, test the hosted checkout link, validate all route metadata and the deliberate 404, scan root/demo (light and dark) with axe, and repeat the sample/offline/adjacent-week journeys. A PASS requires zero findings and zero untested public claims.
