# Live Validation Runbook

This runbook answers one question:

> When we need to validate real site sessions or real provider behavior, how do we do it without confusing manual evidence with deterministic repository gates?

## What This Runbook Is

This file is for:

- manual live validation procedure
- environment-dependent checks
- timestamped session notes
- interpreting live blockers honestly

This file is **not** for:

- repository landing-page copy
- canonical product status
- GitHub settings claims
- stable implementation decisions

For deterministic repository gates, see [`verification-matrix.md`](verification-matrix.md).

## Live Validation Principles

- A manual live success is useful evidence, but it does **not** replace repeatable automated coverage.
- A live blocker may be an environment problem, not a code regression.
- Repo-side deterministic verification and manual live validation must stay separate.
- Manual notes should always include a date and what was actually validated.

## Before You Start

### Required for manual live validation

- a machine with the supported browser installed
- authenticated sessions for the target sites
- enough temporary disk space
- the local BFF running when provider validation is required

### Not implied by this runbook

This runbook does not imply:

- permanent site stability
- CI-required coverage
- GitHub platform-side settings state
- provider availability outside the current validation session

## Validation Lanes

### Lane A — Repository gate

Use:

```bash
pnpm verify
```

If you need the hosted PR-equivalent gate on a machine that already has the managed Playwright browser installed, use:

```bash
pnpm verify:hosted
```

What it proves:

- repository typecheck
- unit/integration tests in the repo
- local BFF health smoke
- extension build
- and, on the hosted lane, deterministic Playwright smoke

What it does **not** prove:

- live site synchronization
- authenticated browser-session success
- provider availability in the current local environment

### Lane B — Manual environment readiness

Use:

```bash
pnpm cleanup:runtime
pnpm preflight:live
pnpm diagnose:live
```

The live/browser lane no longer relies on the default system Chrome root.
The canonical target is the repo-owned browser root plus its dedicated profile:

```bash
CHROME_ATTACH_MODE=page \
CHROME_USER_DATA_DIR="$HOME/.cache/campus-copilot/browser/chrome-user-data" \
CHROME_PROFILE_NAME="Profile 1" \
pnpm probe:live
```

Bootstrap/launch order:

```bash
pnpm browser:bootstrap
pnpm browser:bootstrap:apply
pnpm browser:launch
```

`pnpm browser:launch` without `--url` is now a campus warm-start:

- it reuses the current repo-owned single instance if one is already running
- it reports the current key tabs instead of second-launching another browser
- it fills in any missing canonical campus tabs
- it preserves browser session state in `~/.cache/campus-copilot/browser/session-state.json`
- it generates and maintains the human-facing identity tab at `.runtime-cache/browser-identity/index.html`

The browser identity tab is part of the canonical lane, not a separate browser mode:

- title format: `<repo-label> · <cdp-port> · browser lane`
- it uses a repo-stable favicon/accent by default
- you may override the badge with `CAMPUS_COPILOT_BROWSER_IDENTITY_LABEL`
- you may override the accent with `CAMPUS_COPILOT_BROWSER_IDENTITY_ACCENT`
- pinning the tab is intentionally left as a manual one-time action instead of brittle Chrome UI automation

If you still see an older clone/debug root such as `~/.campus-copilot-profile13-clone` or `~/.chrome-debug-profile`, treat it as **legacy browser state**:

- it is no longer the canonical live lane
- it should stay in disk audits as a migration candidate
- it must not re-enter the default workflow unless a maintainer explicitly decides to revive it

Useful knobs:

- `CHROME_ATTACH_MODE=browser|page|persistent`
- `CHROME_CDP_URL=http://127.0.0.1:9334`
- `CHROME_USER_DATA_DIR=...`
- `CHROME_PROFILE_NAME="Profile 1"` or `CHROME_PROFILE_DIR=/path/to/Profile 1`
- `LIVE_CAPTURE_CONSOLE=1`
- `LIVE_CAPTURE_NETWORK=1`
- `LIVE_CAPTURE_TRACE=1`

If the repo-owned browser root has not been bootstrapped yet, `pnpm probe:live` now stops with `browser_root_not_bootstrapped` instead of quietly guessing the system Chrome root.

### Cross-repo listener hygiene

