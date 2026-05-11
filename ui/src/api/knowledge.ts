import type { KbEntry, KbEntrySummary, KbCollection } from "@paperclipai/shared";
import { api } from "./client";

function buildQuery(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
    .join("&");
  return parts ? `?${parts}` : "";
}

export const knowledgeApi = {
  // Collections
  listCollections: (companyId: string) =>
    api.get<KbCollection[]>(`/companies/${companyId}/knowledge/collections`),

  createCollection: (companyId: string, body: unknown) =>
    api.post<KbCollection>(`/companies/${companyId}/knowledge/collections`, body),

  updateCollection: (id: string, body: unknown) =>
    api.patch<KbCollection>(`/knowledge/collections/${id}`, body),

  deleteCollection: (id: string) =>
    api.delete<void>(`/knowledge/collections/${id}`),

  // Entries
  listEntries: (
    companyId: string,
    params?: {
      status?: string;
      collectionId?: string;
      docType?: string;
      tag?: string;
      q?: string;
      limit?: string;
      offset?: string;
    },
  ) =>
    api.get<{ entries: KbEntrySummary[]; total: number }>(
      `/companies/${companyId}/knowledge/entries${buildQuery(params ?? {})}`,
    ),

  searchEntries: (companyId: string, q: string) =>
    api.get<KbEntrySummary[]>(
      `/companies/${companyId}/knowledge/entries/search${buildQuery({ q })}`,
    ),

  getEntry: (id: string) => api.get<KbEntry>(`/knowledge/entries/${id}`),

  createEntry: (companyId: string, body: unknown) =>
    api.post<KbEntry>(`/companies/${companyId}/knowledge/entries`, body),

  updateEntry: (id: string, body: unknown) =>
    api.patch<KbEntry>(`/knowledge/entries/${id}`, body),

  deleteEntry: (id: string) => api.delete<void>(`/knowledge/entries/${id}`),

  // Inbox
  listInbox: (companyId: string) =>
    api.get<KbEntrySummary[]>(`/companies/${companyId}/knowledge/inbox`),

  // Lifecycle
  submitReview: (id: string, body?: unknown) =>
    api.post<KbEntry>(`/knowledge/entries/${id}/submit-review`, body ?? {}),

  publish: (id: string) => api.post<KbEntry>(`/knowledge/entries/${id}/publish`, {}),

  reject: (id: string, body?: unknown) =>
    api.post<KbEntry>(`/knowledge/entries/${id}/reject`, body ?? {}),

  archive: (id: string) => api.post<KbEntry>(`/knowledge/entries/${id}/archive`, {}),

  deprecate: (id: string) => api.post<KbEntry>(`/knowledge/entries/${id}/deprecate`, {}),
};
