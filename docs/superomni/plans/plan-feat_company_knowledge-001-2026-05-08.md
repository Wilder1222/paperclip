# Implementation Plan: Company Knowledge Base (Phase 1)

**Branch:** feat_company_knowledge  
**Session:** 001  
**Date:** 2026-05-08  
**Spec:** docs/superomni/specs/spec-feat_company_knowledge-001-2026-05-08.md  
**Storage:** Database-only (no OSS)

---

## Overview

Build a company-scoped knowledge base that promotes agent-created Issue documents into a governable, searchable library. Phase 1 covers the full lifecycle (draft → in_review → published) with Board approval gates, three UI pages (Library, Inbox, Detail), and three agent MCP tools. No new content table — body and revisions are stored in existing `documents` / `document_revisions` tables via a new `kb_entries` mapping table.

---

## Prerequisites

- [x] `documents`, `document_revisions`, `issue_documents` tables exist (migration 0028)
- [x] `documentService` exists in `server/src/services/documents.ts`
- [x] `assertCompanyAccess`, `getActorInfo`, `logActivity` patterns established
- [x] React Router, TanStack Query, Shadcn UI in place
- [x] `SidebarNavItem` component accepts `to`, `label`, `icon`, `badge` props

---

## Steps

### Step 1: DB Schema — `kb_collections` + `kb_entries`

**What:** Create two new Drizzle schema files, export them from index, generate migration.

**Files:**
- `packages/db/src/schema/kb_collections.ts` ← create
- `packages/db/src/schema/kb_entries.ts` ← create
- `packages/db/src/schema/index.ts` ← add two exports

**How:**

`packages/db/src/schema/kb_collections.ts`:
```typescript
import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const kbCollections = pgTable(
  "kb_collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companySlugUq: uniqueIndex("kb_collections_company_slug_uq").on(table.companyId, table.slug),
  }),
);
```

`packages/db/src/schema/kb_entries.ts`:
```typescript
import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { documents } from "./documents.js";
import { kbCollections } from "./kb_collections.js";
import { issues } from "./issues.js";
import { agents } from "./agents.js";

export const KB_ENTRY_STATUSES = ["draft", "in_review", "published", "archived", "deprecated"] as const;
export const KB_ENTRY_DOC_TYPES = ["general", "runbook", "adr", "playbook", "faq", "postmortem"] as const;

export const kbEntries = pgTable(
  "kb_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id").references(() => kbCollections.id, { onDelete: "set null" }),

    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    tags: text("tags").array().notNull().default([]),
    docType: text("doc_type").notNull().default("general"),

    status: text("status").notNull().default("draft"),

    sourceIssueId: uuid("source_issue_id").references(() => issues.id, { onDelete: "set null" }),
    sourceRunId: uuid("source_run_id"),

    ownerUserId: text("owner_user_id"),
    ownerAgentId: uuid("owner_agent_id").references(() => agents.id, { onDelete: "set null" }),

    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id, { onDelete: "set null" }),
    createdByUserId: text("created_by_user_id"),

    reviewRequestedAt: timestamp("review_requested_at", { withTimezone: true }),
    reviewDueAt: timestamp("review_due_at", { withTimezone: true }),
    reviewedByUserId: text("reviewed_by_user_id"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companySlugUq:        uniqueIndex("kb_entries_company_slug_uq").on(table.companyId, table.slug),
    companyStatusIdx:     index("kb_entries_company_status_idx").on(table.companyId, table.status),
    companyCollectionIdx: index("kb_entries_company_collection_idx").on(table.companyId, table.collectionId),
    companyUpdatedIdx:    index("kb_entries_company_updated_idx").on(table.companyId, table.updatedAt),
    sourceIssueIdx:       index("kb_entries_source_issue_idx").on(table.sourceIssueId),
  }),
);
```

Add to `packages/db/src/schema/index.ts` (append after last export):
```typescript
export { kbCollections } from "./kb_collections.js";
export { kbEntries, KB_ENTRY_STATUSES, KB_ENTRY_DOC_TYPES } from "./kb_entries.js";
```

**Generate migration:**
```bash
pnpm db:generate
```

**Verification:** Migration file appears in `packages/db/src/migrations/`. `pnpm -r typecheck` passes.  
**Effort:** S

---

### Step 2: Shared Types + Validators

**What:** Add KB types, status constants, and Zod validators to `packages/shared`.

**Files:**
- `packages/shared/src/validators/knowledge.ts` ← create
- `packages/shared/src/types/knowledge.ts` ← create
- `packages/shared/src/validators/index.ts` ← add exports
- `packages/shared/src/types/index.ts` ← add exports
- `packages/shared/src/index.ts` ← add re-exports

