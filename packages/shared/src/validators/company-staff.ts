import { z } from "zod";
import { AGENT_ROLES } from "../constants.js";
import { agentAdapterTypeSchema } from "../adapter-type.js";
import { agentPermissionsSchema } from "./agent.js";

export const companyStaffSourceTypeSchema = z.enum(["manual", "github_repo", "company_import"]);
export const companyStaffBenchStatusSchema = z.enum(["reserve", "activated", "archived"]);

export const companyStaffSourceSchema = z.object({
    id: z.string().uuid(),
    companyId: z.string().uuid(),
    sourceType: companyStaffSourceTypeSchema,
    sourceLocator: z.string().nullable(),
    sourceRef: z.string().nullable(),
    metadata: z.record(z.unknown()).nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});

export const companyStaffBenchEntrySchema = z.object({
    id: z.string().uuid(),
    companyId: z.string().uuid(),
    sourceId: z.string().uuid().nullable(),
    status: companyStaffBenchStatusSchema,
    name: z.string().min(1),
    role: z.string().min(1),
    title: z.string().nullable(),
    icon: z.string().nullable(),
    reportsToAgentId: z.string().uuid().nullable(),
    desiredSkills: z.array(z.string().min(1)).default([]),
    adapterType: agentAdapterTypeSchema,
    adapterConfig: z.record(z.unknown()).default({}),
    runtimeConfig: z.record(z.unknown()).default({}),
    defaultEnvironmentId: z.string().uuid().nullable(),
    budgetMonthlyCents: z.number().int().nonnegative(),
    permissions: agentPermissionsSchema.default({ canCreateAgents: false }),
    notes: z.string().nullable(),
    metadata: z.record(z.unknown()).nullable(),
    source: companyStaffSourceSchema.nullable(),
    activatedAgentId: z.string().uuid().nullable(),
    activatedAt: z.coerce.date().nullable(),
    archivedAt: z.coerce.date().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});

export const companyStaffBenchCreateSchema = z.object({
    sourceId: z.string().uuid().nullable().optional(),
    name: z.string().min(1),
    role: z.enum(AGENT_ROLES).optional().default("general"),
    title: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    reportsToAgentId: z.string().uuid().nullable().optional(),
    desiredSkills: z.array(z.string().min(1)).optional().default([]),
    adapterType: agentAdapterTypeSchema,
    adapterConfig: z.record(z.unknown()).optional().default({}),
    runtimeConfig: z.record(z.unknown()).optional().default({}),
    defaultEnvironmentId: z.string().uuid().nullable().optional(),
    budgetMonthlyCents: z.number().int().nonnegative().optional().default(0),
    permissions: agentPermissionsSchema.optional().default({ canCreateAgents: false }),
    notes: z.string().nullable().optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
});

export const companyStaffBenchUpdateSchema = companyStaffBenchCreateSchema.partial().extend({
    status: companyStaffBenchStatusSchema.optional(),
});

export const companyStaffBenchActivationSchema = z.object({
    reportsToAgentId: z.string().uuid().nullable().optional(),
});

export type CompanyStaffBenchCreate = z.infer<typeof companyStaffBenchCreateSchema>;
export type CompanyStaffBenchUpdate = z.infer<typeof companyStaffBenchUpdateSchema>;
export type CompanyStaffBenchActivation = z.infer<typeof companyStaffBenchActivationSchema>;