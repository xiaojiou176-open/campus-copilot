# V2 Product Contract Freeze

这份 brief 只做一件事：

> **把 Planner 6 抬高后的 V2 产品合同冻结下来。**

它不是 live-proof ledger。
它也不是 shipped-capability 宣传页。

更准确地说，它回答的是：

> **在不改写“当前 shipped truth 仍以四站工作台为主”的前提下，Campus Copilot 下一阶段到底要按什么产品规则继续建设？**

## How To Read This Brief

这份文档强制把 4 层东西分开：

| 层 | 含义 |
| :-- | :-- |
| `current shipped truth` | 当前正式 shipped/landed 的主产品真相 |
| `frozen V2 contract` | 从现在开始必须遵守的下一阶段产品合同 |
| `later / owner-only` | 以后再说，或者需要 owner-side 平台动作 |
| `no-go` | 当前明确禁止，不得借新 bar 偷渡回来 |

如果不先分层，最容易出现的错觉就是：

- 把“现在想做”的东西写成“已经 shipped”
- 把“以前做过很多”写成“按新 bar 也快做完”

## Current Shipped Truth Still Stands

当前正式 shipped 真相**没有**被这份文档推翻：

- 正式主工作台仍是：
  - `Canvas`
  - `Gradescope`
  - `EdStem`
  - `MyUW`
- 正式架构主链仍是：
  - `schema -> adapters -> storage/read-model -> decision surfaces -> extension/web -> export -> cited AI -> thin BFF`
- 正式产品身份仍是：
  - `academic decision workspace with local storage and read-only operation`
- 正式强边界仍是：
  - read-only
  - no registration automation
  - no hosted autonomy
  - no write-capable public MCP
  - no raw-cookie formal path

这份文档要冻结的，是**下一阶段必须遵守的产品合同**，不是把所有 V2 要求倒灌成今天已经 shipped 的事实。

## Frozen V2 Contract

### 1. Product Mission

Campus Copilot 的下一阶段，不再只是“扩站工程”。

它必须朝下面这个方向继续建设：

> **一个本地存储、只读、可信、显式授权、可导出、可 AI 分析的学生决策桌面。**

说得更直白一点：

- 它不是 generic chatbot
- 它不是校园系统操作机器人
- 它不是让学生继续手工去各站点抄信息，再喂给 AI
- 它要做的是：
  - 先把事实拉到同一张桌子上
  - 再让学生看懂什么最重要
  - 再允许导出
  - 再让 AI 在整理好的桌面上解释

### 2. Surface Topology

下一阶段产品结构正式冻结成下面这套：

| Surface | 正式定位 | 必须做到什么 |
| :-- | :-- | :-- |
| `Extension sidepanel` | 主产品 | `Assistant-first`、低脑负荷、默认首屏不靠长滚动解释自己 |
| `Extension popup` | quick pulse / launcher | 不再假装是压缩版工作台 |
| `Extension options` | settings/auth center | 管语言、连接、provider、授权，但不能像开发者后台 |
| `Web` | 辅助工作台 / 深看表面 | 更宽、更深、更适合回看、比较、批量导出与授权管理 |

Extension 的正式主模式冻结为：

- `Assistant`
- `Export`
- `Settings`

这 3 个模式的冻结含义是：

- `Assistant`：默认 companion，不是滚动大工作台
- `Export`：不是一堆 preset 按钮，而是正式导出流程
- `Settings`：近手、可解释、可撤回的配置与授权中心

### 3. Academic + Administrative Grouping

下一阶段正式把学生世界拆成两条主线：

| 主线 | 解释 |
| :-- | :-- |
| `Academic` | 课程、作业、反馈、讨论、规划、毕业要求 |
| `Administrative` | notices、当前课表、注册状态、财务、成绩单、助学金等行政信息 |

冻结规则：

- 二者进入**同一个统一优先级系统**
- 但在 UI 上必须允许分组查看：
  - `Academic`
  - `Administrative`

这意味着：

- Campus Copilot 以后不能只做“课程作业桌面”
- 也不能把行政信息孤立成另一个产品
- 它要做的是一个统一的学生决策桌面

### 4. Authorization Model

下一阶段正式冻结为 **两层授权模型**：

#### Layer 1 — Plugin Read / Export Authorization

只要用户授权插件读取某类对象，插件就可以：

- 读取
- 结构化
- 导出

#### Layer 2 — AI Read / Agentic Use Authorization

AI 要读取、分析、继续 agentic 深挖，必须单独授权。

冻结规则：

- `插件读取 = 导出授权`
- `AI 读取` 不是自动继承
- 目录页 metadata 与详情页不是同一个授权对象
- 高风险对象默认需要更强确认

高风险对象的冻结规则：

- 未完成 / 未提交作业详情页：**AI 永远禁止读取**
- 高敏感行政页面（如 transcript / finaid / tuition / accounts）：即使用户允许导出，AI 仍需更强确认
- 文件类内容（课件、PDF、历史考试、Syllabus 正文等）必须按风险分类，不能默认放开

课程级确认规则：

- 高风险 AI 阅读默认按**课程级确认**冻结
- 这不等于永久全局放开
- 它更像“这门课我确认承担风险，你现在可以看这一类高风险对象”

初始化规则：

- 初始化只要求最低可用的低风险目录读取授权
- 其他高风险 / 详情页 / AI 权限：
  - 站点内按需弹出
  - 不在首次安装时一口气全开

