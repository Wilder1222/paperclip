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

describe("IssueDocuments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no documents", async () => {
    mockDocumentsApi.list.mockResolvedValue([]);
    const container = renderComponent("issue-1");
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain("No documents yet");
  });

  it("renders document list with key and revision count", async () => {
    const doc = makeDoc({ key: "summary", title: "Run Summary", latestRevisionNumber: 3 });
    mockDocumentsApi.list.mockResolvedValue([doc]);
    const container = renderComponent("issue-1");
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain("Run Summary");
    expect(container.textContent).toContain("v3");
  });

  it("renders plan document with plan badge", async () => {
    const planDoc = makeDoc({ key: "plan", title: "Execution Plan" });
    const summaryDoc = makeDoc({ id: "doc-2", key: "summary", title: "Run Summary" });
    mockDocumentsApi.list.mockResolvedValue([summaryDoc, planDoc]);
    const container = renderComponent("issue-1");
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain("plan");
    expect(container.textContent).toContain("Execution Plan");
  });

  it("plan document appears first in sorted order", async () => {
    const planDoc = makeDoc({ key: "plan", title: "Execution Plan" });
    const summaryDoc = makeDoc({ id: "doc-2", key: "summary", title: "Run Summary" });
    mockDocumentsApi.list.mockResolvedValue([summaryDoc, planDoc]);
    const container = renderComponent("issue-1");
    await act(async () => {
      await Promise.resolve();
    });
    const text = container.textContent ?? "";
    const planIdx = text.indexOf("Execution Plan");
    const summaryIdx = text.indexOf("Run Summary");
    expect(planIdx).toBeLessThan(summaryIdx);
  });
});
