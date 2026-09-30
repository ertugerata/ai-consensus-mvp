import { createAnthropic } from '@ai-sdk/anthropic';
import { LanguageModelV1 } from 'ai';

export function createAnthropicModel(apiKey: string, modelName: string): LanguageModelV1 {
  const provider = createAnthropic({ apiKey });
  return provider(modelName);
}
