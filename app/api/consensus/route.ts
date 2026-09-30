import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runMultiStageHarness } from '@/lib/harness/engine';

export const maxDuration = 60;

const ProviderSchema = z.enum(['openai', 'anthropic', 'gemini', 'openrouter', 'ollama']);

const AgentConfigSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  provider: ProviderSchema,
  model: z.string().min(1, 'Model adı boş olamaz').max(150),
  systemPrompt: z.string().max(10000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

const RequestBodySchema = z.object({
  prompt: z.string().min(1, 'Soru boş olamaz').max(20000, 'Soru 20.000 karakterden uzun olamaz'),
  memory: z.string().max(200000, 'Hafıza 200.000 karakterden uzun olamaz').optional().default(''),
  evaluationCriteria: z.string().max(20000, 'Kriterler 20.000 karakterden uzun olamaz').optional().default(''),
  apiKeys: z.object({
    openai: z.string().optional().default(''),
    anthropic: z.string().optional().default(''),
    gemini: z.string().optional().default(''),
    openrouter: z.string().optional().default(''),
    ollamaBaseUrl: z.string().optional().default(''),
  }).optional().default({}),
  config: z.object({
    agentA: AgentConfigSchema,
    agentB: AgentConfigSchema,
    agentC: AgentConfigSchema,
    referee: AgentConfigSchema,
  }),
  enableCrossReview: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Geçersiz Content-Type, application/json olmalıdır.' },
        { status: 400 }
      );
    }

    let jsonBody: unknown;
    try {
      jsonBody = await req.json();
    } catch {
      return NextResponse.json({ error: 'Geçersiz JSON gövdesi.' }, { status: 400 });
    }

    const parseResult = RequestBodySchema.safeParse(jsonBody);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json({ error: `Girdi doğrulama hatası: ${errorMessage}` }, { status: 400 });
    }

    const { prompt, memory, evaluationCriteria, apiKeys, config, enableCrossReview } = parseResult.data;

    // Run Multi-Stage Harness Pipeline
    const harnessResults = await runMultiStageHarness(
      prompt,
      memory,
      evaluationCriteria,
      apiKeys,
      config,
      enableCrossReview
    );

    // Extract backwards-compatible top-level properties for legacy frontend/API consumers
    const agentA = harnessResults.stage1Divergence.agentA?.text || '';
    const agentB = harnessResults.stage1Divergence.agentB?.text || '';
    const agentC = harnessResults.stage1Divergence.agentC?.text || '';
    const consensus = harnessResults.stage3Synthesis.text || '';

    return NextResponse.json({
      agentA,
      agentB,
      agentC,
      consensus,
      ...harnessResults,
    });
  } catch (error: unknown) {
    console.error('Unhandled server error in /api/consensus:', error);
    return NextResponse.json(
      { error: 'Sunucu tarafında beklenmeyen bir hata oluştu.' },
      { status: 500 }
    );
  }
}
