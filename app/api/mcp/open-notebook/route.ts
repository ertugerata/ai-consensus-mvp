import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const McpRequestSchema = z.object({
  baseUrl: z.string().url('Geçerli bir Open-Notebook IP veya URL adresi girin (örn. http://192.168.1.50:5055)'),
  apiKey: z.string().optional().default(''),
  action: z.enum(['test', 'list_notebooks', 'get_notebook', 'mcp_call']),
  notebookId: z.string().optional(),
  method: z.string().optional(),
  params: z.any().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = McpRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Geçersiz parametreler: ' + parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      );
    }

    const { baseUrl, apiKey, action, notebookId, method, params } = parsed.data;

    // Clean up base URL
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');

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
        const testRes = await fetch(`${cleanBaseUrl}/api/v1/notebooks`, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(6000),
        });

        if (testRes.ok) {
          return NextResponse.json({ success: true, message: 'Open-Notebook sunucusuna başarıyla bağlanıldı.' });
        }

        // Try MCP endpoint or root
        const mcpTest = await fetch(`${cleanBaseUrl}/mcp`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
          signal: AbortSignal.timeout(6000),
        });

        if (mcpTest.ok || mcpTest.status < 500) {
          return NextResponse.json({ success: true, message: 'Open-Notebook MCP endpoint bağlandı.' });
        }

        return NextResponse.json(
          { success: false, error: `Sunucu yanıt verdi ancak durum kodu: ${testRes.status}` },
          { status: 400 }
        );
      } catch (err: any) {
        return NextResponse.json(
          { success: false, error: `Open-Notebook IP adresine ulaşılamadı (${err.message || 'Zaman aşımı / Bağlantı reddedildi'}). Adresi ve ağ erişimini kontrol edin.` },
          { status: 502 }
        );
      }
    }

    // 2. ACTION: LIST NOTEBOOKS
    if (action === 'list_notebooks') {
      try {
        // First try REST API /api/v1/notebooks
        const res = await fetch(`${cleanBaseUrl}/api/v1/notebooks`, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
          const data = await res.json();
          let notebooksList = [];

          if (Array.isArray(data)) {
            notebooksList = data;
          } else if (data.notebooks && Array.isArray(data.notebooks)) {
            notebooksList = data.notebooks;
          } else if (data.data && Array.isArray(data.data)) {
            notebooksList = data.data;
          }

          const formatted = notebooksList.map((nb: any, idx: number) => ({
            id: nb.id || nb.notebook_id || `nb_${idx}`,
            name: nb.name || nb.title || nb.label || `Notebook ${idx + 1}`,
            description: nb.description || nb.summary || '',
            sourcesCount: nb.sources?.length || nb.source_count || 0,
            notesCount: nb.notes?.length || nb.note_count || 0,
            updatedAt: nb.updated_at || nb.created_at || '',
          }));

          return NextResponse.json({ success: true, notebooks: formatted });
        }

        // Fallback: Try MCP list_resources or tools
        const mcpRes = await fetch(`${cleanBaseUrl}/mcp`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'resources/list',
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (mcpRes.ok) {
          const mcpData = await mcpRes.json();
          const resources = mcpData.result?.resources || [];
          const formatted = resources.map((r: any) => ({
            id: r.uri || r.name,
            name: r.name || r.uri,
            description: r.description || '',
          }));
          return NextResponse.json({ success: true, notebooks: formatted });
        }

        return NextResponse.json(
          { error: `Notebook listesi alınamadı (HTTP ${res.status})` },
          { status: res.status }
        );
      } catch (err: any) {
        return NextResponse.json(
          { error: `Open-Notebook sunucusuyla iletişim hatası: ${err.message}` },
          { status: 500 }
        );
      }
    }

    // 3. ACTION: GET NOTEBOOK CONTENT
    if (action === 'get_notebook') {
      if (!notebookId) {
        return NextResponse.json({ error: 'notebookId parametresi zorunludur' }, { status: 400 });
      }

      try {
        // Fetch notebook basic info
        const nbRes = await fetch(`${cleanBaseUrl}/api/v1/notebooks/${notebookId}`, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(12000),
        });

        let title = `Notebook (${notebookId})`;
        let description = '';
        let combinedContent = '';
        let sourcesText = '';
        let notesText = '';

        if (nbRes.ok) {
          const nbData = await nbRes.json();
          title = nbData.name || nbData.title || title;
          description = nbData.description || '';
        }

        // Fetch sources for notebook
        try {
          const sourcesRes = await fetch(`${cleanBaseUrl}/api/v1/notebooks/${notebookId}/sources`, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(10000),
          });
          if (sourcesRes.ok) {
            const sourcesData = await sourcesRes.json();
            const list = Array.isArray(sourcesData) ? sourcesData : sourcesData.sources || [];
            sourcesText = list
              .map((s: any, idx: number) => `--- Kaynak #${idx + 1}: ${s.title || s.name || 'İsimsiz'} ---\n${s.content || s.full_text || s.summary || ''}`)
              .join('\n\n');
          }
        } catch (e) {
          console.warn('Sources endpoint warning:', e);
        }

        // Fetch notes for notebook
        try {
          const notesRes = await fetch(`${cleanBaseUrl}/api/v1/notebooks/${notebookId}/notes`, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(10000),
          });
          if (notesRes.ok) {
            const notesData = await notesRes.json();
            const list = Array.isArray(notesData) ? notesData : notesData.notes || [];
            notesText = list
              .map((n: any, idx: number) => `--- Not #${idx + 1}: ${n.title || 'Not'} ---\n${n.content || n.text || ''}`)
              .join('\n\n');
          }
        } catch (e) {
          console.warn('Notes endpoint warning:', e);
        }

        combinedContent = `=========================================
OPEN-NOTEBOOK: ${title}
=========================================
${description ? `Açıklama: ${description}\n` : ''}

${sourcesText ? `### KAYNAKLAR:\n${sourcesText}\n` : ''}
${notesText ? `### NOTLAR:\n${notesText}\n` : ''}`;

        // If both sources and notes were empty, try MCP read_resource
        if (!sourcesText && !notesText) {
          const mcpRead = await fetch(`${cleanBaseUrl}/mcp`, {
            method: 'POST',
            headers,
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
            const contents = mcpData.result?.contents || [];
            if (contents.length > 0) {
              combinedContent = contents.map((c: any) => c.text || c.blob).join('\n\n');
            }
          }
        }

        return NextResponse.json({
          success: true,
          notebookId,
          title,
          content: combinedContent.trim() || `[Notebook '${title}' içeriği boş veya alınamadı]`,
        });
      } catch (err: any) {
        return NextResponse.json(
          { error: `Notebook içeriği çekilemedi: ${err.message}` },
          { status: 500 }
        );
      }
    }

    // 4. ACTION: GENERIC MCP CALL
    if (action === 'mcp_call') {
      try {
        const mcpRes = await fetch(`${cleanBaseUrl}/mcp`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: method || 'ping',
            params: params || {},
          }),
          signal: AbortSignal.timeout(10000),
        });

        const data = await mcpRes.json();
        return NextResponse.json(data);
      } catch (err: any) {
        return NextResponse.json({ error: `MCP çağrısı başarısız: ${err.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Geçersiz eylem' }, { status: 400 });
  } catch (error: any) {
    console.error('MCP proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Sunucu içi MCP hatası' },
      { status: 500 }
    );
  }
}
