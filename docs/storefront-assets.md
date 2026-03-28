# Storefront Assets

This file tracks the repository's public-facing assets.

The rule is simple:

- every outward-facing asset should have an owner
- every asset should have a purpose
- every asset should be easy to review and replace

## Asset Inventory

| Asset | Purpose | Source | Update policy |
| :-- | :-- | :-- | :-- |
| `docs/assets/hero-workbench-overview.svg` | Give GitHub visitors an English-first hero asset that explains the product shape before they inspect the deeper screenshot inventory | Maintainer-authored SVG overview backed by current formal product paths | Update when the public product shape or formal boundary wording changes materially |
| `docs/assets/social-preview-source.svg` | Keep the square source artwork for the repository social preview image so the generated PNG does not regress into a cropped thumbnail | Maintainer-authored square social preview layout | Update whenever the hero/storefront positioning changes materially, then re-render `social-preview.png` |
| `docs/assets/social-preview.png` | Provide a square PNG asset that can be uploaded as the repository's custom social preview image in GitHub settings | Rendered from the English-first hero overview and sized for repository social preview use | Re-render whenever the hero overview changes materially or the repository positioning changes |
| `docs/assets/weekly-assignments-example.md` | Show a real export sample without requiring a live browser session | Generated from the exporter package fixture | Update if export format or wording changes materially |
| `docs/assets/sidepanel-overview.png` | Show the workbench surface in a controlled, reproducible state using the public English screenshot mode | Captured from the built sidepanel page with extension mocks, real provider readiness, and explicit English UI mode | Re-capture when the main workbench layout or public-facing English copy changes materially |

## Review Rules

- Do not add decorative assets without a documented purpose.
- Do not store screenshots that expose secrets, private tokens, or local absolute paths.
- Keep one English-first hero asset for first-visit clarity, and keep deeper screenshots or exports as proof assets below the fold.
- If an asset becomes stale, replace it or remove it from README/docs.