### 5. Source Order And Carrier Honesty

下一阶段继续冻结这条顺序：

1. `official public API`
2. `institution-recognized stable session-backed interface or standard integration`
3. `page-state / internal endpoint / reverse-engineered path / DOM fallback`

但这里要补一条新的真实产品规则：

> **学生可用性不能因为拿不到官方 API key 就直接崩掉。**

所以冻结的新解释是：

- official-first 仍然成立
- 但在 read-only、repo-local、truthful、显式授权前提下：
  - session-backed
  - private/internal API
  - DOM/state fallback
  都可以成为正式的下一阶段工程路径

### 6. Cookie Boundary

这条必须明确写死，避免和用户对“session/private carrier”的期待打架：

- **允许**：
  - 在现有站点会话上下文内，使用 site/session-backed carrier
  - 用现有页面上下文与受控请求做 read-only 收集
- **不允许**：
  - 把 `cookies` 权限扩张升成 formal product path
  - 把 raw cookies 当成 AI 输入
  - 把“可利用当前会话”偷换成“正式要请求更宽浏览器权限”

也就是说：

> `session-backed` 可以进下一阶段工程讨论，
> 但 `cookies permission expansion` 仍然不是当前 formal contract。

### 7. Course Website Family

下一阶段正式冻结：

- 对当前检测到的 **CS 课程网站**
  - `courses.cs.washington.edu`
  这类家族，进入当前执行范围

但它们的状态应理解为：

- `frozen next-phase engineering contract`
- 不是“当前所有课程网站都已经 shipped support”

最低页面族冻结为：

- `Home`
- `Syllabus`
- `Calendar / Schedule`
- `Assignments / Tasks`

允许继续挖的高价值同类页面：

- `Resources`
- `Exams`
- `Policies`

课程网站与别的站点的联动规则：

- 可以进入课程世界 authority merge
- 但不能自动过度自信
- 当跨站点对象匹配不够确定时：
  - 允许中等置信度自动合并
  - UI 必须标 `可能匹配`

课程网站也不享受“公开页面自动等于 AI 可读”的特权：

- 如果本质上对应未完成作业详情
- 或高版权风险内容
- 仍然要按高风险对象规则处理

### 8. Export Packaging Contract

下一阶段正式冻结：

- 导出是一等产品面
- 不是 AI 的附属按钮

导出最小流程：

1. `scope`
2. `resource family`
3. `format`
4. `review`

最小格式：

- `JSON`
- `Markdown`

下一阶段统一包装字段冻结为：

- `authorization_level`
- `ai_allowed`
- `risk_label`
- `match_confidence`
- `provenance`

建议后续实现统一携带：

- `source_family`
- `scope_type`
- `site`
- `course_id_or_key`（如适用）
- `resource_family`
- `generated_at`

### 9. In-Product AI Policy Contract

下一阶段正式冻结：

- 产品内 AI 不是自由发挥
- 它必须有一套正式的产品级控制层

最小结构：

- 一个全局 `System Prompt`
- 每站一个 `site policy overlay`

它至少要知道：

- 默认可以读什么
- 默认不能读什么
- 哪些高风险对象必须拦截
- 哪些权限没开就 lock
- 什么时候只允许导出、不能给 AI 看
- 什么时候绝不 agentic 深挖

冻结规则：

- AI 默认仍然基于结构化 workspace truth 工作
- 不得默认读 raw DOM / raw HTML / raw adapter payload / raw cookies
- 不得因为将来有课程网站或更深 carrier，就越过对象级风险规则

## Status Split

| 桶 | 现在属于什么 |
| :-- | :-- |
| `current shipped truth` | 四站工作台、导出、cited AI、thin BFF、部分扩站基础 |
| `frozen V2 contract` | Assistant-first、多模式、两层授权、课程网站、academic/admin grouping、prompt overlay、导出包装字段 |
| `later / owner-only` | public launch、官方 listing、SEO/video、平台侧发布动作 |
| `no-go` | registration automation、seat watcher、write-capable campus mutation、hosted autonomy、cookies permission expansion、把 internal/session-backed 冒充 official |

## Consequence

这份合同冻结后，后续 implementation lanes 就必须按下面的顺序做：

1. 先解决 `dirty truth triage`
2. 再按这份合同推进：
   - `Product Surface Lane`
   - `Policy/Auth/Export Lane`
   - `Site Depth Lane`
3. 再进入更深的行政线与最终 live/closeout

也就是说，后续 Prompt 不能再建立在“旧 formal docs 里还没写，所以先边做边想”的状态上。

## Canonical Cross-References

- Current formal shipped-vs-next split: [`11-wave1-contract-freeze-gap-matrix.md`](11-wave1-contract-freeze-gap-matrix.md)
- Export and surface baseline: [`06-export-and-user-surfaces.md`](06-export-and-user-surfaces.md)
- Academic expansion baseline: [`17-academic-expansion-and-safety-contract.md`](17-academic-expansion-and-safety-contract.md)
- Current implementation choices: [`09-implementation-decisions.md`](09-implementation-decisions.md)
- Current per-site truth: [`site-capability-matrix.md`](site-capability-matrix.md)
- Exhaustive per-site ledger: [`13-site-depth-exhaustive-ledger.md`](13-site-depth-exhaustive-ledger.md)
