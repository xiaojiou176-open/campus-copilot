# Campus Copilot Design System

更新时间：2026-04-13 05:48 PDT

> 这份设计系统不是“做得更像 AI 产品”的说明书。  
> 它是把 Campus Copilot 统一成 **local-first academic decision workspace** 的施工总图。
>
> 如果你只想先读一份短版施工规范，先读：
> [`DESIGN.md`](./DESIGN.md)

## Design Direction

一句话方向：

> **Calm operations desk for school decisions**

说得更直白一点：

- 它应该像学生的决策桌面
- 不应该像 generic chatbot
- 不应该像开发者 playground
- 不应该像营销 landing page

Donor order 固定为：

- **Notion primary**：整体布局、信息层级、边框与留白节奏
- **Claude secondary**：只借 AI explanation lane 的温度和人味
- **Raycast secondary**：只借 extension 外壳的紧凑 launcher 感

## Direct Donor Borrow Rules

这次不是“参考一下”，而是尽量**直接照着成熟样板抄**。

### 1. 从 Notion 直接抄的东西

- **信息层级**：hero 只负责定场，不抢主任务；真正的主工作区必须尽快露出来。
- **边框哲学**：优先 `1px whisper border`，再考虑 shadow。结构先于装饰。
- **卡片语法**：卡片不是为了“看起来高级”，而是为了把 decision / evidence / support 三层分开。
- **CTA 克制**：只保留一两个真正有价值的强动作，其他动作降成 secondary / quiet。

### 2. 从 Claude 直接抄的东西

- **暖色中性底**：页面是纸感，不是玻璃感。
- **解释层语气**：像可信 companion，不像 command center。
- **AI 的位置**：解释层必须跟在事实之后，而不是先把用户引到模型面前。
- **信任感**：manual-only / blocked / caution 要显眼，但不能戏剧化。

### 3. 从 Raycast 直接抄的东西

- **壳层紧凑度**：extension 这种小壳一定要 launcher-first / companion-first。
- **操作收纳**：高级控制下沉，首屏只留高频、低认知负担动作。
- **工具感**：信息密度可以高，但路径必须短，不能像管理后台。

## Donor Mapping By Surface

| Surface | Primary donor | Secondary donor | 这页最该抄什么 |
| :-- | :-- | :-- | :-- |
| `web workbench` | `Notion` | `Claude` | 首屏层级、工作台先于解释、whisper border、warm neutral surface |
| `extension sidepanel` | `Raycast` | `Claude` | 紧凑壳层、launcher-first、AI 做解释层、默认折叠详细工作台 |
| `extension options / trust center` | `Notion` | `Claude` | summary-first、控制项分层、把规则改写成人话 |
| `popup` | `Raycast` | `Notion` | quick pulse launcher、少而准的动作、不要做成完整工作台 |

禁止反过来：

- 不准把整体产品做成 Claude-first chat 页
- 不准把整体产品做成 Raycast/Linear-first 开发工具
- 不准让 web 首屏先像 marketing hero，再像工作台

## Truth Rules

所有 surface 都必须守住这 5 条：

1. 先讲工作台，再讲 AI
2. 先讲结构化事实，再讲模型解释
3. 先讲 trust / blockers / next step，再讲美化
4. 所有 red-zone / manual-only 提示必须显眼但不戏剧化
5. 不准把产品讲歪成“替你操作学校系统的机器人”

## Core Tokens

### Color

| Token | Value | 用途 |
| :-- | :-- | :-- |
| `--cc-color-primary` | `#1F5D4B` | 主品牌色，trusted action、active state、focus ring |
| `--cc-color-primary-2` | `#27483D` | 深色文字与主层级标题 |
| `--cc-color-accent` | `#A8622A` | 高价值 CTA，仅给真正主要动作与 export guidance |
| `--cc-color-bg` | `#F5F4EE` | 页面背景，paper canvas |
| `--cc-color-surface` | `#FBFAF6` | 卡片背景，ivory surface |
| `--cc-color-surface-muted` | `#F1EEE5` | 次级卡片 / summary / panel group |
| `--cc-color-text` | `#27483D` | 主文本 |
| `--cc-color-text-muted` | `#4E665E` | 次级文本 |
| `--cc-color-border` | `#DCE8E1` | 轻边框 |
| `--cc-color-warning` | `#B36B2C` | warning / partial / trust gap |
| `--cc-color-danger` | `#A14343` | blocker / red-zone |
| `--cc-color-success` | `#1F5D4B` | ready / synced / verified |

### Typography

| Token | Value | 用途 |
| :-- | :-- | :-- |
| `--cc-font-family` | `Geist, "Plus Jakarta Sans", system-ui, sans-serif` | extension + web 统一字体 |
| `--cc-font-size-xs` | `12px` | badge / meta |
| `--cc-font-size-sm` | `14px` | secondary body |
| `--cc-font-size-md` | `16px` | default body |
| `--cc-font-size-lg` | `18px` | section title |
| `--cc-font-size-xl` | `24px` | hero title |
| `--cc-font-size-2xl` | `32px` | large entry heading |

字重规则：

