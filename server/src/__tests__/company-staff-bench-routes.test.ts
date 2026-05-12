import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAgentService = vi.hoisted(() => ({
    getById: vi.fn(),
}));

const mockAccessService = vi.hoisted(() => ({
    canUser: vi.fn(),
    hasPermission: vi.fn(),
}));

const mockCompanyStaffService = vi.hoisted(() => ({
    listBench: vi.fn(),
    createBenchEntry: vi.fn(),
    activateBenchEntry: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());

function registerModuleMocks() {
    vi.doMock("../routes/authz.js", async () => vi.importActual("../routes/authz.js"));

    vi.doMock("../services/access.js", () => ({
        accessService: () => mockAccessService,
    }));

    vi.doMock("../services/activity-log.js", () => ({
        logActivity: mockLogActivity,
    }));

    vi.doMock("../services/agents.js", () => ({
        agentService: () => mockAgentService,
    }));

    vi.doMock("../services/company-staff.js", () => ({
        companyStaffService: () => mockCompanyStaffService,
    }));

    vi.doMock("../services/index.js", () => ({
        accessService: () => mockAccessService,
        agentService: () => mockAgentService,
        companyStaffService: () => mockCompanyStaffService,
        logActivity: mockLogActivity,
    }));
}

async function createApp(actor: Record<string, unknown>) {
    const [{ companyStaffRoutes }, { errorHandler }] = await Promise.all([
        vi.importActual<typeof import("../routes/company-staff.js")>("../routes/company-staff.js"),
        vi.importActual<typeof import("../middleware/index.js")>("../middleware/index.js"),
    ]);
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
        (req as any).actor = actor;
        next();
    });
    app.use("/api", companyStaffRoutes({} as any));
    app.use(errorHandler);
    return app;
}

