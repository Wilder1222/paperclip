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