Before reusing any explicit `CHROME_CDP_URL`, first confirm who owns that listener.

Recommended minimum check:

```bash
lsof -nP -iTCP:<port> -sTCP:LISTEN
ps -axo pid=,command= | rg -- "--remote-debugging-port=<port>|Profile 1|chrome-user-data"
```

Rules:

- do not assume an attachable listener belongs to Campus Copilot just because the port is reachable
- do not hijack a listener that was started by another repo or another browser automation flow
- if the requested port is occupied by an unrelated process, either:
  - relaunch Campus Copilot on a clean port
  - or explicitly classify the contested listener as an environment/runtime boundary
- if the current machine already has **6 or more Chrome / Chromium automation instances**, do not open another Campus Copilot browser instance until you have first reclaimed the current repo's own leftovers or confirmed a safe attachable lane

Before you trust an explicit `CHROME_CDP_URL`, confirm it is really this repo's lane instead of a neighboring repo's browser:

```bash
lsof -nP -iTCP:<port> -sTCP:LISTEN
ps -axo pid=,command= | rg -- '--remote-debugging-port=<port>|Profile 1|chrome-user-data'
```

Current hygiene rule:

- do not hijack another repo's listener just because the port responds
- do not treat a shared or contaminated listener as the Campus Copilot SSOT
- if the intended profile needs a dedicated port, launch a repo-owned listener on a new port instead of killing the other repo's process
- if an older clone/debug root is already locked by another active instance, treat that as migration-state evidence, not as a product-path regression

When `pnpm diagnose:live` reports `profile_mismatch` and can see a single active debug listener,
it now emits:

- `recommendedProfile`
- a copy-ready `probeCommand`
- a copy-ready `diagnoseCommand`

Use those before hand-editing env variables so you do not have to manually reconstruct the active browser profile.

### Canonical campus profile rule

For real campus-site validation, the canonical repo-owned Chrome profile directory is:

```text
Profile 1
```

Its human-facing display name is:

```text
campus-copilot
```

Treat the default `.chrome-debug-profile` as a temporary debug sandbox, not as the primary student session truth source.
The old default Chrome root and its `Profile 13` now act only as a one-time migration source.

When validating `Canvas`, `Gradescope`, `EdStem`, or `MyUW`, explicitly prefer:

```bash
CHROME_USER_DATA_DIR="$HOME/.cache/campus-copilot/browser/chrome-user-data" \
CHROME_PROFILE_NAME="Profile 1" \
CHROME_CDP_URL="http://127.0.0.1:9334" \
pnpm probe:live
```

Do not stop at `session_resumable` or `mfa_required` until you have first confirmed that the requested repo-owned `Profile 1` session is actually the one in use.

The deterministic repository Playwright smoke does **not** use this real profile.
That smoke stays on GitHub-hosted, headless Chromium.
The repo-owned real Chrome profile contract only applies to manual live/browser diagnostics.

The old global existing-tab fallback has been removed.
`pnpm probe:live` and adjacent live diagnostics may inspect only the repo-owned single-instance lane through CDP attach or DevTools target HTTP surfaces.
They must not fall back to AppleScript, JXA, `System Events`, or arbitrary Chrome windows from the desktop.

When the same site has multiple tabs in the same repo-owned lane, prefer the **strongest site-level page** instead of the noisiest or oldest tab.

In plain language:

- a course dashboard or authenticated landing page is stronger than an older timeout/login tab on the same host
- a product-usable authenticated page is stronger than a stale redirect or expired-session page

`pnpm probe:live` should therefore resolve ties in this order:

1. same requested URL family
2. stronger authenticated/product-usable page
3. only then any weaker timeout/login fallback

This matters most for `Gradescope`, where the same repo-owned lane can temporarily contain both:

- `https://www.gradescope.com/` or `/courses/...` authenticated tabs
- and an older `?reason=timeout` tab

Do not let the weaker timeout tab silently overwrite the stronger authenticated truth.

### Campus-site auth progression rule

For `Canvas`, `Gradescope`, `EdStem`, and `MyUW`, the default assumption is:

- the repo-owned `Profile 1` profile (display name `campus-copilot`) may already contain a usable authenticated session, or
- the browser password manager can autofill the shared school credentials.

