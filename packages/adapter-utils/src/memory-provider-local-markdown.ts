import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type {
    IngestMetadata,
    IngestResult,
    MemoryProvider,
    MemoryRecallResult,
    RecallOptions,
} from "./memory-provider.js";

interface LocalMemoryRecord {
    id: string;
    content: string;
    projectId: string | null;
    tags: string[];
    createdAt: string;
    userId: string | null;
    runId: string | null;
    issueId: string | null;
}

export interface LocalMarkdownMemoryProviderOptions {
    baseDir?: string;
}

const TOKEN_SPLIT_RE = /[^a-zA-Z0-9_\u4e00-\u9fff]+/;

function tokenize(value: string) {
    return value
        .toLowerCase()
        .split(TOKEN_SPLIT_RE)
        .map((token) => token.trim())
        .filter(Boolean);
}

function scoreByTermOverlap(query: string, candidate: string) {
    const queryTerms = new Set(tokenize(query));
    if (queryTerms.size === 0) return 0;
    const candidateTerms = new Set(tokenize(candidate));
    let hits = 0;
    for (const term of queryTerms) {
        if (candidateTerms.has(term)) hits += 1;
    }
    return hits;
}

export class LocalMarkdownMemoryProvider implements MemoryProvider {
    private readonly baseDir: string;

    constructor(options?: LocalMarkdownMemoryProviderOptions) {
        this.baseDir = options?.baseDir ?? path.resolve(os.homedir(), ".paperclip", "memory");
    }

    private resolveProjectDir(projectId: string | null | undefined) {
        const segment = projectId && projectId.trim().length > 0 ? projectId.trim() : "company-global";
        return path.resolve(this.baseDir, "projects", segment);
    }

    private async readRecords(projectId: string | null | undefined): Promise<LocalMemoryRecord[]> {
        const filePath = path.resolve(this.resolveProjectDir(projectId), "items.ndjson");
        let content: string;
        try {
            content = await fs.readFile(filePath, "utf8");
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
            throw error;
        }

        return content
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => JSON.parse(line) as LocalMemoryRecord);
    }

    async recall(options: RecallOptions): Promise<MemoryRecallResult> {
        const records = await this.readRecords(options.projectId);
        const ranked = records
            .map((record) => ({
                record,
                score: scoreByTermOverlap(options.query, `${record.content} ${(record.tags ?? []).join(" ")}`),
            }))
            .filter((entry) => entry.score > 0)
            .sort((left, right) => right.score - left.score)
            .slice(0, Math.max(1, options.topK ?? 5))
            .map(({ record }) => ({
                id: record.id,
                content: record.content,
                metadata: {
                    projectId: record.projectId,
                    tags: record.tags,
                    createdAt: record.createdAt,
                    userId: record.userId,
                    runId: record.runId,
                    issueId: record.issueId,
                },
            }));

        return { items: ranked };
    }

    async ingest(content: string, metadata: IngestMetadata): Promise<IngestResult> {
        const projectDir = this.resolveProjectDir(metadata.projectId);
        const filePath = path.resolve(projectDir, "items.ndjson");
        const id = randomUUID();
        const record: LocalMemoryRecord = {
            id,
            content,
            projectId: metadata.projectId ?? null,
            tags: metadata.tags ?? [],
            createdAt: new Date().toISOString(),
            userId: metadata.userId ?? null,
            runId: metadata.runId ?? null,
            issueId: metadata.issueId ?? null,
        };

        await fs.mkdir(projectDir, { recursive: true });
        await fs.appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
        return { id, status: "ok" };
    }
}
