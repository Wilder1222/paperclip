/**
 * Integration test: heartbeat markdown auto-sync pipeline
 *
 * Verifies the complete persistence path for the two-target auto-sync:
 *   (1) Agent markdown output → issue document (documentService.upsertIssueDocument)
 *   (2) Same output          → knowledge library (knowledgeService.createEntry)
 *
 * Uses real embedded Postgres, same pattern as documents-service.test.ts.
 */

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  agents,
  companies,
  createDb,
  documentRevisions,
  documents,
  heartbeatRuns,
  issueDocuments,
  issues,
  kbCollections,
  kbEntries,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { documentService } from "../services/documents.js";
import { knowledgeService } from "../services/knowledge.js";
import {
  buildIssueDocumentKeyFromFilePath,
  extractMarkdownToolCallDraft,
} from "../services/heartbeat.js";

// ─── Guard ───────────────────────────────────────────────────────────────────

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping heartbeat markdown auto-sync integration tests: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Simulates the logic inside syncRunMarkdownOutputsToDocumentsAndLibrary.
 * Called with real service instances backed by embedded postgres.
 */
async function runSyncPipeline(opts: {
  docSvc: ReturnType<typeof documentService>;
  kbSvc: ReturnType<typeof knowledgeService>;
  companyId: string;
  issueId: string;
  issueIdentifier: string;
  agentId: string;
  runId: string;
  drafts: Array<{ filePath: string; body: string }>;
}) {
  const { docSvc, kbSvc, companyId, issueId, issueIdentifier, agentId, runId, drafts } = opts;
  const actor = { actorType: "agent" as const, agentId, userId: null };
  const usedKeys = new Set<string>();
  const syncedKeys: string[] = [];

  for (const draft of drafts) {
    const key = buildIssueDocumentKeyFromFilePath(draft.filePath, usedKeys);

    const existing = await docSvc.getIssueDocumentByKey(issueId, key);

    const upserted = await docSvc.upsertIssueDocument({
      issueId,
      key,
      title: key,
      format: "markdown",
      body: draft.body,
      changeSummary: `Auto-synced from agent markdown output: ${draft.filePath}`,
      baseRevisionId: existing?.latestRevisionId ?? null,
      createdByAgentId: agentId,
      createdByRunId: runId,
    });
    syncedKeys.push(key);

    const entrySlug = `${issueIdentifier}-${key}`
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || key;
    const entryTitle = `${issueIdentifier} / ${key}`.slice(0, 240);
    const summaryLine = draft.body
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "";
    const summary = summaryLine.length > 0 ? summaryLine.slice(0, 1000) : null;

    const existingEntry = await kbSvc.getEntryBySlug(companyId, entrySlug);
    if (existingEntry) {
      // Document body was already updated by upsertIssueDocument.
      // Only update kb entry metadata to avoid a redundant revision.
      await kbSvc.updateEntry(existingEntry.id, {
        title: entryTitle,
        summary,
        changeSummary: `Auto-sync from run ${runId}`,
      }, actor);
    } else {
      await kbSvc.createEntry(companyId, {
        slug: entrySlug,
        title: entryTitle,
        summary,
        docType: "general",
        tags: ["agent-output", "auto-synced"],
        sourceIssueId: issueId,
        documentId: upserted.document.id,
        format: "markdown",
      }, actor);
    }
  }

  return syncedKeys;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describeEmbeddedPostgres("heartbeat markdown auto-sync: full pipeline (embedded postgres)", () => {
  let db!: ReturnType<typeof createDb>;
  let docSvc!: ReturnType<typeof documentService>;
  let kbSvc!: ReturnType<typeof knowledgeService>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  // Fixed IDs reused across tests (reset on afterEach)
  let companyId: string;
  let issueId: string;
  let agentId: string;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-heartbeat-autosync-");
    db = createDb(tempDb.connectionString);
    docSvc = documentService(db);
    kbSvc = knowledgeService(db);
  }, 30_000);

  afterEach(async () => {
    // Teardown in FK-safe order
    await db.delete(kbEntries);
    await db.delete(kbCollections);
    await db.delete(documentRevisions);
    await db.delete(issueDocuments);
    await db.delete(documents);
    await db.delete(heartbeatRuns);
    await db.delete(issues);
    await db.delete(agents);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function seedBaseData() {
    companyId = randomUUID();
    issueId = randomUUID();
    agentId = randomUUID();

    await db.insert(companies).values({
      id: companyId,
      name: "E2E Test Co",
      issuePrefix: "E2E",
      requireBoardApprovalForNewAgents: false,
    });

    await db.insert(issues).values({
      id: issueId,
      companyId,
      identifier: "E2E-1",
      title: "Test issue",
      description: "desc",
      status: "in_progress",
      priority: "medium",
    });

    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "TestAgent",
      adapterType: "codex_local",
      status: "idle",
    });
  }

  async function seedRun(runId: string) {
    await db.insert(heartbeatRuns).values({
      id: runId,
      companyId,
      agentId,
      status: "succeeded",
    });
  }

  // ── Test 1: single markdown file creates issue doc + kb entry ──────────────

  it("creates an issue document AND a kb entry from a single markdown draft", async () => {
    await seedBaseData();

    const runId = randomUUID();
    await seedRun(runId);
    const drafts = [
      {
        filePath: "docs/architecture.md",
        body: "# Architecture\n\nThis is the architecture document.",
      },
    ];

    await runSyncPipeline({
      docSvc, kbSvc, companyId,
      issueId, issueIdentifier: "E2E-1",
      agentId, runId, drafts,
    });

    // ── Assert: issue document exists ──────────────────────────────────────
    const issueDocs = await docSvc.listIssueDocuments(issueId);
    expect(issueDocs).toHaveLength(1);
    expect(issueDocs[0]!.key).toBe("docs-architecture");
    expect(issueDocs[0]!.body).toContain("Architecture");

    // ── Assert: knowledge entry exists ────────────────────────────────────
    const { entries } = await kbSvc.listEntries(companyId, { status: "draft" });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.title).toBe("E2E-1 / docs-architecture");
    expect(entries[0]!.sourceIssueId).toBe(issueId);
    expect(entries[0]!.tags).toContain("agent-output");
    expect(entries[0]!.tags).toContain("auto-synced");
  });

  // ── Test 2: multiple files create multiple entries ─────────────────────────

  it("creates one issue doc + one kb entry per unique file path", async () => {
    await seedBaseData();

    const runId = randomUUID();
    await seedRun(runId);
    const drafts = [
      { filePath: "docs/plan.md", body: "# Plan\n\nThe plan." },
      { filePath: "docs/report.md", body: "# Report\n\nThe report." },
    ];

    await runSyncPipeline({
      docSvc, kbSvc, companyId,
      issueId, issueIdentifier: "E2E-1",
      agentId, runId, drafts,
    });

    const issueDocs = await docSvc.listIssueDocuments(issueId);
    expect(issueDocs).toHaveLength(2);
    const keys = issueDocs.map((d) => d.key).sort();
    expect(keys).toEqual(["docs-plan", "docs-report"]);

    const { entries } = await kbSvc.listEntries(companyId, { status: "draft" });
    expect(entries).toHaveLength(2);
    const slugs = entries.map((e) => e.slug).sort();
    expect(slugs).toEqual(["e2e-1-docs-plan", "e2e-1-docs-report"]);
  });

  // ── Test 3: re-running updates existing issue doc and kb entry ─────────────

  it("updates the existing issue document and kb entry on a second run", async () => {
    await seedBaseData();

    const draft = { filePath: "docs/summary.md", body: "# Summary\n\nVersion 1." };
    const runId1 = randomUUID();
    await seedRun(runId1);
    await runSyncPipeline({
      docSvc, kbSvc, companyId,
      issueId, issueIdentifier: "E2E-1",
      agentId, runId: runId1, drafts: [draft],
    });

    const updatedDraft = { filePath: "docs/summary.md", body: "# Summary\n\nVersion 2 — updated." };
    const runId2 = randomUUID();
    await seedRun(runId2);
    await runSyncPipeline({
      docSvc, kbSvc, companyId,
      issueId, issueIdentifier: "E2E-1",
      agentId, runId: runId2, drafts: [updatedDraft],
    });

    // Only one issue document (updated in place via upsert)
    const issueDocs = await docSvc.listIssueDocuments(issueId);
    expect(issueDocs).toHaveLength(1);
    expect(issueDocs[0]!.body).toContain("Version 2");

    // Only one kb entry (updated, not duplicated)
    const { entries } = await kbSvc.listEntries(companyId, { status: "draft" });
    expect(entries).toHaveLength(1);

    // Verify document has two revisions (initial + update)
    const docId = issueDocs[0]!.id;   // id = documents.id (not documentId)
    const revisions = await db
      .select()
      .from(documentRevisions)
      .where(eq(documentRevisions.documentId, docId));
    expect(revisions).toHaveLength(2);
  });

  // ── Test 4: extractMarkdownToolCallDraft recognises codex create_file ──────

  it("extractMarkdownToolCallDraft correctly identifies markdown create_file tool calls", () => {
    const mdEntry = {
      kind: "tool_call",
      ts: new Date().toISOString(),
      name: "create_file",
      input: { path: "output/notes.md", content: "# Notes\n\nSome content." },
    } as any;

    const nonMdEntry = {
      kind: "tool_call",
      ts: new Date().toISOString(),
      name: "create_file",
      input: { path: "output/script.py", content: "print('hello')" },
    } as any;

    const nonToolEntry = {
      kind: "assistant",
      ts: new Date().toISOString(),
      text: "I will create a markdown file.",
    } as any;

    expect(extractMarkdownToolCallDraft(mdEntry)).toMatchObject({
      filePath: "output/notes.md",
      body: "# Notes\n\nSome content.",
    });

    expect(extractMarkdownToolCallDraft(nonMdEntry)).toBeNull();
    expect(extractMarkdownToolCallDraft(nonToolEntry)).toBeNull();
  });

  // ── Test 5: buildIssueDocumentKeyFromFilePath normalises correctly ──────────

  it("buildIssueDocumentKeyFromFilePath produces normalised keys and deduplicates", () => {
    const keys = new Set<string>();

    expect(buildIssueDocumentKeyFromFilePath("docs/Architecture Overview.md", keys)).toBe(
      "docs-architecture-overview",
    );
    expect(buildIssueDocumentKeyFromFilePath("reports/quarterly_report.md", keys)).toBe(
      "reports-quarterly_report",
    );
    // Different folders with same basename remain distinct and stable
    const k1 = buildIssueDocumentKeyFromFilePath("a/foo.md", keys);
    const k2 = buildIssueDocumentKeyFromFilePath("b/foo.md", keys);
    expect(k1).toBe("a-foo");
    expect(k2).toBe("b-foo");
  });
});
