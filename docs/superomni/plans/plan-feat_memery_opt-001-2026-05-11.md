# Plan: mem0 项目隔离与可选启用落地

Branch: feat_memery_opt
Session: 001
Date: 2026-05-11
Source Spec: docs/superomni/specs/spec-feat_memery_opt-001-2026-05-11.md
Stage: PLAN

## 1. 目标

本计划只覆盖你当前明确要求：

1. 实现 mem0 provider。
2. 记忆按 project 维度隔离。
3. mem0 必须是用户可选项：配置才启用，未配置默认不启用。

## 2. 范围

### In Scope

- memory provider 接口与 provider 实现完善（mem0 + local_markdown）。
- 绑定解析策略：project > agent > company。
- heartbeat 执行链路接入：
  - run 开始前 recall 注入上下文
  - run 结束后 ingest 写入记忆
- 记忆操作审计落库（memory_operations）。
- 提供最小配置入口（memory_bindings CRUD API，至少支持 company/project 级）。

### Out of Scope

- 方案 A/B/C/E（摘要压缩、prompt cache、KB 向量检索、session 智能压缩）的完整实现。
- 新 UI 页面开发（仅提供 API 即可）。

## 3. 设计决策

### 3.1 启用策略（Opt-in）

- 默认禁用：无 active binding 时不触发 recall/ingest。
- 仅当存在 active binding 且 provider 配置有效时启用。
- mem0 缺失必要配置（如 apiKey）时视为未启用，并记录 warning/event。

### 3.2 项目隔离策略

- 记忆命名空间以 projectId 为主键。
- 回退策略：
  - 运行上下文有 projectId -> 使用该 projectId
  - 无 projectId -> 仅允许 company 级 provider，且不写入 project namespace
- 绑定解析优先级：project > agent > company。

### 3.3 provider 调用契约

- recall(query, projectId, topK) 返回 items（id/content/metadata）。
- ingest(content, projectId, userId/tags) 返回写入结果。
- provider 错误不阻塞主执行链路（降级为无记忆），但写审计日志。

## 4. 分步实施

## Step 1: 收敛并修正现有草稿实现

- 检查并修正以下文件中的占位/错误导入：
  - packages/adapter-utils/src/memory-provider.ts
  - packages/adapter-utils/src/memory-provider-mem0.ts
  - packages/adapter-utils/src/memory-provider-local-markdown.ts
  - server/src/services/memory-provider.ts
- 统一类型定义，避免 any 扩散。
- 确保 adapter-utils 导出可被 server 正确消费。

完成标准：类型检查通过，无路径导入错误。

## Step 2: 扩展共享契约支持 project scope

- 更新 shared validators/types：scopeType 支持 project。
- 保持向后兼容 company/agent。
- 如 DB schema 已是 text 字段则无需 migration，仅更新契约与服务逻辑。

完成标准：API 校验接受 project scope。

## Step 3: 实现 provider 解析与审计服务

- 在 server memory service 中实现：
  - resolveActiveBinding(companyId, projectId, agentId)
  - createProvider(binding)
  - recordMemoryOperation(...)
- 审计写入 memory_operations：operationKind in [recall, ingest]。

完成标准：可从 DB 正确解析 binding，并能记录 recall/ingest 审计。

## Step 4: heartbeat 链路接入

- run 启动前：
  - 基于 issue/project 上下文组装 recall query
  - recall 结果注入 context（例如 paperclipMemoryRecall）
- run 完成后：
  - 取 continuation summary（或精简 run 摘要）执行 ingest
- provider 调用失败仅记录日志与审计，不影响 run 成败。

完成标准：在有 binding 时可看到上下文注入与落库审计；无 binding 时零影响。

## Step 5: 配置入口（最小可用 API）

- 新增 memory bindings 路由（公司维度）：
  - GET /api/companies/:companyId/memory-bindings
  - POST /api/companies/:companyId/memory-bindings
  - PATCH /api/companies/:companyId/memory-bindings/:bindingId
  - DELETE /api/companies/:companyId/memory-bindings/:bindingId（软禁用或删除）
- 复用 shared 的 create/updateMemoryBindingSchema。

完成标准：用户可通过 API 配置 mem0，且不配置时默认不启用。

## Step 6: 测试与验证

- 单元测试：
  - 解析优先级 project > agent > company
  - 无 binding 时禁用
  - mem0 配置缺失时禁用
- 集成验证：
  - heartbeat recall/ingest 行为与审计写入
- 回归检查：现有 heartbeat 主链路不被破坏。

建议命令：

- pnpm -r typecheck
- pnpm test:run

## 5. 风险与缓解

1. 风险：provider 故障影响 heartbeat 稳定性。
缓解：provider 调用统一 try/catch，失败降级，永不抛出到主链路。

2. 风险：projectId 在部分 run 上下文缺失导致隔离失效。
缓解：显式记录 namespace 来源；缺失时跳过写入或回退 company 策略。

3. 风险：配置入口权限越权。
缓解：沿用 assertCompanyAccess + board/agent 权限约束。

## 6. 验收清单

- [ ] mem0 provider 可工作（基于有效配置）。
- [ ] project 维度隔离生效。
- [ ] 未配置 binding 时不启用记忆功能。
- [ ] heartbeat recall/ingest 完成接入。
- [ ] memory_operations 有 recall/ingest 审计记录。
- [ ] typecheck + tests 通过。

## 7. 下一阶段

PLAN 完成后进入 REVIEW：

- 先对本计划做可执行性审查（依赖、回归风险、测试覆盖）。
- 审查通过后进入 BUILD，按 Step 1-6 实施。
