import { NextResponse } from 'next/server';
import { getAllSessions, saveSession } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.prompt || !body.config || !body.results) {
      return NextResponse.json(
        { error: 'Eksik parametreler (prompt, config ve results zorunludur).' },
        { status: 400 }
      );
    }

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
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error: unknown) {
    console.error('Session kaydedilemedi:', error);
    return NextResponse.json(
      { error: 'Session kaydedilirken sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
