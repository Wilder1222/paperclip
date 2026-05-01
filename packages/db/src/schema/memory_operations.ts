import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { memoryBindings } from "./memory_bindings.js";
import { heartbeatRuns } from "./heartbeat_runs.js";
import { issues } from "./issues.js";

/**
 * memory_operations — audit log for every read/write interaction with memory providers.
 *
 * operationKind values:
 *   "ingest"   — a new memory item was written (e.g. after a heartbeat run)
 *   "recall"   — memories were queried and injected into an agent's context
 *   "inspect"  — a human board user browsed stored memories
 *   "get"      — a single memory item was retrieved by ID
 *   "forget"   — a memory item was deleted
 *   "usage"    — a usage/stats query was performed
 */
export const memoryOperations = pgTable(
  "memory_operations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    bindingId: uuid("binding_id").notNull().references(() => memoryBindings.id),
    agentId: uuid("agent_id").references(() => agents.id),
    /** The heartbeat run that triggered this operation (null for board-initiated ops) */
    heartbeatRunId: uuid("heartbeat_run_id").references(() => heartbeatRuns.id),
    /** The issue that provided the context for this memory operation */
    issueId: uuid("issue_id").references(() => issues.id),
    /** "ingest" | "recall" | "inspect" | "get" | "forget" | "usage" */
    operationKind: text("operation_kind").notNull(),
    /** Number of memory items returned/affected */
    itemCount: integer("item_count").notNull().default(0),
    /** Tokens consumed by the memory provider for this operation (if applicable) */
    tokenCount: integer("token_count").notNull().default(0),
    /** Latency in milliseconds */
    latencyMs: integer("latency_ms"),
    /** Provider-returned status: "ok" | "error" | "partial" */
    status: text("status").notNull().default("ok"),
    /** Error message if status != "ok" */
    errorMessage: text("error_message"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyOccurredIdx: index("memory_operations_company_occurred_idx").on(
      table.companyId,
      table.occurredAt,
    ),
    companyAgentIdx: index("memory_operations_company_agent_idx").on(
      table.companyId,
      table.agentId,
    ),
    companyBindingIdx: index("memory_operations_company_binding_idx").on(
      table.companyId,
      table.bindingId,
    ),
    companyRunIdx: index("memory_operations_company_run_idx").on(
      table.companyId,
      table.heartbeatRunId,
    ),
  }),
);
