# Distribution Readiness

Campus Copilot is already **repo-public ready** for review and staged publication.

Use this file as the shortest truthful routing page for distribution questions.

It is not the product front door.
It is the shipping counter:

- what is already real
- what is already public-ready inside the repo
- what is already published
- what still needs an owner-side publish/listing action

## Current Truth

| Surface | Current truthful state | What that means |
| :-- | :-- | :-- |
| Main repository | public and GitHub Pages-backed | the repo itself is already a real public front door |
| `@campus-copilot/mcp` | published on npm | one package-level release is already real |
| CLI / MCP server / sidecars / provider-runtime / site APIs | public-ready (repo-local) | pack/install/proof paths are real, but upstream publication is still owner-controlled |
| SDK / workspace-sdk / site-sdk | repo-public preview, registry blocked | ready to study and validate, not yet ready to publish as standalone packages |
| Codex / Claude / OpenClaw bundles | plugin-grade repo bundles | copyable, truthful local bundles, not official marketplace listings |
| Chrome extension | build-ready product surface | extension package and store submission still need owner-side listing steps |

## Read In This Order

1. [`README.md`](README.md)
2. [`docs/14-public-distribution-scoreboard.md`](docs/14-public-distribution-scoreboard.md)
3. [`docs/15-publication-submission-packet.md`](docs/15-publication-submission-packet.md)
4. [`INTEGRATIONS.md`](INTEGRATIONS.md)
5. [`PRIVACY.md`](PRIVACY.md)

## Owner-Only Later Bucket

These do **not** block repo readiness:

- package publication beyond what is already shipped
- official MCP Registry submission
- official marketplace/listing submission
- Chrome Web Store submission click-through
- promo video / announcement / off-repo launch

## Browser Extension Readiness

The browser extension is now best described as:

- manifest present
- permissions intentionally narrow
- read-only product contract
- deterministic build/test lane present
- ready for final store packaging/review preparation

The remaining owner-side last mile is:

- final store listing copy/screenshots review
- Chrome Web Store submission
- any store-console privacy declarations that require maintainer clicks

## Rules

- Do not call `public-ready (repo-local)` the same thing as `published`.
- Do not call `published` the same thing as `officially listed`.
- Do not call plugin-grade repo bundles official marketplace plugins.
- Keep distribution wording narrower than the product story on the front door.
