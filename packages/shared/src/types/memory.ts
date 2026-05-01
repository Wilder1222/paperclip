export type MemoryScopeType = "company" | "agent";

export type MemoryOperationKind = "ingest" | "recall" | "inspect" | "get" | "forget" | "usage";

export type MemoryOperationStatus = "ok" | "error" | "partial";

export interface MemoryBinding {
  id: string;
  companyId: string;
  scopeType: MemoryScopeType;
  scopeId: string;
  agentId: string | null;
  providerType: string;
  providerConfig: Record<string, unknown>;
  label: string | null;
  isActive: boolean;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryOperation {
  id: string;
  companyId: string;
  bindingId: string;
  agentId: string | null;
  heartbeatRunId: string | null;
  issueId: string | null;
  operationKind: MemoryOperationKind;
  itemCount: number;
  tokenCount: number;
  latencyMs: number | null;
  status: MemoryOperationStatus;
  errorMessage: string | null;
  occurredAt: Date;
  createdAt: Date;
}

export interface MemoryUsageSummary {
  companyId: string;
  bindingId: string;
  providerType: string;
  totalOperations: number;
  totalItemsIngested: number;
  totalRecallCount: number;
  totalTokensUsed: number;
}

export interface CreateMemoryBindingInput {
  scopeType: MemoryScopeType;
  scopeId: string;
  agentId?: string | null;
  providerType: string;
  providerConfig?: Record<string, unknown>;
  label?: string | null;
  isActive?: boolean;
}

export interface UpdateMemoryBindingInput {
  providerConfig?: Record<string, unknown>;
  label?: string | null;
  isActive?: boolean;
}
