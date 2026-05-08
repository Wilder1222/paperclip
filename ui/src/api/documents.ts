import type { IssueDocument, IssueDocumentSummary } from "@paperclipai/shared";
import { api } from "./client";

export interface UpsertDocumentInput {
  body: string;
  title?: string | null;
  format?: string;
  changeSummary?: string | null;
  baseRevisionId?: string | null;
}

export interface DocumentRevision {
  id: string;
  documentId: string;
  revisionNumber: number;
  body: string;
  changeSummary: string | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export const documentsApi = {
  list: (issueId: string) =>
    api.get<IssueDocumentSummary[]>(`/issues/${issueId}/documents`),

  get: (issueId: string, key: string) =>
    api.get<IssueDocument>(`/issues/${issueId}/documents/${key}`),

  upsert: (issueId: string, key: string, data: UpsertDocumentInput) =>
    api.put<IssueDocument>(`/issues/${issueId}/documents/${key}`, data),

  remove: (issueId: string, key: string) =>
    api.delete<void>(`/issues/${issueId}/documents/${key}`),

  listRevisions: (issueId: string, key: string) =>
    api.get<DocumentRevision[]>(`/issues/${issueId}/documents/${key}/revisions`),
};
