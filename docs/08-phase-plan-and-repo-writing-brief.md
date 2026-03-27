# `08-phase-plan-and-repo-writing-brief.md`

# 🚀 校园学习信息整理与 AI 辅助插件 —— Phase 计划与 Repo 编写说明

## 面向「从空 Repo 开始」的实现路线、阶段切分、交付边界与 Codex 执行约束

> **一句话先讲明白：**
> 这份文档不是继续讲“产品是什么”，而是把前面 7 份文档真正变成一份**可执行的开工说明书**。
> 它回答的是：
> **如果现在只有一套文档、一个空 Repo、一个会写代码的 Codex，那么应该先写什么，后写什么，哪些先 stub，哪些必须一次写对，哪些绝对不能抢跑。**

---

# 0. 这份文档是干什么的 👀

前面的文档已经分别回答了：

1. **产品是什么**（PRD）
2. **系统怎么分层**（Architecture）
3. **统一数据语言是什么**（Domain Schema）
4. **站点接入层怎么设计**（Adapter Spec）
5. **AI Provider 和 Runtime 怎么设计**（AI Runtime）
6. **用户界面和导出怎么设计**（User Surfaces）
7. **安全、隐私与合规边界是什么**（Security / Privacy / Compliance）

但是到真正开始写 Repo 的时候，还会遇到另一个问题：

> **知道“应该长什么样”，不等于知道“第一行代码该从哪里开始写”。**

所以这份文档负责把前面 7 份文档压缩成：

* 一条清晰的开工顺序
* 一份不容易跑偏的 Repo 编写说明
* 一套阶段目标与每阶段的“完成定义”（Definition of Done）
* 一组给 Codex 的硬规则与工作方式

---

# 1. 先说结论：这个 Repo 应该怎么启动 📌

> **从空 Repo 开始时，正确顺序不是：先做 UI、先接 AI、先做万能 agent。**
> 正确顺序是：
>
> 1. **先把系统的“骨架”立住**
> 2. **先把统一 schema 和 adapter 基座写出来**
> 3. **先跑通最小 read-only 数据链路**
> 4. **先让用户“看得见、导得出、问得出”**
> 5. **最后再逐步补强 provider、timeline、更多站点和更复杂体验**

换句话说：

## 这不是一个“先做聊天框”的项目

也不是一个“先接模型再说”的项目。

它最先要做对的，是：

* **数据进来**
* **数据统一**
* **数据可缓存**
* **数据可导出**
* **AI 只解释已经结构化的数据**

---

# 2. 这份 Repo 编写说明默认站在什么前提上 🧱

这份文档默认以下事情已经在方向上拍板：

## 2.1 已拍板的方向

1. 产品是 **学业信息整理 + 去噪导出 + AI 总结**
2. 不是万能网页 AI
3. 不是学术任务代做工具
4. 第一阶段是 **read-only**
5. 架构中心是：

   * `Site Adapter`
   * `Unified Schema`
   * `Core Orchestrator`
   * `Local-first`
   * `AI after structure`
6. 站点接入采用：

   * `Official/Private API → Page State → DOM`
7. 第一阶段聚焦：

   * Canvas
   * Gradescope
   * assignments
   * announcements / recent updates
   * export
   * AI summary
   * sidepanel
   * local storage

---

## 2.2 这份文档不重新讨论这些问题

本文件不是再次争论：

* 产品要不要做
* AI 应不应该接
* ChatALL 要不要 vendor
* Web Session 要不要当主路径
* 是否要做自动操作

这些问题前面已经收敛过了。
本文件只负责：

> **让实现顺序与工程切片，严格服从已经定下来的方向。**

---

# 3. Repo 编写总原则 🛠️

---

## 3.1 先做“骨架和接口”，再做“功能密度”

从空 Repo 开始时，不要一上来追求：

* UI 很完整
* 站点很多
* AI 很聪明
* 页面很炫

应该先确保这些东西存在：

1. 清楚的工程分层
2. 稳定的 schema 边界
3. Adapter 基类与 collector 机制
4. 最小本地存储
5. 最小导出链路
6. AI 调用的最小接口

---

## 3.2 先打通一条端到端主链路，再扩点

第一阶段最应该打通的主链路不是“所有功能都沾一点”，而是：

> **站点数据读取 → Normalize → Schema → Storage → Sidepanel 展示 → 导出 / AI 总结**

