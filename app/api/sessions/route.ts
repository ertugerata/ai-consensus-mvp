import { NextRequest, NextResponse } from 'next/server';
import { getAllSessions, saveSession } from '@/lib/db';
import { CreateSessionSchema } from '@/lib/types';
import { checkRateLimit, getTokenHash, verifyApiToken } from '@/lib/security';

export const dynamic = 'force-dynamic';
const MAX_REQUEST_BODY_SIZE = 1 * 1024 * 1024; // 1 MB payload limit

export async function GET(req: NextRequest) {
  if (!verifyApiToken(req)) {
    return NextResponse.json({ error: 'Erişim yetkisiz. Geçerli API erişim token\'ı gereklidir.' }, { status: 401 });
  }

  if (checkRateLimit(req, 30)) {
    return NextResponse.json({ error: 'Çok fazla istek gönderildi.' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const tokenHash = getTokenHash(req);

    const result = getAllSessions(page, limit, tokenHash);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error('Session listesi alınamadı:', error);
    return NextResponse.json(
      { error: 'Session listesi alınırken veritabanı hatası oluştu.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!verifyApiToken(req)) {
    return NextResponse.json({ error: 'Erişim yetkisiz. Geçerli API erişim token\'ı gereklidir.' }, { status: 401 });
  }

  if (checkRateLimit(req, 20)) {
    return NextResponse.json({ error: 'Çok fazla istek gönderildi.' }, { status: 429 });
  }

  try {
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_BODY_SIZE) {
      return NextResponse.json({ error: 'İstek gövdesi izin verilen 1 MB sınırını aşıyor.' }, { status: 413 });
    }

    const textBody = await req.text();
    if (textBody.length > MAX_REQUEST_BODY_SIZE) {
      return NextResponse.json({ error: 'İstek gövdesi izin verilen 1 MB sınırını aşıyor.' }, { status: 413 });
    }

    let jsonBody: unknown;
    try {
      jsonBody = JSON.parse(textBody);
    } catch {
      return NextResponse.json({ error: 'Geçersiz JSON gövdesi.' }, { status: 400 });
    }

    const parseResult = CreateSessionSchema.safeParse(jsonBody);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json({ error: `Girdi doğrulama hatası: ${errorMessage}` }, { status: 400 });
    }

    const body = parseResult.data;
    const sessionId = body.id || crypto.randomUUID();
    const tokenHash = getTokenHash(req);

    const session = saveSession({
      id: sessionId,
      tokenHash,
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
    if (msg.startsWith('403')) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
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
