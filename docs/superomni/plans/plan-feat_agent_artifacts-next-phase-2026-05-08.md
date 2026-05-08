# 下一阶段工作规划 — Artifacts & Deep Planning

**分支:** feat_agent_artifacts  
**日期:** 2026-05-08  
**状态:** READY_TO_PLAN  

---

## 1. 当前进度快照

| Session | 内容 | 状态 |
|---------|------|------|
| 001 | Work Products UI — IssueProperties 侧边栏 | ✅ 完成 |
| 002 | Goal Progress Views — 进度条、仪表盘 Widget | ✅ 完成 |
| 003 | Issue Documents Tab — 文档查看器 + 编辑 | ✅ 完成 |
| **004** | **Plan Approval Gate** — 文档审批 UI | 🔲 下一个 |
| **005** | **Deliverables Tab** — 工作产出聚合视图 | 🔲 计划中 |
| **006** | **Revision History Drawer** — 文档历史版本 | 🔲 计划中 |
| **007** | **Deep Planning — Board 创建文档** | 🔲 计划中 |

---

## 2. Roadmap 对齐分析

### ROADMAP.md 中未完成的相关条目

| 条目 | 状态 | 与当前 branch 关联 |
|------|------|--------------------|
| `⚪ Artifacts & Work Products` | 进行中 | Sessions 001-003 打下基础；004-006 收尾 |
| `⚪ Deep Planning` | 进行中 | Session 003 文档查看；007 完成创建闭环 |
| `⚪ Enforced Outcomes` | 未开始 | 依赖 Work Products + Documents 完备后 |
| `⚪ Memory / Knowledge` | 未开始 | 独立 branch，不在当前范围 |
| `⚪ CEO Chat` | 未开始 | 独立 branch |

---

## 3. Session 004 — Plan Approval Gate UI

### 问题

Agent 已经实现了完整的 plan approval 流程：
1. Agent 提交 `plan` 文档 → `PUT /issues/:id/documents/plan`
2. Agent 创建 `request_confirmation` 交互，`target.type === "issue_document"`
3. Agent 等待 Board Accept → 才开始创建子 Issue 执行

但 **Board 侧没有专门的审批入口**：
- Chat 标签页的 `IssueThreadInteractionCard` 已经能渲染 `request_confirmation` 卡片（接受/拒绝按钮）✅
- **缺失**：Documents 标签页打开 plan 文档时，如果有 pending approval，没有任何提示

### 目标

在 `IssueDocuments.tsx` 的 `plan` 文档卡片内，当存在针对该 plan 的 `pending` `request_confirmation` 交互时，显示内联审批 Banner：

```
┌─ [plan] Execution Plan ─────────────────────── v3 ─┐
│  ⏳ Waiting for approval · Updated 2h ago           │  ← 黄色 pending banner
│  [✓ Accept Plan]  [✗ Request Changes]               │
│  ─────────────────────────────────────────────────  │
│  [▼ View plan content]                              │
└─────────────────────────────────────────────────────┘
```

### 技术分析

#### 后端 API（已实现）
- `GET /api/issues/:id/interactions` — 返回当前 issue 的 interaction 列表
- `POST /api/issues/:id/interactions/:interactionId/respond` — Accept/Reject
- `IssueThreadInteraction` 类型已在 `@paperclipai/shared` 导出
- `RequestConfirmationIssueDocumentTarget` 已定义（含 `documentId`, `key`, `revisionId`）

#### 前端已有基础
- `ui/src/components/IssueThreadInteractionCard.tsx` — 已有 `request_confirmation` 渲染逻辑
- `ui/src/lib/issue-thread-interactions.ts` — 已有 interaction 状态判断工具
- `ui/src/fixtures/issueThreadInteractionFixtures.ts` — 已有 fixture

#### 需要新增
1. **`useDocumentPendingApproval(issueId, documentKey)`** hook  
   - 查询 `queryKeys.issues.interactions(issueId)`（已有或新建）
   - 过滤出 `kind === "request_confirmation"` + `status === "pending"` + `target.key === documentKey`
   - 返回 `{ interaction: RequestConfirmationInteraction | null }`

2. **`PlanApprovalBanner`** 组件（在 `IssueDocuments.tsx` 内部）  
   - 接收 `interaction` + `onAccept` + `onReject` props
   - 样式：amber/yellow 边框，CornerRightDown 或 ClipboardCheck 图标
   - Accept 按钮：绿色，调用 `interactionsApi.respond(issueId, interactionId, { decision: "accepted" })`
   - Request Changes 按钮：灰色，弹出 Textarea 输入 reason，调用 respond with `{ decision: "rejected", reason }`

3. **`ui/src/api/interactions.ts`**（新建或复用）  
   - `interactionsApi.list(issueId)` → `GET /api/issues/:id/interactions`
   - `interactionsApi.respond(issueId, interactionId, data)` → `POST /api/issues/:id/interactions/:id/respond`

### 验收标准

| # | 验收条件 |
|---|----------|
| 1 | plan 文档卡片上方显示 pending approval banner（当存在时） |
| 2 | Accept 按钮调用 respond API 并 invalidate interactions + documents cache |
| 3 | Request Changes 按钮弹出 reason 输入，提交后 banner 消失 |
| 4 | 无 pending approval 时，不显示 banner |
| 5 | Accept 成功后 banner 替换为绿色"Plan accepted"确认提示（3s 后消失） |
| 6 | UI typecheck EXIT 0，相关单元测试通过 |

