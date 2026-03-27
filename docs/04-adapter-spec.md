# `04-adapter-spec.md`

# 🔌 校园学习信息整理与 AI 辅助插件 —— Site Adapter 规范文档

## 面向 Canvas / Gradescope / EdStem / MyUW 的站点适配器设计说明

> **一句话先讲明白：**
> Adapter 不是“抓网页脚本”的别名。
> 它是这个系统里最重要的一层：**负责识别站点、读取站点数据、按统一策略做降级、再把结果翻译成统一 Schema。**
> 如果 `03-domain-schema.md` 解决的是“系统里数据应该长什么样”，那这份文档解决的就是：**这些数据到底怎么从各个站点拿进来，而且以后怎么不轻易全挂。**

---

# 0. 文档定位 👀

这份文档回答的是：

1. 什么叫 `Site Adapter`
2. 它和 `Collector / Fallback / Normalize / AI / Storage` 的边界怎么划
3. 每个 adapter 至少要实现哪些能力
4. 为什么要采用 **Private / Official API → Page State → DOM** 的三级降级
5. 四个站点分别应该怎么定策略
6. Codex 从空 Repo 开始写时，哪些地方不能乱写

这份文档**不是**：

* 具体 repo 文件树
* UI 文档
* AI provider 文档
* 最终 TypeScript 实现代码
* Chrome 审核文档

它只负责把 **“站点接入层”** 说清楚。

> **Current boundary registry note**
>
> Use [`integration-boundaries.md`](integration-boundaries.md) as the canonical registry for:
>
> - official vs internal paths
> - session-backed requests
> - page-state / DOM fallbacks
> - public-safe wording for each supported site

---

# 1. 先用最通俗的话说：Adapter 到底是什么 🧭

很多人第一次听到 adapter，会把它理解成：

* 某个网站的抓包脚本
* 某个网站的 DOM 解析器
* 某个网站的 API client

这些理解都只对了一部分。

更准确的说法是：

> **Adapter 是某个站点在系统中的“数据接入驱动 + 语义翻译器 + 降级协调器”。**

也就是说，一个 adapter 不只是“能抓到数据”，它还要负责：

1. 判断当前站点是否可运行
2. 判断当前资源适合走哪种抓取方式
3. 在失败时自动 fallback
4. 把原始结果翻译成统一 schema
5. 把来源、模式、错误、健康状态留痕

---

## 1.1 为什么 adapter 是整个系统的护城河 🛡️

前面的讨论里已经反复收敛到一个核心判断：

> **这个产品真正难、真正值钱的地方，不是聊天框，也不是接模型，而是能不能稳定拿到对的数据。**

所以系统真正的护城河不是：

* chat UI
* prompt
* 侧边栏壳子

而是：

* 站点检测
* 登录状态识别
* 页面解析
* 私有接口复用
* page state 抽取
* DOM 兜底
* normalize
* fallback
* 容错与健康检查

---

# 2. Adapter 要解决的核心矛盾 ⚖️

这个项目的 adapter 层，天然同时面对几组冲突：

## 2.1 快速拿数据 vs 长期可维护

* 私有接口通常更快、更干净
* DOM 通常更容易兜底
* 但两者都不该成为唯一真理

## 2.2 多站点差异大 vs 对外体验统一

* Canvas 和 Gradescope 不是一种站
* EdStem 和 MyUW 也不是一种站
* 但用户不应该被迫理解这些差异

## 2.3 AI 很灵活 vs 工程必须可控

* AI 适合做意图识别和解释
* AI 不适合现场猜 selector、猜按钮、猜 DOM 结构
  这一点在前面已经明确排除了。

## 2.4 MVP 要快 vs 后面还要扩

* 第一阶段只做少数站点、少数资源、read-only
* 但从一开始就要为后续扩展留接口，而不是写死脚本

---

# 3. Adapter 层的总设计原则 🧱

---

## 3.1 一个站点一个 Adapter，不搞万能抓包引擎

系统应当有清晰的站点边界：

* `canvasAdapter`
* `gradescopeAdapter`
* `edstemAdapter`
* `myuwAdapter`

### 为什么

因为：

* 站点能力不同
* 登录模型不同
* 资源结构不同
* 风险等级不同
* 改版频率也不同