只要这条链路真的通了，后面扩功能就会快很多。

---

## 3.3 先让系统“诚实可用”，不要先让它“演示很酷”

这个项目很容易被写成：

* AI 很会说
* UI 很漂亮
* 实际数据脆弱
* 一改站点就挂

所以实现优先级必须反过来：

1. 数据真实
2. 边界诚实
3. 失败可解释
4. 然后才是体验打磨

---

## 3.4 所有阶段都必须可停

每个阶段都应该设计成：

* 做到这里就已经有独立价值
* 即使后面暂时停下，也不是一坨半成品

这是为了避免那种：

* 前面 80% 都是铺垫
* 直到最后 20% 才第一次能用

这个项目最适合逐层生长，而不是大爆发式开发。

---

# 4. 从空 Repo 开始的推荐阶段切分 🗺️

下面是我建议的阶段规划。
不是唯一答案，但这是**最稳、最不容易跑偏**的一条路线。

---

# Phase 0：开工准备与工程基座 🪵

## 4.0.1 目标

把 Repo 初始化到一个“可以正式开始写业务”的状态。

---

## 4.0.2 这一阶段要解决什么

不是解决产品功能，而是解决：

* 工程分层是否清楚
* 包之间依赖是否干净
* 扩展入口是否可运行
* 后续代码该放哪里
* 哪些地方先留 stub

---

## 4.0.3 推荐产出

### 必须产出

1. Monorepo 初始化
2. 包管理与 workspace 配置
3. 基础 lint / format / typecheck
4. WXT 扩展壳子跑起来
5. Sidepanel / Popup / Options 空壳
6. `packages/*` 目录建好
7. 文档入口（README / docs 索引）
8. 基础环境变量和配置说明

---

## 4.0.4 这一阶段**不应该**做什么

* 不要写具体站点抓取逻辑
* 不要先堆 UI
* 不要先接大模型
* 不要先写复杂导出
* 不要先碰 Web Session

---

## 4.0.5 完成定义（DoD）

满足以下条件即可进入下一阶段：

* Repo 可安装依赖
* Repo 可 typecheck
* 扩展壳可本地运行
* Sidepanel / Popup / Options 至少能打开
* 包结构清楚、无循环依赖
* 有统一的开发命令

---

# Phase 1：统一 Schema 与 Adapter 基座 🧬🔌

## 4.1.1 目标

先把系统最核心的“共同语言”和“接入边界”写出来。

---

## 4.1.2 这一阶段为什么这么早做

因为这两个东西一旦不先立住，后面 Codex 很容易：

* 每个站点一套字段名
* UI 直接吃 raw 数据
* AI 直接吃 DOM
* 导出层自己再发明一套格式

这会让整个项目后面很难收拾。

---

## 4.1.3 必须产出

### A. `schema` 最小正式版

至少实现：

* `Course`
* `Assignment`
* `Announcement`
* `Message`
* `Grade`（可先最小）
* `Event`
* `Alert`
* `SourceRef`
* `EntityRef`
* 基础枚举与时间字段约定

### B. `adapters/base` 基座

至少实现概念接口：

* `SiteAdapter`
* `AdapterContext`
* `AdapterCapabilities`
* `ResourceCollector<T>`
* fallback pipeline runner
* normalize hook 位置

### C. 健康与调试元数据类型

至少预留：

* `FetchMode`
* `FetchMetadata`
* `HealthStatus`

---

## 4.1.4 这一阶段不要求

* 站点真实跑通
* UI 展示完整
* AI 接入完成

---

## 4.1.5 完成定义（DoD）

* schema 包可独立被 import
* adapter 基座能支持“一个资源多 collector”
* 所有上层包都只依赖 schema，不依赖站点 raw 格式
* 能写出假数据并打通类型流

---

# Phase 2：第一个可用数据链路（Canvas + Gradescope 最小切片）📚

## 4.2.1 目标

从“骨架工程”进入“真实可用系统”。
但仍然只做最小切片。

---

## 4.2.2 为什么优先 Canvas + Gradescope

因为这两个站点最直接覆盖：

* 作业
* 提交状态
* 成绩
* 课程更新

它们最能支撑三个核心问题：

1. 我还有什么作业？
2. 最近有什么消息？
3. 我需要关注什么？

---

## 4.2.3 第一批真实资源只做什么

