import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModelV1 } from 'ai';

export function createOpenAIModel(apiKey: string, modelName: string): LanguageModelV1 {
  const provider = createOpenAI({ apiKey });
  return provider(modelName);
}
