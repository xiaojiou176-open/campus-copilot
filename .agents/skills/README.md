# Repo-local Skills

这组 skill 放在 **`.agents/skills/`**，目的不是凑数量，而是让新 agent 一进仓库就先踩对路。

最重要的组织原则只有 3 条：

1. **少而强**
   - 能更新已有 skill，就不新建 sibling
   - 能并入现有边界，就不复制一份“差不多”的规则
2. **先分层，再执行**
   - 先分 archive / docs / live / closeout / adapter 这些问题类型
   - 再决定该触发哪条 skill
3. **正文管动作，report 管证据**
   - `SKILL.md` 负责“何时触发、怎么做、怎么验收”
   - `_skill-extraction-report.md` 负责“这些规则是从哪批 archive 蒸出来的”
4. **最近窗口优先，不等于旧档作废**
   - 用户点名“最近 3 天”时，先把 recent window 吃透
   - 但 older corpus 仍要做 mirror/prefix 归并、已解 blocker 反查、现有 skill coverage 复核

## Skill Groups

### 1. Archive Archaeology

- `archive-requirement-ledger/SKILL.md`
  - 处理 archive inventory、mirror/prefix 归并、Master Requirement Ledger、blocker-resolution ledger
- `archive-skill-distiller/SKILL.md`
  - 处理从 archive 到 skill 的蒸馏决策：`update / merge / rewrite / create / reject / report-only`

### 2. Docs And Truth

- `docs-vision-gap-matrix/SKILL.md`
  - 把 docs 合同和 current implementation 对成矩阵
- `front-door-truthful-positioning/SKILL.md`
  - 保证 README/docs/public wording 不把 repo 讲歪
- `repo-truth-ledger-closeout/SKILL.md`
  - 用四本账重建当前 repo truth、closeout verdict 和下一步，并防止把 stronger lane / worker 自评 / prompt 文案误写成 landed truth

### 3. Live / Profile / Browser

- `browser-context-boundaries/SKILL.md`
  - 区分自持浏览器自动化和用户真实会话，不乱退 GUI
- `correct-profile-live-closure/SKILL.md`
  - 锁定 repo-owned `Profile 1` 正确 lane，继续四站登录 / SSO / 会话推进
- `runtime-resource-hygiene/SKILL.md`
  - 在多 repo 并行环境里先判 browser/profile/port/tmp/cache 的资源归属，并把 cross-project listener collision / strongest lane 归属写清楚
- `live-profile-drift-audit/SKILL.md`
  - 审计 `.chrome-debug-profile`、support summary、tests、runbook 的有害 drift
- `live-stop-rule-gate/SKILL.md`
  - 给 live 线做最终 verdict，并在 stronger lane 与 weaker/default lane 打架时保持保守
- `live-runtime-diagnostics-ladder/SKILL.md`
  - 处理 `cleanup/preflight/probe/diagnose/smoke/support bundle` 这条 live 诊断梯子，并强制做 strongest-vs-weaker lane 分账

### 4. Real Session / Adapter Triage

- `real-session-adapter-triage/SKILL.md`
  - 在真实会话已就绪时，把四站从整站失败压到资源级失败，并守住 `partial_success` 语义
- `selective-gap-proof-capture/SKILL.md`
  - 当超出当前 shipped contract 的新 carrier 已被 fresh 判成 `external-proof-first`，需要把下一步 fixture/source-path 取证制度化时触发

## What Changed In This Distillation Pass

这次不只是“继续更新已有 live skill”，还新增了一条专门处理 `external-proof-first selective gap` 的 skill。

这轮真正发生的变化有 9 件：

- **保留 archive 元技能结构不变**
  - `archive-requirement-ledger` 与 `archive-skill-distiller` 经过 69 份 archive 的 fresh 复盘后，边界仍然成立
  - 这说明这两份技能已经足够承载 `inventory / mirror / prefix / candidate map / reject / report-only`
  - 所以本轮关于 archive 方法论的新信息，主要进 `_skill-extraction-report.md`，而不是为了产出感继续改正文
- **更新了** `live-runtime-diagnostics-ladder`
  - 新增 `strongest lane vs weaker/default lane` 的诊断台账
  - 新增 `EADDRINUSE / listener collision / requested_profile_unconfirmed_existing_tabs` 这类控制面判读
  - 明确 weaker lane 不能静默覆盖 stronger site-level evidence