- `700`：page title / hero / major number
- `600`：section title / card title / CTA
- `500`：label / tab / filter chip
- `400`：正文

### Spacing

| Token | Value |
| :-- | :-- |
| `--cc-space-1` | `4px` |
| `--cc-space-2` | `8px` |
| `--cc-space-3` | `12px` |
| `--cc-space-4` | `16px` |
| `--cc-space-5` | `20px` |
| `--cc-space-6` | `24px` |
| `--cc-space-8` | `32px` |

### Radius / Shadow

| Token | Value | 用途 |
| :-- | :-- | :-- |
| `--cc-radius-sm` | `10px` | input / chip |
| `--cc-radius-md` | `14px` | default card |
| `--cc-radius-lg` | `18px` | hero / high-level containers |
| `--cc-shadow-sm` | `0 1px 2px rgba(15, 23, 42, 0.06)` | default |
| `--cc-shadow-md` | `0 8px 24px rgba(15, 23, 42, 0.08)` | featured summary card |

## Layout System

统一只允许三类容器：

1. `orientation-card`
说明这页在干嘛、当前 workspace 有什么状态。

2. `decision-card`
用于 `Focus Queue`、`Weekly Load`、`Trust Summary`、`Diagnostics`、`AI guardrails` 这类“帮你判断下一步”的模块。

3. `evidence-card`
用于列表、变更、站点状态、导出收据、资源条目。

不要每个 panel 都自己发明第四种卡片语言。

### 第一屏铁律

不管是 web 还是 extension，都要守住下面这条：

> **先让用户看懂“现在发生了什么、下一步看哪里”，再把工具、解释、设置往下摆。**

换句话说：

- **web**：orientation 之后应尽快进入 `Focus Queue / Weekly Load / Planning Pulse`
- **sidepanel**：companion summary 之后才展开 detailed workspace
- **settings**：先看 trust summary，再看高级规则

如果第一屏开始像：

- AI playground
- prompt 面板
- builder console
- publication router

那就说明设计已经漂了。

## Interaction Rules

### Buttons

- Primary CTA 只用 accent orange
- Secondary 操作用 teal outline 或 muted surface
- destructive/manual-only 不做高饱和主按钮

### Chips / Badges

- `ready` 用 success
- `partial` / `warning` 用 amber
- `blocked` / `manual-only` 用 red border + muted bg
- 不允许只靠颜色表达状态，必须带文字

### Motion

- 只做 `opacity / border-color / shadow` 的 150-180ms 过渡
- 禁止 card scale hover
- 禁止漂浮式弹跳
- 禁止 “AI thinking” 戏剧动画
- 必须支持 `prefers-reduced-motion`

## State Matrix

| State | 文案原则 | 视觉原则 | 交互原则 |
| :-- | :-- | :-- | :-- |
| `loading` | 解释正在准备什么，不只写 loading | skeleton + muted surface | CTA 可见但禁用 |
| `empty` | 先说为什么空，再说下一步 | neutral card | 只给一个最直接动作 |
| `error` | 讲清失败层级 | red border + honest detail | 主 CTA 是 recover action |
| `blocked` | 强调“边界/前置条件未满足” | warning/danger mixed tone | 给 manual route 或 prerequisite |
| `ready` | 强调“可以继续判断/继续操作” | success tag 点到为止 | CTA 指向高价值动作 |
| `manual-only` | 明说需要用户去原站点 | hard-stop card | 保留手动入口，不给自动化错觉 |

## Accessibility Rules

1. 所有 `loading / sync / response / diagnostics` 必须有 `aria-live="polite"`
2. web 必须加 `Skip to workbench content`
3. extension 必须补可见 `focus-visible`
4. 所有按钮、chip、tab、row hover 都要有键盘等价路径
5. badge 不能只靠颜色区分 `blocked / partial / ready`
6. 所有状态卡的文本对比度至少 `4.5:1`

## Product-Wording Guardrails

### 要强化的句子

- `One local workspace for what changed, what is still open, and what needs attention first.`
- `Cited AI explains the workspace. It does not replace the workspace.`
- `Manual-only and red-zone routes stay outside this product.`

### 要后撤的东西

- provider/model/BFF controls
- developer-facing runtime settings
- 任何让页面看起来像 prompt playground 的结构

### 永远不能丢的东西

- local-first
- read-only
- trust summary
- blockers / manual-only explanation
- citations

## Top Implementation Priorities

1. 先统一 extension/web 的 token，再改页面
2. 把 AI 面板从“主角”降成“解释层”
3. popup 从“导出抽屉”改成“quick pulse”
4. 把 trust / diagnostics 做成 supporting truth layer，而不是第一眼主角
5. 拉开 extension/web 首屏的主次层级，避免 equal-weight card wall
6. 补齐 focus / skip link / reduced-motion / empty-state 指路
7. 一切 builder/publication 路由都放到 student loop 之后

## Page Overrides

具体页面请优先看：

- `design-system/pages/web-workbench.md`
- `design-system/pages/extension-sidepanel.md`
- `design-system/pages/extension-popup.md`
- `design-system/pages/extension-options.md`
- `design-system/pages/ask-ai.md`
