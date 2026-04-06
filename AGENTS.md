# Campus Copilot Repo Agent Notes

这份文件是 **repo-local 工作边界**，用来补充全局 agent 规范。  
它不重写根规则，只回答这个仓库里最容易写偏的地方。

## 先接受的事实

- 这不是“先做聊天框”的项目。
- 这是一个 **本地优先的学习信息整理工作台**。
- 正确顺序始终是：
  - 先 `schema`
  - 先 `adapter`
  - 先真实数据链路
  - 先工作台与导出
  - 最后才是 AI

## 当前正式主线

- 支持站点：`Canvas / Gradescope / EdStem / MyUW`
- extension 主链已接通四站最小同步
- AI 已进入最小问答闭环，但仍然只走：
  - `OpenAI api_key`
  - `Gemini api_key`
- `Gemini OAuth / Anthropic / web_session / 多 provider 自动路由` 仍然不是正式主路径

## 绝对不要写偏的地方

- 不要让 AI 直接读取网页、DOM、cookie 或 raw adapter payload
- 不要把 exporter 直接绑到站点原始响应
- 不要把 private/internal request 路径包装成“已经官方稳定”
- 不要引入自动提交、自动发帖、自动写操作
- 不要扩大权限到 `cookies`

## 当前事实层和展示层

- `Dexie` 是 canonical local entities
- `storage read-model` 是工作台真相源
- `TanStack Query` 不是本仓库主真相源
- sidepanel/popup/options 都应该消费统一 schema + read model

## 当前推荐门禁

任何声称“本地已完成”的改动，至少要附带这些新鲜结果：

```bash
pnpm typecheck
pnpm test
pnpm --filter @campus-copilot/extension build
pnpm --filter @campus-copilot/extension exec playwright test
```

如果碰到 BFF 或 API 入口，再补：

```bash
pnpm --filter @campus-copilot/api test
bash scripts/api-healthcheck.sh
```

## 当前 live / profile / auth 纪律

- 做真实 campus-site live/browser/session 推进时，当前 repo 的 canonical Chrome 根目录不再是默认系统根，而是：
  - `~/.cache/campus-copilot/browser/chrome-user-data/`
- 当前 repo 的 canonical profile directory 是：
  - `Profile 1`
- 当前 repo 的 canonical 显示名是：
  - `campus-copilot`
- 旧世界里默认 Chrome 根目录下的 `Profile 13` 只再承担一件事：
  - **一次性迁移源**
- 默认系统 Chrome 根目录：
  - `$HOME/Library/Application Support/Google/Chrome`
  不再是当前 repo 的运行真相面。
- live/browser 脚本不允许再偷偷回退到默认系统根目录；缺少 repo-owned browser root 或 repo-owned instance 时，应直接报：
  - `browser_root_not_bootstrapped`
  - `browser_attach_missing_repo_instance`
- `probe:live` / `diagnose:live` / `support:bundle` 只允许读取 **repo-owned Chrome lane** 的 CDP / DevTools target 控制面。
- 严禁再用 `AppleScript` / `JXA` / `System Events` / GUI 坐标点击去读取或推动任意桌面 Chrome 窗口、标签页或系统前台会话。
- 如果当前缺少 repo-owned 控制面，必须直接 fail fast；不要再回退到“扫桌面上现有 Chrome 标签”的 global fallback。
- 当前 live runtime 的正式登录态口径必须是确定性的：
  - `authenticated: true | false`
  - `authBoundary: authenticated | session_resumable | mfa_required | logged_out | not_open | profile_mismatch | attach_failed`
- 不要再把 `likely_authenticated` / `public_or_unknown` 当成当前 operator-facing 真相面。
- `browser:launch` 现在还要维护当前 canonical lane 的人眼身份锚点：
  - `.runtime-cache/browser-identity/index.html`
  - title / favicon / accent 应明显可识别
  - 可以提示用户手工 pin 一次
  - 但不要去写 Chrome 私有 avatar/theme/pinned-tab 偏好
- 对 `Canvas / Gradescope / EdStem / MyUW` 的默认工作假设必须是：
  - 如果用了正确的 repo-owned `Profile 1`（显示名 `campus-copilot`），要么已有登录态；
  - 要么密码管理器已经能自动填充；
- agent 应先继续推动登录 / SSO / 会话续接，而不是一看到 `session_resumable` 或 `mfa_required` 就停。
- 只有在正确 profile 下确认：
  - 没有现成登录态；
  - 没有密码自动填充；
  - 且继续操作后仍无法前进；
  才允许把它归类成真实 external / human-only 边界。
