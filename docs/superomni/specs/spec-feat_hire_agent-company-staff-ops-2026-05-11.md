# Company Staff Operations Spec

- Date: 2026-05-11
- Branch: feat_hire_agent
- Session: company-staff-ops
- Stage: THINK
- Status: Draft for review

## 1. Problem

Paperclip already treats agents as employees in a company org tree, but the current board UX is still split across three separate ideas:

1. hiring/creating an agent,
2. viewing the org tree,
3. importing a company package from GitHub.

That leaves a gap for a board operator who wants to:

- source reusable agents from GitHub,
- keep non-active backup staff available without putting them into live dispatch,
- edit reporting lines visually instead of one agent form at a time,
- understand who is active, who is reserve, and who is only a candidate/template.

The result today is a control plane that can represent an org, but not yet a strong staffing workflow.

## 2. Product Constraints

This proposal must stay inside current Paperclip product and implementation boundaries:

- Company is the first-order scope; all business entities remain company-scoped.
- Paperclip is a control plane, not the execution plane.
- Agents are real employees with adapter config and runtime semantics.
- Org structure is based on `reports_to` and same-company hierarchy rules.
- New live hires must continue to respect approval gates.

Relevant product references:

- `doc/GOAL.md`: Paperclip should let operators manage agents as employees and define org structure.
- `doc/PRODUCT.md`: every employee is an agent, company is the unit of organization, and the board should manage orgs at company level.
- `doc/SPEC-implementation.md`: agents belong to a company, use `reports_to`, and live hire/create flows already exist with board approval support.

## 3. Current-State Evidence In Repo

### Existing strengths

- GitHub-backed company import already exists in `ui/src/pages/CompanyImport.tsx`.
- The server already exposes company org data at `GET /companies/:companyId/org` in `server/src/routes/agents.ts`.
- Agents already persist `reportsTo` and same-company hierarchy through the existing agent model.
- The board already has list and org views in `ui/src/pages/Agents.tsx`.
- A dedicated visual org chart already exists in `ui/src/pages/OrgChart.tsx`.

### Current gaps

- Org chart is effectively read-only; there is no direct drag-to-reparent workflow.
- GitHub import is framed as company package import, not as a staffing workflow.
- There is no concept of a reserve bench, candidate pool, or inactive-but-available staffing layer.
- Agent runtime status is doing runtime work only; it should not absorb staffing semantics.

## 4. Review Of The Initial Idea

The core direction is strong and aligned with Paperclip:

- richer company architecture is directly on-mission,
- better agent employee management is a control-plane upgrade,
- GitHub-based sourcing fits the existing portability/import story,
- drag-editing hierarchy is a major UX win.

The part that needs refinement is the meaning of "backup staff".

### What should be kept

- Import agents from GitHub.
- Show active staff and non-active staff in one management surface.
- Let the board change reporting lines visually.

### What should be changed

Do not model backup staff as just another agent runtime status.

Why:

- current `status` is runtime/lifecycle-oriented (`idle`, `running`, `paused`, `error`, `pending_approval`, `terminated`),
- reserve staffing is an organizational state, not a runtime state,
- overloading `status` would blur dispatch, budget, approval, and heartbeat semantics.

## 5. Refined Product Proposal

## 5.1 Staffing Model

Introduce three staffing layers:

1. Active staff
   Real agents in the company's live dispatch scope.

2. Reserve bench
   Company-scoped staffing entries that are visible to the board but are not dispatchable, do not heartbeat, and do not appear in active assignee flows.

3. GitHub source candidates
   Imported templates or manifests from GitHub that can be reviewed before becoming reserve entries or active staff.

### Recommendation

Reserve bench entries should be separate from live `agents` records.

Default recommendation:

- keep `agents` as runtime-capable employees,
- add a company-scoped bench/candidate layer for non-dispatchable staff,
- "activate" a reserve entry into a real agent record when the company wants to hire/use it.

This is the cleanest way to preserve the existing agent invariants.

## 5.2 New Information Architecture

Create a unified board surface tentatively called "Staff" or "Workforce".

Primary sections:

1. Active
   Live agents in dispatch scope.

2. Reserve
   Bench entries that are available for later activation.

3. Imports
   GitHub-driven review/import flow and recently imported sources.

4. Org Chart
   Interactive graph editor for active reporting structure, with optional bench overlay.