### 必做

1. `CanvasAdapter`

   * `getCourses()`
   * `getAssignments()`
   * `getAnnouncements()`

2. `GradescopeAdapter`

   * `getCourses()`（如拿得到）
   * `getAssignments()`
   * `getGrades()`（可最小支持）

### 可先弱化

* EdStem
* MyUW
* `Messages`
* `Timeline`

---

## 4.2.4 这一阶段最关键的目标不是“覆盖很多”，而是“跑通一个真实闭环”

闭环应是：

`真实站点数据 → collector → normalize → schema → storage`

只要这个闭环在两个站点、两三类资源上真的能跑，整个系统就有了生命。

---

## 4.2.5 这一阶段推荐策略

### Canvas

* 官方 API 优先
* state / DOM 作为补位

### Gradescope

* private/internal request 优先
* state / DOM fallback

---

## 4.2.6 完成定义（DoD）

* 至少一个站点能稳定返回 assignments
* 至少一个站点能稳定返回 announcements 或 grades
* 所有返回结果都已经 normalize 成统一 schema
* 失败时能区分：

  * 未登录
  * collector 失败
  * normalize 失败
  * 无支持能力

---

# Phase 3：本地存储、差异感知与最小 Dashboard 🗃️📊

## 4.3.1 目标

让系统不再只是“当场抓一下”，而是有了“记忆”。

---

## 4.3.2 为什么这一步重要

如果没有存储层，系统就很难真正回答：

* 最近有什么新变化？
* 哪些是新出现的？
* 哪些是已经看过的？
* 哪些是本周新增任务？

而这些问题恰恰是产品价值的一部分。

---

## 4.3.3 必须产出

### A. 本地存储最小版

建议支持：

* entities 缓存
* last sync metadata
* provider config（非敏感最小部分）
* user display preferences
* lightweight history / diff basis

### B. 最小差异能力

至少支持：

* 新作业
* 新公告
* 新成绩（如支持）
* 最近更新时间

### C. Sidepanel 首页最小版

至少展示：

* today snapshot
* priority alerts（初级规则版）
* recent updates
* quick actions

---

## 4.3.4 这一阶段可以先不做

* 完整 timeline 页面
* 复杂历史版本浏览
* 高级搜索

---

## 4.3.5 完成定义（DoD）

* 用户关闭再打开扩展，不会一切归零
* 首页能显示“不是瞬时抓取”的结果
* 能区分“没有数据”与“还没同步”
* 至少能产生基础 alerts

---

# Phase 4：导出主链路落地 📤

## 4.4.1 目标

把“导出”从概念变成真正的一等能力。

---

## 4.4.2 为什么这一步要早做

因为前面的产品方向已经定得很清楚：

> **导出不是小附属，它是主线之一。**

很多用户甚至可能先用导出，再用 AI。
如果你拖到很后面才做导出，系统会越来越像“只有一个 AI 面板”。

---

## 4.4.3 必须产出

### 最少支持的格式

* JSON
* Markdown
* CSV

### ICS

* 可在本阶段后半或 Phase 4.5 补上

### 最少支持的导出预设

1. 导出本周作业
2. 导出最近更新
3. 导出当前视图
4. 复制 AI 总结（可后接）

---

## 4.4.4 导出层应该吃什么

**只能吃统一 schema。**

### 不允许

* exporter 直接吃 Canvas raw response
* exporter 直接吃 DOM 结构
* exporter 直接自己做 normalize

---

## 4.4.5 完成定义（DoD）

* 用户能在 UI 中明确看到导出入口
* 至少一个列表页可直接导出当前结果
* 导出内容对普通人是可读的，不只是开发者 dump
* 导出和 UI 列表来自同一套 schema，而不是两份不同数据来源

---

# Phase 5：AI Runtime 最小闭环 💬🤖

## 4.5.1 目标

把 AI 从“概念存在”变成“真正有边界地可用”。

---

## 4.5.2 这一步的核心不是“接很多模型”，而是“接对位置”

前面的文档已经定过：

* AI 不碰网页
* AI 不碰 selector
* AI 只吃结构化结果
* AI 负责意图、编排、总结、解释

所以这一阶段应该做的是：

> **把 AI 接到 schema / tools / orchestrator 之后，而不是接到页面之前。**

---

## 4.5.3 必须产出

