import { NextRequest, NextResponse } from 'next/server';
import { getAllSessions, saveSession } from '@/lib/db';
import { CreateSessionSchema } from '@/lib/types';
import { checkRateLimit, verifyApiToken } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (checkRateLimit(req, 30)) {
    return NextResponse.json({ error: 'Çok fazla istek gönderildi.' }, { status: 429 });
  }

  if (!verifyApiToken(req)) {
    return NextResponse.json({ error: 'Erişim yetkisiz. Geçerli API erişim token\'ı gereklidir.' }, { status: 401 });
  }

  try {
    const sessions = getAllSessions();
    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error: unknown) {
    console.error('Session listesi alınamadı:', error);
    return NextResponse.json(
      { error: 'Session listesi alınırken hata oluştu.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (checkRateLimit(req, 20)) {
    return NextResponse.json({ error: 'Çok fazla istek gönderildi.' }, { status: 429 });
  }

  if (!verifyApiToken(req)) {
    return NextResponse.json({ error: 'Erişim yetkisiz. Geçerli API erişim token\'ı gereklidir.' }, { status: 401 });
  }

  try {
    const jsonBody = await req.json();
    const parseResult = CreateSessionSchema.safeParse(jsonBody);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json({ error: `Girdi doğrulama hatası: ${errorMessage}` }, { status: 400 });
    }

    const body = parseResult.data;
    const sessionId = body.id || crypto.randomUUID();

    const session = saveSession({
      id: sessionId,
      title: body.title,
      prompt: body.prompt,
      memory: body.memory,
      evaluationCriteria: body.evaluationCriteria,
      config: body.config,
      enableCrossReview: body.enableCrossReview,
      results: body.results,
      allowOverwrite: body.allowOverwrite,
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Session kaydedilemedi';
    if (msg.includes('halihazırda mevcut')) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    console.error('Session kaydedilemedi:', error);
    return NextResponse.json(
      { error: 'Session kaydedilirken sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
