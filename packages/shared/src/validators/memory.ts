import { z } from "zod";

export const MEMORY_SCOPE_TYPES = ["company", "agent"] as const;
export const MEMORY_OPERATION_KINDS = ["ingest", "recall", "inspect", "get", "forget", "usage"] as const;
export const MEMORY_OPERATION_STATUSES = ["ok", "error", "partial"] as const;

export const createMemoryBindingSchema = z.object({
  scopeType: z.enum(MEMORY_SCOPE_TYPES).default("company"),
  scopeId: z.string().uuid(),
  agentId: z.string().uuid().optional().nullable(),
  providerType: z.string().min(1).max(64),
  providerConfig: z.record(z.unknown()).optional().default({}),
  label: z.string().max(256).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export type CreateMemoryBinding = z.infer<typeof createMemoryBindingSchema>;

export const updateMemoryBindingSchema = z.object({
  providerConfig: z.record(z.unknown()).optional(),
  label: z.string().max(256).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateMemoryBinding = z.infer<typeof updateMemoryBindingSchema>;
