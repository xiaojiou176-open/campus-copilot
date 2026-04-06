# Archive Skill Extraction Report

更新时间：2026-04-05 America/Los_Angeles  
模式：`zero-trust / archive-first / repo-skill distillation`

---

## 0. 结果摘要

这份报告的主体仍然记录 **2026-04-04 这轮 archive distillation** 的结果，  
但到 **2026-04-05** 为止，后续已 landed 的制度化动作已经把其中一条 `report-only / next-step`
事项继续推进成了真实 skill。

也就是说：

- 4 月 4 日这轮 archive distillation 当场**没有**新建 standalone skill folder
- 但 4 月 5 日基于同一批 selective-gap / external-proof-first truth，仓库后来**新增并 landed** 了：
  - `.agents/skills/selective-gap-proof-capture/SKILL.md`

因此这份报告现在必须按“**历史主报告 + 后续 landed addendum**”来理解，不能再被读成“当前 skill pack 里没有新增 skill”。

这轮真正落盘的是：

1. **更新** `live-runtime-diagnostics-ladder`
   - 新增 `strongest lane vs weaker/default lane` 的诊断台账。
   - 新增 `EADDRINUSE / listener collision / requested_profile_unconfirmed_existing_tabs` 这类控制面判读。
   - 明确 weaker lane 不能静默覆盖 stronger site-level evidence。
2. **更新** `live-stop-rule-gate`
   - 新增 stronger lane 与 weaker lane 打架时的 verdict discipline。
   - 明确 `task complete / prompt 已写好 / worker 自评完成` 不能偷换成 `delivery landed`。
   - 明确 stronger/weaker lane 未 reconciled 时，默认仍应保守判到 `KEEP_GOING_REPO_LOCAL` 或 `NOT_READY_TO_CLAIM`。
3. **更新** `runtime-resource-hygiene`
   - 新增 cross-project listener collision 的归因与 lane ledger。
   - 明确 clone/confirmed-listener lane 与 default fallback lane 并存时，要先分 strongest / weaker，再决定能接管什么。
4. **更新** `repo-truth-ledger-closeout`
   - 新增 stronger lane 与 weaker lane 的 closeout 分账。
   - 明确 `task complete / prompt written / worker 自评完成` 不能直接升格成 landed / closeout。
5. **更新** `front-door-truthful-positioning`
   - 新增 builder/toolbox 文案必须优先标成 `internal / preview / read-only / session-backed / owner-only` 的 No-Hype Gate。
   - 明确不能把 thin BFF / optional Switchyard / read-only preview 讲成 builder platform deliverable。
6. **更新** `live-profile-drift-audit`
   - 新增 `stronger lane > weaker lane`、`newer fresh truth > older optimistic summary` 的 drift 优先级。
   - 明确 stronger lane 被 summary/readout 藏掉时，即使字面默认值没错，也仍算 drift。
7. **更新** `.agents/skills/README.md`
   - 把这次 distillation 的真实落点改成：**evidence-lane 分账**、**landed 判词纪律**、以及 **docs-only pseudo skill 再次被否掉**。
   - 去掉了重复列出的 `runtime-resource-hygiene` 条目。
8. **重写** `_skill-extraction-report.md`
   - 这次报告不再把“recent-window-first 重蒸馏”冒充成“全部 69 份又线性 raw 重读了一遍”。
   - 现在直接写实：`69` 份 legal archive、`54` 个唯一正文体、`53` 份 full-read、`15` 份 exact-mirror coverage、`1` 份 prefix coverage。
9. **保持正文不变**：`archive-requirement-ledger` 与 `archive-skill-distiller`
   - 这次 evidence 证明它们的正文边界已经足够强。
   - 新增 learnings 主要应该进 report，而不是为了产出感继续改正文。
10. **后续 landed addendum（2026-04-05）**
   - 新增 `.agents/skills/selective-gap-proof-capture/SKILL.md`
   - 在 `.agents/skills/README.md` 中补齐 skill routing
   - 在 `docs/live-validation-runbook.md` 中补齐 `Lane E1 — Selective-gap proof capture`
   - 在 `AGENTS.md` 中补齐 repo-local skill 入口
   - 后续又补齐了这个 skill 的 `references/evidence-anchors.md` 与 skills README 内部一致性修正

> 4 月 4 日那轮 archive 的新增价值，不是“再裂几个看起来很酷的新 skill”，而是把以下三件事彻底写实：
>
> 1. `login_required` 不是 stop sign  
> 2. stronger lane 不能被 weaker lane 静默覆盖  
> 3. `task complete / prompt 已写好 / worker 自评完成` 不等于 `delivery landed`

而 4 月 5 日之后的后续 repo-local institutionalization，则把其中一条真正长期活着的尾巴继续推进成了新 skill：

> `selective-gap-proof-capture`

---

## 1. 输入档案清单

### 1.1 Summary

| 指标 | 数值 |
|---|---:|
| 输入总数 | `69` |
| 合法 archive | `69` |
| invalid | `0` |
| 总行数 | `202,094` |
| 正文唯一体数 | `54` |
| full-read complete | `53 files / 152,592 lines` |
| exact mirror groups | `10` |
| exact-mirror covered files | `15 files / 48,544 lines` |
| prefix-covered groups | `1` |
| prefix-covered files | `1 file / 958 lines` |
| recent 3-day files | `19` |
| recent 3-day unique bodies | `18` |
| older files | `50` |
| older unique bodies | `36` |

