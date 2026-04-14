# Campus Copilot Extension / Web IA & UI Design Spec

日期：2026-04-10  
状态：`implementation-ready / design-handoff`  
适用范围：`apps/extension`、`apps/web`  
不在本规格内：生产代码实现、API/Schema 改动、写能力扩张、host permission 扩张

---

## 1. North Star

Campus Copilot 的首屏必须先让学生感到：

> 这是一块可信、只读、懂校园工作流的学习桌面边栏，而不是一个要我先配置半天的聊天框，也不是一张塞满卡片的小工作台。

### 1.1 产品定位

- 正式定位：`academic decision workspace with local storage + AI browser companion`
- 体验顺序：`结构化事实 -> 决策摘要 -> 导出 -> cited AI explanation`
- 绝不漂移成：generic chatbot、站外写操作代理、深埋工程设置的开发者工具

### 1.2 双 surface 分工

| Surface | 角色 | 适合做什么 | 不适合做什么 |
| :-- | :-- | :-- | :-- |
| `Extension sidepanel` | 默认随身 companion | 当前站点上下文、快速提问、快速进入导出/配置、最小信任状态 | 长滚动工作台、深层配置表单、完整站点账本 |
| `Extension popup` | quick pulse / launcher | 一眼看状态、快速导出、打开 sidepanel 深入 | 多步 flow、授权编辑、长解释 |
| `Extension options` | configuration + authorization center | 连接、语言、provider、资源族授权、advanced material opt-in | 决策工作台、默认 AI 入口 |
| `Web` | full workbench / review surface | 完整 decision workspace、导入快照、批量查看、长内容阅读、导出核对 | live sync 主入口、默认 browser companion |

### 1.3 设计主张

- `Assistant-first in extension`：extension 默认打开先是轻量 companion，不是 workbench 缩略版。
- `Workbench-first in web`：web 继续承担完整桌面，成为长阅读、长列表、批量核对的地方。
- `Trust before cleverness`：只读、manual-only red zone、truthful wording 永远先于“更聪明”。
- `No-scroll first view`：默认模式第一屏必须在不滚动的情况下回答“现在在哪、能做什么、下一步点哪”。

### 1.4 顶层结构图

```text
Campus Copilot
├─ Extension
│  ├─ Sidepanel
│  │  ├─ Default Assistant Mode
│  │  ├─ Site Export Mode
│  │  └─ Configuration & Authorization Mode (light)
│  ├─ Popup
│  │  ├─ Quick Pulse
│  │  ├─ Quick Export
│  │  └─ Open Sidepanel / Open Full Config
│  └─ Options
│     └─ Full Settings/Auth Center
└─ Web
   ├─ Full Workbench
   ├─ Support / Trust Rail
   └─ AI Explanation Lane
```

---

## 2. Mode IA

本轮冻结三模式，不再接受“同一工作台内容塞进三种壳子”的旧心智。

### 2.1 统一入口规则

所有 extension surface 共用同一套主模式：

```ts
type ExtensionPrimaryMode = 'assistant' | 'export' | 'configuration';
```

### 2.2 入口位置

#### A. Sidepanel 顶栏

- 左侧：品牌识别 + 当前站点 pill
- 中间：三段式 mode switcher
  - `Assistant`
  - `Export`
  - `Settings`
- 右侧：语言切换 globe button、connection/auth status pill

#### B. Popup

- 不展示三段式完整切换器
- 只保留：
  - `Open Assistant`
  - `Quick Export`
  - `Settings/Auth`

#### C. Options

- 默认落在 `Configuration & Authorization`
- 顶部仍显示轻量 mode breadcrumb：
  - `Extension Assistant`
  - `Export Mode`
  - `Settings/Auth Center`
- 作用是帮助用户建立心智，不是把 options 变回工作台

### 2.3 模式切换规则

