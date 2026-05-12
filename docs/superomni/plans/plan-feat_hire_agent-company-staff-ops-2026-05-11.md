# Implementation Plan: Company Staff Operations

## Overview

This plan evolves Paperclip's current agent and org-chart surfaces into a staffing workflow that supports GitHub-sourced staff imports, reserve bench management, and visual editing of reporting relationships. The implementation keeps live agents and reserve staffing separate so runtime scheduling, approvals, and dispatch semantics stay clean.

## Prerequisites

- [x] Product direction documented in [docs/superomni/specs/spec-feat_hire_agent-company-staff-ops-2026-05-11.md](docs/superomni/specs/spec-feat_hire_agent-company-staff-ops-2026-05-11.md)
- [ ] Confirm final naming for the unified board surface: `Agents` upgrade vs new `Staff` route
- [ ] Confirm reserve model choice: separate bench records, not overloaded agent status

## What Must Be Built

- [x] Core functionality
- [x] Error handling
- [x] Tests (unit + integration)
- [x] Documentation (inline, not prose-heavy)
- [x] Design direction defined
- [x] Acceptance criterion includes design review quality bar

## Out Of Scope

- Full marketplace or ClipMart-style external sourcing network
- Cross-company staff sharing or pooled global talent inventory
- Fine-grained enterprise RBAC redesign
- Automatic sync-back to GitHub source repositories
- Generic free-form graph editing beyond org-tree constraints

## Steps

### Step 1: Add staffing bench domain model
**What:** Introduce company-scoped persistence for staffing sources and reserve bench entries while keeping live agents unchanged.
**Files:**
- `packages/db/src/schema/*staff*.ts` or existing company/agent schema files
- `packages/db/src/schema/index.ts`
- `packages/shared/src/**/*staff*`
- `server/src/services/*staff*`
**How:**
1. Add `company_staff_sources` and `company_staff_bench_entries` tables with company scoping, provenance metadata, and lifecycle fields.
2. Export schema and shared types/validators for source records, bench entries, and activation payloads.
3. Add service-layer CRUD helpers for listing, creating, updating, archiving, and activating bench entries.
**Verification:**
- schema compiles,
- shared validators compile,
- service tests cover lifecycle rules and company boundaries.
**Estimated effort:** L

### Step 2: Reuse company import analysis for staffing imports
**What:** Extend current company import logic so GitHub analysis can produce staffing-oriented previews and apply actions.
**Files:**
- `server/src/services/company-portability.ts`
- `server/src/routes/companies.ts` or new staffing route file
- `packages/shared/src/**/*company*import*` and new staff import contracts
- `server/src/__tests__/*company*import*` and/or new staff import route tests
**How:**
1. Reuse existing GitHub/company package analysis to detect importable staffing units.
2. Add preview response fields for provenance, manager relationships, adapter readiness, and missing secret requirements.
3. Add apply paths for two targets: reserve bench import and direct live hire.
4. For direct live hire, route through existing agent creation/hire approval rules.
**Verification:**
- preview route returns staffing-specific analysis,
- apply route creates bench entries or live hires correctly,
- approval flow still triggers for governed live hires.
**Estimated effort:** L

### Step 3: Add reserve bench API and activation workflow
**What:** Expose a dedicated API surface for managing reserve entries and activating them into live agents.
**Files:**
- `server/src/routes/*staff*`
- `server/src/services/*staff*`
- `server/src/__tests__/*staff*`
- `ui/src/api/*staff*`
- `packages/shared/src/**/*staff*`
**How:**
1. Add list/create/update/archive/activate routes under company scope.
2. Enforce company access and activity logging for all mutations.
3. On activation, validate adapter config, required secrets, and proposed manager placement.
4. Create provenance links from new live agents back to source and bench records.
**Verification:**
- route tests cover authz, validation, activation success, and invalid activation paths,
- activity log assertions exist for imports and activations.
**Estimated effort:** M

### Step 4: Build unified board staffing surface
**What:** Upgrade the current agents surface into a unified staffing view with `Active`, `Reserve`, and `Imports` tabs.
**Files:**
- `ui/src/pages/Agents.tsx` or new `ui/src/pages/Staff.tsx`
- `ui/src/App.tsx`
- `ui/src/api/*staff*`
- `ui/src/components/**/*staff*`
- `ui/src/lib/**/*staff*`
**How:**
1. Reuse the existing active agent list/org view as the `Active` tab baseline.
2. Add `Reserve` tab with bench rows/cards, provenance badges, readiness warnings, and activation actions.
3. Add `Imports` tab that adapts the current company import UX into a staffing-first wizard.
4. Preserve mobile usability and existing company-scoped navigation patterns.
**Verification:**
- UI tests cover tab rendering, empty/loading/error states, and activation CTA visibility,
- manual verification confirms no regression in existing active agents view.
**Estimated effort:** L