### 1.2 Archive Validity

本轮没有发现：

- `invalid-not-found`
- `invalid-not-file`
- `invalid-outside-repo`
- `invalid-empty`
- `invalid-corrupt-export`

所有输入都位于当前 repo 的 `.agents/Conversations/` 内，且都是可读、非空、markdown-like archive。

### 1.3 Reading Coverage / Fallback

这次**没有可用的 `memory-02-pageindex`**。  
所以这轮完全按 raw/full-text 路线推进，没有把 pageindex 冒充成正文阅读。

本轮的实际覆盖方式是：

- `53` 份正文代表件：**全文阅读完成**
- `15` 份 exact mirrors：基于去头正文 hash + 抽样 diff 做**严格覆盖证明**
- `1` 份 prefix-covered：基于正文前缀包含关系做**严格覆盖证明**

全文阅读分成 4 层完成：

1. `older-old`：`019d2917` + `019d3198`
2. `mid`：`019d3c2c / 019d40ef / 019d3e2a / 019d42fb / 019d460e / 019d441c`
3. `transition`：`019d47b3 / 019d489b / 019d4723 / 019d4c0b / 019d4c90`
4. `recent`：`019d4cef / 019d4ea0 / 019d4f82 / 019d5086 / 019d4bb1 / 019d524b / 019d51fc / 019d52fb / 019d5365 / 019d53a9 / 019d5385 / 019d5477 / 019d5451 / 019d5606`

这意味着：

> 这次已经满足“所有 legal archive 都已全文阅读，或有严格 mirror/prefix 覆盖证明”的门槛。

### 1.4 Mirror / Prefix Summary

#### Exact mirror groups

- `mg01`
  - `New/🔥-Campus-Copilot-thread-MCP和API-库-019d460e-part-01-rounds-1-8-2026-03-31_20-42-52.md`
  - `New/🔥-Campus-Copilot-thread-Worker-2-019d441c-part-01-rounds-1-8-2026-03-31_20-42-46.md`
- `mg02`
  - `New/🔥-Campus-Copilot-thread-MCP和API-库-019d460e-part-02-rounds-9-15-2026-03-31_20-42-52.md`
  - `New/🔥-Campus-Copilot-thread-Worker-2-019d441c-part-02-rounds-9-15-2026-03-31_20-42-46.md`
- `mg03`
  - `New/🔥-Campus-Copilot-thread-MCP和API-库-019d460e-part-03-rounds-16-18-2026-03-31_20-42-52.md`
  - `New/🔥-Campus-Copilot-thread-Worker-2-019d441c-part-03-rounds-16-18-2026-03-31_20-42-46.md`
- `mg04`
  - `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-01-rounds-1-4-2026-04-01_17-07-55.md`
  - `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-01-rounds-1-4-2026-04-01_17-08-00-2.md`
  - `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-01-rounds-1-4-2026-04-01_17-08-00.md`
- `mg05`
  - `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-02-rounds-5-15-2026-04-01_17-07-55.md`
  - `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-02-rounds-5-15-2026-04-01_17-08-00-2.md`
  - `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-02-rounds-5-15-2026-04-01_17-08-00.md`
- `mg06`
  - `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-03-rounds-16-20-2026-04-01_17-07-55.md`
  - `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-03-rounds-16-20-2026-04-01_17-08-00-2.md`
  - `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-03-rounds-16-20-2026-04-01_17-08-00.md`
- `mg07`
  - `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-04-rounds-21-24-2026-04-01_17-07-55.md`
  - `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-04-rounds-21-24-2026-04-01_17-08-00-2.md`
  - `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-04-rounds-21-24-2026-04-01_17-08-00.md`
- `mg08`
  - `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-05-rounds-25-27-2026-04-01_17-07-55.md`
  - `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-05-rounds-25-27-2026-04-01_17-08-00-2.md`
  - `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-05-rounds-25-27-2026-04-01_17-08-00.md`
- `mg09`
  - `New/🔥-Campus-Copilot-thread-Worker（3）-019d4c90-part-01-rounds-1-4-2026-04-01_23-22-48-2.md`
  - `New/🔥-Campus-Copilot-thread-Worker（3）-019d4c90-part-01-rounds-1-4-2026-04-01_23-22-48.md`
- `mg10`
  - `🔥-Campus-Copilot-thread-Planner（2）（Done）-019d5385-part-01-rounds-1-14-2026-04-03_09-37-47.md`
  - `🔥-Campus-Copilot-thread-Planner（2）（Done）-019d5385-part-01-rounds-1-14-2026-04-03_10-11-21.md`

#### Prefix-covered group

- `pg01`
  - small / covered:
    - `New/🔥-Campus-Copilot-thread-Worker（1）-019d4c0b-part-01-rounds-1-1-2026-04-01_21-10-31.md`
  - larger representative:
    - `New/🔥-Campus-Copilot-thread-Worker（2）-019d4c0b-part-01-rounds-1-2-2026-04-01_21-30-21.md`

### 1.5 Archive Ledger