| 当前模式 | 可见主 CTA | 次 CTA | 切换后保留什么 |
| :-- | :-- | :-- | :-- |
| `assistant` | Ask AI / Open Export | Open Settings | 记住当前站点、当前课程候选、语言选择 |
| `export` | Continue export step | Back to Assistant / Open Settings | 保留站点、课程、资源族、格式草稿 |
| `configuration` | Save / Enable / Revoke | Back to Assistant / Open Export | 保留最近 tab、最近语言、最近 connection 检查结果 |

### 2.4 Default Assistant Mode

#### 首屏目标

第一屏必须回答四个问题：

1. 我现在在哪个站点上下文里？
2. Campus Copilot 当前能看到哪些结构化事实？
3. AI/BFF/runtime 现在是否 ready？
4. 我要继续聊天、导出，还是先修配置？

#### 版面结构

```text
[Top bar: brand | site context | mode switcher | language | status]
[Companion card]
  ├─ current site / course context
  ├─ what AI can see summary
  ├─ runtime readiness pill
  └─ primary CTAs: Ask / Export / Settings
[Question composer]
[Trust strip]
  ├─ read-only
  ├─ manual-only red-zone
  └─ last successful local receipt
[Collapsed supporting drawers]
  ├─ advanced material opt-in
  └─ runtime details
```

#### 规则

- 默认不出现完整 `WorkbenchPanels`
- 默认不出现长 diagnostics rail
- 默认不出现 provider/model/BFF 手填大表单
- 默认不出现完整 Focus Queue / Weekly Load / Change Journal 列表

#### 首屏 microcopy

- 主标题：
  - `English`: `Your campus companion for this page`
  - `中文`: `这页的校园伴随助手`
- 上下文副文案：
  - `English`: `Read-only, grounded in local workspace facts, and based only on what this site already imported or visibly shows.`
  - `中文`: `只读、基于本地工作区事实，只沿用这个站点已经导入或当前可见的结构化信息继续。`
- trust strip：
  - `English`: `Manual-only red zones stay outside this product.`
  - `中文`: `涉及注册/通知等红区动作时，本产品只说明，不替你操作。`

### 2.5 Site Export Mode

#### 首屏目标

让导出从“preset 名词墙”变成“范围 -> 资源 -> 格式 -> 审核”的可理解流程。

#### 版面结构

```text
[Top bar + mode switcher]
[Export stepper]
  1. Scope
  2. Resource family
  3. Format
  4. Review & export
[Current step card]
[Sticky footer CTA]
```

#### 规则

- 不直接展示全部 preset 按钮
- 优先显示“当前站点/当前课程”建议路径
- 对 partial / blocked 资源族必须显示 truthful badge，不准伪装成 ready

### 2.6 Configuration & Authorization Mode

#### 首屏目标

把“语言、连接、provider、授权”从底部长滚动面，改成近手、可解释、可撤回的控制中心。

#### 版面结构

```text
[Top bar + mode switcher]
[Connection summary card]
[Language + runtime quick settings]
[Authorization center]
[Advanced material analysis]
[Boundary disclosure]
```

#### 规则

- 近手入口要在 sidepanel 顶栏和 assistant 首屏都能到
- options page 承担完整编辑
- sidepanel configuration mode 只承担轻量查看/切换/跳转，不承担超长详细编辑

### 2.7 Extension vs Web 的角色分工

| 能力 | Extension | Web |
| :-- | :-- | :-- |
| 当前页面上下文 companion | 主承担 | 次承担 |
| 长列表 decision workspace | 次承担，只给摘要/跳转 | 主承担 |
| 多步导出 flow | 主承担 | 可镜像承接 review/export |
| 配置/授权完整编辑 | 轻量查看 + 跳转 | 可显示摘要，但主编辑在 options |
| AI explanation | 主承担快速问答 | 主承担长回答与工作台并排阅读 |
| diagnostics receipts | 摘要展示 | 完整 support rail |

### 2.8 桌面 / 移动差异

当前产品主要是桌面 Chrome extension + 桌面 web，但仍需给 responsive 规则：

