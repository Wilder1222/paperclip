# Spec: Company Knowledge Base Management

**Branch:** feat_company_knowledge  
**Session:** 001  
**Date:** 2026-05-08  
**Stage:** THINK  
**Status:** Awaiting user approval  
**Storage strategy:** Database-only (no OSS)

---

## 1. Problem Statement

Paperclip agents create documents and work products during issue execution, but those artifacts are permanently scoped to the issue that produced them. There is no company-level knowledge plane — no way to:

- Browse, search, or curate what has been produced across all issues
- Promote a document from "issue output" to "company knowledge"
- Apply governance (review, approval, expiry, ownership) to that knowledge
- Give subsequent agents or humans a discoverable, authoritative reference corpus

Without a knowledge base, each agent starts every task from scratch. Context is lost, errors repeat, institutional knowledge evaporates when issues close.

**Who experiences this?**
1. Human board operators — cannot audit or build on what agents have produced
2. Agents — cannot reliably access prior company context beyond what is injected ad-hoc
3. Reviewers / approvers — no structured review flow for agent-produced artifacts

**What does success look like?**
- Board operator can open a "Knowledge" section and see all published company documents
- An agent can submit a document for review without directly publishing
- A reviewer can approve/reject with a single action
- An agent working on a new issue can reference a published knowledge document by slug
- Every document traces back to its source issue or run

---

## 2. Constraints

| Constraint | Value |
|---|---|
| Storage | Database-only (PostgreSQL / PGlite) — no OSS |
| Max document body | 512 KB (existing `upsertIssueDocumentSchema` limit) |
| Tenancy | Single-tenant, company-scoped; `companyId` required on every entity |
| Auth | Board = full control; Agent = draft + submit-review only; no direct publish |
| Compatibility | Must not break existing `documents` / `issue_documents` / `document_revisions` tables |
| Deployment | Works in both embedded PGlite dev mode and external PostgreSQL |

---

## 3. Solution Overview

Introduce a **Company Knowledge Base** layer that:

1. **Reuses** the existing `documents` table as the canonical store for content + revisions
2. **Adds** a lightweight `kb_entries` mapping table that promotes a document into the knowledge base and tracks status + metadata
3. **Adds** a `kb_collections` table for hierarchical categorization (flat first, tree in Phase 2)
4. **Exposes** new REST endpoints under `/api/knowledge/`
5. **Adds** a sidebar nav item and three UI pages: Library, Inbox, and a Document Detail page

The design is additive: existing Issue document flows are unchanged. A knowledge entry is a view over an existing document, not a copy.

---

## 4. Information Architecture

### 4.1 Navigation

Sidebar — **Company** section gains:

```
Knowledge
  └── Library     (/knowledge/library)
  └── Inbox       (/knowledge/inbox)
```

Search available via command palette (`⌘K`) — no separate top-level search page in Phase 1.

### 4.2 Page Map

| Route | Purpose |
|---|---|
| `/knowledge/library` | Browse + filter published knowledge entries |
| `/knowledge/inbox` | Review queue (draft/in_review entries awaiting approval) |
| `/knowledge/:entryId` | Knowledge document detail: body, revisions, source, governance |

---

## 5. Data Model

### 5.1 New Table: `kb_collections`

```sql
CREATE TABLE kb_collections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name         text NOT NULL,          -- "Runbooks", "ADRs", "Postmortems"
  slug         text NOT NULL,
  description  text,
  created_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE (company_id, slug)
);
```

### 5.2 New Table: `kb_entries`

```sql
CREATE TABLE kb_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_id     uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  collection_id   uuid REFERENCES kb_collections(id) ON DELETE SET NULL,

  -- Identity
  slug            text NOT NULL,        -- URL-safe, company-unique
  title           text NOT NULL,
  summary         text,                 -- 1-3 sentence abstract (optional)
  tags            text[] NOT NULL DEFAULT '{}',
  doc_type        text NOT NULL DEFAULT 'general',
                  -- 'general' | 'runbook' | 'adr' | 'playbook' | 'faq' | 'postmortem'

  -- Lifecycle
  status          text NOT NULL DEFAULT 'draft',
                  -- 'draft' | 'in_review' | 'published' | 'archived' | 'deprecated'
  visibility      text NOT NULL DEFAULT 'internal',  -- 'internal' only for Phase 1

  -- Provenance
  source_issue_id uuid REFERENCES issues(id) ON DELETE SET NULL,
  source_run_id   uuid,

  -- Ownership
  owner_user_id   text,
  owner_agent_id  uuid REFERENCES agents(id) ON DELETE SET NULL,

  -- Review governance
  review_requested_at  timestamptz,
  review_due_at        timestamptz,
  reviewed_by_user_id  text,
  reviewed_at          timestamptz,
  last_reviewed_at     timestamptz,

  -- Timestamps
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL,

  UNIQUE (company_id, slug)
);

CREATE INDEX kb_entries_company_status_idx      ON kb_entries (company_id, status);
CREATE INDEX kb_entries_company_collection_idx  ON kb_entries (company_id, collection_id);
CREATE INDEX kb_entries_company_updated_idx     ON kb_entries (company_id, updated_at DESC);
CREATE INDEX kb_entries_source_issue_idx        ON kb_entries (source_issue_id);
```

