# Plan Review: Company Staff Operations

- Date: 2026-05-11
- Branch: feat_hire_agent
- Session: company-staff-ops
- Plan: [docs/superomni/plans/plan-feat_hire_agent-company-staff-ops-2026-05-11.md](docs/superomni/plans/plan-feat_hire_agent-company-staff-ops-2026-05-11.md)

## Strategy Review

STRATEGY REVIEW
  Premises: explicit
  Scope: right-sized
  Alternatives: considered
  DRY: reuses existing company import, agent hire, activity log, and org APIs instead of inventing a second staffing backend
  Risks:
  1. bench model leaking into live agent/runtime semantics
  2. org edit mode introducing cycle or invalid hierarchy bugs
  3. staffing import diverging from existing company portability flow and becoming a duplicate system

Assessment:

- The plan is aligned with the product premise that company is the primary unit and agents are live employees inside a governed control plane.
- The plan avoids a common trap: overloading current agent runtime status with staffing semantics.
- Scope is intentionally phased and avoids trying to solve marketplace distribution, global talent pools, and enterprise RBAC in the first slice.

## Design Review

DESIGN REVIEW
  States covered: loading ✓ | empty ✓ | error ✓
  Responsive: strategy described
  Accessibility: partially addressed, should be made explicit during BUILD for keyboard interaction in graph edit mode

Assessment:

- The split between `Active`, `Reserve`, and `Imports` is strong information hierarchy.
- The recommendation to keep read-only and edit modes separate is correct and reduces accidental mutation.
- The plan should explicitly require keyboard and screen-reader affordances for graph editing, not only mouse drag interactions.

## Engineering Review

ENGINEERING REVIEW
  Architecture: sound
  Test plan: comprehensive
  Performance: moderate risks around org graph rendering and import previews, but bounded and manageable
  Security: clean direction; all new routes remain company-scoped and reuse existing authz and approval patterns
  Blast radius: medium-high, touching db/shared/server/ui but within one coherent feature slice

Assessment:

- Separating bench records from agents is the strongest architectural decision in the plan.
- Reusing company portability analysis minimizes duplicated code and reduces behavioral drift.
- Batch org validation on the server is necessary; client-only drag validation would be too weak.
- The plan correctly keeps reserve entries out of assignment and heartbeat pathways.

## Auto-Decision Log

AUTO-DECISION LOG (Strategy)
  [P4] reserve staffing model: use separate bench records instead of agent status overloading — Principle 4
  [P3] staffing import architecture: extend current company import pipeline instead of building a standalone importer — Principle 3
  [P1] rollout shape: phase the work across model, import, UI, and graph editing — Principle 1

AUTO-DECISION LOG (Design)
  [P5] org interaction model: explicit view mode plus edit mode instead of inline always-editable graph — Principle 5
  [TASTE-AUTO] navigation shape: evolve current agents surface into a staffing surface instead of adding a fully disconnected page — Principle 4 — Rationale: lower navigation churn and better reuse of existing mental model

AUTO-DECISION LOG (Engineering)
  [P5] org persistence: persist only reporting relationships, not arbitrary node coordinates as the source of truth — Principle 5
  [P4] validation path: centralize no-cycle and same-company validation on the server — Principle 4
  [P1] verification: require targeted route/UI tests before wider validation — Principle 1

## Decision Audit Trail

| # | Phase | Decision | Type | Principle | Rationale |
|---|-------|----------|------|-----------|-----------|
| 1 | Strategy | Reserve bench modeled separately from live agents | M | P4 | Reuses current agent semantics without distorting runtime state |
| 2 | Strategy | Staffing import extends company portability flow | M | P3 | Cleaner than building a second import system |
| 3 | Design | Separate view and edit modes for org chart | T | P5 | Safer interaction model and easier error recovery |
| 4 | Engineering | Server validates hierarchy edits before persistence | M | P5 | Explicit authority and simpler correctness guarantees |
| 5 | Engineering | Reserve entries excluded from assignee/heartbeat flows | M | P1 | Preserves product invariants and avoids hidden regressions |

## TASTE DECISIONS — AUTO-RESOLVED

1. Unified staffing surface vs fully new standalone page
   Chosen: evolve the current agents area into a broader staffing surface — Principle 4 — Rationale: best reuse of route structure, queries, and board mental model.

2. Org chart interaction style
   Chosen: explicit edit mode, not always-on drag editing — Principle 5 — Rationale: operational UIs should minimize accidental structure mutations.

3. Reserve visibility in org chart
   Chosen: optional bench overlay, not first-class insertion into the active tree — Principle 1 — Rationale: preserves clarity of live dispatch structure while still surfacing reserve capacity.

## Review Outcome

PLAN REVIEW COMPLETE

- Status: Approved for planning purposes
- Required changes before BUILD:
  - make keyboard-accessible org editing an explicit acceptance criterion,
  - decide route naming (`Agents` upgrade vs `Staff` route) early to limit churn,
  - keep persistence model centered on `reportsTo` rather than generic graph state.

## Recommendation

This plan is strong enough to move into implementation when desired. The highest-value first delivery slice is:

1. bench model,
2. GitHub staffing preview/apply,
3. reserve activation,
4. only then editable org chart.

That ordering gets the staffing workflow live before taking on the harder graph-editing slice.
