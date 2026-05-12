import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { companies, createDb } from "@paperclipai/db";
import {
    getEmbeddedPostgresTestSupport,
    startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { companyStaffService } from "../services/company-staff.ts";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
    console.warn(
        `Skipping embedded Postgres company staff service tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
    );
}

describeEmbeddedPostgres("companyStaffService", () => {
    let db!: ReturnType<typeof createDb>;
    let svc!: ReturnType<typeof companyStaffService>;
    let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

    beforeAll(async () => {
        tempDb = await startEmbeddedPostgresTestDatabase("paperclip-company-staff-service-");
        db = createDb(tempDb.connectionString);
        svc = companyStaffService(db);
    }, 20_000);

    it("creates reserve bench entries and lists them as non-dispatchable staff", async () => {
        const companyId = randomUUID();

        await db.insert(companies).values({
            id: companyId,
            name: "Paperclip",
            issuePrefix: `S${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
            requireBoardApprovalForNewAgents: false,
        });

        const created = await svc.createBenchEntry(companyId, {
            name: "Reserve Researcher",
            role: "general",
            title: "Research Bench",
            adapterType: "codex_local",
            desiredSkills: ["research"],
        });

        const listed = await svc.listBench(companyId);

        expect(created).toMatchObject({
            companyId,
            status: "reserve",
            name: "Reserve Researcher",
            role: "general",
            desiredSkills: ["research"],
            activatedAgentId: null,
        });
        expect(listed).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: created.id,
                    companyId,
                    status: "reserve",
                    name: "Reserve Researcher",
                }),
            ]),
        );
    });

    it("activates reserve bench entries into real agents and marks the bench record as activated", async () => {
        const companyId = randomUUID();

        await db.insert(companies).values({
            id: companyId,
            name: "Paperclip Activation",
            issuePrefix: `A${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
            requireBoardApprovalForNewAgents: false,
        });

        const benchEntry = await svc.createBenchEntry(companyId, {
            name: "Reserve Builder",
            role: "general",
            title: "Bench Builder",
            adapterType: "codex_local",
        });

        const activation = await svc.activateBenchEntry(companyId, benchEntry.id, {});

        expect(activation.approval).toBeNull();
        expect(activation.agent).toMatchObject({
            companyId,
            name: "Reserve Builder",
            status: "idle",
        });
        expect(activation.benchEntry).toMatchObject({
            id: benchEntry.id,
            status: "activated",
            activatedAgentId: activation.agent.id,
        });

        const listed = await svc.listBench(companyId);
        expect(listed).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: benchEntry.id,
                    status: "activated",
                    activatedAgentId: activation.agent.id,
                }),
            ]),
        );
    });
});