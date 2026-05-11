import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { documents, documentRevisions, kbCollections, kbEntries } from "@paperclipai/db";
import type {
  KbCollection,
  KbEntry,
  KbEntrySummary,
  KbEntryStatus,
  KbEntryDocType,
  CreateKbEntry,
  UpdateKbEntry,
  SubmitKbReview,
  RejectKbEntry,
  CreateKbCollection,
  UpdateKbCollection,
} from "@paperclipai/shared";
import { conflict, forbidden, notFound } from "../errors.js";

export interface KbActor {
  actorType: "agent" | "user";
  agentId?: string | null;
  userId?: string | null;
}

export interface KbListEntriesOptions {
  status?: KbEntryStatus | KbEntryStatus[];
  collectionId?: string | null;
  docType?: KbEntryDocType;
  tag?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

function isUniqueViolation(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "23505";
}

function mapEntrySummary(row: typeof kbEntries.$inferSelect): KbEntrySummary {
  return {
    id: row.id,
    companyId: row.companyId,
    documentId: row.documentId,
    collectionId: row.collectionId ?? null,
    slug: row.slug,
    title: row.title,
    summary: row.summary ?? null,
    docType: (row.docType ?? "general") as KbEntryDocType,
    tags: row.tags ?? [],
    status: (row.status ?? "draft") as KbEntryStatus,
    sourceIssueId: row.sourceIssueId ?? null,
    sourceRunId: row.sourceRunId ?? null,
    ownerUserId: row.ownerUserId ?? null,
    ownerAgentId: row.ownerAgentId ?? null,
    createdByAgentId: row.createdByAgentId ?? null,
    createdByUserId: row.createdByUserId ?? null,
    reviewRequestedAt: row.reviewRequestedAt ?? null,
    reviewedByUserId: row.reviewedByUserId ?? null,
    reviewedAt: row.reviewedAt ?? null,
    lastReviewedAt: row.lastReviewedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapEntryWithDoc(
  entryRow: typeof kbEntries.$inferSelect,
  docRow: typeof documents.$inferSelect,
): KbEntry {
  return {
    ...mapEntrySummary(entryRow),
    body: docRow.latestBody,
    format: docRow.format,
    latestRevisionId: docRow.latestRevisionId ?? null,
    latestRevisionNumber: docRow.latestRevisionNumber,
  };
}

function mapCollection(row: typeof kbCollections.$inferSelect): KbCollection {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    createdAt: row.createdAt,
  };
}

async function generateUniqueSlug(db: Db, companyId: string, desiredSlug: string): Promise<string> {
  const base = desiredSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "entry";
  let slug = base;
  for (let attempt = 0; attempt < 20; attempt++) {
    const existing = await db
      .select({ id: kbEntries.id })
      .from(kbEntries)
      .where(and(eq(kbEntries.companyId, companyId), eq(kbEntries.slug, slug)))
      .then((rows) => rows[0] ?? null);
    if (!existing) return slug;
    slug = `${base}-${attempt + 2}`;
  }
  throw conflict("Could not generate unique slug after 20 attempts");
}

async function generateUniqueCollectionSlug(db: Db, companyId: string, desiredSlug: string): Promise<string> {
  const base = desiredSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "collection";
  let slug = base;
  for (let attempt = 0; attempt < 20; attempt++) {
    const existing = await db
      .select({ id: kbCollections.id })
      .from(kbCollections)
      .where(and(eq(kbCollections.companyId, companyId), eq(kbCollections.slug, slug)))
      .then((rows) => rows[0] ?? null);
    if (!existing) return slug;
    slug = `${base}-${attempt + 2}`;
  }
  throw conflict("Could not generate unique collection slug after 20 attempts");
}

export function knowledgeService(db: Db) {
  // ─── Collections ────────────────────────────────────────────────────────────

  async function listCollections(companyId: string): Promise<KbCollection[]> {
    const rows = await db
      .select()
      .from(kbCollections)
      .where(eq(kbCollections.companyId, companyId))
      .orderBy(kbCollections.name);
    return rows.map(mapCollection);
  }

  async function createCollection(companyId: string, input: CreateKbCollection): Promise<KbCollection> {
    const slug = await generateUniqueCollectionSlug(db, companyId, input.slug);
    try {
      const [row] = await db
        .insert(kbCollections)
        .values({ companyId, name: input.name, slug, description: input.description ?? null })
        .returning();
      return mapCollection(row!);
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict("A collection with this slug already exists");
      throw err;
    }
  }

  async function updateCollection(id: string, input: UpdateKbCollection): Promise<KbCollection> {
    const [row] = await db
      .update(kbCollections)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      })
      .where(eq(kbCollections.id, id))
      .returning();
    if (!row) throw notFound("Collection not found");
    return mapCollection(row);
  }

