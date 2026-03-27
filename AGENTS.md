# Campus Copilot Repo Agent Notes

这份文件是 **repo-local 工作边界**，用来补充全局 agent 规范。  
它不重写根规则，只回答这个仓库里最容易写偏的地方。

## 先接受的事实

- 这不是“先做聊天框”的项目。
- 这是一个 **本地优先的学习信息整理工作台**。
- 正确顺序始终是：
  - 先 `schema`
  - 先 `adapter`
  - 先真实数据链路
  - 先工作台与导出
  - 最后才是 AI

## 当前正式主线

- 支持站点：`Canvas / Gradescope / EdStem / MyUW`
- extension 主链已接通四站最小同步
- AI 已进入最小问答闭环，但仍然只走：
  - `OpenAI api_key`
  - `Gemini api_key`
- `Gemini OAuth / Anthropic / web_session / 多 provider 自动路由` 仍然不是正式主路径

## 绝对不要写偏的地方

- 不要让 AI 直接读取网页、DOM、cookie 或 raw adapter payload
- 不要把 exporter 直接绑到站点原始响应
- 不要把 private/internal request 路径包装成“已经官方稳定”
- 不要引入自动提交、自动发帖、自动写操作
- 不要扩大权限到 `cookies`

## 当前事实层和展示层

- `Dexie` 是 canonical local entities
- `storage read-model` 是工作台真相源
- `TanStack Query` 不是本仓库主真相源
- sidepanel/popup/options 都应该消费统一 schema + read model

## 当前推荐门禁

任何声称“本地已完成”的改动，至少要附带这些新鲜结果：

```bash
pnpm typecheck
pnpm test
pnpm --filter @campus-copilot/extension build
pnpm --filter @campus-copilot/extension exec playwright test
```

如果碰到 BFF 或 API 入口，再补：

```bash
pnpm --filter @campus-copilot/api test
bash scripts/api-healthcheck.sh
```

## 阅读顺序

开始改之前，优先读：

1. `docs/01-product-prd.md`
2. `docs/02-system-architecture.md`
3. `docs/03-domain-schema.md`
4. `docs/04-adapter-spec.md`
5. `docs/08-phase-plan-and-repo-writing-brief.md`
6. `docs/09-implementation-decisions.md`
