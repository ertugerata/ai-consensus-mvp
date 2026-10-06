import { z } from 'zod';

export const ProviderSchema = z.enum(['openai', 'anthropic', 'gemini', 'openrouter', 'ollama']);
export type ProviderType = z.infer<typeof ProviderSchema>;

const RESERVED_AGENT_IDS = new Set(['__proto__', 'constructor', 'prototype', 'referee']);

export const AgentConfigSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9_-]{1,40}$/i, "Ajan ID'si yalnızca harf, rakam, tire veya alt çizgi içermeli ve en fazla 40 karakter olmalıdır")
    .refine((val) => !RESERVED_AGENT_IDS.has(val.toLowerCase()), {
      message: 'Ajan ID rezerve edilmiş veya geçersiz bir kelimedir (__proto__, constructor, prototype, referee)',
    })
    .optional(),
  name: z.string().max(100).optional(),
  provider: ProviderSchema,
  model: z.string().min(1, 'Model adı boş olamaz').max(150),
  skill: z.string().max(100).optional(),
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
  agents: z.array(AgentConfigSchema).min(2, 'En az 2 ajan tanımlanmalıdır').max(10, 'En fazla 10 ajan tanımlanabilir').optional(),
  /** @deprecated AgentA, AgentB, AgentC legacy format for backwards compatibility */
  agentA: AgentConfigSchema.optional(),
  /** @deprecated AgentA, AgentB, AgentC legacy format for backwards compatibility */
  agentB: AgentConfigSchema.optional(),
  /** @deprecated AgentA, AgentB, AgentC legacy format for backwards compatibility */
  agentC: AgentConfigSchema.optional(),
  referee: AgentConfigSchema,
}).superRefine((data, ctx) => {
  const primaryAgents = getPrimaryAgents(data);
  if (!primaryAgents || primaryAgents.length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'En az 2 geçerli birincil ajan tanımlanmalıdır.',
      path: ['agents'],
    });
    return;
  }

  if (primaryAgents.length > 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'En fazla 10 birincil ajan tanımlanabilir.',
      path: ['agents'],
    });
    return;
  }

  const ids = new Set<string>();
  for (let i = 0; i < primaryAgents.length; i++) {
    const ag = primaryAgents[i];
    const agentId = ag.id || `agent_${i + 1}`;
    if (agentId === 'referee') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `'referee' ID'si rezerve edilmiştir ve birincil ajanlar tarafından kullanılamaz.`,
        path: ['agents', i, 'id'],
      });
    }
    if (ids.has(agentId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Ajan ID'si benzersiz olmalıdır: '${agentId}' çakışıyor.`,
        path: ['agents', i, 'id'],
      });
    }
    ids.add(agentId);
  }
});

export type ConfigState = z.infer<typeof ConfigStateSchema>;

export function getPrimaryAgents(config: ConfigState): AgentConfig[] {
  if (config.agents && Array.isArray(config.agents) && config.agents.length >= 2) {
    return config.agents.map((ag, idx) => ({
      ...ag,
      id: ag.id || `agent_${idx + 1}`,
      name: ag.name || `Ajan ${idx + 1}`,
    }));
  }

  // Deprecated fallback for agentA/B/C legacy configuration
  const legacyAgents: AgentConfig[] = [];
  if (config.agentA) legacyAgents.push({ ...config.agentA, id: config.agentA.id || 'agentA', name: config.agentA.name || 'Ajan A' });
  if (config.agentB) legacyAgents.push({ ...config.agentB, id: config.agentB.id || 'agentB', name: config.agentB.name || 'Ajan B' });
  if (config.agentC) legacyAgents.push({ ...config.agentC, id: config.agentC.id || 'agentC', name: config.agentC.name || 'Ajan C' });

  if (legacyAgents.length >= 2) return legacyAgents;

  return [];
}

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
  sessionId: z.string().optional(),
  sessionSaved: z.boolean().optional(),
  stage1Divergence: z.record(z.string().max(40), AgentExecutionResultSchema),
  stage2CrossReview: z.record(z.string().max(40), AgentExecutionResultSchema).optional(),
  stage3Synthesis: AgentExecutionResultSchema,
  totalLatencyMs: z.number(),
});
export type MultiStageResults = z.infer<typeof MultiStageResultsSchema>;

export const RequestBodySchema = z.object({
  sessionId: z.string().uuid('sessionId geçerli bir UUID olmalıdır').optional(),
  title: z.string().max(200).optional(),
  prompt: z.string().min(1, 'Soru boş olamaz').max(20000, 'Soru 20.000 karakterden uzun olamaz'),
  memory: z.string().max(200000, 'Hafıza 200.000 karakterden uzun olamaz').optional().default(''),
  evaluationCriteria: z.string().max(20000, 'Kriterler 20.000 karakterden uzun olamaz').optional().default(''),
  apiKeys: ApiKeysSchema.optional().default({}),
  config: ConfigStateSchema,
  enableCrossReview: z.boolean().optional().default(true),
});
export type ConsensusRequestPayload = z.infer<typeof RequestBodySchema>;

export const CreateSessionSchema = z.object({
  id: z.string().uuid('Session ID geçerli bir UUID olmalıdır').optional(),
  title: z.string().max(200, 'Başlık en fazla 200 karakter olabilir').optional(),
  prompt: z.string().min(1, 'Prompt boş olamaz').max(20000, 'Prompt en fazla 20.000 karakter olabilir'),
  memory: z.string().max(200000, 'Hafıza en fazla 200.000 karakter olabilir').optional().default(''),
  evaluationCriteria: z.string().max(20000, 'Kriterler en fazla 20.000 karakter olabilir').optional().default(''),
  config: ConfigStateSchema,
  enableCrossReview: z.boolean().optional().default(true),
  results: MultiStageResultsSchema,
  allowOverwrite: z.boolean().optional().default(false),
});
export type CreateSessionPayload = z.infer<typeof CreateSessionSchema>;
