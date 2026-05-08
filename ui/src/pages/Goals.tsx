import { useEffect, useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { goalsApi } from "../api/goals";
import { useCompany } from "../context/CompanyContext";
import { useDialogActions } from "../context/DialogContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { GoalTree } from "../components/GoalTree";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Target, Plus } from "lucide-react";
import type { IssueStatusCounts } from "@paperclipai/shared";

export function Goals() {
    const { selectedCompanyId } = useCompany();
    const { openNewGoal } = useDialogActions();
    const { setBreadcrumbs } = useBreadcrumbs();

    useEffect(() => {
        setBreadcrumbs([{ label: "Goals" }]);
    }, [setBreadcrumbs]);

    const { data: goals, isLoading, error } = useQuery({
        queryKey: queryKeys.goals.list(selectedCompanyId!),
        queryFn: () => goalsApi.list(selectedCompanyId!),
        enabled: !!selectedCompanyId,
    });

    const progressQueries = useQueries({
        queries: (goals ?? []).map((goal) => ({
            queryKey: queryKeys.goals.progress(goal.id),
            queryFn: () => goalsApi.getProgress(goal.id),
            enabled: !!goal.id,
        })),
    });

    const progressMap = useMemo(() => {
        const map = new Map<string, IssueStatusCounts>();
        for (let i = 0; i < (goals ?? []).length; i++) {
            const data = progressQueries[i]?.data;
            if (data) map.set(data.goalId, data.total);
        }
        return map;
    }, [goals, progressQueries]);

    if (!selectedCompanyId) {
        return <EmptyState icon={Target} message="Select a company to view goals." />;
    }

    if (isLoading) {
        return <PageSkeleton variant="list" />;
    }

    return (
        <div className="space-y-4">
            {error && <p className="text-sm text-destructive">{error.message}</p>}

            {goals && goals.length === 0 && (
                <EmptyState
                    icon={Target}
                    message="No goals yet."
                    action="Add Goal"
                    onAction={() => openNewGoal()}
                />
            )}

            {goals && goals.length > 0 && (
                <>
                    <div className="flex items-center justify-start">
                        <Button size="sm" variant="outline" onClick={() => openNewGoal()}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            New Goal
                        </Button>
                    </div>
                    <GoalTree goals={goals} goalLink={(goal) => `/goals/${goal.id}`} progressMap={progressMap} />
                </>
            )}
        </div>
    );
}
