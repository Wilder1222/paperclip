import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { IssueDocumentSummary, RequestConfirmationInteraction } from "@paperclipai/shared";
import { documentsApi } from "../api/documents";
import { issuesApi } from "../api/issues";
import { queryKeys } from "../lib/queryKeys";
import { timeAgo } from "../lib/timeAgo";
import { cn } from "../lib/utils";
import { MarkdownBody } from "./MarkdownBody";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileText, ChevronDown, ChevronRight, BookOpen, Pencil, X, Check, ClipboardCheck, AlertCircle, History, User, Bot, Plus } from "lucide-react";

interface IssueDocumentsProps {
  issueId: string;
  className?: string;
}

const PLAN_KEY = "plan";

/** Returns the pending request_confirmation interaction for a specific document key, or null */
function useDocumentPendingApproval(
  issueId: string,
  documentKey: string,
): RequestConfirmationInteraction | null {
  const { data: interactions } = useQuery({
    queryKey: queryKeys.issues.interactions(issueId),
    queryFn: () => issuesApi.listInteractions(issueId),
    enabled: documentKey === PLAN_KEY, // only fetch for plan documents
  });
  if (!interactions) return null;
  const match = interactions.find(
    (i): i is RequestConfirmationInteraction =>
      i.kind === "request_confirmation" &&
      i.status === "pending" &&
      i.payload.target?.type === "issue_document" &&
      (i.payload.target as { key: string }).key === documentKey,
  );
  return match ?? null;
}

interface PlanApprovalBannerProps {
  issueId: string;
  interaction: RequestConfirmationInteraction;
}

