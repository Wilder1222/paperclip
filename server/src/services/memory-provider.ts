import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { memoryBindings, memoryOperations } from "@paperclipai/db";
import {
    LocalMarkdownMemoryProvider,
    Mem0MemoryProvider,
    type MemoryProvider,
} from "@paperclipai/adapter-utils";
import type { CreateMemoryBinding, UpdateMemoryBinding } from "@paperclipai/shared";

export type MemoryProviderType = "mem0" | "local_markdown";
export type MemoryScopeType = "company" | "agent" | "project";

export interface CreateMemoryBindingInput extends CreateMemoryBinding {
    companyId: string;
    createdByUserId?: string | null;
}

export interface UpdateMemoryBindingInput extends UpdateMemoryBinding {
    updatedByUserId?: string | null;
}

export interface ResolveActiveMemoryProviderInput {
    companyId: string;
    projectId?: string | null;
    agentId?: string | null;
}

export interface ResolvedMemoryProvider {
    binding: typeof memoryBindings.$inferSelect;
    provider: MemoryProvider;
    namespaceProjectId: string | null;
}

export interface RecordMemoryOperationInput {
    companyId: string;
    bindingId: string;
    operationKind: "ingest" | "recall" | "inspect" | "get" | "forget" | "usage";
    status: "ok" | "error" | "partial";
    itemCount?: number;
    tokenCount?: number;
    latencyMs?: number | null;
    errorMessage?: string | null;
    agentId?: string | null;
    heartbeatRunId?: string | null;
    issueId?: string | null;
}

function nonEmptyString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function normalizeProviderType(value: string): MemoryProviderType | null {
    if (value === "mem0" || value === "local_markdown") return value;
    return null;
}

function createProvider(binding: typeof memoryBindings.$inferSelect): MemoryProvider | null {
    const providerType = normalizeProviderType(binding.providerType);
    if (!providerType) return null;

    const config = asRecord(binding.providerConfig);
    if (providerType === "mem0") {
        const apiKey = nonEmptyString(config.apiKey);
        if (!apiKey) return null;
        return new Mem0MemoryProvider({
            apiKey,
            baseUrl: nonEmptyString(config.baseUrl) ?? undefined,
            projectNamespacePrefix: nonEmptyString(config.projectNamespacePrefix) ?? undefined,
            timeoutMs: typeof config.timeoutMs === "number" ? config.timeoutMs : undefined,
        });
    }

    return new LocalMarkdownMemoryProvider({
        baseDir: nonEmptyString(config.baseDir) ?? undefined,
    });
}

async function findBindingForScope(input: {
    db: Db;
    companyId: string;
    scopeType: MemoryScopeType;
    scopeId: string;
}) {
    return input.db
        .select()
        .from(memoryBindings)
        .where(and(
            eq(memoryBindings.companyId, input.companyId),
            eq(memoryBindings.scopeType, input.scopeType),
            eq(memoryBindings.scopeId, input.scopeId),
            eq(memoryBindings.isActive, true),
        ))
        .orderBy(desc(memoryBindings.updatedAt), desc(memoryBindings.createdAt))
        .limit(1)
        .then((rows) => rows[0] ?? null);
}

export async function resolveActiveMemoryProvider(
    db: Db,
    input: ResolveActiveMemoryProviderInput,
): Promise<ResolvedMemoryProvider | null> {
    const projectId = nonEmptyString(input.projectId);
    const agentId = nonEmptyString(input.agentId);

    const bindingCandidates: Array<typeof memoryBindings.$inferSelect | null> = [
        projectId
            ? await findBindingForScope({ db, companyId: input.companyId, scopeType: "project", scopeId: projectId })
            : null,
        agentId
            ? await findBindingForScope({ db, companyId: input.companyId, scopeType: "agent", scopeId: agentId })
            : null,
        await findBindingForScope({ db, companyId: input.companyId, scopeType: "company", scopeId: input.companyId }),
    ];

    for (const binding of bindingCandidates) {
        if (!binding) continue;
        const provider = createProvider(binding);
        if (!provider) continue;
        return {
            binding,
            provider,
            namespaceProjectId: projectId,
        };
    }

    return null;
}

export async function recordMemoryOperation(db: Db, input: RecordMemoryOperationInput) {
    return db
        .insert(memoryOperations)
        .values({
            companyId: input.companyId,
            bindingId: input.bindingId,
            operationKind: input.operationKind,
            status: input.status,
            itemCount: Math.max(0, Math.floor(input.itemCount ?? 0)),
            tokenCount: Math.max(0, Math.floor(input.tokenCount ?? 0)),
            latencyMs: typeof input.latencyMs === "number" ? Math.max(0, Math.floor(input.latencyMs)) : null,
            errorMessage: input.errorMessage ?? null,
            agentId: input.agentId ?? null,
            heartbeatRunId: input.heartbeatRunId ?? null,
            issueId: input.issueId ?? null,
        })
        .returning()
        .then((rows) => rows[0] ?? null);
}

export async function listMemoryBindings(db: Db, companyId: string) {
    return db
        .select()
        .from(memoryBindings)
        .where(eq(memoryBindings.companyId, companyId))
        .orderBy(desc(memoryBindings.updatedAt), desc(memoryBindings.createdAt));
}

export async function createMemoryBinding(db: Db, input: CreateMemoryBindingInput) {
    return db
        .insert(memoryBindings)
        .values({
            companyId: input.companyId,
            scopeType: input.scopeType,
            scopeId: input.scopeId,
            agentId: input.agentId ?? null,
            providerType: input.providerType,
            providerConfig: input.providerConfig ?? {},
            label: input.label ?? null,
            isActive: input.isActive ?? true,
            createdByUserId: input.createdByUserId ?? null,
            updatedByUserId: input.createdByUserId ?? null,
        })
        .returning()
        .then((rows) => rows[0] ?? null);
}

export async function updateMemoryBinding(
    db: Db,
    input: { companyId: string; bindingId: string; patch: UpdateMemoryBindingInput },
) {
    return db
        .update(memoryBindings)
        .set({
            ...(input.patch.providerConfig ? { providerConfig: input.patch.providerConfig } : {}),
            ...(input.patch.label !== undefined ? { label: input.patch.label } : {}),
            ...(input.patch.isActive !== undefined ? { isActive: input.patch.isActive } : {}),
            ...(input.patch.updatedByUserId !== undefined ? { updatedByUserId: input.patch.updatedByUserId } : {}),
            updatedAt: new Date(),
        })
        .where(and(
            eq(memoryBindings.id, input.bindingId),
            eq(memoryBindings.companyId, input.companyId),
        ))
        .returning()
        .then((rows) => rows[0] ?? null);
}

export async function disableMemoryBinding(
    db: Db,
    input: { companyId: string; bindingId: string; updatedByUserId?: string | null },
) {
    return updateMemoryBinding(db, {
        companyId: input.companyId,
        bindingId: input.bindingId,
        patch: {
            isActive: false,
            updatedByUserId: input.updatedByUserId ?? null,
        },
    });
}
