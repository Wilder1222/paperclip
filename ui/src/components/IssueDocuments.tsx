import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { IssueDocumentSummary } from "@paperclipai/shared";
import { documentsApi } from "../api/documents";
import { queryKeys } from "../lib/queryKeys";
import { timeAgo } from "../lib/timeAgo";
import { cn } from "../lib/utils";
import { MarkdownBody } from "./MarkdownBody";
import { Button } from "@/components/ui/button";
import { FileText, ChevronDown, ChevronRight, BookOpen, Pencil, X, Check } from "lucide-react";

interface IssueDocumentsProps {
  issueId: string;
  className?: string;
}

const PLAN_KEY = "plan";

function DocumentCard({
  doc,
  issueId,
}: {
  doc: IssueDocumentSummary;
  issueId: string;
}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(doc.key === PLAN_KEY);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState<string>("");

  const isPlan = doc.key === PLAN_KEY;

  const { data: fullDoc, isLoading } = useQuery({
    queryKey: queryKeys.issues.document(issueId, doc.key),
    queryFn: () => documentsApi.get(issueId, doc.key),
    enabled: expanded,
  });

  const updateMutation = useMutation({
    mutationFn: (body: string) =>
      documentsApi.upsert(issueId, doc.key, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.document(issueId, doc.key) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.documents(issueId) });
      setEditing(false);
    },
  });

  function startEdit() {
    setEditBody(fullDoc?.body ?? "");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function saveEdit() {
    if (editBody.trim()) {
      updateMutation.mutate(editBody);
    }
  }

  const updatedAt = new Date(doc.updatedAt);
  const updatedLabel = timeAgo(updatedAt);
  const actor = doc.updatedByAgentId
    ? `agent`
    : doc.updatedByUserId
      ? `user`
      : null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground",
        isPlan && "border-blue-500/40 bg-blue-500/5 dark:bg-blue-500/10",
      )}
    >
      {/* Header */}
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-accent/30 transition-colors rounded-lg"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-muted-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        {isPlan ? (
          <BookOpen className="h-4 w-4 text-blue-500" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="flex-1 font-medium text-sm">
          {doc.title ?? doc.key}
          {isPlan && (
            <span className="ml-2 rounded px-1.5 py-0.5 text-xs bg-blue-500/15 text-blue-600 dark:text-blue-400">
              plan
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          v{doc.latestRevisionNumber} · {updatedLabel}
          {actor && ` by ${actor}`}
        </span>
      </button>

      {/* Body */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3">
          {isLoading && (
            <p className="text-sm text-muted-foreground py-2">Loading…</p>
          )}
          {!isLoading && fullDoc && !editing && (
            <>
              <div className="flex justify-end mb-2">
                <Button variant="ghost" size="sm" onClick={startEdit} className="gap-1">
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <MarkdownBody>{fullDoc.body}</MarkdownBody>
              </div>
            </>
          )}
          {!isLoading && editing && (
            <>
              <div className="flex justify-end gap-2 mb-2">
                <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={updateMutation.isPending} className="gap-1">
                  <X className="h-3 w-3" />
                  Cancel
                </Button>
                <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending || !editBody.trim()} className="gap-1">
                  <Check className="h-3 w-3" />
                  {updateMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
              <textarea
                className="w-full rounded border bg-background p-2 text-sm font-mono resize-y min-h-[200px] focus:outline-none focus:ring-1 focus:ring-ring"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                disabled={updateMutation.isPending}
              />
              {updateMutation.isError && (
                <p className="mt-1 text-xs text-destructive">
                  Failed to save. Please try again.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function IssueDocuments({ issueId, className }: IssueDocumentsProps) {
  const { data: docs, isLoading } = useQuery({
    queryKey: queryKeys.issues.documents(issueId),
    queryFn: () => documentsApi.list(issueId),
    enabled: !!issueId,
  });

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!docs || docs.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-muted-foreground gap-2", className)}>
        <FileText className="h-8 w-8 opacity-40" />
        <p className="text-sm">No documents yet</p>
        <p className="text-xs opacity-70">Documents created by agents will appear here</p>
      </div>
    );
  }

  // Sort: plan first, then by updatedAt descending
  const sorted = [...docs].sort((a, b) => {
    if (a.key === PLAN_KEY) return -1;
    if (b.key === PLAN_KEY) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className={cn("space-y-3", className)}>
      {sorted.map((doc) => (
        <DocumentCard key={doc.key} doc={doc} issueId={issueId} />
      ))}
    </div>
  );
}

/** Returns the count of documents for a badge, or undefined while loading */
export function useIssueDocumentCount(issueId: string): number | undefined {
  const { data } = useQuery({
    queryKey: queryKeys.issues.documents(issueId),
    queryFn: () => documentsApi.list(issueId),
    enabled: !!issueId,
  });
  return data?.length;
}
