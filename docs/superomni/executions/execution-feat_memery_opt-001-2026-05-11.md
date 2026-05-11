# Execution: mem0 项目隔离与可选启用实现

Branch: feat_memery_opt
Session: 001
Date: 2026-05-11
Stage: BUILD -> SHIP
Plan: docs/superomni/plans/plan-feat_memery_opt-001-2026-05-11.md
Review: docs/superomni/reviews/review-feat_memery_opt-001-2026-05-11.md

## 实施摘要

已按计划完成核心落地：

1. provider 抽象与实现
- `packages/adapter-utils/src/memory-provider.ts`
- `packages/adapter-utils/src/memory-provider-mem0.ts`
- `packages/adapter-utils/src/memory-provider-local-markdown.ts`
- `packages/adapter-utils/src/index.ts`

2. scope 与契约扩展（project）
- `packages/shared/src/validators/memory.ts`
- `packages/shared/src/types/memory.ts`
- `packages/shared/src/index.ts`
- `packages/db/src/schema/memory_bindings.ts`（注释同步）

3. server memory 服务与审计
- `server/src/services/memory-provider.ts`
  - 绑定解析优先级：project > agent > company
  - provider 构建：mem0 / local_markdown
  - 审计写入：memory_operations

4. heartbeat 主链接入
- `server/src/services/heartbeat.ts`
  - run 启动前 recall 注入 `context.paperclipMemoryRecall`
  - run 结束后 ingest continuation summary
  - recall/ingest 全部落 `memory_operations`
  - provider 异常降级，不阻断 run

5. 配置入口
- `server/src/routes/memory-bindings.ts`
  - GET/POST/PATCH/DELETE `/api/companies/:companyId/memory-bindings`
- `server/src/app.ts` 挂载路由
- `server/src/routes/index.ts` 导出路由

## 关键行为变化

1. Opt-in 启用逻辑
- 无 active memory binding -> recall/ingest 不触发。
- 有 active binding 且配置有效 -> 启用 memory provider。
- mem0 缺 apiKey -> 自动降级为未启用。

2. 项目隔离
- namespace 使用 run 的 projectId（若存在）。
- 绑定选择优先 project scope，再 agent，再 company。

3. 可观测性
- recall/ingest 操作写入 `memory_operations`，含状态、耗时、itemCount、错误信息。

## SHIP 证据

本轮为功能实现与本地验证阶段，未执行对外发布。

- 已完成 BUILD 交付与代码合并就绪状态检查。
- 发布动作（tag/release）不在本次用户请求范围内。
