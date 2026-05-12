# Paperclip 产品功能规划 Spec

- **Branch:** feat_hire_agent  
- **Session:** roadmap-planning  
- **Date:** 2026-05-12  
- **Stage:** THINK  
- **Status:** 待审批

---

## 1. 现状评估

### 1.1 上游 Paperclip 最新进展（截至 v2026.428）

| 能力域 | 状态 | 关键 PR/版本 |
|--------|------|-------------|
| 多用户访问 & 邀请流程 | ✅ 已上线 | v2026.427 |
| 结构化 issue 线程交互（提案/表单/确认卡） | ✅ 已上线 | v2026.427 |
| 运行存活性续接 & 运行时恢复 | ✅ 已上线 | v2026.427 |
| Sub-issue 作为工作流检查列表 | ✅ 已上线 | v2026.427 |
| Issue 子树暂停/取消/恢复 | ✅ 已上线 | v2026.427 |
| Issue 第一方引用（`PAP-123` 互相链接） | ✅ 已上线 | v2026.427 |
| **BETA** 环境 & 可插拔沙箱（e2b） | ⚠️ BETA | v2026.427 |
| 侧边栏 per-agent 暂停/恢复 | ✅ 已上线 | v2026.428 |
| 生产力审查服务（stall 检测） | ✅ 已上线 | v2026.428 |
| Issue 列表滚动分页 | ✅ 已上线 | v2026.428 |
| 预算硬停 & 开销追踪 | ✅ 已上线 | v2026.427+ |
| Agent 技能管理器 | ✅ 已上线 | 早期版本 |
| 定时例行任务（Routines） | ✅ 已上线 | 早期版本 |

### 1.2 Fork 本地已实现功能

| 分支 | 功能 | 状态 |
|------|------|------|
| `feat_agent_artifacts` | 工作产出（Work Products）、交付物标签页、修订历史、计划审批门 | ✅ 已实现 |
| `feat_company_knowledge` | 公司知识库（KB Collections/Entries） | ✅ 已实现 |
| `feat_memery_opt` | 记忆 Provider 服务、Token 消耗优化、Session 压缩策略 | ✅ 已实现 |
| `feat_hire_agent`（当前） | 员工招聘/组织架构操作改进 | 🔨 进行中 |

### 1.3 Roadmap 未落地项（上游 ⚪）

按战略价值排序：

| # | 功能域 | 战略价值 | 依赖 | 复杂度 |
|---|--------|----------|------|--------|
| 1 | **Enforced Outcomes（强制结果）** | 核心控制平面完整性 | issue 模型 | 中 |
| 2 | **Deep Planning（深度规划）** | agent 执行质量提升 | issue 文档 + 提案流 | 中高 |
| 3 | **CEO Chat（CEO 对话）** | 人机协作体验 | issue 模型 + 结构化交互 | 中 |
| 4 | **Work Queues（工作队列）** | 高吞吐量工作流 | 调度器扩展 | 高 |
| 5 | **MAXIMIZER MODE** | 高自主执行 | 全链路治理健全 | 高 |
| 6 | **Self-Organization（自组织）** | 组织自适应 | 组织模型 + 提案流 | 高 |
| 7 | **Automatic Org Learning（组织自动学习）** | 知识积累飞轮 | 知识库 + 分析管道 | 高 |
| 8 | **Cloud/Sandbox agents（云/沙箱 agent）** | 安全隔离执行 | BETA 已在 v427 | 中 |
| 9 | **Cloud Deployments（云部署）** | 多租户托管 | DevOps 专项 | 高 |
| 10 | **Desktop App（桌面应用）** | 日常运营体验 | Electron/Tauri | 高 |

---

## 2. 规划优先级与实现路线

### 2.1 优先级依据

基于以下三个维度综合评分：

- **用户价值**：直接影响 agent 公司运营效果
- **技术可行性**：当前代码库基础 + 已有 fork 功能的协同性
- **战略连贯性**：与核心价值主张「透明治理下的自主 AI 公司」的对齐度

### 2.2 近期路线（Phase 1：2026-Q2 后半段）

#### P1-A：完成在建分支合并

目标：把已实现的功能合并到主线，消除分支分叉债务。

| 任务 | 分支 | 工作量 |
|------|------|--------|
| Work Products 完整功能合并 | `feat_agent_artifacts` → master | M（需 UI/API 测试补全） |
| 知识库功能合并 | `feat_company_knowledge` → master | S |
| 记忆优化合并 | `feat_memery_opt` → master | M（需端到端测试） |
| 人员招聘/org 操作 | `feat_hire_agent` → master | M（当前进行中） |

