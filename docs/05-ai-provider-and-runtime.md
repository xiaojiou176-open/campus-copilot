# `05-ai-provider-and-runtime.md`

# 🤖 校园学习信息整理与 AI 辅助插件 —— AI Provider 与 Runtime 设计文档

## 面向 OpenAI / Anthropic / Gemini 的模型接入、认证模式与运行时架构说明

> **一句话先讲明白：**
> 这份文档要解决的，不是“这个项目要不要接 AI”——这个问题早就定了。
> 它要解决的是：**AI 在这个系统里到底负责什么、不负责什么；模型提供商怎么接；用户怎么登录；哪些是官方模式、哪些只是实验模式；以及整个 AI 运行时应该放在哪一层。**
> 前面的讨论已经很明确：这个产品不是“AI 直接读网页”，而是**先由站点 Adapter 把数据结构化，再由 AI 做意图识别、工具编排、总结、解释和优先级转述**。

---

# 0. 文档定位 👀

这份文档回答的是：

1. AI 在这个系统里的**正确角色**是什么
2. `AI Runtime` 和 `AI Provider Connector` 有什么区别
3. OpenAI / Claude / Gemini 应该如何接入
4. `API Key / OAuth / Web Session` 三种模式分别适合什么
5. 什么是**官方模式**，什么是**实验模式**
6. 为什么推荐 **AI SDK Core 这类编排层**，但又不把它神化成唯一答案
7. 为什么要走**薄后端 / BFF**，而不是让扩展前端直接拿 provider secret 硬调模型

这份文档**不是**：

* 学校站点 adapter 文档
* 统一 schema 文档
* repo 文件树文档
* Chrome 审核政策全文
* prompt 内容全集

它只负责把 **“模型接入与运行时”** 这件事彻底说清楚。📌

---

# 1. 先用 30 秒看懂：这层到底在解决什么 ⚡

## 1.1 一句话版

> **AI 层不是网页抓取层。**
> 它应该建立在 `Site Adapter → Unified Schema → Core Orchestrator` 之后，接收结构化结果，再去做：
> **意图识别、工具调用、流式回答、结构化输出、风险解释、周计划生成。**

---

## 1.2 这层真正要做的三件事

### 1）决定“该调什么工具”

比如：

* `getPendingAssignments`
* `getRecentUpdates`
* `getRiskAlerts`
* `getWeeklyPlan`

### 2）把结构化结果转成用户能看懂的话

比如：

* 你这周最重要的 3 件事
* 最近 48 小时有什么变化
* 哪门课最需要关注

### 3）把不同模型接入方式统一起来

让系统未来可以支持：

* OpenAI
* Claude
* Gemini
  而不是把业务代码写死在某一家 SDK 上。

---

## 1.3 这层**不该**做的事

### ❌ 不该：

* 不该直接读 DOM
* 不该直接猜 selector
* 不该自己去决定抓哪个页面节点
* 不该绕过 adapter 直接吃原始网页
* 不该默认拿到 cookies 和整页内容就丢给模型

这几点在前面的讨论里已经被明确否定过。
这个产品真正的稳定性，来自 **Adapter + Schema + Orchestrator**，不是来自“AI 临时猜网页”。

---

# 2. 为什么 AI Provider 与 Runtime 必须单独成层 🧱

这个问题非常关键。很多项目一开始会偷懒，把“调用模型”随手写到 UI 或 background 里，后面就会越来越乱。

---

## 2.1 因为“学校数据接入”和“模型接入”根本不是一类问题

这两类问题看起来都和“AI 插件”有关，但本质不同：

| 问题                                          | 本质                          |
| ------------------------------------------- | --------------------------- |
| 怎么从 Canvas / Gradescope / EdStem / MyUW 读数据 | 站点适配、采集、fallback、normalize  |
| 怎么调用 OpenAI / Claude / Gemini               | provider 接入、认证、配额、流式输出、工具调用 |

如果把它们揉在一起，后面一定会出现这种灾难：

* 改了 Canvas adapter，结果 Claude 登录逻辑坏了
* 改了 Gemini OAuth，结果 Gradescope 导出链路被影响
* UI 想加一个 provider，结果还得改站点抓取逻辑

这都是架构边界没立住的后果。⚠️

---

## 2.2 因为 provider 变化频率和站点变化频率不同

* 学校站点变的是：

  * 页面
  * 私有接口
  * DOM
  * state