### A. AI Runtime 最小版

支持：

* 提问输入
* tool call
* structured input
* streaming output（推荐）
* 基础 prompt / system policy
* summary rendering

### B. 第一批工具

至少应有：

1. `getPendingAssignments`
2. `getRecentUpdates`
3. `getPriorityAlerts`
4. `getWeeklyDigest`（可选）

### C. 第一批标准问题

必须优先支持：

* 我还有什么作业？
* 最近有什么消息？
* 我需要关注什么？

---

## 4.5.4 Provider 策略建议

### Phase 5 推荐最稳起点

* OpenAI API key
* Gemini API key

### 当前 repo 的实际落点

截至当前实现，repo 已经进入 **Phase 5 的最小闭环雏形**，但要注意边界：

* sidepanel 已经有最小 AI 提问区
* AI 请求已经固定走：
  * `Today Snapshot / Recent Updates / Priority Alerts / export_current_view`
  * 再进入薄 BFF
* `apps/api` 当前只正式承诺：
  * OpenAI API key proxy
  * Gemini API key proxy

仍然**没有**进入正式路径的内容：

* Gemini OAuth
* Anthropic
* Web Session
* 多 provider 自动路由
* provider fallback mesh

### 不建议一开始就作为主路径

* Web Session 模式
* 多 provider 自动路由
* provider fallback mesh

---

## 4.5.5 完成定义（DoD）

* 用户提问后，系统能先调工具再回答
* 回答不是凭空生成，而是可追溯到结构化数据
* AI 不直接读取原页面
* 失败时能清楚区分是：

  * provider 未连接
  * tool 无数据
  * 请求失败
  * 模型失败

---

# Phase 6：体验补强与站点扩展 🌱

## 4.6.1 目标

在核心链路稳定后，再补齐体验和更多站点。

---

## 4.6.2 建议优先扩展方向

### A. EdStem

优先做：

* instructor-authored posts
* unread / recent threads
* discussion summaries

### B. MyUW

优先做：

* notices
* events
* dashboard widgets

### C. UI 补强

* 更好的 filters
* 更清楚的 empty states
* 更完整的 exports page
* AI 回答与结构化结果的双向联动

---

## 4.6.3 这一阶段仍然不建议急着做

* 自动化写操作
* 学术任务代做能力
* 全站全资源同步
* 超复杂 agent 流程

---

# Phase 7：实验能力与高级路线（可选）🧪

这一阶段不是必须立即做的，而是“等系统已经稳定之后再考虑”。

---

## 4.7.1 可选方向

1. `web_session` provider connectors
2. timeline page
3. advanced priority engine
4. provider routing / fallback
5. richer exports
6. contextual page actions

---

## 4.7.2 必须带着“实验标签”的能力

尤其是：

* ChatGPT web session
* Claude web session
* Gemini web session

这些可以研究、可以做实验，但不应该在 Phase 1～5 里被当成主路径。

---

# 5. Repo 实现顺序：从文件与模块层面怎么下手 🧩

下面这部分更偏“Repo 编写说明”，适合直接喂给 Codex。

---

## 5.1 第一批必须先写的模块（按顺序）

### 第一组：工程基础

1. workspace / package manager
2. lint / format / typecheck
3. extension shell
4. docs / README

### 第二组：系统基座

5. `packages/schema`
6. `packages/adapters/base`
7. `packages/core`（最小 orchestrator）
8. `packages/storage`（最小）
9. `packages/exporter`（最小）

### 第三组：第一批真实站点

10. `packages/adapters/canvas`
11. `packages/adapters/gradescope`

### 第四组：用户价值层

12. `apps/extension/sidepanel`
13. `apps/extension/popup`
14. `apps/extension/options`

### 第五组：AI

15. `packages/ai`
16. `apps/api`（或 BFF 最小版）

---

## 5.2 哪些模块可以先 stub

### 可以先 stub：

* `edstemAdapter`
* `myuwAdapter`
* `timeline`
* `web_session`
* advanced alerts
* richer filters
* full chat history

---

## 5.3 哪些模块最好不要先 stub 太久

### 不建议长期 stub：

* `schema`
* `adapter base`
* `storage`
* `exporter`
* `core orchestrator`

因为这些东西一旦前面不认真写，后面会层层返工。

---

# 6. 每一阶段最适合的提交粒度（Commit / PR 粒度）📦

