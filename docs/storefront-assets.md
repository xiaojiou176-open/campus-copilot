# Storefront Assets

This file tracks the repository's storefront proof assets.

It is not the main front-door narrative, and it is not the builder/example index.

Think of it like the evidence drawer behind the storefront window:

- `README.md` and the docs hub explain what the product is
- those front doors now explain **OpenCampus** first and then point to **Campus Copilot** as the workspace people can actually try today
- this file inventories the small set of visuals and proof receipts that support that story in public
- official listing or marketplace presence still depends on owner-controlled actions outside this file

The rule is simple:

- every outward-facing asset should have an owner
- every asset should have a purpose
- every asset should be easy to review and replace
- when the extension surface needs a school-specific label, that asset should say `Campus Copilot for UW` without turning the whole repo story into a school-only brand shell

## Role In The Public Story

Use this file when you want to review or refresh the public proof layer after the product story is already clear.

Do not use it as the first explanation of OpenCampus or of the Campus Copilot workspace.
Do not use it as the router for SDK / CLI / MCP examples; those live under [`10-builder-api-and-ecosystem-fit.md`](10-builder-api-and-ecosystem-fit.md) and [`../examples/README.md`](../examples/README.md).

## Asset Inventory

| Asset | Purpose | Source | Update policy |
| :-- | :-- | :-- | :-- |
| `docs/assets/hero-workbench-overview.svg` | Give first-visit GitHub readers a simple OpenCampus-to-Campus-Copilot orientation without pretending to be proof | Maintainer-authored SVG overview backed by current formal product paths | Update when the public product shape, naming split, or first-screen promise changes materially |
| `docs/assets/sidepanel-overview.png` | Show the `Campus Copilot for UW` extension shell in a clean, school-specific public-proof crop instead of an internal dashboard dump | Captured from the built sidepanel page with seeded fixture data, real provider readiness, explicit English UI mode, and a clipped public screenshot viewport | Re-capture when the main workbench layout, screenshot fixture, or public-facing English copy changes materially |
| `docs/assets/web-workbench-overview.png` | Show the broader read-only workbench as a real OpenCampus surface, not as metadata or a concept card | Captured from the built web workbench through a local preview plus Playwright screenshot pass | Re-capture when the workbench first fold, public heading, or proof-facing web layout changes materially |
| `docs/assets/social-preview-source.svg` + `docs/assets/social-preview.png` | Keep the repository social preview truthful, simple, and legible on GitHub without turning the card into a text wall | Maintainer-authored wide source art plus rendered PNG upload target, aligned with GitHub's 1280x640 best-display guidance | Update whenever hero/storefront positioning changes materially, then re-render the PNG with `pnpm render:social-preview`; the checked PNG must stay `1280x640` and `<1MB` |
| `docs/assets/weekly-assignments-example.md` | Show one export-shaped proof receipt without requiring a live browser session | Generated from the exporter package fixture | Update if export format or wording changes materially |
| `apps/web/public/web-workbench-share-card.svg`, `apps/web/public/favicon.svg`, and `apps/web/public/site.webmanifest` | Keep the standalone read-only web workbench metadata truthful to the imported-snapshot contract | Maintainer-authored share card, favicon, and manifest | Update when the web workbench title, visual identity, or share metadata changes materially |

Everything else that is primarily a builder example, local consumer packet, or MCP wiring sample should route through [`10-builder-api-and-ecosystem-fit.md`](10-builder-api-and-ecosystem-fit.md) and [`../examples/README.md`](../examples/README.md) instead of expanding this storefront inventory.

## Review Rules

- Do not add decorative assets without a documented purpose.
- Do not store screenshots that expose secrets, private tokens, or local absolute paths.
- Keep one English-first orientation asset for first-visit clarity, and keep deeper screenshots or exports as the actual proof assets below the fold.
- Public screenshots should favor legibility and evidence density over showing every panel on the page.
- The checked GitHub social preview PNG should stay `1280x640`, stay below `1 MB`, and be regenerated with `pnpm render:social-preview` instead of ad-hoc thumbnail tools.
- Keep builder examples, OpenClaw-style notes, and MCP wiring packets out of this storefront list unless they become first-screen public proof assets.
- Keep standalone web metadata and share assets truthful to the imported-snapshot contract; do not imply hosted SaaS behavior.
- If an asset becomes stale, replace it or remove it from README/docs.
