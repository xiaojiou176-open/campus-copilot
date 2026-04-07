# Storefront Assets

This file tracks the repository's supporting public-facing proof assets.

It is not the main front-door narrative.

Think of it like the evidence drawer behind the storefront window:

- `README.md` and the docs hub explain what the product is
- this file inventories the visuals and examples that prove that story is real
- official listing or marketplace presence still depends on owner-controlled
  actions outside this file

The rule is simple:

- every outward-facing asset should have an owner
- every asset should have a purpose
- every asset should be easy to review and replace

## Role In The Public Story

Use this file when you want to review or refresh proof assets after the product
story is already clear.

Do not use it as the first explanation of what Campus Copilot is.

## Asset Inventory

| Asset | Purpose | Source | Update policy |
| :-- | :-- | :-- | :-- |
| `docs/assets/hero-workbench-overview.svg` | Give GitHub visitors an English-first hero asset that explains the product shape without forcing them to read dense technical blocks before they understand the repo | Maintainer-authored SVG overview backed by current formal product paths | Update when the public product shape or formal boundary wording changes materially |
| `docs/assets/social-preview-source.svg` | Keep the square source artwork for the repository social preview image so the generated PNG stays legible as a GitHub card instead of regressing into a text-heavy thumbnail | Maintainer-authored square social preview layout | Update whenever the hero/storefront positioning changes materially, then re-render `social-preview.png` |
| `docs/assets/social-preview.png` | Provide a square PNG asset that can be uploaded as the repository's custom social preview image in GitHub settings | Rendered from the English-first square social preview source and sized for repository social preview use | Re-render whenever the social preview source or repository positioning changes materially |
| `docs/assets/weekly-assignments-example.md` | Show a real export sample without requiring a live browser session | Generated from the exporter package fixture | Update if export format or wording changes materially |
| `docs/assets/sidepanel-overview.png` | Show the workbench surface in a controlled, reproducible state using a focused public-proof screenshot mode instead of a full internal dashboard dump | Captured from the built sidepanel page with seeded fixture data, real provider readiness, explicit English UI mode, and a clipped public screenshot viewport | Re-capture when the main workbench layout, screenshot fixture, or public-facing English copy changes materially |
| `apps/web/public/web-workbench-share-card.svg` | Give the standalone read-only web workbench a truthful share/preview image for repo-local social metadata and local preview surfaces | Maintainer-authored SVG card focused on the imported-snapshot workbench contract | Update when the web workbench naming or front-door positioning changes materially |
| `apps/web/public/favicon.svg` | Give the standalone web workbench a small, stable browser-tab icon that matches the same local-first academic identity instead of relying on a missing default favicon path | Maintainer-authored SVG favicon for browser tabs and web manifest icon usage | Update when the workbench brand mark or primary color language changes materially |
| `apps/web/public/site.webmanifest` | Keep the standalone web workbench install/share metadata consistent with the same read-only local-first product identity | Maintainer-authored web manifest for the preview surface | Update when the workbench title, theme color, or share-card asset changes materially |
| `examples/workspace-snapshot.sample.json` | Give SDK / CLI / MCP preview users one safe read-only sample input | Maintainer-authored snapshot sample on the shared schema/import contract | Update when the imported-workspace contract changes materially |
| `examples/cli-usage.md` | Show the read-only CLI preview path without requiring live campus sessions | Maintainer-authored usage guide | Update when CLI commands or package names change materially |
| `examples/mcp-readonly.md` | Show the read-only MCP preview path and required env | Maintainer-authored usage guide | Update when MCP entrypoints or tool names change materially |
| `examples/openclaw-readonly.md` | Show the safest OpenClaw-style local runtime path without pretending Campus Copilot is an official browser-control plugin | Maintainer-authored read-only local-runtime guide | Update when generic MCP entrypoints, sidecar commands, or public-safe wording changes materially |
| `examples/sdk-usage.ts` | Show the preview SDK path for builder workflows | Maintainer-authored TypeScript example | Update when the SDK surface changes materially |
| `skills/README.md` | Route builder-facing readers to the safest public read-only skills without inventing a marketplace/plugin story | Maintainer-authored skill router | Update when public skill names or recommended entrypoints change materially |
| `examples/integrations/*.example.json` | Show generic MCP wiring for Codex / Claude Code style consumers that launch the combined stdio server | Maintainer-authored config examples | Update when the generic MCP command or package name changes materially |
| `examples/mcp/*.example.json` | Show Codex / Claude-style MCP wiring for the read-only site sidecars | Maintainer-authored config examples | Update when MCP binary names or snapshot env contract change materially |
| `examples/demo-video-script.md` | Give the owner a truthful short demo/video script instead of improvising launch wording on the fly | Maintainer-authored release/demo script | Update when front-door wording or visible product surfaces change materially |

## Review Rules

- Do not add decorative assets without a documented purpose.
- Do not store screenshots that expose secrets, private tokens, or local absolute paths.
- Keep one English-first hero asset for first-visit clarity, and keep deeper screenshots or exports as proof assets below the fold.
- Public screenshots should favor legibility and evidence density over showing every panel on the page.
- Keep preview examples read-only and snapshot-backed unless a later contract explicitly promotes live-hosted builder surfaces.
- Do not imply that OpenClaw-style local runtime notes are official vendor plugin contracts unless the upstream runtime explicitly publishes that same config shape.
- Keep standalone web metadata and share assets truthful to the imported-snapshot contract; do not imply hosted SaaS behavior.
- If an asset becomes stale, replace it or remove it from README/docs.