这个项目很容易写成“大而乱的一次性提交”。
建议严格按小切片推进。

---

## 6.1 推荐的提交方式

### 不推荐

* “feat: initial project”
* “implement everything”
* “finish adapters”

### 推荐

* `feat(schema): add core course/assignment/announcement entities`
* `feat(adapter-base): add collector pipeline and capability model`
* `feat(canvas): add assignments api collector`
* `feat(sidepanel): render home snapshot cards`
* `feat(exporter): add markdown task export`

---

## 6.2 为什么要小切片

因为你需要随时知道：

* 哪一步真的已经稳定
* 哪一步只是铺垫
* 哪一步出了问题
* 哪一步可以先停

---

# 7. Definition of Done：每阶段到底什么叫“完成” ✅

这是最容易被忽略、但最重要的一部分。

---

## 7.1 不要把“写了代码”当完成

真正的完成不是：

* 有文件了
* 有类了
* 有按钮了
* 跑起来了

真正的完成至少包括：

1. **边界正确**
2. **输入输出清楚**
3. **失败路径诚实**
4. **可被后续阶段复用**
5. **没有偷越前面文档边界**

---

## 7.2 各层的 DoD 判断标准

### Schema 层完成

* 对象定义稳定
* 字段意义明确
* 上层不再依赖 raw 结构

### Adapter 层完成

* 至少一个资源能通过明确 pipeline 拿到结果
* 有 mode / failure 记录
* normalize 不含糊

### Storage 层完成

* 能持久化
* 能读回来
* 能区分无数据 / 未同步 / 失败

### Export 层完成

* 面向普通用户可读
* 与 schema 一致
* 不是调试 dump

### AI 层完成

* 基于工具结果回答
* 可解释
* 失败可归因
* 不碰 raw 网页

### UI 层完成

* 首页不空
* 状态不假
* 列表与 AI 可互相承接
* 导出入口明显

---

# 8. 给 Codex 的执行说明：应该如何使用前 7 份文档 🤖

这一节专门写给未来真正要动手写 Repo 的 Codex。

---

## 8.1 读取顺序建议

Codex 在开始实现前，应该按这个顺序读取：

1. `01-product-prd.md`
2. `02-system-architecture.md`
3. `03-domain-schema.md`
4. `04-adapter-spec.md`
5. `07-security-privacy-compliance.md`
6. `06-export-and-user-surfaces.md`
7. `05-ai-provider-and-runtime.md`

### 为什么不是按编号顺序

因为实现时最先要对齐的是：

* 产品目标
* 系统结构
* 数据语言
* 接入边界
* 安全边界

而不是先想 provider 花活。

---

## 8.2 Codex 必须先做什么，再做什么

### 必须先做

* schema
* adapter base
* minimal core
* minimal storage
* minimal exporter

### 然后再做

* first site adapters
* sidepanel home
* tasks / updates list
* minimal AI summary

### 最后再做

* provider 扩展
* timeline
* experiments
* web session

---

## 8.3 Codex 不允许自己“补设定”

如果文档没写清楚，正确做法是：

* 先保持 stub
* 先用最小占位
* 不要自作主张把产品往“大而全 AI 助手”方向扩

尤其不要擅自补：

* 自动化写操作
* 全站权限
* raw DOM 直送 AI
* provider web session 主路径
* 泛网页模式

---

# 9. 给人类协作者的执行说明：你应该如何使用这份文档 👥

这份文档不只是给 Codex 的，也给你自己和未来协作者看的。

---

## 9.1 你可以把它当成什么

### A. 开工顺序说明书

今天到底先做什么，不再拍脑袋。

### B. 停止条件说明书

做到哪一步先停下来复核，不要一路写到失控。

### C. 拒绝范围蔓延的依据

当有人说：

* “顺手把自动回复也做了吧”
* “顺手支持全网页吧”
* “顺手把 agent 化做了吧”

你可以用这份文档说：
**不，这不在当前阶段。**

---

## 9.2 你每做完一个阶段，应该问自己的 5 个问题

1. 我们现在真的比上一个阶段更“可用”了吗？
2. 这一步是用户价值，还是只是技术铺垫？
3. 有没有偷偷越过产品边界？
4. 有没有把“实验能力”写成“正式能力”？
5. 有没有让后续阶段更轻，而不是更乱？

---

