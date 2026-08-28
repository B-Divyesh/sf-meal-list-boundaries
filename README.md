# Meal List Boundaries

A local-first weekly meal planner for households shopping across more than one home, pantry, store, or pickup context. Every meal is pinned to a named boundary, and its ingredients flow only to that boundary’s checklist.

Live product: <https://meal-list-boundaries.sociobot.in>

## What it does

- Plans meals across a Monday–Sunday board and navigates between weeks.
- Generates separate, deduplicated shopping lists for every boundary.
- Keeps bought state on the device and survives refreshes or app restarts.
- Hands off one boundary at a time through text, a self-contained share URL, QR, CSV, or print.
- Exports/imports the full planner as versioned JSON.
- Installs as a PWA and reloads the planner offline after the first visit.
- Offers light/dark themes and a keyboard- and screen-reader-accessible workflow.

The useful free version includes two boundaries and all planning, list, sharing, accessibility, offline, and data-ownership features. The optional **Field Kit** is a $12 one-time license that adds unlimited boundaries and reusable week templates. Checkout and verification use Sociobot’s billing API; no payment provider is embedded in the app.

## Who it is for

Families and carers who plan for two homes, a main home plus cabin, a parent’s pantry, split pickup trips, or any week where groceries must reach the correct buyer without manual copying.

## Develop

Requires Node.js 20 or newer.

```bash
npm ci
npm run dev
```

The app uses Vite and TypeScript with no backend. Planner data is stored in IndexedDB. Theme and license verification metadata use localStorage. No meal, dietary, or location data leaves the browser.

## Test and build

```bash
npm test          # domain/invariant tests
npm run test:e2e # Chromium desktop + 390px, axe, QR handoff, offline reload
npm run build     # exact production command; outputs dist/
```

Playwright is pinned to 1.58.2. In the factory image, its browsers are supplied through `PLAYWRIGHT_BROWSERS_PATH`.

## Deploy

Deploy the contents of `dist/` as a static site, with `dist/index.html` at the root. The privacy and terms pages build to `/privacy/` and `/terms/`. For SPA-style shared-list links, the host should serve `index.html` for an unknown navigation path; query-string handoffs work on the root without a rewrite.

Set `VITE_BILLING_BASE` at build time only when the environment needs a non-production billing host. The default is `https://api.sociobot.in`; product registration is handled outside this repository and no product ID is hardcoded.

## Privacy and data portability

There are no analytics, trackers, retailer integrations, remote recipe calls, accounts, or CDN assets. A QR/share URL embeds only the selected list in the URL itself. Anyone holding that URL can read that list, so treat it like a paper shopping list. Export a JSON backup before clearing browser storage.

See [the product brief](.factory/brief.json), [visual system](.factory/design.md), and [build handoff](.factory/handoff.md).

## License

MIT — see [LICENSE](LICENSE).