* AI provider 变的是：

  * auth 模式
  * model 名称
  * SDK
  * tool calling 行为
  * 计费与限制

这两类变化不应该在一层里应对。

---

## 2.3 因为产品要支持“官方模式”和“实验模式”

你的前面对话已经很清楚：

* 一方面希望支持 **API Key / OAuth**
* 一方面又希望给不懂 API Key 的用户留一条路，比如参考 **ChatALL** 的思路，让用户复用自己已登录的 ChatGPT / Claude / Gemini 网页会话

这就意味着 Provider 层天然要支持多种认证模式。
这已经不是“调用一个 SDK”能讲完的事了。

---

# 3. 先把两个概念彻底分开：Runtime vs Provider 🧠

这是整份文档最关键的认知分界线。

---

## 3.1 什么是 `AI Runtime`

`AI Runtime` 指的是：
**你的应用内部，围绕模型生成能力搭出来的运行时编排层。**

它负责的事情包括：

1. 接收用户问题
2. 判断是纯聊天、还是工具调用
3. 调用工具
4. 收集工具结果
5. 把结果交给模型
6. 处理流式输出
7. 处理结构化输出
8. 返回最终答案给 UI

### 通俗一点说

它不是“某家模型的账号体系”，而是：

> **你自己的 AI 工作台 / 调度器。**

---

## 3.2 什么是 `AI Provider Connector`

`AI Provider Connector` 指的是：
**某个模型提供商（OpenAI / Anthropic / Gemini）在你系统里的接入适配器。**

它负责的事情包括：

* 支持哪些认证模式
* 如何建立会话
* 如何验证连接状态
* 如何发起生成请求
* 如何流式读取结果
* 如何处理 provider-specific 错误

### 通俗一点说

它不是“整个 AI 层”，而是：

> **接 OpenAI、Claude、Gemini 的那一小层“插头”。**

---

## 3.3 最终关系图

```text
用户问题
  ↓
AI Runtime
  ↓
Tools / Structured Inputs
  ↓
AI Provider Connector
  ↓
OpenAI / Anthropic / Gemini
```

也就是说：

* **Runtime 是总调度**
* **Provider Connector 是具体接头**

这两个必须分开。

---

# 4. AI 在这个产品里的正确角色 🎯

这个问题前面的讨论已经定过好几次了，这里把它正式写成文档规范。

---

## 4.1 AI 的主要职责

### 1）意图识别

把用户自然语言问题转成可执行意图。

例如：

* “我还有什么作业？” → `get_pending_assignments`
* “最近有什么消息？” → `get_recent_updates`
* “我需要关注什么？” → `get_priority_alerts`
* “帮我规划这周” → `get_weekly_plan`

---

### 2）工具编排

AI 不是去网页里翻，而是决定该调哪些系统工具。

例如：

* 调 assignments
* 调 announcements
* 调 grades
* 调 alerts

---

### 3）解释与总结

把系统已经拿到的结构化结果，转成：

* 人话
* 优先级说明
* 风险提示
* 可行动建议

---

### 4）结构化输出

AI 不只是“吐一段文字”，它也应该能产出：

* intent object
* summary object
* weekly plan object
* priority reasons

前面的讨论里已经明确指出：
这个项目很需要 **结构化输出**，而不只是普通文本聊天。

---

## 4.2 AI 明确不负责的事

### ❌ AI 不负责：

1. 直接抓学校网页
2. 直接读 DOM
3. 直接决定 selector
4. 自己猜网站结构
5. 绕过 schema 吃 raw 页面
6. 直接复用学校 cookies 发请求

这些都应该由：

* adapter
* collector
* normalize
* orchestrator

来做。

---

# 5. Provider Connector 总体架构 🔌

---

## 5.1 推荐的抽象对象

```ts
type ProviderId = 'openai' | 'anthropic' | 'gemini';
type AuthMode = 'api_key' | 'oauth' | 'web_session';
```

这组抽象在前面的讨论里已经被明确提出，而且非常适合你这个项目。

---

## 5.2 为什么只保留这三种认证模式

因为对这个项目来说，最现实、最清楚的模式就是：

### 1）`api_key`

给会配置 key 的用户
最稳定、最可控

### 2）`oauth`

给支持官方 OAuth 的 provider
最适合“非技术用户点一下登录”

### 3）`web_session`

给你参考 ChatALL 做的“网页账号会话复用模式”
但必须明确标成 **Experimental**。

---

## 5.3 为什么不把“网页登录密码”当成模式