The existing `Agents` page can evolve into this surface instead of adding another disconnected page.

## 5.3 GitHub Import Flow

Do not add a "paste GitHub URL -> instantly create live agents" shortcut.

Instead, adapt the current import flow into a staffing-specific wizard:

1. Enter GitHub URL.
2. Analyze repository/package contents.
3. Detect importable staffing units:
   - company package
   - team subtree
   - single agent definition
   - agent bundle/template
4. Preview discovered staff, manager relationships, required adapters, missing secrets, and provenance.
5. Choose import target:
   - import to reserve bench
   - hire directly into active org
6. Review diff.
7. Apply.

### Why this is better

- reuses current package import architecture,
- keeps trust/licensing/provenance visible,
- lets the board stage hires safely,
- supports both full-team import and single-agent sourcing.

## 5.4 Reserve Bench Semantics

Reserve entries should:

- belong to one company,
- store provenance and staffing metadata,
- optionally store a proposed manager or target team,
- not receive API keys,
- not appear in heartbeat scheduling,
- not appear as normal active assignees,
- not count toward active org chart unless explicitly toggled on.

Activation should:

- validate adapter/config readiness,
- validate required company secrets,
- create a real agent,
- attach manager/root placement,
- respect board approval rules if the resulting state is a live hire.

## 5.5 Interactive Org Chart Editing

The org chart should move from static SVG layout to a controlled graph interaction model.

Board interactions:

- drag node to rearrange visual layout,
- drag-connect or reconnect to change manager,
- click node for quick actions,
- stage multiple hierarchy edits before save,
- show invalid targets before commit.

Required validations:

- same-company only,
- no cycles,
- no self-parenting,
- respect approval/policy restrictions if any future rule depends on role,
- do not implicitly activate reserve staff by graph manipulation.

### UX recommendation

Use two modes:

- View mode: fast, lightweight, current-style navigation.
- Edit mode: controlled graph editor with explicit save/cancel.

This avoids accidental hierarchy mutation while preserving the current quick-read org chart.

## 6. Data Model Recommendation

## 6.1 Keep current live agent model intact

Keep `agents` focused on real runtime-capable employees.

Do not repurpose agent `status` for staffing bench semantics.

## 6.2 Add a company staffing source / bench layer

Recommended new entities:

### `company_staff_sources`

Tracks where staffing candidates came from.

Suggested fields:

- `id`
- `company_id`
- `source_type` (`github_repo`, `github_blob`, `company_package`, `team_package`, `manual`)
- `source_url`
- `source_ref`
- `source_path`
- `imported_at`
- `imported_by_user_id`
- `manifest_snapshot`
- `trust_notes`

### `company_staff_bench_entries`

Tracks reserve/candidate entries that are not live agents yet.

Suggested fields:

- `id`
- `company_id`
- `source_id`
- `name`
- `role`
- `title`
- `capabilities`
- `adapter_type`
- `adapter_config_snapshot`
- `proposed_reports_to_agent_id` nullable
- `bench_state` (`candidate`, `reserve`, `rejected`, `activated`, `archived`)
- `activation_readiness`
- `notes`
- `created_at`
- `updated_at`

### Activation result

When a bench entry becomes active:

- create a row in `agents`,
- keep provenance link from agent to bench/source entry,
- retain audit trail in activity log.

## 6.3 Optional future enhancement

If later needed, active agents may get a small staffing field such as `employment_state = active | suspended`, but that is not required for the first iteration if reserve stays out of `agents`.

## 7. API Proposal

New endpoints, conceptually:

- `POST /companies/:companyId/staff-imports/preview`
- `POST /companies/:companyId/staff-imports/apply`
- `GET /companies/:companyId/staff-bench`
- `POST /companies/:companyId/staff-bench`
- `PATCH /companies/:companyId/staff-bench/:entryId`
- `POST /companies/:companyId/staff-bench/:entryId/activate`
- `POST /companies/:companyId/org-draft/validate`
- `PATCH /companies/:companyId/org`

Reuse where possible:

- existing company import analysis logic,
- existing agent create/hire validation,
- existing approval creation for live hires,
- existing activity logging.

## 8. UI Proposal

## 8.1 Staff Management Page

Key blocks:

- search + filters,
- staffing tabs (`Active`, `Reserve`, `Imports`),
- bulk actions,
- provenance badges (`GitHub`, `Imported team`, `Manual`, `Local`),
- status chips that distinguish staffing state from runtime state.

Each staff card/row should show:

- name,
- role/title,
- origin/provenance,
- manager/team placement,
- readiness warnings,
- primary next action.

## 8.2 Reserve Bench UX

Reserve entries should support actions like:

- activate into company,
- edit staffing notes,
- assign proposed manager,
- inspect source config,
- archive/reject.

## 8.3 Org Chart UX

Recommended split layout:

- center canvas for active org graph,
- right panel for node details and validation warnings,
- optional side rail for reserve bench candidates that can be activated or attached.

Reserve entries should not appear in the active graph by default. If shown, they should render in a visually separate "bench" lane instead of pretending to be fully active reports.

## 9. Reference Patterns From GitHub

## 9.1 Backstage `catalog-import`

Useful pattern:

- URL analysis first,
- state-machine import flow (`analyze -> prepare -> review -> finish`),
- preview before apply,
- optional pull-request creation when source needs changes.

What to copy:

- step-based import flow,
- explicit review stage,
- generated preview of what will be created,
- source-aware behavior instead of one generic submit form.

What to adapt for Paperclip:

- replace entity/catalog concepts with agent/staffing concepts,
- show adapter readiness and company secret requirements,
- allow import into reserve instead of only direct registration.

## 9.2 XYFlow / React Flow

Useful pattern:

- controlled `nodes` and `edges` state,
- `onNodesChange`, `onEdgesChange`, `onConnect`, `onReconnect`, `onNodeDragStop`,
- explicit event hooks for graph editing and validation.

What to copy:

- edit-mode graph interaction model,
- controlled graph state with optimistic draft updates,
- reconnectable edges for changing manager relationships,
- validation on connect/reconnect rather than ad hoc DOM dragging.

What to avoid:

- exposing a free-form graph that drifts away from org-tree constraints.

Paperclip still needs a tree, not a generic graph.

## 9.3 Supabase Team Settings

Useful pattern:

- one people-management surface combining active members and invites,
- action gating based on permissions and member state,
- different actions for invited vs active entries,
- reviewable role assignment flows.

What to copy:

- state-specific actions,
- permission-aware controls,
- merged but clearly differentiated member lifecycle views.

What to adapt for Paperclip:

- replace invite lifecycle with candidate/reserve/active staffing lifecycle,
- keep board-level control rather than enterprise RBAC-heavy design.

## 10. Rollout Plan

### Phase 1

- Add staffing-specific GitHub preview/apply flow reusing current company import logic.
- Add reserve bench entity and UI list.
- Allow activating a reserve entry into a real agent.

### Phase 2

- Add edit-mode org chart with reconnectable manager edges.
- Add server-side org validation endpoint.
- Persist hierarchy updates in batch.

### Phase 3

- Add subtree/team import targeting.
- Add provenance-aware export back out of company package flows.
- Add bench analytics and readiness scoring.

## 11. Risks

1. Mixing staffing state and runtime state will create long-term model confusion.
2. Drag-editing org charts can introduce cycle and validation bugs if the server is not the final authority.
3. GitHub import without a review step would create trust, licensing, and secret-readiness problems.
4. If reserve entries are modeled as real agents too early, active dispatch and assignee UX will become noisy.

## 12. Acceptance Criteria

- Board can import staffing candidates from GitHub with preview before apply.
- Board can store candidates in a reserve bench without making them dispatchable agents.
- Board can activate a reserve entry into a live agent through a validated workflow.
- Board can visually change active reporting lines and save validated hierarchy changes.
- Active org chart remains clear and focused on dispatchable staff.
- All changes remain company-scoped and activity-logged.

## 13. Recommendation Summary

The idea is directionally correct, but the best version is:

- GitHub sourcing as a staffing wizard,
- reserve staff as a separate bench layer, not an agent runtime status,
- org-chart editing as a controlled graph edit mode,
- activation into live agents as the boundary where runtime and approval semantics begin.

## 14. Main Open Question

The highest-leverage product decision is this:

Should reserve staff be represented as:

1. separate bench/candidate records that become agents only when activated, or
2. real agents with a non-dispatch staffing state?

Default recommendation: option 1.

It is cleaner, safer, and better aligned with Paperclip's existing agent/runtime invariants.