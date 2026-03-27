# GitHub Surface Checklist

This checklist exists because some repository-adjacent facts live in GitHub settings, not in git-tracked files.

Use it to avoid writing platform-side unknowns into `README.md` as if the repository had already proven them.

## Manual Settings Checklist

| Item | Where to check | Repo can prove it? | Last checked | Notes |
| :-- | :-- | :--: | :-- | :-- |
| Repository description | GitHub repository settings / page header | No |  |  |
| Homepage / website URL | GitHub repository settings | No |  |  |
| Topics | GitHub repository settings | No |  |  |
| Social preview image | GitHub repository settings | No |  |  |
| Discussions enabled | GitHub repository settings | No |  |  |
| Branch protection | GitHub branch protection settings | No |  |  |
| Code scanning visibility | GitHub security tab | No |  |  |
| Private vulnerability reporting | GitHub security settings | No |  |  |

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