  async function deleteCollection(id: string): Promise<void> {
    await db.delete(kbCollections).where(eq(kbCollections.id, id));
  }

  // ─── Entries ─────────────────────────────────────────────────────────────────

  async function listEntries(
    companyId: string,
    opts: KbListEntriesOptions = {},
  ): Promise<{ entries: KbEntrySummary[]; total: number }> {
    const { status, collectionId, docType, tag, q, limit = 50, offset = 0 } = opts;

    const conditions = [eq(kbEntries.companyId, companyId)];

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(inArray(kbEntries.status, status));
      } else {
        conditions.push(eq(kbEntries.status, status));
      }
    }
    if (collectionId !== undefined) {
      conditions.push(eq(kbEntries.collectionId, collectionId!));
    }
    if (docType) {
      conditions.push(eq(kbEntries.docType, docType));
    }
    if (tag) {
      // Array contains check
      conditions.push(sql`${kbEntries.tags} @> ARRAY[${tag}]::text[]`);
    }
    if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          ilike(kbEntries.title, pattern),
          ilike(kbEntries.summary, pattern),
        )!,
      );
    }

    const where = and(...conditions);
    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(kbEntries)
        .where(where)
        .orderBy(desc(kbEntries.updatedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(kbEntries)
        .where(where)
        .then((r) => r[0]?.count ?? 0),
    ]);

    return { entries: rows.map(mapEntrySummary), total: countResult };
  }

  async function getEntryById(id: string): Promise<KbEntry | null> {
    const rows = await db
      .select()
      .from(kbEntries)
      .innerJoin(documents, eq(kbEntries.documentId, documents.id))
      .where(eq(kbEntries.id, id));
    if (!rows[0]) return null;
    return mapEntryWithDoc(rows[0].kb_entries, rows[0].documents);
  }

  async function getEntryBySlug(companyId: string, slug: string): Promise<KbEntry | null> {
    const rows = await db
      .select()
      .from(kbEntries)
      .innerJoin(documents, eq(kbEntries.documentId, documents.id))
      .where(and(eq(kbEntries.companyId, companyId), eq(kbEntries.slug, slug)));
    if (!rows[0]) return null;
    return mapEntryWithDoc(rows[0].kb_entries, rows[0].documents);
  }

  async function createEntry(companyId: string, input: CreateKbEntry, actor: KbActor): Promise<KbEntry> {
    let documentId: string;

    if (input.documentId) {
      // Verify doc belongs to this company
      const doc = await db
        .select({ id: documents.id, companyId: documents.companyId })
        .from(documents)
        .where(eq(documents.id, input.documentId))
        .then((r) => r[0] ?? null);
      if (!doc || doc.companyId !== companyId) {
        throw notFound("Document not found in this company");
      }
      documentId = input.documentId;
    } else {
      // Create new document from body
      const body = input.body!;
      const [docRow] = await db
        .insert(documents)
        .values({
          companyId,
          title: input.title,
          format: input.format ?? "markdown",
          latestBody: body,
          latestRevisionNumber: 1,
          createdByAgentId: actor.agentId ?? null,
          createdByUserId: actor.userId ?? null,
          updatedByAgentId: actor.agentId ?? null,
          updatedByUserId: actor.userId ?? null,
        })
        .returning();
      const docId = docRow!.id;

      // Create initial revision
      const [revRow] = await db
        .insert(documentRevisions)
        .values({
          companyId,
          documentId: docId,
          revisionNumber: 1,
          title: input.title,
          format: input.format ?? "markdown",
          body,
          createdByAgentId: actor.agentId ?? null,
          createdByUserId: actor.userId ?? null,
        })
        .returning();

      // Update document with revision reference
      await db
        .update(documents)
        .set({ latestRevisionId: revRow!.id })
        .where(eq(documents.id, docId));

      documentId = docId;
    }

    const slug = await generateUniqueSlug(db, companyId, input.slug);

    try {
      const [entryRow] = await db
        .insert(kbEntries)
        .values({
          companyId,
          documentId,
          collectionId: input.collectionId ?? null,
          slug,
          title: input.title,
          summary: input.summary ?? null,
          docType: input.docType ?? "general",
          tags: input.tags ?? [],
          status: "draft",
          sourceIssueId: input.sourceIssueId ?? null,
          sourceRunId: input.sourceRunId ?? null,
          createdByAgentId: actor.agentId ?? null,
          createdByUserId: actor.userId ?? null,
        })
        .returning();

      const entry = await getEntryById(entryRow!.id);
      return entry!;
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict("A knowledge entry with this slug already exists");
      throw err;
    }
  }

  async function updateEntry(id: string, input: UpdateKbEntry, actor: KbActor): Promise<KbEntry> {
    const existing = await getEntryById(id);
    if (!existing) throw notFound("Knowledge entry not found");

    if (input.body !== undefined && input.body !== null) {
      // Create a new document revision
      const newRevisionNumber = existing.latestRevisionNumber + 1;
      const [revRow] = await db
        .insert(documentRevisions)
        .values({
          companyId: existing.companyId,
          documentId: existing.documentId,
          revisionNumber: newRevisionNumber,
          title: input.title ?? existing.title,
          format: existing.format,
          body: input.body,
          changeSummary: input.changeSummary ?? null,
          createdByAgentId: actor.agentId ?? null,
          createdByUserId: actor.userId ?? null,
        })
        .returning();

      await db
        .update(documents)
        .set({
          latestBody: input.body,
          latestRevisionId: revRow!.id,
          latestRevisionNumber: newRevisionNumber,
          title: input.title ?? existing.title,
          updatedByAgentId: actor.agentId ?? null,
          updatedByUserId: actor.userId ?? null,
        })
        .where(eq(documents.id, existing.documentId));
    }

    const [entryRow] = await db
      .update(kbEntries)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.summary !== undefined ? { summary: input.summary } : {}),
        ...(input.docType !== undefined ? { docType: input.docType } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(input.collectionId !== undefined ? { collectionId: input.collectionId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(kbEntries.id, id))
      .returning();

    if (!entryRow) throw notFound("Knowledge entry not found");
    return (await getEntryById(id))!;
  }

  async function deleteEntry(id: string): Promise<void> {
    await db.delete(kbEntries).where(eq(kbEntries.id, id));
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  async function assertTransition(
    id: string,
    allowedFromStatuses: KbEntryStatus[],
    actorType: "agent" | "user",
    boardOnly = false,
  ): Promise<typeof kbEntries.$inferSelect> {
    const rows = await db.select().from(kbEntries).where(eq(kbEntries.id, id));
    const entry = rows[0];
    if (!entry) throw notFound("Knowledge entry not found");
    if (!allowedFromStatuses.includes(entry.status as KbEntryStatus)) {
      throw conflict(`Cannot transition from status '${entry.status}'. Expected: ${allowedFromStatuses.join(", ")}`);
    }
    if (boardOnly && actorType !== "user") {
      throw forbidden("Only board users can perform this action");
    }
    return entry;
  }

  async function submitForReview(id: string, input: SubmitKbReview, actor: KbActor): Promise<KbEntry> {
    await assertTransition(id, ["draft"], actor.actorType);
    await db
      .update(kbEntries)
      .set({ status: "in_review", reviewRequestedAt: new Date(), updatedAt: new Date() })
      .where(eq(kbEntries.id, id));
    return (await getEntryById(id))!;
  }

  async function publishEntry(id: string, actor: KbActor): Promise<KbEntry> {
    await assertTransition(id, ["in_review", "draft"], actor.actorType, true);
    await db
      .update(kbEntries)
      .set({
        status: "published",
        reviewedByUserId: actor.userId ?? null,
        reviewedAt: new Date(),
        lastReviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(kbEntries.id, id));
    return (await getEntryById(id))!;
  }

  async function rejectEntry(id: string, input: RejectKbEntry, actor: KbActor): Promise<KbEntry> {
    await assertTransition(id, ["in_review"], actor.actorType, true);
    await db
      .update(kbEntries)
      .set({ status: "draft", updatedAt: new Date() })
      .where(eq(kbEntries.id, id));
    return (await getEntryById(id))!;
  }

  async function archiveEntry(id: string, actor: KbActor): Promise<KbEntry> {
    await assertTransition(id, ["published", "draft", "in_review"], actor.actorType, true);
    await db
      .update(kbEntries)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(kbEntries.id, id));
    return (await getEntryById(id))!;
  }

  async function deprecateEntry(id: string, actor: KbActor): Promise<KbEntry> {
    await assertTransition(id, ["published"], actor.actorType, true);
    await db
      .update(kbEntries)
      .set({ status: "deprecated", updatedAt: new Date() })
      .where(eq(kbEntries.id, id));
    return (await getEntryById(id))!;
  }

  // ─── Inbox ───────────────────────────────────────────────────────────────────

  async function listInbox(companyId: string): Promise<KbEntrySummary[]> {
    const rows = await db
      .select()
      .from(kbEntries)
      .where(and(eq(kbEntries.companyId, companyId), eq(kbEntries.status, "in_review")))
      .orderBy(kbEntries.reviewRequestedAt);
    return rows.map(mapEntrySummary);
  }

  return {
    listCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    listEntries,
    getEntryById,
    getEntryBySlug,
    createEntry,
    updateEntry,
    deleteEntry,
    submitForReview,
    publishEntry,
    rejectEntry,
    archiveEntry,
    deprecateEntry,
    listInbox,
  };
}