| archive | lines | validity | archive_type | metadata_header_present | mirror_group | prefix_overlap_group | full_read_status | included_in_core_evidence_pool |
|---|---:|---|---|---|---|---|---|---|
| `New/🔥-Campus-Copilot-thread-MCP和API-库-019d460e-part-01-rounds-1-8-2026-03-31_20-42-52.md` | 3932 | valid | new | yes | mg01 | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-MCP和API-库-019d460e-part-02-rounds-9-15-2026-03-31_20-42-52.md` | 3809 | valid | new | yes | mg02 | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-MCP和API-库-019d460e-part-03-rounds-16-18-2026-03-31_20-42-52.md` | 3554 | valid | new | yes | mg03 | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-MCP和API-库-019d460e-part-04-rounds-19-25-2026-03-31_20-42-52.md` | 3853 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Planner-019d3e2a-part-01-rounds-1-8-2026-03-31_01-21-33.md` | 3956 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Planner-019d3e2a-part-02-rounds-9-17-2026-03-31_01-21-33.md` | 3902 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Planner-019d3e2a-part-03-rounds-18-18-2026-03-31_01-21-33.md` | 269 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Planner-019d42fb-part-01-rounds-1-10-2026-03-31_20-35-40.md` | 3954 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Planner-019d42fb-part-02-rounds-11-16-2026-03-31_20-35-40.md` | 3470 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Planner-019d42fb-part-03-rounds-17-21-2026-03-31_20-35-40.md` | 3072 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Worker-019d40ef-part-01-rounds-1-7-2026-03-30_19-46-07.md` | 1801 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Worker-019d47b3-part-01-rounds-1-6-2026-04-01_03-21-14.md` | 3672 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Worker-019d47b3-part-02-rounds-7-14-2026-04-01_03-21-14.md` | 3864 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Worker-019d47b3-part-03-rounds-15-30-2026-04-01_03-21-14.md` | 2062 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-01-rounds-1-4-2026-04-01_17-07-55.md` | 3547 | valid | new | yes | mg04 | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-01-rounds-1-4-2026-04-01_17-08-00-2.md` | 3547 | valid | new | yes | mg04 | - | exact_mirror_covered | mirror-via-representative |
| `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-01-rounds-1-4-2026-04-01_17-08-00.md` | 3547 | valid | new | yes | mg04 | - | exact_mirror_covered | mirror-via-representative |
| `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-02-rounds-5-15-2026-04-01_17-07-55.md` | 3906 | valid | new | yes | mg05 | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-02-rounds-5-15-2026-04-01_17-08-00-2.md` | 3906 | valid | new | yes | mg05 | - | exact_mirror_covered | mirror-via-representative |
| `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-02-rounds-5-15-2026-04-01_17-08-00.md` | 3906 | valid | new | yes | mg05 | - | exact_mirror_covered | mirror-via-representative |
| `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-03-rounds-16-20-2026-04-01_17-07-55.md` | 3157 | valid | new | yes | mg06 | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-03-rounds-16-20-2026-04-01_17-08-00-2.md` | 3157 | valid | new | yes | mg06 | - | exact_mirror_covered | mirror-via-representative |
| `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-03-rounds-16-20-2026-04-01_17-08-00.md` | 3157 | valid | new | yes | mg06 | - | exact_mirror_covered | mirror-via-representative |
| `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-04-rounds-21-24-2026-04-01_17-07-55.md` | 3823 | valid | new | yes | mg07 | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-04-rounds-21-24-2026-04-01_17-08-00-2.md` | 3823 | valid | new | yes | mg07 | - | exact_mirror_covered | mirror-via-representative |
| `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-04-rounds-21-24-2026-04-01_17-08-00.md` | 3823 | valid | new | yes | mg07 | - | exact_mirror_covered | mirror-via-representative |
| `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-05-rounds-25-27-2026-04-01_17-07-55.md` | 1345 | valid | new | yes | mg08 | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-05-rounds-25-27-2026-04-01_17-08-00-2.md` | 1345 | valid | new | yes | mg08 | - | exact_mirror_covered | mirror-via-representative |
| `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-05-rounds-25-27-2026-04-01_17-08-00.md` | 1345 | valid | new | yes | mg08 | - | exact_mirror_covered | mirror-via-representative |
| `New/🔥-Campus-Copilot-thread-Worker-2-019d441c-part-01-rounds-1-8-2026-03-31_20-42-46.md` | 3932 | valid | new | yes | mg01 | - | exact_mirror_covered | mirror-via-representative |
| `New/🔥-Campus-Copilot-thread-Worker-2-019d441c-part-02-rounds-9-15-2026-03-31_20-42-46.md` | 3809 | valid | new | yes | mg02 | - | exact_mirror_covered | mirror-via-representative |
| `New/🔥-Campus-Copilot-thread-Worker-2-019d441c-part-03-rounds-16-18-2026-03-31_20-42-46.md` | 3554 | valid | new | yes | mg03 | - | exact_mirror_covered | mirror-via-representative |
| `New/🔥-Campus-Copilot-thread-Worker-2-019d441c-part-04-rounds-19-21-2026-03-31_20-42-46.md` | 3985 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Worker-2-019d441c-part-05-rounds-22-22-2026-03-31_20-42-46.md` | 661 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Worker（1）-019d4c0b-part-01-rounds-1-1-2026-04-01_21-10-31.md` | 958 | valid | new | yes | - | pg01-small | prefix_covered | covered-via-prefix |
| `New/🔥-Campus-Copilot-thread-Worker（2）-019d4c0b-part-01-rounds-1-2-2026-04-01_21-30-21.md` | 1951 | valid | new | yes | - | pg01-large | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Worker（3）-019d4c90-part-01-rounds-1-4-2026-04-01_23-22-48-2.md` | 2010 | valid | new | yes | mg09 | - | exact_mirror_covered | mirror-via-representative |
| `New/🔥-Campus-Copilot-thread-Worker（3）-019d4c90-part-01-rounds-1-4-2026-04-01_23-22-48.md` | 2010 | valid | new | yes | mg09 | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Worker（4）-019d4cef-part-01-rounds-1-5-2026-04-02_07-32-15.md` | 1450 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Worker（5）-019d4ea0-part-01-rounds-1-4-2026-04-02_11-35-59.md` | 2098 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-Worker（？）-019d4f82-part-01-rounds-1-5-2026-04-02_16-20-52.md` | 2484 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-对话记录分析（继续做Worker，还没分析需求，下一轮次做需求）-019d4723-part-01-rounds-1-8-2026-04-01_17-08-05.md` | 3688 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-对话记录分析（继续做Worker，还没分析需求，下一轮次做需求）-019d4723-part-02-rounds-9-9-2026-04-01_17-08-05.md` | 505 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-收尾-019d3c2c-part-01-rounds-1-7-2026-03-30_02-54-23.md` | 3856 | valid | new | yes | - | - | full_read_complete | yes |
| `New/🔥-Campus-Copilot-thread-收尾-019d3c2c-part-02-rounds-8-18-2026-03-30_02-54-23.md` | 3775 | valid | new | yes | - | - | full_read_complete | yes |
| `Old/campus-copilot-thread-019d2917-part-01-rounds-1-1-2026-03-26_04-56-56.md` | 39 | valid | old | yes | - | - | full_read_complete | yes |
| `Old/campus-copilot-thread-019d2917-part-02-rounds-2-2-2026-03-26_04-56-56.md` | 7289 | valid | old | yes | - | - | full_read_complete | yes |
| `Old/campus-copilot-thread-019d2917-part-03-rounds-3-3-2026-03-26_04-56-56.md` | 7715 | valid | old | yes | - | - | full_read_complete | yes |
| `Old/campus-copilot-thread-019d2917-part-04-rounds-4-18-2026-03-26_04-56-56.md` | 3496 | valid | old | yes | - | - | full_read_complete | yes |
| `Old/campus-copilot-thread-019d2917-part-05-rounds-19-31-2026-03-26_04-56-56.md` | 3024 | valid | old | yes | - | - | full_read_complete | yes |
| `Old/campus-copilot-thread-019d3198-part-01-rounds-1-1-2026-03-27_19-53-05.md` | 3014 | valid | old | yes | - | - | full_read_complete | yes |
| `Old/campus-copilot-thread-019d3198-part-02-rounds-2-3-2026-03-27_19-53-05.md` | 3812 | valid | old | yes | - | - | full_read_complete | yes |
| `Old/campus-copilot-thread-019d3198-part-03-rounds-4-14-2026-03-27_19-53-05.md` | 3366 | valid | old | yes | - | - | full_read_complete | yes |
| `🔥-Campus-Copilot-thread-Planner（2）+-Switchyard-+-浏览器-019d5451-part-01-rounds-1-7-2026-04-04_02-26-40.md` | 3001 | valid | current-root | yes | - | - | full_read_complete | yes |
| `🔥-Campus-Copilot-thread-Planner（2）（Done）-019d5385-part-01-rounds-1-14-2026-04-03_09-37-47.md` | 3683 | valid | current-root | yes | mg10 | - | exact_mirror_covered | mirror-via-representative |
| `🔥-Campus-Copilot-thread-Planner（2）（Done）-019d5385-part-01-rounds-1-14-2026-04-03_10-11-21.md` | 3683 | valid | current-root | yes | mg10 | - | full_read_complete | yes |
| `🔥-Campus-Copilot-thread-Planner（2）（Done）-019d5385-part-02-rounds-15-16-2026-04-03_10-11-21.md` | 2276 | valid | current-root | yes | - | - | full_read_complete | yes |
| `🔥-Campus-Copilot-thread-Prompt-1-019d524b-part-01-rounds-1-1-2026-04-03_02-03-12.md` | 970 | valid | current-root | yes | - | - | full_read_complete | yes |
| `🔥-Campus-Copilot-thread-Prompt-2-019d524b-part-01-rounds-1-1-2026-04-03_02-03-18.md` | 391 | valid | current-root | yes | - | - | full_read_complete | yes |
| `🔥-Campus-Copilot-thread-Wave-1-收尾-019d52fb-part-01-rounds-1-5-2026-04-03_06-10-42.md` | 1156 | valid | current-root | yes | - | - | full_read_complete | yes |
| `🔥-Campus-Copilot-thread-Wave-2-+-3-019d53a9-part-01-rounds-1-5-2026-04-03_09-01-09.md` | 3273 | valid | current-root | yes | - | - | full_read_complete | yes |
| `🔥-Campus-Copilot-thread-Worker（7）-019d5086-part-01-rounds-1-3-2026-04-02_18-25-30.md` | 1980 | valid | current-root | yes | - | - | full_read_complete | yes |
| `🔥-Campus-Copilot-thread-回顾对话记录（梳理）-019d4bb1-part-01-rounds-1-14-2026-04-02_23-19-48.md` | 3859 | valid | current-root | yes | - | - | full_read_complete | yes |
| `🔥-Campus-Copilot-thread-回顾对话记录（梳理）-019d4bb1-part-02-rounds-15-23-2026-04-02_23-19-48.md` | 3474 | valid | current-root | yes | - | - | full_read_complete | yes |
| `🔥-Campus-Copilot-thread-回顾对话记录（梳理）-019d4bb1-part-03-rounds-24-26-2026-04-02_23-19-48.md` | 1940 | valid | current-root | yes | - | - | full_read_complete | yes |
| `🔥-Campus-Copilot-thread-整体任务进度梳理（Planner-2）-019d5365-part-01-rounds-1-3-2026-04-03_06-10-38.md` | 155 | valid | current-root | yes | - | - | full_read_complete | yes |
| `🔥-Campus-Copilot-thread-整体任务进度梳理（Planner）（7-个-Wave，总共-13-个-L1-…-019d51fc-part-01-rounds-1-7-2026-04-03_05-50-42.md` | 1705 | valid | current-root | yes | - | - | full_read_complete | yes |
| `🔥-Campus-Copilot-thread-终局Worker-019d5606-part-01-rounds-1-9-2026-04-04_02-26-37.md` | 2318 | valid | current-root | yes | - | - | full_read_complete | yes |
| `🔥-Campus-Copilot-thread-超级Wave-019d5477-part-01-rounds-1-7-2026-04-03_17-19-20.md` | 3245 | valid | current-root | yes | - | - | full_read_complete | yes |