**Validators (`packages/shared/src/validators/knowledge.ts`):**
```typescript
import { z } from "zod";

export const KB_ENTRY_STATUSES = ["draft", "in_review", "published", "archived", "deprecated"] as const;
export const KB_ENTRY_DOC_TYPES = ["general", "runbook", "adr", "playbook", "faq", "postmortem"] as const;

export const kbEntryStatusSchema = z.enum(KB_ENTRY_STATUSES);
export const kbEntryDocTypeSchema = z.enum(KB_ENTRY_DOC_TYPES);

export const createKbEntrySchema = z.object({
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase letters, numbers, or hyphens"),
  title: z.string().trim().min(1).max(240),
  summary: z.string().trim().max(1000).nullable().optional(),
  docType: kbEntryDocTypeSchema.optional().default("general"),
  tags: z.array(z.string().trim().min(1).max(48)).max(20).optional().default([]),
  collectionId: z.string().uuid().nullable().optional(),
  sourceIssueId: z.string().uuid().nullable().optional(),
  // Either link existing document or provide initial body
  documentId: z.string().uuid().nullable().optional(),
  body: z.string().max(524288).nullable().optional(),
  format: z.enum(["markdown"]).optional().default("markdown"),
}).superRefine((val, ctx) => {
  if (!val.documentId && !val.body) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide either documentId or body", path: ["body"] });
  }
  if (val.documentId && val.body) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide either documentId or body, not both", path: ["documentId"] });
  }
});

export const updateKbEntrySchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  summary: z.string().trim().max(1000).nullable().optional(),
  docType: kbEntryDocTypeSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(48)).max(20).optional(),
  collectionId: z.string().uuid().nullable().optional(),
  body: z.string().max(524288).nullable().optional(),
  changeSummary: z.string().trim().max(500).nullable().optional(),
  baseRevisionId: z.string().uuid().nullable().optional(),
});

export const submitKbReviewSchema = z.object({
  reviewNote: z.string().trim().max(1000).nullable().optional(),
});

export const rejectKbEntrySchema = z.object({
  reason: z.string().trim().max(1000).nullable().optional(),
});

export const createKbCollectionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9][a-z0-9-]*$/),
  description: z.string().trim().max(500).nullable().optional(),
});

export const updateKbCollectionSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export type CreateKbEntry = z.infer<typeof createKbEntrySchema>;
export type UpdateKbEntry = z.infer<typeof updateKbEntrySchema>;
export type KbEntryStatus = z.infer<typeof kbEntryStatusSchema>;
export type KbEntryDocType = z.infer<typeof kbEntryDocTypeSchema>;
export type SubmitKbReview = z.infer<typeof submitKbReviewSchema>;
export type RejectKbEntry = z.infer<typeof rejectKbEntrySchema>;
export type CreateKbCollection = z.infer<typeof createKbCollectionSchema>;
export type UpdateKbCollection = z.infer<typeof updateKbCollectionSchema>;
```

**Types (`packages/shared/src/types/knowledge.ts`):**
```typescript
import type { KbEntryStatus, KbEntryDocType } from "../validators/knowledge.js";

export interface KbCollection {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
}

export interface KbEntrySummary {
  id: string;
  companyId: string;
  documentId: string;
  collectionId: string | null;
  slug: string;
  title: string;
  summary: string | null;
  docType: KbEntryDocType;
  tags: string[];
  status: KbEntryStatus;
  sourceIssueId: string | null;
  ownerUserId: string | null;
  ownerAgentId: string | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  reviewRequestedAt: Date | null;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  lastReviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KbEntry extends KbEntrySummary {
  body: string;
  format: string;
  latestRevisionId: string | null;
  latestRevisionNumber: number;
}
```

**Verification:** `pnpm --filter @paperclipai/shared typecheck` passes.  
**Effort:** S

---

### Step 3: Server Service — `knowledgeService`

**What:** Create `server/src/services/knowledge.ts` with all CRUD and lifecycle methods.

**File:** `server/src/services/knowledge.ts` ← create

