# Worker E Visual Evidence Appendix

日期: 2026-04-13 America/Los_Angeles
状态: `repo-local UI evidence / no live listing claim`

## 1. Stage understanding

- Extension 当前方向已经不是 generic AI shell 了，主壳、trust strip、settings summary、web deep-review disclosure 都在往正确方向走。
- 最厚的尾巴不在“颜色不好看”，而在首屏顺序还不够像成品学生工作台。
- 这次继续推进的目标是：先让用户在第一屏看懂 `现在在哪 / AI 是否能读 / 下一步点哪`，再展开详细 workspace 和 deep review。

## 2. Visual deltas landed this turn

### Extension sidepanel

- `detailed workspace` 抽屉现在不只是排在 `Ask AI` 前面，而且 summary 本身已经改成了 review-first header。
- 它会直接告诉用户先看哪些事实，再决定是否需要 AI 解释；同时带 `Focus / Updates` badge，不再只靠一行 helper 文案撑住顺序。
- 第一屏现在读起来更接近：
  - companion hero
  - trust strip
  - detailed workspace drawer
  - AI question + policy overlay
- 这不是最终 bar，但它已经不只是“嘴上说先 review”，而是版式本身就在这么讲。

### Settings / auth center

- trust receipts 区提升为真正的 summary-first trust snapshot。
- 新增两个近手动作：
  - `Refresh local proof`
  - `Export current-view receipt`
- `site policy overlays`、`high-sensitivity families`、`detailed authorization controls`、`course-level AI confirmations` 现在又被压进了更深一层 disclosure。
- 这让 settings 更像 trust desk，而不是纯规则编辑墙。

### Web workbench

- `Trust summary` 和 `Ask AI` 现在真的整体移动到了 `decision lane` 之前，不再只是同一屏里的局部小调整。
- `Load / Import` 与 `Filter / Export` 继续被压在 `decision lane` 之后，变成 supporting toolbar。
- `Deep review sections` 现在使用了更弱的视觉容器，降权得更像“安静的 review drawer”，不再像第三个大面板。

## 3. Exact blockers still visible

| Blocker | Exact status | Why it still matters |
| :-- | :-- | :-- |
| Extension drawer 与 AI 的关系仍然有继续打磨空间 | `repo-owned blocker` | 现在顺序和 summary 都更自解释了，但距离最终的 polished sidepanel choreography 还差 designer judgment |
| Options 仍然保留大量 advanced rule editors | `repo-owned blocker` | summary-first 已明显改善，但完整 trust center 仍然有“下面一大墙细则”的尾巴 |
| Web first fold 仍然是多块并列桌面 | `repo-owned blocker` | trust + AI + toolbar hierarchy 更清楚了，但离“finished student product bar”还有最后一轮 designer/reviewer judgment |

## 3.5 Latest smoke-backed screenshot receipts

这轮又补上了 fresh extension screenshot proof，而且不是手工截图，而是从 extension smoke harness 里直接产出：

- `.runtime-cache/visual-proof/extension-smoke/extension-sidepanel-overview.png`
- `.runtime-cache/visual-proof/extension-smoke/extension-sidepanel-ai-answer.png`
- `.runtime-cache/visual-proof/extension-smoke/extension-options-trust-center.png`
- `.runtime-cache/visual-proof/extension-smoke/extension-popup-launcher.png`

这批截图带来两个高价值结论：

- `extension` 的主叙事现在已经更稳了：question / answer / trust-support 的层级比之前更像成品，而不是一排并列控制块。
- fresh screenshot 也抓出一个真实表面问题：英文 sidepanel 里仍然泄漏了几段中文 copy（`Merge Health / Course panorama / Administrative snapshots` 一带）。这轮已经继续把它修掉，并确认 typecheck + rebuilt smoke 仍然通过。

同时，这轮也把 screenshot capture 能力正式接回了 `apps/extension/tests/extension.smoke.spec.ts`：

- 默认不影响 smoke
- 只有设置 `EXTENSION_SMOKE_CAPTURE_DIR` 时才会落盘截图
- 这样后续 UI 收尾就不需要再靠“肉眼记得上次看起来差不多”

## 4. What this appendix is not claiming

- 这不是 marketplace/store-ready visual sign-off。
- 这不是 final a11y/perf/designer closeout。
- 这不是 live/public-plane 证明。

## 5. Follow-up visual tightening

- extension:
  - 顶栏的连接/授权从并列 badge 收成 quiet context
  - `Ask AI` 前移到 detailed workspace drawer 之前
  - trust chip 保留，但回到 companion hero 下方而不是自己独立抢一排
  - ask-ai 内部也继续收口成 `question -> answer -> supporting trust/policy`
  - 当前更像 `左边对话主线，右边护栏和说明`，不再是多块同级信息一起喊话
- export:
  - `depth / risk / match` 不再和主 review verdict 同权平铺
  - 现在主面先看 `authorization / packet honesty / AI visibility / provenance`
- settings:
  - provider readiness 从首屏平铺卡片变成 disclosure
- web:
  - `Auth & Export Management` 收进 supporting drawer
  - loading 空段显著缩短，首屏更像“先做判断，再决定要不要展开更多解释”
  - `Planning Pulse` 进入第一屏 decision lane
  - grouped merge / admin summary 退回 deep review drawer，不再和主决策卡一起站前排

## 6. What remains after the latest screenshot pass

- options 的 trust center 首屏现在已经明显 calmer，但完整展开后仍然很长；这更像“高级设置天然信息量大”，不再像第一屏直接压脸。
- export defaults 现在已经不会抢首屏，但若后续继续追求更极致的 disclosure discipline，它仍然可以继续降级成 supporting disclosure。
- extension 当前最需要的已不再是“大改布局”，而是：
  - designer-only judgment
  - disclosure discipline 的最后一轮收口
  - repo-wide non-UI blockers 回到主线
