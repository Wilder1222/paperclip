# 实现计划 — Sessions 008-010

**Branch:** feat_agent_artifacts → next sprint  
**Session:** 004  
**Date:** 2026-05-08  
**Spec:** `docs/superomni/specs/spec-feat_agent_artifacts-004-2026-05-08.md`

---

## Session 008：提交并合并 feat_agent_artifacts

**预计工时**：30 分钟  
**类型**：纯 Git 操作，无代码改动

### 步骤

1. **提交未完成的变更**
   ```bash
   git add ui/src/components/IssueDocuments.tsx \
           ui/src/components/IssueDocuments.test.tsx \
           ui/src/pages/IssueDetail.tsx
   git commit -m "feat: Sessions 004-007 — plan approval gate, deliverables tab, revision history, create document dialog"
   ```

2. **运行最小验证集**
   ```bash
   npx vitest run ui/src/components/IssueDocuments.test.tsx
   pnpm --filter ui typecheck
   ```

3. **合并到 master**
   ```bash
   git checkout master
   git merge feat_agent_artifacts --no-ff -m "feat: agent artifacts UI (Sessions 001-007)"
   ```

**验收**：4/4 tests pass；typecheck 零错误；master 包含所有功能。

---

## Session 009：Plan Approval 门控 + Board Work Products 管理

**预计工时**：4-6 小时  
**影响层**：`server/`、`ui/`、`packages/shared/`

### Step 1 — 服务端计划审批门控

**文件**：`server/src/services/document.ts`（新增工具函数）

```typescript
/** 检查是否存在未决的计划审批请求，若有则返回交互 ID */
export async function getPendingPlanApproval(
  db: Db,
  issueId: string,
): Promise<{ interactionId: string } | null>
```

实现逻辑：
- 查询 `issue_thread_interactions` where `issue_id = issueId AND target_document_key = 'plan' AND kind = 'request_confirmation' AND resolved_at IS NULL`
- 若有记录 → 返回 `{ interactionId }`，否则 `null`

**文件**：`server/src/routes/issues.ts`（heartbeat/checkout wakeup 路径）

在 `POST /issues/:id/checkout-wakeup`（或 heartbeat 调用入口）添加：
```typescript
const pendingApproval = await documentsSvc.getPendingPlanApproval(issue.id);
if (pendingApproval) {
  return res.status(409).json({
    error: "PLAN_APPROVAL_REQUIRED",
    message: "This issue has a pending plan document that requires board approval before execution can proceed.",
    interactionId: pendingApproval.interactionId,
  });
}
```

**文件**：`packages/shared/src/types/issue.ts`（添加错误类型常量）
```typescript
export const PLAN_APPROVAL_REQUIRED = "PLAN_APPROVAL_REQUIRED" as const;
```

**UI**：`ui/src/components/IssueRunLedger.tsx`（或 heartbeat 触发位置）
- 捕获 409 `PLAN_APPROVAL_REQUIRED` → Toast: "执行被阻止：计划文档需要 Board 审批"

### Step 2 — Board Work Products 管理

**文件**：`ui/src/api/issues.ts`（已有 `listWorkProducts`，需新增）

```typescript
createWorkProduct: (issueId: string, data: CreateWorkProduct) =>
  api.post<IssueWorkProduct>(`/issues/${issueId}/work-products`, data),
deleteWorkProduct: (workProductId: string) =>
  api.delete(`/work-products/${workProductId}`),
```

**文件**：`ui/src/components/IssueDeliverables.tsx`

新增 `AddWorkProductDialog` 组件：
- 字段：类型选择（PR / 预览 URL / 产物 / 分支）、标题、URL
- 服务端 API 已存在：`POST /issues/:id/work-products`
- 提交后 `invalidateQueries` 刷新列表

新增删除按钮（每个 Work Product 卡片上的 `×`）：
- 调用 `issuesApi.deleteWorkProduct(id)`
- 乐观更新

