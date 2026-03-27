# `03-domain-schema.md`

# 🧬 校园学习信息整理与 AI 辅助插件 —— 统一领域模型（Domain Schema）文档

## 面向 Canvas / Gradescope / EdStem / MyUW 的统一数据语言设计

> **一句话先讲明白：**
> 这份文档不是在定义“怎么抓网页”，而是在定义：**抓到的数据，最后在系统里应该长成什么样。**
> 你这个项目真正做的，不是“抓网页脚本集合”，而是把 **Canvas、Gradescope、EdStem、MyUW** 这些站点里的异构信息，翻译成一套统一、稳定、可缓存、可导出、可被 AI 理解的数据语言。

---

# 0. 这份文档是干什么的 👀

本文档回答的是：

1. 系统里最核心的“数据对象”有哪些
2. 每个对象分别代表什么
3. 哪些字段是必须的，哪些是可选的
4. 跨站点数据怎么统一
5. 哪些数据属于“原始事实”，哪些属于“系统推导结果”
6. 哪些对象是给 AI、导出、缓存、告警共同复用的

本文档**不是**：

* adapter 接口文档
* repo 目录文档
* 存储实现文档
* API Provider 文档
* UI 文档

这份文档只做一件事：

> **给整个系统定义“共同语言”。**
> 没有这份文档，后面的 adapter、exporter、AI、storage、timeline 都会各说各话。

---

# 1. 为什么 `schema` 是最先要定的东西 📌

在前面的讨论里，已经有一个很明确的判断：

> **你不是在做“抓网页”，你是在做“把不同网站的数据翻译成统一语言”。**

这句话非常重要。
因为这决定了：

* UI 不能直接吃原始 DOM
* AI 不能直接吃原始网页
* 导出层不能直接面向站点私有响应
* 风险提醒不能每个站点写一套规则
* 新站点接入也不能推翻现有系统

所以 `schema` 的价值，不是“让代码好看一点”，而是：

## 它解决 4 个根问题

1. **跨站点统一理解**
   Canvas 的作业、Gradescope 的提交项、MyUW 的 deadline，本质上都可能要映射成“用户要完成的事”。

2. **AI 可解释**
   AI 不是去看 HTML，而是去看标准化结果。

3. **导出可复用**
   Markdown / CSV / JSON / ICS 都应该基于统一对象生成，而不是每个站点单独导。

4. **长期维护**
   站点改版时，最理想的情况是只改 adapter，不改上层所有代码。

---

# 2. 这套 Schema 的设计目标 🎯

## 2.1 第一目标：让人类读得懂

这份 schema 不是只给 TypeScript 编译器看的，也不是只给 Codex 写代码看的。
它也得让你自己以后回来看时，能一眼明白：

* 这个对象是什么
* 为什么存在
* 它和别的对象怎么区分
* 哪些字段最关键

---

## 2.2 第二目标：高保真，但不过度绑定站点细节

比如：

* Canvas 叫 announcement
* EdStem 叫 instructor post / thread
* MyUW 可能叫 notice

这些在用户认知里都可能是“更新消息”，但它们又不完全一样。
所以 schema 不能太松，也不能死绑某一站点的命名。

---

## 2.3 第三目标：支持三类上层能力

这套 schema 必须同时喂给：

### 1）AI 层

* 总结
* 解释
* 排序
* 回答“我该关注什么”

### 2）导出层

* JSON
* CSV
* Markdown
* ICS

### 3）缓存 / 时间线 / 告警层

* diff
* “最近新增了什么”
* alerts
* timeline

---

## 2.4 第四目标：先稳，再全

第一阶段先做的核心问题很清楚：

* 我还有什么作业？
* 最近有什么消息？
* 我需要关注什么？

所以 schema 设计要优先服务这些问题，而不是先追求“把所有站点所有资源都建模一遍”。

---

# 3. 设计原则 🧱

---

## 3.1 统一的是“语义”，不是“原站点字段名”

例如：

* `due_at`
* `deadline`
* `submission_due_at`

在不同站点原始数据里可以不一样。
但统一后，我们只保留一个清楚的人类语义字段：

* `dueAt`

---

## 3.2 核心对象只保留稳定事实

比如 `Assignment` 里应该保留：

