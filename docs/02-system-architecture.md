# `02-system-architecture.md`

# 🏗️ 校园学习信息整理与 AI 辅助插件 —— 系统架构文档

## 面向 Canvas / Gradescope / EdStem / MyUW 的整体系统设计

> **一句话先讲明白：**
> 这个系统不是“一个浏览器插件 + 几个抓网页脚本”，而是一个 **本地优先的小型数据平台**：它在浏览器扩展里采集多个学习平台的数据，用 **统一数据模型（Unified Schema）** 把不同站点的信息翻译成同一种语言，再由 **AI 层** 负责解释、总结和回答问题；采集策略则采用 **Private / Official API → Page State → DOM** 的三级降级。

---

## 0. 文档定位 👀

本文档回答的是：

1. 这个系统为什么要这么分层
2. 每一层分别负责什么
3. 数据和请求是怎么流动的
4. 为什么 AI 不该直接碰网页
5. 为什么要做 Site Adapter、Unified Schema、Fallback Pipeline
6. 第一阶段该落哪些部分，哪些先不做

本文档**不是**：

* 详细字段定义文档
* Adapter 接口的最终 TypeScript 规范
* AI Provider 的认证细节文档
* Repo 目录树逐文件说明
* 安全合规实施细则

这些内容会在后续文档里展开。
本文档的目标，是让你和未来的 Codex / 工程协作者，先对**系统全貌和边界**形成同一张脑图。

---

# 1. 先用 30 秒看懂：这个系统到底长什么样 ⚡

## 一句话版

> **这是一个“浏览器扩展外壳 + 多站点采集适配层 + 统一数据中枢 + AI 总结层 + 导出层”的系统。**
> 它的核心不是聊天框，而是：**能不能稳定地拿到对的数据，并把它们变成一个统一、可解释、可导出的学习视图。**

---

## 它的 7 个核心层

| 层                        | 作用                                      | 为什么重要             |
| ------------------------ | --------------------------------------- | ----------------- |
| 1. Extension Shell       | 浏览器扩展本体，承载 UI、页面注入、消息通信                 | 用户真正接触的入口         |
| 2. Site Adapter          | 每个站点的采集器和翻译器                            | 系统最重要的护城河         |
| 3. Unified Schema        | 统一数据语言                                  | 没有它，AI 和导出都会乱     |
| 4. Core Orchestrator     | 统一调度、合并、排序、降级、告警                        | 把“业务问题”和“抓取细节”分开  |
| 5. Storage / Cache       | 本地缓存、diff、同步状态、历史记录                     | 提升稳定性和长期可用性       |
| 6. AI Provider Connector | 对接 OpenAI / Claude / Gemini 等模型能力       | 把“学校数据”与“模型调用”解耦  |
| 7. Export / Presentation | 导出 JSON / CSV / Markdown / ICS，生成人类可读视图 | 导出与 AI 并列，是产品主线之一 |

---

## 这个架构解决的核心矛盾

### 它同时解决了这几件事：

1. **多站点差异很大，但用户希望一个统一入口**
2. **私有接口很快，但不稳定；DOM 很慢，但能兜底**
3. **AI 很灵活，但直接抓网页会失控**
4. **浏览器扩展要本地优先，但 AI 又通常在云端**
5. **产品要先做 MVP，但以后还得能扩展到更多站点和能力**

---

# 2. 为什么这个项目不能“随便写几个脚本就开工” 🤔

前面的产品定义已经明确了：这个产品不是单站点小工具，而是一个 **跨站点学习信息聚合器 + AI 决策辅助器**。
这意味着系统天然会遇到几个结构性难题：

## 2.1 数据来源不统一

四个站点并不共享同一种数据接口，也不共享同一种页面结构：

* Canvas 更适合 **官方 API 优先**
* EdStem 更接近 **token / undocumented API**
* Gradescope 现实上更接近 **私有接口 + DOM**
* MyUW 更适合 **DOM / page state first**

如果没有一层统一抽象，后面 UI、AI、导出层都会被站点细节污染。

---

## 2.2 用户问题是“跨站点”的

用户问的不是：

* “请读取 Canvas 某个接口字段”
* “请提取 EdStem 某个 div”

用户问的是：

* 我还有什么作业？
* 最近有什么消息？
* 我需要关注什么？

这些问题天然要求系统先把多站点数据合并后再回答。
所以系统必须有一层比单站点更高的“调度大脑”。

