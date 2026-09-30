import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModelV1 } from 'ai';

export function createOllamaModel(baseUrl: string, modelName: string): LanguageModelV1 {
  const normalizedBaseUrl = baseUrl.endsWith('/v1')
    ? baseUrl
    : `${baseUrl.replace(/\/$/, '')}/v1`;

  const provider = createOpenAI({
    baseURL: normalizedBaseUrl,
    apiKey: 'ollama', // Ollama doesn't require key, but OpenAI SDK requires string
  });
  return provider(modelName);
}
