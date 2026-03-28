# AI Provider And Runtime Brief

AI is a formal product path, but not the first runtime layer.

The repository's AI rule is:

> structure first, explanation second

## Current Formal AI Path

- thin BFF in `apps/api`
- `OpenAI` API-key flow
- `Gemini` API-key flow
- tool-result style prompts based on normalized local data

## Current Non-Formal AI Paths

- OAuth as the default runtime path
- `web_session`
- Anthropic
- automatic multi-provider routing

## Runtime Rules

- AI does not read raw DOM, raw HTML, raw adapter payloads, or cookies
- AI consumes structured workbench outputs and export-ready data
- provider-specific auth and transport logic stay behind the thin BFF boundary

## Why This Layer Exists

It decouples:

- site integration complexity
- normalized local data
- provider transport and auth differences

## Canonical Cross-References

- Locked choices: [`09-implementation-decisions.md`](09-implementation-decisions.md)
- Security and upload limits: [`07-security-privacy-compliance.md`](07-security-privacy-compliance.md)
- Validation lanes: [`verification-matrix.md`](verification-matrix.md)
