import { describe, expect, it } from "vitest";
import {
  buildIssueDocumentKeyFromFilePath,
  extractMarkdownToolCallDraft,
} from "../services/heartbeat.js";

describe("extractMarkdownToolCallDraft", () => {
  it("extracts markdown create_file tool calls", () => {
    const draft = extractMarkdownToolCallDraft({
      kind: "tool_call",
      ts: "2026-05-08T00:00:00.000Z",
      name: "create_file",
      toolUseId: "tool-1",
      input: {
        filePath: "notes/plan.md",
        content: "# Plan\n\nShip it.",
      },
    });

    expect(draft).toEqual({
      filePath: "notes/plan.md",
      body: "# Plan\n\nShip it.",
      toolName: "create_file",
    });
  });

  it("ignores non-markdown files", () => {
    const draft = extractMarkdownToolCallDraft({
      kind: "tool_call",
      ts: "2026-05-08T00:00:00.000Z",
      name: "create_file",
      toolUseId: "tool-2",
      input: {
        filePath: "src/index.ts",
        content: "console.log('x');",
      },
    });

    expect(draft).toBeNull();
  });

  it("ignores unsupported tool names", () => {
    const draft = extractMarkdownToolCallDraft({
      kind: "tool_call",
      ts: "2026-05-08T00:00:00.000Z",
      name: "apply_patch",
      toolUseId: "tool-3",
      input: {
        filePath: "notes/plan.md",
        content: "# Plan",
      },
    });

    expect(draft).toBeNull();
  });
});

describe("buildIssueDocumentKeyFromFilePath", () => {
  it("normalizes file paths to stable valid issue document keys", () => {
    const used = new Set<string>();
    expect(buildIssueDocumentKeyFromFilePath("docs/Design Spec.md", used)).toBe("docs-design-spec");
    expect(buildIssueDocumentKeyFromFilePath("notes/Design Spec.md", used)).toBe("notes-design-spec");
  });

  it("is stable across processing order for same basenames in different folders", () => {
    const keyA1 = buildIssueDocumentKeyFromFilePath("a/summary.md");
    const keyB1 = buildIssueDocumentKeyFromFilePath("b/summary.md");

    const keyB2 = buildIssueDocumentKeyFromFilePath("b/summary.md");
    const keyA2 = buildIssueDocumentKeyFromFilePath("a/summary.md");

    expect(keyA1).toBe(keyA2);
    expect(keyB1).toBe(keyB2);
    expect(keyA1).not.toBe(keyB1);
  });

  it("falls back to default when basename is empty", () => {
    const key = buildIssueDocumentKeyFromFilePath(".md");
    expect(key).toBe("document");
  });
});