* 标题
* 课程归属
* 截止时间
* 状态
* 分数
* 链接

而不是把一整个站点原始响应直接塞进去当主数据结构。

> **核心对象负责长期稳定；原始站点字段应该放在“来源信息 / 调试信息 / raw snapshot 引用”层。**

---

## 3.3 区分“事实对象”和“派生对象”

这是整套 schema 里最重要的原则之一。

### 事实对象

是用户真实世界里存在的东西，例如：

* 课程
* 作业
* 公告
* 消息
* 成绩
* 事件

### 派生对象

是系统为了帮助用户判断而计算出来的东西，例如：

* Alert
* TimelineEntry
* WeeklySummary
* PriorityScore

这两类东西绝对不能混着写。

> **“老师发了公告”是事实；“这条公告很危险，建议优先看”是系统推导。**

---

## 3.4 时间字段统一成 ISO 时间字符串

所有时间字段统一使用：

* ISO 8601 string
* 明确时区
* 不用本地化显示字符串

例如：

```ts
"2026-03-25T23:59:00-07:00"
```

### 为什么

因为：

* 排序要靠它
* diff 要靠它
* 日历导出要靠它
* AI 总结里“48h 内到期”也要靠它

---

## 3.5 所有对象都必须保留来源

因为这是一个多站点系统。
不保留来源，后面所有东西都会糊掉。

每个对象至少要知道：

* 来自哪个站点
* 原站点的主资源 ID 是什么
* 是通过哪种抓取方式得到的（可放扩展 metadata）
* 对应原页面链接是什么（如果有）

---

## 3.6 不把“抓取方式”塞进业务对象主体

`Assignment` 是业务对象。
`mode = api/state/dom` 是采集 metadata。
它们应该有关联，但不应该混为同一个概念。

> `Assignment` 是“这是什么”；
> `FetchMetadata` 是“这条数据是怎么来的”。

---

# 4. 这套 Schema 的整体地图 🗺️

## 4.1 核心事实对象（Core Entities）

| 对象             | 代表什么                                     | 是否 Phase 1 核心 |
| -------------- | ---------------------------------------- | ------------- |
| `Course`       | 一门课 / 一个课程空间                             | ✅             |
| `Assignment`   | 一个需要提交或完成的任务                             | ✅             |
| `Announcement` | 正式公告 / 教师发布更新                            | ✅             |
| `Message`      | 讨论帖、消息、回复、提醒类内容                          | ✅             |
| `Grade`        | 某项评分结果                                   | ✅（可先弱支持）      |
| `Event`        | 时间性事项，如 deadline / class / exam / notice | ✅             |

---

## 4.2 派生对象（Derived Entities）

| 对象               | 代表什么           | 说明          |
| ---------------- | -------------- | ----------- |
| `Alert`          | 系统判断出的“值得关注事项” | 来自规则或 AI    |
| `TimelineEntry`  | 统一事件时间线项       | 用于“最近发生了什么” |
| `PriorityReason` | 为什么一个东西被判为重要   | 解释层对象       |
| `WeeklySummary`  | 周视图摘要          | 供导出 / AI 复用 |

前面的讨论里已经明确提到要做统一事件时间线，也明确提到 `alerts` 是统一语义层的一部分。

---

## 4.3 支撑对象（Support Objects）

| 对象               | 作用                    |
| ---------------- | --------------------- |
| `EntityRef`      | 轻量引用其他对象              |
| `SourceRef`      | 描述对象来源站点与原始资源         |
| `RawSnapshotRef` | 指向原始响应/HTML/state 的引用 |
| `FetchMetadata`  | 记录本次采集模式和状态           |
| `ConnectionRef`  | 描述对象来自哪个用户连接 / 站点授权   |

---

# 5. 通用基础字段（所有核心对象共享）🧩

为了避免每个对象都重新定义一次来源和身份，建议所有核心对象都继承一个通用基类概念。

## 5.1 通用基类：`BaseEntity`

