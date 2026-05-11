import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
    createMemoryBindingSchema,
    updateMemoryBindingSchema,
} from "@paperclipai/shared";
import { notFound } from "../errors.js";
import { validate } from "../middleware/validate.js";
import {
    createMemoryBinding,
    disableMemoryBinding,
    listMemoryBindings,
    updateMemoryBinding,
} from "../services/memory-provider.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";

export function memoryBindingRoutes(db: Db) {
    const router = Router();

    router.get("/companies/:companyId/memory-bindings", async (req, res) => {
        const companyId = req.params.companyId as string;
        assertCompanyAccess(req, companyId);
        assertBoard(req);
        const bindings = await listMemoryBindings(db, companyId);
        res.json(bindings);
    });

    router.post(
        "/companies/:companyId/memory-bindings",
        validate(createMemoryBindingSchema),
        async (req, res) => {
            const companyId = req.params.companyId as string;
            assertCompanyAccess(req, companyId);
            assertBoard(req);

            const scopeType = req.body.scopeType;
            const resolvedScopeId = scopeType === "company"
                ? companyId
                : req.body.scopeId;
            const created = await createMemoryBinding(db, {
                companyId,
                scopeType,
                scopeId: resolvedScopeId,
                agentId: req.body.agentId,
                providerType: req.body.providerType,
                providerConfig: req.body.providerConfig,
                label: req.body.label,
                isActive: req.body.isActive,
                createdByUserId: req.actor.userId ?? null,
            });

            res.status(201).json(created);
        },
    );

    router.patch(
        "/companies/:companyId/memory-bindings/:bindingId",
        validate(updateMemoryBindingSchema),
        async (req, res) => {
            const companyId = req.params.companyId as string;
            const bindingId = req.params.bindingId as string;
            assertCompanyAccess(req, companyId);
            assertBoard(req);

            const updated = await updateMemoryBinding(db, {
                companyId,
                bindingId,
                patch: {
                    providerConfig: req.body.providerConfig,
                    label: req.body.label,
                    isActive: req.body.isActive,
                    updatedByUserId: req.actor.userId ?? null,
                },
            });
            if (!updated) {
                throw notFound("Memory binding not found");
            }
            res.json(updated);
        },
    );

    router.delete("/companies/:companyId/memory-bindings/:bindingId", async (req, res) => {
        const companyId = req.params.companyId as string;
        const bindingId = req.params.bindingId as string;
        assertCompanyAccess(req, companyId);
        assertBoard(req);

        const disabled = await disableMemoryBinding(db, {
            companyId,
            bindingId,
            updatedByUserId: req.actor.userId ?? null,
        });
        if (!disabled) {
            throw notFound("Memory binding not found");
        }

        res.status(204).send();
    });

    return router;
}