---

## 2.3 AI 不是抓取器，AI 是解释器

前面的讨论已经反复收敛出一个很关键的判断：

> **不要让 AI 临时决定怎么抓页面；让 AI 决定“要什么”，系统决定“怎么拿”。**

这意味着：

* AI 不该直接碰 selector
* AI 不该直接猜 DOM
* AI 不该绕过数据层吃整页网页

而应该先通过系统工具拿到结构化结果，再做解释和转述。

---

## 2.4 这是一个要长期维护的产品，不是一次性 demo

你现在可以靠一两个抓包脚本跑通 demo。
但如果要做成长期能维护的产品，必须从一开始就考虑：

* 站点改版后怎么不全挂
* 哪一层负责 fallback
* 缓存和 diff 放哪里
* 导出和 AI 如何共用同一份数据
* Provider 接入如何独立演化
* 权限和隐私边界如何不被代码结构破坏

---

# 3. 总体架构原则 🧱

这套系统的设计，不是“先写再整理”，而是先遵守以下原则。

---

## 3.1 本地优先（Local-first） 🖥️

默认原则：

* 先在本地采集和解析
* 先在本地缓存结构化结果
* 先在本地生成导出文件
* 只有在用户明确触发 AI 时，才把**最小必要结构化摘要**发给模型层

### 为什么

这样同时满足三件事：

1. 更快
2. 更省成本
3. 更符合隐私和 Chrome Web Store 风险控制思路

---

## 3.2 站点适配器边界清晰（Adapter-first） 🔌

每个站点都必须有自己独立的适配器：

* `canvas`
* `gradescope`
* `edstem`
* `myuw`

### 为什么

因为你真正难的地方不是 UI，也不是聊天，而是：

> **不同站点的数据到底怎么稳定拿到。**

---

## 3.3 统一 Schema 优先（Schema-first） 🧬

系统必须先有统一对象语言，再谈 AI、导出和排序。

### 统一对象示意

* `Course`
* `Assignment`
* `Announcement`
* `Message`
* `Grade`
* `Event`
* `Alert`

### 为什么

如果没有统一 schema，系统就会退化成：

* 每个站点一套字段名
* AI 每次都重新理解原始站点数据
* 导出层没法复用
* 排序规则没法统一

前面讨论里已经明确：**统一语义层**是整个产品真正的中枢之一。

---

## 3.4 AI 不直接碰网页（AI after Structure） 🤖

AI 在架构中的位置是：

* 意图识别
* 工具调用编排
* 结果解释
* 风险说明
* 自然语言总结

AI 不应该负责：

* 直接抓页面
* 决定 selector
* 猜网站结构
* 临时从 DOM 拼语义

---

## 3.5 抓取策略采用三级降级（Fallback Pipeline） 🔄

最终采用：

> **Private / Official API → Page State → DOM**

### 为什么不是 API → DOM

因为现代网页中间通常还有一层非常值钱的状态源：

* `window.__INITIAL_STATE__`
* hydration payload
* script 里的 bootstrapped JSON
* 内嵌初始化数据

这层通常：

* 比 DOM 稳
* 比 DOM 干净
* 比完整逆向请求简单

所以它必须被独立看待。

---

## 3.6 导出和 AI 是并列主能力 📤💬

系统不是“先 AI，顺手再导出”。

而是两条并列主线：

### 主线 A：导出与去噪

用户不聊天，也能拿到干净结果。

### 主线 B：AI 问答与解释

用户可以直接问一句话拿结论。

这在前面的讨论里已经被明确提升成产品主线，而不是附属功能。

---

# 4. 总体系统分层图 🗺️

下面是这套系统最推荐的总体分层。

```text
用户
  ↓
Extension Shell（Popup / Sidepanel / Options / Background / Content Script）
  ↓
Core Orchestrator（意图识别、调度、合并、排序、fallback）
  ↓
Site Adapters（Canvas / Gradescope / EdStem / MyUW）
  ↓
Collectors（API / Page State / DOM）
  ↓
Unified Schema（Course / Assignment / Announcement / Grade / Event / Alert）
  ↓
Storage / Cache（本地数据库、diff、sync metadata）
  ↓
AI Provider Connector（OpenAI / Anthropic / Gemini）
  ↓
Thin Backend / BFF（仅处理 AI 请求代理、OAuth、限流、日志）
  ↓
Exporter（JSON / CSV / Markdown / ICS）
```

