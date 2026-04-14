# Campus Copilot Worker E UIUX Handoff

日期: 2026-04-13 America/Los_Angeles
状态: `worker-e repo-local pass completed / shared-substrate untouched`

## 1. Scope actually touched

- `apps/extension/src/surface-shell.tsx`
- `apps/extension/src/options-panels.tsx`
- `apps/extension/src/workbench-panel-sections.tsx`
- `apps/extension/tests/extension.smoke.spec.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/web-workbench-panels.tsx`
- `apps/web/src/styles.css`
- `apps/web/tests/web.smoke.spec.ts`
- `docs/specs/ui/2026-04-13-campus-copilot-worker-e-visual-evidence.md`

## 2. What landed

### Extension assistant-first order improved

- 我没有回滚当前 dirty lane 里已经存在的 `workspace drawer before AI` 顺序。
- 这次把 drawer summary 本身做成了 review-first header，而不是只加一行 helper 文案。
- summary 现在直接承载“先 review 再 AI”的含义，并带 `Focus / Updates` badge。

### Settings trust center became more actionable

- `Trust center snapshot and rollback` 现在不仅展示 summary，也提供：
  - `Refresh local proof`
  - `Export current-view receipt`
- advanced policy / rule editors 又被压进了一层更深的 disclosure。

### Web review hierarchy tightened

- `Trust summary` 和 `Ask AI about this workspace` 现在整体前移到 `decision lane` 之前。
- `Load / Import` 和 `Filter / Export` 被下压成 supporting toolbar。
- `Deep review sections` 使用更弱的视觉容器，默认更像 quiet review drawer。

## 3. Tests tied to this lane

- Extension smoke now checks the assistant-first order more directly.
- Extension smoke now also covers one AI happy-path with an explicitly allowed workspace envelope.
- Web smoke now checks:
  - `Trust summary` and `Ask AI about this workspace` must appear before the decision lane
  - `Ask AI about this workspace` must appear before `Load / Import`
  - deep-review sections stay hidden until the user opens them

## 4. Exact remaining blockers

| Type | Blocker | Notes |
| :-- | :-- | :-- |
| `repo-owned blocker` | Extension drawer / AI choreography 仍可继续打磨 | 现在已经自解释很多，但最终节奏感仍需要 designer judgment |
| `repo-owned blocker` | Options page advanced controls 仍然偏长 | 需要后续继续做 disclosure discipline |
| `owner-manual later` | Final visual sign-off | 需要 designer judgment，而不是由 worker 自行宣布完成 |

## 5. Safe next owner

- `l2-designer`：做 visual judgment / anti-slop critique
- `l2-reviewer`：做 blocker-only review
- `Worker G Integrator`：只在需要汇总全仓时再吸收本 handoff

## 6. Follow-up tightening landed after the first handoff

- extension assistant 首屏现在继续压成：
  - `companion hero`
  - `Ask AI about this workspace`
  - `Detailed workspace review`
- export 首屏从多张等权 evidence cards 收成：
  - `main review verdict`
  - `4 visible cards`
  - `detailed packet evidence` drawer
- options 把 provider readiness / fallback 说明下沉进 disclosure，首屏不再先像模型控制台
- web 把 `Auth & Export Management` 收进 supporting drawer，并进一步缩短 loading 空段
- web 又继续压了一轮：
  - `Planning Pulse` 前移到 `Focus Queue / Weekly Load` 后
  - `Merge Health / Course panorama / Merged work items / Administrative snapshots` 下沉进 `Deep review drawer`
- extension ask-ai 又继续压了一轮：
  - 先 `Question`
  - 再 `Answer`
  - supporting `trust snapshot / policy drawer`
  - 最后才是更深的 structured ledger / advanced runtime settings
  - 版式上继续收成 `左列问答 / 右列陪衬说明`，让答案不再掉进右列

## 7. Latest follow-up after fresh screenshot proof

- extension smoke 现在支持可选截图导出：
  - 通过 `EXTENSION_SMOKE_CAPTURE_DIR=<path>` 就能在真实 smoke 场景里直接落盘 sidepanel / options / popup 证据
  - 默认不开时不会改变现有 smoke 语义