**Key methods:**
```typescript
export function knowledgeService(db: Db) {
  return {
    // Collections
    listCollections(companyId: string): Promise<KbCollection[]>
    createCollection(companyId: string, input: CreateKbCollection): Promise<KbCollection>
    updateCollection(id: string, input: UpdateKbCollection): Promise<KbCollection>
    deleteCollection(id: string): Promise<void>

    // Entries — list/get
    listEntries(companyId: string, opts: {
      status?: KbEntryStatus | KbEntryStatus[];
      collectionId?: string;
      docType?: KbEntryDocType;
      tag?: string;
      q?: string;          // ILIKE title + summary; tsvector body
      limit?: number;
      offset?: number;
    }): Promise<{ entries: KbEntrySummary[]; total: number }>

    getEntryById(id: string): Promise<KbEntry | null>
    getEntryBySlug(companyId: string, slug: string): Promise<KbEntry | null>

    // Entries — mutations
    createEntry(companyId: string, input: CreateKbEntry, actor: Actor): Promise<KbEntry>
    updateEntry(id: string, input: UpdateKbEntry, actor: Actor): Promise<KbEntry>
    deleteEntry(id: string): Promise<void>

    // Lifecycle
    submitForReview(id: string, input: SubmitKbReview, actor: Actor): Promise<KbEntry>
    publishEntry(id: string, actor: Actor): Promise<KbEntry>
    rejectEntry(id: string, input: RejectKbEntry, actor: Actor): Promise<KbEntry>
    archiveEntry(id: string, actor: Actor): Promise<KbEntry>
    deprecateEntry(id: string, actor: Actor): Promise<KbEntry>

    // Inbox
    listInbox(companyId: string): Promise<KbEntrySummary[]>
  }
}
```

**Slug uniqueness:** On conflict append `-2`, `-3`, etc. (auto-suffix loop, max 10 retries).  
**Search (Phase 1):** `ILIKE '%q%'` on `title || ' ' || COALESCE(summary, '')`.  
**Also export from** `server/src/services/index.ts`.

**Verification:** `pnpm --filter server typecheck` passes.  
**Effort:** M

---

### Step 4: Server Routes — `/api/knowledge`

**What:** Create `server/src/routes/knowledge.ts`, register in `server/src/routes/index.ts`.

**File:** `server/src/routes/knowledge.ts` ← create

**Endpoint implementation pattern (matches `goals.ts`):**
- All routes prefix with `/companies/:companyId/knowledge` or `/knowledge/:entryId`
- `assertCompanyAccess(req, companyId)` on every route
- Agent routes: `assertAgentIssueMutationAllowed` for publish/reject (board-only guard)
- `validate(schema)` middleware on POST/PATCH
- `logActivity(db, ...)` for every mutation
- Return consistent error shapes: `{ error: string }`

**Route table:**
```
GET    /companies/:cid/knowledge/entries           → listEntries (board+agent)
POST   /companies/:cid/knowledge/entries           → createEntry (board+agent)
GET    /companies/:cid/knowledge/entries/search    → search (board+agent)
GET    /companies/:cid/knowledge/inbox             → listInbox (board)
GET    /knowledge/entries/:id                      → getEntryById (board+agent)
PATCH  /knowledge/entries/:id                      → updateEntry (board+agent)
DELETE /knowledge/entries/:id                      → archiveEntry (board)
POST   /knowledge/entries/:id/submit-review        → submitForReview (board+agent)
POST   /knowledge/entries/:id/publish              → publishEntry (board)
POST   /knowledge/entries/:id/reject               → rejectEntry (board)
POST   /knowledge/entries/:id/archive              → archiveEntry (board)
POST   /knowledge/entries/:id/deprecate            → deprecateEntry (board)

GET    /companies/:cid/knowledge/collections       → listCollections (board+agent)
POST   /companies/:cid/knowledge/collections       → createCollection (board)
PATCH  /knowledge/collections/:id                  → updateCollection (board)
DELETE /knowledge/collections/:id                  → deleteCollection (board)
```

**Register in `server/src/routes/index.ts`:**
```typescript
import { knowledgeRoutes } from "./knowledge.js";
// ...
app.use("/api", knowledgeRoutes(db));
```

**Verification:** `curl http://localhost:3100/api/companies/{id}/knowledge/entries` returns `[]`.  
**Effort:** M

---

### Step 5: Agent MCP Tools (plugin-host-services)

**What:** Add 3 new MCP tool handlers to `server/src/services/plugin-host-services.ts`.

**File:** `server/src/services/plugin-host-services.ts` ← modify (append to tool dispatch)

**Tools:**

