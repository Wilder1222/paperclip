# Improvement Notes: Session 003 — Issue Documents UI

**Branch:** feat_agent_artifacts  
**Session:** 003  
**Date:** 2026-05-08

---

## Lessons Learned

### 1. Always check if shared types already exist before creating new type files

**Problem:** Created `packages/shared/src/types/document.ts` with `IssueDocument` and `IssueDocumentSummary`, but these types already existed in `issue.ts`. This caused TS2300 duplicate identifier errors across `types/index.ts`, `src/index.ts`, and downstream consumers (`IssueDocumentsSection.tsx`, `document-revisions.ts`, storybook stories).

**Root Cause:** Didn't search `packages/shared/src/types/` for existing type definitions before creating new ones.

**Fix:** Before creating any new type file, run `grep_search` for the type name across `packages/shared/src/types/` to confirm it doesn't already exist.

**Rule:** In the `@paperclipai/shared` package, types related to an entity (e.g., `Issue`) live in that entity's file (`issue.ts`). Do not create separate files for sub-entity types.

---

### 2. TypeScript incremental build cache can mask duplicate-removal fixes

**Problem:** After removing `document.ts` and fixing exports, one run of `pnpm --filter ui typecheck` showed EXIT 0 but a later run re-showed the duplicate errors. This happened because the TypeScript `tsc -b` incremental build cached the old state.

**Insight:** When dealing with "file deleted" scenarios, the first clean typecheck pass may use cached output. Run typecheck twice or use `tsc -b --force` to ensure the cache is fresh if results seem inconsistent.

---

### 3. `DocumentsTabTrigger` pattern: extract hook-dependent tab items into sub-components

**Pattern Established:** When a `TabsTrigger` needs a React hook (here `useIssueDocumentCount`), extract it into a named sub-component (`DocumentsTabTrigger`) defined above the main page component. This keeps the JSX clean and avoids violating Rules of Hooks by conditionally calling hooks in render.

**Template:**
```tsx
function DocumentsTabTrigger({ issueId }: { issueId: string }) {
  const count = useIssueDocumentCount(issueId);
  return (
    <TabsTrigger value="documents" className="gap-1.5">
      <FileText className="h-3.5 w-3.5" />
      Documents
      {count !== undefined && count > 0 && (
        <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs leading-none">
          {count}
        </span>
      )}
    </TabsTrigger>
  );
}
```