#### P1-B：Enforced Outcomes（强制结果）

**为什么第一个做：** agent 执行的结果目前停留在状态更新，而非可验证的产出。在 Work Products 和知识库基础上，这是逻辑上的下一步。

**核心需求：**

1. **Issue Resolution Types（议题解析类型）** — 每个完成的 issue 必须声明一个解析类型：
   - `code_merged`：代码已合并/推送
   - `artifact_published`：工件已发布（文档、API、报告）
   - `decision_recorded`：明确决策被记录为工作产出
   - `blocked_escalated`：明确升级阻塞
   - `cancelled_with_reason`：有原因的取消

2. **Completion Evidence（完成证据）** — issue 进入 `completed` 前，必须有至少一个 work product 或外部引用（PR 链接、文件路径、知识库条目）作为证据。

3. **Board Visibility（看板可见性）** — 专用的"已完成工作"视图，按结果类型过滤，可导出为摘要。

**数据模型变更：**
```
issues:
  + resolution_type: enum('code_merged'|'artifact_published'|'decision_recorded'|'blocked_escalated'|'cancelled_with_reason') nullable
  + completion_evidence: jsonb nullable  -- [{type, url, ref}]
  + completed_without_evidence_reason: text nullable

work_products:
  + is_completion_evidence: boolean not null default false
```

**API 变更：**
- `PATCH /issues/:id` — 新增 `resolutionType` + `completionEvidence` 字段
- `GET /companies/:companyId/completions` — 按解析类型聚合的已完成工作列表
- Agent API：`POST /agent/issues/:id/complete` — 强制要求提供 resolution type

**UI 变更：**
- Issue 完成流程增加"解析类型"选择步骤
- 看板新增"已交付"视图（按 resolution type 分组）
- Dashboard 增加"本期交付成果"卡片

**估计工作量：** M（约 3-5 天）

---

#### P1-C：Deep Planning（深度规划）增强

**为什么现在做：** 已有 Issue Documents + Work Products + 提案交互（v427）基础，深度规划是这三者的自然组合。

**核心需求：**

1. **Plan Documents（计划文档）** — 每个 issue 可以有一个 `plan` 类型的文档，结构化为：
   - 目标（Goal）
   - 约束条件（Constraints）
   - 实现方案列表（Approaches）— 每个方案有 pros/cons
   - 选定方案（Selected Approach）
   - 执行步骤（Steps）— 与 sub-issues 联动

2. **Plan Approval Gate（计划审批门）** — fork 的 `feat_agent_artifacts` 已实现基础。扩展为：
   - agent 提交计划 → 看板 board 审批
   - 审批通过后 issue 才能进入 `in_progress`
   - 可配置为公司级开关（默认关闭，减少摩擦）

3. **Revision History（修订历史）** — fork 已实现，需要完善 UI（diff 视图）

4. **Agent Plan API** — agent 通过 API 提交和更新计划：
   ```
   POST /agent/issues/:id/plan        — 提交计划草稿
   POST /agent/issues/:id/plan/revise — 提交修订
   GET  /agent/issues/:id/plan        — 获取当前批准计划
   ```

**估计工作量：** M-L（约 5-8 天，含 UI diff 视图）

---

### 2.3 中期路线（Phase 2：2026-Q3）

#### P2-A：CEO Chat（CEO 对话）

**目标：** 轻量级对话界面，但对话必须解析为具体工作对象（Issue/Plan/Decision）。

**核心需求：**

1. **CEO Chat 入口** — 独立的聊天界面，底层通过 issue comment + 结构化提案实现
2. **意图路由** — 对话消息解析为：
   - 创建新 issue
   - 更新现有 issue
   - 请求 CEO 执行策略分析（产出计划文档）
   - 记录决策（产出决策型 work product）
3. **对话上下文** — 对话窗口内联显示相关 issue、metrics、最近 run 摘要

**实现约束：** 底层仍是 issue + comment 模型，CEO Chat 是 UI 层薄包装，不引入独立存储。

**估计工作量：** M（约 4-6 天）

---

#### P2-B：Work Queues（工作队列）

**目标：** 支持高吞吐量、重复输入的工作流（如支持、审查、分类）。

**核心需求：**

1. **Queue 定义** — 可命名的 issue 队列，带路由规则（按标签/优先级/来源分派给特定 agent）
2. **Auto-intake** — webhook/API 端点可向队列提交工作项
3. **Queue 监控** — 看板显示各队列积压、处理速率、SLA 违规
4. **Agent 队列消费 API** — `GET /agent/queues/:queueId/next` — 原子性领取下一工作项