| Surface | Desktop | Narrow width / small height |
| :-- | :-- | :-- |
| Sidepanel | 三段式 mode switcher + 单行 trust strip | switcher 可压缩为 segmented pills；trust strip 收成两枚 badge + 一行摘要 |
| Popup | 两层卡片 + 3 个主 CTA | 只保留一张 pulse 卡 + 2 个 CTA，隐藏次级导出项到 `More exports` |
| Options | 双栏分组 | 单栏分节，Section tabs 变成 sticky subnav |
| Web | decision lane + support rail + AI lane | support rail 下移；AI lane 变为 collapsible panel |

---

## 3. No-scroll strategy

这里的 no-scroll，不是“整个产品永远不能滚动”，而是：

> 默认打开的第一个视口不能要求用户靠滚动才能理解产品是什么、现在能做什么、下一步去哪。

### 3.1 第一屏必须上浮的内容

#### Assistant Mode

- 当前站点 / 课程上下文
- `read-only` 与 `manual-only` posture
- BFF / provider readiness 单行状态
- 语言切换入口
- 三模式切换器
- 问题输入框
- 两个主动作：
  - `Export from this site`
  - `Open settings / auth`

#### Popup

- quick pulse 四项指标
- 一枚 `Read-only` badge
- 三个动作：
  - `Open assistant`
  - `Quick export`
  - `Settings/Auth`

### 3.2 默认折叠的内容

- 高级材料分析
- provider/model 高级 runtime 控件
- provider cards 全量列表
- diagnostics blockers 全量列表
- full site status matrix
- Focus Queue / Weekly Load / Change Journal 全列表

### 3.3 必须移出默认模式的内容

以下内容不能继续放在 Assistant Mode 首屏：

- 完整 `WorkbenchOverviewSections`
- 完整 `WorkbenchDecisionSections`
- 完整 `WorkbenchOperationsSections`
- `BFF base URL` 手填输入框
- full provider model matrix
- export preset grid

### 3.4 具体容器规则

| Surface | 高度规则 | 滚动策略 |
| :-- | :-- | :-- |
| Sidepanel assistant | 目标首屏高度 `<= 1 viewport` | 第一屏不滚；超出内容进折叠 drawer |
| Sidepanel export | 允许步骤内容滚动 | 仅步骤主体滚动，footer CTA sticky |
| Sidepanel configuration | 允许分区滚动 | 顶部 summary 固定，分区内容滚动 |
| Popup | 目标 `<= 420px` 高度 | 默认不滚；超出动作进入 `More` |
| Web | 正常滚动 | 不做 no-scroll 硬约束 |

### 3.5 信息压缩策略

| 内容类型 | 处理方式 |
| :-- | :-- |
| 多站点状态 | 默认只显示 `current site + total blockers count + see all` |
| 资源族授权 | 默认只显示已开启数/部分受限数；点进后看树 |
| diagnostics | 默认一句状态 + 一个 next action |
| receipts | 默认最近一次 sync receipt 一行 |
| advanced material | 默认关闭并折叠 |

---

## 4. Canvas export flow

Canvas 是本轮深度样板站点，导出模式必须按真实能力强弱排序，而不是假装所有资源都已同等完成。

### 4.1 入口

允许四个入口：

1. Canvas 页面中打开 sidepanel，默认识别 `Canvas`
2. Assistant Mode CTA：`Export from Canvas`
3. Popup CTA：`Quick export`
4. Web 中的 `Open export in extension`

### 4.2 Step flow

```text
Step 1  Scope
  ├─ Current course (如果当前页能识别)
  ├─ Pick another Canvas course
  └─ All visible Canvas courses

Step 2  Resource family
  ├─ Ready now
  │  ├─ Assignments
  │  ├─ Announcements
  │  ├─ Deadlines
  │  └─ Inbox / Messages
  ├─ Partial
  │  ├─ Courses
  │  ├─ Grades
  │  └─ Instructor feedback
  └─ Blocked / carrier pending
     ├─ Syllabus
     ├─ Groups
     └─ Recordings

Step 3  Format
  ├─ Markdown
  ├─ JSON
  └─ CSV / ICS (only when supported by chosen family)

Step 4  Review & export
  ├─ selected scope
  ├─ selected resource families
  ├─ truthful depth badges
  ├─ read-only disclosure
  └─ Export CTA
```

