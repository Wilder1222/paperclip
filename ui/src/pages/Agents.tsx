import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "@/lib/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentsApi, type OrgNode } from "../api/agents";
import { heartbeatsApi } from "../api/heartbeats";
import { useCompany } from "../context/CompanyContext";
import { useDialogActions } from "../context/DialogContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useSidebar } from "../context/SidebarContext";
import { useToastActions } from "../context/ToastContext";
import { queryKeys } from "../lib/queryKeys";
import { StatusBadge } from "../components/StatusBadge";
import { agentStatusDot, agentStatusDotDefault } from "../lib/status-colors";
import { EntityRow } from "../components/EntityRow";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { relativeTime, cn, agentRouteRef, agentUrl } from "../lib/utils";
import { PageTabBar } from "../components/PageTabBar";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Plus, List, GitBranch, SlidersHorizontal, ArchiveRestore, UserPlus } from "lucide-react";
import { AGENT_ROLE_LABELS, type Agent, type CompanyStaffBenchEntry } from "@paperclipai/shared";

import { getAdapterLabel } from "../adapters/adapter-display-registry";

const roleLabels = AGENT_ROLE_LABELS as Record<string, string>;

type FilterTab = "all" | "active" | "paused" | "error";

function matchesFilter(status: string, tab: FilterTab, showTerminated: boolean): boolean {
    if (status === "terminated") return showTerminated;
    if (tab === "all") return true;
    if (tab === "active") return status === "active" || status === "running" || status === "idle";
    if (tab === "paused") return status === "paused";
    if (tab === "error") return status === "error";
    return true;
}

function filterAgents(agents: Agent[], tab: FilterTab, showTerminated: boolean): Agent[] {
    return agents
        .filter((a) => matchesFilter(a.status, tab, showTerminated))
        .sort((a, b) => a.name.localeCompare(b.name));
}

function filterOrgTree(nodes: OrgNode[], tab: FilterTab, showTerminated: boolean): OrgNode[] {
    return nodes
        .reduce<OrgNode[]>((acc, node) => {
            const filteredReports = filterOrgTree(node.reports, tab, showTerminated);
            if (matchesFilter(node.status, tab, showTerminated) || filteredReports.length > 0) {
                acc.push({ ...node, reports: filteredReports });
            }
            return acc;
        }, [])
        .sort((a, b) => a.name.localeCompare(b.name));
}

