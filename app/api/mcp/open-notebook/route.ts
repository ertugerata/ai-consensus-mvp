import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, resolveAndValidateTarget, verifyApiToken } from '@/lib/security';
import { sanitizeErrorMessage } from '@/lib/harness/utils';

const ALLOWED_MCP_METHODS = [
  'ping',
  'tools/list',
  'tools/call',
  'resources/list',
  'resources/read',
  'prompts/list',
  'prompts/get',
];

const MAX_UPSTREAM_RESPONSE_SIZE = 10 * 1024 * 1024; // 10 MB limit for upstream responses
const MAX_REQUEST_BODY_SIZE = 1 * 1024 * 1024; // 1 MB payload limit

async function fetchWithLimit(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  const contentLength = res.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_UPSTREAM_RESPONSE_SIZE) {
    throw new Error(`Upstream yanıtı izin verilen maksimum boyutu (${MAX_UPSTREAM_RESPONSE_SIZE / (1024 * 1024)} MB) aşıyor.`);
  }
  return res;
}

async function fetchPinned(baseUrl: string, path: string, init?: RequestInit): Promise<Response> {
  const target = await resolveAndValidateTarget(baseUrl, path);
  if (!target.success) {
    throw new Error(target.error);
  }

  const baseHeaders = (init?.headers as Record<string, string>) || {};
  const mergedHeaders: Record<string, string> = {
    ...baseHeaders,
    Host: target.hostHeader,
  };

  return fetchWithLimit(target.pinnedUrl, {
    ...init,
    headers: mergedHeaders,
  });
}

const McpRequestSchema = z.object({
  baseUrl: z
    .string()
    .url('Geçerli bir Open-Notebook IP veya URL adresi girin (örn. http://192.168.1.50:5055)')
    .superRefine((urlStr, ctx) => {
      if (urlStr.includes('?') || urlStr.includes('#') || urlStr.includes('@')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'BaseUrl sorgu (?), fragment (#) veya kullanıcı bilgisi (@) içeremez.',
        });
        return;
      }
      try {
        const parsed = new URL(urlStr);
        if (parsed.pathname !== '/' && parsed.pathname !== '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'BaseUrl yol (path) içeremez; yalnızca origin girilmelidir (örn. http://192.168.1.50:5055).',
          });
        }
        if (parsed.search) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'BaseUrl sorgu parametresi (query) içeremez.',
          });
        }
        if (parsed.hash) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'BaseUrl fragment (#) içeremez.',
          });
        }
        if (parsed.username || parsed.password) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'BaseUrl kullanıcı bilgisi (userinfo) içeremez.',
          });
        }
      } catch {
        // Handled by z.string().url()
      }
    }),
  apiKey: z.string().optional().default(''),
  action: z.enum(['test', 'list_notebooks', 'get_notebook', 'mcp_call']),
  notebookId: z.string().optional(),
  method: z.string().optional(),
  params: z.unknown().optional(),
});

