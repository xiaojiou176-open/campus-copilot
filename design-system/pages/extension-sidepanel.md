# Extension Sidepanel Override

## Purpose

这是默认随页 companion，不再是完整工作台的第一视口。

## Override Rules

1. 顶栏必须先给：
   - brand / current site context
   - `Assistant / Export / Settings` mode switcher
   - language / connection status
2. 第一屏只保留轻 companion 结构：
   - current context
   - local connection / trust cue
   - next-action CTA
3. 顶栏的连接与授权不要再做并列大 badge，改成一行 quiet context
4. `Ask AI` 保持 explanation layer，但必须排在详细工作台之前
5. `Ask AI` 的 supporting trust snapshot / policy drawer 也必须退到答案区之后
6. 完整 workbench 要移到 `Show detailed workspace` 折叠层之后
7. AI 面板内 provider/model controls 下沉到 `Advanced runtime settings`

## Copy Rules

- 保留“不是空聊天框”的防漂逻辑
- 但语气要像一个可信 companion，不像开发者解释器

## State Rules

- `Trust Summary` 用 segmented chips 或 status strip
- `blocked` 必须同时给出 manual route
- 默认模式第一屏不依赖滚动