**QueryKey 新增**（`ui/src/lib/queryKeys.ts`）：
- 已有 `queryKeys.issues.workProducts(issueId)` — 确认存在即可

### 验收标准

| 场景 | 期望结果 |
|------|---------|
| Issue 有未决 plan 审批，Agent 发起 heartbeat | 服务端返回 409，Agent 收到 PLAN_APPROVAL_REQUIRED |
| Board 批准 plan → Agent 重试 | 执行正常进行 |
| Board 点击"Add Work Product"填写 PR 链接 | 出现在 Deliverables 列表 |
| Board 点击删除 Work Product | 从列表移除 |

---

## Session 010：Goal Progress 实际数据 + Agent Document 路径

**预计工时**：3-4 小时  
**影响层**：`server/`、`packages/shared/`

### Step 1 — Goal Progress 聚合

**文件**：`server/src/services/goals.ts`

新增函数 `computeGoalProgressFromIssues(db, goalId)`:
```typescript
interface GoalProgress {
  totalIssues: number;
  completedIssues: number;
  actualProgress: number;  // 0-100
  healthScore: "on_track" | "at_risk" | "off_track";
}
```

逻辑：
1. 查询 `issues` where `goal_id = goalId AND status IN ('completed', 'cancelled') → completed count`
2. 查询 `issues` where `goal_id = goalId → total count`
3. `actualProgress = totalIssues > 0 ? Math.round(completedIssues / totalIssues * 100) : 0`
4. `healthScore` 规则（参考 `doc/SPEC-implementation.md`）：
   - `>= 70%` → `on_track`
   - `30-69%` → `at_risk`
   - `< 30%` → `off_track`

**文件**：`server/src/routes/goals.ts`

在 `GET /goals/:id` 和 `GET /goals` 的响应中填充 `actualProgress` 和 `healthScore`：
```typescript
const progress = await computeGoalProgressFromIssues(db, goal.id);
return { ...goal, ...progress };
```

**packages/shared**：确认 `Goal` 类型包含 `actualProgress: number`、`healthScore: string`（已有则跳过）

### Step 2 — Agent Document 写入路径验证

**检查项**：
1. `server/src/routes/issues.ts` 中 `PUT /issues/:id/documents/:key` 路由的 auth middleware
2. 若仅有 `requireBoardAuth` → 修改为 `requireBoardOrAgentAuth`（参考同文件中 work products 路由的模式）

**测试**（`server/src/routes/issues.test.ts` 或新文件）：
```typescript
it("allows agent to write issue document with bearer key", async () => {
  // 用 agent API key auth 发送 PUT /issues/:id/documents/summary
  // 验证 200 + 修订号 += 1 + activity log 含 agentId
});
```

**Activity log**：确认 document upsert 时 `logActivity` 记录 `actorAgentId`（若目前只记录 userId → 修复）

### 验收标准

| 场景 | 期望结果 |
|------|---------|
| Goal 有 5 Issues，2 完成 | `actualProgress = 40`，`healthScore = "at_risk"` |
| Goal 无关联 Issues | `actualProgress = 0`，`healthScore = "off_track"` |
| Agent bearer key 调用 PUT /documents/summary | 200，修订历史含此次变更，activityLog.agentId 有值 |

---

## 执行顺序

```
Session 008 (30m) → Session 009 Step1 (2h) → Session 009 Step2 (2h)
→ Session 010 Step1 (2h) → Session 010 Step2 (1.5h)
```

总计约 **8-10 小时**（可拆分为两个工作日）

---

## 测试策略

每个 Session 执行后运行：
```bash
pnpm --filter ui typecheck
npx vitest run ui/src
pnpm test:run   # 完整验证
```

Sessions 009/010 完成后额外运行：
```bash
pnpm -r typecheck
pnpm build
```

---

*计划生成日期：2026-05-08*
