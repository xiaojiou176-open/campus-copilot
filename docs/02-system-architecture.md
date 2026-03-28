# System Architecture Brief

Campus Copilot is not a browser-extension shell with a few page scrapers attached.

Its current architecture is:

```text
site adapter -> normalized schema -> Dexie local entities/read models -> sidepanel/popup/options/export/AI -> thin BFF for formal provider paths
```

## Canonical Truth Layers

| Layer | Current role |
| :-- | :-- |
| `packages/schema` | canonical entity and contract definitions |
| `packages/adapters-*` | site-specific collection and normalization |
| `packages/storage` | canonical local entities and read models |
| `apps/extension/entrypoints/background.ts` | runtime integration point for sync and persistence |
| `apps/extension/src/*` | user-facing workbench and diagnostics surfaces |
| `apps/api` | thin BFF for formal provider API-key paths |

## Architectural Rules

- AI comes **after structure**
- adapters own collection and fallback logic
- Dexie-backed local entities are canonical for the workbench
- exports and AI consume normalized results, not raw site payloads
- runtime evidence must stay separate from canonical product docs

## Current Non-Formal Paths

- `web_session`
- OAuth as the default AI runtime path
- Anthropic
- automatic multi-provider routing
- write automation

## Canonical Cross-References

- Schema rules: [`03-domain-schema.md`](03-domain-schema.md)
- Adapter contract: [`04-adapter-spec.md`](04-adapter-spec.md)
- AI/runtime boundary: [`05-ai-provider-and-runtime.md`](05-ai-provider-and-runtime.md)