> **最重要的观察点：**
> AI 和 Export 都不直接接站点原始数据；它们都只接触统一 schema 之后的结构化结果。

---

# 5. 各层详细说明 🧩

---

## 5.1 Extension Shell 层：浏览器扩展本体

这是整个系统最外层，也是用户最先接触到的部分。

### 包含哪些入口

* Popup
* Sidepanel
* Options
* Background Service Worker
* Content Script

### 这一层负责什么

#### UI 相关

* 展示首页概览
* 展示 AI 问答结果
* 展示导出按钮
* 展示连接状态、同步状态

#### 浏览器能力相关

* 注入页面
* 与当前网页交互
* 发起下载
* 请求站点权限
* 与本地缓存读写
* 与薄后端通信

### 这一层不该负责什么

* 不负责真正的站点业务解析
* 不负责统一语义转换
* 不负责 AI 的核心推理逻辑
* 不负责站点 fallback 决策

### 为什么这样切

因为浏览器扩展天然是多入口系统。
如果你把业务逻辑散在 popup、content script、background 里，后面一定会变得不可维护。

---

## 5.2 Site Adapter 层：站点采集与翻译核心

这是系统最值钱的一层，也是最不能乱的地方。

### 每个站点一个 Adapter

* `CanvasAdapter`
* `GradescopeAdapter`
* `EdStemAdapter`
* `MyUWAdapter`

### 每个 Adapter 的职责

1. 判断当前站点是否可运行
2. 判断当前资源支持哪些抓取模式
3. 选择或暴露 collector
4. 读取站点原始数据
5. 归一化为统一 schema

### 它不是简单“抓网页”脚本

它更像：

> **每个站点的“数据接入驱动 + 语义翻译器”。**

### 典型能力接口（概念层）

* `isAvailable()`
* `getCourses()`
* `getAssignments()`
* `getAnnouncements()`
* `getMessages()`
* `getGrades()`
* `getEvents()`

### 为什么这层必须独立

因为：

* UI 不该知道怎么抓 Canvas
* AI 不该知道怎么抓 Gradescope
* Export 不该知道 MyUW 页面结构
* Orchestrator 不该知道具体 selector

---

## 5.3 Collector 子层：每个资源的具体抓取实现

Adapter 之下，不应直接写成“这个站点只走 API”或者“这个站点只走 DOM”。

更合理的结构是：**每种资源都有多个 collector**。

### 例如 `Assignments`

1. API Collector
2. Page State Collector
3. DOM Collector

### 为什么要细到资源级

因为一个站点内部，不同资源的最佳抓取路径也不同。

例如 Canvas：

* assignments：官方 API 很稳
* announcements：官方 API 也很稳
* 某些页面细节：DOM 更方便
* 某些前端渲染信息：page state 更自然

### 所以正确抽象不是

> “Canvas 只有一种抓法”

而是：

> “Canvas 针对不同资源，有不同 collector 组合。”

---

## 5.4 Unified Schema 层：统一数据中枢

这一层不是“为了优雅而优雅”。
它是系统真正能回答跨站点问题的前提。

### 为什么必须统一

因为这些原始对象在不同站点里叫法不同、结构不同、字段不同，但在用户认知里它们是同一类事：

* Canvas 作业
* Gradescope 作业
* 某网站里叫 deadline item
* 另一个网站里叫 submission task

对用户来说，它们都是：

> **“我要交的东西”**

所以系统需要一个统一对象：

* `Assignment`

同样地：

* 课程 → `Course`
* 公告 / instructor post → `Announcement`
* 成绩 → `Grade`
* 时间项 / deadline / class info → `Event`

### 这层的作用

1. 让 AI 能跨站点理解
2. 让导出层只面对一种数据语言
3. 让告警和优先级引擎能统一工作
4. 让后续增加新站点时，不用推翻整个系统

---

## 5.5 Core Orchestrator 层：调度大脑

这一层是系统真正的“脑子”。

它不处理网站细节。
它处理的是：

* 用户问了什么
* 需要拉哪些资源
* 该调哪些 adapter
* 何时触发 fallback
* 结果怎么合并
* 结果怎么排序
* 结果怎么产生 alerts / timeline
* 接下来交给 AI 还是 Export

### 一个典型流程

