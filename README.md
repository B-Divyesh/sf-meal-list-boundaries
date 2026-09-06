# Meal List Boundaries

Make separate shopping lists for each home or pickup from one weekly meal plan.

It is for households that shop for more than one home, pantry, store, or pickup.

Live product: <https://meal-list-boundaries.sociobot.in>

Try four sample meals at <https://meal-list-boundaries.sociobot.in/demo>. Demo changes do not enter your real planner.

## What it does

- Creates separate shopping lists for named places.
- Combines duplicate ingredients only within the same list.
- Keeps bought status after reload without carrying it into another week.
- Copies, prints, or shares one selected list by URL, QR, or CSV.
- Exports and imports the complete planner as JSON.
- Reloads offline after the first visit.
- Keeps meal plans on the device during planning.

The free planner supports two places. Field Kit costs $12 once and adds unlimited places and reusable week templates.

## Run locally

Use Node.js 20 or newer.

```bash
npm ci
npm run dev
```

The app uses Vite, TypeScript, and IndexedDB. It has no application backend.

## Test and build

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

Each public behavior has one tagged browser test in [.factory/claims.json](.factory/claims.json).

Playwright is pinned to 1.58.2. The factory image supplies its Chromium browser through `PLAYWRIGHT_BROWSERS_PATH`.

## Deploy

Deploy the contents of `dist/` as a static site. Keep `dist/index.html` at the root.

The build includes the host routes, security headers, cache rules, MIME types, offline worker, legal pages, and designed 404 page.

The production billing base is `https://api.sociobot.in`. Product registration is handled outside this repository.

## Privacy and data ownership

Planner data is stored in IndexedDB. Theme and license details use localStorage.

A shared URL contains one selected shopping list. Anyone with that URL can read it.

Export a JSON backup before clearing browser storage.

Read the [privacy policy](https://meal-list-boundaries.sociobot.in/privacy/) and [terms](https://meal-list-boundaries.sociobot.in/terms/).

## License

MIT — see [LICENSE](LICENSE).