### 5.3 Relationship Diagram

```
companies
  └── kb_collections  (1:N)
  └── kb_entries      (1:N)
        ├── documents         (1:1 via document_id)
        │     └── document_revisions  (1:N, existing)
        ├── issues            (M:1 via source_issue_id, optional)
        └── agents            (M:1 via owner_agent_id, optional)
```

No new content table. Body + revisions live in existing `documents` and `document_revisions`.

---

## 6. Lifecycle State Machine

```
[Agent creates]    [Board creates]
     │                   │
     ▼                   ▼
  draft ──────────────────────────────► archived
     │                                      ▲
     │ submit-review (agent or board)        │
     ▼                                      │
  in_review ──► reject ──► draft            │
     │                                      │
     │ approve (board only)                 │
     ▼                                      │
  published ──────────────────────────────► │
     │                                      │
     │ deprecate                            │
     ▼                                      │
  deprecated ─────────────────────────────► ┘
```

**Rules:**
- Agent: can create `draft`, update `draft`, submit to `in_review`
- Board: full transitions; direct publish without review allowed
- Only `published` entries appear in Library by default
- `in_review` entries appear in Inbox

---

## 7. API Endpoints

### Knowledge Entries

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/knowledge/entries` | board/agent | List entries (filter: status, collection, tag, docType) |
| POST | `/api/knowledge/entries` | board/agent | Create entry (links to existing document OR creates new) |
| GET | `/api/knowledge/entries/:id` | board/agent | Get entry with document body |
| PATCH | `/api/knowledge/entries/:id` | board/agent | Update metadata (title, tags, summary, collection) |
| DELETE | `/api/knowledge/entries/:id` | board | Archive entry |
| POST | `/api/knowledge/entries/:id/submit-review` | board/agent | Transition draft → in_review |
| POST | `/api/knowledge/entries/:id/publish` | board | Transition in_review/draft → published |
| POST | `/api/knowledge/entries/:id/reject` | board | Transition in_review → draft |
| POST | `/api/knowledge/entries/:id/archive` | board | → archived |
| POST | `/api/knowledge/entries/:id/deprecate` | board | published → deprecated |

### Knowledge Collections

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/knowledge/collections` | board/agent | List collections for company |
| POST | `/api/knowledge/collections` | board | Create collection |
| PATCH | `/api/knowledge/collections/:id` | board | Update name/description |
| DELETE | `/api/knowledge/collections/:id` | board | Delete (un-assigns entries) |

### Knowledge Inbox

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/knowledge/inbox` | board | List in_review entries |

### Search (Phase 1 — DB text search)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/knowledge/search?q=&status=&tag=&docType=` | board/agent | Full-text search over title + summary + body |

**Implementation note:** Phase 1 search uses `ILIKE '%query%'` on title + summary plus Postgres `to_tsvector` on body. No external search engine needed.

---

## 8. Permissions Matrix

| Action | Board | Agent (own company) |
|---|---|---|
| Read published entries | ✓ | ✓ |
| Read draft entries | ✓ | own only |
| Create draft | ✓ | ✓ |
| Update draft body | ✓ | own only |
| Submit for review | ✓ | ✓ |
| Approve / publish | ✓ | ✗ |
| Reject | ✓ | ✗ |
| Archive / deprecate | ✓ | ✗ |
| Manage collections | ✓ | ✗ |
| Delete | ✓ | ✗ |

Agent "own only" = entries where `created_by_agent_id` matches the authenticated agent.

---

## 9. UI Pages

### 9.1 Library (`/knowledge/library`)

- Top bar: filter pills (All Types / Runbook / ADR / Playbook / FAQ / Postmortem), search input, Collection selector, Sort (Updated ↓, Created ↓, Title A-Z)
- Card list: title, doc_type badge, tags, summary excerpt, source issue link, owner, last updated
- Empty state: "No published knowledge yet. Agents will submit documents here as they complete work."
- New button (board only): opens "Promote document to Knowledge" dialog (pick existing Issue doc OR create blank)

### 9.2 Inbox (`/knowledge/inbox`)

