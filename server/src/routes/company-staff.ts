import { Router, type Request } from "express";
import type { Db } from "@paperclipai/db";
import {
    companyStaffBenchActivationSchema,
    companyStaffBenchCreateSchema,
    companyStaffBenchUpdateSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { accessService, agentService, companyStaffService, logActivity } from "../services/index.js";
import { forbidden } from "../errors.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function companyStaffRoutes(db: Db) {
    const router = Router();
    const agents = agentService(db);
    const access = accessService(db);
    const staff = companyStaffService(db);

    function canCreateAgents(agent: { permissions: Record<string, unknown> | null | undefined }) {
        if (!agent.permissions || typeof agent.permissions !== "object") return false;
        return Boolean((agent.permissions as Record<string, unknown>).canCreateAgents);
    }

    async function assertCanMutateCompanyStaff(req: Request, companyId: string) {
        assertCompanyAccess(req, companyId);

        if (req.actor.type === "board") {
            if (req.actor.source === "local_implicit" || req.actor.isInstanceAdmin) return;
            const allowed = await access.canUser(companyId, req.actor.userId, "agents:create");
            if (!allowed) {
                throw forbidden("Missing permission: agents:create");
            }
            return;
        }

        if (!req.actor.agentId) {
            throw forbidden("Agent authentication required");
        }

        const actorAgent = await agents.getById(req.actor.agentId);
        if (!actorAgent || actorAgent.companyId !== companyId) {
            throw forbidden("Agent key cannot access another company");
        }

        const allowedByGrant = await access.hasPermission(companyId, "agent", actorAgent.id, "agents:create");
        if (allowedByGrant || canCreateAgents(actorAgent)) {
            return;
        }

        throw forbidden("Missing permission: can create agents");
    }

    router.get("/companies/:companyId/staff-bench", async (req, res) => {
        const companyId = req.params.companyId as string;
        assertCompanyAccess(req, companyId);
        const result = await staff.listBench(companyId);
        res.json(result);
    });

    router.post(
        "/companies/:companyId/staff-bench",
        validate(companyStaffBenchCreateSchema),
        async (req, res) => {
            const companyId = req.params.companyId as string;
            await assertCanMutateCompanyStaff(req, companyId);
            const result = await staff.createBenchEntry(companyId, req.body);

            const actor = getActorInfo(req);
            await logActivity(db, {
                companyId,
                actorType: actor.actorType,
                actorId: actor.actorId,
                agentId: actor.agentId,
                runId: actor.runId,
                action: "company.staff_bench_created",
                entityType: "company_staff_bench_entry",
                entityId: result.id,
                details: {
                    name: result.name,
                    role: result.role,
                    status: result.status,
                },
            });

            res.status(201).json(result);
        },
    );

    router.patch(
        "/companies/:companyId/staff-bench/:entryId",
        validate(companyStaffBenchUpdateSchema),
        async (req, res) => {
            const companyId = req.params.companyId as string;
            const entryId = req.params.entryId as string;
            await assertCanMutateCompanyStaff(req, companyId);
            const result = await staff.updateBenchEntry(companyId, entryId, req.body);
            if (!result) {
                res.status(404).json({ error: "Bench entry not found" });
                return;
            }

            const actor = getActorInfo(req);
            await logActivity(db, {
                companyId,
                actorType: actor.actorType,
                actorId: actor.actorId,
                agentId: actor.agentId,
                runId: actor.runId,
                action: "company.staff_bench_updated",
                entityType: "company_staff_bench_entry",
                entityId: result.id,
                details: {
                    status: result.status,
                    name: result.name,
                },
            });

            res.json(result);
        },
    );

    router.post(
        "/companies/:companyId/staff-bench/:entryId/activate",
        validate(companyStaffBenchActivationSchema),
        async (req, res) => {
            const companyId = req.params.companyId as string;
            const entryId = req.params.entryId as string;
            await assertCanMutateCompanyStaff(req, companyId);
            const result = await staff.activateBenchEntry(companyId, entryId, req.body);

            const actor = getActorInfo(req);
            await logActivity(db, {
                companyId,
                actorType: actor.actorType,
                actorId: actor.actorId,
                agentId: actor.agentId,
                runId: actor.runId,
                action: "company.staff_bench_activated",
                entityType: "agent",
                entityId: result.agent.id,
                details: {
                    benchEntryId: result.benchEntry.id,
                    approvalId: result.approval?.id ?? null,
                },
            });

            res.status(201).json(result);
        },
    );

    return router;
}