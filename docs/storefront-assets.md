# Storefront Assets

This file tracks the repository's public-facing assets.

The rule is simple:

- every outward-facing asset should have an owner
- every asset should have a purpose
- every asset should be easy to review and replace

## Asset Inventory

| Asset | Purpose | Source | Update policy |
| :-- | :-- | :-- | :-- |
| `docs/assets/hero-workbench-overview.svg` | Give GitHub visitors an English-first hero asset that explains the product shape without forcing them to read dense technical blocks before they understand the repo | Maintainer-authored SVG overview backed by current formal product paths | Update when the public product shape or formal boundary wording changes materially |
| `docs/assets/social-preview-source.svg` | Keep the square source artwork for the repository social preview image so the generated PNG stays legible as a GitHub card instead of regressing into a text-heavy thumbnail | Maintainer-authored square social preview layout | Update whenever the hero/storefront positioning changes materially, then re-render `social-preview.png` |
| `docs/assets/social-preview.png` | Provide a square PNG asset that can be uploaded as the repository's custom social preview image in GitHub settings | Rendered from the English-first square social preview source and sized for repository social preview use | Re-render whenever the social preview source or repository positioning changes materially |
| `docs/assets/weekly-assignments-example.md` | Show a real export sample without requiring a live browser session | Generated from the exporter package fixture | Update if export format or wording changes materially |
| `docs/assets/sidepanel-overview.png` | Show the workbench surface in a controlled, reproducible state using a focused public-proof screenshot mode instead of a full internal dashboard dump | Captured from the built sidepanel page with seeded fixture data, real provider readiness, explicit English UI mode, and a clipped public screenshot viewport | Re-capture when the main workbench layout, screenshot fixture, or public-facing English copy changes materially |

## Review Rules

- Do not add decorative assets without a documented purpose.
- Do not store screenshots that expose secrets, private tokens, or local absolute paths.
- Keep one English-first hero asset for first-visit clarity, and keep deeper screenshots or exports as proof assets below the fold.
- Public screenshots should favor legibility and evidence density over showing every panel on the page.
- If an asset becomes stale, replace it or remove it from README/docs.