用户问：

> 我最近需要关注什么？

Orchestrator 可能做的是：

1. 识别意图：这是“priority alert / recent update”类型问题
2. 调用资源：

   * assignments
   * recent announcements
   * recent grades
   * timeline deltas
3. 合并并去重
4. 套用规则和评分
5. 生成结构化 alert 列表
6. 交给 AI 转成人话

### 这一层为什么不能省

因为如果没有它，系统会退化成：

* UI 直接调 adapter
* adapter 直接吐结果
* AI 每次自己拼业务逻辑

那样后面会非常乱。
Orchestrator 的存在，就是把“**用户问题**”和“**站点实现**”隔开。

---

## 5.6 Storage / Cache 层：本地记忆层

### 为什么必须有本地存储

这个系统不是一次性读取器。
它天然需要保留：

* 最近同步时间
* 上次和这次的差异
* 哪些东西是新出现的
* 哪些东西已经看过
* 上次 AI 总结结果
* 本地导出历史
* 失败记录

### 它至少要支持的能力

1. 缓存结构化实体
2. 存同步 metadata
3. 记录上次使用的采集模式
4. 做 diff（例如：新公告、新成绩）
5. 支持 timeline 构建
6. 支持离线快速打开

### 为什么不用 `chrome.storage` 当主数据库

`chrome.storage` 更适合：

* 配置
* 小量状态
* 简单开关

但不适合：

* 大量实体缓存
* 历史 diff
* 查询、排序、索引
* 长期维护的数据层

所以更合理的是 IndexedDB + Dexie 这一类浏览器本地数据库方案。
这是前面的技术栈讨论已经明确偏好的方向。

---

## 5.7 AI Provider Connector 层：模型能力接入层

这层必须独立。
它和学校站点 adapter 是两回事。

### 它负责什么

* 对接 OpenAI / Claude / Gemini
* 管理不同认证模式
* 抽象 provider 差异
* 给 AI runtime 提供统一调用入口

### 它不负责什么

* 不负责抓学校网站数据
* 不负责站点 fallback
* 不负责具体业务实体解析

### 推荐支持的认证模式

1. `api_key`
2. `oauth`
3. `web_session`（实验模式）

### 为什么单独成层

因为“读取学校数据”和“调用模型”根本不是同一类问题。
如果耦合在一起，后面会出现很糟糕的维护连带。

前面的讨论已经收敛出这一点：
Provider Connector 应该独立于学校站点接入层存在。

---

## 5.8 Thin Backend / BFF：AI 代理与受控后端

### 为什么要有薄后端

因为扩展直接拿 API Key 去调模型，虽然技术上可行，但长期看很不稳：

* key 安全性差
* 难做限流
* 难做日志
* 难做模型路由
* 难做 OAuth 回调
* 难做风控与可观测性

### 所以薄后端应负责

* AI 请求代理
* Provider 路由
* OAuth 回调
* 配额和日志
* Provider-specific 配置

### 扩展应负责

* 本地采集
* 本地缓存
* 本地导出
* 只把最小必要结构化结果交给后端

这也是前面技术栈和架构讨论里反复建议的方向。

---

## 5.9 Export / Presentation 层：导出与人类结果层

这一层不是“最后顺手格式化一下”。

它是一个独立、稳定、可复用的能力层。

### 它负责什么

* JSON 导出
* CSV 导出
* Markdown 导出
* ICS 导出
* 生成人类可读视图（如“本周待办”）

### 它应该吃什么数据

**只吃统一 schema 之后的结构化数据。**

### 它不该吃什么

* 不该吃原始 DOM
* 不该吃站点私有响应原文
* 不该自己做站点解析

### 为什么必须独立

因为导出在这个产品里不是配角。
它和 AI 是并列主能力。

---

# 6. 端到端数据流：用户一次提问，系统怎么跑 🚦

下面用两个典型场景解释。

---

## 6.1 场景 A：用户问“我还有什么作业？”

### 流程

1. 用户在 Sidepanel 提问
2. UI 把问题发给 Background
3. Background 交给 Orchestrator
4. Orchestrator 做意图识别：`GET_PENDING_ASSIGNMENTS`
5. Orchestrator 调：

   * Canvas assignments
   * Gradescope assignments
   * （必要时）其他站点 event/deadline
6. 各站点 adapter 内部按 collector 顺序尝试：

   * API
   * Page State
   * DOM
