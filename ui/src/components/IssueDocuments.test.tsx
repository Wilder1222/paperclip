// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { IssueDocumentSummary } from "@paperclipai/shared";
import { IssueDocuments } from "./IssueDocuments";

// Mock the documents API
const mockDocumentsApi = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  upsert: vi.fn(),
  remove: vi.fn(),
  listRevisions: vi.fn(),
}));

vi.mock("../api/documents", () => ({ documentsApi: mockDocumentsApi }));

// Mock the issues API (used by useDocumentPendingApproval)
const mockIssuesApi = vi.hoisted(() => ({
  listInteractions: vi.fn().mockResolvedValue([]),
  acceptInteraction: vi.fn(),
  rejectInteraction: vi.fn(),
}));

vi.mock("../api/issues", () => ({ issuesApi: mockIssuesApi }));

// Mock MarkdownBody to avoid ThemeProvider dependency
vi.mock("./MarkdownBody", () => ({
  MarkdownBody: ({ children }: { children?: string }) =>
    <div data-testid="markdown-body">{children}</div>,
}));

// Required for React to treat this as a test environment and flush act() properly
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function makeDoc(overrides: Partial<IssueDocumentSummary> = {}): IssueDocumentSummary {
  return {
    id: "doc-1",
    companyId: "company-1",
    issueId: "issue-1",
    key: "summary",
    title: "Run Summary",
    format: "markdown",
    latestRevisionId: "rev-1",
    latestRevisionNumber: 2,
    createdByAgentId: "agent-1",
    createdByUserId: null,
    updatedByAgentId: "agent-1",
    updatedByUserId: null,
    createdAt: new Date("2026-05-01T10:00:00Z") as unknown as Date,
    updatedAt: new Date("2026-05-07T14:00:00Z") as unknown as Date,
    ...overrides,
  };
}

function renderComponent(issueId: string) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  act(() => {
    createRoot(container).render(
      <QueryClientProvider client={queryClient}>
        <IssueDocuments issueId={issueId} />
      </QueryClientProvider>,
    );
  });
  return container;
}

/** Flush microtasks and macrotasks so React Query can settle. */
async function flushQueries() {
  for (let i = 0; i < 2; i++) {
    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
  }
}

describe("IssueDocuments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIssuesApi.listInteractions.mockResolvedValue([]);
  });

  it("shows empty state when no documents", async () => {
    mockDocumentsApi.list.mockResolvedValue([]);
    const container = renderComponent("issue-1");
    await flushQueries();
    expect(container.textContent).toContain("No documents yet");
  });

  it("renders document list with key and revision count", async () => {
    const doc = makeDoc({ key: "summary", title: "Run Summary", latestRevisionNumber: 3 });
    mockDocumentsApi.list.mockResolvedValue([doc]);
    const container = renderComponent("issue-1");
    await flushQueries();
    expect(container.textContent).toContain("Run Summary");
    expect(container.textContent).toContain("v3");
  });

  it("renders plan document with plan badge", async () => {
    const planDoc = makeDoc({ key: "plan", title: "Execution Plan" });
    const summaryDoc = makeDoc({ id: "doc-2", key: "summary", title: "Run Summary" });
    mockDocumentsApi.list.mockResolvedValue([summaryDoc, planDoc]);
    mockDocumentsApi.get.mockResolvedValue({ body: "" });
    const container = renderComponent("issue-1");
    await flushQueries();
    expect(container.textContent).toContain("plan");
    expect(container.textContent).toContain("Execution Plan");
  });

  it("plan document appears first in sorted order", async () => {
    const planDoc = makeDoc({ key: "plan", title: "Execution Plan" });
    const summaryDoc = makeDoc({ id: "doc-2", key: "summary", title: "Run Summary" });
    mockDocumentsApi.list.mockResolvedValue([summaryDoc, planDoc]);
    mockDocumentsApi.get.mockResolvedValue({ body: "" });
    const container = renderComponent("issue-1");
    await flushQueries();
    const text = container.textContent ?? "";
    const planIdx = text.indexOf("Execution Plan");
    const summaryIdx = text.indexOf("Run Summary");
    expect(planIdx).toBeLessThan(summaryIdx);
  });
});
