import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { kbCollections } from "@paperclipai/db";
import { eq } from "drizzle-orm";
import {
  createKbEntrySchema,
  updateKbEntrySchema,
  submitKbReviewSchema,
  rejectKbEntrySchema,
  createKbCollectionSchema,
  updateKbCollectionSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { knowledgeService, logActivity } from "../services/index.js";
import { assertCompanyAccess, assertBoard, getActorInfo } from "./authz.js";

export function knowledgeRoutes(db: Db) {
  const router = Router();
  const svc = knowledgeService(db);

  // ─── Collections ────────────────────────────────────────────────────────────

  router.get("/companies/:companyId/knowledge/collections", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const collections = await svc.listCollections(companyId);
    res.json(collections);
  });

  router.post(
    "/companies/:companyId/knowledge/collections",
    validate(createKbCollectionSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      assertBoard(req);
      const collection = await svc.createCollection(companyId, req.body);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "knowledge.collection_created",
        entityType: "kb_collection",
        entityId: collection.id,
        details: { name: collection.name, slug: collection.slug },
      });
      res.status(201).json(collection);
    },
  );

  router.patch("/knowledge/collections/:id", validate(updateKbCollectionSchema), async (req, res) => {
    const id = req.params.id as string;
    const collectionRows = await db.select().from(kbCollections).where(eq(kbCollections.id, id));
    const collection = collectionRows[0];
    if (!collection) {
      res.status(404).json({ error: "Collection not found" });
      return;
    }
    assertCompanyAccess(req, collection.companyId);
    assertBoard(req);
    const updated = await svc.updateCollection(id, req.body);
    res.json(updated);
  });

  router.delete("/knowledge/collections/:id", async (req, res) => {
    const id = req.params.id as string;
    const collectionRows = await db.select().from(kbCollections).where(eq(kbCollections.id, id));
    const collection = collectionRows[0];
    if (!collection) {
      res.status(404).json({ error: "Collection not found" });
      return;
    }
    assertCompanyAccess(req, collection.companyId);
    assertBoard(req);
    await svc.deleteCollection(id);
    res.status(204).send();
  });

  // ─── Entries — list / create / search ───────────────────────────────────────

  router.get("/companies/:companyId/knowledge/entries/search", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const q = typeof req.query["q"] === "string" ? req.query["q"] : undefined;
    const { entries } = await svc.listEntries(companyId, { q });
    res.json(entries);
  });

  router.get("/companies/:companyId/knowledge/entries", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const { status, collectionId, docType, tag, q, limit, offset } = req.query as Record<string, string | undefined>;
    const result = await svc.listEntries(companyId, {
      status: status as any,
      collectionId: collectionId ?? undefined,
      docType: docType as any,
      tag: tag ?? undefined,
      q: q ?? undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    res.json(result);
  });

  router.post(
    "/companies/:companyId/knowledge/entries",
    validate(createKbEntrySchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const actor = getActorInfo(req);
      const kbActor = {
        actorType: actor.actorType as "agent" | "user",
        agentId: actor.agentId ?? null,
        userId: actor.actorType === "user" ? actor.actorId : null,
      };
      const entry = await svc.createEntry(companyId, req.body, kbActor);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "knowledge.entry_created",
        entityType: "kb_entry",
        entityId: entry.id,
        details: { title: entry.title, slug: entry.slug, docType: entry.docType },
      });
      res.status(201).json(entry);
    },
  );

  // ─── Inbox ───────────────────────────────────────────────────────────────────

  router.get("/companies/:companyId/knowledge/inbox", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    assertBoard(req);
    const entries = await svc.listInbox(companyId);
    res.json(entries);
  });

  // ─── Entry — get / patch / delete ───────────────────────────────────────────

  router.get("/knowledge/entries/:id", async (req, res) => {
    const id = req.params.id as string;
    const entry = await svc.getEntryById(id);
    if (!entry) {
      res.status(404).json({ error: "Knowledge entry not found" });
      return;
    }
    assertCompanyAccess(req, entry.companyId);
    res.json(entry);
  });

  router.patch("/knowledge/entries/:id", validate(updateKbEntrySchema), async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getEntryById(id);
    if (!existing) {
      res.status(404).json({ error: "Knowledge entry not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const actor = getActorInfo(req);
    const kbActor = {
      actorType: actor.actorType as "agent" | "user",
      agentId: actor.agentId ?? null,
      userId: actor.actorType === "user" ? actor.actorId : null,
    };
    const entry = await svc.updateEntry(id, req.body, kbActor);
    await logActivity(db, {
      companyId: entry.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "knowledge.entry_updated",
      entityType: "kb_entry",
      entityId: entry.id,
      details: { title: entry.title },
    });
    res.json(entry);
  });

  router.delete("/knowledge/entries/:id", async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getEntryById(id);
    if (!existing) {
      res.status(404).json({ error: "Knowledge entry not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    assertBoard(req);
    await svc.deleteEntry(id);
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: existing.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "knowledge.entry_archived",
      entityType: "kb_entry",
      entityId: id,
      details: { title: existing.title },
    });
    res.status(204).send();
  });

  // ─── Lifecycle transitions ───────────────────────────────────────────────────

  router.post("/knowledge/entries/:id/submit-review", validate(submitKbReviewSchema), async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getEntryById(id);
    if (!existing) {
      res.status(404).json({ error: "Knowledge entry not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const actor = getActorInfo(req);
    const kbActor = {
      actorType: actor.actorType as "agent" | "user",
      agentId: actor.agentId ?? null,
      userId: actor.actorType === "user" ? actor.actorId : null,
    };
    const entry = await svc.submitForReview(id, req.body, kbActor);
    await logActivity(db, {
      companyId: entry.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "knowledge.review_submitted",
      entityType: "kb_entry",
      entityId: entry.id,
      details: { title: entry.title },
    });
    res.json(entry);
  });

  router.post("/knowledge/entries/:id/publish", async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getEntryById(id);
    if (!existing) {
      res.status(404).json({ error: "Knowledge entry not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    assertBoard(req);
    const actor = getActorInfo(req);
    const kbActor = {
      actorType: "user" as const,
      agentId: null,
      userId: actor.actorId,
    };
    const entry = await svc.publishEntry(id, kbActor);
    await logActivity(db, {
      companyId: entry.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "knowledge.entry_published",
      entityType: "kb_entry",
      entityId: entry.id,
      details: { title: entry.title },
    });
    res.json(entry);
  });

  router.post("/knowledge/entries/:id/reject", validate(rejectKbEntrySchema), async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getEntryById(id);
    if (!existing) {
      res.status(404).json({ error: "Knowledge entry not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    assertBoard(req);
    const actor = getActorInfo(req);
    const kbActor = {
      actorType: "user" as const,
      agentId: null,
      userId: actor.actorId,
    };
    const entry = await svc.rejectEntry(id, req.body, kbActor);
    await logActivity(db, {
      companyId: entry.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "knowledge.review_rejected",
      entityType: "kb_entry",
      entityId: entry.id,
      details: { title: entry.title, reason: req.body?.reason },
    });
    res.json(entry);
  });

  router.post("/knowledge/entries/:id/archive", async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getEntryById(id);
    if (!existing) {
      res.status(404).json({ error: "Knowledge entry not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    assertBoard(req);
    const actor = getActorInfo(req);
    const kbActor = {
      actorType: "user" as const,
      agentId: null,
      userId: actor.actorId,
    };
    const entry = await svc.archiveEntry(id, kbActor);
    await logActivity(db, {
      companyId: entry.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "knowledge.entry_archived",
      entityType: "kb_entry",
      entityId: entry.id,
      details: { title: entry.title },
    });
    res.json(entry);
  });

  router.post("/knowledge/entries/:id/deprecate", async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getEntryById(id);
    if (!existing) {
      res.status(404).json({ error: "Knowledge entry not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    assertBoard(req);
    const actor = getActorInfo(req);
    const kbActor = {
      actorType: "user" as const,
      agentId: null,
      userId: actor.actorId,
    };
    const entry = await svc.deprecateEntry(id, kbActor);
    await logActivity(db, {
      companyId: entry.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "knowledge.entry_deprecated",
      entityType: "kb_entry",
      entityId: entry.id,
      details: { title: entry.title },
    });
    res.json(entry);
  });

  return router;
}

