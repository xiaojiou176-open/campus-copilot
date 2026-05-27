<p align="center">
  <img src="https://em-content.zobj.net/source/apple/391/graduation-cap_1f393.png" width="120" alt="graduation cap" />
</p>

<h1 align="center">CampusCopilot</h1>

<p align="center">
  <strong>Canvas + Gradescope + EdStem on one calm desk</strong>
</p>

<p align="center">
  <a href="https://github.com/xiaojiou176-open/campus-copilot/stargazers"><img src="https://img.shields.io/github/stars/xiaojiou176-open/campus-copilot?style=flat&color=yellow" alt="Stars"></a>
  <a href="https://github.com/xiaojiou176-open/campus-copilot/commits/main"><img src="https://img.shields.io/github/last-commit/xiaojiou176-open/campus-copilot?style=flat" alt="Last Commit"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/xiaojiou176-open/campus-copilot?style=flat" alt="License"></a>
</p>

<p align="center">
  <a href="#what-you-get">What You Get</a> •
  <a href="#install">Install</a> •
  <a href="#how-it-work">How It Work</a> •
  <a href="#ecosystem">Ecosystem</a>
</p>

---

CampusCopilot pulls every academic surface — Canvas, Gradescope, EdStem, MyUW, MyPlan — into one local-first read-only desk. See what changed, what is due, what to ask. Nothing leaves your laptop.

```
┌──────────────────────────────────────┐
│  LOCAL-FIRST          ████████ 100%  │
│  SOURCE-TRACEABLE     ████████ 100%  │
│  TYPING REQUIRED      ░░░░░░░░   0%  │
│  VIBES                ████████ ZERO  │
│                                FILLER│
└──────────────────────────────────────┘
```

> Local-first study workspace. Read-only by default. Student-first by design.

## What You Get

| Surface | What |
|---|---|
| `campus-copilot apps` | Web workbench plus the school-specific browser extension. |
| `packages` | 24 adapters for the SIS / LMS / grading systems schools actually use. |
| `design system` | Calm-desk visual baseline. Built for students, not dashboards. |
| `public skills` | Drop into Claude/Codex/OpenClaw. Ask one bounded question per case. |
| `policies` | Repo governance: read-only-first, no-PII-leak, source-traceable. |

> [!IMPORTANT]
> Local-first by default. No silent telemetry. No cloud round-trip. Your data stays on your machine until you explicitly ship it somewhere.

## Install

```bash
git clone https://github.com/xiaojiou176-open/campus-copilot.git
cd CampusCopilot
# follow the per-stack quickstart in INSTALL.md or docs/
```

Three commands. No `curl | sh`. No login. Read what you run.

Install break? Open your favorite agent and say *"Read AGENTS.md and bootstrap CampusCopilot for me."* Agent fix own brain. Long version: [`docs/`](./docs/).

## How It Work

The repo is seven layers — exactly the seven commits in `git log`. New work goes in as small named PRs. No 50-file mystery commits.

| Layer | What |
|---|---|
| `chore: scaffold` | License, governance, hygiene gates, CI scaffolding. |
| `feat(core)` | The primary engine. The reason CampusCopilot exists. |
| `feat(modules)` | Packages, adapters, services, plugins. The second floor. |
| `feat(contracts)` | Schemas, configs, public boundaries. Other code talks here. |
| `test:` | Receipts. Everything in this layer must run. |
| `feat(ops)` | Scripts, infra, CI helpers, build glue. |
| `docs:` | Public docs surface. The pretty face. |

`git log` reads like a building floor plan. Look once, know the whole shape.

## Ecosystem

CampusCopilot lives in the **open family**: three open platforms. local-first, source-first, builder-first.

| Repo | What |
|---|---|
| [**CampusCopilot**](https://github.com/xiaojiou176-open/campus-copilot) *(you here)* | Canvas + Gradescope + EdStem on one calm desk |
| [**OpenVibeCoding**](https://github.com/xiaojiou176-open/OpenVibeCoding) | AI codes overnight, you ship in the morning |
| [**OpenUIStudio**](https://github.com/xiaojiou176-open/OpenUIStudio) | brief in, React + shadcn out, proof attached |

Cross-family taste:
[**BeamMe**](https://github.com/xiaojiou176-open/BeamMe) ·
[**BrewMe**](https://github.com/xiaojiou176-open/BrewMe) ·
[**OpenVibeCoding**](https://github.com/xiaojiou176-open/OpenVibeCoding) ·
[**proofyard**](https://github.com/xiaojiou176-open/proofyard).

## Star This Repo

If CampusCopilot saves you a click, an hour, or a headache — star costs zero. Fair trade. ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=xiaojiou176-open/campus-copilot&type=Date)](https://star-history.com/#xiaojiou176-open/campus-copilot&Date)

## Also by Yifeng[Terry] Yu

- **[OpenVibeCoding](https://github.com/xiaojiou176-open/OpenVibeCoding)** — AI codes overnight, you ship in the morning
- **[OpenUIStudio](https://github.com/xiaojiou176-open/OpenUIStudio)** — brief in, React + shadcn out, proof attached
- **[BeamMe](https://github.com/xiaojiou176-open/BeamMe)** — beam your agent config to any planet
- **[BrewMe](https://github.com/xiaojiou176-open/BrewMe)** — wake up, news already brewed
- **[proofyard](https://github.com/xiaojiou176-open/proofyard)** — every claim ships with its receipt

## License

MIT — small print, big freedom.
