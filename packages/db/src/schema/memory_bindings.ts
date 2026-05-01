import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";

/**
 * memory_bindings — links a company (or specific agent) to a memory provider.
 *
 * Scope rules:
 *   - scopeType = "company"  → the binding is company-wide (all agents inherit it)
 *   - scopeType = "agent"    → only the named agent uses this binding
 *
 * providerType examples: "local_markdown", "mem0", "supermemory", "plugin:<id>"
 * providerConfig stores the provider-specific connection/auth settings.
 */
export const memoryBindings = pgTable(
  "memory_bindings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    /** "company" | "agent" */
    scopeType: text("scope_type").notNull().default("company"),
    /** company_id or agent_id depending on scopeType */
    scopeId: uuid("scope_id").notNull(),
    agentId: uuid("agent_id").references(() => agents.id),
    /** slug for the memory provider: "local_markdown" | "mem0" | "supermemory" | "plugin:<id>" */
    providerType: text("provider_type").notNull(),
    /** Provider-specific configuration (connection details, API endpoints, etc.) */
    providerConfig: jsonb("provider_config").notNull().default({}),
    /** Human-readable name for this binding (shown in UI) */
    label: text("label"),
    isActive: boolean("is_active").notNull().default(true),
    createdByUserId: text("created_by_user_id"),
    updatedByUserId: text("updated_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyScopeActiveIdx: index("memory_bindings_company_scope_active_idx").on(
      table.companyId,
      table.scopeType,
      table.scopeId,
      table.isActive,
    ),
    companyProviderIdx: index("memory_bindings_company_provider_idx").on(
      table.companyId,
      table.providerType,
    ),
  }),
);