---

## 2. 证据提炼台账

### 2.1 Blocker-Resolution Ledger

| id | archive anchors | 它最初为什么像 blocker | 后来被判成哪类 | 最终沉淀的长期规则 | candidate_destination |
|---|---|---|---|---|---|
| `BLK-001` | `New/🔥-Campus-Copilot-thread-Worker（4）-019d4cef...` `121-149`; `🔥-Campus-Copilot-thread-回顾对话记录（梳理）-019d4bb1-part-01...` `3451-3469` | 一开始像“站点都需要人类登录”，但根因其实是把 `Profile 13` directory 和 `Campus Copilot` display name 混了 | `wrong lane` | **先分清 directory / display name / actual running lane，再谈 live 结论** | report-only，现有 `correct-profile-live-closure` 已覆盖 |
| `BLK-002` | `New/🔥-Campus-Copilot-thread-Worker（4）-019d4cef...` `178-199`; `🔥-Campus-Copilot-thread-回顾对话记录（梳理）-019d4bb1-part-01...` `3435-3445` | `login_required` 看起来像终点 | `false blocker` | **`login_required` 默认是中间态，不是 stop sign** | 吸收到 `live-stop-rule-gate` / `live-runtime-diagnostics-ladder` |
| `BLK-003` | `New/🔥-Campus-Copilot-thread-Worker（5）-019d4ea0...` `927-947`; `New/🔥-Campus-Copilot-thread-Worker（？）-019d4f82...` `19-22` | profile 纠偏后，问题一度看起来仍像“live 还没通” | `repo-local live blind spot` | **真正的 repo-local blocker 从 profile 概念错误收窄成 raw lane existing-tab blind spot** | merge into `live-runtime-diagnostics-ladder` |
| `BLK-004` | `New/🔥-Campus-Copilot-thread-Worker（？）-019d4f82...` `1029-1044`; `🔥-Campus-Copilot-thread-回顾对话记录（梳理）-019d4bb1-part-03...` `1352-1357` | 强 lane 与弱 lane 给出不同结论，看起来像“live 真相自相矛盾” | `repo-local truth reconciliation` | **更晚、更直接、site-level 的 stronger lane 优先，但 weaker lane 仍要保留在 ledger 里** | 吸收到 `live-runtime-diagnostics-ladder` / `live-stop-rule-gate` |
| `BLK-005` | `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-02...` `1515-1533`, `1563-1584`; `New/🔥-Campus-Copilot-thread-Worker（2）-019d4c0b...` `1664-1675`, `1899-1916` | 一度像是“formal mainline 已经 clean，所以 closeout 了” | `wrong truth layer` | **formal mainline closure 和 current checked-out workspace closure 不是一回事；dirty worktree ownership table 先于 stop-rule** | report-only，现有 `repo-truth-ledger-closeout` 已覆盖 |
| `BLK-006` | `New/🔥-Campus-Copilot-thread-Planner-019d3e2a-part-01...` `2328-2400`, `3474-3490`, `3553-3567`; `New/🔥-Campus-Copilot-thread-Planner-019d3e2a-part-03...` `249-258` | worker 一度把 live 说成“within current environment complete” | `overclaim -> external-only reclassification` | **worker 自评不是 verdict；planner 可以也应该用更强证据把它打回去** | report-only |
| `BLK-007` | `🔥-Campus-Copilot-thread-终局Worker-019d5606...` `2006-2045`; `🔥-Campus-Copilot-thread-超级Wave-019d5477...` `3167-3182` | 早期泛泛的 `login_required / site_login_required` 很粗 | `owner-only / external-only` | **真正的人类边界应被压成更精确的 Duo MFA / account boundary / owner publishing，而不是泛化成“外部问题”** | 吸收到 `live-stop-rule-gate` |
| `BLK-008` | `New/🔥-Campus-Copilot-thread-MCP和API-库-019d460e-part-03...` `114-122`, `450-456`; `docs/10-builder-api-and-ecosystem-fit.md` `5-30` | builder/MCP/API 容易被讲成“已经是平台了” | `no-hype scope correction` | **builder/toolbox 只能按 read-only preview / internal / session-backed truth 说话** | report-only，暂不新建 skill |