```ts
interface BaseEntity {
  id: string;
  kind: EntityKind;
  site: Site;
  source: SourceRef;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

---

## 5.2 字段说明

### `id`

系统内部统一 ID。
它不一定等于站点原始 ID。

### `kind`

实体类型，例如：

* `course`
* `assignment`
* `announcement`

### `site`

来源站点：

* `canvas`
* `gradescope`
* `edstem`
* `myuw`

### `source`

更详细的来源信息，比如：

* 原站点实体 ID
* 原始类型
* 来源路径
* 可选 raw snapshot 引用

### `url`

用户点击后能返回原页面的链接。
这很重要，因为产品不是要替代原站点，而是帮助用户更快回到原场景。

### `createdAt` / `updatedAt`

如果站点能提供，就保留。
如果提供不了，不强行编造。

---

# 6. 枚举与基础类型定义 📚

---

## 6.1 `Site`

```ts
type Site = 'canvas' | 'gradescope' | 'edstem' | 'myuw';
```

---

## 6.2 `EntityKind`

```ts
type EntityKind =
  | 'course'
  | 'assignment'
  | 'announcement'
  | 'message'
  | 'grade'
  | 'event'
  | 'alert'
  | 'timeline_entry';
```

---

## 6.3 `ImportanceLevel`

```ts
type ImportanceLevel = 'low' | 'medium' | 'high' | 'critical';
```

---

## 6.4 `FetchMode`

这个不是业务实体字段，而是支撑 metadata 常用枚举。

```ts
type FetchMode = 'official_api' | 'private_api' | 'state' | 'dom';
```

前面的架构讨论已经明确，这个系统需要记录“本次用了哪种抓取方式”，因为这直接关系到后续调试、稳定性判断和维护成本。

---

# 7. 核心实体一：`Course` 🎓

## 7.1 它是什么

`Course` 表示一门课、一个课程空间、一个用户在某个站点里的学习单元。

对于用户来说，它回答的是：

* 这件事属于哪门课？
* 这门课叫什么？
* 我怎么点回去？

---

## 7.2 为什么重要

几乎所有核心对象都要挂到课程上：

* 作业属于某门课
* 公告通常属于某门课
* 讨论通常属于某门课
* 成绩通常属于某门课

如果没有 `Course`，后面的聚合、排序、导出会非常乱。

---

## 7.3 建议结构

```ts
interface Course extends BaseEntity {
  kind: 'course';
  title: string;
  code?: string;
  shortTitle?: string;
  term?: string;
  instructorNames?: string[];
  archived?: boolean;
}
```

---

## 7.4 字段解释

| 字段                | 必填 | 说明                 |
| ----------------- | -- | ------------------ |
| `title`           | ✅  | 课程完整名称             |
| `code`            | 可选 | 如 `CSE 142`        |
| `shortTitle`      | 可选 | UI 简写              |
| `term`            | 可选 | 学期，如 `2026 Spring` |
| `instructorNames` | 可选 | 教师名列表              |
| `archived`        | 可选 | 是否是历史课程            |

---

## 7.5 注意事项

* 不强制所有站点都能给出 `code`
* 不强制所有站点都能给出 `term`
* 历史课程不要直接删，因为 timeline / old grades 可能还会引用

---

# 8. 核心实体二：`Assignment` 📝

## 8.1 它是什么

`Assignment` 表示一个用户需要提交、完成、查看状态、查看成绩的任务。

这是第一阶段最重要的对象之一，因为“我还有什么作业”就是围绕它展开的。

---

## 8.2 为什么它不能只是“原网站里的作业”

因为对用户来说：

* Canvas assignment
* Gradescope submission item
* MyUW deadline
* 某课程页面里的 due item

在很多场景下都属于“我要处理的任务”。

所以 `Assignment` 要统一表达“待完成事项”的语义。

---

## 8.3 建议结构

```ts
type AssignmentStatus =
  | 'todo'
  | 'submitted'
  | 'graded'
  | 'missing'
  | 'overdue'
  | 'unknown';

