export type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama';

export interface AgentConfig {
  id?: string;
  name?: string;
  provider: ProviderType;
  model: string;
  systemPrompt?: string;
  temperature?: number;
}

export interface ApiKeys {
  openai?: string;
  anthropic?: string;
  gemini?: string;
  openrouter?: string;
  ollamaBaseUrl?: string;
}

export interface ConfigState {
  agentA: AgentConfig;
  agentB: AgentConfig;
  agentC: AgentConfig;
  referee: AgentConfig;
}

export interface UsageMetrics {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AgentExecutionResult {
  agentId: string;
  agentName: string;
  provider: ProviderType;
  model: string;
  text: string;
  status: 'fulfilled' | 'rejected';
  error?: string;
  latencyMs?: number;
  usage?: UsageMetrics;
}

export interface StageOutput {
  stage: number;
  stageName: string;
  results: Record<string, AgentExecutionResult>;
}

export interface MultiStageResults {
  stage1Divergence: Record<string, AgentExecutionResult>;
  stage2CrossReview?: Record<string, AgentExecutionResult>;
  stage3Synthesis: AgentExecutionResult;
  totalLatencyMs: number;
}

export interface ConsensusRequestPayload {
  prompt: string;
  memory?: string;
  evaluationCriteria?: string;
  apiKeys?: ApiKeys;
  config: ConfigState;
  enableCrossReview?: boolean;
}