### 2.2 Hard-Correction Ledger

| id | archive anchors | what_the_agent_did_wrong | why_it_triggered_user_anger | future_guardrail |
|---|---|---|---|---|
| `HC-001` | `New/🔥-Campus-Copilot-thread-Worker（4）-019d4cef...` `214-223`; `🔥-Campus-Copilot-thread-Planner（2）+-Switchyard-+-浏览器-019d5451...` `166-171` | 把 `task complete / prompt 写好 / closeout 文案写完` 偷换成 `delivery landed` | 用户要的是“真正落地”，不是“文字上已经规划好” | **`task complete != delivery landed` 必须进 verdict 技能** |
| `HC-002` | `🔥-Campus-Copilot-thread-回顾对话记录（梳理）-019d4bb1-part-01...` `1068-1074`; `part-02...` `1272-1295` | 把四本账混成一句“差不多完成了” | 一混账就会把 repo-side、live-side、git/worktree、public/live claim 全压扁 | **任何完成度回答默认强拆四本账** |
| `HC-003` | `🔥-Campus-Copilot-thread-回顾对话记录（梳理）-019d4bb1-part-03...` `1352-1357`; `🔥-Campus-Copilot-thread-终局Worker-019d5606...` `1018-1035` | 让旧的、乐观的、较弱的 live 结果压过新的、更强的证据 | 用户对“拿旧快照当现状”高度敏感 | **newer fresh truth > older optimistic truth** |
| `HC-004` | `New/🔥-Campus-Copilot-thread-Worker（5）-019d4ea0...` `1787-1796`, `2069-2085` | 先把 skill 产物做成 `docs/repo-skills/*` 这类 loader 看不见的 docs-only 假技能 | 看起来有产出，但未来 agent 根本不会触发它 | **repo-local skills 只能落在 `.agents/skills/*`** |
| `HC-005` | `New/🔥-Campus-Copilot-thread-MCP和API-库-019d460e-part-03...` `450-456` | 把“主线程没 MCP/工具不顺手”当成停下来的理由 | 这是把工具面问题偷换成执行边界 | **工具面阻塞不等于允许停工；要么换 lane，要么继续 spawn** |
| `HC-006` | `New/🔥-Campus-Copilot-thread-Worker-019d489b-part-02...` `1501-1529`; `Analysis-019d4723-part-01...` `1977-1980` | 把 queued/prompted/next-wave 工作误算成已落地成果 | 这是最典型的“为了看起来完成很多事而偷换 truth layer” | **queued / superseded / owner-only 必须和 landed 分开记账** |
| `HC-007` | `New/🔥-Campus-Copilot-thread-Planner-019d42fb-part-03...` `936-941`; `New/🔥-Campus-Copilot-thread-MCP和API-库-019d460e-part-03...` `114-122` | 把 internal / session-backed / preview-grade 的东西说大了 | 这会直接把 builder/MCP/API 讲成 hosted 平台 | **No-Hype Gate：internal 就写 internal，preview 就写 preview** |

