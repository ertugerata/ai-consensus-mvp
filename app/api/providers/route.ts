import { NextResponse } from 'next/server';
import { ProviderType } from '@/lib/types';
import { verifyApiToken } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!verifyApiToken(req)) {
    return NextResponse.json(
      { error: 'Erişim yetkisiz. Geçerli API erişim token\'ı gereklidir.' },
      { status: 401 }
    );
  }

  const configuredProviders: Record<ProviderType, boolean> = {
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
    ollama: !!process.env.OLLAMA_BASE_URL,
  };

  return NextResponse.json({ configuredProviders });
}