- 这轮 fresh screenshot proof 抓到一个真实表面问题：
  - 英文 sidepanel 的 `Merge Health / Course panorama / Merged work items / Administrative snapshots` 一带仍然有中文 copy 泄漏
- 这轮继续把这批 grouped-decision / grouped-operations copy 收回到按 `uiLanguage` 切换的本地 copy map，避免出现 “英文壳子里夹几段中文” 的产品泄漏。
- 最新 repo-local receipts 现在应该以 rebuilt smoke screenshots 为准，而不是更早那版 sidepanel 图。

## 8. Bundle debt follow-up

- `surface-shell` 继续被减重了一刀：
  - 先前约 `604K`
  - 之后压到约 `588K`
  - 再压到约 `577K`
  - 再压到约 `571K`
  - 再压到约 `568K`
  - 这轮继续压到约 `560K`
  - 这轮继续压到约 `561K`
- 当前新增了一个真实的 lazy export chunk：
  - `chunks/surface-shell-export-panel-*.js`
- 当前还新增了两个轻量 shared helpers：
  - `chunks/provider-status-format-*.js`
  - `chunks/ai-site-policy-*.js`
- 当前还新增了一个真实的 lazy Ask-AI container chunk：
  - `chunks/surface-shell-ask-ai-container-*.js`
- Ask-AI 现在不只是有独立 chunk，而是真的把运行时状态和请求闭环搬了进去：
  - provider / model / question / answer / pending / advanced-material opt-in 这些 state 已经不再由 `surface-shell.tsx` 直接持有
  - `surface-shell.tsx` 现在只继续提供 config、provider readiness、filters、today snapshot 与 workbench composition inputs
- 这轮的方法不是继续赌 bundler 魔法，而是把 export mode 整块从主壳里剥成 lazy panel，让首屏不再静态背整块 export review JSX 和 packet 审核逻辑。
- 第一版 lazy export panel 之后，parent 里还残留了一整块旧 export review 计算；这轮又把那段旧逻辑从 `surface-shell.tsx` 清掉，真正让 parent 停止背着这套旧家具。
- 同时又继续把 shared helper 从主壳里拆走：
  - provider status formatting 单独下沉成 `provider-status-format.ts`
  - diagnostics summary 与 diagnostics report 分层
  - AI site policy overlay 改成本地轻量 helper
  - `resolveAiAnswer` 也改走 extension-local 轻量解析 helper，而不是让主壳继续动态碰整包 `@campus-copilot/ai`
- 这轮又继续把 `Ask AI` 运行时从主壳里搬走：
  - 主壳不再直接持有 ask-ai 的 provider/model/question/answer/pending/advanced-material state
  - 这些状态和请求闭环现在进入 `surface-shell-ask-ai-container.tsx`
  - parent 只继续传入当前 workbench slice、provider readiness、以及 config save callback
- 同时还修了一条真实 export race：
  - 当 review card 还没稳定时，`Export selection` 仍然能走 on-demand artifact 生成，不再因为 preview 迟到就把下载链路打空。
- export smoke 也跟着对齐到了新的 panel 结构：
  - 现在用 card-scoped assertions，而不是在整块 review panel 里做脆弱的全文本查找
  - 这轮 fresh `extension.smoke.spec.ts` 已重新回到绿态
- ask-ai / export 双拆分之后，extension smoke 现在仍然重新回到全绿，说明这次 parent 清场不是“看起来更轻，实际上把交互弄坏了”。
- 继续清掉 Ask-AI parent runtime 之后，extension smoke 仍然重新回到全绿，说明这次主壳减重不是靠牺牲交互稳定性换来的。
- 但 bundle debt 仍然 **没有清零**：
  - `surface-shell` 依然大于 `500K`
  - `background.js` 仍然约 `372K`
  - `@campus-copilot/ai` 的主壳耦合已经进一步下降，但 ask-ai / red-zone guardrails / policy overlay 仍然不是完全零耦合
  - diagnostics 主报告链已拆轻，但 background / storage / workbench substrate 仍然是主壳的大头
- 这轮也补上了一条明确的 negative evidence：
  - 当前 WXT background build 走 `inlineDynamicImports`
  - 所以 `manualChunks` 在这条线上是 **不成立** 的，不能再把它当后续主路线