- 如果四站确实需要账号密码，最后兜底只允许使用本地 `.env` 中的 `ACCOUNT_ID` / `PASSWORD` 这两个变量；只允许读取变量名和使用它们完成登录，**严禁**在日志、回复、截图标注或文档里扩散具体值。
- `Gradescope` 的默认登录推进假设要写死：
  - 先点 `Log In`
  - 或直接走 `https://www.gradescope.com/auth/saml/uw`
  - 优先复用 `Canvas` / `MyUW` 已存在的 UW SSO 会话
  - 若 `MyUW` / `Canvas` 已在同一 profile 中完成认证，则应优先沿学校 SSO 链继续，不要把它过早报成 blocker。

## 当前 browser / runtime 资源卫生纪律

- 做 live/browser/session 前，先区分：
  - 当前 repo 自己拉起的 listener / browser / clone
  - 其他 repo 正在用的 listener / browser / clone
  - 用户自己真实在用的浏览器会话
- 如果当前机器上已经有 **6 个或更多 Chrome / Chromium automation 实例**：
  - 不准再为当前 repo 新开浏览器实例
  - 先继续盘点归属
  - 先回收当前 repo 自己遗留的 listener / clone / tab
  - 优先复用当前 repo 自己已经 attachable 的 lane，或退回 read-only inspection / repo 自带 probe
- 动浏览器前，先确认当前端口和 listener 归属：
  - 先看 `lsof -nP -iTCP:<port> -sTCP:LISTEN`
  - 再看 `ps -axo pid=,command=` 里的 `--remote-debugging-port`、`user-data-dir`、`profile-directory`
- 不要把别的 repo 的 `CHROME_CDP_URL` / `user-data-dir` / clone profile 混成当前 repo 的 truth surface。
- 不要因为“端口能连上”就默认它属于当前 repo；先确认 `user-data-dir` 和 `profile-directory`。
- 如果某个 debug port 已被别的 repo 的 Chrome / Chromium / Playwright 占用：
  - 不要接管
  - 不要杀掉对方进程
  - 给当前 repo 换专用端口，再继续
- 当前 repo 的浏览器控制面现在默认是：
  - **独立根目录**
  - **单实例**
  - **CDP attach**
- 如果当前需要新拉起 canonical Chrome lane：
  - 现在必须显式走 operator-manual 模式
  - 必须同时设置：
    - `CAMPUS_COPILOT_BROWSER_LAUNCH_MODE=operator-manual`
    - `CAMPUS_COPILOT_BROWSER_LAUNCH_REASON=<auditable reason>`
  - 没有这两个变量时，`scripts/browser-launch.mjs` 必须直接 fail closed，而不是默认 detached second-launch
- 具体 canonical root：
  - `~/.cache/campus-copilot/browser/chrome-user-data/`
- 具体 canonical attach 端口：
  - `127.0.0.1:9334`
- 我们默认只允许一个 repo-owned headed Chrome 实例；以后你和自动化都 attach 到这同一实例，不再 second-launch 同一根目录。
- clone lane 默认禁用；`~/.campus-copilot-profile13-clone` 与 `.chrome-debug-profile` 只作为 **legacy migration candidate** 盘点，不再属于当前 repo 的正式默认 lane。
- 当前 repo 自己可控的 runtime 产物统一放进 `.runtime-cache/`，例如 temp、browser evidence、live traces、support bundle、coverage。
- 当前 repo 若需要 repo-exclusive external cache，统一放在：
  - `${XDG_CACHE_HOME:-$HOME/.cache}/campus-copilot`
  - 默认 TTL = `168h`
  - 默认总容量上限 = `2048 MiB`
  - generic cache 走 `${cacheHome}/cache`
  - browser state 走 `${cacheHome}/browser/chrome-user-data`
  - 共享工具缓存不属于这里，也不由当前 repo 自动清理
- 对 live/login 的默认 stop-rule 也要写死：
  - strongest lane fresh check + current page continuation + visible sign-in / school SSO + `.env` fallback
  - 最多只做 **1 到 2 次有意义推进**
  - 如果已经推进到 `Duo / 2FA`、`CAPTCHA / challenge`、`tenant/account wall`，就记成 owner-only / external blocker
  - 不要因为“不甘心”就无限 relaunch / 无限 clone profile / 无限开新 tab
