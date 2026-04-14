# Ask-AI Override

## Purpose

这是默认 companion 里的解释层，不是 generic chat 主界面。

## Override Rules

1. 固定结构：
   - `Question box`
   - `Suggested questions`
   - `Answer with citations`
   - `Boundary / policy / provenance drawer`
   - `Advanced provider settings`
2. `Structured inputs` 视觉化成 evidence chips 或 source cards
3. 红区按钮保持 disabled，但文案像护栏，不像报错
4. citations 不能埋到底部
5. supporting trust / policy 不能排在提问框前面抢第一屏
6. sidepanel 里要尽量形成：
   - 左列 `Question -> Answer`
   - 右列 `trust snapshot -> policy drawer`

## Copy Rules

- 优先标题：`Cited AI` 或 `Ask AI about this workspace`
- 不要把 provider/model/BFF 控件做成主角

## State Rules

- `uncited-answer` 必须显式标 warning tag
- `manual-only` 必须给 manual route，不给自动化错觉
