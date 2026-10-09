import type { ConfigState, ProviderType, AgentSkill } from '../types.ts';

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

export type { AgentSkill };

export const AGENT_SKILLS: AgentSkill[] = [
  {
    id: 'analytical',
    name: 'Analitik & Mantık Uzmanı',
    description: 'Konuları tarafsız, veriye dayalı ve adım adım derinlemesine inceler.',
    prompt: 'Sen analitik ve mantık odaklı bir AI asistanısın. Konuyu tarafsız, veriye dayalı ve adım adım inceleyerek açık yanıt ver.',
  },
  {
    id: 'creative',
    name: 'Yaratıcı & Eleştirel Düşünür',
    description: 'Farklı bakış açıları, potansiyel riskler ve alternatif çözümler geliştirir.',
    prompt: 'Sen yaratıcı ve eleştirel düşünen bir AI asistanısın. Farklı bakış açılarını, potansiyel riskleri ve alternatif çözümleri vurgula.',
  },
  {
    id: 'practical',
    name: 'Pratik & Çözüm Odaklı',
    description: 'Somut örnekler, en iyi uygulamalar ve hemen uygulanabilir adımlar sunar.',
    prompt: 'Sen pratik, çözüm ve uygulama odaklı bir AI asistanısın. Somut örnekler, en iyi uygulamalar ve uygulanabilir adımlar sun.',
  },
  {
    id: 'coder',
    name: 'Yazılım & Kodlama Uzmanı',
    description: 'Temiz kod yazımı, mimari tasarım, hata tespiti ve performans optimizasyonuna odaklanır.',
    prompt: 'Sen kıdemli bir yazılım mimarı ve kodlama uzmanısın. Temiz kod (Clean Code), güvenlik, ölçeklenebilirlik ve performans ilkelerine dayanarak somut kod örnekleri ve teknik çözümler sun.',
  },
  {
    id: 'security',
    name: 'Siber Güvenlik & Risk Analisti',
    description: 'Güvenlik açıklarını, zafiyetleri ve sistem risklerini tespit eder.',
    prompt: 'Sen uzman bir siber güvenlik ve risk analistisin. Verilen konuyu, kodları veya mimariyi güvenlik zafiyetleri, veri gizliliği, saldırı yüzeyleri ve risk yönetimi açısından değerlendir.',
  },
  {
    id: 'business',
    name: 'İş Stratejisi & Maliyet Uzmanı',
    description: 'İş modeli, maliyet/fayda analizi ve stratejik planlamaya odaklanır.',
    prompt: 'Sen deneyimli bir iş stratejisti ve yönetim danışmanısın. Konuyu maliyet, ROI, iş modeli, sürdürülebilirlik ve pazar dinamikleri açısından değerlendir.',
  },
  {
    id: 'simplifier',
    name: 'Yalınlaştırıcı & Eğitmen',
    description: 'Karmaşık kavramları en basit ve anlaşılır dille açıklar.',
    prompt: 'Sen karmaşık konuları herkesin anlayabileceği basit ve net bir dille açıklayan uzman bir eğitmensin. Anlaşılır benzetmeler ve sade anlatımlar kullan.',
  },
];

export const DEFAULT_REFEREE_PROMPT = 'Sen bağımsız bir Hakem ve Konsensüs Ajanısın. Tüm ajanların yanıtlarını ve eleştirilerini nesnel şekilde sentezleyerek nihai konsensüs raporunu oluştur.';

export const DEFAULT_CONFIG: ConfigState = {
  agents: [
    {
      id: 'agent_1',
      name: 'Ajan 1',
      provider: 'openai',
      model: 'gpt-4o-mini',
      skill: 'analytical',
      systemPrompt: AGENT_SKILLS[0].prompt,
      temperature: 0.7,
    },
    {
      id: 'agent_2',
      name: 'Ajan 2',
      provider: 'anthropic',
      model: 'claude-3-7-sonnet-20250219',
      skill: 'creative',
      systemPrompt: AGENT_SKILLS[1].prompt,
      temperature: 0.7,
    },
    {
      id: 'agent_3',
      name: 'Ajan 3',
      provider: 'openrouter',
      model: 'deepseek/deepseek-r1',
      skill: 'practical',
      systemPrompt: AGENT_SKILLS[2].prompt,
      temperature: 0.7,
    },
  ],
  referee: {
    id: 'referee',
    name: 'Hakem Ajanı',
    provider: 'openrouter',
    model: 'anthropic/claude-3.7-sonnet',
    systemPrompt: DEFAULT_REFEREE_PROMPT,
    temperature: 0.3,
  },
};