function PlanApprovalBanner({ issueId, interaction }: PlanApprovalBannerProps) {
  const queryClient = useQueryClient();
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [accepted, setAccepted] = useState(false);

  const acceptMutation = useMutation({
    mutationFn: () => issuesApi.acceptInteraction(issueId, interaction.id),
    onSuccess: () => {
      setAccepted(true);
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.interactions(issueId) });
      setTimeout(() => setAccepted(false), 3000);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => issuesApi.rejectInteraction(issueId, interaction.id, rejectReason || undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.interactions(issueId) });
      setShowRejectInput(false);
      setRejectReason("");
    },
  });

  if (accepted) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-t-lg border-b bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm">
        <Check className="h-4 w-4 shrink-0" />
        <span>Plan accepted — agent will proceed.</span>
      </div>
    );
  }

  const prompt = interaction.payload.prompt ?? "Waiting for your approval before proceeding.";
  const acceptLabel = interaction.payload.acceptLabel ?? "Accept Plan";
  const rejectLabel = interaction.payload.rejectLabel ?? "Request Changes";
  const requiresReason = interaction.payload.rejectRequiresReason ?? false;

  return (
    <div className="rounded-t-lg border-b border-amber-500/40 bg-amber-500/10 px-4 py-3 space-y-2">
      <div className="flex items-start gap-2">
        <ClipboardCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Awaiting approval</p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">{prompt}</p>
        </div>
      </div>

      {!showRejectInput ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            onClick={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending}
          >
            <Check className="h-3 w-3" />
            {acceptMutation.isPending ? "Accepting…" : acceptLabel}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1"
            onClick={() => setShowRejectInput(true)}
          >
            <X className="h-3 w-3" />
            {rejectLabel}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            className="w-full rounded border bg-background px-2 py-1.5 text-sm resize-none min-h-[72px] focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder={interaction.payload.rejectReasonLabel ?? "Describe what needs to change…"}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            disabled={rejectMutation.isPending}
          />
          {rejectMutation.isError && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              Failed to submit. Try again.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => { setShowRejectInput(false); setRejectReason(""); }}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 gap-1"
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending || (requiresReason && !rejectReason.trim())}
            >
              {rejectMutation.isPending ? "Sending…" : "Send feedback"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Revision History Sheet ──────────────────────────────────────────────────

interface RevisionHistorySheetProps {
  issueId: string;
  documentKey: string;
  documentTitle: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function RevisionHistorySheet({ issueId, documentKey, documentTitle, open, onOpenChange }: RevisionHistorySheetProps) {
  const { data: revisions, isLoading } = useQuery({
    queryKey: queryKeys.issues.documentRevisions(issueId, documentKey),
    queryFn: () => documentsApi.listRevisions(issueId, documentKey),
    enabled: open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] overflow-y-auto">
        <SheetHeader className="border-b pb-3 mb-0">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            Revision history
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {documentTitle ?? documentKey}
          </p>
        </SheetHeader>

        <div className="px-4 py-3 space-y-3">
          {isLoading && (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
          )}
          {!isLoading && (!revisions || revisions.length === 0) && (
            <p className="text-sm text-muted-foreground py-4 text-center">No revisions found.</p>
          )}
          {revisions?.map((rev) => (
            <div key={rev.id} className="rounded-md border bg-card p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">v{rev.revisionNumber}</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {rev.createdByAgentId ? (
                    <><Bot className="h-3 w-3" /> Agent</>
                  ) : (
                    <><User className="h-3 w-3" /> User</>
                  )}
                  <span>·</span>
                  <span>{timeAgo(new Date(rev.createdAt))}</span>
                </div>
              </div>
              {rev.changeSummary && (
                <p className="text-sm text-foreground/80">{rev.changeSummary}</p>
              )}
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
                  View content
                </summary>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] bg-muted rounded p-2 overflow-x-auto max-h-48">
                  {rev.body}
                </pre>
              </details>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── DocumentCard ─────────────────────────────────────────────────────────────

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
  const pendingApproval = useDocumentPendingApproval(issueId, doc.key);
  const [revisionSheetOpen, setRevisionSheetOpen] = useState(false);

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
        isPlan && pendingApproval && "border-amber-500/50",
      )}
    >
      {/* Approval banner for plan documents */}
      {isPlan && pendingApproval && (
        <PlanApprovalBanner issueId={issueId} interaction={pendingApproval} />
      )}

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
        <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
          <button
            type="button"
            className="inline-flex items-center gap-0.5 rounded hover:bg-accent/60 px-1 py-0.5 transition-colors"
            title="View revision history"
            onClick={(e) => { e.stopPropagation(); setRevisionSheetOpen(true); }}
          >
            <History className="h-3 w-3" />
            v{doc.latestRevisionNumber}
          </button>
          <span>·</span>
          <span>{updatedLabel}{actor && ` by ${actor}`}</span>
        </span>
      </button>

      {/* Revision history sheet */}
      <RevisionHistorySheet
        issueId={issueId}
        documentKey={doc.key}
        documentTitle={doc.title}
        open={revisionSheetOpen}
        onOpenChange={setRevisionSheetOpen}
      />

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

// ─── Document key presets ─────────────────────────────────────────────────────

const DOCUMENT_KEY_PRESETS = [
  { value: "plan", label: "Plan" },
  { value: "design", label: "Design" },
  { value: "notes", label: "Notes" },
  { value: "spec", label: "Spec" },
  { value: "custom", label: "Custom…" },
] as const;

// ─── CreateDocumentDialog ─────────────────────────────────────────────────────

interface CreateDocumentDialogProps {
  issueId: string;
  existingKeys: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateDocumentDialog({ issueId, existingKeys, open, onOpenChange }: CreateDocumentDialogProps) {
  const queryClient = useQueryClient();
  const [selectedPreset, setSelectedPreset] = useState<string>("notes");
  const [customKey, setCustomKey] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const isCustom = selectedPreset === "custom";
  const effectiveKey = isCustom ? customKey.trim().toLowerCase().replace(/\s+/g, "_") : selectedPreset;
  const alreadyExists = existingKeys.includes(effectiveKey);

  const createMutation = useMutation({
    mutationFn: () => documentsApi.upsert(issueId, effectiveKey, { body, title: title || undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.documents(issueId) });
      onOpenChange(false);
      // reset form
      setSelectedPreset("notes");
      setCustomKey("");
      setTitle("");
      setBody("");
    },
  });

  const canSubmit = effectiveKey.length > 0 && body.trim().length > 0 && !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            New Document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Key preset buttons */}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {DOCUMENT_KEY_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setSelectedPreset(preset.value)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                    selectedPreset === preset.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-accent/40",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {isCustom && (
              <input
                className="mt-2 w-full rounded border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="e.g. architecture, api-spec"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                autoFocus
              />
            )}
            {alreadyExists && effectiveKey && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                A document with key "{effectiveKey}" already exists — saving will overwrite it.
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
              Title <span className="font-normal">(optional)</span>
            </label>
            <input
              className="w-full rounded border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="e.g. Implementation Plan"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Content</label>
            <textarea
              className="w-full rounded border bg-background px-3 py-1.5 text-sm resize-none min-h-[140px] focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Write document content…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {createMutation.isError && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              Failed to create document. Try again.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => createMutation.mutate()} disabled={!canSubmit}>
            {createMutation.isPending ? "Creating…" : alreadyExists ? "Overwrite" : "Create Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── IssueDocuments ───────────────────────────────────────────────────────────

export function IssueDocuments({ issueId, className }: IssueDocumentsProps) {
  const [createOpen, setCreateOpen] = useState(false);
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

  const existingKeys = docs?.map((d) => d.key) ?? [];

  if (!docs || docs.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-muted-foreground gap-2", className)}>
        <FileText className="h-8 w-8 opacity-40" />
        <p className="text-sm">No documents yet</p>
        <p className="text-xs opacity-70">Documents created by agents will appear here</p>
        <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New Document
        </Button>
        <CreateDocumentDialog
          issueId={issueId}
          existingKeys={existingKeys}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
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
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New Document
        </Button>
      </div>
      {sorted.map((doc) => (
        <DocumentCard key={doc.key} doc={doc} issueId={issueId} />
      ))}
      <CreateDocumentDialog
        issueId={issueId}
        existingKeys={existingKeys}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
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
