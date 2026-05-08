// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { GoalProgressBar, GoalProgressBadge } from "./GoalProgressBar";
import type { IssueStatusCounts } from "@paperclipai/shared";

function makeContainer() {
    const container = document.createElement("div");
    document.body.appendChild(container);
    return container;
}

function makeCounts(overrides: Partial<IssueStatusCounts> = {}): IssueStatusCounts {
    const base: IssueStatusCounts = {
        total: 0,
        backlog: 0,
        in_progress: 0,
        done: 0,
        cancelled: 0,
        percentDone: 0,
        ...overrides,
    };
    if (!("percentDone" in overrides) && base.total > 0) {
        base.percentDone = Math.round((base.done / base.total) * 100);
    }
    return base;
}

describe("GoalProgressBar", () => {
    it("shows 'No issues' when total is 0", async () => {
        const container = makeContainer();
        const root = createRoot(container);
        await act(async () => {
            root.render(<GoalProgressBar counts={makeCounts()} />);
        });
        expect(container.textContent).toContain("No issues");
        root.unmount();
        container.remove();
    });

    it("shows done / total label", async () => {
        const container = makeContainer();
        const root = createRoot(container);
        const counts = makeCounts({ total: 5, done: 3, backlog: 2, percentDone: 60 });
        await act(async () => {
            root.render(<GoalProgressBar counts={counts} />);
        });
        expect(container.textContent).toContain("3");
        expect(container.textContent).toContain("5");
        expect(container.textContent).toContain("60%");
        root.unmount();
        container.remove();
    });

    it("shows active count when in_progress > 0", async () => {
        const container = makeContainer();
        const root = createRoot(container);
        const counts = makeCounts({ total: 4, done: 1, in_progress: 2, backlog: 1, percentDone: 25 });
        await act(async () => {
            root.render(<GoalProgressBar counts={counts} />);
        });
        expect(container.textContent).toContain("2 active");
        root.unmount();
        container.remove();
    });

    it("hides label when showLabel=false", async () => {
        const container = makeContainer();
        const root = createRoot(container);
        const counts = makeCounts({ total: 3, done: 1, backlog: 2, percentDone: 33 });
        await act(async () => {
            root.render(<GoalProgressBar counts={counts} showLabel={false} />);
        });
        // No "done" text should appear
        expect(container.textContent).not.toContain("done");
        root.unmount();
        container.remove();
    });
});

describe("GoalProgressBadge", () => {
    it("returns null when total is 0", async () => {
        const container = makeContainer();
        const root = createRoot(container);
        await act(async () => {
            root.render(<GoalProgressBadge counts={makeCounts()} />);
        });
        expect(container.textContent).toBe("");
        root.unmount();
        container.remove();
    });

    it("shows done / total", async () => {
        const container = makeContainer();
        const root = createRoot(container);
        const counts = makeCounts({ total: 10, done: 4, backlog: 6, percentDone: 40 });
        await act(async () => {
            root.render(<GoalProgressBadge counts={counts} />);
        });
        expect(container.textContent).toContain("4");
        expect(container.textContent).toContain("10");
        root.unmount();
        container.remove();
    });
});
