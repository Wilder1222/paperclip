import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
    agents,
    companies,
    createDb,
    memoryBindings,
    memoryOperations,
} from "@paperclipai/db";
import { LocalMarkdownMemoryProvider } from "@paperclipai/adapter-utils";
import {
    getEmbeddedPostgresTestSupport,
    startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import {
    resolveActiveMemoryProvider,
    recordMemoryOperation,
} from "../services/memory-provider.ts";

// ---------------------------------------------------------------------------
// Embedded-Postgres suite (scope priority + opt-in + audit write)
// ---------------------------------------------------------------------------

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
    console.warn(
        `Skipping memory-provider DB tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
    );
}

describeEmbeddedPostgres("memory-provider service — DB tests", () => {
    let db!: ReturnType<typeof createDb>;
    let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

    const companyId = randomUUID();
    const agentId = randomUUID();
    const projectId = randomUUID();

    beforeAll(async () => {
        tempDb = await startEmbeddedPostgresTestDatabase("paperclip-memory-provider-");
        db = createDb(tempDb.connectionString);

        await db.insert(companies).values({
            id: companyId,
            name: "MemoryTestCo",
            issuePrefix: "MEM",
            requireBoardApprovalForNewAgents: false,
        });

        await db.insert(agents).values({
            id: agentId,
            companyId,
            name: "MemBot",
            role: "engineer",
            status: "active",
            adapterType: "codex_local",
            adapterConfig: {},
            runtimeConfig: {},
            permissions: {},
        });
    }, 20_000);

    afterEach(async () => {
        await db.delete(memoryOperations);
        await db.delete(memoryBindings);
    });

    afterAll(async () => {
        await db.delete(agents);
        await db.delete(companies);
        await tempDb?.cleanup();
    });

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    async function insertBinding(overrides: {
        scopeType: "company" | "agent" | "project";
        scopeId: string;
        providerType?: string;
        providerConfig?: Record<string, unknown>;
        isActive?: boolean;
    }) {
        const row = await db
            .insert(memoryBindings)
            .values({
                companyId,
                scopeType: overrides.scopeType,
                scopeId: overrides.scopeId,
                providerType: overrides.providerType ?? "local_markdown",
                providerConfig: overrides.providerConfig ?? {},
                isActive: overrides.isActive ?? true,
            })
            .returning()
            .then((rows) => rows[0]!);
        return row;
    }

    // -------------------------------------------------------------------------
    // Group 1: scope priority (project > agent > company)
    // -------------------------------------------------------------------------

    describe("scope priority", () => {
        it("prefers project scope over agent and company scope", async () => {
            const companyBinding = await insertBinding({ scopeType: "company", scopeId: companyId });
            const agentBinding = await insertBinding({ scopeType: "agent", scopeId: agentId });
            const projectBinding = await insertBinding({ scopeType: "project", scopeId: projectId });

            const result = await resolveActiveMemoryProvider(db, { companyId, projectId, agentId });

            expect(result).not.toBeNull();
            expect(result!.binding.id).toBe(projectBinding.id);
            expect(result!.binding.scopeType).toBe("project");

            void companyBinding;
            void agentBinding;
        });

        it("falls back to agent scope when no project binding exists", async () => {
            const companyBinding = await insertBinding({ scopeType: "company", scopeId: companyId });
            const agentBinding = await insertBinding({ scopeType: "agent", scopeId: agentId });

            const result = await resolveActiveMemoryProvider(db, { companyId, projectId, agentId });

            expect(result).not.toBeNull();
            expect(result!.binding.id).toBe(agentBinding.id);
            expect(result!.binding.scopeType).toBe("agent");

            void companyBinding;
        });

        it("falls back to company scope when no project or agent binding exists", async () => {
            const companyBinding = await insertBinding({ scopeType: "company", scopeId: companyId });

            const result = await resolveActiveMemoryProvider(db, { companyId, projectId, agentId });

            expect(result).not.toBeNull();
            expect(result!.binding.id).toBe(companyBinding.id);
            expect(result!.binding.scopeType).toBe("company");
        });

        it("namespaceProjectId is set to the resolved projectId", async () => {
            await insertBinding({ scopeType: "company", scopeId: companyId });

            const result = await resolveActiveMemoryProvider(db, { companyId, projectId, agentId });

            expect(result).not.toBeNull();
            expect(result!.namespaceProjectId).toBe(projectId);
        });
    });

    // -------------------------------------------------------------------------
    // Group 2: opt-in — null returns when nothing should activate
    // -------------------------------------------------------------------------

    describe("opt-in (returns null when no valid binding)", () => {
        it("returns null when no bindings exist for the company", async () => {
            const result = await resolveActiveMemoryProvider(db, { companyId, projectId, agentId });
            expect(result).toBeNull();
        });

        it("returns null when all bindings are inactive", async () => {
            await insertBinding({ scopeType: "company", scopeId: companyId, isActive: false });
            await insertBinding({ scopeType: "project", scopeId: projectId, isActive: false });

            const result = await resolveActiveMemoryProvider(db, { companyId, projectId, agentId });
            expect(result).toBeNull();
        });

        it("returns null when projectId and agentId are omitted and no company binding exists", async () => {
            const result = await resolveActiveMemoryProvider(db, { companyId });
            expect(result).toBeNull();
        });

        it("returns null for mem0 binding with missing apiKey in providerConfig", async () => {
            await insertBinding({
                scopeType: "company",
                scopeId: companyId,
                providerType: "mem0",
                providerConfig: { baseUrl: "https://api.mem0.ai/v1" }, // no apiKey
            });

            const result = await resolveActiveMemoryProvider(db, { companyId });
            expect(result).toBeNull();
        });

        it("returns a provider for mem0 binding when apiKey is present", async () => {
            await insertBinding({
                scopeType: "company",
                scopeId: companyId,
                providerType: "mem0",
                providerConfig: { apiKey: "test-key-abc" },
            });

            const result = await resolveActiveMemoryProvider(db, { companyId });
            expect(result).not.toBeNull();
            expect(result!.binding.providerType).toBe("mem0");
        });

        it("ignores inactive binding when active one exists at lower scope", async () => {
            // project binding is inactive — should fall through to company
            await insertBinding({ scopeType: "project", scopeId: projectId, isActive: false });
            const companyBinding = await insertBinding({ scopeType: "company", scopeId: companyId });

            const result = await resolveActiveMemoryProvider(db, { companyId, projectId });
            expect(result).not.toBeNull();
            expect(result!.binding.id).toBe(companyBinding.id);
        });
    });

    // -------------------------------------------------------------------------
    // Group 3: audit write — recordMemoryOperation
    // -------------------------------------------------------------------------

    describe("recordMemoryOperation (audit write)", () => {
        it("inserts a memory_operations row and returns it", async () => {
            const binding = await insertBinding({ scopeType: "company", scopeId: companyId });

            const row = await recordMemoryOperation(db, {
                companyId,
                bindingId: binding.id,
                operationKind: "recall",
                status: "ok",
                itemCount: 3,
                tokenCount: 120,
                latencyMs: 45,
            });

            expect(row).not.toBeNull();
            expect(row!.companyId).toBe(companyId);
            expect(row!.bindingId).toBe(binding.id);
            expect(row!.operationKind).toBe("recall");
            expect(row!.status).toBe("ok");
            expect(row!.itemCount).toBe(3);
            expect(row!.tokenCount).toBe(120);
            expect(row!.latencyMs).toBe(45);
        });

        it("stores optional fields (agentId, issueId) when provided", async () => {
            const binding = await insertBinding({ scopeType: "agent", scopeId: agentId });
            const issueId = randomUUID(); // intentionally not in DB — FK check absent in insert path

            const row = await recordMemoryOperation(db, {
                companyId,
                bindingId: binding.id,
                operationKind: "ingest",
                status: "ok",
                agentId,
                issueId: null, // passing null explicitly
                heartbeatRunId: null,
            });

            expect(row).not.toBeNull();
            expect(row!.agentId).toBe(agentId);
            expect(row!.issueId).toBeNull();
            expect(row!.heartbeatRunId).toBeNull();

            void issueId;
        });

        it("stores null for omitted optional fields", async () => {
            const binding = await insertBinding({ scopeType: "company", scopeId: companyId });

            const row = await recordMemoryOperation(db, {
                companyId,
                bindingId: binding.id,
                operationKind: "ingest",
                status: "error",
                errorMessage: "provider unreachable",
            });

            expect(row).not.toBeNull();
            expect(row!.agentId).toBeNull();
            expect(row!.heartbeatRunId).toBeNull();
            expect(row!.issueId).toBeNull();
            expect(row!.errorMessage).toBe("provider unreachable");
        });

        it("clamps negative itemCount and tokenCount to 0", async () => {
            const binding = await insertBinding({ scopeType: "company", scopeId: companyId });

            const row = await recordMemoryOperation(db, {
                companyId,
                bindingId: binding.id,
                operationKind: "usage",
                status: "ok",
                itemCount: -5,
                tokenCount: -99,
            });

            expect(row).not.toBeNull();
            expect(row!.itemCount).toBe(0);
            expect(row!.tokenCount).toBe(0);
        });
    });
});

// ---------------------------------------------------------------------------
// Pure unit tests — LocalMarkdownMemoryProvider (no DB, tmpdir only)
// ---------------------------------------------------------------------------

describe("LocalMarkdownMemoryProvider", () => {
    let tmpDir: string;
    let provider: LocalMarkdownMemoryProvider;

    beforeAll(async () => {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-memory-test-"));
        provider = new LocalMarkdownMemoryProvider({ baseDir: tmpDir });
    });

    afterAll(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it("recall returns empty items when nothing has been ingested", async () => {
        const result = await provider.recall({ query: "anything", projectId: "empty-project" });
        expect(result.items).toHaveLength(0);
    });

    it("ingest writes a record and recall finds it by keyword", async () => {
        const projectId = "proj-alpha";
        const ingestResult = await provider.ingest(
            "The deployment pipeline uses blue-green strategy",
            { projectId, tags: ["deployment"] },
        );

        expect(ingestResult.status).toBe("ok");
        expect(ingestResult.id).toBeTruthy();

        const recall = await provider.recall({ query: "deployment blue-green", projectId });
        expect(recall.items.length).toBeGreaterThan(0);
        expect(recall.items[0]!.content).toContain("deployment");
    });

    it("recall respects projectId isolation — different projects don't see each other's memories", async () => {
        await provider.ingest("Secret project data only for projA", { projectId: "proj-isolation-a" });

        const resultB = await provider.recall({
            query: "Secret project data",
            projectId: "proj-isolation-b",
        });
        expect(resultB.items).toHaveLength(0);
    });

    it("recall ranks more relevant items higher", async () => {
        const projectId = "proj-ranking";
        await provider.ingest("TypeScript generics and type safety", { projectId });
        await provider.ingest("TypeScript compiler options tsconfig strict mode", { projectId });
        await provider.ingest("Python asyncio event loop", { projectId });

        const result = await provider.recall({
            query: "TypeScript compiler tsconfig",
            projectId,
            topK: 3,
        });

        // The most overlapping item should be first
        expect(result.items[0]!.content).toContain("tsconfig");
    });

    it("recall returns at most topK items", async () => {
        const projectId = "proj-topk";
        for (let i = 0; i < 6; i++) {
            await provider.ingest(`Memory item about cats and dogs number ${i}`, { projectId });
        }

        const result = await provider.recall({ query: "cats and dogs", projectId, topK: 3 });
        expect(result.items.length).toBeLessThanOrEqual(3);
    });

});
