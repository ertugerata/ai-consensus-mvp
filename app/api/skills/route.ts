import { NextRequest, NextResponse } from 'next/server';
import { getAllSkills, saveSkill, deleteSkill, getSkillsDirectory } from '@/lib/skills';
import { checkRateLimit, verifyApiToken } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!verifyApiToken(req)) {
    return NextResponse.json(
      { error: 'Erişim yetkisiz. Geçerli API erişim token\'ı gereklidir.' },
      { status: 401 }
    );
  }

  if (checkRateLimit(req, 60)) {
    return NextResponse.json({ error: 'Çok fazla istek gönderildi.' }, { status: 429 });
  }

  try {
    const skills = getAllSkills();
    return NextResponse.json({
      skills,
      directory: 'skills/agents',
      absoluteDirectory: getSkillsDirectory(),
      count: skills.length,
    });
  } catch (err: unknown) {
    console.error('Beceriler alınırken hata oluştu:', err);
    return NextResponse.json(
      { error: 'Beceriler yüklenirken sunucu hatası meydana geldi.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!verifyApiToken(req)) {
    return NextResponse.json(
      { error: 'Erişim yetkisiz. Geçerli API erişim token\'ı gereklidir.' },
      { status: 401 }
    );
  }

  if (checkRateLimit(req, 30)) {
    return NextResponse.json({ error: 'Çok fazla istek gönderildi.' }, { status: 429 });
  }

  try {
    const contentType = req.headers.get('content-type') || '';

    let filename = '';
    let content = '';
    let name: string | undefined;
    let description: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');

      if (!file || typeof file === 'string') {
        return NextResponse.json({ error: 'Geçerli bir .md dosyası seçilmelidir.' }, { status: 400 });
      }

      filename = file.name || 'custom-skill.md';
      content = await file.text();
      name = formData.get('name')?.toString();
      description = formData.get('description')?.toString();
    } else {
      const json = await req.json();
      filename = json.filename || 'custom-skill.md';
      content = json.content || '';
      name = json.name;
      description = json.description;
    }

    if (!content.trim()) {
      return NextResponse.json({ error: 'Beceri içeriği (prompt) boş olamaz.' }, { status: 400 });
    }

    if (content.length > 50000) {
      return NextResponse.json({ error: 'Beceri içeriği en fazla 50.000 karakter olabilir.' }, { status: 400 });
    }

    const savedSkill = saveSkill(filename, content, { name, description });

    return NextResponse.json({
      success: true,
      message: `Beceri başarıyla kaydedildi: skills/agents/${savedSkill.filename}`,
      skill: savedSkill,
    }, { status: 201 });
  } catch (err: unknown) {
    console.error('Beceri kaydedilemedi:', err);
    return NextResponse.json(
      { error: 'Beceri kaydedilirken sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifyApiToken(req)) {
    return NextResponse.json(
      { error: 'Erişim yetkisiz. Geçerli API erişim token\'ı gereklidir.' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Silinecek beceri ID\'si belirtilmelidir.' }, { status: 400 });
    }

    const success = deleteSkill(id);
    if (!success) {
      return NextResponse.json({ error: 'Beceri dosyası bulunamadı veya silinemedi.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id, message: 'Beceri başarıyla silindi.' });
  } catch (err: unknown) {
    console.error('Beceri silinemedi:', err);
    return NextResponse.json({ error: 'Beceri silinirken hata oluştu.' }, { status: 500 });
  }
}
