import { LanguageModelV1 } from 'ai';
import { ApiKeys, ProviderType } from '../types';
import { createOpenAIModel } from './openai';
import { createAnthropicModel } from './anthropic';
import { createGoogleModel } from './google';
import { createOpenRouterModel } from './openrouter';
import { createOllamaModel } from './ollama';

export function getEffectiveApiKey(provider: ProviderType, apiKeys: ApiKeys = {}): string | null {
  switch (provider) {
    case 'openai':
      return apiKeys.openai || process.env.OPENAI_API_KEY || null;
    case 'anthropic':
      return apiKeys.anthropic || process.env.ANTHROPIC_API_KEY || null;
    case 'gemini':
      return apiKeys.gemini || process.env.GEMINI_API_KEY || null;
    case 'openrouter':
      return apiKeys.openrouter || process.env.OPENROUTER_API_KEY || null;
    case 'ollama':
      return apiKeys.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    default:
      return null;
  }
}

export function getAgentModelInstance(
  provider: ProviderType,
  modelName: string,
  apiKeys: ApiKeys = {}
): LanguageModelV1 | null {
  const keyOrUrl = getEffectiveApiKey(provider, apiKeys);
  if (!keyOrUrl) return null;

  try {
    switch (provider) {
      case 'openai':
        return createOpenAIModel(keyOrUrl, modelName);
      case 'anthropic':
        return createAnthropicModel(keyOrUrl, modelName);
      case 'gemini':
        return createGoogleModel(keyOrUrl, modelName);
      case 'openrouter':
        return createOpenRouterModel(keyOrUrl, modelName);
      case 'ollama':
        return createOllamaModel(keyOrUrl, modelName);
      default:
        return null;
    }
  } catch (err) {
    console.error(`Error initializing model for provider [${provider}]:`, err);
    return null;
  }
}
