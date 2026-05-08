import { useQuery } from "@tanstack/react-query";
import type { IssueWorkProduct } from "@paperclipai/shared";
import { documentsApi } from "../api/documents";
import { issuesApi } from "../api/issues";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";
import {
  FileText,
  Link2,
  GitPullRequest,
  GitBranch,
  Box,
  Globe,
  BookOpen,
  ExternalLink,
  Package,
} from "lucide-react";

// ─── Work-product icon helper ───────────────────────────────────────────────

function WorkProductIcon({ type, className }: { type: IssueWorkProduct["type"]; className?: string }) {
  const cls = cn("shrink-0", className);
  switch (type) {
    case "pull_request": return <GitPullRequest className={cls} />;
    case "branch": return <GitBranch className={cls} />;
    case "preview_url": return <Globe className={cls} />;
    case "artifact": return <Package className={cls} />;
    case "document": return <FileText className={cls} />;
    default: return <Box className={cls} />;
  }
}

// ─── useIssueDeliverableCount hook (exported for badge) ─────────────────────

export function useIssueDeliverableCount(issueId: string): number | undefined {
  const { data: docs } = useQuery({
    queryKey: queryKeys.issues.documents(issueId),
    queryFn: () => documentsApi.list(issueId),
  });
  const { data: workProducts } = useQuery({
    queryKey: queryKeys.issues.workProducts(issueId),
    queryFn: () => issuesApi.listWorkProducts(issueId),
  });
  if (docs === undefined && workProducts === undefined) return undefined;
  return (docs?.length ?? 0) + (workProducts?.length ?? 0);
}

// ─── IssueDeliverables main component ───────────────────────────────────────

export function IssueDeliverables({ issueId }: { issueId: string }) {
  const { data: docs, isLoading: docsLoading } = useQuery({
    queryKey: queryKeys.issues.documents(issueId),
    queryFn: () => documentsApi.list(issueId),
  });

  const { data: workProducts, isLoading: wpsLoading } = useQuery({
    queryKey: queryKeys.issues.workProducts(issueId),
    queryFn: () => issuesApi.listWorkProducts(issueId),
  });

  const isEmpty = (docs?.length ?? 0) === 0 && (workProducts?.length ?? 0) === 0;

  if (docsLoading || wpsLoading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Loading deliverables…
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="rounded-full bg-muted p-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No deliverables yet</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Documents and work products created during this issue will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      {/* Work Products */}
      {(workProducts?.length ?? 0) > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" />
            Work Products
          </h3>
          <div className="space-y-1.5">
            {workProducts!.map((wp) => (
              <WorkProductRow key={wp.id} wp={wp} />
            ))}
          </div>
        </section>
      )}

      {/* Documents */}
      {(docs?.length ?? 0) > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            Documents
          </h3>
          <div className="space-y-1.5">
            {docs!.map((doc) => (
              <DocumentRow key={doc.key} doc={doc} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── WorkProductRow ──────────────────────────────────────────────────────────

function statusColor(status: string): string {
  if (status === "merged" || status === "approved") return "text-emerald-600 dark:text-emerald-400";
  if (status === "changes_requested") return "text-amber-600 dark:text-amber-400";
  if (status === "closed" || status === "archived") return "text-muted-foreground";
  if (status === "ready_for_review") return "text-blue-600 dark:text-blue-400";
  return "text-muted-foreground";
}

function WorkProductRow({ wp }: { wp: IssueWorkProduct }) {
  const inner = (
    <div className={cn(
      "flex items-center gap-3 rounded-md border bg-card px-3 py-2.5 text-sm",
      wp.url && "cursor-pointer hover:bg-accent/40 transition-colors",
    )}>
      <WorkProductIcon type={wp.type} className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{wp.title}</p>
        {wp.summary && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{wp.summary}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn("text-xs capitalize", statusColor(wp.status as string))}>
          {(wp.status as string).replace(/_/g, " ")}
        </span>
        {wp.url && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
    </div>
  );

  if (wp.url) {
    return (
      <a href={wp.url} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }
  return inner;
}

// ─── DocumentRow ─────────────────────────────────────────────────────────────

interface DocumentSummaryLike {
  key: string;
  title: string | null;
  latestRevisionNumber: number;
  updatedAt: string | Date;
}

function DocumentRow({ doc }: { doc: DocumentSummaryLike }) {
  const isPlan = doc.key === "plan";
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5 text-sm">
      {isPlan ? (
        <BookOpen className="h-4 w-4 text-blue-500 shrink-0" />
      ) : (
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {doc.title ?? doc.key}
          {isPlan && (
            <span className="ml-2 rounded px-1.5 py-0.5 text-xs bg-blue-500/15 text-blue-600 dark:text-blue-400">
              plan
            </span>
          )}
        </p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">v{doc.latestRevisionNumber}</span>
    </div>
  );
}