万能引擎在 demo 里很酷，在产品里往往会变成维护灾难。

---

## 3.2 一个站点内部，也不是“一种抓法”

不能把 adapter 写成：

* Canvas = API 模式
* MyUW = DOM 模式

这种写法太粗，会害死后面扩展。

更合理的是：

> **每个站点里，不同资源都可以有不同 collector 组合。**

例如在 Canvas 里：

* assignments：更适合 API
* announcements：更适合 API
* 某些页面提示：更适合 state / DOM

所以 adapter 的最小工作单元，不是“整站点模式”，而是：

> **站点 × 资源 × collector 策略**

---

## 3.3 采集顺序固定为：`Official/Private API → Page State → DOM`

你前面最初说的是“私有 API 首选，失败自动 fallback 到 DOM”。
这个方向对，但还不够完整。更稳的最终版本已经收敛为：

> **Official / Private API → Page State → DOM**

### 为什么中间要加 `Page State`

因为现代站点很多时候并不是只有：

* 网络请求
* 最终 DOM

中间还有一层很值钱的东西：

* `window.__INITIAL_STATE__`
* hydration payload
* bootstrapped JSON
* script 内嵌状态

它往往：

* 比 DOM 稳
* 比 DOM 干净
* 比 DOM 少噪声
* 比完整逆私有请求简单

---

## 3.4 Adapter 只负责“拿数据 + 翻译数据”，不负责 AI 推理

Adapter 的输出必须是统一 schema，而不是自然语言。
它不应该直接回答：

* “你应该先做什么”
* “哪门课最危险”
* “这周最需要关注什么”

这些属于上层 orchestrator / alerts / AI 的职责。

---

## 3.5 Adapter 要尽量复用会话，但不要默认读 raw cookies

前面的讨论里，这一点非常明确：

> **优先复用浏览器现有登录态，不要默认把“手动读取 cookie 值”当成主路径。**

### 为什么

因为“带着当前会话请求”与“主动读取 cookies 字符串”不是一回事：

* 前者是更自然的浏览器同源/受控请求思路
* 后者权限更重、审核更敏感、代码也更脆

所以 adapter 的设计应该优先支持：

1. 复用现有会话请求
2. 只在确实需要时，才显式读取敏感 cookie / token

---

# 4. Adapter 在系统里的边界 📦

为了防止将来 repo 写乱，这里把边界一次性钉清楚。

---

## 4.1 Adapter 负责什么 ✅

### 负责：

1. 识别站点是否匹配
2. 判断当前上下文可不可以运行
3. 识别当前资源支持哪些 collector
4. 运行 collector pipeline
5. 统一 normalize 到 schema
6. 返回结构化实体
7. 返回健康状态 / 能力信息 / 调试 metadata

---

## 4.2 Adapter 不负责什么 ❌

### 不负责：

1. 不负责 AI 总结
2. 不负责跨站点聚合
3. 不负责优先级解释
4. 不负责 Markdown / CSV / ICS 导出
5. 不负责长期存储策略
6. 不负责用户自然语言理解

这些应该由：

* `core/orchestrator`
* `alerts`
* `ai`
* `exporter`
* `storage`

去做。

---

# 5. Adapter 的核心契约（概念规范）📐

下面这部分不是最终代码，而是你和 Codex 都应该共同遵守的“接口语义”。

---

## 5.1 `SiteAdapter` 最小接口

```ts
export interface SiteAdapter {
  site: 'canvas' | 'gradescope' | 'edstem' | 'myuw';

  canRun(ctx: AdapterContext): Promise<boolean>;
  getCapabilities(ctx: AdapterContext): Promise<AdapterCapabilities>;

  getCourses(ctx: AdapterContext): Promise<Course[]>;
  getAssignments(ctx: AdapterContext): Promise<Assignment[]>;

  getAnnouncements?(ctx: AdapterContext): Promise<Announcement[]>;
  getMessages?(ctx: AdapterContext): Promise<Message[]>;
  getGrades?(ctx: AdapterContext): Promise<Grade[]>;
  getEvents?(ctx: AdapterContext): Promise<Event[]>;

  healthCheck?(ctx: AdapterContext): Promise<HealthStatus>;
}
```

