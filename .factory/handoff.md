# Build handoff — Meal List Boundaries

Work order: `meal-list-boundaries-build-1`<br>
Completed: 2026-08-28

## What shipped

- A complete Monday–Sunday local-first planner with week navigation, meal editing/removal, named boundaries, ingredient entry, and persistent bought state.
- Boundary-safe list generation: normalized duplicate ingredient lines combine only inside the same boundary; they are never merged across boundaries.
- Individual boundary handoff through copyable text, a self-contained account-free URL, QR code, CSV, and print. A recipient’s shared checklist keeps its own bought state locally.
- IndexedDB persistence plus versioned full JSON export/import. Import validates before a confirmed replacement.
- Installable PWA manifest, 192/512 maskable icons, versioned app-shell service worker, update notice, network-aware status, offline fallback, and a tested cached offline reload.
- Free tier with two complete boundaries. The optional `$12 one-time` Field Kit uses the Sociobot checkout/verify contract and adds unlimited boundaries plus reusable week templates. Incoming tokens are stored at `sb_license:meal-list-boundaries`, removed from the URL, verified no more than daily, and may be restored by paste. Free use never waits on verification.
- Botanical field-guide visual system with light/dark treatments, 44px targets, clear focus states, reduced-motion handling, and an original generated hero plate. Production derivatives: AVIF 24/52 KB, WebP 41/97 KB, and JPEG fallback 121 KB. Prompt and provenance are in `.factory/design.md` and `assets/src/`.
- Static privacy, terms, offline, robots, and sitemap documents; expanded README and MIT license.

## Verification

Commands run from `/work/repo`:

```bash
npm test
npm run build
npm run test:e2e
```

Results:

- Vitest: 5/5 passing (separation, merge-within-boundary, week isolation, handoff contents, import validation).
- Playwright 1.58.2: 6 passing, 2 intentional project skips. Covered full two-boundary planning/list flow, bought-state refresh, QR-to-fresh-handoff, console errors, serious/critical axe scan, 390px overflow, and offline reload.
- Production build: `dist/index.html` at the required root. Single-file cached app shell is 255.0 KB raw / 161.7 KB gzip. Application JavaScript before inlining is about 56.5 KB and CSS 23.8 KB; both are inside the 200 KB / 50 KB budgets.
- Lighthouse mobile against the production preview: Performance **93**, Accessibility **100**, Best Practices **100**, SEO **100**. FCP **1.4 s**, LCP **2.1 s**, CLS **0.062**, TBT **250 ms**. A separate run scored Performance 98/TBT 90 ms; the lower repeat is recorded conservatively.
- Visual inspection completed at 1440px and 390px in Chromium. The generated hero was reviewed for text artifacts, brands, anatomy/seams, and palette consistency.
- `npm audit`: 0 vulnerabilities.

## Operations

- Exact build command: `npm run build`
- Static deploy directory: `./dist`
- Billing defaults to `https://api.sociobot.in`; set `VITE_BILLING_BASE=https://pilot-api.sociobot.in` for a registered staging product.
- No infrastructure, DNS, billing registration, analytics, or secrets are included.

## Known limits / next steps

- Share/QR links contain the selected list, so very large lists may exceed a camera or messaging app’s practical URL limit; the UI falls back clearly to Copy/CSV when QR generation cannot encode it.
- Data is intentionally device-local with explicit backups; there is no cross-device live sync or collaborative conflict resolution.
- Lighthouse’s lab TBT varied between 90–250 ms in the container; both runs retained a ≥93 performance score, and the shipped JS is about 56.5 KB before inlining.
