import { z } from "zod";

export const KB_ENTRY_STATUSES = ["draft", "in_review", "published", "archived", "deprecated"] as const;
export const KB_ENTRY_DOC_TYPES = ["general", "runbook", "adr", "playbook", "faq", "postmortem"] as const;

export const kbEntryStatusSchema = z.enum(KB_ENTRY_STATUSES);
export const kbEntryDocTypeSchema = z.enum(KB_ENTRY_DOC_TYPES);

export const createKbEntrySchema = z.object({
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase letters, numbers, or hyphens"),
  title: z.string().trim().min(1).max(240),
  summary: z.string().trim().max(1000).nullable().optional(),
  docType: kbEntryDocTypeSchema.optional().default("general"),
  tags: z.array(z.string().trim().min(1).max(48)).max(20).optional().default([]),
  collectionId: z.string().uuid().nullable().optional(),
  sourceIssueId: z.string().uuid().nullable().optional(),
  sourceRunId: z.string().uuid().nullable().optional(),
  documentId: z.string().uuid().nullable().optional(),
  body: z.string().max(524288).nullable().optional(),
  format: z.enum(["markdown"]).optional().default("markdown"),
}).superRefine((val, ctx) => {
  if (!val.documentId && !val.body) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide either documentId or body", path: ["body"] });
  }
  if (val.documentId && val.body) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide either documentId or body, not both", path: ["documentId"] });
  }
});

export const updateKbEntrySchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  summary: z.string().trim().max(1000).nullable().optional(),
  docType: kbEntryDocTypeSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(48)).max(20).optional(),
  collectionId: z.string().uuid().nullable().optional(),
  body: z.string().max(524288).nullable().optional(),
  changeSummary: z.string().trim().max(500).nullable().optional(),
  baseRevisionId: z.string().uuid().nullable().optional(),
});

export const submitKbReviewSchema = z.object({
  reviewNote: z.string().trim().max(1000).nullable().optional(),
});

export const rejectKbEntrySchema = z.object({
  reason: z.string().trim().max(1000).nullable().optional(),
});

export const createKbCollectionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase letters, numbers, or hyphens"),
  description: z.string().trim().max(500).nullable().optional(),
});

export const updateKbCollectionSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export type KbEntryStatus = z.infer<typeof kbEntryStatusSchema>;
export type KbEntryDocType = z.infer<typeof kbEntryDocTypeSchema>;
export type CreateKbEntry = z.infer<typeof createKbEntrySchema>;
export type UpdateKbEntry = z.infer<typeof updateKbEntrySchema>;
export type SubmitKbReview = z.infer<typeof submitKbReviewSchema>;
export type RejectKbEntry = z.infer<typeof rejectKbEntrySchema>;
export type CreateKbCollection = z.infer<typeof createKbCollectionSchema>;
export type UpdateKbCollection = z.infer<typeof updateKbCollectionSchema>;