### 4.3 Step 1 — Scope

#### 规则

- 如果用户当前就在某门 Canvas 课页：
  - 预选 `Current course`
  - 顶部显示 `Detected from this page`
- 如果无法识别课程：
  - 默认回到 `Pick a course`
- `All visible Canvas courses` 只在资源族支持跨课程汇总时可选

#### microcopy

- `English`: `Start with one course unless you need a cross-course summary.`
- `中文`: `默认先按单门课导出，只有在你确实需要跨课汇总时再放大范围。`

### 4.4 Step 2 — Resource family

#### 展示规则

每个资源族卡片必须同时显示：

- 名称
- 状态 badge：`Ready now / Partial / Blocked`
- truthful explanation
- 是否需要单独授权

#### 资源族文案

| Family | Status | Suggested copy |
| :-- | :-- | :-- |
| Assignments | `ready_now` | `Structured and export-ready today.` |
| Announcements | `ready_now` | `Useful for what changed across the course.` |
| Deadlines | `ready_now` | `Good for scheduling and due-date review.` |
| Inbox / Messages | `ready_now` | `Read-only conversation facts already supported.` |
| Courses | `partial` | `Course shell data is available, but deeper course-wide completeness still varies.` |
| Grades | `partial` | `Visible in part; treat as a partial read model, not full gradebook parity.` |
| Instructor feedback | `partial` | `Some comment paths exist, but not every feedback surface is fully productized yet.` |
| Syllabus | `blocked` | `Carrier not yet promoted into a user-ready export path.` |
| Groups | `blocked` | `Not yet ready as a truthful exported student surface.` |
| Recordings | `blocked` | `Still blocked by carrier depth; keep out of default export promises.` |

### 4.5 Step 3 — Format

#### 规则

- 默认格式：跟随用户配置中的默认导出格式
- 如果资源族组合不支持某格式：
  - 禁用该选项
  - 显示原因，不允许 silent fallback

#### 标签

- `Markdown`：用于阅读/分享
- `JSON`：用于结构化保真
- `CSV`：仅对表格型资源开放
- `ICS`：仅对 deadline/event 型资源开放

### 4.6 Step 4 — Review & export

#### Review 卡片必须包含

- `Source`: `Canvas`
- `Scope`: 课程名或课程集合
- `Resources`: 所选资源族 + 各自状态
- `Authorization`: 哪些资源族已授权
- `Posture`: `Read-only export. No site changes will be made.`

#### 导出前硬提醒

- `English`: `This export only contains the resource families and depth the current local workspace can truthfully prove.`
- `中文`: `这次导出只包含当前本地工作台能够诚实证明的资源族与深度，不会把 partial 说成 full。`

### 4.7 异常路径

| 情况 | 处理 |
| :-- | :-- |
| 当前站点不是 Canvas | `Export Mode` 仍可打开，但 Canvas flow 不预填课程 |
| 当前课程不可识别 | 停在 Step 1，要求明确选课 |
| 资源族未授权 | 在 Step 2 卡片上显示 `Needs permission`，点入授权抽屉 |
| 全部所选资源族 blocked | 禁用导出 CTA，给出 `Open authorization / Review supported families` |
| 当前本地没有可导数据 | 显示 empty state：`Sync or import this course first.` |

---

## 5. Settings/Auth center

### 5.1 总体原则

- 不能再把 settings/auth 埋在长滚动底部
- 必须把“我是否已连接、本地如何连、我授权了什么”做成近手入口
- sidepanel 提供轻量 summary 与快捷切换
- options page 提供完整编辑中心

### 5.2 近手入口

#### Assistant Mode 顶栏

- `Language globe`
- `Connection status pill`
- `Authorization status pill`

#### Assistant Mode 主 CTA 区

- `Open settings`
- `Review permissions`

#### Popup

