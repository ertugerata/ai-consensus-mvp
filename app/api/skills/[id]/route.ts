import { NextRequest, NextResponse } from 'next/server';
import { getSkillById, saveSkill, deleteSkill } from '@/lib/skills';
import { verifyApiToken } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyApiToken(req)) {
    return NextResponse.json({ error: 'Erişim yetkisiz.' }, { status: 401 });
  }

  const { id } = await params;
  const skill = getSkillById(id);

  if (!skill) {
    return NextResponse.json({ error: 'Beceri bulunamadı.' }, { status: 404 });
  }

  return NextResponse.json({ skill });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyApiToken(req)) {
    return NextResponse.json({ error: 'Erişim yetkisiz.' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const json = await req.json();
    const content = json.content;
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'İçerik boş olamaz.' }, { status: 400 });
    }

    const saved = saveSkill(id, content, {
      name: json.name,
      description: json.description,
    });

    return NextResponse.json({ success: true, skill: saved });
  } catch (err: unknown) {
    console.error(`Beceri güncellenemedi (${id}):`, err);
    return NextResponse.json({ error: 'Beceri güncellenemedi.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyApiToken(req)) {
    return NextResponse.json({ error: 'Erişim yetkisiz.' }, { status: 401 });
  }

  const { id } = await params;
  const success = deleteSkill(id);

  if (!success) {
    return NextResponse.json({ error: 'Beceri silinemedi veya bulunamadı.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, id });
}