export function Agents() {
    const { selectedCompanyId } = useCompany();
    const { openNewAgent } = useDialogActions();
    const { setBreadcrumbs } = useBreadcrumbs();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const location = useLocation();
    const { isMobile } = useSidebar();
    const { pushToast } = useToastActions();
    const pathSegment = location.pathname.split("/").pop() ?? "all";
    const tab: FilterTab = (pathSegment === "all" || pathSegment === "active" || pathSegment === "paused" || pathSegment === "error") ? pathSegment : "all";
    const [view, setView] = useState<"list" | "org">("org");
    const forceListView = isMobile;
    const effectiveView: "list" | "org" = forceListView ? "list" : view;
    const [showTerminated, setShowTerminated] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [benchName, setBenchName] = useState("");
    const [benchTitle, setBenchTitle] = useState("");
    const [benchAdapterType, setBenchAdapterType] = useState<CompanyStaffBenchEntry["adapterType"]>("codex_local");

    const { data: agents, isLoading, error } = useQuery({
        queryKey: queryKeys.agents.list(selectedCompanyId!),
        queryFn: () => agentsApi.list(selectedCompanyId!),
        enabled: !!selectedCompanyId,
    });

    const { data: benchEntries, isLoading: benchLoading } = useQuery({
        queryKey: queryKeys.agents.bench(selectedCompanyId!),
        queryFn: () => agentsApi.listBench(selectedCompanyId!),
        enabled: !!selectedCompanyId,
    });

    const { data: orgTree } = useQuery({
        queryKey: queryKeys.org(selectedCompanyId!),
        queryFn: () => agentsApi.org(selectedCompanyId!),
        enabled: !!selectedCompanyId && effectiveView === "org",
    });

    const { data: runs } = useQuery({
        queryKey: [...queryKeys.liveRuns(selectedCompanyId!), "agents-page"],
        queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
        enabled: !!selectedCompanyId,
        refetchInterval: 15_000,
    });

    // Map agentId -> first live run + live run count
    const liveRunByAgent = useMemo(() => {
        const map = new Map<string, { runId: string; liveCount: number }>();
        for (const r of runs ?? []) {
            if (r.status !== "running" && r.status !== "queued") continue;
            const existing = map.get(r.agentId);
            if (existing) {
                existing.liveCount += 1;
                continue;
            }
            map.set(r.agentId, { runId: r.id, liveCount: 1 });
        }
        return map;
    }, [runs]);

    const agentMap = useMemo(() => {
        const map = new Map<string, Agent>();
        for (const a of agents ?? []) map.set(a.id, a);
        return map;
    }, [agents]);

    const createBenchEntry = useMutation({
        mutationFn: () =>
            agentsApi.createBenchEntry(selectedCompanyId!, {
                name: benchName.trim(),
                role: "general",
                title: benchTitle.trim() || null,
                adapterType: benchAdapterType,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.agents.bench(selectedCompanyId!) });
            setBenchName("");
            setBenchTitle("");
            pushToast({
                title: "Added to reserve bench",
                body: "Reserve staff can now be activated into the company when needed.",
                tone: "success",
            });
        },
        onError: (mutationError) => {
            pushToast({
                title: "Failed to add reserve staff",
                body: mutationError instanceof Error ? mutationError.message : "Unknown error",
                tone: "error",
            });
        },
    });

    const activateBenchEntry = useMutation({
        mutationFn: (entryId: string) => agentsApi.activateBenchEntry(selectedCompanyId!, entryId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.agents.bench(selectedCompanyId!) });
            queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(selectedCompanyId!) });
            queryClient.invalidateQueries({ queryKey: queryKeys.org(selectedCompanyId!) });
            pushToast({
                title: "Reserve staff activated",
                body: "The bench entry has been promoted into the active company roster.",
                tone: "success",
            });
        },
        onError: (mutationError) => {
            pushToast({
                title: "Failed to activate reserve staff",
                body: mutationError instanceof Error ? mutationError.message : "Unknown error",
                tone: "error",
            });
        },
    });

    useEffect(() => {
        setBreadcrumbs([{ label: "Agents" }]);
    }, [setBreadcrumbs]);

    if (!selectedCompanyId) {
        return <EmptyState icon={Bot} message="Select a company to view agents." />;
    }

    if (isLoading) {
        return <PageSkeleton variant="list" />;
    }

    const filtered = filterAgents(agents ?? [], tab, showTerminated);
    const filteredOrg = filterOrgTree(orgTree ?? [], tab, showTerminated);
    const reserveBench = (benchEntries ?? []).slice().sort((left, right) => left.name.localeCompare(right.name));

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Tabs value={tab} onValueChange={(v) => navigate(`/agents/${v}`)}>
                    <PageTabBar
                        items={[
                            { value: "all", label: "All" },
                            { value: "active", label: "Active" },
                            { value: "paused", label: "Paused" },
                            { value: "error", label: "Error" },
                        ]}
                        value={tab}
                        onValueChange={(v) => navigate(`/agents/${v}`)}
                    />
                </Tabs>
                <div className="flex items-center gap-2">
                    {/* Filters */}
                    <div className="relative">
                        <button
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1.5 text-xs transition-colors border border-border",
                                filtersOpen || showTerminated ? "text-foreground bg-accent" : "text-muted-foreground hover:bg-accent/50"
                            )}
                            onClick={() => setFiltersOpen(!filtersOpen)}
                        >
                            <SlidersHorizontal className="h-3 w-3" />
                            Filters
                            {showTerminated && <span className="ml-0.5 px-1 bg-foreground/10 rounded text-[10px]">1</span>}
                        </button>
                        {filtersOpen && (
                            <div className="absolute right-0 top-full mt-1 z-50 w-48 border border-border bg-popover shadow-md p-1">
                                <button
                                    className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-left hover:bg-accent/50 transition-colors"
                                    onClick={() => setShowTerminated(!showTerminated)}
                                >
                                    <span className={cn(
                                        "flex items-center justify-center h-3.5 w-3.5 border border-border rounded-sm",
                                        showTerminated && "bg-foreground"
                                    )}>
                                        {showTerminated && <span className="text-background text-[10px] leading-none">&#10003;</span>}
                                    </span>
                                    Show terminated
                                </button>
                            </div>
                        )}
                    </div>
                    {/* View toggle */}
                    {!forceListView && (
                        <div className="flex items-center border border-border">
                            <button
                                className={cn(
                                    "p-1.5 transition-colors",
                                    effectiveView === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"
                                )}
                                onClick={() => setView("list")}
                            >
                                <List className="h-3.5 w-3.5" />
                            </button>
                            <button
                                className={cn(
                                    "p-1.5 transition-colors",
                                    effectiveView === "org" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"
                                )}
                                onClick={() => setView("org")}
                            >
                                <GitBranch className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                    <Button size="sm" variant="outline" onClick={openNewAgent}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        New Agent
                    </Button>
                </div>
            </div>

            {filtered.length > 0 && (
                <p className="text-xs text-muted-foreground">{filtered.length} agent{filtered.length !== 1 ? "s" : ""}</p>
            )}

            <section className="border border-border bg-card/60">
                <div className="flex flex-col gap-4 p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-sm font-medium">Reserve Bench</h2>
                            <p className="text-xs text-muted-foreground">
                                Keep backup staff outside active dispatch, then promote them into the company when needed.
                            </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {reserveBench.length} reserve entr{reserveBench.length === 1 ? "y" : "ies"}
                        </span>
                    </div>

                    <div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_180px_auto]">
                        <Input
                            value={benchName}
                            onChange={(event) => setBenchName(event.target.value)}
                            placeholder="Reserve staff name"
                        />
                        <Input
                            value={benchTitle}
                            onChange={(event) => setBenchTitle(event.target.value)}
                            placeholder="Optional title"
                        />
                        <select
                            className="h-9 border border-border bg-background px-3 text-sm"
                            value={benchAdapterType}
                            onChange={(event) => setBenchAdapterType(event.target.value as CompanyStaffBenchEntry["adapterType"])}
                        >
                            <option value="codex_local">Codex Local</option>
                            <option value="claude_local">Claude Local</option>
                            <option value="cursor">Cursor</option>
                            <option value="gemini_local">Gemini Local</option>
                            <option value="opencode_local">OpenCode Local</option>
                        </select>
                        <Button
                            variant="outline"
                            onClick={() => createBenchEntry.mutate()}
                            disabled={!benchName.trim() || createBenchEntry.isPending}
                        >
                            <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />
                            Add Reserve
                        </Button>
                    </div>

                    <div className="border border-border">
                        {benchLoading ? (
                            <div className="px-3 py-6 text-sm text-muted-foreground">Loading reserve bench…</div>
                        ) : reserveBench.length === 0 ? (
                            <div className="px-3 py-6 text-sm text-muted-foreground">
                                No reserve staff yet. Add backup employees here before promoting them into active work.
                            </div>
                        ) : (
                            reserveBench.map((entry) => {
                                const isReserve = entry.status === "reserve";
                                return (
                                    <div
                                        key={entry.id}
                                        className="flex flex-col gap-3 border-b border-border px-3 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate text-sm font-medium">{entry.name}</span>
                                                <BenchStatusPill status={entry.status} />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {roleLabels[entry.role] ?? entry.role}
                                                {entry.title ? ` - ${entry.title}` : ""}
                                                {` - ${entry.adapterType}`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {entry.activatedAgentId ? (
                                                <span className="text-xs text-muted-foreground">Activated into active roster</span>
                                            ) : null}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={!isReserve || activateBenchEntry.isPending}
                                                onClick={() => activateBenchEntry.mutate(entry.id)}
                                            >
                                                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                                                Activate
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </section>

            {error && <p className="text-sm text-destructive">{error.message}</p>}

            {agents && agents.length === 0 && (
                <EmptyState
                    icon={Bot}
                    message="Create your first agent to get started."
                    action="New Agent"
                    onAction={openNewAgent}
                />
            )}

            {/* List view */}
            {effectiveView === "list" && filtered.length > 0 && (
                <div className="border border-border">
                    {filtered.map((agent) => {
                        return (
                            <EntityRow
                                key={agent.id}
                                title={agent.name}
                                subtitle={`${roleLabels[agent.role] ?? agent.role}${agent.title ? ` - ${agent.title}` : ""}`}
                                to={agentUrl(agent)}
                                className={agent.pausedAt && tab !== "paused" ? "opacity-50" : ""}
                                leading={
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span
                                            className={`absolute inline-flex h-full w-full rounded-full ${agentStatusDot[agent.status] ?? agentStatusDotDefault}`}
                                        />
                                    </span>
                                }
                                trailing={
                                    <div className="flex items-center gap-3">
                                        <span className="sm:hidden">
                                            {liveRunByAgent.has(agent.id) ? (
                                                <LiveRunIndicator
                                                    agentRef={agentRouteRef(agent)}
                                                    runId={liveRunByAgent.get(agent.id)!.runId}
                                                    liveCount={liveRunByAgent.get(agent.id)!.liveCount}
                                                />
                                            ) : (
                                                <StatusBadge status={agent.status} />
                                            )}
                                        </span>
                                        <div className="hidden sm:flex items-center gap-3">
                                            {liveRunByAgent.has(agent.id) && (
                                                <LiveRunIndicator
                                                    agentRef={agentRouteRef(agent)}
                                                    runId={liveRunByAgent.get(agent.id)!.runId}
                                                    liveCount={liveRunByAgent.get(agent.id)!.liveCount}
                                                />
                                            )}
                                            <span className="w-28 whitespace-nowrap text-right font-mono text-xs text-muted-foreground">
                                                {getAdapterLabel(agent.adapterType)}
                                            </span>
                                            <span className="text-xs text-muted-foreground w-16 text-right">
                                                {agent.lastHeartbeatAt ? relativeTime(agent.lastHeartbeatAt) : "—"}
                                            </span>
                                            <span className="w-20 flex justify-end">
                                                <StatusBadge status={agent.status} />
                                            </span>
                                        </div>
                                    </div>
                                }
                            />
                        );
                    })}
                </div>
            )}

            {effectiveView === "list" && agents && agents.length > 0 && filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                    No agents match the selected filter.
                </p>
            )}

            {/* Org chart view */}
            {effectiveView === "org" && filteredOrg.length > 0 && (
                <div className="border border-border py-1">
                    {filteredOrg.map((node) => (
                        <OrgTreeNode key={node.id} node={node} depth={0} agentMap={agentMap} liveRunByAgent={liveRunByAgent} tab={tab} />
                    ))}
                </div>
            )}

            {effectiveView === "org" && orgTree && orgTree.length > 0 && filteredOrg.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                    No agents match the selected filter.
                </p>
            )}

            {effectiveView === "org" && orgTree && orgTree.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                    No organizational hierarchy defined.
                </p>
            )}
        </div>
    );
}

function BenchStatusPill({ status }: { status: CompanyStaffBenchEntry["status"] }) {
    const tone =
        status === "reserve"
            ? "bg-muted text-muted-foreground"
            : status === "activated"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300";

    return (
        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", tone)}>
            {status === "reserve" ? "Reserve" : status === "activated" ? "Activated" : "Archived"}
        </span>
    );
}

function OrgTreeNode({
    node,
    depth,
    agentMap,
    liveRunByAgent,
    tab,
}: {
    node: OrgNode;
    depth: number;
    agentMap: Map<string, Agent>;
    liveRunByAgent: Map<string, { runId: string; liveCount: number }>;
    tab: FilterTab;
}) {
    const agent = agentMap.get(node.id);

    const statusColor = agentStatusDot[node.status] ?? agentStatusDotDefault;

    return (
        <div style={{ paddingLeft: depth * 24 }}>
            <Link
                to={agent ? agentUrl(agent) : `/agents/${node.id}`}
                className={cn("flex items-center gap-3 px-3 py-2 hover:bg-accent/30 transition-colors w-full text-left no-underline text-inherit", agent?.pausedAt && tab !== "paused" && "opacity-50")}
            >
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className={`absolute inline-flex h-full w-full rounded-full ${statusColor}`} />
                </span>
                <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{node.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                        {roleLabels[node.role] ?? node.role}
                        {agent?.title ? ` - ${agent.title}` : ""}
                    </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <span className="sm:hidden">
                        {liveRunByAgent.has(node.id) ? (
                            <LiveRunIndicator
                                agentRef={agent ? agentRouteRef(agent) : node.id}
                                runId={liveRunByAgent.get(node.id)!.runId}
                                liveCount={liveRunByAgent.get(node.id)!.liveCount}
                            />
                        ) : (
                            <StatusBadge status={node.status} />
                        )}
                    </span>
                    <div className="hidden sm:flex items-center gap-3">
                        {liveRunByAgent.has(node.id) && (
                            <LiveRunIndicator
                                agentRef={agent ? agentRouteRef(agent) : node.id}
                                runId={liveRunByAgent.get(node.id)!.runId}
                                liveCount={liveRunByAgent.get(node.id)!.liveCount}
                            />
                        )}
                        {agent && (
                            <>
                                <span className="w-28 whitespace-nowrap text-right font-mono text-xs text-muted-foreground">
                                    {getAdapterLabel(agent.adapterType)}
                                </span>
                                <span className="text-xs text-muted-foreground w-16 text-right">
                                    {agent.lastHeartbeatAt ? relativeTime(agent.lastHeartbeatAt) : "—"}
                                </span>
                            </>
                        )}
                        <span className="w-20 flex justify-end">
                            <StatusBadge status={node.status} />
                        </span>
                    </div>
                </div>
            </Link>
            {node.reports && node.reports.length > 0 && (
                <div className="border-l border-border/50 ml-4">
                    {node.reports.map((child) => (
                        <OrgTreeNode key={child.id} node={child} depth={depth + 1} agentMap={agentMap} liveRunByAgent={liveRunByAgent} tab={tab} />
                    ))}
                </div>
            )}
        </div>
    );
}

function LiveRunIndicator({
    agentRef,
    runId,
    liveCount,
}: {
    agentRef: string;
    runId: string;
    liveCount: number;
}) {
    return (
        <Link
            to={`/agents/${agentRef}/runs/${runId}`}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 transition-colors no-underline"
            onClick={(e) => e.stopPropagation()}
        >
            <span className="relative flex h-2 w-2">
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                Live{liveCount > 1 ? ` (${liveCount})` : ""}
            </span>
        </Link>
    );
}