- `Settings/Auth` 明确按钮，不藏到 kebab 菜单

### 5.3 配置中心分区

```text
Section A  Language
Section B  Local connection (BFF autodiscovery)
Section C  AI runtime
Section D  Site permissions
Section E  Resource-family authorization
Section F  Advanced material analysis
Section G  Boundary disclosure
```

### 5.4 Language switch

#### 规则

- 顶栏 globe button 一键切换：
  - `Auto`
  - `English`
  - `中文`
- options page 中保留 canonical source of truth
- globe 选择后立即生效，并在 toast 中反馈

#### microcopy

- `English`: `Language follows your browser unless you override it here.`
- `中文`: `默认跟随浏览器语言；你也可以在这里临时改成 English 或 中文。`

### 5.5 BFF autodiscovery 状态面

#### 目标

让产品先“替学生试一遍常见本地地址”，而不是默认把输入框丢给用户。

#### 自动发现候选

当前仓内允许的默认候选只写死为：

- `http://127.0.0.1:8787`
- `http://localhost:8787`

#### 状态定义

| State | 显示 | CTA |
| :-- | :-- | :-- |
| `discovering` | `Looking for local Campus Copilot runtime…` | disabled spinner |
| `resolved` | `Connected to local BFF` + resolved URL | `Refresh`, `Use manual URL` |
| `unreachable` | `No local BFF found on default addresses` | `Retry`, `Enter manually` |
| `manual_override` | `Using manually entered BFF URL` | `Retry autodiscovery`, `Save` |
| `error` | truthful error reason | `Retry` |

#### 规则

- autodiscovery 成功时，手填框默认折叠
- autodiscovery 失败时，才展开 manual fallback
- resolved URL 必须可见，避免“产品替我决定但我不知道它连到哪”

#### microcopy

- `English`: `Campus Copilot first checks the usual local addresses for you. Manual entry is only the fallback.`
- `中文`: `Campus Copilot 会先替你检查常见本地地址；只有找不到时才需要手动填写。`

### 5.6 Authorization Center

#### 信息架构

```text
Site permissions
├─ Canvas
│  ├─ Site enabled
│  ├─ Course-scoped permissions
│  └─ Resource-family permissions
├─ Gradescope
├─ EdStem
├─ MyUW
├─ MyPlan
└─ Time Schedule
```

#### 资源族卡片需要展示

- 开关
- truthful carrier badge：
  - `Official read-only source`
  - `Authenticated internal carrier`
  - `Fallback / may be incomplete`
- 可撤回说明
- 上次读取时间或最近一次成功证明

#### 最低授权层级

| 层级 | 是否本轮必做 |
| :-- | :-- |
| Site | 是 |
| Course | 是，Canvas / Gradescope / EdStem |
| Resource family | 是 |

### 5.7 Advanced material analysis

#### 规则

- 保持 `default off`
- 保持 `per-course opt-in`
- 保持 `user-pasted excerpt only`
- 保持 `acknowledgement required`
- 不能放在 assistant 默认首屏主路径

#### 文案

- `English`: `Advanced material analysis stays manual, narrow, and course-scoped.`
- `中文`: `高级课程材料分析保持手动、窄口、按单门课 opt-in。`

---

## 6. Brand/Icon direction

### 6.1 品牌气质

目标气质是：

- `trustworthy`
- `academic`
- `structured`
- `grounded in local workspace facts`

不走的方向：

- 赛博炫技
- 深色炫光 startup 风
- AI 魔法球
- 聊天气泡主导

### 6.2 品牌核心隐喻

Campus Copilot 更像：

> 一本被整理好的学业总账本 + 一个可信的旁边注解者

而不是：

> 一个会替你乱点页面的校园机器人

### 6.3 Icon 方向

当前 favicon 已经有正确底子：深绿圆角 badge + 浅色 ledger mark。  
本轮建议保留“学术账本”方向，迭代而不是推倒。

#### 推荐图形语言

