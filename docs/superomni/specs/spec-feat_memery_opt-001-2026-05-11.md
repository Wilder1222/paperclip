# Spec: 记忆系统与Token消耗优化方案

**Branch:** feat_memery_opt  
**Session:** 001  
**Date:** 2026-05-11  
**Stage:** THINK → PLAN  

---

## 1. 背景与动机

### 1.1 当前记忆系统现状审查

Paperclip 当前的记忆体系由以下几个层次构成：

| 层次 | 实现 | 当前状态 |
|------|------|----------|
| **会话内记忆** | `issue-continuation-summary.ts` — 每次 run 结束后写入的延续摘要，最大 8K chars | 已上线，效果有限 |
| **结构化知识库** | `kbEntries` + `kbCollections` (Postgres) — 支持草稿/发布/审核流程 | 已上线，但缺少自动注入机制 |
| **文件记忆** | `para-memory-files` skill — PARA 方法三层文件结构 | 技能已定义，但执行依赖 agent 自觉 |
| **记忆 Provider 绑定** | `memory_bindings` + `memory_operations` (DB schema) | 已建模，**但实际 provider 端实现缺失** |
| **Session 压缩策略** | `session-compaction.ts` — 阈值驱动：200 runs / 2M tokens / 72h | 已上线，粗粒度 |

### 1.2 Token 消耗热点分析

通过代码审查识别出 5 大 token 消耗热点：

**热点 1：Agent 启动指令包（高频 · 高成本）**
- 每次 session 启动时，`AGENTS.md` + 所有子文件全量注入
- 无内容去重、无分层缓存
- 参考：`server/src/services/agent-instructions.ts` — `AgentInstructionsBundle`

**热点 2：Issue 上下文全量加载（最大热点）**
- `GET /api/issues/{id}/comments` 在冷启动时返回完整评论线
- 已有 `heartbeat-context` 增量 API，但 agents 执行中未强制使用
- 大型 issue 可达数百条评论，每次唤醒都承担全量成本

**热点 3：延续摘要压缩效率低**
- `ISSUE_CONTINUATION_SUMMARY_MAX_BODY_CHARS = 8_000`（约 2K tokens）
- 每个节（Objective/Actions/Files/Blockers）上限 1,200 chars
- 格式为散文 Markdown，语义密度低于结构化格式
- 无跨 run 去重：相同路径/动作反复写入

**热点 4：KB 知识不自动注入上下文**
- KB entries 存在数据库中，但没有自动检索注入 prompt 的管道
- Agent 必须主动调用 `/api/companies/{id}/knowledge` API 查询
- 无相关性过滤 — 无向量/BM25 检索支持

**热点 5：Session 压缩策略粗放**
- 当前：仅按阈值（tokens/runs/时间）触发轮转
- 轮转时无内容选择 — 无法保留高价值上下文
- 无 prompt caching（Claude/Gemini 均支持）

### 1.3 已完成的优化（基线）

来源：`report/2026-03-13-08-46-token-optimization-implementation.md`

- ✅ 心跳遥测：从会话累计值改为每 run 增量值
- ✅ Session 轮转策略驱动化（`session-compaction.ts`）
- ✅ 增量评论查询 API（`?after={id}&order=asc`）
- ✅ `inbox-lite` 紧凑分配列表
- ✅ Bootstrap 提示 vs 每次心跳提示模板分离
- ✅ Skills 更新为优先使用紧凑 API

---

## 2. GitHub 设计调研摘要

### 2.1 Mem0 (55.4K stars) — token 高效记忆算法

来源：https://mem0.ai/research + https://github.com/mem0ai/mem0

**核心设计亮点：**

1. **单次 ADD-only 提取**：一个 LLM 调用完成记忆提取，无 UPDATE/DELETE，事实只叠加不覆盖（打 `superseded` 标记）
2. **三重信号检索融合**：语义相似度 + BM25 关键词 + 实体匹配并行运行，结果分数融合
3. **实体链接**：跨记忆条目提取和链接实体（人名/公司/项目），用于检索加权
4. **记忆衰减**（新增 April 2026）：支持 decay 策略，老化无效记忆

