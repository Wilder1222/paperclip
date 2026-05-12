import {
    pgTable,
    uuid,
    text,
    timestamp,
    jsonb,
    index,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const companyStaffSources = pgTable(
    "company_staff_sources",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        companyId: uuid("company_id").notNull().references(() => companies.id),
        sourceType: text("source_type").notNull().default("manual"),
        sourceLocator: text("source_locator"),
        sourceRef: text("source_ref"),
        metadata: jsonb("metadata").$type<Record<string, unknown>>(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        companySourceTypeIdx: index("company_staff_sources_company_source_type_idx").on(table.companyId, table.sourceType),
    }),
);