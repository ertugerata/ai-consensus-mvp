import { ConfigState, ProviderType } from '../types';

export const PROVIDER_MODEL_PRESETS: Record<ProviderType, string[]> = {
  openai: [
    'gpt-4o-mini',
    'gpt-4o',
    'o3-mini',
    'o1-mini',
    'o1',
  ],
  anthropic: [
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
  ],
  gemini: [
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ],
  openrouter: [
    'anthropic/claude-3.7-sonnet',
    'anthropic/claude-3.5-sonnet',
    'deepseek/deepseek-r1',
    'openai/gpt-4o-mini',
    'openai/gpt-4o',
    'google/gemini-2.0-flash-001',
    'meta-llama/llama-3.3-70b-instruct',
    'qwen/qwen-2.5-72b-instruct',
  ],
  ollama: [
    'llama3.3',
    'llama3.1',
    'deepseek-r1',
    'qwen2.5',
    'mistral',
    'phi4',
  ],
};

export const DEFAULT_SYSTEM_PROMPTS = {
  agentA: 'Sen analitik ve mantık odaklı bir AI asistanısın. Konuyu tarafsız, veriye dayalı ve adım adım inceleyerek açık yanıt ver.',
  agentB: 'Sen yaratıcı ve eleştirel düşünen bir AI asistanısın. Farklı bakış açılarını, potansiyel riskleri ve alternatif çözümleri vurgula.',
  agentC: 'Sen pratik, çözüm ve uygulama odaklı bir AI asistanısın. Somut örnekler, en iyi uygulamalar ve uygulanabilir adımlar sun.',
  referee: 'Sen bağımsız bir Hakem ve Konsensüs Ajanısın. Tüm ajanların yanıtlarını ve eleştirilerini nesnel şekilde sentezleyerek nihai konsensüs raporunu oluştur.',
};

export const DEFAULT_CONFIG: ConfigState = {
  agents: [
    {
      id: 'agent_1',
      name: 'Ajan 1',
      provider: 'openai',
      model: 'gpt-4o-mini',
      systemPrompt: DEFAULT_SYSTEM_PROMPTS.agentA,
      temperature: 0.7,
    },
    {
      id: 'agent_2',
      name: 'Ajan 2',
      provider: 'anthropic',
      model: 'claude-3-7-sonnet-20250219',
      systemPrompt: DEFAULT_SYSTEM_PROMPTS.agentB,
      temperature: 0.7,
    },
    {
      id: 'agent_3',
      name: 'Ajan 3',
      provider: 'openrouter',
      model: 'deepseek/deepseek-r1',
      systemPrompt: DEFAULT_SYSTEM_PROMPTS.agentC,
      temperature: 0.7,
    },
  ],
  referee: {
    id: 'referee',
    name: 'Hakem Ajanı',
    provider: 'openrouter',
    model: 'anthropic/claude-3.7-sonnet',
    systemPrompt: DEFAULT_SYSTEM_PROMPTS.referee,
    temperature: 0.3,
  },
};