interface Assignment extends BaseEntity {
  kind: 'assignment';
  courseId?: string;
  title: string;
  descriptionText?: string;
  dueAt?: string;
  availableAt?: string;
  closesAt?: string;
  status: AssignmentStatus;
  submittedAt?: string;
  score?: number;
  maxScore?: number;
  pointsPossible?: number;
  late?: boolean;
  missing?: boolean;
  locked?: boolean;
  tags?: string[];
}
```

---

## 8.4 为什么要有这些字段

### `courseId`

大多数作业都属于某门课。
但不是所有平台都能稳定挂载，所以允许可选。

### `dueAt`

这是排序和提醒最核心的字段之一。

### `availableAt` / `closesAt`

很多站点不是只有一个 due time，可能还有：

* 开放时间
* 截止后关闭时间

### `status`

这是最容易写乱的字段。
必须统一，而不能把各站点原始状态直接泄露到上层。

### `score` / `maxScore`

用于用户问：

* 最近有新成绩吗？
* 哪些作业已经出分但我没看？

### `late` / `missing`

这些通常不是原始站点稳定字段，但很值得保留为规范化布尔语义。

---

## 8.5 `status` 统一语义定义

| 值           | 含义          |
| ----------- | ----------- |
| `todo`      | 还没提交，且当前可做  |
| `submitted` | 已提交，但未必已评分  |
| `graded`    | 已出分         |
| `missing`   | 明确被系统判为缺交   |
| `overdue`   | 已过截止时间，且未完成 |
| `unknown`   | 站点没法明确判断    |

> **注意：**
> `missing` 和 `overdue` 不是一回事。
> 有些作业过期但老师允许迟交；有些作业被系统明确标为 missing。
> 两者不能混写。

---

## 8.6 第一阶段哪些字段最关键

如果 Phase 1 想先做稳，优先保证这几个字段正确：

* `id`
* `site`
* `title`
* `courseId`
* `dueAt`
* `status`
* `url`

剩下字段可后补。

---

# 9. 核心实体三：`Announcement` 📣

## 9.1 它是什么

`Announcement` 表示一条正式的、偏广播性质的信息更新。
例如：

* Canvas 公告
* 老师发布的课程更新
* 某些平台上的正式 notice

---

## 9.2 为什么要和 `Message` 分开

因为公告和讨论不是一回事。

### 公告更像：

* 老师正式发的一条说明
* 面向全体的通知
* 有更强的“值得全局关注”的意味

### 消息 / 讨论更像：

* thread
* reply
* mention
* message feed

如果把它们混成一个对象，后面“最近有什么消息”和“老师发了正式公告吗”就会混掉。

---

## 9.3 建议结构

```ts
interface Announcement extends BaseEntity {
  kind: 'announcement';
  courseId?: string;
  title: string;
  bodyText?: string;
  postedAt?: string;
  authorName?: string;
  important?: boolean;
}
```

---

## 9.4 字段解释

| 字段           | 必填 | 说明               |
| ------------ | -- | ---------------- |
| `title`      | ✅  | 公告标题             |
| `bodyText`   | 可选 | 提取后的正文纯文本        |
| `postedAt`   | 可选 | 发布时间             |
| `authorName` | 可选 | 发布者              |
| `important`  | 可选 | 站点明确标注置顶 / 重要时使用 |

---

## 9.5 这里故意不做什么

* 不在核心 schema 里直接保留 HTML 正文
* 不直接保留站点复杂富文本结构
* 不把“是否影响 due date”写成事实字段

“这条公告是否影响作业要求”，更适合变成 `Alert` 或 `PriorityReason` 的推导结果。

---

# 10. 核心实体四：`Message` 💬

## 10.1 它是什么

`Message` 表示讨论类、消息类、回复类、帖子类内容。

这个对象主要服务于：

* EdStem thread / instructor post / reply
* 站点站内消息
* 提及提醒
* 未读讨论

前面的讨论里已经明确，消息类内容是“最近有什么消息”“老师最近说了什么”的重要组成部分。

---

## 10.2 为什么不用 `MessageOrPost` 这个名字

早期草图里用了 `MessageOrPost`，那是能工作的临时名字。
但正式 schema 更建议叫 `Message`，然后用 `kind` 字段表达细分类型。

原因是：

* 对人类更易读
* 对代码更简洁
* 不把命名做成“我也不知道它到底是什么”的中间态

---

## 10.3 建议结构

```ts
type MessageKind = 'discussion' | 'post' | 'reply' | 'mention' | 'note' | 'message';