- repo 运行中的临时文件应放在 repo 自己的 `.runtime-cache/temp`，不要再把活文件写进会被 `cleanup:runtime` 横扫的通用 temp roots。
- `cleanup:runtime` 只清 repo-named temp residues、`.runtime-cache/` 下已声明的 runtime/debug artifacts、以及 `~/.cache/campus-copilot/cache` 下受 TTL/容量上限约束的 repo-exclusive external cache。
- `cleanup:runtime` **绝不碰** `~/.cache/campus-copilot/browser/chrome-user-data` 这条永久态 browser root。
- `cleanup:runtime` **不清** `apps/extension/.output`、`apps/extension/.wxt`、`apps/extension/test-results`、共享工具缓存、别的 repo 的 browser/runtime 资源。
- 如果当前 repo 本轮启动了 listener / clone / temp artifacts，结束前必须做 hygiene ledger：
  - 找到了什么
  - 清掉了什么
  - 故意保留了什么
  - 为什么保留
- 当前 repo 为诊断新开的登录页 / 中间页 / 试探页 tab，结束前要尽量回收；不要把成排探测 tab 留在浏览器里。
- 若当前 repo 本轮没有实际拉起 Docker / container 资源，就不要为了“全面 cleanup”去动系统级 Docker 状态。
- 当前 repo 的 deterministic CI 默认继续走 GitHub-hosted runner；不要把本地真实 Chrome profile、self-hosted runner、或本地 runner 假设混进默认 CI。
- 当前 repo 的 repo-owned browser root 虽然位于 `~/.cache/campus-copilot/` 下，但它属于 **browser state**，不是 generic external cache；不要让 TTL/cap GC 误删它。
- 外部站点上仍然只允许：
  - 登录推进
  - SSO continuation
  - read-only 页面/会话诊断
  - read-only sync / ingestion
- 严禁任何站外写动作：
  - 发帖
  - 回复
  - 提交外部表单
  - 修改第三方账户内容

## 当前 AI / provider 优先级

- 当前主战场仍然是 campus-site ingestion / read-model / student-facing workbench，不要让 `OpenAI Web` / `Gemini Web` 登录问题抢走主线。
- 当前 repo 的正式 AI 路径仍然是 API-key based provider path；就当前阶段而言，优先继续使用 `.env` 中已经配置好的 `GEMINI_API_KEY`。
- `Switchyard` 是后续可接入的本地 provider runtime 方向；在它完工并明确接入前，不要把 `OpenAI Web` / `Gemini Web` 网页登录当成当前 Campus Copilot 主线 blocker。

## 外部账户写安全纪律

- 当前仓库的外部站点动作默认只允许：
  - 登录推进
  - SSO continuation
  - read-only probe / diagnose / page inspection
  - read-only sync / local ingestion
- 严禁：
  - 发帖
  - 回复
  - 发布
  - 提交作业
  - 修改外部账户设置
  - 任何超出登录续接范围的第三方写操作

## 当前 GitHub 收尾纪律

- 当前仓库的 GitHub closeout 默认作者身份仍应优先使用 `xiaojiou176`。
- `leilei999lei-lab` 仍然适合做 reviewer / approve 侧身份，但不要把它当成默认 PR 作者。
- 当前已观察到一条真实 GitHub 风险：
  - 当 `gh` 当前有效身份落到 `leilei999lei-lab` 时，这个仓库上的 `gh workflow run ...` 可能返回：
    - `HTTP 422: Actions has been disabled for this user`
  - 在这种状态下，新的 PR 可能进入：
    - branch protection 仍要求 `Verify` / `CodeQL`
    - 但 PR 自己没有挂上任何 checks
    - 最终 `gh pr merge` 被 base branch policy 挡住
- 所以以后如果遇到：
  - PR open 了
  - 但 `gh run list --branch <branch>` 为空
  - `gh pr checks <number>` 也为空
  - 且 `gh auth status` 显示当前有效账号不是 `xiaojiou176`
  就优先把它判断成 **GitHub identity / Actions gate**，不要先怀疑 repo-local workflow path filters。
- 只有在作者身份回到可正常触发 Actions 的主账号后，才继续期待：
  - `Verify`
  - `CodeQL`
  这两个 required checks 自动出现并放行 merge。

## 永久 Worker 口径清单

下面这些不是“本轮建议”，而是以后任何 Worker 进入本仓库都应该默认继承的固定口径。

### 1. 先把产品讲对，再谈别的

- `Campus Copilot` 的正式身份始终是：**local-first academic decision workspace**。
- 不要把它讲成 generic chatbot、空聊天框、广义 agent shell、hosted autonomy platform。
- 正式主链始终是：
  - `Canvas / Gradescope / EdStem / MyUW`
  - `adapters`
  - `schema`
  - `Dexie / storage read-model`
  - `Focus Queue / Weekly Load / Change Journal / derived alerts`
  - `sidepanel / popup / options`
  - `export`
  - `cited AI explanation`
  - `thin BFF for OpenAI / Gemini API-key`