**性能数据（新算法）：**

| 基准 | 准确率 | 平均 Token 消耗 |
|------|--------|-----------------|
| LoCoMo | 91.6 | ~7K |
| LongMemEval | 93.4 | ~6.8K |
| BEAM 1M | 64.1 | ~6.7K |
| 对比：全上下文方案 | — | 25K+ |

**结论**：Mem0 在保持高准确率的前提下，token 消耗是全上下文方案的 1/3～1/4。

### 2.2 Letta/MemGPT (22.6K stars) — 可自我编辑的内存块

来源：https://github.com/letta-ai/letta

**核心设计亮点：**

1. **结构化记忆块**（`memory_blocks`）：`human`（用户信息）+ `persona`（agent 身份）等具名内存块
2. **Agent 可自我编辑**：agent 可以通过工具更新自己的记忆块，形成持续学习
3. **外部化 archival memory**：超出 in-context 的内容自动存入可检索的外部存储

**与 Paperclip 的关联**：`memory_bindings` 的架构与 Letta 的 memory blocks 理念相近，但缺少 agent 自写入的工具闭环。

### 2.3 OpenAI Agents SDK — Sessions & Tracing

来源：https://github.com/openai/openai-agents-python

**核心设计亮点：**

1. **自动会话历史管理**：跨 agent run 自动维护对话历史，开发者无需手动管理
2. **Sandbox Agents**：带文件系统的持久化沙箱，工作区状态跨 run 保留
3. **内置 Tracing**：token 使用量、延迟、工具调用全量追踪用于优化

---

## 3. 差距分析与核心问题

| 问题 | 严重度 | 当前状态 | 最佳实践差距 |
|------|--------|----------|--------------|
| KB 无自动相关性注入 | 🔴 高 | 手动 API 查询 | Mem0：检索融合后自动注入 |
| 延续摘要语义密度低 | 🟡 中 | 散文 Markdown 8K chars | 可压缩 50%+ |
| Agent 指令无分层缓存 | 🔴 高 | 每次全量加载 | Claude prompt caching 可减少 90% |
| Session 压缩无内容选择 | 🟡 中 | 阈值轮转清空 | 保留高价值上下文再轮转 |
| memory_bindings 有架构无实现 | 🟠 高 | DB schema 存在，无 provider impl | Mem0 provider 可直接接入 |
| 无记忆衰减机制 | 🟡 中 | 无 | Mem0 decay 策略 |
| KB 无向量检索 | 🔴 高 | SQL ILIKE only | 语义检索可大幅提高命中率 |

---

## 4. 优化目标

### 4.1 量化目标（建议）

| 指标 | 当前估算 | 目标 | 方法 |
|------|----------|------|------|
| 每次心跳 input tokens（典型任务）| ~15K-25K | <8K | 压缩延续摘要 + 增量 context + 指令缓存 |
| KB 相关记忆检索精准率 | ~40%（依赖关键词） | >80% | 引入向量检索 |
| Agent 指令 tokens（重复部分）| 100%（每次全量）| ~10%（cache hit）| Prompt caching |
| 延续摘要有效信息密度 | 低（散文）| 高（结构化）| YAML/表格格式重构 |

### 4.2 非目标（本 spec 范围外）

- 不实现新的 UI 功能页面
- 不修改数据库 migration（除非新增独立表格）
- 不替换现有 KB CRUD API

---

## 5. 优化方案设计

### 方案 A：延续摘要压缩重构（优先级：最高，最小改动）

**目标**：将延续摘要从散文 Markdown 压缩到结构化 YAML，减少约 40-60% token 消耗

**现状**：
```
ISSUE_CONTINUATION_SUMMARY_MAX_BODY_CHARS = 8_000
SUMMARY_SECTION_MAX_CHARS = 1_200
```

**改进设计**：

