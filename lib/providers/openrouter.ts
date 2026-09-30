import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModelV1 } from 'ai';

export function createOpenRouterModel(apiKey: string, modelName: string): LanguageModelV1 {
  const provider = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    headers: {
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': 'AI Consensus Multi-Agent Harness',
    },
  });
  return provider(modelName);
}
