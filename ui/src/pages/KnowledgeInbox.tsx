import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@/lib/router";
import { Inbox } from "lucide-react";
import { knowledgeApi } from "../api/knowledge";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { KbEntrySummary } from "@paperclipai/shared";

function formatRelative(date: Date | string | null) {
  if (!date) return "—";
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export function KnowledgeInbox() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    setBreadcrumbs([{ label: "Knowledge Inbox" }]);
  }, [setBreadcrumbs]);

  const { data: entries, isLoading, error } = useQuery({
    queryKey: queryKeys.knowledge.inbox(selectedCompanyId!),
    queryFn: () => knowledgeApi.listInbox(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => knowledgeApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.inbox(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.entries(selectedCompanyId!) });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      knowledgeApi.reject(id, { reason: reason || undefined }),
    onSuccess: () => {
      setRejectingId(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.inbox(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.entries(selectedCompanyId!) });
    },
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={Inbox} message="Select a company to view the knowledge inbox." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  const list = entries ?? [];

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          Knowledge Inbox{list.length > 0 && <span className="ml-2 text-muted-foreground font-normal text-base">({list.length})</span>}
        </h1>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Inbox} message="All clear — no documents awaiting review." />
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {list.map((entry) => (
            <div key={entry.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/knowledge/${entry.id}`}
                    className="font-medium text-sm hover:underline truncate block"
                  >
                    {entry.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span>{entry.docType}</span>
                    <span>·</span>
                    <span>Submitted {formatRelative(entry.reviewRequestedAt)}</span>
                    {entry.createdByAgentId && (
                      <>
                        <span>·</span>
                        <span>by agent</span>
                      </>
                    )}
                  </div>
                  {entry.summary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.summary}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={publishMutation.isPending}
                    onClick={() => publishMutation.mutate(entry.id)}
                  >
                    Publish
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={rejectMutation.isPending}
                    onClick={() => {
                      if (rejectingId === entry.id) {
                        setRejectingId(null);
                        setRejectReason("");
                      } else {
                        setRejectingId(entry.id);
                        setRejectReason("");
                      }
                    }}
                  >
                    Reject
                  </Button>
                </div>
              </div>

              {/* Inline reject form */}
              {rejectingId === entry.id && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    placeholder="Reason for rejection (optional)..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="text-sm min-h-[70px] resize-y"
                  />
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate({ id: entry.id, reason: rejectReason })}
                    >
                      Confirm Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setRejectingId(null); setRejectReason(""); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
