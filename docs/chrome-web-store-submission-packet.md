# Chrome Web Store Submission Packet

This file is the repo-side preflight packet for the browser-extension listing.

Use it when the question is:

> Have we prepared the extension enough that only the final Chrome Web Store dashboard submission steps remain?

## Current repo-side readiness

Use the Chrome lane as four narrow gates:

| Gate | Current truthful state | Evidence |
| :-- | :-- | :-- |
| `build-ready` | ready | `pnpm --filter @campus-copilot/extension build` |
| `asset-ready` | ready | icons plus [`assets/sidepanel-overview.png`](assets/sidepanel-overview.png) and [`assets/social-preview.png`](assets/social-preview.png) |
| `packet-ready` | ready | this file plus `pnpm verify` and `pnpm proof:public` |
| `owner-only later` | still later | Chrome Web Store dashboard upload, metadata fields, and final submit click |

## Repo-tracked packet inventory

| Packet piece | Current repo-tracked source |
| :-- | :-- |
| extension package | [`../apps/extension/dist/chrome-mv3`](../apps/extension/dist/chrome-mv3) after a fresh build |
| manifest identity and permissions | [`../apps/extension/wxt.config.ts`](../apps/extension/wxt.config.ts) |
| version source | [`../apps/extension/package.json`](../apps/extension/package.json) |
| icon set | [`../apps/extension/public/icon-16.png`](../apps/extension/public/icon-16.png), [`../apps/extension/public/icon-32.png`](../apps/extension/public/icon-32.png), [`../apps/extension/public/icon-48.png`](../apps/extension/public/icon-48.png), [`../apps/extension/public/icon-128.png`](../apps/extension/public/icon-128.png) |
| privacy posture | [`../PRIVACY.md`](../PRIVACY.md) |
| support and issue surface | GitHub issues and discussions, plus [`../SECURITY.md`](../SECURITY.md) |
| visual proof assets | [`assets/sidepanel-overview.png`](assets/sidepanel-overview.png), [`assets/social-preview.png`](assets/social-preview.png) |
| repo-side proof loop | `pnpm verify`, `pnpm proof:public` |

## What is already truthful to claim

- the repository already builds a real browser extension
- the extension is repo-local and read-only
- the current workbench surfaces are sidepanel, popup, and options
- the extension front door is already GitHub-public and Pages-backed

## What should still stay out of current claims

- `Chrome Web Store listed`
- `officially published browser extension`
- write-capable browser automation
- generic AI assistant shell

## Owner-only final steps later

These still belong in the Chrome Web Store dashboard:

- final listing copy
- screenshot upload and ordering
- privacy-policy field confirmation
- support contact and store metadata fields
- package upload and publish click

## Suggested owner checklist

1. Rebuild the extension:
   - `pnpm --filter @campus-copilot/extension build`
2. Re-run the repo proof lane:
   - `pnpm verify`
   - `pnpm proof:public`
3. Re-check the front door:
   - GitHub repo page
   - GitHub Pages
   - screenshots and assets
4. Then complete the final Chrome Web Store dashboard submission manually.