这个接口思路，前面的讨论里已经非常明确提出过，是整个 adapter 架构的灵魂。

---

## 5.2 每个方法的语义说明

### `canRun(ctx)`

回答的是：

> **当前这个 adapter 在这个页面 / 这个标签 / 这个登录状态下，是否值得运行。**

它不等于“当前请求一定能成功”，只是最初级的准入判断。

---

### `getCapabilities(ctx)`

回答的是：

> **这个站点此刻能提供什么能力，以及建议优先走哪些 collector。**

它不是简单的布尔值，而是 adapter 的“能力地图”。

---

### `getCourses() / getAssignments() / getAnnouncements() ...`

这些方法回答的是：

> **把某类资源作为统一 schema 拉出来。**

它们必须返回：

* 统一实体
* 不是站点原始 JSON
* 不是 HTML
* 不是自然语言解释

---

### `healthCheck()`

回答的是：

> **这个 adapter 当前健康吗？问题出在识别、鉴权、collector 还是 normalize？**

这个方法很重要，因为未来你会频繁排查：

* 为什么总退到 DOM
* 为什么某站点忽然抓不到
* 为什么 normalize 数量不对

---

# 6. `AdapterContext`：Adapter 运行时上下文 🧠

Adapter 不能靠全局乱取变量。
它必须运行在一个明确的上下文里。

---

## 6.1 建议结构

```ts
interface AdapterContext {
  tabId?: number;
  url: string;
  site: Site;
  pageHtml?: string;
  pageState?: unknown;
  runtimeAuth: RuntimeAuthState;
  now: string;
  debug?: boolean;
}
```

---

## 6.2 这个上下文至少要提供什么

### 1）当前页面信息

* 当前 URL
* 当前页面所属站点
* 必要时的 DOM / HTML 快照引用

### 2）页面状态信息

* 已抽取的 bootstrap state
* hydration payload
* 全局变量引用

### 3）鉴权上下文

* 当前是否登录
* session 是否存在
* 是否有 token 模式
* 是否需要提升权限

### 4）调试信息

* 是否开启 debug
* 本次是用户主动触发还是后台同步
* 是否允许回退到更脆弱的 collector

---

# 7. `AdapterCapabilities`：能力不是一句“支持 / 不支持” 🚦

能力信息一定不能做得太粗。

---

## 7.1 推荐结构

```ts
type ResourceName =
  | 'courses'
  | 'assignments'
  | 'announcements'
  | 'messages'
  | 'grades'
  | 'events';

interface ResourceCapability {
  supported: boolean;
  modes: FetchMode[];
  preferredMode?: FetchMode;
}

interface AdapterCapabilities {
  officialApi?: boolean;
  privateApi?: boolean;
  pageState?: boolean;
  dom?: boolean;
  resources: Record<ResourceName, ResourceCapability>;
}
```

---

## 7.2 为什么要设计这么细

因为真正的现实不是：

* Canvas 支持 API
* MyUW 不支持 API

而是更细的：

* Canvas 的 assignments 很适合官方 API
* Canvas 某些页面提示更适合 state / DOM
* Gradescope 的 grades 也许能从 internal request 拿
* MyUW 的 notices 更适合 DOM / state

你前面的对话已经清楚指出了这一点：
**fallback 应该按资源类型定，而不是按整站点一刀切。**

---

# 8. Collector：Adapter 内部真正执行抓取的最小单元 🛠️

Adapter 不应该自己一坨代码完成所有事情。
更推荐的做法是：

> **Adapter 暴露能力；Collector 负责具体资源的一种抓取方式。**

---

## 8.1 `ResourceCollector<T>` 概念

```ts
interface ResourceCollector<T> {
  resource: ResourceName;
  mode: FetchMode;
  priority: number;

  supports(ctx: AdapterContext): Promise<boolean>;
  collect(ctx: AdapterContext): Promise<T[]>;
}
```

这个思路在前面的讨论中已经被明确提出，而且是最稳的实现方式之一。

---

## 8.2 为什么一定要拆 collector

因为同一个 adapter 里会同时存在：

* API collector
* state collector
* DOM collector

如果不拆，后面会很快出现：

* if/else 巨树
* 某个资源修 bug 影响别的资源
* 无法单测
* 无法追踪“到底是哪层成功了”