- 主形：`ledger / notebook spine / structured column`
- 次形：`guiding dot` 或 `caret`，表示 copilot 的“旁边提示”，不是“代替操作”
- 避免：
  - 学士帽
  - 机器人脸
  - 聊天气泡
  - 闪电 / 星爆 AI 图腾

#### 推荐 icon 构成

```text
Rounded square badge
├─ left: ledger spine / structured block
└─ right: guide marker / subtle dot-column
```

#### 尺寸纪律

| 尺寸 | 要求 |
| :-- | :-- |
| 16px | 只保留主轮廓 + 一条 ledger spine |
| 32px | 可加入 guide marker |
| 48px | 可显示双层结构 |
| 128px | 可保留完整双色层次与轻微阴影 |

### 6.4 色彩方向

- 主色：深校园绿 `#1F5D4B`
- 辅色：深松木绿 `#27483D`
- 纸面浅色：`#F5F4EE`
- 线性说明色：雾灰绿 `#DCE8E1`
- 危险/手动红区：保守砖红，不用高饱和霓虹红

### 6.5 字体与 UI 气质

继续保持：

- 清楚、克制、可扫读
- 不要 flashy marketing hero
- 不要 dark-mode-only
- 不要把 AI 放在视觉上压过 workbench truth

### 6.6 关键品牌文案

- Tagline：
  - `English`: `One structured campus workspace.`
  - `中文`: `一块有结构的校园工作台。`
- Assistant strapline：
  - `English`: `Read-only guidance for the page you are on.`
  - `中文`: `针对当前页面的只读引导。`
- Export strapline：
  - `English`: `Export the course facts you can truthfully prove.`
  - `中文`: `导出你当前能诚实证明的课程事实。`

---

## 7. State matrix

### 7.1 Global mode state

| State | Trigger | UI treatment | Primary CTA |
| :-- | :-- | :-- | :-- |
| `assistant.ready` | current site known + basic runtime known | composer visible, trust strip visible | `Ask AI` |
| `assistant.needs_config` | no BFF or provider unavailable | composer visible but degraded, config warning visible | `Open settings` |
| `assistant.no_context` | current site unknown / no imported facts | generic companion copy + export/config routes | `Open export` |
| `export.in_progress` | export mode entered | stepper visible, sticky footer | `Continue` |
| `export.blocked` | no data or no permission | blocked card with truthful reason | `Review permissions` |
| `configuration.summary` | sidepanel settings view | cards only, no giant forms | `Open full settings` |
| `configuration.full` | options page | full editable sections | `Save` |

### 7.2 Connection / BFF states

| State | Badge | Required wording |
| :-- | :-- | :-- |
| `discovering` | neutral | `Checking the usual local addresses…` |
| `resolved` | success | `Connected locally` |
| `unreachable` | warning | `No local runtime found yet` |
| `manual_override` | neutral | `Using manual local address` |
| `fetch_failed` | danger | `Could not read provider status from the local runtime` |

### 7.3 Authorization states

| State | Meaning | UI badge | CTA |
| :-- | :-- | :-- | :-- |
| `enabled` | user explicitly allowed this scope | success | `Review` |
| `partial` | some families or courses enabled | warning | `Complete setup` |
| `disabled` | not enabled yet | neutral | `Enable` |
| `revoked` | previously enabled, now off | neutral | `Enable again` |
| `blocked_by_carrier` | upstream carrier not productized | danger | none |

### 7.4 Resource-family truth states

| State | Meaning | Example |
| :-- | :-- | :-- |
| `ready_now` | adapter + schema/storage + surface/export all present | Canvas assignments |
| `partial` | some depth exists, but not fully productized or not fully truthful yet | Canvas grades / instructor feedback |
| `blocked` | carrier or product path still missing | Canvas syllabus / groups / recordings |

### 7.5 Empty / loading / error states

| Surface | State | Copy direction |
| :-- | :-- | :-- |
| Assistant | loading | `Reading local workspace facts for this page…` |
| Assistant | empty | `No structured facts are visible for this page yet. You can still open Export or Settings.` |
| Export | empty | `Sync or import this course first.` |
| Export | permission missing | `This resource family needs explicit permission before export.` |
| Settings/Auth | loading | `Checking language, local connection, and permissions…` |
| Settings/Auth | error | truthful reason + retry |
| Web | loading | current existing workbench loading block is acceptable |