interface Message extends BaseEntity {
  kind: 'message';
  messageKind: MessageKind;
  courseId?: string;
  threadId?: string;
  title?: string;
  bodyText?: string;
  authorName?: string;
  createdAt?: string;
  unread?: boolean;
  instructorAuthored?: boolean;
}
```

---

## 10.4 关键字段解释

### `messageKind`

用来区分：

* discussion 主贴
* reply
* mention
* 普通消息

### `threadId`

很多讨论系统里，一个 thread 下面会有多个 reply。
没有这个字段，后面难做聚合与跳转。

### `unread`

非常重要，因为“未读但重要”的判断是第一阶段风险提醒的重要来源之一。

### `instructorAuthored`

这是一个很有产品价值的归一化字段。
“老师说的”和“同学说的”对优先级通常不一样。

---

# 11. 核心实体五：`Grade` 📊

## 11.1 它是什么

`Grade` 表示某个评分项已经出现的结果。

这不是“课程总评”，也不是“某门课整体状态”，而是一次具体评分事件。

---

## 11.2 为什么重要

它支撑这些问题：

* 最近有新成绩吗？
* 哪些作业已经出分但我还没看？
* 哪门课分数下降了？

---

## 11.3 建议结构

```ts
interface Grade extends BaseEntity {
  kind: 'grade';
  courseId?: string;
  assignmentId?: string;
  itemTitle: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
  gradedAt?: string;
  releasedAt?: string;
}
```

---

## 11.4 字段解释

| 字段                   | 说明                 |
| -------------------- | ------------------ |
| `assignmentId`       | 如果这条成绩对应某个作业，建立关联  |
| `itemTitle`          | 成绩项标题              |
| `score` / `maxScore` | 原始分数               |
| `percentage`         | 方便排序与展示，但不强制所有站点都给 |
| `gradedAt`           | 教师完成评分时间（如果能拿到）    |
| `releasedAt`         | 用户可见时间（如果能拿到）      |

---

## 11.5 为什么 `Grade` 不直接塞进 `Assignment`

因为这两者虽然相关，但不是同一个概念：

* `Assignment` 是“任务本身”
* `Grade` 是“该任务的评分结果”

分开后，系统才能支持：

* 一个作业多次评分
* 评分历史
* “新成绩发布”作为 timeline/alert 事件

---

# 12. 核心实体六：`Event` 📅

## 12.1 它是什么

`Event` 表示时间性事项。
这是统一时间线和 ICS 导出的关键对象。

---

## 12.2 为什么它不能只等于“日历事件”

因为在这个系统里，很多东西都带有时间性，但不一定来自真正的 calendar：

* 作业 deadline
* 上课时间
* 考试时间
* 通知时间点
* 学校日程

所以 `Event` 应该是更通用的时间对象。

---

## 12.3 建议结构

```ts
type EventKind = 'deadline' | 'class' | 'exam' | 'notice' | 'meeting' | 'other';

interface Event extends BaseEntity {
  kind: 'event';
  eventKind: EventKind;
  courseId?: string;
  title: string;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  locationText?: string;
  relatedAssignmentId?: string;
}
```

---

## 12.4 关键字段解释

### `eventKind`

用来区分事件语义：

* deadline
* class
* exam
* notice

### `relatedAssignmentId`

很多 deadline 本质上是 assignment 的时间投影。
这个关联很值钱，因为：

* ICS 导出要用
* timeline 要用
* AI 解释“为什么重要”也会用

---

## 12.5 `Assignment` 和 `Event` 的关系

这两个对象不是谁替代谁，而是：

* `Assignment`：任务
* `Event`：时间上的表现

举个例子：

* “Homework 5” 是 `Assignment`
* “Homework 5 due at 2026-03-25 23:59” 是 `Event`

这样设计后，时间线能力会更自然。

---

# 13. 派生实体一：`Alert` 🚨

## 13.1 它是什么

`Alert` 不是原站点里天然存在的实体。
它是系统根据规则、历史、优先级逻辑推导出来的“值得注意事项”。

前面的讨论里反复强调，真正有价值的不是“信息很多”，而是“先看到最该看的东西”。

---

## 13.2 为什么要单独建模

因为“要关注什么”是第一阶段核心问题之一。
如果不单独建模 `Alert`，系统就会把：

* 事实
* 规则
* AI 解释
  混在一起。

---

## 13.3 建议结构

```ts
type AlertKind =
  | 'due_soon'
  | 'overdue'
  | 'new_grade'
  | 'important_announcement'
  | 'instructor_activity'
  | 'unread_mention'
  | 'schedule_change'
  | 'custom';

