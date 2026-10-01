import { NextResponse } from 'next/server';
import { getSessionById, deleteSessionById } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Session ID gereklidir.' }, { status: 400 });
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
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Session ID gereklidir.' }, { status: 400 });
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