```typescript
// 新格式：结构化 YAML-in-Markdown（~3K chars 即可承载相同信息量）
const COMPACT_SUMMARY_MAX_CHARS = 3_500;

/*
issue: PAP-123 — Fix auth flow
status: in_progress | priority: high | mode: implementation
agent: claude | run: run-abc | finished: 2026-05-11T10:00Z

objective: |
  Repair OAuth token refresh on 401 responses

criteria_met:
  - [x] Add refresh token interceptor to axios client
  - [ ] Add integration test for token expiry

recent_actions:
  - run-abc: Implemented TokenRefreshInterceptor in ui/src/lib/api.ts
  - run-abc: Wrote unit test, fails on edge case (empty refresh_token)

files: [ui/src/lib/api.ts, ui/src/lib/auth.ts, server/src/routes/auth.ts]

blockers:
  - Empty refresh_token case not handled in getNewTokens()

next: Fix empty refresh_token guard in getNewTokens(), then re-run unit tests.
*/
```

**改动文件**：
- `server/src/services/issue-continuation-summary.ts` — 重写 `buildContinuationSummaryMarkdown()`
- 保持 `IssueContinuationSummaryDocument` 接口不变（向后兼容）

---

### 方案 B：Agent 指令 Prompt Caching（优先级：高）

**目标**：利用 Claude/Anthropic prompt caching，将 AGENTS.md 等静态指令缓存，减少 90%+ 的重复 token 消耗

**实现思路**：

1. **识别静态/动态部分分界**：
   - 静态（可缓存）：AGENTS.md 系统指令、Skills 内容、公司通用配置
   - 动态（不可缓存）：当前 issue context、最新评论、continuation summary

2. **在 adapter 执行层添加 cache_control 标记**（Claude adapter）：
   ```typescript
   // packages/adapters/claude-local/src/server/execute.ts
   // 在 system prompt 末尾添加 cache_control breakpoint
   {
     type: "text",
     text: staticSystemPrompt,
     cache_control: { type: "ephemeral" }  // Claude prompt caching
   }
   ```

3. **在遥测中跟踪 cache hit/miss**：`cachedInputTokens` 字段已在 `UsageSummary` 中存在

**改动文件**：
- `packages/adapters/claude-local/src/server/execute.ts` — 添加 cache breakpoint
- `packages/adapters/gemini-local/src/server/execute.ts` — Gemini 2.5 支持上下文缓存

**预期效果**：Claude Sonnet 的 prompt caching 使缓存命中的 input tokens 成本降至 1/10（$0.003/M vs $0.03/M）

---

### 方案 C：KB 向量检索 + 自动上下文注入（优先级：高）

**目标**：给 KB entries 添加向量嵌入，实现基于 issue 内容的自动相关记忆检索注入

**设计**：

```typescript
// 新表：kb_entry_embeddings（或在 kbEntries 中添加 embedding 列）
// 使用 pgvector 扩展（PGlite 支持）

// 工作流：
// 1. KB entry 创建/更新时，异步生成嵌入向量
// 2. 每次 heartbeat-context 响应中，附加 top-5 相关 KB 条目摘要
// 3. Agent 通过 heartbeat-context 自动获得相关知识，无需手动查询
```

**依赖检查**：
```sql
-- PGlite 支持 pgvector
CREATE EXTENSION vector;
ALTER TABLE kb_entries ADD COLUMN embedding vector(1536);
```

**改动文件**：
- `packages/db/src/schema/kb_entries.ts` — 添加 embedding 列
- `server/src/services/knowledge.ts` — 添加 `searchByEmbedding()` 方法
- `server/src/routes/issues.ts` — `heartbeat-context` 注入 top-K KB 摘要

---

### 方案 D：Memory Provider 端到端实现（优先级：中）

**目标**：激活已建模的 `memory_bindings` 架构，实现 `local_markdown` provider 和 Mem0 provider 的端到端工作流

**现状**：`memory_bindings` + `memory_operations` 表存在，但没有：
- Memory provider 接口定义
- 实际的 recall/ingest 实现
- heartbeat 触发的自动 ingest pipeline

**设计（三步）**：