因为这是一个坏主意。🚫

这份产品里**不应该**出现这种姿势：

* 在扩展里让用户输入 ChatGPT 密码
* 在扩展里让用户输入 Claude 网页账号密码
* 在扩展里模拟“官方网页登录”

正确做法是：

* 官方模式：API Key / OAuth
* 实验模式：用户先在官网登录，扩展只复用已有网页会话

这一点前面已经被非常明确地强调过。

---

# 6. 三种认证模式详解 🔐

---

## 6.1 模式一：`API Key`

### 它是什么

用户输入自己拥有的 provider API key，系统用它去调用官方模型 API。

---

### 优点 ✅

1. 最稳定
2. 最容易文档化
3. 最容易调试
4. 最适合正式产品
5. 不依赖网页前端结构

---

### 缺点 ⚠️

1. 非技术用户常常不知道什么是 API key
2. 用户可能没有开发者账户
3. 如果直接在扩展前端用 key，安全姿势不好

前面对话中已经明确提醒：
**API key 不适合直接暴露在浏览器前端，生产请求更适合走自己的薄后端。**

---

### 适合谁

* 愿意折腾的用户
* 开发者
* 高控制需求用户
* Phase 1 最稳妥的接入路径

---

## 6.2 模式二：`OAuth`

### 它是什么

让用户通过 provider 的官方授权流程，完成授权，而不是自己复制 API key。

---

### 优点 ✅

1. 对非技术用户更友好
2. 不要求用户理解 key
3. 更接近正式产品体验
4. 更适合“登录即可用”的交互方式

---

### 缺点 ⚠️

1. 不是所有 provider 都有合适的官方模型 OAuth 路线
2. 需要你自己的后端/BFF处理回调
3. 配置复杂度高于 API key

---

### 本项目里最重要的判断

前面的讨论里已经明确：

> **Gemini 是三家里最适合做“官方账户登录”路径的 provider，因为 Gemini API 官方支持 OAuth。**

所以：

* Gemini：OAuth 是正式路线之一
* OpenAI / Claude：不能假装它们也有同等级的消费者账户授权路径

---

## 6.3 模式三：`Web Session`（实验模式）

### 它是什么

用户先在 `chatgpt.com / claude.ai / gemini.google.com` 正常登录。
扩展不问密码，只检测并复用浏览器中已有的网页会话。

这条路线的思路，前面对话已经明确说要参考 **ChatALL**。

---

### 优点 ✅

1. 对不懂 API key 的用户更直观
2. 不要求用户切换到开发者产品
3. 对某些消费者型用户体验更自然

---

### 缺点 ⚠️

1. **不是官方稳定接入方式**
2. 极易受 provider 网页改版影响
3. 维护成本高
4. 不应该被包装成“官方登录能力”
5. 很适合作为实验模式，但不适合作为系统主路径

前面对话里明确提到：
ChatALL 自己都强调 **Web Access 比 API 更脆、更依赖 reverse engineering，API 更可靠**。

---

### 结论

> **Web Session 可以做，但必须标成 Experimental。**
> 它是“方便但不稳定”的能力，不是“正式官方接入方案”。

---

# 7. 三家 Provider 的拍板版策略 🌐

这一节直接把 OpenAI / Claude / Gemini 的最终建议钉死。

---

## 7.1 OpenAI / ChatGPT

### 当前最可信结论

前面的讨论中，没有找到一个**官方的“用 ChatGPT 消费者网页账户授权给第三方扩展直接调用模型 API”** 的路径。
因此：

* **官方模式**：API key
* **实验模式**：`chatgpt.com` web session
* **不能宣传成**：官方 ChatGPT 账号授权模式

---

### 推荐配置

| 项目                   | 建议                       |
| -------------------- | ------------------------ |
| `preferredAuthMode`  | `api_key`                |
| `supportedAuthModes` | `api_key`, `web_session` |
| `officialModes`      | `api_key`                |
| `experimentalModes`  | `web_session`            |

---

### UI 文案建议

* **Use OpenAI API key** ✅ Recommended
* **Use ChatGPT web account** ⚠️ Experimental, may break

---

## 7.2 Anthropic / Claude

### 当前最可信结论

前面的讨论中，同样没有找到一个**官方的“用 claude.ai 消费者网页账户授权给第三方扩展直接调用模型 API”** 的路径。
因此：

* **官方模式**：API key
* **实验模式**：`claude.ai` web session
* **不能宣传成**：Claude 官方账号授权模式

