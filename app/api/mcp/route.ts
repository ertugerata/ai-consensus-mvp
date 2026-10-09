import { NextRequest, NextResponse } from 'next/server';
import { validateApiToken, validateAndPinTargetUrl } from '@/lib/security';

export async function POST(req: NextRequest) {
  // 1. Kimlik Doğrulama Kontrolü
  const authResult = validateApiToken(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, notebookId, serverUrl, apiKey } = body;

    const envBaseUrl = serverUrl || process.env.MCP_SERVER_URL || 'http://localhost:5055';
    const envApiKey = apiKey || process.env.MCP_API_KEY || '';

    const allowPrivate = process.env.ALLOW_PRIVATE_IPS === 'true';

    // 2. SSRF, IPv6 ve DNS Rebinding Koruması ile IP Sabitleme
    const { pinnedUrl, originalHost } = await validateAndPinTargetUrl(envBaseUrl, allowPrivate);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s Timeout

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Host': originalHost,
    };
    if (envApiKey) {
      headers['Authorization'] = `Bearer ${envApiKey}`;
      headers['x-api-key'] = envApiKey;
    }

    let targetUrl = '';
    let fetchOptions: RequestInit = { headers, signal: controller.signal };

    if (action === 'test') {
      targetUrl = `${pinnedUrl}/api/v1/healthcheck`;
      fetchOptions = { ...fetchOptions, method: 'GET' };
    } else if (action === 'list_notebooks') {
      targetUrl = `${pinnedUrl}/api/v1/notebooks`;
      fetchOptions = { ...fetchOptions, method: 'GET' };
    } else if (action === 'get_notebook') {
      if (!notebookId) {
        clearTimeout(timeout);
        return NextResponse.json({ error: 'notebookId parametresi zorunludur.' }, { status: 400 });
      }
      targetUrl = `${pinnedUrl}/api/v1/notebooks/${encodeURIComponent(notebookId)}`;
      fetchOptions = { ...fetchOptions, method: 'GET' };
    } else {
      // Direct endpoint proxy fallback for legacy calls
      const endpoint = (body.endpoint || '').replace(/^\/+/, '');
      const allowedEndpoints = ['v1/chat/completions', 'v1/tools/call', 'v1/models', 'api/v1/notebooks'];

      if (!allowedEndpoints.includes(endpoint)) {
        clearTimeout(timeout);
        return NextResponse.json({ error: 'İzin verilmeyen veya desteklenmeyen eylem.' }, { status: 403 });
      }
      targetUrl = `${pinnedUrl}/${endpoint}`;
      fetchOptions = { ...fetchOptions, method: 'POST', body: JSON.stringify(body.payload || {}) };
    }

    const upstreamResponse = await fetch(targetUrl, {
      ...fetchOptions,
    });

    clearTimeout(timeout);

    // Yanıt Boyutu Sınırlaması (Max 2 MB)
    const maxSizeBytes = 2 * 1024 * 1024;
    const contentLength = upstreamResponse.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
      return NextResponse.json({ error: 'Gelen yanıt boyutu çok büyük (Max 2MB).' }, { status: 413 });
    }

    if (!upstreamResponse.body) {
      const data = await upstreamResponse.json().catch(() => ({}));
      return NextResponse.json(data, { status: upstreamResponse.status });
    }

    // Response body akışını okuyarak 2 MB sınırını garanti altına alma
    const reader = upstreamResponse.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.length;
        if (totalBytes > maxSizeBytes) {
          reader.cancel();
          return NextResponse.json({ error: 'Gelen yanıt boyutu çok büyük (Max 2MB).' }, { status: 413 });
        }
        chunks.push(value);
      }
    }

    const combinedChunks = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      combinedChunks.set(chunk, offset);
      offset += chunk.length;
    }

    const textData = new TextDecoder().decode(combinedChunks);
    let data;
    try {
      data = JSON.parse(textData);
    } catch {
      data = { raw: textData };
    }

    if (action === 'test') {
      return NextResponse.json({ success: upstreamResponse.ok, message: upstreamResponse.ok ? 'MCP sunucu bağlantısı başarılı!' : 'Sunucu yanıt verdi ancak hata döndü.' });
    }

    if (action === 'list_notebooks') {
      const notebooks = Array.isArray(data) ? data : (data.notebooks || data.data || []);
      return NextResponse.json({ notebooks });
    }

    if (action === 'get_notebook') {
      const content = typeof data === 'string' ? data : (data.content || data.formattedText || JSON.stringify(data, null, 2));
      return NextResponse.json({ content });
    }

    return NextResponse.json(data, { status: upstreamResponse.status });

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'İstek zaman aşımına uğradı.' }, { status: 504 });
    }
    return NextResponse.json({ error: error.message || 'MCP Proxy Hatası' }, { status: 500 });
  }
}
