# Meal List Boundaries — visual system

## Direction: botanical field guide

The weekly plan is treated as a field notebook: days are observations, ingredients are specimens, and each household or pickup context is a clearly labelled collection envelope. This makes the product’s defining idea—an ingredient always belongs somewhere—visible without adding app-like chrome. The visual language borrows the precision, margin notes, paper grain, specimen numbers, and restrained plant plates of a working field guide, never the ornament of a lifestyle recipe site.

## Palette

Light mode is warm paper rather than white. Dark mode evokes a field notebook used after dusk.

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| paper / background | `#F5F0E4` | `#171C18` | page field |
| paper-raised / surface | `#FFFDF7` | `#222A24` | sheets and controls |
| ink / text | `#20342A` | `#EDF2E8` | primary copy |
| graphite / muted | `#59675F` | `#B4C0B5` | annotations |
| fern / accent | `#2F684D` | `#82C49D` | primary action and focus |
| accent contrast | `#FFFFFF` | `#102017` | text on fern |
| rust | `#9A4A35` | `#EE9A7F` | danger and boundary warning |
| ochre | `#936A16` | `#E7C56F` | caution / pending |
| moss | `#32633D` | `#86C995` | success / bought |
| rule | `#C9C2B2` | `#465148` | dividers and input outlines |

All primary text pairs exceed 4.5:1. Boundary identities add a symbol and short label to color, so state never depends on hue alone. User-selectable boundary swatches are deliberately deep enough for white labels.

## Typography

- Display and labels: **Alegreya Sans**, self-hosted variable subset when available, falling back to `ui-sans-serif`. Its subtly calligraphic shapes fit handwritten field labels without sacrificing utility.
- Reading and meal names: **Source Serif 4**, self-hosted variable subset when available, falling back to Georgia. Its open forms keep lists readable and give the weekly board the voice of an annotated guide.
- Scale: 12px specimen code, 14px annotation, 16px body minimum, 20px section title, fluid 30–46px h1. Body leading is 1.5; reading measure stays below 70 characters. Numeric counts use tabular figures.

## Spacing and shape

The base unit is 4px with primary intervals of 8, 12, 16, 24, 32, and 48px. Content tops out at 1180px. Corners are modest (6–14px), like clipped paper rather than pill-shaped software. A fine rule and an occasional offset shadow create depth. Independent lists are sheets; closely related meal/ingredient rows group by proximity instead of nested cards. Every target is at least 44×44px.

At 390px the weekly grid becomes a vertical run of day sections, the plan/list switch becomes a sticky field tab, utility copy compresses, and list actions wrap. Nothing depends on horizontal drag.

## Interaction grammar

- **Pin to a boundary:** every meal form requires a named boundary before ingredients can be recorded. The chosen boundary appears as a stamped label on the meal and on every generated item.
- **Open a specimen:** adding or editing a meal uses a focused dialog that grows from the add control’s region. Ingredient rows are plain text lines (`quantity ingredient`) to stay fast on a kitchen phone.
- **Gather the list:** the Lists view groups by boundary first, then ingredient. Identical normalized ingredient lines within the same boundary combine; no operation combines across a boundary.
- **Mark in the field:** bought items receive a tick, strike, and quieter ink, with an immediate undo action.
- **Handoff:** each boundary sheet exposes copy, print, share link, and QR. The shared payload contains that sheet only.

## Motion policy

Transitions last 160–240ms and animate only opacity and transform. A new meal settles upward by 4px; the list switch cross-fades; the update notice enters from the lower edge. Bought state changes instantly because it is a working checklist. Under `prefers-reduced-motion: reduce`, transforms and smooth scrolling are removed and all durations become effectively instant. Nothing loops or flashes.

## Illustration and asset plan

The hero is an original horizontal botanical plate: two labelled-but-textless gathering envelopes on a warm desk, separated by a central sprig, with ingredients visibly sorted to either side. It explains boundaries before the interface does. It is generated once, reviewed, then exported to responsive WebP/AVIF with explicit dimensions; the mobile hero remains under 300 KB. Interface icons and the leaf app mark are hand-authored SVG/CSS so they remain crisp and accessible.

### Prompt sheet

**Subject:** overhead botanical field-guide still life showing two distinct grocery collection envelopes, each with a few vegetables and herbs, a slender fern specimen dividing them, small brass clips and pencil annotation marks but no legible writing. **World/materials:** archival warm paper, pressed leaves, linen tape, graphite, natural produce, scientific plate composition. **Light/lens:** soft north-window daylight, flat-lay 50mm, gentle true shadows, finely detailed paper texture. **Palette words:** parchment, forest ink, fern green, muted beet rust, dry ochre. **Negative list:** no people, hands, brands, logos, readable text, watermark, shopping cart, supermarket, glossy 3D render, neon, gradient, excessive objects, distorted produce.

Asset prompt derives exactly from this sheet, ending “no text, no watermark, no logos.” Source PNG and prompt sidecar live in `assets/src/`; production derivatives live in `public/assets/`.

## Image provenance

The botanical hero was generated for this product with the factory Azure OpenAI image deployment (`factory-image`) on 2026-08-28. It is original generated imagery and may be used with this product. The final reviewed prompt and tool parameters are stored beside the source asset. The footer discloses that the illustration is generated.

The 1200 × 630 social image was composed on 2026-09-06 by cropping and resizing the reviewed source plate. It adds no new generated content, text, logos, or third-party material. The 180 px Apple touch icon is a resized derivative of the product’s hand-authored app mark.

## Product tier presentation

The core two-place weekly planner is complete and free. A quiet “Field Kit” section—not a modal—offers unlimited places and reusable week templates for `$12 once`. Checkout is hosted by Sociobot, and Settings includes a paste-to-restore path. Data export, QR sharing, offline use, themes, accessibility, and privacy are never paid features.
