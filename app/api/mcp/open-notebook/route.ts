import { NextRequest, NextResponse } from 'next/server';
import { validateApiToken } from '@/lib/security';
import { validateAndPinTargetUrl } from '@/lib/network-security';

export async function POST(req: NextRequest) {
  // 1. Kimlik Doğrulama Kontrolü
  const authResult = validateApiToken(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { baseUrl, endpoint, payload } = body;

    if (!baseUrl || typeof baseUrl !== 'string') {
      return NextResponse.json({ error: 'baseUrl parametresi zorunludur.' }, { status: 400 });
    }

    const allowPrivate = process.env.ALLOW_PRIVATE_IPS === 'true';

    // 2. SSRF, IPv6 ve DNS Rebinding Koruması ile IP Sabitleme
    const { pinnedUrl, originalHost } = await validateAndPinTargetUrl(baseUrl, allowPrivate);

    // Endpoint sanitization (Sadece izin verilen MCP uç noktalarına geçiş ver)
    const sanitizedEndpoint = (endpoint || '').replace(/^^\/+/, '');
    const allowedEndpoints = ['v1/chat/completions', 'v1/tools/call', 'v1/models'];
    
    if (!allowedEndpoints.includes(sanitizedEndpoint)) {
      return NextResponse.json({ error: 'İzin verilmeyen uç nokta.' }, { status: 403 });
    }

    const targetUrl = `${pinnedUrl}/${sanitizedEndpoint}`;

    // 3. Sabitlenmiş IP'ye İstek Atma (Host Header Orijinal Domain Olarak Ezilir)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s Timeout

    const upstreamResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': originalHost, // DNS Rebinding ve VHost yönlendirmesi için gerekli
      },
      body: JSON.stringify(payload || {}),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 4. Yanıt Boyutu Sınırlaması (Max 2 MB)
    const contentLength = upstreamResponse.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Gelen yanıt boyutu çok büyük (Max 2MB).' }, { status: 413 });
    }

    const data = await upstreamResponse.json();
    return NextResponse.json(data, { status: upstreamResponse.status });

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'İstek zaman aşımına uğradı.' }, { status: 504 });
    }
    return NextResponse.json({ error: error.message || 'MCP Proxy Hatası' }, { status: 500 });
  }
}