---

### 推荐配置

| 项目                   | 建议                       |
| -------------------- | ------------------------ |
| `preferredAuthMode`  | `api_key`                |
| `supportedAuthModes` | `api_key`, `web_session` |
| `officialModes`      | `api_key`                |
| `experimentalModes`  | `web_session`            |

---

### UI 文案建议

* **Use Anthropic API key** ✅ Recommended
* **Use Claude web account** ⚠️ Experimental, may break

---

## 7.3 Gemini

### 当前最可信结论

Gemini 是三家中最特殊的一家。
前面的讨论已经明确指出：

> **Gemini API 官方支持 OAuth 和 API key，因此它最适合做“非技术用户通过官方账户登录”的正式路径。**

---

### 推荐配置

| 项目                   | 建议                                |
| -------------------- | --------------------------------- |
| `preferredAuthMode`  | `oauth`                           |
| `supportedAuthModes` | `oauth`, `api_key`, `web_session` |
| `officialModes`      | `oauth`, `api_key`                |
| `experimentalModes`  | `web_session`                     |

---

### UI 文案建议

* **Sign in with Google for Gemini API** ✅ Recommended
* **Use Gemini API key**
* **Use Gemini web account** ⚠️ Experimental

---

# 8. Runtime 总体架构：这层到底怎么跑 🏃

---

## 8.1 推荐的生产链路

```text
用户问题
  ↓
Extension UI / Sidepanel
  ↓
Core Orchestrator
  ↓
结构化工具结果（schema objects）
  ↓
Thin Backend / BFF
  ↓
AI Runtime
  ↓
AI SDK / Provider Connector
  ↓
OpenAI / Anthropic / Gemini
```

---

## 8.2 为什么不是“扩展前端直接调模型”

因为前面的讨论已经反复指出几个现实问题：

1. API key 不适合硬塞前端
2. 需要统一配额、日志、限流
3. 需要支持多 provider
4. 未来需要模型切换
5. 还可能要做 prompt 模板和风控

所以更合理的是：

> **浏览器扩展负责采集与本地整理；AI 调用尽量走你自己的薄后端。**

---

## 8.3 薄后端 / BFF 负责什么

### 负责 ✅

1. provider 请求代理
2. OAuth 回调
3. model route / model selection
4. 限流 / 配额
5. 基础日志
6. provider-specific 配置隔离

### 不负责 ❌

1. 不负责站点抓取
2. 不负责 DOM 解析
3. 不负责统一 schema 生成
4. 不负责浏览器页面能力

---

# 9. 为什么推荐 AI SDK Core 这类编排层，而不是直接绑死某家 SDK 🧰

这一节要讲清楚“为什么推荐”，但不神化。

---

## 9.1 先把概念说透

前面的讨论已经明确：

> **OpenAI / Claude / Gemini 是 provider；AI SDK Core 这种东西是上层编排层。**
> 它不是替代 provider，而是把 provider 的调用方式统一起来。

---

## 9.2 为什么它适合这个项目

因为你的产品天然需要这几件事：

### 1）多 provider 切换

今天可能：

* 总结类先用 OpenAI
* 规划类试试 Claude
* 成本敏感任务以后切 Gemini

### 2）工具调用

这个产品不是“裸聊天”，而是：

* `getAssignments`
* `getRecentUpdates`
* `getRiskAlerts`
* `getWeeklyPlan`

### 3）结构化输出

你后面很可能会需要：

* intent object
* summary object
* weekly plan object
* priority reasons

### 4）流式输出

sidepanel 聊天几乎一定需要流式体验。

---

## 9.3 推荐理由（项目视角）

> 我推荐 **AI SDK Core 这类编排层**，不是因为它“最强”，而是因为它刚好卡在这个项目最合适的抽象层。
> 它比直接绑某一家 SDK 更灵活，又比上来就用重型 agent 框架更轻。

---

## 9.4 它不是唯一答案：替代路线对比表

| 方案                        | 适合什么情况                     | 优点            | 缺点               |
| ------------------------- | -------------------------- | ------------- | ---------------- |
| **直接官方 SDK**              | 你明确只用一家 provider           | 最简单、最贴近官方新能力  | 后面多 provider 会很痛 |
| **AI SDK Core / 类似编排层**   | 你要工具调用、结构化输出、流式、多 provider | 抽象层合适、业务代码更干净 | 多一层抽象            |
| **LangChain / LangGraph** | 你要复杂 agent / 长工作流          | 能力强           | 对当前项目偏重          |
| **Genkit**                | 偏 Google/Firebase 生态       | Google 生态顺手   | 对扩展 + 薄后端未必更合适   |
| **自己封装 HTTP**             | 想极度轻量且只接一两家                | 最可控           | 会重做很多胶水层         |

