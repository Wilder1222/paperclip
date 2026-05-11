import { describe, expect, it, vi, beforeEach } from "vitest";
import { knowledgeService, type KbActor } from "../services/knowledge.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeEntryRow(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date("2026-05-08T00:00:00.000Z");
  return {
    id: "entry-1",
    companyId: "company-1",
    documentId: "doc-1",
    collectionId: null,
    slug: "my-entry",
    title: "My Entry",
    summary: null,
    docType: "general",
    tags: [],
    status: "draft",
    sourceIssueId: null,
    sourceRunId: null,
    ownerUserId: null,
    ownerAgentId: null,
    createdByAgentId: null,
    createdByUserId: "user-1",
    reviewRequestedAt: null,
    reviewedByUserId: null,
    reviewedAt: null,
    lastReviewedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeDocRow(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date("2026-05-08T00:00:00.000Z");
  return {
    id: "doc-1",
    companyId: "company-1",
    format: "markdown",
    latestBody: "Hello world",
    latestRevisionId: "rev-1",
    latestRevisionNumber: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const boardActor: KbActor = { actorType: "user", userId: "user-1", agentId: null };
const agentActor: KbActor = { actorType: "agent", agentId: "agent-1", userId: null };

// ─── Collection CRUD ──────────────────────────────────────────────────────────

describe("knowledgeService.listCollections", () => {
  it("queries by companyId and returns mapped collections", async () => {
    const now = new Date();
    const collectionRow = { id: "col-1", companyId: "company-1", name: "Runbooks", slug: "runbooks", description: null, createdAt: now };

    const orderBy = vi.fn(async () => [collectionRow]);
    const where = vi.fn(() => ({ orderBy }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const db = { select } as any;

    const svc = knowledgeService(db);
    const result = await svc.listCollections("company-1");

    expect(select).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Runbooks");
    expect(result[0]!.slug).toBe("runbooks");
  });
});

// ─── Entry getById ────────────────────────────────────────────────────────────

describe("knowledgeService.getEntryById", () => {
  it("returns null when entry not found", async () => {
    const where = vi.fn(async () => []);
    const innerJoin = vi.fn(() => ({ where }));
    const from = vi.fn(() => ({ innerJoin }));
    const select = vi.fn(() => ({ from }));
    const db = { select } as any;

    const svc = knowledgeService(db);
    const result = await svc.getEntryById("nonexistent");
    expect(result).toBeNull();
  });

  it("returns mapped entry when found", async () => {
    const row = { kb_entries: makeEntryRow(), documents: makeDocRow() };

    const where = vi.fn(async () => [row]);
    const innerJoin = vi.fn(() => ({ where }));
    const from = vi.fn(() => ({ innerJoin }));
    const select = vi.fn(() => ({ from }));
    const db = { select } as any;

    const svc = knowledgeService(db);
    const result = await svc.getEntryById("entry-1");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("entry-1");
    expect(result!.title).toBe("My Entry");
    expect(result!.body).toBe("Hello world");
    expect(result!.format).toBe("markdown");
  });
});

// ─── assertTransition / lifecycle ────────────────────────────────────────────

describe("knowledgeService lifecycle – submitForReview", () => {
  function makeDbForTransition(entryOverrides: Partial<Record<string, unknown>> = {}) {
    const entryRow = makeEntryRow(entryOverrides);
    const docRow = makeDocRow();
    // For assertTransition: select().from(kbEntries).where(...)
    // For getEntryById after update: select().from(kbEntries).innerJoin(documents).where(...)
    let callCount = 0;
    const select = vi.fn(() => {
      callCount++;
      const thisCall = callCount;
      const from = vi.fn(() => {
        const innerJoin = vi.fn(() => {
          const where = vi.fn(async () => [{ kb_entries: entryRow, documents: docRow }]);
          return { where };
        });
        const where = vi.fn(async () => [entryRow]);
        return { where, innerJoin };
      });
      return { from };
    });
    const update = vi.fn(() => {
      const set = vi.fn(() => {
        const where = vi.fn(async () => []);
        return { where };
      });
      return { set };
    });
    return { db: { select, update } as any, update };
  }

  it("transitions draft entry to in_review for board actor", async () => {
    const { db, update } = makeDbForTransition({ status: "draft" });
    const svc = knowledgeService(db);
    const result = await svc.submitForReview("entry-1", {}, boardActor);
    expect(update).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("entry-1");
  });

  it("transitions draft entry to in_review for agent actor", async () => {
    const { db, update } = makeDbForTransition({ status: "draft" });
    const svc = knowledgeService(db);
    const result = await svc.submitForReview("entry-1", {}, agentActor);
    expect(update).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("entry-1");
  });

  it("throws conflict when entry is already in_review", async () => {
    const { db } = makeDbForTransition({ status: "in_review" });
    const svc = knowledgeService(db);
    await expect(svc.submitForReview("entry-1", {}, boardActor)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("throws notFound when entry does not exist", async () => {
    const select = vi.fn(() => {
      const from = vi.fn(() => {
        const where = vi.fn(async () => []);
        return { where };
      });
      return { from };
    });
    const db = { select } as any;
    const svc = knowledgeService(db);
    await expect(svc.submitForReview("missing", {}, boardActor)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("knowledgeService lifecycle – publishEntry", () => {
  function makeDbForPublish(status: string) {
    const entryRow = makeEntryRow({ status });
    const docRow = makeDocRow();
    const select = vi.fn(() => {
      const from = vi.fn(() => {
        const innerJoin = vi.fn(() => {
          const where = vi.fn(async () => [{ kb_entries: entryRow, documents: docRow }]);
          return { where };
        });
        const where = vi.fn(async () => [entryRow]);
        return { where, innerJoin };
      });
      return { from };
    });
    const update = vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    }));
    return { db: { select, update } as any, update };
  }

  it("board actor can publish in_review entry", async () => {
    const { db, update } = makeDbForPublish("in_review");
    const svc = knowledgeService(db);
    const result = await svc.publishEntry("entry-1", boardActor);
    expect(update).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("entry-1");
  });

  it("board actor can publish draft entry directly", async () => {
    const { db, update } = makeDbForPublish("draft");
    const svc = knowledgeService(db);
    const result = await svc.publishEntry("entry-1", boardActor);
    expect(update).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("entry-1");
  });

  it("agent actor cannot publish (boardOnly = true)", async () => {
    const { db } = makeDbForPublish("in_review");
    const svc = knowledgeService(db);
    await expect(svc.publishEntry("entry-1", agentActor)).rejects.toMatchObject({
      status: 403,
    });
  });

  it("throws conflict when entry is already archived", async () => {
    const { db } = makeDbForPublish("archived");
    const svc = knowledgeService(db);
    await expect(svc.publishEntry("entry-1", boardActor)).rejects.toMatchObject({
      status: 409,
    });
  });
});

describe("knowledgeService lifecycle – archiveEntry", () => {
  function makeDbForArchive(status: string) {
    const entryRow = makeEntryRow({ status });
    const docRow = makeDocRow();
    const select = vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(async () => [{ kb_entries: entryRow, documents: docRow }]),
        })),
        where: vi.fn(async () => [entryRow]),
      })),
    }));
    const update = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => []) })),
    }));
    return { db: { select, update } as any, update };
  }

  it("board actor can archive published entry", async () => {
    const { db, update } = makeDbForArchive("published");
    const svc = knowledgeService(db);
    const result = await svc.archiveEntry("entry-1", boardActor);
    expect(update).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("entry-1");
  });

  it("agent actor cannot archive (boardOnly = true)", async () => {
    const { db } = makeDbForArchive("published");
    const svc = knowledgeService(db);
    await expect(svc.archiveEntry("entry-1", agentActor)).rejects.toMatchObject({
      status: 403,
    });
  });
});

