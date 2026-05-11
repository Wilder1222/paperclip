import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@/lib/router";
import { BookOpen, Plus, Search } from "lucide-react";
import { knowledgeApi } from "../api/knowledge";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { KbEntrySummary } from "@paperclipai/shared";

const DOC_TYPE_LABELS: Record<string, string> = {
  general: "General",
  runbook: "Runbook",
  adr: "ADR",
  playbook: "Playbook",
  faq: "FAQ",
  postmortem: "Postmortem",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  published: "Published",
  archived: "Archived",
  deprecated: "Deprecated",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "secondary",
  in_review: "outline",
  published: "default",
  archived: "secondary",
  deprecated: "secondary",
};

function EntryCard({ entry }: { entry: KbEntrySummary }) {
  return (
    <Link
      to={`/knowledge/${entry.id}`}
      className="block p-4 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={STATUS_COLORS[entry.status] as any ?? "secondary"} className="text-xs">
              {STATUS_LABELS[entry.status] ?? entry.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {DOC_TYPE_LABELS[entry.docType] ?? entry.docType}
            </Badge>
          </div>
          <h3 className="font-medium text-sm truncate">{entry.title}</h3>
          {entry.summary && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{entry.summary}</p>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {new Date(entry.updatedAt).toLocaleDateString()}
        </span>
      </div>
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {entry.tags.map((tag) => (
            <span key={tag} className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export function KnowledgeLibrary() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [searchQ, setSearchQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("all");

  useEffect(() => {
    setBreadcrumbs([{ label: "Knowledge Library" }]);
  }, [setBreadcrumbs]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQ), 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKeys.knowledge.entries(selectedCompanyId!), statusFilter, docTypeFilter, debouncedQ],
    queryFn: () =>
      knowledgeApi.listEntries(selectedCompanyId!, {
        status: statusFilter === "all" ? undefined : statusFilter,
        docType: docTypeFilter === "all" ? undefined : docTypeFilter,
        q: debouncedQ || undefined,
      }),
    enabled: !!selectedCompanyId,
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={BookOpen} message="Select a company to view the knowledge library." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  const entries = data?.entries ?? [];

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Knowledge Library</h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-32 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="runbook">Runbook</SelectItem>
            <SelectItem value="adr">ADR</SelectItem>
            <SelectItem value="playbook">Playbook</SelectItem>
            <SelectItem value="faq">FAQ</SelectItem>
            <SelectItem value="postmortem">Postmortem</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {entries.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          message={statusFilter === "published"
            ? "No published knowledge entries yet. Switch status to All to inspect drafts."
            : "No knowledge entries found."
          }
        />
      ) : (
        <div className="grid gap-2">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {data && (
        <p className="text-xs text-muted-foreground">
          {data.total} {data.total === 1 ? "entry" : "entries"}
        </p>
      )}
    </div>
  );
}
