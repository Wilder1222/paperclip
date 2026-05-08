import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Plus,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

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

// ─── AddWorkProductDialog ────────────────────────────────────────────────────

const WORK_PRODUCT_TYPES = [
  { value: "pull_request", label: "Pull Request" },
  { value: "preview_url", label: "Preview URL" },
  { value: "artifact", label: "Artifact" },
  { value: "branch", label: "Branch" },
  { value: "document", label: "Document" },
] as const;

function AddWorkProductDialog({
  issueId,
  open,
  onOpenChange,
}: {
  issueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<string>("pull_request");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      issuesApi.createWorkProduct(issueId, { type, title, url: url || undefined, provider: "manual" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.workProducts(issueId) });
      setTitle("");
      setUrl("");
      setType("pull_request");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Work Product</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="wp-type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="wp-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORK_PRODUCT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="wp-title">Title</Label>
            <Input
              id="wp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Add login page PR"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="wp-url">URL (optional)</Label>
            <Input
              id="wp-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/…"
              type="url"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutate()} disabled={!title.trim() || isPending}>
            {isPending ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: docs, isLoading: docsLoading } = useQuery({
    queryKey: queryKeys.issues.documents(issueId),
    queryFn: () => documentsApi.list(issueId),
  });

  const { data: workProducts, isLoading: wpsLoading } = useQuery({
    queryKey: queryKeys.issues.workProducts(issueId),
    queryFn: () => issuesApi.listWorkProducts(issueId),
  });

  const { mutate: deleteWp } = useMutation({
    mutationFn: (id: string) => issuesApi.deleteWorkProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.workProducts(issueId) });
    },
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
      <>
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="rounded-full bg-muted p-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No deliverables yet</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Documents and work products created during this issue will appear here.
          </p>
          <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Work Product
          </Button>
        </div>
        <AddWorkProductDialog issueId={issueId} open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6 py-2">
        {/* Work Products */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              Work Products
            </h3>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
          {(workProducts?.length ?? 0) > 0 ? (
            <div className="space-y-1.5">
              {workProducts!.map((wp) => (
                <WorkProductRow key={wp.id} wp={wp} onDelete={() => deleteWp(wp.id)} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">No work products yet.</p>
          )}
        </section>

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
      <AddWorkProductDialog issueId={issueId} open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </>
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

function WorkProductRow({ wp, onDelete }: { wp: IssueWorkProduct; onDelete: () => void }) {
  const inner = (
    <div className={cn(
      "group flex items-center gap-3 rounded-md border bg-card px-3 py-2.5 text-sm",
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
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
          className="ml-1 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
          title="Remove work product"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
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
