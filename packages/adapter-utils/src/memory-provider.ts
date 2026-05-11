export type MemoryMetadata = Record<string, unknown>;

export interface RecallOptions {
    query: string;
    projectId?: string | null;
    topK?: number;
}

export interface MemoryRecallItem {
    id: string;
    content: string;
    metadata: MemoryMetadata;
}

export interface MemoryRecallResult {
    items: MemoryRecallItem[];
}

export interface IngestMetadata {
    projectId?: string | null;
    userId?: string | null;
    tags?: string[];
    runId?: string;
    issueId?: string;
}

export interface IngestResult {
    id: string;
    status: "ok" | "error";
    error?: string;
}

export interface MemoryProvider {
    recall(options: RecallOptions): Promise<MemoryRecallResult>;
    ingest(content: string, metadata: IngestMetadata): Promise<IngestResult>;
    forget?(memoryId: string): Promise<void>;
}