7. 返回原始结果后，先归一化成统一 `Assignment`
8. Storage 层写缓存，并记录 fetch metadata
9. Orchestrator 合并、去重、排序
10. 若用户只想看列表：直接展示
11. 若用户要 AI 总结：把结构化结果发给 AI Runtime
12. AI 返回自然语言答案

### 关键点

> AI 不是去找 DOM 的，AI 是在“统一作业列表”之上做解释的。

---

## 6.2 场景 B：用户点击“导出最近消息”

### 流程

1. 用户点击导出按钮
2. Background 把请求交给 Orchestrator
3. Orchestrator 拉取：

   * announcements
   * messages / posts
   * notices
4. 各站点 adapter 采集并归一化
5. Storage 写入最新 snapshot
6. Export 层将统一对象格式化为：

   * Markdown
   * CSV
   * JSON
7. 浏览器扩展发起本地下载

### 关键点

> 导出能力不需要 AI 参与，也不应该依赖 AI 参与。
> 它是系统独立闭环的一部分。

---

# 7. 各站点架构策略表 🌐

这是系统非常关键的一部分：
**站点不同，策略必须不同。**

| 站点             | 推荐主路线                       | 推荐 fallback      | 架构判断                          |
| -------------- | --------------------------- | ---------------- | ----------------------------- |
| **Canvas**     | 官方 API 优先                   | Page State / DOM | 不建议把核心逻辑绑死私有前端接口              |
| **EdStem**     | Session-backed / 私有或半公开接口优先 | Page State / DOM | 更接近 undocumented token API 场景 |
| **Gradescope** | 私有请求 / internal request 优先  | Page State / DOM | 官方无 public API，接受脆弱性          |
| **MyUW**       | DOM / Page State 优先         | 站内 JSON 作为补强     | 不假设普通第三方能直接消费官方后端能力           |

### 为什么这样分

因为前面的研究已经明确：

* Canvas 和 Gradescope 不是一种站
* EdStem 和 MyUW 也不是一种站
* “都走 cookies + 私有接口”是过度简化

---

# 8. 采集策略设计：为什么是 `API → Page State → DOM` 🔍

这一节是整个架构文档里最关键的部分之一。

---

## 8.1 第一级：Official / Private API

### 优点

* 最结构化
* 最容易做排序和计算
* 最适合增量同步
* 解析最省力

### 缺点

* 不一定公开
* 不一定稳定
* 可能需要动态参数 / header / session
* 不适合承诺“永远不变”

### 适合哪些站点 / 资源

* Canvas 大部分主资源
* EdStem 某些 thread / post / activity 数据
* Gradescope 某些 internal requests

---

## 8.2 第二级：Page State

### 它是什么

页面已经注入给前端使用的结构化状态，比如：

* hydration 数据
* bootstrap JSON
* 全局 state
* 脚本里的初始化对象

### 为什么很重要

它往往是：

* 比 DOM 更稳
* 比 DOM 更干净
* 比完全逆向请求更容易
* 比硬抓 selector 风险低

### 适合哪些站点 / 资源

* SPA 页面
* React/Next/Vue 前端站点
* Dashboard 类页面

---

## 8.3 第三级：DOM

### 优点

* 几乎永远能当兜底
* 用户眼睛看到的内容大概率也能读到
* 不依赖你必须完全摸清站点内部请求

### 缺点

* 最脆弱
* 最容易被改版打断
* 噪声最大
* 结构最不统一

### 适合哪些情况

* 页面上确实有信息但接口不可复用
* 只是做 MVP 验证
* MyUW 这类普通第三方难以稳定接入后端能力的场景

---

## 8.4 为什么不能简单写成“全部 DOM fallback”

因为 DOM 兜底只是兜底。
系统真正要长期可维护，必须先尝试更稳定、更结构化的上层来源。

---

# 9. AI 在系统中的正确位置 🤖

这一节非常关键，因为它决定这个项目会不会变成“看起来聪明、实际不稳”的系统。

---

## 9.1 AI 应该做什么

### AI 的正确职责

1. 意图识别
2. 工具调用编排
3. 结果解释
4. 风险说明
5. 周计划 / 总结生成

### AI 适合处理什么输入

* 已经结构化的 assignments
* 已经结构化的 announcements
* 已经结构化的 alerts
* timeline diff
* summary candidates

---

