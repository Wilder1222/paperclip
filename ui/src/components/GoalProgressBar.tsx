import type { IssueStatusCounts } from "@paperclipai/shared";
import { cn } from "../lib/utils";

interface GoalProgressBarProps {
    counts: IssueStatusCounts;
    className?: string;
    /** Show the X / Y done label. Default true. */
    showLabel?: boolean;
    /** Compact mode: narrower bar, smaller text */
    compact?: boolean;
}

export function GoalProgressBar({
    counts,
    className,
    showLabel = true,
    compact = false,
}: GoalProgressBarProps) {
    const { total, backlog, in_progress, done, cancelled, percentDone } = counts;

    if (total === 0) {
        return (
            <span className={cn("text-xs text-muted-foreground", className)}>No issues</span>
        );
    }

    const barHeight = compact ? "h-1.5" : "h-2";

    return (
        <div className={cn("flex flex-col gap-1", className)}>
            {/* Segmented progress bar */}
            <div className={cn("flex w-full overflow-hidden rounded-full bg-muted", barHeight)}>
                {done > 0 && (
                    <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${(done / total) * 100}%` }}
                        title={`${done} done`}
                    />
                )}
                {in_progress > 0 && (
                    <div
                        className="bg-blue-400 transition-all"
                        style={{ width: `${(in_progress / total) * 100}%` }}
                        title={`${in_progress} in progress`}
                    />
                )}
                {backlog > 0 && (
                    <div
                        className="bg-muted-foreground/20 transition-all"
                        style={{ width: `${(backlog / total) * 100}%` }}
                        title={`${backlog} backlog`}
                    />
                )}
                {cancelled > 0 && (
                    <div
                        className="bg-muted-foreground/10 transition-all"
                        style={{ width: `${(cancelled / total) * 100}%` }}
                        title={`${cancelled} cancelled`}
                    />
                )}
            </div>

            {showLabel && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                        <span className="font-medium text-foreground">{done}</span>
                        {" / "}
                        {total} done
                    </span>
                    {in_progress > 0 && (
                        <span className="text-blue-500">{in_progress} active</span>
                    )}
                    <span className="ml-auto font-medium">{percentDone}%</span>
                </div>
            )}
        </div>
    );
}

/** Inline compact version for use in list rows */
export function GoalProgressBadge({ counts }: { counts: IssueStatusCounts }) {
    if (counts.total === 0) return null;
    return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{counts.done}</span>
            <span>/</span>
            <span>{counts.total}</span>
        </span>
    );
}
