# Storefront Assets

This file tracks the repository's public-facing assets.

The rule is simple:

- every outward-facing asset should have an owner
- every asset should have a purpose
- every asset should be easy to review and replace

## Asset Inventory

| Asset | Purpose | Source | Update policy |
| :-- | :-- | :-- | :-- |
| `docs/assets/weekly-assignments-example.md` | Show a real export sample without requiring a live browser session | Generated from the exporter package fixture | Update if export format or wording changes materially |
| `docs/assets/sidepanel-overview.png` | Show the workbench surface in a controlled, reproducible state | Captured from the built sidepanel page with extension mocks and a real local provider-ready state | Re-capture when the main workbench layout changes materially |

## Review Rules

- Do not add decorative assets without a documented purpose.
- Do not store screenshots that expose secrets, private tokens, or local absolute paths.
- If an asset becomes stale, replace it or remove it from README/docs.