So the live lane should first continue the visible sign-in / SSO flow instead of immediately classifying the site as a hard blocker.

Do not keep retrying forever.
The intended upper bound is:

1. one fresh strongest-lane check
2. one meaningful continuation through visible sign-in / school SSO / `.env` fallback

After that, stop and classify the blocker honestly instead of relaunching more browsers or cloning more profiles.

If the correct profile is in use and the session still is not ready:

- first continue the visible sign-in flow in that profile;
- if credential fields still require manual input, use the local `.env` names `ACCOUNT_ID` and `PASSWORD` as the fallback source;
- never print, log, or copy the credential values into docs, screenshots, or support bundles.

If the flow advances to a `Duo Security` page on a `duosecurity.com` host, that is no longer a generic “keep clicking login” state.
Treat it as a more specific owner-only boundary:

- the repo-side/browser-side self-unblock work has already succeeded;
- the next action is human Duo approval in the requested profile;
- do not downgrade that state back to `not_open` or a vague “maybe not signed in yet”.

Apply the same stop-rule to adjacent external gates:

- `CAPTCHA / challenge`
- explicit tenant/account walls
- external account-selection failures such as an EdStem login/account wall

Once those appear after the bounded progression above, the remaining action is owner-side or external, not more repo-side browser churn.

`Gradescope` has one extra expected step:

- prefer the direct UW SSO entrypoint: `https://www.gradescope.com/auth/saml/uw`
- only fall back to clicking `Log In` if you are intentionally reproducing the generic browser path
- then continue the same SSO chain already used by `Canvas` / `MyUW`
- do not treat Gradescope as a separate password-first site if the UW SSO session already exists

What it proves:

- whether the current machine is ready to attempt live validation
- whether the browser/profile/CDP prerequisites appear available
- whether each site is deterministically reported as `authenticated: true|false`
- which human boundary applies when `authenticated=false` (`session_resumable`, `mfa_required`, `logged_out`, `not_open`, `profile_mismatch`, `attach_failed`)
- which attach mode, user-data-dir, and requested profile the live lane actually used
- whether the current failure looks like `attach_failed`, `profile_mismatch`, `session_resumable`, `mfa_required`, `logged_out`, or `not_open`
- when evidence flags are enabled, the current probe can also carry sanitized console/network summaries and best-effort trace status into the live result/support bundle

What it does **not** prove:

- that a site adapter is correct
- that a real sync path is permanently stable

### Lane C — Manual provider validation

Use:

```bash
pnpm smoke:provider
pnpm smoke:sidepanel
```

What it proves:

- whether the current environment can complete a provider round-trip
- whether the built sidepanel page can talk to the local BFF/provider path

What it does **not** prove:

- that the provider lane belongs in required CI
- that live site sync is covered

### Current provider priority

For the current Campus Copilot mainline:

- prioritize the formal API-key path, especially `GEMINI_API_KEY`, for AI round-trip checks;
- treat the optional local `Switchyard` bridge as a future local runtime direction when it is intentionally wired in;
- do not let `OpenAI Web` / `Gemini Web` login work displace the campus-site live validation mainline unless the current task is explicitly about those web surfaces.

### Lane D — Manual live site validation

Use:

```bash
pnpm probe:live
```

plus the relevant extension/manual sync procedure.

What it proves:

- that a current authenticated browser session can be inspected
- that a specific live session may allow a sync attempt

What it does **not** prove:

- long-term stability
- a repeatable deterministic gate

### Lane D1 — Manual browser evidence capture

Use:

```bash
LIVE_CAPTURE_CONSOLE=1 LIVE_CAPTURE_NETWORK=1 LIVE_CAPTURE_TRACE=1 pnpm probe:live
pnpm capture:browser-evidence -- --site canvas
```

What it proves:

- the current local diagnostics substrate can emit console, network, HAR-like, and trace artifacts for the current session

What it does **not** prove:

- that the live site is now product-stable
- that these artifacts belong in required CI

### Lane E — Manual live fixture preparation

Use:

```bash
pnpm probe:live
pnpm redact:live-fixture -- --kind <json|html> --input <raw-capture-path> --output .runtime-cache/live-fixtures/<site>/<name>.redacted.<ext>
```