interface Alert extends BaseEntity {
  kind: 'alert';
  alertKind: AlertKind;
  title: string;
  summary: string;
  importance: ImportanceLevel;
  relatedEntities: EntityRef[];
  triggeredAt: string;
  reasons?: PriorityReason[];
}
```

---

## 13.4 为什么它非常关键

`Alert` 让系统第一次从“信息仓库”变成“判断助手”。

例如：

* 48h 内截止
* 新成绩刚发布
* 新公告可能影响作业要求
* 老师刚发了重要更新
* 某条讨论你没读但 instructor 回复了

这些都更适合表达成 `Alert`。

---

# 14. 派生实体二：`TimelineEntry` 🕰️

## 14.1 它是什么

`TimelineEntry` 是统一事件时间线里的一个时间点。
它不是原站点数据的直接镜像，而是把系统里各种变化统一到一个可排序的时间流里。

前面的讨论已经明确提出：
应该把多个站点的变化统一到 timeline 中，支持“最近发生了什么变化”。

---

## 14.2 建议结构

```ts
type TimelineKind =
  | 'announcement_posted'
  | 'assignment_created'
  | 'assignment_due'
  | 'grade_released'
  | 'discussion_replied'
  | 'schedule_updated'
  | 'alert_triggered';

interface TimelineEntry extends BaseEntity {
  kind: 'timeline_entry';
  timelineKind: TimelineKind;
  occurredAt: string;
  title: string;
  relatedEntities: EntityRef[];
  summary?: string;
}
```

---

## 14.3 为什么它不是 Phase 1 最先实现的核心对象

因为它依赖：

* 历史 snapshot
* diff
* 时间排序
* 关联规则

但它应该在 schema 层先占位，因为后面一定会长出来。

---

# 15. 支撑对象：来源、引用、抓取元数据 🔗

---

## 15.1 `SourceRef`

描述一个实体来自哪里。

```ts
interface SourceRef {
  site: Site;
  remoteId?: string;
  remoteType?: string;
  parentRemoteId?: string;
  rawSnapshotId?: string;
}
```

### 为什么需要它

* 内部 `id` 不应该等于站点 ID
* 但你仍然要能追溯到原对象
* 适配器调试、回放、定位问题都要靠它

---

## 15.2 `EntityRef`

轻量实体引用。

```ts
interface EntityRef {
  kind: EntityKind;
  id: string;
}
```

### 用途

* Alert 关联多个对象
* TimelineEntry 关联多个对象
* WeeklySummary 关联多个对象

---

## 15.3 `RawSnapshotRef`

如果你决定存原始抓取结果，建议只存引用，不把 raw blob 塞进所有核心实体。

```ts
interface RawSnapshotRef {
  snapshotId: string;
  site: Site;
  resource: string;
}
```

---

## 15.4 `FetchMetadata`

这不是业务对象，但非常推荐定义清楚。

```ts
interface FetchMetadata {
  site: Site;
  resource: string;
  mode: FetchMode;
  success: boolean;
  fetchedAt: string;
  latencyMs?: number;
  errorCode?: string;
}
```

前面的讨论已经非常明确：
系统最好记录“本次用了哪种抓取方式”，因为这直接影响后续维护和 fallback 优化。

---

# 16. 字段设计中的几个关键裁决 ⚖️

---

## 16.1 `raw?: unknown` 要不要进核心实体？

早期草图里给很多对象都留了 `raw?: unknown`。
这个做法适合快速起步，但不适合作为长期主 schema。

### 我建议：

* 核心 schema 中**不默认**放 `raw`
* 如果需要调试，走 `rawSnapshotId`
* 真要快速调试，也只在内部开发模式保留，不作为正式契约

### 原因

否则后面会出现：

* AI/Exporter 偷偷依赖 raw
* 上层绕过统一语义层
* schema 形同虚设

---

## 16.2 `MessageOrPost` 要不要保留

正式 schema 里建议统一成 `Message`，再用 `messageKind` 区分。

### 原因

* 命名更干净
* 人读起来更清楚
* 不让“命名含糊”进入长期基础设施

---

## 16.3 `Alert` 应不应该进统一 schema

应该。
虽然它是派生对象，不是原站点事实，但它已经是产品主线的一部分。
“我需要关注什么”本质上就需要 `Alert` 这样的统一结构。

---

## 16.4 `TimelineEntry` 要不要现在就定义

建议现在就定义，但允许 Phase 1 暂不完整实现。

### 原因

* 未来肯定会需要
* 先统一语义更省重构成本
* 但工程上可以慢一点落

---

# 17. Phase 1 推荐的最小可实现 Schema ✅

如果你现在要从空 repo 开始，第一阶段最少把这些对象做扎实：

## 必做

* `Course`
* `Assignment`
* `Announcement`
* `Message`
* `Event`
* `Alert`
* `SourceRef`

## 可先弱支持

* `Grade`
* `TimelineEntry`
* `FetchMetadata`

---

## Phase 1 每个对象最少要有的字段

| 对象             | 最少字段                                                            |
| -------------- | --------------------------------------------------------------- |
| `Course`       | `id, site, title, code?, url?`                                  |
| `Assignment`   | `id, site, courseId?, title, dueAt?, status, url?`              |
| `Announcement` | `id, site, courseId?, title, postedAt?, url?`                   |
| `Message`      | `id, site, courseId?, messageKind, title?, createdAt?, unread?` |
| `Event`        | `id, site, eventKind, title, startAt?, endAt?, url?`            |
| `Alert`        | `id, site, alertKind, title, summary, importance, triggeredAt`  |

这套最小集合已经足够支撑：

* 待办聚合
* 最近消息
* 需要关注什么
* 基础导出
* AI 总结

---

# 18. 给 Codex 的硬规则 🤖

> 这一节是写给未来实现 repo 的 Codex / 工程协作者看的，但保持人类可读。

## 18.1 不允许的做法

### ❌ 不允许：

1. 直接让 UI 消费站点原始响应
2. 直接让 AI 消费 raw DOM
3. 每个站点自己发明一套字段名
4. 把 `raw` 当成主数据结构
5. 把 `Alert` 和原始事实对象混在一起
6. 把 `Assignment` 和 `Grade` 混成一个对象
7. 把抓取 metadata 塞进业务主对象主体

---

## 18.2 必须遵守的做法

### ✅ 必须：

1. 所有站点输出先进入统一 schema
2. 所有导出只吃统一 schema
3. 所有 AI 工具只吃统一 schema
4. 所有派生结果必须明确标记为派生对象
5. 所有对象都必须可追溯到来源站点
6. 时间字段统一为 ISO string
7. 可空字段不要伪造默认值

---

# 19. 这份 Schema 最终回答了什么 📌

> **它回答的核心问题是：**
> 当不同学习平台的数据被抓回来之后，系统里到底应该存在哪些“标准对象”，它们彼此怎么区分、怎么关联、怎么给 AI 用、怎么给导出用、怎么给缓存和告警用。

用最短的话说：

## 这套 schema 的最终形状是：

### 事实对象

* `Course`
* `Assignment`
* `Announcement`
* `Message`
* `Grade`
* `Event`

### 派生对象

* `Alert`
* `TimelineEntry`

### 支撑对象

* `SourceRef`
* `EntityRef`
* `RawSnapshotRef`
* `FetchMetadata`

而这套结构，正是为了支撑你前面已经明确拍板的系统方向：

* **Site Adapter + Unified Schema + AI 编排器**
* **AI 不直接碰网页**
* **Export 与 AI 并列**
* **先做 read-only 的学习信息汇总器**
* **围绕“我还有什么作业 / 最近有什么消息 / 我需要关注什么”这三个核心问题展开**。

---

# 20. 当前文档状态 📝

* **文档名**：`03-domain-schema.md`
* **状态**：第一版正式领域模型文档
* **用途**：

  1. 给你自己确认系统真正的“共同语言”
  2. 给 Codex 提供实体建模边界
  3. 给后续 `04-adapter-spec.md` 提供上游约束
  4. 给 exporter / storage / AI runtime 提供统一输入契约

---

下一步最自然的是继续写 **`04-adapter-spec.md`**。