前面的讨论已经非常明确地给出这个判断：
**LangChain 不一定不行，但对你现在这个阶段偏重；AI SDK Core 更像一个轻量应用层编排器。**

---

## 9.5 什么时候反而不建议先上 AI SDK Core

### 情况 A：你 100% 确定只用一家

比如未来半年只用 OpenAI。
那直接官方 SDK 反而更简单。

### 情况 B：你非常依赖某家最新专有特性

那原生 SDK 往往会最先暴露能力。
抽象层可能会慢一拍。

---

# 10. Web Session 模式：可以做，但必须放对位置 🧪

这个部分要非常诚实地写。

---

## 10.1 为什么它存在

因为你前面对话里已经明确希望支持：

* 用户显式登录自己的 ChatGPT / Claude / Gemini 账号
* 而不是逼他们理解 API key
* 并且明确提出需要参考 **ChatALL**。

这说明：
Web Session 模式不是幻想需求，而是真需求。

---

## 10.2 为什么它不能是主路径

因为前面的讨论也明确了：

> **ChatALL 自己都承认 Web Access 更脆、更依赖 reverse engineering、维护性不如 API。**

所以正确定位必须是：

* 可做
* 有价值
* 方便用户
* 但必须标成 **Experimental**

---

## 10.3 正确产品姿势

### 正确 ✅

1. 用户先去官网正常登录
2. 扩展检测并复用已有会话
3. 不要求用户把网页登录密码输入给插件
4. 明确告知：这不是官方稳定模式
5. 默认本地使用，不要把 provider 会话上传到你自己的服务端

### 错误 ❌

1. 在插件里做假“官方登录页”
2. 让用户输入 ChatGPT / Claude / Gemini 网站密码
3. 把它包装成正式官方授权方案
4. 把 provider session 当成和 API OAuth 等价的稳定能力

---

## 10.4 ChatALL 在这个项目里的正确地位

前面的讨论已经拍板过：
**ChatALL 应该作为参考借鉴对象，而不是直接 vendor 成核心依赖。**

### 原因

1. 它是 Electron 桌面端，不是浏览器扩展
2. 它的目标是多 bot 对比，不是你的校园产品形态
3. 它自己都强调 web 模式脆弱
4. 你适合参考其思路和少量实现细节，然后自己重写 connector 边界

---

# 11. 安全与隐私原则：AI 层必须遵守什么 🔐

这一节必须写，因为 provider/runtime 的设计天然会碰到敏感数据。

---

## 11.1 最核心原则

### 1）默认本地优先

先在本地做：

* 数据采集
* schema 转换
* 缓存
* 导出

### 2）AI 只吃最小必要结构化结果

不要默认发：

* 原始页面
* 整页 HTML
* cookies
* 原始站点响应

### 3）不上传 provider cookies

特别是 Web Session 模式，不应把网页登录会话上传给自己的服务器。

### 4）不要求用户输入网站密码

这一点前面已经很明确了。

---

## 11.2 为什么这些原则必须写进 Runtime 文档

因为如果不写，Codex 后面非常容易犯这些错：

* 让扩展前端直接拿 provider key
* 把整页内容直接发模型
* 把 provider web session 当成官方稳定授权
* 在 UI 上省略“Experimental”标签

这些都不是小问题，而是会直接影响：

* 产品可信度
* 安全姿势
* 上架风险
* 维护成本

---

# 12. 推荐的用户连接体验（UX 规范）🎨

这个部分不是 UI 文案细节，而是产品交互策略。

---

## 12.1 不同 Provider 的推荐展示方式

### OpenAI

* **Use OpenAI API key** ✅ Recommended
* **Use ChatGPT web account** ⚠️ Experimental, may break

### Anthropic

* **Use Anthropic API key** ✅ Recommended
* **Use Claude web account** ⚠️ Experimental, may break

### Gemini

* **Sign in with Google for Gemini API** ✅ Recommended
* **Use Gemini API key**
* **Use Gemini web account** ⚠️ Experimental

这些呈现方式，基本就是前面对话里已经拍板的产品姿势。

---

## 12.2 为什么 UI 必须诚实标记

因为这不是小文案问题，而是防误解问题。