---

## 8.3 推荐的 collector 目录形态

```text
canvas/
  api/
  state/
  dom/
  normalize/
  index.ts
```

这个目录思路在前面的架构讨论里已经非常明确。

---

# 9. Fallback Pipeline：不要“报错了再乱抓 DOM” 🔄

这一节是整个 adapter 文档里最关键的一段。

---

## 9.1 错误写法 ❌

错误写法通常长这样：

1. 先随便发几个请求
2. 报错了
3. 再开始乱抓 DOM
4. 哪怕拿到半条数据也当成功
5. 上层不知道到底用了哪种模式

这种写法短期看似能跑，长期一定会炸。
前面的讨论已经明确反对这种实现方式。

---

## 9.2 正确写法 ✅

正确写法应该是：

> **每类资源都走一条明确的计划（plan / pipeline），按优先级逐步尝试。**

例如：

```ts
Assignment collectors:
1. ApiCollector
2. PageStateCollector
3. DomCollector
```

运行规则：

1. 先判断 supports
2. 再 collect
3. 成功且数据有效才返回
4. 否则记录失败原因
5. 进入下一层 collector
6. 全部失败后，返回结构化错误

---

## 9.3 为什么是 `API → Page State → DOM`

这个顺序不是拍脑袋定的，而是前面对话已经收敛出的最终架构判断：

* API / internal request：最快、最结构化
* Page State：比 DOM 更稳、更干净
* DOM：几乎总能兜底，但最脆

---

## 9.4 一个 collector 成功，不等于就完全可信

这点非常重要。

前面的逆向讨论里已经提醒过：

> **不要把“能看见请求”误当成“已经能稳定复现接口”；不要把“工具很强”误当成“复杂站点一定一键成功”。**

把这条翻译到 adapter 设计里，就是：

* 成功拿到数据 ≠ 这个 collector 可以永久当主路线
* 能跑通一次 ≠ 这个 collector 适合当默认策略
* collector 成功与否，必须要有 metadata 和健康标记

---

# 10. Normalize：Adapter 的最后一道门 🧼

Collector 抓到的是站点原始结果。
但 adapter 返回给系统的必须是统一 schema。

这中间一定要有一层明确的 `normalize`。

---

## 10.1 Normalize 负责什么

1. 把原始字段映射成统一字段
2. 做时间格式统一
3. 做状态值统一
4. 补充 `site / source / url`
5. 丢弃站点噪声
6. 产生结构化错误，而不是偷偷吞掉

---

## 10.2 Normalize 不负责什么

* 不做优先级判断
* 不做 AI 总结
* 不做跨站点 dedupe
* 不做导出格式转换

这些应该由上层做。

---

## 10.3 为什么 normalize 必须单独存在

因为你前面已经明确：
这个项目不是“读网页”，而是“把不同网站的数据翻译成统一语言”。

所以 normalize 层不是附属物，而是 adapter 的一部分灵魂。

---

# 11. 四个站点的策略拍板版 🌐

这一节直接把最重要的差异钉死，防止 Codex 自己脑补成统一路线。

---

## 11.1 总表

| 站点             | 推荐主路线                      | 推荐 fallback             | 备注                   |
| -------------- | -------------------------- | ----------------------- | -------------------- |
| **Canvas**     | 官方 API 优先                  | Page State / DOM / 页面会话 | 不建议主路线绑死私有前端接口       |
| **EdStem**     | 私有/半公开接口优先                 | Page State / DOM        | 可选 token 模式          |
| **Gradescope** | 私有请求 / internal request 优先 | Page State / DOM        | 官方无 public API，接受脆弱性 |
| **MyUW**       | DOM / Page State 优先        | 站内 JSON 作为补强            | 不假设普通第三方能直接消费官方后端能力  |

这个结论不是新脑补出来的，而是前面的对话已经明确收敛出的最终版本。

---

## 11.2 Canvas 规范

### 正确理解

Canvas 是四个站里最不应该被简单写成“私有接口优先”的站。
因为它本来就有成熟官方 API。前面对话中对此已经明确强调。

### 推荐策略

1. assignments：官方 API 优先
2. announcements：官方 API 优先
3. grades：官方 API 优先
4. 某些页面碎信息：state / DOM 补足