### 2. 四本账永远分开讲

- 任何“完成度”判断都必须拆成：
  - `repo-side engineering truth`
  - `product-surface truth`
  - `live/browser/session truth`
  - `git / PR / branch / worktree closure truth`
- 不要把 `repo-side complete` 说成 `overall complete`。
- 不要把 `pnpm verify` 绿说成 live/session 已经绿。

### 3. docs 和 fresh evidence 的职责不同

- docs 是正式合同，定义当前正式产品方向。
- conversations 是历史要求与执行上下文，不是 live 真相本身。
- live/browser/session 结论具有时间敏感性，必须 fresh re-check，不能直接复述旧 archive。

### 4. live/browser/session 的默认姿势

- 不要一看到 `session_resumable` 或 `mfa_required` 就停。
- 默认先继续：
  - browser takeover
  - DOM inspection
  - session continuation
  - SSO progression
- 这里的 “browser takeover / DOM inspection” 只允许发生在 **repo-owned CDP / page / target 控制面** 上。
- 如果没有同页 DOM / page / CDP 控制面，就停在 read-only inspection 或 honest blocker；**严禁**退回 `AppleScript` / `JXA` / `System Events` / GUI 乱点。
- 只有在已经确认：
  - 用对了 profile
  - 尝试继续推进登录
  - 仍然无法前进
  才允许把它归类成真实 external / human-only boundary。

### 5. 正确 profile 规则是硬约束

- 做真实 campus-site live/browser/session 推进时，**唯一应优先使用的 profile directory 是 repo-owned browser root 里的 `Profile 1`**。
- `campus-copilot` 是这个 repo-owned profile 的显示名。
- 旧世界里默认系统 Chrome 根目录下的 `Profile 13` 只是迁移源，不再是当前运行主路径。
- 不要把默认 `.chrome-debug-profile` 当成真实学生会话真相源；它只是 legacy 调试残留。
- 做真实站点登录推进时，必须显式对准：
  - `CHROME_USER_DATA_DIR="$HOME/.cache/campus-copilot/browser/chrome-user-data"`
  - `CHROME_PROFILE_NAME="Profile 1"`
- live/browser 诊断脚本缺少 browser root、或 repo-owned 单实例未启动时，应直接 fail fast，而不是隐式兜底。
- 不要把任意桌面 Chrome 窗口、AppleScript 读到的现有标签页、或 GUI 前台状态，当成当前 repo 的 live 真相面。

### 6. 四站登录推进规则

- 对 `Canvas / Gradescope / EdStem / MyUW` 的默认工作假设必须是：
  - 如果用了正确的 repo-owned `Profile 1`（显示名 `campus-copilot`），要么已有登录态；
  - 要么密码管理器已经能自动填充；
  - agent 应先继续推动登录 / SSO / 会话续接，而不是把登录页本身当终点。
- `Gradescope` 的默认推进顺序要写死：
  - 点击 `Log In`
  - 或直接打开 `https://www.gradescope.com/auth/saml/uw`
  - 优先沿 `Canvas / MyUW` 已有的学校 SSO 链继续
  - 不要把它当成一个需要单独手输密码的普通站点
- 如果四站确实需要账号密码，最后兜底只允许使用本地 `.env` 中的：
  - `ACCOUNT_ID`
  - `PASSWORD`
- 只允许读取变量名并用它们完成登录，**严禁**在日志、输出、截图、文档、support bundle 中扩散具体值。

### 6.5 runtime cache 与 external cache 纪律

- repo 内部自研 runtime 产物统一放进 `.runtime-cache/`，不要再维护多套 repo-owned runtime 根。
- repo-exclusive external cache 统一放进 `~/.cache/campus-copilot/`，并且默认受 TTL / 容量上限治理。
- repo-owned browser root 固定放进：
  - `~/.cache/campus-copilot/browser/chrome-user-data/`
- 这个 browser root 是 **repo-owned browser state**，不是 generic external cache，不参与普通 TTL/cap GC。
- 默认治理值：
  - external cache TTL = `168h`
  - external cache cap = `2048 MiB`
  - `.runtime-cache/temp` TTL = `72h`
  - `.runtime-cache/browser-evidence` 与 `.runtime-cache/live-traces` TTL = `168h`
  - support bundle 至少保留最近 `3` 份
- `~/.campus-copilot-profile13-clone` 与 `.chrome-debug-profile` 是 legacy browser roots，不再算正式缓存根；只做盘点与迁移候选，不做当前主路径。
- 旧世界里系统默认 Chrome 根目录下的 `Profile 13` 现在也只算迁移源，不再算当前 repo 的运行 SSOT。
- `~/Library/Caches/ms-playwright`、`~/Library/Caches/pnpm`、`~/Library/pnpm`、`~/.npm` 等共享工具缓存继续视为 shared layer，不由当前 repo 自动清理。