---

## 4. Session 005 — Deliverables Tab（工作产出聚合视图）

### 问题

Issue 详情页的工作产出分散在两处：
- **Work Products** 在 IssueProperties 侧边栏（Session 001）
- **Documents** 在 Documents Tab（Session 003）

Board 无法在一个地方看到"这个 Issue 交付了什么"。

### 目标

新增 **Deliverables** 标签页，聚合展示同一 Issue 的所有可交付物：

```
┌─ Deliverables ──────────────────────────────────────┐
│                                                      │
│  📄 Documents (2)                                    │
│  ┌─ plan v3 · Updated 2h ago ─────────────── ✅ ─┐  │
│  └─ summary v1 · Updated 1d ago ──────────────  ─┘  │
│                                                      │
│  🔗 Work Products (3)                               │
│  ┌─ PR #142 Fix login bug ─────────── merged ────┐  │
│  ├─ https://staging.myapp.com ─── ✓ deployed ───┤  │
│  └─ REPORT.md attached file ─────────────────── ┘  │
│                                                      │
│  [+ Add work product]                               │
└─────────────────────────────────────────────────────┘
```

### 技术要点

- 复用 `IssueDocuments` 的列表（只读，不含编辑）
- 复用 `IssueProperties` 中的 WorkProducts 渲染逻辑
- `useDeliverablesSummary(issue)` 计算合计数量 → 用于 Tab badge

### 验收标准

| # | 验收条件 |
|---|----------|
| 1 | Deliverables tab badge 显示 documents + work_products 总数 |
| 2 | Documents section 按 plan first 排序，只读展示 |
| 3 | Work Products section 显示类型图标 + 标题 + 状态 |
| 4 | "+ Add work product" 打开现有 AddWorkProduct 对话框 |
| 5 | Issue 无任何产出时显示空状态 "No deliverables yet" |

---

## 5. Session 006 — Revision History Drawer

### 问题

Documents Tab 显示了 "v3" 修订号，但无法查看历史修订内容和变更摘要。

### 目标

点击版本号 badge（`v3`）打开右侧 Sheet，展示该文档的完整修订历史：

```
┌──── Plan · Revision History ────────────────────────┐
│                                                      │
│  v3  (current)  2h ago · agent-codex                │
│  ▸ "Added implementation subtasks section"          │
│  [View diff]                                         │
│                                                      │
│  v2  1d ago · user:board                            │
│  ▸ "Board requested changes to timeline section"   │
│                                                      │
│  v1  2d ago · agent-codex                           │
│  ▸ "Initial plan document"                          │
└─────────────────────────────────────────────────────┘
```

### 技术要点

- `documentsApi.listRevisions(issueId, key)` 已实现
- 使用 shadcn `Sheet` 组件（`side="right"`）
- 点击某个版本可以查看该版本完整内容（替换主体区域显示）
- 不实现 diff 对比（留给未来）

---

## 6. Session 007 — Board 创建文档（Deep Planning 完成闭环）

### 问题

目前 Board 只能**编辑**已存在的文档，无法从 UI **新建**文档。Agent 通过 API 创建文档，但 Board 无法主动写需求说明或设计文档。

### 目标

Documents Tab 空状态和顶部增加 "New Document" 按钮，支持：
1. 选择文档类型 key（`plan` / `design` / `notes` / `spec` / 自定义）
2. 填写标题和内容
3. 提交后出现在 Documents Tab

### 技术要点

- `documentsApi.upsert(issueId, key, { body, title })` 已实现（PUT 语义，key 不存在时创建）
- 使用 shadcn `Dialog` + `Textarea`
- key 选择使用 `Select` 下拉（预设值 + "Custom..." 选项）

---

## 7. 优先级总结与建议执行顺序

```
Session 004 (Plan Approval Gate)
  ↓  完成后：Agent 的 plan approval 流程端到端 ✅
Session 005 (Deliverables Tab)
  ↓  完成后：Board 一眼看清所有交付物 ✅
Session 006 (Revision History Drawer)
  ↓  polish：文档变更可追溯 ✅
Session 007 (Board Create Document)
  ↓  完成后：Deep Planning 闭环（Agent+Board 双向写作）✅
```

**优先级理由：**

- **Session 004 最高优先**：Plan Approval Gate 是 Agent governance loop 的最后一环。Agent 已经在 API 层实现了 plan→approval→proceed 的完整协议；只差 Board UI 侧的审批界面就能让整个 planning workflow 跑通。
- **Session 005 次优先**：Deliverables 聚合视图是"一眼看清公司状态"的核心体验，契合 GOAL.md 的核心承诺。
- **Sessions 006/007** 为 polish 层，可并行或穿插。

---

## 8. 后续独立 Branch 规划（不在当前 branch）

| Branch | 内容 | ROADMAP 对应 |
|--------|------|-------------|
| `feat/memory-knowledge` | Agent 记忆文件管理 UI、公司知识库基础 | `⚪ Memory / Knowledge` |
| `feat/enforced-outcomes` | Issue done 必须有 work product | `⚪ Enforced Outcomes` |
| `feat/ceo-chat` | CEO/Agent 轻量对话入口 | `⚪ CEO Chat` |
| `feat/work-queues` | 重复性工作的队列路由 | `⚪ Work Queues` |
