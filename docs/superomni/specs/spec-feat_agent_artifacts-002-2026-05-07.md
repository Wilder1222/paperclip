# THINK — Session 002 Spec
**Branch**: feat_agent_artifacts  
**Session**: 002  
**Date**: 2026-05-07  
**Status**: AWAITING APPROVAL

---

## Codebase Scan Summary

### What is already fully implemented
| Feature | Status |
|---|---|
| Work Products (session 001) | ✅ DB + routes + UI (add/delete/display) |
| Issue Documents | ✅ DB + service + routes + UI + tests |
| Goals CRUD | ✅ list/get/create/update/delete + GoalTree + GoalDetail |
| Dashboard charts & activity | ✅ MetricCards, ActivityCharts, AgentActivityPanel |
| KanbanBoard view | ✅ issues list with board/list toggle |
| Memory DB schema | ✅ memory_bindings + memory_operations tables in DB |

### What is missing / has clear gaps
| Feature | Gap |
|---|---|
| **Goal Progress** | Goals have NO issue progress aggregation. `GET /goals/:id` returns no issue counts, no % complete. GoalDetail page shows no progress bar. Goals list shows no status summary. Dashboard has no goals widget. |
| Memory routes + UI | DB tables exist; no routes, no service, no UI |
| Enforced Outcomes | No automated work product → issue completion trigger |

---

## Problem Statement

The core Paperclip principle is **"all work traces to goals"**. Yet today:

1. You can **assign issues to goals** (`issue.goalId`) but cannot see how many issues are done vs in-progress for any goal.
2. The **Goals list** shows a tree of goals with no progress indication — you can't tell at a glance which goals are on track.
3. The **GoalDetail** page has title, description, status, sub-goals, and projects — but **zero issue progress data**.
4. The **Dashboard** has charts for run activity and issue status globally, but no **goal-level breakdown**.

This is a high-visibility gap. Goal tracking is the top-level organizational structure, and it currently provides no feedback on whether the work below it is progressing.

---

## Proposed Feature: Goal Progress Views

### What we are building

Add **goal issue progress aggregation** visible in three places:

#### 1. `GET /goals/:id/progress` (new backend endpoint)
Returns structured progress data:
```ts
interface GoalProgress {
  goalId: string;
  // Direct issues only (linked directly to this goal)
  direct: IssueStatusCounts;
  // Total including all descendant goals in the sub-tree
  total: IssueStatusCounts;
  activeAgentIds: string[]; // distinct agents currently assigned
}

interface IssueStatusCounts {
  total: number;
  backlog: number;
  in_progress: number;
  done: number;
  cancelled: number;
  percentDone: number; // (done / total) * 100, 0 if total=0
}
```

#### 2. `GoalProgressBar` component (new reusable UI component)
- Compact horizontal bar showing done/in_progress/backlog/cancelled segments
- Shows "X / Y done" label with `percentDone`
- Shows active agent count pill if > 0 agents working
- Used in GoalDetail header and Goals list rows

#### 3. GoalDetail page enhancements
- Add progress bar + status counts to the header area below title
- Show "N active agents" badge when agents are currently assigned

#### 4. Goals list (GoalTree) compact progress
- Each goal row gets a compact inline progress indicator (just the `X/Y` count + mini-bar)
- No breaking change to the existing tree layout

#### 5. Dashboard Goals widget
- New `GoalsWidget` component showing top 5 active goals with progress bars
- Placed below the existing MetricCards row
- Links to each GoalDetail

---

## Architecture

### Backend Changes (no DB migration needed)

**New route** in `server/src/routes/goals.ts`:
```
GET /goals/:id/progress
```
- Queries `issues` where `goalId = :id` for direct counts
- For total (sub-tree): queries all goals with `parentId` in tree, then all issues for all those goal IDs
- Returns `GoalProgress` shape

**GoalService addition**:
```ts
getProgress(goalId: string, companyId: string): Promise<GoalProgress>
```

### Shared Types (packages/shared)

New type in `packages/shared/src/types/goal.ts`:
```ts
export interface IssueStatusCounts { ... }
export interface GoalProgress { ... }
```

New API path constant in `packages/shared/src/constants/apiPaths.ts`.

### UI Changes

**New component**: `ui/src/components/GoalProgressBar.tsx`

**Updated component**: `ui/src/components/GoalTree.tsx` — add compact `count` badges to each row

**Updated page**: `ui/src/pages/GoalDetail.tsx` — add progress fetch + `GoalProgressBar` in header

**Updated page**: `ui/src/pages/Dashboard.tsx` — add `GoalsWidget` component

**New API function**: `ui/src/api/goals.ts` — `getProgress(goalId)`

**New queryKey**: `queryKeys.goals.progress(goalId)`

---

## Scope Constraints

### IN scope
- `GET /goals/:id/progress` endpoint
- `GoalProgressBar` component
- Progress display in GoalDetail
- Compact progress in GoalTree rows
- GoalsWidget on Dashboard (active goals only, limit 5)

### OUT of scope (defer)
- Memory/Knowledge system
- Enforced Outcomes / automated issue completion
- Real-time progress websocket updates
- Historical progress trend charts
- Goal completion date forecasting

---

## Acceptance Criteria

1. `GET /goals/:id/progress` returns `{direct, total, activeAgentIds}` for a goal with issues across statuses
2. GoalDetail page shows a progress bar and counts when the goal has linked issues
3. GoalDetail shows "No issues linked yet" empty state when there are no issues
4. Goals list (GoalTree) shows a compact `X/Y` count for each goal row
5. Dashboard shows a Goals widget with the top active goals + progress bars
6. All new components have Vitest tests
7. `pnpm test:run` passes

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Sub-tree query is slow for large goal trees | Low (V1 companies are small) | Use simple recursive query or in-memory tree traversal |
| GoalTree layout breaks with progress badges | Medium | Keep progress badge inline, right-aligned, same row height |
| Dashboard gets too crowded | Low | GoalsWidget is collapsible, show only active goals |

---

## Why This Feature Now

1. **Zero new DB migrations** — issues already have `goalId`
2. **Directly tests session 001 work** — work products appear under issues that map to goals
3. **High product visibility** — every user of the board sees the Goals page and Dashboard
4. **Core principle** — "all work traces to goals" is the #1 Paperclip value proposition
5. **Achievable in 1 session** — ~300-400 lines, 1 backend route, 3-4 UI changes