```typescript
case "create_knowledge_draft": {
  // params: { title, body, docType?, tags?, summary?, sourceIssueId? }
  // - Calls knowledgeService(db).createEntry(...)
  // - actor = { agentId: currentAgentId }
  // - Returns { entryId, slug, documentId }
  break;
}

case "update_knowledge_draft": {
  // params: { entryId, body, changeSummary? }
  // - Verify entry belongs to company AND createdByAgentId === currentAgentId
  // - Verify status === 'draft'
  // - Calls knowledgeService(db).updateEntry(...)
  break;
}

case "submit_knowledge_review": {
  // params: { entryId, reviewNote? }
  // - Verify entry belongs to company AND createdByAgentId === currentAgentId
  // - Calls knowledgeService(db).submitForReview(...)
  break;
}
```

**Verification:** Agent can create a draft via MCP; entry appears in DB with `status='draft'`.  
**Effort:** S

---

### Step 6: UI API Client

**What:** Create `ui/src/api/knowledge.ts` with typed fetch functions.

**File:** `ui/src/api/knowledge.ts` ← create

```typescript
import { api } from "./client";
import type { KbEntry, KbEntrySummary, KbCollection } from "@paperclipai/shared";

export const knowledgeApi = {
  listEntries: (companyId: string, params?: {
    status?: string; collectionId?: string; docType?: string; q?: string;
  }) => api.get<KbEntrySummary[]>(`/companies/${companyId}/knowledge/entries`, { params }),

  getEntry: (id: string) => api.get<KbEntry>(`/knowledge/entries/${id}`),

  createEntry: (companyId: string, body: unknown) =>
    api.post<KbEntry>(`/companies/${companyId}/knowledge/entries`, body),

  updateEntry: (id: string, body: unknown) =>
    api.patch<KbEntry>(`/knowledge/entries/${id}`, body),

  submitReview: (id: string, body?: unknown) =>
    api.post<KbEntry>(`/knowledge/entries/${id}/submit-review`, body ?? {}),

  publish: (id: string) => api.post<KbEntry>(`/knowledge/entries/${id}/publish`, {}),
  reject: (id: string, body?: unknown) => api.post<KbEntry>(`/knowledge/entries/${id}/reject`, body ?? {}),
  archive: (id: string) => api.post<KbEntry>(`/knowledge/entries/${id}/archive`, {}),
  deprecate: (id: string) => api.post<KbEntry>(`/knowledge/entries/${id}/deprecate`, {}),

  listInbox: (companyId: string) =>
    api.get<KbEntrySummary[]>(`/companies/${companyId}/knowledge/inbox`),

  listCollections: (companyId: string) =>
    api.get<KbCollection[]>(`/companies/${companyId}/knowledge/collections`),

  createCollection: (companyId: string, body: unknown) =>
    api.post<KbCollection>(`/companies/${companyId}/knowledge/collections`, body),

  search: (companyId: string, q: string) =>
    api.get<KbEntrySummary[]>(`/companies/${companyId}/knowledge/entries/search`, { params: { q } }),
};
```

**Verification:** TypeScript compiles; all methods have correct return types.  
**Effort:** S

---

### Step 7: UI Pages

**What:** Create three React pages.

**Files:**
- `ui/src/pages/KnowledgeLibrary.tsx` ← create
- `ui/src/pages/KnowledgeInbox.tsx` ← create
- `ui/src/pages/KnowledgeDetail.tsx` ← create

#### KnowledgeLibrary

- `useQuery` for `knowledgeApi.listEntries(companyId, filters)`
- Filter bar: status (Published/All), docType, collection, text search input (debounced 300ms)
- Entry card: title, `Badge` for docType, tags as chips, summary excerpt (100 chars), source issue link, last updated
- Empty state: "No published knowledge yet."
- New Entry button (board only): opens `CreateKbEntryDialog` — title, docType, body textarea, tags, collection selector

#### KnowledgeInbox

- `useQuery` for `knowledgeApi.listInbox(companyId)`
- Table: Title, Submitted By, Submitted At, Source Issue, Actions (Approve / Reject)
- Reject opens inline `Textarea` + confirm button
- Empty state: "All clear — no documents awaiting review."
- Badge count on nav item = length of inbox response

#### KnowledgeDetail

- `useQuery` for `knowledgeApi.getEntry(id)`
- Left: Markdown rendered body (react-markdown, already a dep)
- Right panel: status badge, docType, collection, tags, owner, source issue link, created/updated
- Actions bar (board): context-sensitive buttons based on status
  - draft: "Submit for Review" + "Publish"
  - in_review: "Publish" + "Reject"
  - published: "Archive" + "Deprecate"
- Revisions section: collapsed by default; shows `document_revisions` via existing API

**Effort:** L

---

### Step 8: Sidebar Navigation + Router

**What:** Add Knowledge section to sidebar and three routes to App.tsx.

