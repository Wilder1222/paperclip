# 产品规划 Spec — Sessions 008-010

**Branch:** feat_agent_artifacts / next sprint  
**Session:** 004（规划文档）  
**Date:** 2026-05-08  
**Status:** PENDING_REVIEW

---

## 1. 当前状态总结

### 已完成（`feat_agent_artifacts` 分支 Sessions 001–007）

| Session | 功能 | 状态 |
|---------|------|------|
| 001 | Work Products 侧边栏展示 | ✅ |
| 002 | Goal Progress 视图（进度条、树形展示） | ✅ |
| 003 | Issue Documents Tab（列表、展开查看、Markdown 渲染、编辑） | ✅ |
| 004 | Plan Approval Banner + `useDocumentPendingApproval` 钩子 | ✅ |
| 005 | Deliverables Tab（汇总文档 + Work Products） | ✅ |
| 006 | Revision History 侧边抽屉 | ✅ |
| 007 | Board 创建文档对话框 | ✅ |

**未提交变更**（需先 commit）：`IssueDocuments.tsx`、`IssueDocuments.test.tsx`、`IssueDetail.tsx`

### 关键缺口（gap analysis）

| 缺口 | 影响 | 优先级 |
|------|------|--------|
| **服务端缺少计划审批拦截** | Agent 仍可无审批执行；UI 的 Banner 形同虚设 | P0 |
| **Board 无法手动添加 Work Product** | 无法从 Board 端链接 PR/部署 URL/文件 | P1 |
| **Goal Progress 数据为占位符** | 进度条显示 0%，Goal Detail 页无实际数据 | P1 |
| **Agent Document 写入路径未验证** | Agent 能否通过 bearer key 写文档不明确 | P1 |
| **Work Product 审核状态 UI** | `review_state` 字段有值但 Board 看不到 | P2 |

---

## 2. 下一步产品功能规划

### Session 008：完成并合并 feat_agent_artifacts 分支

**目标**：将 Sessions 004–007 的未提交变更正式提交，整个 `feat_agent_artifacts` 分支合并到 master。

**范围**：
- `git add` + `git commit` 未提交的三个文件
- 运行 `pnpm test:run` 验证
- 合并到 master

**验收**：CI 绿；master 包含所有 001-007 功能。

---

### Session 009：Plan Approval 服务端门控 + Board Work Products 管理

**目标 A — 服务端计划审批拦截**

在 Heartbeat/执行发起前，若 Issue 存在 `key="plan"` 的文档且有未决的 `request_confirmation` 交互（`targetDocumentKey="plan"`、状态未解决），服务端返回 `409 PLAN_APPROVAL_REQUIRED`，阻止 Agent 继续执行。

实现细节：
1. `server/src/services/document.ts`（或 issue checkout 路径）：新增 `checkPlanApprovalGate(issueId)` 函数
2. 在 `POST /issues/:id/heartbeat`（或 checkout wakeup）路径调用此门控
3. 返回结构：`{ error: "PLAN_APPROVAL_REQUIRED", planDocumentKey: "plan", interactionId: "..." }`
4. UI 处理：在 Run/Heartbeat 发起错误时显示"Plan needs approval before execution"提示

**目标 B — Board 手动添加 Work Products**

Board 在 Deliverables Tab 点击"Add Work Product"按钮，填写类型+链接+标题，提交后显示在列表中。

实现细节：
1. `ui/src/components/IssueDeliverables.tsx`：添加 `CreateWorkProductDialog` 组件
2. `ui/src/api/issues.ts`：添加 `createWorkProduct`、`deleteWorkProduct` 方法（服务端 API 已存在）
3. 类型支持：`pull_request`、`preview_url`、`artifact`、`branch`、`document`

**验收标准**：
- Agent 在 plan 未批准时无法发起执行
- Board 可添加/删除 Work Products
- Work Product 列表实时更新

---

### Session 010：Goal Progress 实际数据 + Agent Document 写入验证

**目标 A — Goal Progress 实际聚合**

当前 `GET /goals/:id` 的 `actualProgress`/`healthScore` 字段为占位符或 0。需要基于关联 Issues 的完成率计算真实进度。

实现细节：
1. `server/src/services/goals.ts`：`computeGoalProgress(goalId)` — 遍历直接关联 Issues，`completed/total` 计算完成率
2. 支持递归子目标聚合（可选：一期做直接关联就够）
3. `GET /goals/:id` 返回计算后的 `actualProgress`（0-100）
4. `GET /goals` list 返回聚合后的 `healthScore`（`on_track` / `at_risk` / `off_track`）
5. UI 进度条无需修改（已消费 `actualProgress` 字段）

**目标 B — Agent Document 写入路径验证**

确认 Agent（bearer key auth）能通过 `PUT /issues/:id/documents/:key` 写文档，并写活动日志。

实现细节：
1. 检查 `server/src/routes/issues.ts` 中文档写入路由的 auth middleware
2. 若仅允许 board 用户 → 添加 agent key auth 支持
3. 新增集成测试：使用 agent bearer key 写文档并验证结果
4. Activity log 条目中正确标记 `agentId`

**验收标准**：
- Goal 详情页进度条显示真实数值
- Agent 可通过 API key 写文档并体现在修订历史中

---

## 3. 技术路线图（中长期）

### Phase 1：完成控制平面核心循环（当前 Sprint）
```
Sessions 008-010（约 2-3 天）
  → 合并 feat_agent_artifacts → P0 门控 → P1 数据实际化
  → 结果：Agent 的"提交计划→审批→执行→产出"闭环完整可用
```

### Phase 2：Enforced Outcomes（～2 周后）
```
GitHub Webhook → PR merged → Issue auto-complete
Work Product 审核状态 Board UI
  → 结果：工作"完成"不再只是状态更新，有可验证的外部证据
```

### Phase 3：CEO Chat（～1 个月后）
```
复用 v2026.427 结构化线程交互基础
轻量对话入口 → 解析为 Issue/Approval/Decision 对象
  → 结果：运营摩擦降低，无需每次操作都打开 Issue 详情
```

### Phase 4：Memory / Knowledge Service（～6 周后）
```
推进 doc/plans/2026-03-17-memory-service-surface-api.md 方案
Agent 级持久记忆 API
公司/项目级知识沉淀
  → 结果：Agent 跨 heartbeat 积累上下文，不再每次从零开始
```

### Phase 5：MAXIMIZER MODE（待治理层稳定后）
```
更激进的委派，更强的执行循环
需 Phase 1-3 的治理层作为基础
```

---

## 4. 风险与依赖

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| Plan approval gate 影响现有 heartbeat 流程 | 中 | 用 feature flag 控制，默认 off，逐步灰度 |
| Goal progress 递归聚合性能 | 低 | 一期只做直接关联，不递归 |
| `feat_agent_artifacts` 与 master 存在合并冲突 | 低 | 分支基于最新 master，diff 较小 |
| Agent document 路由 auth 改动影响现有 agent 行为 | 低 | 只添加权限，不移除现有权限 |

---

*生成日期：2026-05-08*  
*状态：等待审核确认后开始执行*
