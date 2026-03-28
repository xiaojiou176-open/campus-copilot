# GitHub Surface Checklist

This checklist exists because some repository-adjacent facts live in GitHub settings, not in git-tracked files.

Use it to avoid writing platform-side unknowns into `README.md` as if the repository had already proven them.

## Manual Settings Checklist

| Item | Where to check | Repo can prove it? | Last checked | Notes |
| :-- | :-- | :--: | :-- | :-- |
| Repository description | GitHub repository settings / page header | No | 2026-03-27 | Matches the current README positioning: local-first academic information organizer for Canvas, Gradescope, EdStem, and MyUW. |
| Homepage / website URL | GitHub repository settings | No | 2026-03-27 | Intentionally blank for the current GitHub-first storefront phase. Do not invent a homepage URL. |
| Topics | GitHub repository settings | No | 2026-03-27 | Set to `browser-extension`, `canvas`, `education`, `gradescope`, `local-first`, `student-productivity`, `typescript`. |
| Social preview image | GitHub repository settings | No | 2026-03-27 | Still uses the default repository Open Graph image. `docs/assets/social-preview.png` is now ready; only the manual upload step remains. |
| Discussions enabled | GitHub repository settings | No | 2026-03-27 | Enabled. |
| Branch protection | GitHub branch protection settings | No | 2026-03-27 | `Verify` and `CodeQL` required; `strict=true`; admins enforced; linear history required; force-push and deletion disabled. |
| Code scanning visibility | GitHub security tab | No | 2026-03-27 | Open alerts API returns zero. Security-tab visibility was not separately verified beyond API reachability. |
| Private vulnerability reporting | GitHub security settings | No | 2026-03-27 | Enabled via API check. |

## Repo-Tracked Signals

These are the things the repository itself can prove:

- `LICENSE`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `CODEOWNERS`
- issue templates
- PR template
- workflow files
- Dependabot config

## Rules

- Do not copy GitHub settings status into `README.md` as a stable repo fact.
- If you mention a settings-only item in docs or a PR, record the date in this checklist.
- If an item is not checked, say `unknown` instead of pretending it is enabled.
