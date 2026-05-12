import { and, asc, eq, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { companies, companyStaffBenchEntries, companyStaffSources } from "@paperclipai/db";
import type {
    CompanyStaffBenchActivationRequest,
    CompanyStaffBenchActivationResult,
    CompanyStaffBenchCreateRequest,
    CompanyStaffBenchEntry,
    CompanyStaffSource,
    CompanyStaffBenchUpdateRequest,
} from "@paperclipai/shared";
import { conflict, notFound, unprocessable } from "../errors.js";
import { agentService } from "./agents.js";

type BenchRow = typeof companyStaffBenchEntries.$inferSelect;
type SourceRow = typeof companyStaffSources.$inferSelect;

function normalizeBenchPermissions(value: unknown): CompanyStaffBenchEntry["permissions"] {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return { canCreateAgents: false };
    }
    return {
        canCreateAgents: Boolean((value as Record<string, unknown>).canCreateAgents),
    };
}

function toPermissionsRecord(
    permissions: CompanyStaffBenchEntry["permissions"],
): Record<string, unknown> {
    return {
        canCreateAgents: permissions.canCreateAgents,
    };
}

function normalizeSourceRow(row: SourceRow): CompanyStaffSource {
    return {
        id: row.id,
        companyId: row.companyId,
        sourceType: row.sourceType as CompanyStaffSource["sourceType"],
        sourceLocator: row.sourceLocator,
        sourceRef: row.sourceRef,
        metadata: row.metadata ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

function normalizeBenchRow(row: BenchRow, source: CompanyStaffSource | null): CompanyStaffBenchEntry {
    return {
        id: row.id,
        companyId: row.companyId,
        sourceId: row.sourceId,
        status: row.status as CompanyStaffBenchEntry["status"],
        name: row.name,
        role: row.role as CompanyStaffBenchEntry["role"],
        title: row.title,
        icon: row.icon,
        reportsToAgentId: row.reportsToAgentId,
        desiredSkills: row.desiredSkills ?? [],
        adapterType: row.adapterType as CompanyStaffBenchEntry["adapterType"],
        adapterConfig: row.adapterConfig ?? {},
        runtimeConfig: row.runtimeConfig ?? {},
        defaultEnvironmentId: row.defaultEnvironmentId,
        budgetMonthlyCents: row.budgetMonthlyCents,
        permissions: normalizeBenchPermissions(row.permissions),
        notes: row.notes,
        metadata: row.metadata ?? null,
        source,
        activatedAgentId: row.activatedAgentId,
        activatedAt: row.activatedAt,
        archivedAt: row.archivedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export function companyStaffService(db: Db) {
    const agents = agentService(db);

    async function ensureCompany(companyId: string) {
        const company = await db
            .select()
            .from(companies)
            .where(eq(companies.id, companyId))
            .then((rows) => rows[0] ?? null);
        if (!company) {
            throw notFound("Company not found");
        }
        return company;
    }

    async function assertManager(companyId: string, managerId: string | null | undefined) {
        if (!managerId) return null;
        const manager = await agents.getById(managerId);
        if (!manager) {
            throw notFound("Manager not found");
        }
        if (manager.companyId !== companyId) {
            throw unprocessable("Manager must belong to same company");
        }
        return manager;
    }

    async function hydrateBenchEntries(rows: BenchRow[]) {
        const sourceIds = Array.from(new Set(rows.map((row) => row.sourceId).filter((value): value is string => Boolean(value))));
        const sourceById = new Map<string, CompanyStaffSource>();

        if (sourceIds.length > 0) {
            const sourceRows = await db
                .select()
                .from(companyStaffSources)
                .where(inArray(companyStaffSources.id, sourceIds));
            for (const row of sourceRows) {
                sourceById.set(row.id, normalizeSourceRow(row));
            }
        }

        return rows.map((row) => normalizeBenchRow(row, row.sourceId ? sourceById.get(row.sourceId) ?? null : null));
    }

    async function getBenchRow(companyId: string, entryId: string) {
        return db
            .select()
            .from(companyStaffBenchEntries)
            .where(and(eq(companyStaffBenchEntries.companyId, companyId), eq(companyStaffBenchEntries.id, entryId)))
            .then((rows) => rows[0] ?? null);
    }

    return {
        async listBench(companyId: string): Promise<CompanyStaffBenchEntry[]> {
            await ensureCompany(companyId);
            const rows = await db
                .select()
                .from(companyStaffBenchEntries)
                .where(eq(companyStaffBenchEntries.companyId, companyId))
                .orderBy(asc(companyStaffBenchEntries.createdAt));
            return hydrateBenchEntries(rows);
        },
        async createBenchEntry(
            companyId: string,
            data: CompanyStaffBenchCreateRequest,
        ): Promise<CompanyStaffBenchEntry> {
            await ensureCompany(companyId);
            await assertManager(companyId, data.reportsToAgentId);

            const created = await db
                .insert(companyStaffBenchEntries)
                .values({
                    companyId,
                    sourceId: data.sourceId ?? null,
                    status: "reserve",
                    name: data.name,
                    role: data.role ?? "general",
                    title: data.title ?? null,
                    icon: data.icon ?? null,
                    reportsToAgentId: data.reportsToAgentId ?? null,
                    desiredSkills: data.desiredSkills ?? [],
                    adapterType: data.adapterType,
                    adapterConfig: data.adapterConfig ?? {},
                    runtimeConfig: data.runtimeConfig ?? {},
                    defaultEnvironmentId: data.defaultEnvironmentId ?? null,
                    budgetMonthlyCents: data.budgetMonthlyCents ?? 0,
                    permissions: toPermissionsRecord(normalizeBenchPermissions(data.permissions)),
                    notes: data.notes ?? null,
                    metadata: data.metadata ?? null,
                })
                .returning()
                .then((rows) => rows[0]);

            const [hydrated] = await hydrateBenchEntries([created]);
            return hydrated;
        },
        async updateBenchEntry(
            companyId: string,
            entryId: string,
            data: CompanyStaffBenchUpdateRequest,
        ): Promise<CompanyStaffBenchEntry | null> {
            await ensureCompany(companyId);
            const existing = await getBenchRow(companyId, entryId);
            if (!existing) return null;
            await assertManager(companyId, data.reportsToAgentId);

            const nextStatus = data.status ?? existing.status;
            const now = new Date();
            const updated = await db
                .update(companyStaffBenchEntries)
                .set({
                    sourceId: data.sourceId ?? existing.sourceId,
                    status: nextStatus,
                    name: data.name ?? existing.name,
                    role: data.role ?? existing.role,
                    title: data.title === undefined ? existing.title : data.title,
                    icon: data.icon === undefined ? existing.icon : data.icon,
                    reportsToAgentId: data.reportsToAgentId === undefined ? existing.reportsToAgentId : data.reportsToAgentId,
                    desiredSkills: data.desiredSkills ?? existing.desiredSkills,
                    adapterType: data.adapterType ?? existing.adapterType,
                    adapterConfig: data.adapterConfig ?? existing.adapterConfig,
                    runtimeConfig: data.runtimeConfig ?? existing.runtimeConfig,
                    defaultEnvironmentId:
                        data.defaultEnvironmentId === undefined ? existing.defaultEnvironmentId : data.defaultEnvironmentId,
                    budgetMonthlyCents: data.budgetMonthlyCents ?? existing.budgetMonthlyCents,
                    permissions: toPermissionsRecord(normalizeBenchPermissions(data.permissions ?? existing.permissions)),
                    notes: data.notes === undefined ? existing.notes : data.notes,
                    metadata: data.metadata === undefined ? existing.metadata : data.metadata,
                    archivedAt: nextStatus === "archived" ? now : existing.archivedAt,
                    updatedAt: now,
                })
                .where(eq(companyStaffBenchEntries.id, entryId))
                .returning()
                .then((rows) => rows[0] ?? null);

            if (!updated) return null;
            const [hydrated] = await hydrateBenchEntries([updated]);
            return hydrated;
        },
        async activateBenchEntry(
            companyId: string,
            entryId: string,
            data: CompanyStaffBenchActivationRequest,
        ): Promise<CompanyStaffBenchActivationResult> {
            const company = await ensureCompany(companyId);
            const existing = await getBenchRow(companyId, entryId);
            if (!existing) {
                throw notFound("Bench entry not found");
            }
            if (existing.status === "activated") {
                throw conflict("Bench entry has already been activated");
            }
            if (existing.status === "archived") {
                throw conflict("Archived bench entries cannot be activated");
            }

            const reportsTo = data.reportsToAgentId ?? existing.reportsToAgentId;
            await assertManager(companyId, reportsTo);

            const agent = await agents.create(companyId, {
                name: existing.name,
                role: existing.role as CompanyStaffBenchEntry["role"],
                title: existing.title,
                icon: existing.icon,
                status: company.requireBoardApprovalForNewAgents ? "pending_approval" : "idle",
                reportsTo,
                capabilities: null,
                adapterType: existing.adapterType as CompanyStaffBenchEntry["adapterType"],
                adapterConfig: existing.adapterConfig ?? {},
                runtimeConfig: existing.runtimeConfig ?? {},
                defaultEnvironmentId: existing.defaultEnvironmentId,
                budgetMonthlyCents: existing.budgetMonthlyCents,
                spentMonthlyCents: 0,
                pauseReason: null,
                pausedAt: null,
                permissions: toPermissionsRecord(normalizeBenchPermissions(existing.permissions)),
                lastHeartbeatAt: null,
                metadata: existing.metadata ?? null,
            });

            const updated = await db
                .update(companyStaffBenchEntries)
                .set({
                    status: "activated",
                    reportsToAgentId: reportsTo,
                    activatedAgentId: agent.id,
                    activatedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(companyStaffBenchEntries.id, existing.id))
                .returning()
                .then((rows) => rows[0]);

            const [benchEntry] = await hydrateBenchEntries([updated]);
            return {
                benchEntry,
                agent: agent as CompanyStaffBenchActivationResult["agent"],
                approval: null,
            };
        },
    };
}