## 9.2 AI 不应该做什么

### 不应该：

* 直接抓网页
* 直接决定 selector
* 直接判断应该点哪个按钮
* 直接解析站点原始 DOM
* 绕过 schema 层消费原始数据

### 为什么

因为这类做法：

* 不稳定
* 不可测试
* 不可缓存
* 不可复用
* 不利于长期维护

前面的讨论已经明确把这种“AI 直接 DOM agent”式思路排除为主路线。

---

## 9.3 正确模式：Tool-using Assistant

用户问：

> “我需要关注什么？”

系统不是让 AI 自己去网页上翻。
而是：

1. 先识别意图
2. 调 `getAssignments`
3. 调 `getRecentUpdates`
4. 调 `getRiskAlerts`
5. 拿到结构化结果后
6. 再让 AI 解释“为什么值得关注”

这才是适合产品化的 AI 架构。

---

# 10. 本地存储与时间线能力：为什么不能只看“当前一帧” 🕰️

如果系统只会读“当前网页现在长什么样”，那它其实还不是一个真正有用的学习助手。

真正有用的地方在于它能回答：

* 最近两天发生了什么变化？
* 哪个老师刚刚发了新公告？
* 哪些作业是新出现的？
* 哪些成绩是刚出的？
* 哪些事情虽然页面上不显眼，但实际上是新增的？

### 所以本地层至少应该支持

* 历史 snapshot
* diff 记录
* 同步 checkpoint
* 新旧变化比较
* 最近 24h / 48h 变化视图

前面的对话里甚至已经提出了 “统一事件时间线” 这个方向，它本质上依赖的就是本地历史能力。

---

# 11. 权限、隐私与安全边界在架构中的体现 🔐

这不是单独的“合规附件”，而是架构本身的一部分。

---

## 11.1 权限边界

系统应默认：

* 只支持明确站点
* 只申请明确 host permissions
* 能按需申请就按需申请
* 不做全网权限

### 为什么

因为这个项目必须保持 **single-purpose** 的产品姿势，而不是演变成“全网页情报扩展”。
前面的讨论已经明确把这一点看成产品能否长期生存的关键。

---

## 11.2 数据边界

系统应默认：

* 本地解析
* 本地缓存
* 本地导出
* 不默认上传原始网页
* 不默认上传 cookies
* AI 只接收最小必要结构化结果

### 为什么

这是“本地优先 + 最小必要上传”原则的具体落地。

---

## 11.3 Provider 连接边界

系统应区分：

* 官方 API / OAuth
* Web session（实验）
* 站点数据采集 session
* AI provider session

不要把这些混成同一种“登录态”。

---

# 12. 为什么这套架构比几个常见替代方案更合适 ⚖️

---

## 12.1 替代方案 A：AI 直接读 DOM

### 看起来的优点

* 快
* demo 很酷
* 一开始代码少

### 真正的问题

* 站点一改版就炸
* 不可测
* 不可缓存
* 不可统一导出
* AI 成本高
* 很难做跨站点语义整合

### 结论

不适合作为主架构。

---

## 12.2 替代方案 B：所有站点都走私有接口 + raw cookies

### 看起来的优点

* 快
* 结构化
* 省 DOM 解析

### 真正的问题

* cookies 只解决认证的一部分
* 不同站点接口契约差异极大
* 改版风险高
* 站点权限模型不同
* 容易导致权限和隐私设计失衡

### 结论

不适合作为统一唯一主路线。
更合理的是：**按站点能力分层接入。**

---

## 12.3 替代方案 C：没有 Unified Schema，直接把原始结果交给 AI

### 看起来的优点

* 少写一层转换
* 早期快

### 真正的问题

* AI 每次都重新理解异构数据
* 导出没法统一
* 规则引擎没法统一
* 新站点接入成本更高

### 结论

Schema-first 仍然是正确路线。

---

## 12.4 替代方案 D：没有薄后端，扩展直接调所有 AI Provider

### 看起来的优点

* 少一层服务
* 起步快

### 真正的问题

* key 安全差
* 不利于后续模型切换
* 不利于日志、限流、配额
* OAuth 回调复杂
* 非技术用户体验差

### 结论

长期看仍应采用薄后端 / BFF。

---

# 13. 第一阶段（Phase 1）架构切片 ✅

这一节非常重要，因为系统架构不能一上来全铺开。

---