describe("company staff bench routes", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.doUnmock("../services/access.js");
        vi.doUnmock("../services/activity-log.js");
        vi.doUnmock("../services/agents.js");
        vi.doUnmock("../services/company-staff.js");
        vi.doUnmock("../services/index.js");
        vi.doUnmock("../routes/company-staff.js");
        vi.doUnmock("../routes/authz.js");
        vi.doUnmock("../middleware/index.js");
        registerModuleMocks();
        vi.clearAllMocks();
        mockAccessService.canUser.mockResolvedValue(true);
        mockAccessService.hasPermission.mockResolvedValue(false);
        mockLogActivity.mockResolvedValue(undefined);
        mockCompanyStaffService.listBench.mockResolvedValue([
            {
                id: "bench-1",
                companyId: "company-1",
                sourceId: null,
                status: "reserve",
                name: "Researcher",
                role: "general",
                title: "Reserve Researcher",
                icon: null,
                reportsToAgentId: null,
                desiredSkills: [],
                adapterType: "codex_local",
                adapterConfig: {},
                runtimeConfig: {},
                defaultEnvironmentId: null,
                budgetMonthlyCents: 0,
                permissions: { canCreateAgents: false },
                notes: null,
                metadata: null,
                source: null,
                activatedAgentId: null,
                activatedAt: null,
                archivedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);
        mockCompanyStaffService.createBenchEntry.mockResolvedValue({
            id: "bench-1",
            companyId: "company-1",
            sourceId: null,
            status: "reserve",
            name: "Researcher",
            role: "general",
            title: "Reserve Researcher",
            icon: null,
            reportsToAgentId: null,
            desiredSkills: [],
            adapterType: "codex_local",
            adapterConfig: {},
            runtimeConfig: {},
            defaultEnvironmentId: null,
            budgetMonthlyCents: 0,
            permissions: { canCreateAgents: false },
            notes: null,
            metadata: null,
            source: null,
            activatedAgentId: null,
            activatedAt: null,
            archivedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        mockCompanyStaffService.activateBenchEntry.mockResolvedValue({
            benchEntry: {
                id: "bench-1",
                companyId: "company-1",
                sourceId: null,
                status: "activated",
                name: "Researcher",
                role: "general",
                title: "Reserve Researcher",
                icon: null,
                reportsToAgentId: null,
                desiredSkills: [],
                adapterType: "codex_local",
                adapterConfig: {},
                runtimeConfig: {},
                defaultEnvironmentId: null,
                budgetMonthlyCents: 0,
                permissions: { canCreateAgents: false },
                notes: null,
                metadata: null,
                source: null,
                activatedAgentId: "agent-1",
                activatedAt: new Date(),
                archivedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            agent: {
                id: "agent-1",
                companyId: "company-1",
                name: "Researcher",
                role: "general",
                title: "Reserve Researcher",
                icon: null,
                status: "idle",
                reportsTo: null,
                capabilities: null,
                adapterType: "codex_local",
                adapterConfig: {},
                runtimeConfig: {},
                defaultEnvironmentId: null,
                budgetMonthlyCents: 0,
                spentMonthlyCents: 0,
                pauseReason: null,
                pausedAt: null,
                permissions: { canCreateAgents: false },
                lastHeartbeatAt: null,
                metadata: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                urlKey: "researcher",
            },
            approval: null,
        });
    });

    it("lists company reserve bench entries for board users with company access", async () => {
        const res = await request(await createApp({
            type: "board",
            userId: "local-board",
            companyIds: ["company-1"],
            source: "local_implicit",
            isInstanceAdmin: false,
        }))
            .get("/api/companies/company-1/staff-bench");

        expect(res.status, JSON.stringify(res.body)).toBe(200);
        expect(mockCompanyStaffService.listBench).toHaveBeenCalledWith("company-1");
        expect(res.body).toHaveLength(1);
    });

    it("allows local board operators to add reserve staff bench entries", async () => {
        const res = await request(await createApp({
            type: "board",
            userId: "local-board",
            companyIds: ["company-1"],
            source: "local_implicit",
            isInstanceAdmin: false,
        }))
            .post("/api/companies/company-1/staff-bench")
            .send({
                name: "Researcher",
                role: "general",
                title: "Reserve Researcher",
                adapterType: "codex_local",
            });

        expect(res.status, JSON.stringify(res.body)).toBe(201);
        expect(mockCompanyStaffService.createBenchEntry).toHaveBeenCalledWith(
            "company-1",
            expect.objectContaining({
                name: "Researcher",
                role: "general",
                adapterType: "codex_local",
            }),
        );
    });

    it("blocks same-company agents without management permission from activating reserve staff", async () => {
        mockAgentService.getById.mockResolvedValue({
            id: "agent-1",
            companyId: "company-1",
            permissions: {},
        });

        const res = await request(await createApp({
            type: "agent",
            agentId: "agent-1",
            companyId: "company-1",
            runId: "run-1",
        }))
            .post("/api/companies/company-1/staff-bench/bench-1/activate")
            .send({});

        expect(res.status, JSON.stringify(res.body)).toBe(403);
        expect(mockCompanyStaffService.activateBenchEntry).not.toHaveBeenCalled();
    });

    it("activates a reserve bench entry into a real agent and records activity", async () => {
        const res = await request(await createApp({
            type: "board",
            userId: "local-board",
            companyIds: ["company-1"],
            source: "local_implicit",
            isInstanceAdmin: false,
        }))
            .post("/api/companies/company-1/staff-bench/bench-1/activate")
            .send({});

        expect(res.status, JSON.stringify(res.body)).toBe(201);
        expect(mockCompanyStaffService.activateBenchEntry).toHaveBeenCalledWith(
            "company-1",
            "bench-1",
            expect.objectContaining({}),
        );
        expect(mockLogActivity).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                companyId: "company-1",
                action: "company.staff_bench_activated",
                entityType: "agent",
                entityId: "agent-1",
            }),
        );
    });
});