### 6.6 CI / runner 纪律

- 当前 repo 的默认 required CI 继续走 GitHub-hosted。
- 不要为当前 repo 搭本地 runner，也不要把 self-hosted / shared-pool 混进默认 public gate。
- deterministic Playwright smoke 继续使用仓库自己的 headless Chromium lane；真实 Chrome profile 只服务 live/browser/manual diagnostics。

### 7. AI / provider 优先级不要再漂

- 当前主战场仍然是 campus-site ingestion / read-model / student-facing workbench。
- `OpenAI Web` / `Gemini Web` 登录问题，不应抢走当前主线。
- 当前正式 AI 路径仍然是 API-key based provider path；就当前阶段而言，优先继续使用 `.env` 中已经配置好的 `GEMINI_API_KEY`。
- `Switchyard` 是后续可接入的本地 provider runtime 方向；在它完工并明确接入前，不要把 `OpenAI Web` / `Gemini Web` 网页登录当成当前 Campus Copilot 主线 blocker。

### 8. private API / MCP / SDK 的位置

- `Canvas / Gradescope / EdStem / MyUW` 的站点能力深挖，当前首先是为了服务正式产品主线。
- `private API` / `session-backed client` / `future MCP` / `future SDK` 是重要副产物方向，但默认不是当前收尾主战场。
- 除非某个 deeper API / fallback 工作能直接提高：
  - `Focus Queue`
  - `Weekly Load`
  - `Change Journal`
  - `export`
  - `cited AI`
  否则不要让它抢主线。

### 9. archive 阅读和 prompt 续推纪律

- 处理 `campus-copilot` 这类 archive archaeology：
  - docs 需要完整读完；
  - conversations 至少要精读最新与关键转折线程；
  - 不能只摘最后一条 assistant 结论；
  - 用户积压要求要算进账本。
- 当用户说“都想落地”“继续做完”“步子迈大点”时，默认要把分析转成：
  - 明确顺序
  - phase boundary
  - execution-ready prompt
- 不要把“prompt 写好了”误说成“rollout 已执行”。

## Repo-local Skills

当任务命中下面这些场景时，先读对应 skill，再动手：

- `.agents/skills/correct-profile-live-closure/SKILL.md`
  - 适用：`Canvas / Gradescope / EdStem / MyUW` 的 live/browser/session 推进
- `.agents/skills/browser-context-boundaries/SKILL.md`
  - 适用：区分“自持浏览器 DOM 自动化”和“用户当前真实会话”，避免 GUI 越界
- `.agents/skills/live-profile-drift-audit/SKILL.md`
  - 适用：`.chrome-debug-profile`、`Profile 13`、support summary、tests、runbook 的 drift 审计
- `.agents/skills/runtime-resource-hygiene/SKILL.md`
  - 适用：browser/profile/tab hygiene、cross-repo listener collision、clone lifecycle、runtime cleanup ownership
- `.agents/skills/resource-hygiene-and-browser-lane-discipline/SKILL.md`
  - 适用：`.runtime-cache/`、`~/.cache/campus-copilot/`、legacy browser roots、真实 Chrome profile 契约、GitHub-hosted CI 边界的统一治理
- `.agents/skills/live-runtime-diagnostics-ladder/SKILL.md`
  - 适用：`cleanup:runtime / preflight:live / probe:live / diagnose:live / smoke:* / support:bundle` 这条 live 诊断梯子，以及环境型 blocked 的分账
- `.agents/skills/live-stop-rule-gate/SKILL.md`
  - 适用：给 live 线下 `KEEP_GOING_REPO_LOCAL / REPO_LOCAL_DONE_EXTERNAL_REMAINING / LIVE_READY_BUT_OPTIONAL_PROVIDER_WEB_PENDING / NOT_READY_TO_CLAIM` 做最终裁决
- `.agents/skills/selective-gap-proof-capture/SKILL.md`
  - 适用：`EdStem reply/resources`、`Gradescope rubric/question detail` 这类 `external-proof-first` selective gap 的最小 live proof / redacted fixture 取证

## 阅读顺序

开始改之前，优先读：

1. `docs/01-product-prd.md`
2. `docs/02-system-architecture.md`
3. `docs/03-domain-schema.md`
4. `docs/04-adapter-spec.md`
5. `docs/08-phase-plan-and-repo-writing-brief.md`
6. `docs/09-implementation-decisions.md`