### 2.3 Highest-Value Repo-specific Guardrails

| theme | stable learning | current truth layer |
|---|---|---|
| product identity | `Campus Copilot` 始终是 `local-first academic decision workspace`，不是 generic chatbot / hosted autonomy | docs + archive stable |
| formal path | 四站 -> schema/read-model -> decision surfaces -> export -> cited AI -> thin BFF，是长期主链 | docs + archive stable |
| truth layering | `archive said` / `repo current truth` / `git or remote truth` / `public or live truth` / `external or owner only` 必须分开 | archive stable |
| blocker semantics | `login_required` 不是 stop sign；真正的人类边界要压成 Duo MFA / account boundary / owner publishing | recent archive stable |
| evidence lanes | stronger lane 不能被 weaker lane 静默覆盖；但 weaker lane 仍要保留在 ledger 里 | recent archive stable |
| landed discipline | `task complete / prompt written / worker self-report` 不等于 `delivery landed` | recent archive stable |
| skill hygiene | docs-only pseudo skill 不算 skill；真正可触发的 skill 必须进 `.agents/skills/*` | recent archive stable |
| closeout discipline | dirty worktree ownership table 先于 stop-rule；formal mainline clean 不等于当前 workspace clean | transition archive stable |

---

## 3. Candidate Skill Map

