import type {
    IngestMetadata,
    IngestResult,
    MemoryProvider,
    MemoryRecallResult,
    RecallOptions,
} from "./memory-provider.js";

export interface Mem0MemoryProviderOptions {
    apiKey: string;
    baseUrl?: string;
    projectNamespacePrefix?: string;
    timeoutMs?: number;
}

type Mem0MemoryRecord = {
    id?: string;
    memory?: string;
    text?: string;
    content?: string;
    metadata?: Record<string, unknown>;
};

const DEFAULT_MEM0_BASE_URL = "https://api.mem0.ai/v1";
const DEFAULT_TIMEOUT_MS = 10_000;

function readString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseMem0Items(payload: unknown) {
    const root = typeof payload === "object" && payload !== null
        ? payload as Record<string, unknown>
        : null;
    const data = Array.isArray(root?.items)
        ? root.items
        : Array.isArray(root?.results)
            ? root.results
            : Array.isArray(root?.memories)
                ? root.memories
                : [];

    return data
        .map((entry, index) => {
            const record = typeof entry === "object" && entry !== null
                ? entry as Mem0MemoryRecord
                : null;
            const content =
                readString(record?.memory) ??
                readString(record?.text) ??
                readString(record?.content);
            if (!content) return null;

            return {
                id: readString(record?.id) ?? `mem0-${index + 1}`,
                content,
                metadata: record?.metadata ?? {},
            };
        })
        .filter((item): item is { id: string; content: string; metadata: Record<string, unknown> } => item !== null);
}

export class Mem0MemoryProvider implements MemoryProvider {
    private readonly apiKey: string;
    private readonly baseUrl: string;
    private readonly projectNamespacePrefix: string;
    private readonly timeoutMs: number;

    constructor(options: Mem0MemoryProviderOptions) {
        this.apiKey = options.apiKey;
        this.baseUrl = readString(options.baseUrl) ?? DEFAULT_MEM0_BASE_URL;
        this.projectNamespacePrefix = readString(options.projectNamespacePrefix) ?? "paperclip-project";
        this.timeoutMs = Number.isFinite(options.timeoutMs)
            ? Math.max(1000, Math.floor(options.timeoutMs as number))
            : DEFAULT_TIMEOUT_MS;
    }

    private buildNamespace(projectId: string | null | undefined) {
        const normalized = readString(projectId) ?? "company-global";
        return `${this.projectNamespacePrefix}:${normalized}`;
    }

    private async post(path: string, body: Record<string, unknown>): Promise<unknown> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            const text = await response.text();
            const payload = text.length > 0 ? JSON.parse(text) : {};
            if (!response.ok) {
                throw new Error(`mem0 request failed (${response.status}): ${typeof payload === "object" ? JSON.stringify(payload) : text}`);
            }
            return payload;
        } finally {
            clearTimeout(timer);
        }
    }

    async recall(options: RecallOptions): Promise<MemoryRecallResult> {
        const payload = await this.post("/memories/search", {
            query: options.query,
            top_k: options.topK ?? 5,
            user_id: this.buildNamespace(options.projectId),
            filters: {
                namespace: this.buildNamespace(options.projectId),
            },
        });
        return { items: parseMem0Items(payload) };
    }

    async ingest(content: string, metadata: IngestMetadata): Promise<IngestResult> {
        const payload = await this.post("/memories", {
            text: content,
            user_id: this.buildNamespace(metadata.projectId),
            metadata: {
                namespace: this.buildNamespace(metadata.projectId),
                userId: metadata.userId ?? null,
                tags: metadata.tags ?? [],
                runId: metadata.runId ?? null,
                issueId: metadata.issueId ?? null,
            },
        });

        const root = typeof payload === "object" && payload !== null
            ? payload as Record<string, unknown>
            : null;
        const id = readString(root?.id) ?? readString(root?.memory_id) ?? readString(root?.message) ?? "mem0-ingest";
        return { id, status: "ok" };
    }
}