**数据模型：**
```
work_queues:
  id, company_id, name, routing_rules jsonb, assigned_agent_id uuid nullable

queue_items:
  id, queue_id, issue_id, status, claimed_at, claimed_by_agent_id
```

**估计工作量：** L（约 8-12 天）

---

#### P2-C：MAXIMIZER MODE（最大化模式）

**目标：** 更高自主性的执行模式，激进委托但保持治理边界。

**核心需求：**

1. **自主度级别** — 公司/agent 级可配置的自主度：
   - Level 1（当前默认）：每个重要决策等待审批
   - Level 2：主要里程碑审批，细节自主
   - Level 3：仅在预算/风险阈值触发时通知人类

2. **预算扩容信号** — agent 在预算耗尽前可发出"我需要更多预算才能完成目标"信号，而非简单停止

3. **自主度仪表盘** — 实时显示各 agent 的决策自主度使用情况

**估计工作量：** L（约 10-14 天，含 UI）

---

### 2.4 远期路线（Phase 3：2026-Q4）

#### P3-A：Self-Organization（自组织）

agent 可以提议结构性变化（角色调整、新定期例程、委托变更），board 审批后生效。

#### P3-B：Automatic Organizational Learning（组织自动学习）

基于已完成工作的 work products 和 KB，自动提取 playbooks、常见修复模式和决策模式，注入未来 agent 上下文。

#### P3-C：Cloud/Sandbox Agents GA

把 v427 BETA 的 e2b 沙箱提升为 GA，扩展到更多云环境（Daytona、Modal、Fly.io）。

#### P3-D：Cloud Deployments（托管部署）

清晰的多租户托管路径：Docker Compose → k8s helm chart → 全托管 SaaS。

---

## 3. Fork 专项路线

这是 HenkDz/paperclip fork 特有的、不进入上游的功能：

### F1：外部 Adapter 故事完善（feat/externalize-hermes-adapter）

- 确保适配器插件管理器 UI 稳定
- `@henkey/hermes-paperclip-adapter` 文档和测试完善
- Plugin Manager 支持版本锁定和热更新

### F2：QoL 补丁维护

持续维护三个 QoL 补丁（`stderr_group`、`tool_group`、Dashboard excerpt），并在每次 upstream 合并后验证兼容性。

### F3：记忆优化 GA（feat_memery_opt）

- 完成 Memory Provider 实现（目前仅有 schema，缺实现）
- KB 自动注入检索管道（向量/BM25）
- Session 压缩优化（prompt caching）

---

## 4. 技术风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 上游 v427+ 迁移冲突（fork 分支） | 高 | 高 | 每次 upstream 合并后立即运行 `pnpm -r typecheck + pnpm test:run` |
| Work Queues 与现有调度器竞争 | 中 | 高 | Work Queues 使用现有 issue checkout 语义，不引入新的并发原语 |
| CEO Chat 增加系统复杂度 | 中 | 中 | 坚守"底层是 issue"约束，CEO Chat 是纯 UI 薄包装 |
| Memory Provider 实现拖延 | 高 | 中 | 分两步：先实现 in-process provider，再做外部向量库集成 |
| Enforced Outcomes 摩擦太高 | 低 | 中 | 默认所有校验为 advisory（警告），操作员显式开启 strict 模式 |

---

## 5. 验收标准（Phase 1）

- [ ] 所有在建分支合并到 master，CI 全绿
- [ ] Issue 完成流程支持 `resolution_type` 选择
- [ ] "已交付"看板视图可用
- [ ] Plan document API 可由 agent 调用并获得 board 审批
- [ ] Work Products 在 issue 详情页完整可用（创建/查看/关联完成证据）
- [ ] `pnpm -r typecheck && pnpm test:run` 全通过

---

## 6. 开放问题（待 Board 决策）

1. **Enforced Outcomes 的强制程度**：默认 advisory 还是 strict？建议 advisory，等真实用户反馈后升级。
2. **CEO Chat 的优先级**：是 Q2 还是 Q3？CEO Chat 对 agent 公司运营体验提升明显，但 Work Queues 的 ROI 更高。
3. **Work Queues 与 Routines 的边界**：Work Queues 面向外部输入驱动；Routines 面向内部定时触发。两者是否需要统一调度抽象？

---

*Spec 生成于：2026-05-12 | 分支：feat_hire_agent | 阶段：THINK*