| candidate_name | problem_it_solves | trigger | why_repo_specific | boundary_vs_existing_skills | evidence_strength | suggested_action | notes |
|---|---|---|---|---|---|---|---|
| `archive-requirement-ledger` addendum | 让 69 份 archive 的全量 ledger、mirror/prefix、30 轮逐轮判账继续制度化 | archive-heavy distillation / backlog reconstruction | 这仓库有大量 planner/worker/review/prompt 混合导出 | 当前正文已覆盖，新增价值主要是本轮审计证据 | 强 | `report-only` | 本轮保留正文不变 |
| `archive-skill-distiller` addendum | 让 `report-only / reject / no docs-only pseudo skill` 的门槛更可审计 | skill distillation | 近期档案直接涉及 repo skill path 纠偏 | 当前正文已覆盖，新增价值主要在 report | 强 | `report-only` | 本轮保留正文不变 |
| `live-runtime-diagnostics-ladder` stronger-vs-weaker | 处理 stronger lane 与 weaker/default lane 的冲突、listener collision、existing-tab blind spot | live/browser/session diagnostics | 这是近期 archive 最稳定、最常被误判的 repo-specific 控制面问题 | 现有技能最接近，且这轮已证明要吸收进去 | 很强 | `update` | 本轮已更新 |
| `live-stop-rule-gate` landed discipline | 让 verdict 不再被 prompt/self-report/较弱 lane 误导 | live verdict / closeout judgement | 近期 archive 反复强调 external-only 宣判喊早 | 现有技能最接近，且这轮已证明要吸收进去 | 很强 | `update` | 本轮已更新 |
| `runtime-resource-hygiene` collision-lane ledger | 处理 cross-project listener collision、clone lane 与 default fallback lane 的资源归属 | runtime hygiene / browser ownership | 04-04 active boards 已把这条线抬成 closeout 主账本的一部分 | 现有技能最接近，且这轮已证明要吸收进去 | 很强 | `update` | 本轮已更新 |
| `existing-tab-blind-spot-closure` | 专门解释 raw lane existing-tab blind spot | raw live lane | 高价值但触发太窄 | 已自然落在 diagnostics ladder 里 | 很强 | `merge` | 不新建 folder |
| `prompt-vs-landed-audit` | 专门审计 prompt written/task complete 与 landed truth 的差异 | archive review / closeout review | 高价值，但更像跨线程审计法则 | 可被 README/report/stop-rule 技能吸收 | 很强 | `report-only` | 不新建 folder |
| `builder-platformization` | 把 builder/MCP/API 讲成独立平台技能 | builder-facing / package preview | 当前真相只支持 read-only preview / thin-BFF-first / no-hype | 与 docs-truth/front-door 技能重叠且会把 scope 讲大 | 中强 | `reject` | 明确不新建 |
| `browser-gui-fallback` | 把 GUI/System Events 降级流程做成 repo skill | 浏览器控制面 | archive 证明它是错误降级，不是应被鼓励的流程 | 已被 `browser-context-boundaries` 否掉 | 很强 | `reject` | 不新建 |
| `repo-truth-ledger-closeout` stronger-lane update | 把 stronger-vs-weaker lane 写进 repo-wide closeout，并防止 worker/self-report 被误判成 landed | repo status / closeout | transition + recent archive 已反复证明 closeout 层也会被这类误判污染 | 当前技能已足够接近，且这轮已证明要吸收进去 | 很强 | `update` | 本轮已更新 |
| `front-door-truthful-positioning` no-hype hardening | 把 builder/toolbox 对外叙事强制标成 `internal / preview / read-only / session-backed / owner-only` | README/docs/storefront/builder wording | mid + recent archive 反复证明“future direction”太软，容易把 scope 讲大 | 当前技能已足够接近，且这轮已证明要吸收进去 | 很强 | `update` | 本轮已更新 |
| `live-profile-drift-audit` lane-priority hardening | 把 stronger lane、weaker lane、freshness、directness 写进 drift audit 必做表 | profile/support summary/tests/runbook drift audit | recent archive 反复证明 drift 不只在字符串，还在 weaker summary 藏掉 stronger lane 真相时出现 | 当前技能已足够接近，且这轮已证明要吸收进去 | 很强 | `update` | 本轮已更新 |
| `correct-profile-live-closure` profile-name conflict addendum | 处理 archive 里 `Profile 13` 与 `Campus Copilot` 的时间片冲突 | live/profile | 有价值，但 current repo AGENTS 已明确 SSOT | 不应让 archive 时间片覆盖当前 repo 合同 | 中 | `report-only` | 写入报告，不改正文 |

---

## 4. 最终决策

### 4.1 Create / Update / Merge / Rewrite / Reject / Report-only

| 项目 | 动作 | 结论 |
|---|---|---|
| `.agents/skills/live-runtime-diagnostics-ladder/SKILL.md` | `update` | recent 3-day archive 反复证明需要 stronger-vs-weaker lane ledger、listener collision、existing-tab blind spot 诊断台账 |
| `.agents/skills/live-stop-rule-gate/SKILL.md` | `update` | recent 3-day archive 反复证明需要 stronger/weaker lane disagreement discipline，以及 `task complete != delivery landed` 的 stop-rule guardrail |
| `.agents/skills/runtime-resource-hygiene/SKILL.md` | `update` | recent archive 与 04-04 task boards 反复证明要把 cross-project listener collision 与 strongest lane 归属写进资源卫生合同 |
| `.agents/skills/repo-truth-ledger-closeout/SKILL.md` | `update` | transition + recent archive 反复证明 closeout 不能忽略 stronger/weaker lane 分账，也不能把 worker/self-report 当 landed |
| `.agents/skills/front-door-truthful-positioning/SKILL.md` | `update` | mid + recent archive 反复证明 builder/toolbox 对外叙事必须显式标注 `internal / preview / read-only / owner-only`，不能只写成模糊 future direction |
| `.agents/skills/live-profile-drift-audit/SKILL.md` | `update` | recent archive 反复证明 drift 不只在字符串默认值，还在 stronger lane 被 weaker summary 藏掉时出现 |
| `.agents/skills/README.md` | `update` | 需要把这次 pass 的真实变化写对，并明确 docs-only pseudo skill 再次被否掉 |
| `.agents/skills/_skill-extraction-report.md` | `rewrite` | 旧报告已无法忠实描述这次的 full-read coverage、mirror/prefix proof、以及最终决策 |
| 新 standalone skill folder | `reject` | 这次 evidence 更支持 update/merge，而不是 create sibling |
| `existing-tab-blind-spot-closure` | `merge` | 逻辑已被吸收到 `live-runtime-diagnostics-ladder`，无需单独文件 |
| `prompt-vs-landed-audit` | `report-only` | 很重要，但更像跨线程审计法则，不值得在当前 repo 再长一份 skill |
| `builder-platformization` | `reject` | 当前真相只支持 read-only preview / thin-BFF-first / no-hype，不能把 scope 讲大 |
| `archive-requirement-ledger` 正文 | `report-only` | 这次 evidence 证明其正文已足够强，无需再改 |
| `archive-skill-distiller` 正文 | `report-only` | 这次 evidence 证明其正文已足够强，无需再改 |