- Table: title, submitted by (agent/user), submitted at, source issue, actions (Approve / Reject)
- Reject opens inline reason input (optional, max 500 chars)
- Badge count on sidebar nav item = number of in_review entries
- Empty state: "All clear — no documents awaiting review."

### 9.3 Document Detail (`/knowledge/:entryId`)

- Left: document body (Markdown rendered, read-only in Phase 1)
- Right panel: metadata (status, doc_type, collection, tags, owner, source issue link, created/updated)
- Revision history tab: list of revisions with timestamps + change summaries
- Actions bar (board): Publish / Reject / Archive / Deprecate buttons depending on status
- Activity trail (below): log entries from activity table scoped to this document

---

## 10. Agent Integration

### 10.1 New MCP Tool Actions

Agents get three new MCP tool actions (added to plugin-host-services):

```typescript
// Create a knowledge draft (automatically links to current run's issue)
create_knowledge_draft(title, body, docType?, tags?, summary?)
// → returns { entryId, slug, documentId }

// Update body of a knowledge draft (own entries only)
update_knowledge_draft(entryId, body, changeSummary?)
// → returns updated entry

// Submit draft for review
submit_knowledge_review(entryId, reviewNote?)
// → transitions to in_review
```

### 10.2 Context Injection (Phase 2)

Not in Phase 1 scope. Planned: Agent heartbeat payload includes `relevantKnowledge[]` based on tag matching against issue labels.

### 10.3 Auto-Promotion Suggestion (Phase 2)

Not in Phase 1. Planned: On issue completion with deliverables, suggest promoting plan/runbook docs to KB.

---

## 11. Activity Logging

All mutating actions write to the existing `activity` table:

| Action string | Trigger |
|---|---|
| `knowledge.entry_created` | Entry created |
| `knowledge.entry_updated` | Metadata or body updated |
| `knowledge.review_submitted` | Submit for review |
| `knowledge.entry_published` | Published |
| `knowledge.review_rejected` | Rejected |
| `knowledge.entry_archived` | Archived |
| `knowledge.entry_deprecated` | Deprecated |

---

## 12. Phased Delivery

### Phase 1 — Foundation (this spec, ~2 weeks)

**Scope:**
- DB: `kb_collections` + `kb_entries` tables + migration
- Server: `/api/knowledge/entries` + `/api/knowledge/collections` + `/api/knowledge/inbox` + `/api/knowledge/search`
- Lifecycle transitions: draft → in_review → published / rejected / archived
- UI: Library, Inbox, Document Detail pages
- Sidebar nav: Knowledge section with Inbox badge count
- Agent MCP tools: `create_knowledge_draft`, `update_knowledge_draft`, `submit_knowledge_review`
- Activity logging for all mutations
- Full type/compile/test pass

**Not in Phase 1:**
- Context injection into heartbeat
- Auto-promotion suggestion on issue close
- Full-text search beyond ILIKE (Postgres `tsvector` is acceptable)
- Collection tree hierarchy (flat list only)
- Public / external visibility tier

### Phase 2 — Governance + Reuse (~2 weeks)

- Collection hierarchy (parent_id)
- Review assignment (explicit reviewer user/agent)
- Review due date alerts (activity feed + inbox badge)
- Context injection into agent heartbeat payload
- Auto-promotion suggestion on issue completion
- Deprecation warnings when entry body is stale (> 60 days since last review)
- Export to Markdown archive

### Phase 3 — Search + Intelligence

- Postgres full-text `tsvector` index + ranking
- Related entries surface in Issue detail sidebar
- Knowledge gap detector (issues with no KB reference for repeated keywords)

---

## 13. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `documents` table body size in DB | Low | 512 KB cap already enforced by validator |
| PGlite full-text search performance | Low | Phase 1 ILIKE is fine for small corpora; tsvector in Phase 2 |
| Agent flooding Inbox | Medium | Rate limit: max 10 pending in_review per agent per company |
| Breaking existing Issue doc flow | High | `kb_entries` is additive; no changes to `issue_documents` |
| Slug collision | Low | `UNIQUE(company_id, slug)` + auto-suffix on conflict |

---

## 14. Definition of Done (Phase 1)

1. `pnpm db:generate` produces a clean migration with both new tables
2. `pnpm -r typecheck` passes with zero errors
3. `pnpm test:run` passes with new unit + integration tests for:
   - Status transitions (all allowed + all forbidden)
   - Permission enforcement (agent cannot publish)
   - Search returns correct results and is company-scoped
4. Sidebar shows Knowledge → Library / Inbox
5. Inbox badge count reflects `in_review` entry count
6. Board can complete full lifecycle: draft → in_review → published → archived
7. Agent MCP tool `create_knowledge_draft` creates a draft entry with correct provenance
8. All mutations produce activity log entries
9. No changes to existing issue document API behavior
