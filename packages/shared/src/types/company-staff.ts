import type { Agent } from "./agent.js";
import type { Approval } from "./approval.js";
import type { AgentPermissions } from "./agent.js";
import type { AgentAdapterType, AgentRole } from "../constants.js";

export type CompanyStaffSourceType = "manual" | "github_repo" | "company_import";

export type CompanyStaffBenchStatus = "reserve" | "activated" | "archived";

export interface CompanyStaffSource {
    id: string;
    companyId: string;
    sourceType: CompanyStaffSourceType;
    sourceLocator: string | null;
    sourceRef: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CompanyStaffBenchEntry {
    id: string;
    companyId: string;
    sourceId: string | null;
    status: CompanyStaffBenchStatus;
    name: string;
    role: AgentRole;
    title: string | null;
    icon: string | null;
    reportsToAgentId: string | null;
    desiredSkills: string[];
    adapterType: AgentAdapterType;
    adapterConfig: Record<string, unknown>;
    runtimeConfig: Record<string, unknown>;
    defaultEnvironmentId: string | null;
    budgetMonthlyCents: number;
    permissions: AgentPermissions;
    notes: string | null;
    metadata: Record<string, unknown> | null;
    source: CompanyStaffSource | null;
    activatedAgentId: string | null;
    activatedAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CompanyStaffBenchCreateRequest {
    sourceId?: string | null;
    name: string;
    role?: AgentRole;
    title?: string | null;
    icon?: string | null;
    reportsToAgentId?: string | null;
    desiredSkills?: string[];
    adapterType: AgentAdapterType;
    adapterConfig?: Record<string, unknown>;
    runtimeConfig?: Record<string, unknown>;
    defaultEnvironmentId?: string | null;
    budgetMonthlyCents?: number;
    permissions?: AgentPermissions;
    notes?: string | null;
    metadata?: Record<string, unknown> | null;
}

export interface CompanyStaffBenchUpdateRequest {
    status?: CompanyStaffBenchStatus;
    sourceId?: string | null;
    name?: string;
    role?: AgentRole;
    title?: string | null;
    icon?: string | null;
    reportsToAgentId?: string | null;
    desiredSkills?: string[];
    adapterType?: AgentAdapterType;
    adapterConfig?: Record<string, unknown>;
    runtimeConfig?: Record<string, unknown>;
    defaultEnvironmentId?: string | null;
    budgetMonthlyCents?: number;
    permissions?: AgentPermissions;
    notes?: string | null;
    metadata?: Record<string, unknown> | null;
}

export interface CompanyStaffBenchActivationRequest {
    reportsToAgentId?: string | null;
}

export interface CompanyStaffBenchActivationResult {
    benchEntry: CompanyStaffBenchEntry;
    agent: Agent;
    approval: Approval | null;
}