### 不建议

* 把核心逻辑绑死某个前端内部 XHR
* 把“当前页面抓到的私有请求”当成长期承诺

---

## 11.3 EdStem 规范

### 正确理解

EdStem 更接近：

* 有 token
* 有 API 面
* 但公开文档不完整
* 社区很多做法依赖 undocumented / reverse-engineered 路线

### 推荐策略

1. session-backed internal request 优先
2. token 模式可选
3. state / DOM 作为 fallback

### 适合重点覆盖的资源

* threads
* unread / recent activity
* instructor-authored posts

---

## 11.4 Gradescope 规范

### 正确理解

Gradescope 官方没有 public API，这件事已经被前面对话明确确认。

### 推荐策略

1. internal request / private request 优先
2. state / DOM fallback
3. 接受“可用但脆弱”的现实

### 适合重点覆盖的资源

* assignments
* grades
* submission status

### 重要提醒

不要在文档或代码注释里把它误写成“稳定 API 接入”。

---

## 11.5 MyUW 规范

### 正确理解

MyUW 对普通插件最现实的路线是：

* DOM first
* page state first
* 观察到的 JSON 请求作为补强
  而不是把它写成“像 Canvas 一样的开放 API 站点”。

### 推荐策略

1. notices：state / DOM
2. events：DOM / embedded state
3. personalized widgets：DOM first
4. 站内 JSON：仅作增强，不作长期承诺

---

# 12. 资源级策略：不要把整站点写死 🧪

这一点值得单独强调一次。

---

## 12.1 错误写法

```text
Canvas = API mode
Gradescope = DOM mode
```

这种写法太粗，会让后面每加一个资源都要重构。

---

## 12.2 正确写法

```text
Canvas:
  assignments -> api > state > dom
  announcements -> api > state > dom
  page-hints -> state > dom

Gradescope:
  assignments -> private_api > state > dom
  grades -> private_api > state > dom
  current-page-detail -> state > dom

MyUW:
  notices -> state > dom
  events -> dom > state
```

前面的讨论已经明确建议：**fallback 是资源级的，不是整站级的。**

---

# 13. 健康检查、错误模型与可观测性 🩺

如果 adapter 不可观测，后面你一定会被站点改版折磨疯。

---

## 13.1 必须记录的东西

每次采集，至少记录：

* `site`
* `resource`
* `mode`
* `success`
* `fetchedAt`
* `latencyMs`
* `errorCode`（如果失败）

---

## 13.2 推荐错误分类

### A. 识别类错误

* 不是目标站点
* 页面结构不匹配
* 路由不支持

### B. 鉴权类错误

* 未登录
* session 过期
* token 缺失
* 权限不足

### C. collector 类错误

* 请求失败
* state 缺失
* selector 失效
* 返回格式变化

### D. normalize 类错误

* 必填字段缺失
* 状态映射失败
* 时间格式异常

### E. 策略类错误

* 无可用 collector
* fallback 全部失败

---

## 13.3 `healthCheck()` 建议输出

不要只返回 `true / false`。
更建议至少返回：

* 当前是否健康
* 哪类资源健康
* 当前偏向哪种 mode
* 最近失败的 collector 是谁

---

# 14. 测试规范：adapter 不测等于没写 🧪

前面的讨论里已经说得很明白：
你后面最怕的，不是代码写不出来，而是站点一改版就全挂。

---

## 14.1 每个 adapter 至少要有三类测试

### 1）Collector 测试

测试 API / state / DOM collector 在固定输入下能不能产出结果。

### 2）Normalize 测试

测试原始结果能不能稳定映射为统一 schema。

### 3）Fallback 测试

测试主 collector 失败时，是否真的会退到下一层，而不是直接报废。

---

## 14.2 夹具（fixtures）必须按站点单独维护

建议至少保留：

```text
fixtures/
  canvas/
  gradescope/
  edstem/
  myuw/
```

每个站点下可以有：

* html fixtures
* json fixtures
* state fixtures
* expected normalized outputs

这个方向在前面的讨论里也被明确提出过。

---

# 15. 安全与权限边界如何落到 adapter 层 🔐

adapter 设计不能假装自己和安全无关。

---

