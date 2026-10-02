import { NextResponse } from 'next/server';
import { RequestBodySchema } from '@/lib/types';
import { runMultiStageHarness } from '@/lib/harness/engine';
import { saveSession } from '@/lib/db';
import { checkRateLimit, verifyApiToken } from '@/lib/security';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (checkRateLimit(req, 10)) {
    return NextResponse.json(
      { error: 'Çok fazla istek gönderildi. Lütfen bir dakika bekledikten sonra tekrar deneyin.' },
      { status: 429 }
    );
  }

  if (!verifyApiToken(req)) {
    return NextResponse.json(
      { error: 'Erişim yetkisiz. Geçerli API erişim token\'ı gereklidir.' },
      { status: 401 }
    );
  }

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
      const errorMessage = parseResult.error.issues.map((e) => e.message).join(', ');
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
    let sessionSaved = false;
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
        allowOverwrite: true,
      });
      sessionSaved = true;
    } catch (dbErr) {
      console.error('Session veritabanına kaydedilirken hata oluştu:', dbErr);
      sessionSaved = false;
    }
    harnessResults.sessionSaved = sessionSaved;

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
