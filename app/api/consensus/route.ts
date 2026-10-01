import { NextResponse } from 'next/server';
import { RequestBodySchema } from '@/lib/types';
import { runMultiStageHarness } from '@/lib/harness/engine';
import { saveSession } from '@/lib/db';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Simple in-memory rate limiter per IP/client
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(clientIp);

  // Clean up stale entries periodically if map grows too large
  if (rateLimitMap.size > 10000) {
    rateLimitMap.clear();
  }

  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  record.count += 1;
  return false;
}

export async function POST(req: Request) {
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
    if (checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Çok fazla istek gönderildi. Lütfen bir dakika bekledikten sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

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

    const {
      sessionId: requestedSessionId,
      title,
      prompt,
      memory,
      evaluationCriteria,
      apiKeys,
      config,
      enableCrossReview,
    } = parseResult.data;

    // Run Multi-Stage Harness Pipeline
    const harnessResults = await runMultiStageHarness(
      prompt,
      memory,
      evaluationCriteria,
      apiKeys,
      config,
      enableCrossReview
    );

    const activeSessionId = requestedSessionId || crypto.randomUUID();
    harnessResults.sessionId = activeSessionId;

    // Save session to SQLite database
    try {
      saveSession({
        id: activeSessionId,
        title: title || prompt.slice(0, 60).trim() || 'Yeni Oturum',
        prompt,
        memory,
        evaluationCriteria,
        config,
        enableCrossReview,
        results: harnessResults,
      });
    } catch (dbErr) {
      console.error('Session veritabanına kaydedilirken hata oluştu:', dbErr);
    }

    // If stage 3 synthesis failed and stage 1 has no fulfilled results, return HTTP 502 error
    if (harnessResults.stage3Synthesis.status === 'rejected') {
      const stage1Fulfilled = Object.values(harnessResults.stage1Divergence).some(
        (r) => r.status === 'fulfilled'
      );
      if (!stage1Fulfilled) {
        return NextResponse.json(
          {
            error: harnessResults.stage3Synthesis.error || 'Tüm ajanlar yanıt üretmekte başarısız oldu.',
            results: harnessResults,
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(harnessResults, { status: 200 });
  } catch (error: unknown) {
    console.error('Unhandled server error in /api/consensus:', error);
    return NextResponse.json(
      { error: 'Sunucu tarafında beklenmeyen bir hata oluştu.' },
      { status: 500 }
    );
  }
}