**Step 1 — Provider 接口**：
```typescript
// packages/adapter-utils/src/memory-provider.ts（新文件）
export interface MemoryProvider {
  recall(query: string, options: RecallOptions): Promise<MemoryRecallResult>;
  ingest(content: string, metadata: IngestMetadata): Promise<IngestResult>;
  forget(memoryId: string): Promise<void>;
}
```

**Step 2 — local_markdown provider**（基于现有 para-memory-files skill）：
- 实现文件系统读写
- BM25 关键词检索（不需要向量）

**Step 3 — heartbeat 集成**：
- `ingest`：run 结束后，将 continuation summary 写入记忆
- `recall`：heartbeat 开始时，按 issue 关键词检索相关记忆注入

---

### 方案 E：Session 压缩智能化（优先级：中）

**目标**：在 session 轮转前，生成"高价值上下文摘要"作为新 session 的种子

**现状**：session 轮转时直接清空，仅有 continuation summary 作为跨 session 连接

**改进**：

```typescript
// server/src/services/issue-continuation-summary.ts
// 新增：session handoff 摘要生成
export async function buildSessionHandoffNote(
  previousSummary: string | null,
  runHistory: RunSummary[],  // 最近 N 个 run
): Promise<string> {
  // 保留最重要的内容：已完成的事项 + 当前阻塞 + 下一步
  // 丢弃：冗余步骤描述、已解决的 blockers
}
```

---

## 6. 实施优先级与依赖关系

```
方案 A（延续摘要重构）
  → 独立，最小风险，立即可做
  → 预期收益：-40% continuation summary token 消耗
  → 时间：1-2 天

方案 B（Prompt Caching）
  → 依赖 adapter execute 层，需 Claude/Gemini 适配
  → 预期收益：-80% 系统指令重复 token 消耗
  → 时间：2-3 天

方案 C（KB 向量检索）
  → 依赖 pgvector，需 DB migration
  → 预期收益：KB 检索精准率大幅提升，减少无关注入
  → 时间：3-5 天

方案 D（Memory Provider）
  → 依赖方案 C 的向量基础设施
  → 预期收益：实现完整的记忆持久化闭环
  → 时间：5-7 天

方案 E（Session 智能压缩）
  → 依赖方案 A 的摘要格式改进
  → 预期收益：跨 session 知识保留率提升
  → 时间：2-3 天
```

---

## 7. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| 方案 A 改变摘要格式可能影响 agents 解析 | 中 | 在 skill 中同步更新 agent 提示词说明新格式 |
| 方案 B Prompt caching 仅 Claude/Gemini 支持 | 低 | 按适配器条件启用，其他适配器跳过 |
| 方案 C pgvector 在嵌入式 PGlite 中可能有性能限制 | 中 | 先用降维向量（384维）+ 批量异步嵌入 |
| 方案 D memory provider 实现复杂度高 | 高 | V1 仅实现 local_markdown，Mem0 作为 V2 |
| 整体：token 统计口径变化影响预算警告 | 低 | 缓存命中的 tokens 不计入 costUsd，已有字段隔离 |

---

## 8. 成功指标

实施后通过以下指标验证效果：

1. **延续摘要大小**：目标 <3.5K chars（vs 当前 8K）
2. **Claude adapter 缓存命中率**：`cachedInputTokens / inputTokens > 0.6`（稳态运行时）
3. **KB 检索精准率**：通过 eval 脚本验证 top-5 命中率 >80%
4. **每心跳平均 input tokens**：通过 `memory_operations.tokenCount` + heartbeat telemetry 追踪

---

## 9. 验收标准

- [ ] 延续摘要格式重构，保持 API 向后兼容
- [ ] Claude adapter 添加 cache_control breakpoint，遥测反映 cachedInputTokens
- [ ] KB entries 支持向量检索，heartbeat-context 自动附加相关 KB 摘要
- [ ] `memory_bindings` 端到端可用（至少 local_markdown provider）
- [ ] 所有改动通过 `pnpm -r typecheck && pnpm test:run`

---

*此 spec 待 PLAN 阶段转化为可执行任务列表。*
