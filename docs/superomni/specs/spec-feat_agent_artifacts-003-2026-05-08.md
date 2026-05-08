# Spec: Session 003 — Issue Documents UI (Plan Viewer)

**Branch:** feat_agent_artifacts  
**Session:** 003  
**Date:** 2026-05-08  
**Status:** READY_TO_BUILD

---

## 1. Problem Statement

后端已经完整支持 Issue Documents（`GET/PUT/DELETE /issues/:id/documents/:key`），Agent 也通过 Paperclip skill 使用 `key="plan"` 的文档记录执行计划。但 **Board UI 完全没有文档 API 客户端**，Board 成员无法查看 Agent 提交的任何计划文档。

这造成了以下问题：
- Board 无法审核 Agent 的执行计划
- Agent 写的 plan/spec/summary 文档对 Board 不可见
- Issue 详情页信息不完整

---

## 2. Goals

1. 在 Issue 详情页增加 **Documents 标签页**，展示 Agent 已提交的所有文档
2. 支持查看文档内容（Markdown 渲染）
3. 支持 Board 编辑文档内容
4. `plan` 文档突出显示（顶部 callout）
5. 显示文档修订历史摘要（最后更新时间、修订次数）

---

## 3. Scope

### In Scope

#### A. `ui/src/api/documents.ts` — 新建 API 客户端
- `list(issueId)` → `GET /issues/:id/documents`
- `get(issueId, key)` → `GET /issues/:id/documents/:key`
- `upsert(issueId, key, body, title?, format?)` → `PUT /issues/:id/documents/:key`
- `remove(issueId, key)` → `DELETE /issues/:id/documents/:key`
- `listRevisions(issueId, key)` → `GET /issues/:id/documents/:key/revisions`

#### B. `packages/shared` — 共享类型
- `IssueDocument` 接口（`id`, `key`, `title`, `format`, `latestBody`, `latestRevisionNumber`, `updatedAt`, `createdByAgentId`, ...）
- `IssueDocumentSummary` 接口（list 视图用，不含 `latestBody`）

#### C. QueryKeys
- `queryKeys.issues.documents.list(issueId)`
- `queryKeys.issues.documents.detail(issueId, key)`

#### D. `ui/src/components/IssueDocuments.tsx` — 文档列表+查看器组件
- 空状态：无文档时显示 "No documents yet"
- 列表：按 `updatedAt` 降序展示文档卡片（key、title、修订数、更新时间）
- `plan` 文档用特殊样式（蓝色左边框 callout）
- 点击展开文档内容（`MarkdownBody` 渲染）
- Board 可编辑（textarea + 保存按钮）

#### E. `ui/src/pages/IssueDetail.tsx` — 集成
- 在 Issue 详情页的 tabs 中增加 "Documents" tab
- 仅在有文档时显示 badge 数量

### Out of Scope

- 修订历史完整 UI（只显示修订数，不展开历史）
- 文档创建（Board 手动新建文档）
- 文档审批 Gate（单独的 Session 004 范畴）
- 富文本编辑器（使用现有 textarea 即可）
- 文档格式非 markdown 的渲染差异

---

## 4. API 确认（后端已实现）

```
GET    /api/issues/:id/documents          → IssueDocumentSummary[]
GET    /api/issues/:id/documents/:key     → IssueDocument
PUT    /api/issues/:id/documents/:key     → IssueDocument  (body: { body, title?, format?, changeSummary? })
DELETE /api/issues/:id/documents/:key     → 204
GET    /api/issues/:id/documents/:key/revisions → DocumentRevision[]
```

---

## 5. Shared Types to Add

### `packages/shared/src/types/document.ts` (new)

```ts
export interface IssueDocumentSummary {
  id: string;
  issueId: string;
  companyId: string;
  key: string;
  title: string | null;
  format: string;
  latestRevisionNumber: number;
  createdByAgentId: string | null;
  updatedByAgentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueDocument extends IssueDocumentSummary {
  latestBody: string;
}
```

---

## 6. Component Design

### IssueDocuments

```
┌─ Documents ────────────────────────────────────────────┐
│  ┌─ [plan] Execution Plan ────────────────────── v3 ─┐ │
│  │  Updated 2h ago by agent-codex                    │ │  ← blue callout
│  │  [▼ expand]                                       │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ [summary] Run Summary ─────────────────────── v1 ┐ │
│  │  Updated 5h ago by agent-codex                    │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

When expanded:
```
┌─ [plan] Execution Plan ────────────────────────── v3 ─┐
│  Updated 2h ago by agent-codex   [Edit]  [Save]       │
│  ─────────────────────────────────────────────────────│
│  ## Plan                                               │
│  1. Analyze the codebase...                            │
│  2. Implement the fix...                               │
└───────────────────────────────────────────────────────┘
```

---

## 7. IssueDetail Tab Integration

Current tabs (approximate):
- Overview (default)
- Comments / Timeline
- Work Products (Session 001)

Add:
- **Documents** (with badge showing count if > 0)

Position: after Work Products tab.

---

## 8. Acceptance Criteria

1. `ui/src/api/documents.ts` exports `list`, `get`, `upsert`, `remove`, `listRevisions`
2. `IssueDocument` and `IssueDocumentSummary` exported from `@paperclipai/shared`
3. `IssueDocuments` component renders empty state, list, and expanded document view
4. `plan` key document is visually distinguished (callout style)
5. Board can edit and save a document (useMutation + optimistic invalidation)
6. IssueDetail shows "Documents" tab with count badge
7. Server typecheck passes
8. UI typecheck passes
9. Unit tests for IssueDocuments (empty state, list render, plan callout) pass
10. Full UI test suite (696+) passes

---

## 9. Estimated Complexity

- Shared types: ~20 lines
- API client: ~40 lines
- QueryKeys: ~5 lines
- IssueDocuments component: ~180 lines
- IssueDocuments tests: ~80 lines
- IssueDetail integration: ~30 lines

**Total: ~355 lines, medium complexity**