### 7.6 Manual-only / red-zone messaging

以下文案必须在 extension 与 web 保持同一语义：

- `English`: `Campus Copilot stops at explanation and routing here.`
- `中文`: `Campus Copilot 在这里止步于说明和跳转，不替你操作。`

适用对象：

- Register.UW
- Notify.UW
- 任何写操作、提交、发帖、注册类路径

---

## 8. Implementation notes

### 8.1 实施边界

- 不改产品定位
- 不改 read-only / truthful posture
- 不引入新的写操作或 host permission
- 不把 session-backed/internal/fallback 包装成 official
- 不让 language / settings / auth 再埋回长滚动底部

### 8.2 推荐拆单顺序

#### Ticket 1 — Extension shell IA refactor

- 在 `SurfaceShell` 引入显式 `ExtensionPrimaryMode`
- sidepanel 默认改为 `assistant`
- popup 改为 launcher，不再共享 workbench 首屏
- options 改为 settings/auth center 首屏

#### Ticket 2 — Assistant Mode companion landing

- 抽离 assistant 首屏卡片
- 把 language switch / status pills / mode switcher 放到顶栏
- 把 full workbench sections 从默认模式移出

#### Ticket 3 — Export Mode stepper + Canvas first flow

- 把 preset 按钮流改成 stepper flow
- 实做 Canvas scope/resource/format/review 四步
- 为 `ready_now / partial / blocked` 加 truthful badges

#### Ticket 4 — Settings/Auth center

- 做 BFF autodiscovery state card
- 做 near-hand language switch
- 做 site/course/resource-family authorization tree
- 保留 advanced material 的 narrow opt-in

#### Ticket 5 — Brand/icon + responsive polish

- 更新 mode 顶栏、status badge、trust strip 样式
- 统一 icon 方向与 brand copy
- 校正 popup / sidepanel 的 no-scroll 首屏

### 8.3 与当前代码结构的映射建议

| 现有文件 | 建议方向 |
| :-- | :-- |
| `apps/extension/src/surface-shell.tsx` | 改为 mode router，而不是先渲染 `WorkbenchPanels` |
| `apps/extension/src/workbench-panel-sections.tsx` | 从默认 extension 首屏降级为 secondary/summary source 或 web/full-view source |
| `apps/extension/src/ask-ai-panel.tsx` | 保留核心 composer，但拆成 `assistant mode` 主体 + `runtime drawer` |
| `apps/extension/src/options-panels.tsx` | 重组为 settings/auth center sections |
| `apps/extension/src/popup-quick-export-panel.tsx` | 保留 quick pulse 方向，但改成 launcher 角色 |
| `apps/web/src/App.tsx` | 保持 full workbench + AI lane 架构，不模仿 extension 三模式 |
| `apps/web/src/web-toolbar.tsx` | 保留 import/export/support rail，但文案可更强调“review surface” |

### 8.4 外部模式原则（用于实现时对齐）

- Chrome 官方 side panel 心智：适合做“跟随当前标签页的补充任务面”，不适合塞入深配置主流程。
- Chrome 官方 options page 心智：适合做扩展级别的深设置与长期偏好。
- 1Password 原则：主弹层先完成近手任务，深设置进入独立设置面，不把完整配置摊在首屏。
- Zotero Connector 原则：浏览器动作优先服务当前页面的采集/保存任务，偏好与连接问题进入独立 preferences。
- Sider 原则：侧边栏应该像页面旁边的 contextual companion，而不是另一个完整应用桌面。

### 8.5 待确认但不阻塞写规格的点

- autodiscovery 是否只试 `8787`，还是未来允许有限候选端口扩展
- `CSV / ICS` 在各资源族上的精细可用矩阵
- sidepanel 最终目标宽度与最小高度阈值
