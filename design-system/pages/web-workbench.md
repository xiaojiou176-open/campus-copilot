# Web Workbench Override

## Purpose

这页是桌面版主控台，不是 importer demo，也不是 AI playground。

## Override Rules

1. 第一屏固定为：
   - orientation card
   - `Focus Queue`
   - `Weekly Load`
2. hero 右侧只放 `Workspace truth`
3. `Trust summary and export review` 必须变成第二层 drawer，不准继续和 decision cards 同权铺平
4. toolbar 分两组：
   - `Load / Import`
   - `Filter / Export`
5. `Planning Pulse` 必须在第一屏进入 decision lane，不准继续被 grouped review sections 压到更下方
6. `Merge Health / Course panorama / Merged work items / Administrative snapshots` 默认进入 deep review drawer
7. `Imported site counts` 下沉成 supporting evidence，不和主决策卡同级
8. supporting rail 与 AI explanation 必须在 decision lane 之后出现，不准抢第一屏
9. 空状态必须给出动作，例如 `Import a current-view snapshot first`

## Copy Rules

- 主句：`One local workspace for what changed, what is open, and what needs attention first.`
- 不要把 `standalone second surface` 放在主句里

## A11y

- 必须有 `Skip to workbench content`
- toolbar 顺序必须可 Tab 浏览
- hero / metrics / panels 之间要有清晰 heading 层级
