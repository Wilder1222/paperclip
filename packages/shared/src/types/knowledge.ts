import type { KbEntryStatus, KbEntryDocType } from "../validators/knowledge.js";

export interface KbCollection {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
}

export interface KbEntrySummary {
  id: string;
  companyId: string;
  documentId: string;
  collectionId: string | null;
  slug: string;
  title: string;
  summary: string | null;
  docType: KbEntryDocType;
  tags: string[];
  status: KbEntryStatus;
  sourceIssueId: string | null;
  sourceRunId: string | null;
  ownerUserId: string | null;
  ownerAgentId: string | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  reviewRequestedAt: Date | null;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  lastReviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KbEntry extends KbEntrySummary {
  body: string;
  format: string;
  latestRevisionId: string | null;
  latestRevisionNumber: number;
}
