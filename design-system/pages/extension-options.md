# Extension Options Override

## Purpose

这页是完整的 settings/auth center，不是模型实验室。

## Override Rules

1. 顺序固定为：
   - `Connection summary`
   - `Language + AI/BFF status summary`
   - `Authorization / reading boundaries`
   - `Boundary disclosure`
   - `Site configuration`
   - `Advanced runtime settings`
   - `Export defaults`
2. provider readiness 做成 disclosure 内的 compact status list，不准和 posture summary 同级铺满首屏
3. autodiscovery 成功时，手填 BFF 只作为 fallback/override 存在
4. `OpenAI / Gemini / Switchyard model` 默认归入 advanced
5. 保存按钮固定在表单底部，并显示 unsaved state
6. `Boundary disclosure` 与 `Site configuration` 默认进入 disclosure，不准继续占据首屏大块空间
7. `Configuration actions` 更像 compact action strip，而不是一整张同权卡片

## Copy Rules

- `Only override when autodiscovery fails or you truly need a custom local address.`
- 所有 boundary 文案必须在第一屏可见
