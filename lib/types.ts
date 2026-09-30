import { z } from 'zod';

export const ProviderSchema = z.enum(['openai', 'anthropic', 'gemini', 'openrouter', 'ollama']);
export type ProviderType = z.infer<typeof ProviderSchema>;

export const AgentConfigSchema = z.object({
  id: z.string().optional(),
  name: z.string().max(100).optional(),
  provider: ProviderSchema,
  model: z.string().min(1, 'Model adı boş olamaz').max(150),
  systemPrompt: z.string().max(10000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const ApiKeysSchema = z.object({
  openai: z.string().optional(),
  anthropic: z.string().optional(),
  gemini: z.string().optional(),
  openrouter: z.string().optional(),
});
export type ApiKeys = z.infer<typeof ApiKeysSchema>;

export const ConfigStateSchema = z.object({
  agentA: AgentConfigSchema,
  agentB: AgentConfigSchema,
  agentC: AgentConfigSchema,
  referee: AgentConfigSchema,
});
export type ConfigState = z.infer<typeof ConfigStateSchema>;

export const UsageMetricsSchema = z.object({
  promptTokens: z.number().optional(),
  completionTokens: z.number().optional(),
  totalTokens: z.number().optional(),
});
export type UsageMetrics = z.infer<typeof UsageMetricsSchema>;

export const ExecutionStatusSchema = z.enum(['fulfilled', 'rejected', 'skipped']);
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

export const AgentExecutionResultSchema = z.object({
  agentId: z.string(),
  agentName: z.string(),
  provider: ProviderSchema,
  model: z.string(),
  text: z.string(),
  status: ExecutionStatusSchema,
  error: z.string().optional(),
  latencyMs: z.number().optional(),
  usage: UsageMetricsSchema.optional(),
});
export type AgentExecutionResult = z.infer<typeof AgentExecutionResultSchema>;

export const MultiStageResultsSchema = z.object({
  stage1Divergence: z.record(z.string(), AgentExecutionResultSchema),
  stage2CrossReview: z.record(z.string(), AgentExecutionResultSchema).optional(),
  stage3Synthesis: AgentExecutionResultSchema,
  totalLatencyMs: z.number(),
});
export type MultiStageResults = z.infer<typeof MultiStageResultsSchema>;

export const RequestBodySchema = z.object({
  prompt: z.string().min(1, 'Soru boş olamaz').max(20000, 'Soru 20.000 karakterden uzun olamaz'),
  memory: z.string().max(200000, 'Hafıza 200.000 karakterden uzun olamaz').optional().default(''),
  evaluationCriteria: z.string().max(20000, 'Kriterler 20.000 karakterden uzun olamaz').optional().default(''),
  apiKeys: ApiKeysSchema.optional().default({}),
  config: ConfigStateSchema,
  enableCrossReview: z.boolean().optional().default(true),
});
export type ConsensusRequestPayload = z.infer<typeof RequestBodySchema>;
