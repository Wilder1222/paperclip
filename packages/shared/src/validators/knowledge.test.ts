import { describe, expect, it } from "vitest";
import {
  createKbEntrySchema,
  updateKbEntrySchema,
  createKbCollectionSchema,
  updateKbCollectionSchema,
  rejectKbEntrySchema,
  submitKbReviewSchema,
} from "./knowledge.js";

describe("createKbEntrySchema", () => {
  it("accepts valid entry with body", () => {
    const result = createKbEntrySchema.safeParse({
      slug: "my-entry",
      title: "My Entry",
      body: "Some content",
      sourceRunId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.docType).toBe("general");
      expect(result.data.format).toBe("markdown");
      expect(result.data.tags).toEqual([]);
    }
  });

  it("accepts valid entry with documentId", () => {
    const result = createKbEntrySchema.safeParse({
      slug: "my-entry",
      title: "My Entry",
      documentId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when neither documentId nor body is provided", () => {
    const result = createKbEntrySchema.safeParse({
      slug: "my-entry",
      title: "My Entry",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("Provide either documentId or body");
    }
  });

  it("rejects when both documentId and body are provided", () => {
    const result = createKbEntrySchema.safeParse({
      slug: "my-entry",
      title: "My Entry",
      documentId: "550e8400-e29b-41d4-a716-446655440000",
      body: "content",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("Provide either documentId or body, not both");
    }
  });

  it("rejects invalid slug (uppercase)", () => {
    const result = createKbEntrySchema.safeParse({
      slug: "My-Entry",
      title: "My Entry",
      body: "content",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid slug (starts with dash)", () => {
    const result = createKbEntrySchema.safeParse({
      slug: "-my-entry",
      title: "My Entry",
      body: "content",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title that is empty after trim", () => {
    const result = createKbEntrySchema.safeParse({
      slug: "my-entry",
      title: "   ",
      body: "content",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid docType", () => {
    const result = createKbEntrySchema.safeParse({
      slug: "my-entry",
      title: "Title",
      body: "content",
      docType: "unknown_type",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid docTypes", () => {
    for (const docType of ["general", "runbook", "adr", "playbook", "faq", "postmortem"] as const) {
      const result = createKbEntrySchema.safeParse({
        slug: "my-entry",
        title: "Title",
        body: "content",
        docType,
      });
      expect(result.success, `docType ${docType} should be valid`).toBe(true);
    }
  });

  it("rejects too many tags (>20)", () => {
    const result = createKbEntrySchema.safeParse({
      slug: "my-entry",
      title: "Title",
      body: "content",
      tags: Array.from({ length: 21 }, (_, i) => `tag-${i}`),
    });
    expect(result.success).toBe(false);
  });
});

describe("updateKbEntrySchema", () => {
  it("accepts empty update", () => {
    const result = updateKbEntrySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update", () => {
    const result = updateKbEntrySchema.safeParse({ title: "New Title", body: "New content" });
    expect(result.success).toBe(true);
  });

  it("rejects empty title string", () => {
    const result = updateKbEntrySchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });
});

describe("createKbCollectionSchema", () => {
  it("accepts valid collection", () => {
    const result = createKbCollectionSchema.safeParse({ name: "My Collection", slug: "my-collection" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid slug", () => {
    const result = createKbCollectionSchema.safeParse({ name: "My Collection", slug: "My-Collection" });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createKbCollectionSchema.safeParse({ name: "", slug: "my-collection" });
    expect(result.success).toBe(false);
  });
});

describe("updateKbCollectionSchema", () => {
  it("accepts empty update", () => {
    expect(updateKbCollectionSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial name update", () => {
    expect(updateKbCollectionSchema.safeParse({ name: "New Name" }).success).toBe(true);
  });
});

describe("submitKbReviewSchema", () => {
  it("accepts empty body", () => {
    expect(submitKbReviewSchema.safeParse({}).success).toBe(true);
  });

  it("accepts with reviewNote", () => {
    expect(submitKbReviewSchema.safeParse({ reviewNote: "Please review this" }).success).toBe(true);
  });
});

describe("rejectKbEntrySchema", () => {
  it("accepts empty body", () => {
    expect(rejectKbEntrySchema.safeParse({}).success).toBe(true);
  });

  it("accepts with reason", () => {
    expect(rejectKbEntrySchema.safeParse({ reason: "Needs more detail" }).success).toBe(true);
  });
});