### Step 5: Add editable org chart mode
**What:** Introduce an explicit edit mode for reporting-line changes using a controlled graph interaction model.
**Files:**
- `ui/src/pages/OrgChart.tsx`
- `ui/src/api/agents.ts` or new org API file
- `server/src/routes/agents.ts` or new org draft route file
- `server/src/services/*org*`
- `ui/src/pages/*.test.tsx` or component tests for graph editing
**How:**
1. Keep existing read-only view mode for fast navigation.
2. Add edit mode with controlled nodes/edges, reconnectable reporting edges, and staged save/cancel.
3. Add server-side validation for no-cycle, same-company, and no-self-parent constraints.
4. Persist only manager relationship changes, not arbitrary visual graph semantics.
**Verification:**
- UI tests cover edit mode transitions and invalid move feedback,
- server tests cover cycle rejection and valid hierarchy updates,
- manual verification confirms existing org view still works.
**Estimated effort:** L

### Step 6: Integrate bench visibility and assignment safeguards
**What:** Ensure reserve entries remain visible to the board but excluded from live dispatch, assignee selection, and heartbeat semantics.
**Files:**
- `server/src/services/*issue*`
- `ui/src/lib/company-members.ts`
- `ui/src/pages/**/*Issue*`
- `server/src/services/*heartbeat*`
- tests touching assignment/visibility behavior
**How:**
1. Audit assignee picker and agent lookup flows so bench entries never appear as active agents.
2. Ensure heartbeat scheduling and runtime status views ignore bench records.
3. Add optional bench overlay in org/staff UX without mixing reserve entries into active dispatch lists.
**Verification:**
- issue assignment flows list only live agents,
- heartbeat/runs pages unchanged for active agents,
- reserve entries visible only in staffing-specific surfaces.
**Estimated effort:** M

### Step 7: Add tests and migration-level verification
**What:** Cover new model and workflow with targeted tests before broader integration.
**Files:**
- `server/src/__tests__/*staff*`
- `ui/src/**/*.test.tsx`
- `packages/shared/src/**/*.test.ts`
**How:**
1. Add unit tests for lifecycle transforms and validation helpers.
2. Add route/integration tests for preview, import, update, activate, and org validation.
3. Add UI tests for staffing tabs, import preview states, and org edit mode.
4. Run the smallest relevant test commands first, then wider typecheck if needed.
**Verification:**
- targeted tests pass,
- touched packages typecheck,
- no regressions in existing agents/org/company import behavior.
**Estimated effort:** M

## Testing Strategy

- **Unit tests:**
  - bench lifecycle state helpers
  - activation readiness checks
  - org validation helpers
  - staff import preview mapping
- **Integration tests:**
  - company-scoped staff import preview/apply
  - bench activation to live agent
  - approval handoff for governed hires
  - batch org relationship update validation
- **Manual verification:**
  - import from GitHub into reserve bench
  - activate reserve entry into active org
  - edit reporting line in org chart edit mode
  - confirm reserve entries do not show in live assignee/heartbeat surfaces

## Rollback Plan

- Revert staff routes and UI tabs while leaving existing active agents and company import flows intact.
- Disable the staffing import target modes and bench activation endpoints behind route removal or feature flag if needed.
- If bench schema lands before UI stabilizes, keep the tables unused and hidden from navigation until the workflow is ready.

## Dependencies

- Existing company portability/import analysis code
- Existing agent creation and hire approval flow
- Existing activity log infrastructure
- Existing org chart route and `reportsTo` semantics
- Graph editing library choice for edit mode, likely aligned to XYFlow-style controlled interactions

## Design Direction

**Aesthetic:** operational control room with clear lifecycle separation
**Key visual elements:** dense but readable staffing tables, provenance chips, graph edit mode with strong invalid-state feedback, explicit reserve-vs-active distinction
**Reference files to load:** interaction, responsive, ux-writing, spatial

## Success Criteria

- [ ] Board can preview GitHub-sourced staff imports before applying changes
- [ ] Board can import candidates into a reserve bench without creating live agents
- [ ] Board can activate a reserve entry into a live agent through validated workflow
- [ ] Board can edit reporting lines visually in an explicit org edit mode
- [ ] Reserve entries never appear as dispatchable agents until activation
- [ ] Design passes designer review at 7+/10 on all relevant dimensions