## 15.1 Adapter 应遵守的最低原则

1. 默认不上传 cookies
2. 默认不上传原始页面
3. 默认优先本地解析
4. 只返回统一结构化结果给上层
5. 对敏感能力要显式标记

这些都与前面收敛出的“本地优先、最小必要上传、AI 只吃结构化结果”的原则完全一致。

---

## 15.2 Adapter 不应自己偷偷决定的事

* 不应偷偷申请额外权限
* 不应偷偷读取和持久化全部 cookies
* 不应偷偷把整页内容送到 AI
* 不应绕过 orchestrator 直接向外部服务发送大包数据

---

# 16. Phase 1：你现在真正该让 Codex 先写哪些 adapter 内容 ✅

前面的产品和架构讨论已经明确：
第一阶段最稳的切片是：

* Canvas
* Gradescope
* assignments
* announcements / recent updates
* exporter
* AI summary
* sidepanel
* local storage

把这条翻译到 adapter 文档里，就是：

---

## 16.1 Phase 1 必做 adapter

### 1）CanvasAdapter

重点资源：

* `getAssignments()`
* `getAnnouncements()`
* `getCourses()`

### 2）GradescopeAdapter

重点资源：

* `getAssignments()`
* `getGrades()`（可弱支持）
* `getCourses()`（如果容易拿到）

---

## 16.2 Phase 1 可以先不做完整

### EdStemAdapter

先留接口，后面做：

* recent threads
* instructor posts
* unread

### MyUWAdapter

先留接口，后面做：

* notices
* events
* dashboard items

---

## 16.3 Phase 1 明确不做

* 自动操作网站
* 自动发帖
* 自动提交
* “AI 自己点按钮抓数据”
* 多步 agent 逆向流程常驻在主链路里

这些在前面对话里已经被明确排除出第一阶段。

---

# 17. 给 Codex 的硬规则 🤖

这一节直接写给未来会帮你写 repo 的 Codex。

---

## 17.1 不允许的写法 ❌

1. 不要把 adapter 写成“一个站点一个大文件”
2. 不要把 fallback 写成“try 一堆 fetch，不行就随手抓 DOM”
3. 不要让 AI 直接决定 selector
4. 不要把整站点只定义成一种抓法
5. 不要把 raw cookies 当默认方案
6. 不要让 exporter / ai 直接吃站点原始响应
7. 不要在 normalize 前把数据直接写入 storage

---

## 17.2 必须遵守的写法 ✅

1. 每个站点一个 adapter
2. 每类资源多个 collector
3. 采集顺序遵循 `Official/Private API → Page State → DOM`
4. normalize 必须单独存在
5. 每次采集必须记录 mode / success / failure
6. 所有输出必须进入统一 schema
7. 资源级 fallback，不能整站一刀切

---

# 18. 最终拍板版（给人看，也给 Codex 看）📌

> **最终 adapter 规范如下：**
> 每个目标站点都必须实现独立的 `SiteAdapter`，adapter 负责站点识别、能力判断、collector 调度、fallback、normalize 与健康检查。每个资源都必须按 **Official / Private API → Page State → DOM** 的顺序尝试 collector，而不是简单做“API 模式 / DOM 模式”二选一。Adapter 的输出必须始终是统一 schema，而不是原始站点响应，也不是自然语言。Canvas 采用官方 API 优先策略；EdStem 和 Gradescope 以 session-backed/private request 为主；MyUW 以 page state / DOM 为主。Adapter 层必须本地优先、尽量复用现有浏览器会话、默认不上传 cookies、默认不让 AI 直接读取网页。真正的系统护城河，不是聊天壳子，而是这一整套 **Site Adapter + Collector Pipeline + Normalize + Observability**。

---

# 19. 当前文档状态 📝

* **文档名**：`04-adapter-spec.md`
* **状态**：第一版正式 adapter 规范文档
* **用途**：

  1. 给你自己确认“站点接入层到底该怎么切”
  2. 给 Codex 提供明确的 adapter 设计边界
  3. 给后续 repo 实现提供 collector / fallback / normalize 的统一约束
  4. 给测试、可观测性和 Phase 1 排期提供上游依据

---

下一步最自然的是继续写 **`05-ai-provider-and-runtime.md`**。