### 4.2 Why No New Skill Folder

这次刻意没新建 skill 文件夹，原因不是“没东西可学”，而是：

1. 新证据主要是 **diagnostics/stop-rule 的收紧**，不是全新的 recurring workflow。
2. `login_required`、`existing-tab blind spot`、`strongest vs weaker lane`、`task complete != landed` 这几类 learnings，都能自然吸收到现有 live / stop-rule 技能里。
3. 继续新建 sibling，只会让 skill pack 退化成“档案摘抄博物馆”。
4. recent archive 还再次证明：**真正会被 loader 触发的 skill，必须落在 `.agents/skills/*`；docs-only pseudo skill 只会制造假沉淀。**

---

## 5. 故意不写进 Skill 正文的内容

| 内容 | 原因 | 去向 |
|---|---|---|
| 具体 PR 编号、commit hash、worktree 一次性现场 | 这是历史时间片，不是长期合同 | report-only |
| 某一轮具体的 `likely_authenticated / login_required` 站点快照 | live/browser truth 高度时效敏感 | report-only |
| `Profile 13` 与 `Campus Copilot` 的 archive 时间片冲突本身 | current repo `AGENTS.md` 已给出更高优先级 SSOT | report-only |
| 某一版 7 waves / 13 L1 prompt program 的完整 prompt 文本 | phase-specific / execution-context-specific | report-only |
| “builder/MCP/API 已经可以对外讲成平台”的说法 | evidence 不支持，且会把 scope 讲大 | reject |
| docs-only `repo-skills` 路径下的假技能结构 | 不是 loader 真正可见路径 | reject |

---

## 6. 诚实边界

### 6.1 Archive Truth Boundary

这份报告回答的是：

- archive 里曾经发生了什么
- 哪些规律在跨线程反复出现
- 哪些值得制度化成 repo-local skill

它**不**自动回答：

- 今天此刻 live/browser 是否仍是同一状态
- 今天此刻 strongest lane 和 weaker lane 是否已经 reconciled
- 今天此刻 Duo/account boundary 是否还存在

这些仍然需要 fresh live rerun 才能确认。

### 6.2 Repo Current Truth Boundary

本轮我 fresh 检查了：

- `git status --short --branch`

得到的是：

- `main...origin/main`
- 当前 worktree 干净

但我**没有**在本轮重跑：

- `pnpm probe:live`
- `pnpm diagnose:live`
- `pnpm smoke:provider`
- `pnpm support:bundle`

所以凡是 live/browser/session 的 current truth，本报告都按：

- `archive_said`
- `task-board said`
- `[待确认]`

来分层，不装成 fresh rerun 结论。

### 6.3 Profile Conflict Boundary

archive 在 transition 期间出现过一段时间片冲突：

- 较早线程把 `Profile 13 + clone` 当成正确 lane
- 较晚 transition archive 一度把 `Campus Copilot` 抬成默认 profile 名

但当前 repo 的更高优先级 SSOT 仍是：

- `AGENTS.md`
- `correct-profile-live-closure/SKILL.md`

也就是：

- `Profile 13` 是 directory
- `Campus Copilot` 是 display name

因此这条冲突**只进报告**，不直接改 current live skill 的核心口径。

---

## 7. 最终验收

| 检查项 | 结果 |
|---|---|
| 所有合法 archive 是否进了输入台账 | 是 |
| duplicate / mirror / prefix 关系是否留痕 | 是 |
| 所有合法 archive 是否已全文阅读或有严格覆盖证明 | 是 |
| 是否明确写出 full-read / mirror-covered / prefix-covered 的数量与行数 | 是 |
| evidence pool 是否完成 | 是 |
| blocker-resolution ledger 是否完成 | 是 |
| hard-correction ledger 是否完成 | 是 |
| candidate skill map 是否完成 | 是 |
| 是否明确做出 create / update / merge / rewrite / reject / report-only 决策 | 是 |
| 是否更新了 skill pack README | 是 |
| 是否重写了 extraction report | 是 |
| 是否把 archive truth 与 current truth 分层 | 是 |
| 是否避免把一次性历史现场写进 skill 正文 | 是 |
| 是否避免为了凑数量而新建弱 skill | 是 |

### Final Acceptance Note

这轮最值钱的最终结论，不是某个单点 live 技术细节，而是下面这组经过 older-old → mid → transition → recent 四层 archive 共同证明的长期规则：

> **默认每一份 archive 都重要。**  
> **默认 blocker 的演化过程比最终标签更值钱。**  
> **默认用户硬纠偏是未来 skill 的 guardrail 来源。**  
> **默认 `task complete / prompt 已写好 / worker 自评完成` 不等于 `delivery landed`。**  
> **默认 stronger lane 不能被 weaker lane 静默覆盖。**  
> **默认没有足够证据，就不要新建 skill，只交 `report-only`。**
