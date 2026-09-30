import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { LanguageModelV1 } from 'ai';

export function createGoogleModel(apiKey: string, modelName: string): LanguageModelV1 {
  const provider = createGoogleGenerativeAI({ apiKey });
  return provider(modelName);
}
