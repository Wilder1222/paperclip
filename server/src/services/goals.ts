import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { goals, issues } from "@paperclipai/db";
import type { GoalProgress, IssueStatusCounts } from "@paperclipai/shared";

type GoalReader = Pick<Db, "select">;

export async function getDefaultCompanyGoal(db: GoalReader, companyId: string) {
    const activeRootGoal = await db
        .select()
        .from(goals)
        .where(
            and(
                eq(goals.companyId, companyId),
                eq(goals.level, "company"),
                eq(goals.status, "active"),
                isNull(goals.parentId),
            ),
        )
        .orderBy(asc(goals.createdAt))
        .then((rows) => rows[0] ?? null);
    if (activeRootGoal) return activeRootGoal;

    const anyRootGoal = await db
        .select()
        .from(goals)
        .where(
            and(
                eq(goals.companyId, companyId),
                eq(goals.level, "company"),
                isNull(goals.parentId),
            ),
        )
        .orderBy(asc(goals.createdAt))
        .then((rows) => rows[0] ?? null);
    if (anyRootGoal) return anyRootGoal;

    return db
        .select()
        .from(goals)
        .where(and(eq(goals.companyId, companyId), eq(goals.level, "company")))
        .orderBy(asc(goals.createdAt))
        .then((rows) => rows[0] ?? null);
}

export function goalService(db: Db) {
    function buildStatusCounts(rows: { status: string; assigneeAgentId: string | null }[]): IssueStatusCounts {
        const counts = { total: 0, backlog: 0, in_progress: 0, done: 0, cancelled: 0 };
        for (const row of rows) {
            counts.total++;
            if (row.status === "in_progress") counts.in_progress++;
            else if (row.status === "done") counts.done++;
            else if (row.status === "cancelled") counts.cancelled++;
            else counts.backlog++;
        }
        const percentDone = counts.total === 0 ? 0 : Math.round((counts.done / counts.total) * 100);
        return { ...counts, percentDone };
    }

    return {
        list: (companyId: string) => db.select().from(goals).where(eq(goals.companyId, companyId)),

        getById: (id: string) =>
            db
                .select()
                .from(goals)
                .where(eq(goals.id, id))
                .then((rows) => rows[0] ?? null),

        getDefaultCompanyGoal: (companyId: string) => getDefaultCompanyGoal(db, companyId),

        getProgress: async (goalId: string): Promise<GoalProgress> => {
            // Get all goals in the sub-tree (BFS using in-memory traversal)
            const allCompanyGoals = await db.select({ id: goals.id, parentId: goals.parentId }).from(goals);
            const goalSet = new Set<string>([goalId]);
            let changed = true;
            while (changed) {
                changed = false;
                for (const g of allCompanyGoals) {
                    if (g.parentId && goalSet.has(g.parentId) && !goalSet.has(g.id)) {
                        goalSet.add(g.id);
                        changed = true;
                    }
                }
            }
            const allGoalIds = [...goalSet];

            const [directIssues, allIssues] = await Promise.all([
                db
                    .select({ status: issues.status, assigneeAgentId: issues.assigneeAgentId })
                    .from(issues)
                    .where(eq(issues.goalId, goalId)),
                db
                    .select({ status: issues.status, assigneeAgentId: issues.assigneeAgentId })
                    .from(issues)
                    .where(inArray(issues.goalId, allGoalIds)),
            ]);

            const activeAgentIds = [
                ...new Set(
                    allIssues
                        .filter((i) => i.status === "in_progress" && i.assigneeAgentId)
                        .map((i) => i.assigneeAgentId as string),
                ),
            ];

            return {
                goalId,
                direct: buildStatusCounts(directIssues),
                total: buildStatusCounts(allIssues),
                activeAgentIds,
            };
        },

        create: (companyId: string, data: Omit<typeof goals.$inferInsert, "companyId">) =>
            db
                .insert(goals)
                .values({ ...data, companyId })
                .returning()
                .then((rows) => rows[0]),

        update: (id: string, data: Partial<typeof goals.$inferInsert>) =>
            db
                .update(goals)
                .set({ ...data, updatedAt: new Date() })
                .where(eq(goals.id, id))
                .returning()
                .then((rows) => rows[0] ?? null),

        remove: (id: string) =>
            db
                .delete(goals)
                .where(eq(goals.id, id))
                .returning()
                .then((rows) => rows[0] ?? null),
    };
}
