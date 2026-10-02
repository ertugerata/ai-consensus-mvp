import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, deleteSessionById } from '@/lib/db';
import { checkRateLimit, verifyApiToken } from '@/lib/security';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const IdParamSchema = z.string().uuid('Geçersiz Session ID formatı (UUID olmalıdır).');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (checkRateLimit(req, 30)) {
    return NextResponse.json({ error: 'Çok fazla istek gönderildi.' }, { status: 429 });
  }

  if (!verifyApiToken(req)) {
    return NextResponse.json({ error: 'Erişim yetkisiz. Geçerli API erişim token\'ı gereklidir.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const parseResult = IdParamSchema.safeParse(id);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 });
    }

    const session = getSessionById(id);
    if (!session) {
      return NextResponse.json({ error: 'Session bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json({ session }, { status: 200 });
  } catch (error: unknown) {
    console.error('Session getirme hatası:', error);
    return NextResponse.json(
      { error: 'Session getirilirken hata oluştu.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (checkRateLimit(req, 20)) {
    return NextResponse.json({ error: 'Çok fazla istek gönderildi.' }, { status: 429 });
  }

  if (!verifyApiToken(req)) {
    return NextResponse.json({ error: 'Erişim yetkisiz. Geçerli API erişim token\'ı gereklidir.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const parseResult = IdParamSchema.safeParse(id);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 });
    }

    const deleted = deleteSessionById(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Session bulunamadı veya silinemedi.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Session başarıyla silindi.' }, { status: 200 });
  } catch (error: unknown) {
    console.error('Session silme hatası:', error);
    return NextResponse.json(
      { error: 'Session silinirken hata oluştu.' },
      { status: 500 }
    );
  }
}
