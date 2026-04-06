---
name: selective-gap-proof-capture
description: 当 `campus-copilot` 已经把某条能力判成 `external-proof-first` 或 `selective gap`，并且下一步需要用真实会话把超出当前 shipped contract 的新 carrier 压成 redacted fixture 或已确认 source path 时触发。它负责把“别瞎写 payload”变成固定取证流程。
---

# 目的

把“我们知道还差 live 证据”这句话，变成一条**可执行、可审计、可复用**的补证据流程。

说得更直白一点：

- 现在不是继续写 adapter 猜字段
- 而是先证明真实 carrier 到底在不在
- 然后再决定值不值得继续改代码

# 何时触发

- 当前 gap 已被判成：
  - `external-proof-first`
  - `selective gap`
  - `not enough live fixture / source proof`
- 你需要继续推进：
  - 其他“现有 schema 也许装得下，但 repo 没有真实 carrier 证据”的 site-depth 工作
- 你要把下一位执行者从“知道缺 fixture”推进到“知道该抓哪一种 fixture”

# 不要在这些场景误触发

- 已经拿到了红acted live fixture，只差 adapter 消费
- 只是做 deterministic repo gate
- 只是做 README / public wording 调整

这类场景优先用：

- `real-session-adapter-triage`
- `docs-vision-gap-matrix`
- `repo-truth-ledger-closeout`

# 输入与前置检查

至少先读这些文件：

- `docs/04-adapter-spec.md`
- `docs/13-site-depth-exhaustive-ledger.md`
- `docs/site-capability-matrix.md`
- `docs/live-validation-runbook.md`
- 对应 adapter 的 `src/index.ts`
- 对应 adapter 的 `src/index.test.ts`
- 对应 fixture 目录

并先确认当前 gap 属于哪一类：

1. **carrier maybe exists, but repo has no proof**
2. **repo already has proof, but normalize path not landed**
3. **schema truly lacks a carrier**

只有第 1 类才是这份 skill 的主战场。

# 执行步骤

1. 先把当前 gap 写成一句人话。

例子：

- “Gradescope 现在已经能证明 graded submission question/rubric/evaluation-comment/annotation detail；如果还想继续推更丰富的 page/image rendering carrier，就要先证明那条新 carrier”
- “EdStem 现在能证明 thread summary/category、thread-detail reply body，以及当前 course-resources API carrier；如果还想继续推 grouped-material / richer download UX，就要先证明那条新 carrier”

2. 再分清“当前缺的到底是什么”。

最少拆成三栏：

- `missing_source_path`
- `missing_redacted_fixture`
- `missing_schema_carrier`

不要把这三种缺口混成一句“还差 live 证据”。

3. 先做静态负搜索，确认 repo 里现在**没有**什么。

你要明确写出：

- 当前 adapter 是否已有第二条 detail endpoint
- 当前 fixture 里是否已有目标字段
- 当前 tests 是否已有断言

这一步的意义像先清点厨房里到底有没有食材。
没有这一步，就很容易把“我猜它应该有”误当成“repo 里已经证明了”。

4. 然后定义**最小证明目标**。

不要说“抓一份更完整的 fixture”。
要写得像验收单：

- Gradescope：
  - 至少出现 `inline / drawn annotation` 一类超出当前 assignment-detail 合同的真实字段
  - 最好能同时证明它来自现有 submission detail state/DOM carrier 还是新的 detail endpoint

5. 用现有 runbook 走 manual proof path，而不是临场乱抓。

先：

```bash
pnpm probe:live
pnpm diagnose:live
```

再按需要产出 raw sample，然后：

```bash
pnpm redact:live-fixture -- --kind <json|html> --input <raw-path> --output .runtime-cache/live-fixtures/<site>/<name>.redacted.<ext>
```

6. 对 selective gap 做“proof-first verdict”。

只允许 3 档：

- `proof_ready_repo_local_can_continue`
- `proof_missing_external_first`
- `schema_missing_decision_needed`

不要跳过这一步直接喊“可以做”。

7. 如果产出了 redacted candidate fixture，再给下一步写**最小写集**。

例如：

- 只动 adapter + adapter tests
- 或 adapter + config path + fixture
- 或必须升级 shared schema

8. 如果没有产出 proof，就把 stop-rule 维持在 external-proof-first。

不要因为“不甘心”继续编字段。

# Site-specific minimum proof targets

## EdStem grouped materials / richer download UX beyond current `Resource`

当前 `api/courses/:course_id/resources` -> canonical `Resource` 这条线已经是 shipped truth。
只有在你想继续证明下面这些更深 carrier 时，才再用这份 skill：

- grouped/bundled material semantics beyond the current flat `Resource` list
- richer download/file carriers beyond the current authenticated resource response
- 其他超出当前 `Resource.summary/detail/downloadUrl` 合同的新字段来源

如果 repo 还没有 reviewed fixture 或 confirmed source path，就继续保持：

- `external-proof-first`

## Richer Gradescope page/image carriers beyond current annotation detail

当前 `Assignment.summary/detail` 上的 question/rubric/evaluation-comment/annotation detail 已经是 shipped truth。
只有在你想继续证明下面这些更深 carrier 时，才再用这份 skill：

- richer page/image rendering semantics beyond the current annotation preview contract
- 新 internal/detail endpoint 已存在并且 repo 当前没接
- 其他超出当前 `Assignment.detail` 的 reviewed markup / geometry carrier

如果 repo 还没有 reviewed fixture 或 confirmed source path，就继续保持：

- `external-proof-first`

# blocker / gotchas / guardrails

- 不要把“schema 装得下”误写成“repo 已证明这个 carrier 存在”。
- 不要把“以前 live 成功截图里可能看到过”误写成当前 repo truth。
- 不要把未审阅 raw capture 直接当 commit fixture。
- 不要为了推进速度，把 `new resource carrier` 或 `rubric/question` 挤进当前 summary 文本然后假装问题已解。
- 不要因为 package / adapter 已存在，就把 selective gap 写成当前 shipped truth。

# 验收标准

做到下面这些，才算这份 skill 跑完：

1. 当前 gap 已经被拆成 `missing_source_path / missing_redacted_fixture / missing_schema_carrier`
2. 已有 repo 证据与负搜索证据都写清楚
3. 最小 proof target 明确
4. 下一步 owner 动作缩成最小一句话
5. 最终 verdict 已明确是：
   - `proof_ready_repo_local_can_continue`
   - 或 `proof_missing_external_first`
   - 或 `schema_missing_decision_needed`

# 失败与降级路径

- 如果 live lane 本身没准备好，先退回 `live-runtime-diagnostics-ladder`
- 如果 profile / browser lane 还没确认，先退回 `correct-profile-live-closure`
- 如果 docs 合同自己就不允许当前提升，先退回 `docs-vision-gap-matrix`

# references 何时阅读

当你需要复核这条 skill 为什么成立、它对应的是哪些正式 selective gaps、以及它和现有 live redaction lane 是怎么接起来的，再读：

- `references/evidence-anchors.md`