## 13.1 第一阶段优先支持的站点

1. **Canvas**
2. **Gradescope**

### 为什么

因为这两个最直接覆盖：

* 作业
* 提交
* 成绩
* 近期更新

它们最能支撑三个核心用户问题。

---

## 13.2 第一阶段优先支持的资源

* assignments
* announcements / recent updates
* grades（可选进入 1.5）
* basic alerts

---

## 13.3 第一阶段必须落的层

### 必须做

* Extension Shell
* Canvas / Gradescope adapters
* Unified Schema 最小版
* Core Orchestrator 最小版
* Storage 最小版
* Exporter 基础版
* AI 总结入口
* Sidepanel 首页与问答

### 可以先简化

* EdStem / MyUW
* Timeline 深水区
* 高级 alert engine
* Provider 多模式连接
* Web session provider connector

---

## 13.4 第一阶段明确不做

* 自动发帖
* 自动提交
* 多步 agent
* 全资源全站点同步
* 复杂协同功能

前面的讨论已经明确建议第一阶段保持 **read-only**。

---

# 14. 后续文档应该如何承接本架构 📚

本架构文档写完后，后面的文档应该按这个顺序接：

## 1）`03-domain-schema.md`

要把：

* `Course`
* `Assignment`
* `Announcement`
* `Message`
* `Grade`
* `Event`
* `Alert`

逐个定义清楚。

---

## 2）`04-adapter-spec.md`

要把：

* 通用 adapter 契约
* collector 机制
* fallback 规则
* 四站差异策略

写清楚。

---

## 3）`05-ai-provider-and-runtime.md`

要把：

* AI Runtime 角色
* Provider Connector
* API key / OAuth / web_session 模式
* 薄后端职责

写清楚。

---

## 4）`06-export-and-user-surfaces.md`

要把：

* 首页视图
* Sidepanel 布局
* Export 入口
* 格式映射

写清楚。

---

## 5）`07-security-privacy-compliance.md`

要把：

* host permissions
* optional permissions
* 本地优先
* 数据最小化
* 商店披露边界

写清楚。

---

# 15. 当前架构状态：哪些已经定了，哪些还没完全定 🧾

## 已经基本拍板的

* 产品是“学业信息整理与 AI 辅助”，不是万能网页 AI
* Site Adapter 是系统核心
* Unified Schema 是数据中枢
* 抓取策略采用 `API → Page State → DOM`
* AI 不直接碰网页
* Export 与 AI 并列
* 本地优先
* 薄后端更合适
* Phase 1 先做 read-only、先做 Canvas + Gradescope

---

## 还没完全定死的

* Unified Schema 的最终字段细节
* Provider Runtime 第一阶段是否先只接一家模型
* Provider web session 具体是否进入 Phase 1
* MyUW / EdStem 的 collector 优先顺序细节
* Timeline 是否放进 Phase 1.5 还是 Phase 2
* 规则引擎与 AI 输出的具体边界线

---

# 16. 最终拍板版（给人看，也给 Codex 看）📌

> **最终系统架构如下：**
> 这是一个本地优先的浏览器扩展系统。扩展本体负责 UI、页面注入、消息通信和本地下载；站点数据通过独立的 Site Adapter 层采集，每个资源按 **Private / Official API → Page State → DOM** 的顺序自动降级；采集结果统一翻译为一套共享的 Unified Schema，并进入 Core Orchestrator 进行调度、合并、去重、排序、告警和时间线构建；AI 不直接接触网页，而只消费结构化结果，并通过独立的 AI Provider Connector 与薄后端协作完成问答、总结和解释；导出层与 AI 层并列，负责将统一数据输出为 JSON、CSV、Markdown 与 ICS。整个系统的核心护城河不是聊天框，而是 **Site Adapters + Unified Schema + Fallback Pipeline + Priority Logic**。

---

# 17. 当前文档状态 📝

* **文档名**：`02-system-architecture.md`
* **状态**：第一版正式架构文档，可继续作为后续文档和 Codex 实现的上游上下文
* **用途**：

  1. 给你自己确认系统结构是否清楚
  2. 给 Codex 提供不容易跑偏的总体边界
  3. 给协作者快速理解“为什么要这么分层”
  4. 作为后续 schema / adapter / provider / exporter 文档的母文档

---

下一步最自然的是我继续帮你写 **`03-domain-schema.md`**。