# 10. 当前最推荐的 Phase 1～5 实施顺序（拍板版）🪜

如果你现在就准备让 Codex 开写，我推荐直接按下面这条顺序推进：

---

## Step 1：工程基座

* monorepo
* extension shell
* basic tooling

## Step 2：schema + adapter base

* entity definitions
* collector pipeline
* capability model

## Step 3：Canvas + Gradescope 最小真实接入

* assignments
* announcements / grades
* normalize
* error model

## Step 4：storage + home snapshot

* local cache
* sync metadata
* sidepanel home

## Step 5：export

* markdown
* csv
* json
* export presets

## Step 6：AI summary

* minimal tools
* provider runtime
* structured answer flow

## Step 7：体验补强

* task list
* updates list
* better empty states
* settings polish

---

# 11. 不该抢跑的东西清单 🚫

这部分非常重要。
因为它们通常“看起来很诱人”，但会明显扰乱前期节奏。

---

## 11.1 当前不该抢跑的功能

1. 自动发帖
2. 自动提交
3. 自动执行网页动作
4. 全站全网页权限
5. 学术任务内容生成
6. Web Session 主路径
7. 多 provider 智能路由
8. timeline 大而全版本
9. 复杂 agent framework
10. 高级协同功能

---

## 11.2 为什么这些不该抢跑

因为它们会同时带来：

* 架构复杂度
* 权限复杂度
* 合规复杂度
* 测试复杂度
* 审核复杂度

而当前最重要的是先把**主闭环**做扎实。

---

# 12. 风险控制：什么时候应该停下来复盘 🧯

不是每个阶段都应该一路猛写。
以下情况一出现，建议立刻停下来复盘。

---

## 12.1 一旦出现这些迹象，就说明方向开始歪了

### A. UI 写得越来越多，但真实数据链路仍然不稳

说明你在做“壳子优先”。

### B. AI 写得越来越多，但工具链路还没清楚

说明你在做“模型优先”。

### C. 某站点逻辑开始污染全局 schema

说明 adapter 边界没守住。

### D. Exporter 开始自己直接适配站点 raw 数据

说明 schema 中心失守。

### E. 为了“先跑通”开始默认申请重权限

说明安全边界被破坏。

---

## 12.2 停下来时应该先检查什么

1. 当前问题是产品边界问题，还是实现问题？
2. 是 schema 不清，还是 adapter 不清？
3. 是 provider 太早了，还是 UI 太早了？
4. 是 collector 不稳，还是 normalize 不稳？

---

# 13. 最终拍板版（给人看，也给 Codex 看）📌

> **最终 Phase 计划与 Repo 编写说明如下：**
> 这个项目应当以“从空 Repo 稳定长出产品”的方式推进，而不是一上来堆 AI、堆 UI、堆站点。正确顺序是：先完成工程基座，再写统一 schema 与 adapter 基座，再打通 Canvas / Gradescope 的最小真实数据链路，再补本地存储与 sidepanel 首页，再把导出能力作为一等能力落地，最后再接入 AI Runtime 的最小闭环。整个 Repo 的实现必须始终服从前面 7 份文档已经确定的边界：产品是学业信息整理与优先级辅助工具；系统是 `Site Adapter + Unified Schema + Core Orchestrator + Local-first + AI after structure`；第一阶段坚持 read-only、少站点、少资源、少权限、先导出再复杂化。Codex 在实现时不允许擅自补设定，不允许抢跑自动化写操作，不允许把 Experimental 路线写成正式主路径，也不允许把 UI、AI 或 exporter 绕过统一 schema 直接绑到站点 raw 数据上。这个 Repo 应该像一棵树一样一层层长，而不是像一场 demo 一样一次性堆出来。

---

# 14. 当前文档状态 📝

* **文档名**：`08-phase-plan-and-repo-writing-brief.md`
* **状态**：第一版正式执行说明文档
* **用途**：

  1. 给你自己确定“现在到底该从哪里开始写”
  2. 给 Codex 提供实现顺序和阶段边界
  3. 给协作者提供统一的开工节奏
  4. 作为前 7 份文档通向真实 Repo 的桥梁

---

如果你愿意，下一步最合适的不是再写新文档，而是我帮你把这 **8 份文档整理成一个 `docs/` 目录结构建议 + 每份文件的命名规范 + 一份给 Codex 的总入口 README**。
