# Campus Copilot DESIGN

更新时间：2026-04-17 America/Los_Angeles

> 这份文件是给真实落地 UI 的短版设计合同。  
> 它不替代 [`MASTER.md`](./MASTER.md)，但它应该是日常实现时最先打开的那一份。

## 1. Product Shape

一句话先讲死：

> **Campus Copilot 不是 chat shell，不是开发者后台，也不是营销落地页。**
> **它是学生真正会坐下来用的 calm decision desk。**

UI 一切判断都围绕这三件事：

1. 先让用户看懂现在发生了什么
2. 再让用户知道下一步看哪里
3. 最后才让 AI 解释结构化结果

## 2. Donor Order

当前 donor 顺序固定，不要自由发挥：

1. **Notion primary**
   - 负责整体布局、留白、卡片层级、工作台感
2. **Claude secondary**
   - 负责 AI explanation lane 的温度、纸感、中性色和信任语气
3. **Raycast secondary**
   - 负责 extension 壳层、launcher 感、高频动作的收纳方式

不要反过来：

- 不要做成 Claude-first 聊天首页
- 不要做成 Raycast/Linear 风的开发者工具
- 不要让 web 第一屏先像 marketing hero，后面才像工作台

## 3. Surface Rules

### Web workbench

- 第一屏必须尽快露出真实工作台，不要用大 hero 挡住主任务
- `Focus Queue / Weekly Load / Planning Pulse` 应该比 AI explanation 更靠前
- 先呈现结构化事实，再呈现解释、导出、设置

### Extension sidepanel

- 必须是 `launcher-first + companion-first`
- 第一屏只保留高价值动作和当前状态摘要
- 高级细节、深水区信息、builder/seam 相关控制下沉

### Popup

- 必须像 quick pulse，不准像压缩版完整工作台
- 动作要少而准，少做大段解释

### Options / trust center

- 先放 summary 和 boundary，再放配置项
- 风险、授权、manual-only 不准埋在折叠区深处

## 4. First-Fold Acceptance

只要第一屏出现下面任意一条，就说明 UI 漂了：

- 用户先看到 AI 输入框，而不是当前 workspace
- 用户先看到 builder/public toolbox，而不是学生任务
- 页面靠营销 hero 才能成立
- manual-only / blocked / caution 信息只能靠细读才能看到

第一屏必须让人一眼回答这三个问题：

1. 我现在在看什么
2. 这些信息是不是可信
3. 我接下来应该点哪里

## 5. Card Grammar

当前只允许三类主要卡片：

1. `orientation-card`
   - 解释当前 workspace 状态、范围和下一步
2. `decision-card`
   - 解释为什么这个东西重要、为什么现在该看它
3. `evidence-card`
   - 承载列表、变化、条目、事实细节

不要为了“高级感”发明第四种视觉语言。

## 6. Tone Rules

所有用户可见 copy 都要守住：

- calm，不喊口号
- trustworthy，不装全知
- product-first，不讲内部实现腔
- structure-first，不把 AI 写成主角

推荐句型：

- `What changed`
- `What needs attention first`
- `Why this is showing up`
- `Review-first`
- `Manual-only`
- `Needs sign-in continuation`

避免句型：

- `Copilot knows`
- `Let AI decide`
- `Complete automation`
- `One-click solve`

## 7. State Design

| state | 视觉 | 文案 |
| :-- | :-- | :-- |
| `ready` | 轻成功色 + 正常正文 | 明说可以继续看什么 |
| `partial` | warm warning，不戏剧化 | 明说还缺哪一层 |
| `blocked` | 危险色边框 + 明显标题 | 明说缺什么前置条件 |
| `manual-only` | calm hard-stop | 明说需要用户回原站点继续 |
| `loading` | skeleton + muted surface | 明说正在准备什么，不只写 loading |

## 8. Accessibility And Interaction

- 不允许只靠颜色表达状态，必须有文字
- 所有状态变化应支持 `aria-live="polite"`
- `focus-visible` 必须明确可见
- hover 只做轻量 `opacity / border / shadow` 过渡
- 禁止 card scale hover
- 禁止夸张思考动画

## 9. Implementation Guardrails

- 先用现有 design token，再补组件
- 先改层级和信息密度，再改装饰
- 先让页面“更像一个真实产品”，再追求“更像 donor 截图”
- UI 变更要优先帮助：
  - 更快读懂
  - 更少误解
  - 更清楚 boundary

## 10. Review Loop

每次做较大的 UI 改动后，至少要复查这 5 项：

1. 首屏是不是先出现工作台，不是先出现 AI
2. primary CTA 是不是只有 1-2 个
3. warning / blocked / manual-only 是否一眼可见
4. 页面有没有因为想“更酷”而变得更像 generic SaaS / chat shell
5. copy 有没有把 Campus Copilot 讲成会替用户操作学校系统的机器人

## 11. Current Brand Split

- **Campus Copilot** = 当前用户真正使用的旗舰工作台
- **OpenCampus** = umbrella family / repo-level public brand
- **Campus Copilot for UW** = extension distribution name

写法上优先：

- H1 / first-fold: `Campus Copilot`
- secondary framing / family line: `OpenCampus`

## 12. Done Definition

只有当下面 4 条同时成立时，才可以说 UI 进入 closeout：

1. first-fold hierarchy 稳定
2. donor order 没漂
3. state design honest
4. copy, layout, and trust cues all point to the same product story