**Files:**
- `ui/src/components/Sidebar.tsx` ← modify
- `ui/src/App.tsx` ← modify

**Sidebar change** (in the Company `SidebarSection`):
```tsx
import { BookOpen } from "lucide-react";
// ...
<SidebarSection label="Knowledge">
  <SidebarNavItem to="/knowledge/library" label="Library" icon={BookOpen} />
  <SidebarNavItem
    to="/knowledge/inbox"
    label="Inbox"
    icon={Inbox}
    badge={inboxCount > 0 ? inboxCount : undefined}
  />
</SidebarSection>
```

`inboxCount` from a new `useKnowledgeInboxBadge(companyId)` hook (polls every 60s).

**App.tsx routes** (inside `boardRoutes()`):
```tsx
import { KnowledgeLibrary } from "./pages/KnowledgeLibrary";
import { KnowledgeInbox } from "./pages/KnowledgeInbox";
import { KnowledgeDetail } from "./pages/KnowledgeDetail";
// ...
<Route path="knowledge" element={<Navigate to="knowledge/library" replace />} />
<Route path="knowledge/library" element={<KnowledgeLibrary />} />
<Route path="knowledge/inbox" element={<KnowledgeInbox />} />
<Route path="knowledge/:entryId" element={<KnowledgeDetail />} />
```

**Verification:** Navigating to `/knowledge/library` renders the page.  
**Effort:** S

---

### Step 9: Tests

**What:** Unit + integration tests for critical paths.

**Files:**
- `server/src/__tests__/knowledge-service.test.ts` ← create
- `server/src/__tests__/knowledge-routes.test.ts` ← create
- `packages/shared/src/validators/knowledge.test.ts` ← create

**Test cases (knowledge-service):**
- `createEntry` creates entry with `status='draft'`
- `submitForReview` transitions draft → in_review; throws 409 if status ≠ draft
- `publishEntry` transitions in_review → published
- `rejectEntry` transitions in_review → draft
- Agent cannot publish (throws 403)
- `listEntries` is company-scoped (no cross-company leakage)
- Search returns correct results for matching query

**Test cases (knowledge-routes):**
- `GET /companies/:cid/knowledge/entries` returns 200 with empty array
- `POST /companies/:cid/knowledge/entries` returns 201 with created entry
- Agent cannot call `POST /knowledge/entries/:id/publish` → 403
- Unauthenticated request → 401

**Test cases (validators):**
- `createKbEntrySchema` rejects when both `documentId` and `body` provided
- `createKbEntrySchema` rejects when neither provided
- Slug regex rejects uppercase letters and spaces

**Verification:** `pnpm test:run` passes with new tests included.  
**Effort:** M

---

### Step 10: Final Typecheck + Build Verification

**What:** Full repo type check and build to confirm no regressions.

```bash
pnpm -r typecheck
pnpm test:run
pnpm build
```

**Verification:** Zero type errors, all tests green, build completes.  
**Effort:** S

---

## Testing Strategy

- **Unit tests:** Status machine transitions, permission enforcement, slug collision
- **Integration tests:** API endpoints with embedded PGlite, company isolation
- **Manual verification:** Full UI flow — create draft → submit → publish; Inbox badge count

---

## Rollback Plan

All changes are additive:
- Two new DB tables (`kb_collections`, `kb_entries`) — drop to roll back
- New routes file (`server/src/routes/knowledge.ts`) — remove import from routes/index.ts
- New UI pages — remove route registrations from App.tsx
- Existing `documents`, `issue_documents`, `issue_work_products` are untouched

---

## Dependencies

- Existing: `documents`, `document_revisions` tables, `documentService`
- Existing: `assertCompanyAccess`, `logActivity`, `validate` middleware
- Existing: `SidebarNavItem`, `Badge`, TanStack Query, react-markdown
- New: None (no new npm packages required)

---

## Success Criteria

- [ ] `pnpm db:generate` produces clean migration for `kb_collections` + `kb_entries`
- [ ] `pnpm -r typecheck` passes zero errors
- [ ] `pnpm test:run` passes including new KB tests
- [ ] Sidebar shows "Knowledge" with Library and Inbox links
- [ ] Inbox badge count reflects `in_review` entry count
- [ ] Board can complete: draft → in_review → published → archived
- [ ] Agent `create_knowledge_draft` MCP tool creates draft with correct provenance
- [ ] Agent cannot publish (returns 403)
- [ ] All mutations produce activity log entries
- [ ] Existing Issue document API behavior unchanged (regression test)
- [ ] Company isolation verified: entries from company A invisible to company B