What it proves:

- a raw manually captured site sample can be transformed into a redacted candidate fixture
- the repository has a repeatable path from live evidence to adapter-regression input material

What it does **not** prove:

- that the raw capture came from a currently authenticated, valid product-path session unless Lane D also passed
- that the redacted candidate fixture is safe to commit without maintainer review
- that the resulting fixture belongs in required CI

### Lane E1 — Selective-gap proof capture

Use this when the repo has already concluded:

- the gap is still valuable
- but current checkout does **not** yet prove the needed carrier
- and continuing implementation would otherwise become guesswork

Typical current cases:

- broader grouped-material or richer download carriers beyond the current shipped site-depth contract

When the task is explicitly about these still-unproven depth paths, pair this lane with the repo-local skill:

- [`.agents/skills/selective-gap-proof-capture/SKILL.md`](../.agents/skills/selective-gap-proof-capture/SKILL.md)

Working rule:

1. first confirm what the repo **does not** already prove
2. then capture the **minimum** live sample that would change that verdict
3. redact it into a candidate fixture
4. only then decide whether repo-local implementation can continue

Minimum proof examples:

- EdStem:
  - `reply-body` is now proven through the direct thread-detail DOM carrier and committed redacted fixtures under `packages/adapters-edstem/src/__fixtures__/live/`
  - course resources are now proven through the authenticated `api/courses/:course_id/resources` carrier with redacted API fixtures
  - lesson-detail pages now also show a session-backed `api/lessons/:lesson_id?view=1` carrier; once this local proof is promoted, the remaining question is contract promotion, not proof chase
  - only use Lane E1 again if a new grouped-material or richer download carrier is being proposed beyond the current `Resource` contract
- Gradescope:
  - question/rubric/evaluation-comment/annotation detail is now shipped through the graded submission carrier at `/courses/:course_id/assignments/:assignment_id/submissions/:submission_id`
  - only use Lane E1 again if a richer page/image carrier is being proposed beyond the current assignment summary/detail contract

Do **not** treat any still-unproven depth path as current shipped truth just because the current schema might be able to hold it later.
Until a reviewed redacted fixture or confirmed source path exists, keep the verdict at `external-proof-first`.

## How To Record A Manual Live Result

When you record a manual live result, always include:

- date
- lane (`provider`, `probe`, `manual site sync`, etc.)
- site or surface
- environment dependency
- what actually succeeded
- what remains unknown
- whether a redacted fixture candidate was produced, and where it was written

Use wording like:

- “manual live validation on `<date>` suggests …”
- “this result depends on the current authenticated browser session”
- “not promoted to deterministic gate”

Avoid wording like:

- “the repository now guarantees …”
- “CI proves …”
- “stable forever”

## Common Blocker Classes

### Environment blocker

Examples:

- browser not installed
- profile unavailable
- insufficient temporary disk space
- missing provider key

### Session blocker

Examples:

- logged out site session
- site only works from a course page or active tab
- provider account not authenticated

### Product-path blocker

Examples:

- a formal provider path is still missing a required API key
- a site path is still internal/session-backed and needs better disclosure or coverage

## What Must Never Move Back Into High-Authority Docs

Do **not** move these back into `README.md` or `09-implementation-decisions.md`:

- daily site counts
- `localhost:9222`-style operational notes
- one-off “READY” provider answers
- GitHub settings status
- platform alert visibility

Those belong in timestamped live validation notes, not in primary landing or decision docs.

## How To Handle Redacted Fixture Candidates

If a live session is good enough to produce adapter evidence:

1. capture the raw sample outside canonical docs
2. run `pnpm redact:live-fixture -- --kind ...` to write a redacted candidate under `.runtime-cache/live-fixtures/`
3. review the candidate for secrets, personal data, and unnecessary page text
4. only then promote the reviewed fixture into the relevant package fixture directory for regression tests

Use wording like:

- “captured from a manual live session on `<date>`”
- “redacted candidate fixture written to `.runtime-cache/live-fixtures/...`”
- “reviewed before promotion into repo-tracked regression fixtures”

Avoid wording like:

- “captured fixture automatically proves live support”
- “fixture committed directly from an unreviewed browser dump”