- **更新了** `live-stop-rule-gate`
  - 新增 stronger lane 与 weaker lane 打架时的 verdict discipline
  - 明确 `task complete / prompt 已写好 / worker 自评完成` 不能偷换成 `delivery landed`
  - 明确 stronger/weaker lane 未 reconciled 时，默认仍应保守判到 `KEEP_GOING_REPO_LOCAL` 或 `NOT_READY_TO_CLAIM`
- **更新了** `runtime-resource-hygiene`
  - 新增 cross-project listener collision 的归因与 lane ledger
  - 明确 clone/confirmed-listener lane 与 default fallback lane 并存时，要先分 strongest / weaker，再决定能接管什么
- **更新了** `repo-truth-ledger-closeout`
  - 新增 stronger lane 与 weaker lane 的 closeout 分账
  - 明确 `task complete / prompt written / worker 自评完成` 不能直接升格成 landed / closeout
- **更新了** `front-door-truthful-positioning`
  - 新增 builder/toolbox 文案的 `internal / preview / read-only / session-backed / owner-only` 标签纪律
  - 明确不能把 thin BFF / optional Switchyard / read-only preview 讲成平台化 deliverable
- **更新了** `live-profile-drift-audit`
  - 新增 `stronger lane > weaker lane` 与 `newer fresh truth > older optimistic summary` 的 drift ledger
  - 明确 stronger lane 被 summary/readout 藏掉时，即使字面默认值没错，也仍算 drift
- **新增了** `selective-gap-proof-capture`
  - 因为 post-closeout 继续推进后，真正剩下的高价值 repo-local 制度化工作，不再是“再写一个 adapter skill”，而是把超出当前 shipped contract 的新 carrier proof-first 取证流程写成固定动作
  - 它不是第二套 live stop-rule，也不是 docs-only pseudo skill，而是一个明确服务于 `external-proof-first` selective gap 的执行手册
  - 这条 skill 的意义是把“别瞎写 payload”从口头纪律升级成 repo-owned procedure

## Why Only One New Standalone Skill

这次仍然有很多候选被刻意挡下，只保留了 `selective-gap-proof-capture` 这一条新 sibling。

被挡下来的候选有几类：

- `login_required-not-blocker`
- `raw-profile13-blind-spot-closure`
- `repo-skill-path-corrector`
- `wave-prompt-authoring`
- `repo-closeout-commander`
- `public-builder-packaging`
- `existing-tab-blind-spot-closure`
- `prompt-vs-landed-audit`

没有把这些候选长成新 skill，原因很简单：

- 要么已经被现有 live / closeout skill 覆盖
- 要么只是对现有 archive/live skill 的 recent hardening，不值得再裂 sibling
- 要么过于 phase-specific
- 要么只是一次性 prompt 现场，不够 stable
- 要么已经被实践纠偏成：**真正可触发的 skill 必须放在 `.agents/skills/*`，不是 docs-only pseudo skill**

换句话说：

> 这份 skill pack 要避免退化成“档案摘抄博物馆”。

而 `selective-gap-proof-capture` 之所以被保留，是因为它已经跨过了“只是建议”的门槛：

- 它服务的是当前仍活着的 selective gap
- 它直接对应 repo 现在真实剩余的 external-proof-first 边界
- 它有清晰的最小 proof target、固定命令入口、和明确的 stop-rule

## Read This First

如果你是第一次进这个仓库，推荐顺序是：

1. `archive-requirement-ledger`
2. `archive-skill-distiller`
3. 按任务类型进入 `docs-*` / `repo-truth-*` / `live-*`

如果你已经明确是 live/browser/session 问题，则直接从：

1. `correct-profile-live-closure`
2. `live-profile-drift-audit`
3. `live-stop-rule-gate`

开始，不要把 archive 元技能当成 live runbook。

如果 live/browser/session 本身已经跑通，但你卡在：

- richer `Gradescope` page / image rendering
- broader `EdStem` grouped-material / richer download UX
- 其他已被 fresh 判成 `external-proof-first` 的 selective gap

则从：

1. `live-runtime-diagnostics-ladder`
2. `selective-gap-proof-capture`

开始，不要再回头写猜字段式 adapter patch。