### 必须明确区分：

* **Official**
* **Recommended**
* **Experimental**
* **May break**
* **Local-only**

否则用户很容易误以为：

* ChatGPT 网页登录 = OpenAI 官方授权
* Claude 网页登录 = Anthropic 官方 API 方案

这会把整个产品带歪。

---

# 13. Phase 1 的 AI 接入建议 ✅

现在说最现实的落地方案。

---

## 13.1 Phase 1 最稳的组合

### 建议优先支持：

1. **OpenAI API key**
2. **Anthropic API key**
3. **Gemini OAuth**（如果你想照顾非技术用户）
4. **Gemini API key**（可选）

### 建议暂缓成为核心路径：

* ChatGPT web session
* Claude web session
* Gemini web session

这些更适合放进：

* `experimental`
* `labs`
* `advanced settings`

---

## 13.2 为什么这样排

因为前面的讨论已经给出了非常清楚的现实判断：

* OpenAI / Claude：API key 是当前最清楚的正式路径
* Gemini：OAuth 是最像“正式用户账户登录”的方案
* Web Session：有价值，但更脆、更像实验能力

---

## 13.3 Phase 1 的运行时能力优先级

### 必须有

* 流式回答
* 工具调用
* 结构化输出
* Provider 切换接口
* 基础错误映射

### 可以后补

* 多 provider 智能路由
* A/B testing
* provider fallback
* provider-specific optimization presets

---

# 14. 给 Codex 的硬规则 🤖

这一节直接写给未来实现 repo 的 Codex / 工程协作者。

---

## 14.1 不允许的写法 ❌

1. 不要让 AI 直接抓网页
2. 不要让 provider connector 和学校站点 adapter 混在一起
3. 不要把 `web_session` 写成官方稳定模式
4. 不要让用户在插件里输入 ChatGPT / Claude / Gemini 网站密码
5. 不要把 provider session 上传到你的后端
6. 不要让扩展前端长期持有生产环境 provider secret
7. 不要让 AI 吃 raw DOM / raw page by default
8. 不要把 OpenAI / Claude 的消费者网页登录伪装成官方 OAuth

---

## 14.2 必须遵守的写法 ✅

1. AI 只吃结构化结果
2. Provider Connector 独立成层
3. 认证模式统一抽象为 `api_key / oauth / web_session`
4. `web_session` 必须标记 `experimental`
5. 推荐生产模式使用薄后端 / BFF
6. UI 必须诚实区分 official / experimental
7. Runtime 必须支持 tool calling、streaming、structured output
8. 对不同 provider 保持同一组上层接口，避免业务层到处写 provider-specific 逻辑

---

# 15. 最终拍板版（给人看，也给 Codex 看）📌

> **最终 AI Provider 与 Runtime 设计如下：**
> 本项目的 AI 层不是网页抓取层，而是建立在 `Site Adapter → Unified Schema → Core Orchestrator` 之后的解释与编排层。AI 负责意图识别、工具调用、结构化输出、流式回答、风险解释和计划生成；它不直接读取网页，也不直接决定 selector。Provider 接入层独立于学校站点 adapter，统一支持三种认证模式：`api_key`、`oauth`、`web_session`。其中 OpenAI 与 Anthropic 以 `api_key` 为正式主路径，`web_session` 仅作为实验模式；Gemini 支持官方 `oauth` 与 `api_key`，因此是三家里最适合做“官方账户登录”体验的 provider。整个运行时推荐采用“扩展本地采集与整理 + 薄后端 / BFF 调用模型”的架构；在应用层，建议使用 AI SDK Core 这类轻量编排层来统一多 provider、tool calling、streaming 与 structured output，但不把它神化成唯一答案。ChatALL 适合作为 `web_session` 模式的研究样本与设计参考，不适合作为核心 vendor 依赖。

---

# 16. 当前文档状态 📝

* **文档名**：`05-ai-provider-and-runtime.md`
* **状态**：第一版正式 AI Provider / Runtime 设计文档
* **用途**：

  1. 给你自己确认“AI 这层到底该放哪、该怎么接”
  2. 给 Codex 提供 provider、auth、runtime 的明确边界
  3. 给后续 `06-export-and-user-surfaces.md`、`07-security-privacy-compliance.md` 提供上游约束
  4. 给未来的 repo 实现提供不容易跑偏的 AI 侧规范

---

下一步最自然的是继续写 **`06-export-and-user-surfaces.md`**。
