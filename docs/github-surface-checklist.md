# GitHub Surface Checklist

This checklist exists because some repository-adjacent facts live in GitHub settings, not in git-tracked files.

Use it to avoid writing platform-side unknowns into `README.md` as if the repository had already proven them.

## Manual Settings Checklist

| Item | Where to check | Repo can prove it? | Last checked | Notes |
| :-- | :-- | :--: | :-- | :-- |
| Repository description | GitHub repository settings / page header | No | 2026-04-07 | Current value: `AI-ready academic decision workspace with cited study context from Canvas, Gradescope, EdStem, and MyUW.` This is close to the current repo story, but it should be reviewed periodically because the front door is explicitly local-first and student-first, not AI-shell-first. |
| Homepage / website URL | GitHub repository settings | No | 2026-04-07 | Configured to `https://xiaojiou176-open.github.io/campus-copilot/`. This is now the intended GitHub Pages front door, but the live URL still needs a fresh post-merge deploy check before it should be treated as current proof. |
| Topics | GitHub repository settings | No | 2026-04-06 | Current topics: `browser-extension`, `canvas`, `education`, `gradescope`, `local-first`, `student-productivity`, `typescript`, `ai`, `decision-support`. |
| Social preview image | GitHub repository settings | No | 2026-04-07 | Custom social preview is enabled (`usesCustomOpenGraphImage=true`). Repo-tracked source remains `docs/assets/social-preview.png`; keep it aligned with the current front-door positioning. |
| Discussions enabled | GitHub repository settings | No | 2026-04-06 | Enabled (`has_discussions=true`). |
| Branch protection | GitHub branch protection settings | No | 2026-04-07 | Required checks are `Verify`, `CodeQL`, `Security Hygiene`, and `Dependency Review`; `strict=true`; `required_approving_review_count=1`; `require_last_push_approval=true`; admins enforced; linear history required; conversation resolution required; force-push and deletion disabled. |
| PR author identity for workflow-triggered closeout | GitHub CLI auth context + PR author | No | 2026-04-07 | `gh auth status` currently shows `xiaojiou176` active. Treat `xiaojiou176` as the default authoring identity; keep `leilei999lei-lab` for review-side use when the latest push still needs a second approver. |
| Default workflow permissions | GitHub Actions settings | No | 2026-04-06 | `default_workflow_permissions=read`; `can_approve_pull_request_reviews=false`. |
| Auto merge | GitHub pull request settings | No | 2026-04-06 | Disabled (`allow_auto_merge=false`). |
| Fork PR contributor approval policy | GitHub Actions settings | No | 2026-04-07 | `approval_policy=first_time_contributors`. |
| Code scanning visibility | GitHub security tab + workflow logs + code scanning API | No | 2026-04-07 | Advanced-setup CodeQL uploads are still landing: `code-scanning/analyses` is non-empty (`6` analyses) and `code-scanning/alerts?state=open` currently returns `[]`. `default-setup` remains `not-configured`, which is expected for this advanced-setup path. |
| Private vulnerability reporting | GitHub security settings | No | 2026-04-07 | Unknown from the current repo-admin API surface. Treat this as a settings-side fact that still needs a manual Security tab confirmation before citing it. |

## Repo-Tracked Signals

These are the things the repository itself can prove:

- `LICENSE`
- `CONTRIBUTING.md`
- `CLAUDE.md`
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
