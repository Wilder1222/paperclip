import {
    pgTable,
    uuid,
    text,
    timestamp,
    jsonb,
    integer,
    index,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { environments } from "./environments.js";
import { companyStaffSources } from "./company_staff_sources.js";

export const companyStaffBenchEntries = pgTable(
    "company_staff_bench_entries",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        companyId: uuid("company_id").notNull().references(() => companies.id),
        sourceId: uuid("source_id").references(() => companyStaffSources.id, { onDelete: "set null" }),
        status: text("status").notNull().default("reserve"),
        name: text("name").notNull(),
        role: text("role").notNull().default("general"),
        title: text("title"),
        icon: text("icon"),
        reportsToAgentId: uuid("reports_to_agent_id").references(() => agents.id, { onDelete: "set null" }),
        desiredSkills: text("desired_skills").array().notNull().default([]),
        adapterType: text("adapter_type").notNull().default("process"),
        adapterConfig: jsonb("adapter_config").$type<Record<string, unknown>>().notNull().default({}),
        runtimeConfig: jsonb("runtime_config").$type<Record<string, unknown>>().notNull().default({}),
        defaultEnvironmentId: uuid("default_environment_id").references(() => environments.id, { onDelete: "set null" }),
        budgetMonthlyCents: integer("budget_monthly_cents").notNull().default(0),
        permissions: jsonb("permissions").$type<Record<string, unknown>>().notNull().default({}),
        notes: text("notes"),
        metadata: jsonb("metadata").$type<Record<string, unknown>>(),
        activatedAgentId: uuid("activated_agent_id").references(() => agents.id, { onDelete: "set null" }),
        activatedAt: timestamp("activated_at", { withTimezone: true }),
        archivedAt: timestamp("archived_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        companyStatusIdx: index("company_staff_bench_entries_company_status_idx").on(table.companyId, table.status),
        companyReportsToIdx: index("company_staff_bench_entries_company_reports_to_idx").on(table.companyId, table.reportsToAgentId),
        companyActivatedAgentIdx: index("company_staff_bench_entries_company_activated_agent_idx").on(table.companyId, table.activatedAgentId),
    }),
);