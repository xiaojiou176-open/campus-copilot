# Chrome Web Store Submission Packet

This file is the repo-side preflight packet for the browser-extension listing.

Use it when the question is:

> Have we prepared the extension enough that only the final Chrome Web Store
> dashboard submission steps remain?

This file is intentionally narrow.
It is not the general product README, and it is not a full launch diary.

## Current repo-side readiness

The repository already has these extension-side prerequisites in place:

- extension build output:
  - `apps/extension/dist/chrome-mv3`
- Manifest V3 build path through:
  - [`apps/extension/wxt.config.ts`](../apps/extension/wxt.config.ts)
- current extension identity:
  - name: `Campus Copilot`
  - description: local-first academic decision workspace with cited AI
- current formal permissions:
  - `sidePanel`
  - `activeTab`
  - `scripting`
  - `downloads`
  - `storage`
- supported host permissions are scoped to:
  - Canvas
  - Gradescope
  - EdStem
  - MyUW
  - local loopback BFF hosts
- privacy/security brief:
  - [`docs/07-security-privacy-compliance.md`](07-security-privacy-compliance.md)
  - [`SECURITY.md`](../SECURITY.md)
- support / issue surface:
  - GitHub issues and discussions are enabled
- visual assets already exist:
  - [`docs/assets/sidepanel-overview.png`](assets/sidepanel-overview.png)
  - [`docs/assets/social-preview.png`](assets/social-preview.png)

## What is already truthful to claim

- the repository already builds a real browser extension
- the current extension is local-first and read-only
- the current workbench surfaces are:
  - sidepanel
  - popup
  - options
- the extension is already GitHub-public and Pages-backed as a product front door

## What should still stay out of current claims

- “Chrome Web Store listed”
- “officially published browser extension”
- write-capable browser automation
- generic AI assistant shell

## Owner-only final steps later

These are the parts that still belong in the Chrome Web Store dashboard or
owner submission flow:

- final store listing text
- category selection
- screenshot upload / ordering
- privacy-policy field confirmation
- support contact / store metadata fields
- final package upload and publish click

## Suggested owner checklist

1. Rebuild the extension:
   - `pnpm --filter @campus-copilot/extension build`
2. Re-run the repo proof lane:
   - `pnpm verify`
   - `pnpm proof:public`
3. Re-check the front door:
   - GitHub repo page
   - GitHub Pages
   - screenshots/assets
4. Then complete the final Chrome Web Store dashboard submission manually.