export async function POST(req: NextRequest) {
  if (!verifyApiToken(req)) {
    return NextResponse.json(
      { error: 'Erişim yetkisiz. Geçerli API erişim token\'ı gereklidir.' },
      { status: 401 }
    );
  }

  if (checkRateLimit(req, 15)) {
    return NextResponse.json(
      { error: 'Çok fazla istek gönderildi. Lütfen bir süre sonra tekrar deneyin.' },
      { status: 429 }
    );
  }

  try {
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_BODY_SIZE) {
      return NextResponse.json(
        { error: 'İstek gövdesi izin verilen 1 MB sınırını aşıyor.' },
        { status: 413 }
      );
    }

    const textBody = await req.text();
    if (textBody.length > MAX_REQUEST_BODY_SIZE) {
      return NextResponse.json(
        { error: 'İstek gövdesi izin verilen 1 MB sınırını aşıyor.' },
        { status: 413 }
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(textBody);
    } catch {
      return NextResponse.json({ error: 'Geçersiz JSON gövdesi.' }, { status: 400 });
    }

    const parsed = McpRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Geçersiz parametreler: ' + parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      );
    }

    const { baseUrl, apiKey, action, notebookId, method, params } = parsed.data;

    // Validate target and resolve IP to lock against DNS Rebinding
    const initialTarget = await resolveAndValidateTarget(baseUrl, '/');
    if (!initialTarget.success) {
      return NextResponse.json(
        { error: initialTarget.error },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['X-API-Key'] = apiKey;
    }

    // 1. ACTION: TEST CONNECTION
    if (action === 'test') {
      try {
        const testRes = await fetchPinned(baseUrl, '/api/v1/notebooks', {
          method: 'GET',
          headers,
          redirect: 'error',
          signal: AbortSignal.timeout(6000),
        });

        if (testRes.ok) {
          return NextResponse.json({ success: true, message: 'Open-Notebook sunucusuna başarıyla bağlanıldı.' });
        }

        if (testRes.status === 401 || testRes.status === 403) {
          return NextResponse.json(
            { success: false, error: `Kimlik doğrulama başarısız (HTTP ${testRes.status}). Lütfen API Key değerini kontrol edin.` },
            { status: testRes.status }
          );
        }

        // Try MCP endpoint or root
        const mcpTest = await fetchPinned(baseUrl, '/mcp', {
          method: 'POST',
          headers,
          redirect: 'error',
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
          signal: AbortSignal.timeout(6000),
        });

        if (mcpTest.ok) {
          return NextResponse.json({ success: true, message: 'Open-Notebook MCP endpoint bağlandı.' });
        }

        if (mcpTest.status === 401 || mcpTest.status === 403) {
          return NextResponse.json(
            { success: false, error: `Kimlik doğrulama başarısız (HTTP ${mcpTest.status}). Lütfen API Key değerini kontrol edin.` },
            { status: mcpTest.status }
          );
        }

        return NextResponse.json(
          { success: false, error: `Sunucu yanıt verdi ancak bağlantı doğrulanamadı (HTTP ${testRes.status} / MCP ${mcpTest.status}).` },
          { status: 400 }
        );
      } catch (err: unknown) {
        const errMsg = sanitizeErrorMessage(err);
        return NextResponse.json(
          { success: false, error: `Open-Notebook adresine ulaşılamadı (${errMsg}). Adresi ve ağ erişimini kontrol edin.` },
          { status: 502 }
        );
      }
    }

    // 2. ACTION: LIST NOTEBOOKS
    if (action === 'list_notebooks') {
      try {
        const res = await fetchPinned(baseUrl, '/api/v1/notebooks', {
          method: 'GET',
          headers,
          redirect: 'error',
          signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
          const data = await res.json();
          let notebooksList: Record<string, unknown>[] = [];

          if (Array.isArray(data)) {
            notebooksList = data;
          } else if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).notebooks)) {
            notebooksList = (data as Record<string, unknown>).notebooks as Record<string, unknown>[];
          } else if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).data)) {
            notebooksList = (data as Record<string, unknown>).data as Record<string, unknown>[];
          }

          const formatted = notebooksList.map((nb: Record<string, unknown>, idx: number) => ({
            id: String(nb.id || nb.notebook_id || `nb_${idx}`),
            name: String(nb.name || nb.title || nb.label || `Notebook ${idx + 1}`),
            description: String(nb.description || nb.summary || ''),
            sourcesCount: Array.isArray(nb.sources) ? nb.sources.length : Number(nb.source_count || 0),
            notesCount: Array.isArray(nb.notes) ? nb.notes.length : Number(nb.note_count || 0),
            updatedAt: String(nb.updated_at || nb.created_at || ''),
          }));

          return NextResponse.json({ success: true, notebooks: formatted });
        }

        // Fallback: Try MCP list_resources
        const mcpRes = await fetchPinned(baseUrl, '/mcp', {
          method: 'POST',
          headers,
          redirect: 'error',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'resources/list',
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (mcpRes.ok) {
          const mcpData = await mcpRes.json();
          const resources = Array.isArray(mcpData?.result?.resources) ? mcpData.result.resources : [];
          const formatted = resources.map((r: Record<string, unknown>) => ({
            id: String(r.uri || r.name || ''),
            name: String(r.name || r.uri || ''),
            description: String(r.description || ''),
          }));
          return NextResponse.json({ success: true, notebooks: formatted });
        }

        return NextResponse.json(
          { error: `Notebook listesi alınamadı (HTTP ${res.status})` },
          { status: res.status }
        );
      } catch (err: unknown) {
        const errMsg = sanitizeErrorMessage(err);
        return NextResponse.json(
          { error: `Open-Notebook sunucusuyla iletişim hatası: ${errMsg}` },
          { status: 500 }
        );
      }
    }

    // 3. ACTION: GET NOTEBOOK CONTENT
    if (action === 'get_notebook') {
      if (!notebookId) {
        return NextResponse.json({ error: 'notebookId parametresi zorunludur' }, { status: 400 });
      }

      const encodedNotebookId = encodeURIComponent(notebookId);

      try {
        const nbRes = await fetchPinned(baseUrl, `/api/v1/notebooks/${encodedNotebookId}`, {
          method: 'GET',
          headers,
          redirect: 'error',
          signal: AbortSignal.timeout(12000),
        });

        let title = `Notebook (${notebookId})`;
        let description = '';
        let combinedContent = '';
        let sourcesText = '';
        let notesText = '';

        if (nbRes.ok) {
          const nbData = await nbRes.json();
          title = String(nbData.name || nbData.title || title);
          description = String(nbData.description || '');
        }

        // Fetch sources for notebook
        try {
          const sourcesRes = await fetchPinned(baseUrl, `/api/v1/notebooks/${encodedNotebookId}/sources`, {
            method: 'GET',
            headers,
            redirect: 'error',
            signal: AbortSignal.timeout(10000),
          });
          if (sourcesRes.ok) {
            const sourcesData = await sourcesRes.json();
            const list = Array.isArray(sourcesData) ? sourcesData : Array.isArray(sourcesData?.sources) ? sourcesData.sources : [];
            sourcesText = list
              .map((s: Record<string, unknown>, idx: number) =>
                `--- Kaynak #${idx + 1}: ${String(s.title || s.name || 'İsimsiz')} ---\n${String(s.content || s.full_text || s.summary || '')}`
              )
              .join('\n\n');
          }
        } catch (e) {
          console.warn('Sources endpoint warning:', sanitizeErrorMessage(e));
        }

        // Fetch notes for notebook
        try {
          const notesRes = await fetchPinned(baseUrl, `/api/v1/notebooks/${encodedNotebookId}/notes`, {
            method: 'GET',
            headers,
            redirect: 'error',
            signal: AbortSignal.timeout(10000),
          });
          if (notesRes.ok) {
            const notesData = await notesRes.json();
            const list = Array.isArray(notesData) ? notesData : Array.isArray(notesData?.notes) ? notesData.notes : [];
            notesText = list
              .map((n: Record<string, unknown>, idx: number) =>
                `--- Not #${idx + 1}: ${String(n.title || 'Not')} ---\n${String(n.content || n.text || '')}`
              )
              .join('\n\n');
          }
        } catch (e) {
          console.warn('Notes endpoint warning:', sanitizeErrorMessage(e));
        }

        combinedContent = `=========================================
OPEN-NOTEBOOK: ${title}
=========================================
${description ? `Açıklama: ${description}\n` : ''}

${sourcesText ? `### KAYNAKLAR:\n${sourcesText}\n` : ''}
${notesText ? `### NOTLAR:\n${notesText}\n` : ''}`;

        // If both sources and notes were empty, try MCP read_resource
        if (!sourcesText && !notesText) {
          const mcpRead = await fetchPinned(baseUrl, '/mcp', {
            method: 'POST',
            headers,
            redirect: 'error',
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: Date.now(),
              method: 'resources/read',
              params: { uri: notebookId },
            }),
            signal: AbortSignal.timeout(10000),
          });

          if (mcpRead.ok) {
            const mcpData = await mcpRead.json();
            const contents = Array.isArray(mcpData?.result?.contents) ? mcpData.result.contents : [];
            if (contents.length > 0) {
              combinedContent = contents.map((c: Record<string, unknown>) => String(c.text || c.blob || '')).join('\n\n');
            }
          }
        }

        const trimmedContent = combinedContent.trim().slice(0, 200000);

        return NextResponse.json({
          success: true,
          notebookId,
          title,
          content: trimmedContent || `[Notebook '${title}' içeriği boş veya alınamadı]`,
        });
      } catch (err: unknown) {
        const errMsg = sanitizeErrorMessage(err);
        return NextResponse.json(
          { error: `Notebook içeriği çekilemedi: ${errMsg}` },
          { status: 500 }
        );
      }
    }

    // 4. ACTION: GENERIC MCP CALL
    if (action === 'mcp_call') {
      const selectedMethod = method || 'ping';
      if (!ALLOWED_MCP_METHODS.includes(selectedMethod)) {
        return NextResponse.json(
          { error: `İzin verilmeyen MCP metodu: ${selectedMethod}. İzin verilen metodlar: ${ALLOWED_MCP_METHODS.join(', ')}` },
          { status: 400 }
        );
      }

      try {
        const mcpRes = await fetchPinned(baseUrl, '/mcp', {
          method: 'POST',
          headers,
          redirect: 'error',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: selectedMethod,
            params: params || {},
          }),
          signal: AbortSignal.timeout(10000),
        });

        const data = await mcpRes.json();
        return NextResponse.json(data);
      } catch (err: unknown) {
        const errMsg = sanitizeErrorMessage(err);
        return NextResponse.json({ error: `MCP çağrısı başarısız: ${errMsg}` }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Geçersiz eylem' }, { status: 400 });
  } catch (error: unknown) {
    console.error('MCP proxy error:', error);
    const errMsg = sanitizeErrorMessage(error);
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
