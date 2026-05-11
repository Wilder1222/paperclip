import { useEffect } from "react";
import { useParams } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ArrowLeft } from "lucide-react";
import { Link } from "@/lib/router";
import { knowledgeApi } from "../api/knowledge";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_COLORS: Record<string, string> = {
  draft: "secondary",
  in_review: "outline",
  published: "default",
  archived: "secondary",
  deprecated: "secondary",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  published: "Published",
  archived: "Archived",
  deprecated: "Deprecated",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  general: "General",
  runbook: "Runbook",
  adr: "ADR",
  playbook: "Playbook",
  faq: "FAQ",
  postmortem: "Postmortem",
};

export function KnowledgeDetail() {
  const { entryId } = useParams<{ entryId: string }>();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();

  const { data: entry, isLoading, error } = useQuery({
    queryKey: queryKeys.knowledge.entry(entryId!),
    queryFn: () => knowledgeApi.getEntry(entryId!),
    enabled: !!entryId,
  });

  useEffect(() => {
    if (entry) {
      setBreadcrumbs([
        { label: "Knowledge Library", href: "/knowledge/library" },
        { label: entry.title },
      ]);
    } else {
      setBreadcrumbs([{ label: "Knowledge Library", href: "/knowledge/library" }]);
    }
  }, [entry, setBreadcrumbs]);

  const submitReviewMutation = useMutation({
    mutationFn: () => knowledgeApi.submitReview(entryId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.entry(entryId!) }),
  });

  const publishMutation = useMutation({
    mutationFn: () => knowledgeApi.publish(entryId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.entry(entryId!) });
      queryClient.invalidateQueries({ queryKey: ["knowledge", "inbox"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => knowledgeApi.archive(entryId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.entry(entryId!) }),
  });

  const rejectMutation = useMutation({
    mutationFn: () => knowledgeApi.reject(entryId!, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.entry(entryId!) });
      if (entry) {
        queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.entries(entry.companyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.inbox(entry.companyId) });
      }
    },
  });

  const deprecateMutation = useMutation({
    mutationFn: () => knowledgeApi.deprecate(entryId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.entry(entryId!) }),
  });

  if (!entryId) {
    return <EmptyState icon={BookOpen} message="Entry not found." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="detail" />;
  }

  if (error || !entry) {
    return <EmptyState icon={BookOpen} message="Knowledge entry not found." />;
  }

  const isActionPending =
    submitReviewMutation.isPending ||
    publishMutation.isPending ||
    archiveMutation.isPending ||
    deprecateMutation.isPending ||
    rejectMutation.isPending;

  return (
    <div className="flex flex-col gap-4">
      {/* Back */}
      <div>
        <Link
          to="/knowledge/library"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Knowledge Library
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Body */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={STATUS_COLORS[entry.status] as any ?? "secondary"}>
              {STATUS_LABELS[entry.status] ?? entry.status}
            </Badge>
            <Badge variant="outline">
              {DOC_TYPE_LABELS[entry.docType] ?? entry.docType}
            </Badge>
          </div>

          <h1 className="text-xl font-semibold">{entry.title}</h1>

          {entry.summary && (
            <p className="text-sm text-muted-foreground">{entry.summary}</p>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-2 flex-wrap py-1">
            {entry.status === "draft" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isActionPending}
                  onClick={() => submitReviewMutation.mutate()}
                >
                  Submit for Review
                </Button>
                <Button
                  size="sm"
                  disabled={isActionPending}
                  onClick={() => publishMutation.mutate()}
                >
                  Publish Directly
                </Button>
              </>
            )}
            {entry.status === "in_review" && (
              <>
                <Button
                  size="sm"
                  disabled={isActionPending}
                  onClick={() => publishMutation.mutate()}
                >
                  Publish
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isActionPending}
                  onClick={() => rejectMutation.mutate()}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isActionPending}
                  onClick={() => archiveMutation.mutate()}
                >
                  Archive
                </Button>
              </>
            )}
            {entry.status === "published" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isActionPending}
                  onClick={() => archiveMutation.mutate()}
                >
                  Archive
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isActionPending}
                  onClick={() => deprecateMutation.mutate()}
                >
                  Deprecate
                </Button>
              </>
            )}
          </div>

          {/* Body */}
          <div className="rounded-lg border border-border p-4 bg-card">
            <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{entry.body}</pre>
          </div>
        </div>

        {/* Metadata sidebar */}
        <aside className="lg:w-56 shrink-0 space-y-4 text-sm">
          <div className="space-y-3">
            {entry.tags.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {entry.sourceIssueId && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Source Issue</p>
                <Link
                  to={`/issues/${entry.sourceIssueId}`}
                  className="text-xs text-primary hover:underline"
                >
                  View issue →
                </Link>
              </div>
            )}
            {(entry.ownerUserId || entry.ownerAgentId) && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Owner</p>
                <p className="text-xs">{entry.ownerUserId ?? entry.ownerAgentId}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Created</p>
              <p className="text-xs">{new Date(entry.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Updated</p>
              <p className="text-xs">{new Date(entry.updatedAt).toLocaleString()}</p>
            </div>
            {entry.reviewedAt && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Reviewed</p>
                <p className="text-xs">{new Date(entry.reviewedAt).toLocaleString()}</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
