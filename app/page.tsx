'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  ApiKeys,
  ConfigState,
  ConfigStateSchema,
  MultiStageResults,
  AgentExecutionResult,
  AgentConfig,
  getPrimaryAgents,
} from '@/lib/types';
import {
  DEFAULT_CONFIG,
} from '@/lib/config/agents';
import { Sidebar, SessionListItem } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { PromptForm } from '@/components/PromptForm';
import { ResultsView } from '@/components/ResultsView';
import { SettingsModal } from '@/components/SettingsModal';
import { McpModal, McpNotebookItem } from '@/components/McpModal';

const DEFAULT_KEYS: ApiKeys = {
  openai: '',
  anthropic: '',
  gemini: '',
  openrouter: '',
};

const MAX_MEMORY_CHARS = 200000;

export default function Home() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Active Session State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [memory, setMemory] = useState('');
  const [evaluationCriteria, setEvaluationCriteria] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [openNotebookUrl, setOpenNotebookUrl] = useState('http://localhost:5055');
  const [openNotebookApiKey, setOpenNotebookApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionWarning, setSessionWarning] = useState<string | null>(null);
  const [apiAccessToken, setApiAccessToken] = useState('');
  const [enableCrossReview, setEnableCrossReview] = useState(true);
  const [activeStageTab, setActiveStageTab] = useState<'stage1' | 'stage2' | 'stage3'>('stage3');

  // Open-Notebook MCP Modal State
  const [showMcpModal, setShowMcpModal] = useState(false);
  const [mcpBaseUrl, setMcpBaseUrl] = useState('http://localhost:5055');
  const [mcpApiKey, setMcpApiKey] = useState('');
  const [mcpTesting, setMcpTesting] = useState(false);
  const [mcpTestStatus, setMcpTestStatus] = useState<{ success?: boolean; error?: string; message?: string } | null>(null);
  const [mcpNotebooks, setMcpNotebooks] = useState<McpNotebookItem[]>([]);
  const [mcpLoadingNotebooks, setMcpLoadingNotebooks] = useState(false);
  const [mcpSelectedNotebookId, setMcpSelectedNotebookId] = useState<string | null>(null);
  const [mcpFetchingContent, setMcpFetchingContent] = useState(false);
  const [mcpSearchTerm, setMcpSearchTerm] = useState('');

  const filesInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [apiKeys, setApiKeys] = useState<ApiKeys>(DEFAULT_KEYS);
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG);
  const [stageResults, setStageResults] = useState<MultiStageResults | null>(null);

  const getAuthHeaders = (extraHeaders?: Record<string, string>): Record<string, string> => {
    const headers: Record<string, string> = { ...extraHeaders };
    if (apiAccessToken) {
      headers['Authorization'] = `Bearer ${apiAccessToken}`;
      headers['x-api-token'] = apiAccessToken;
    }
    return headers;
  };

  // Fetch session history from SQLite API
  const fetchSessionsList = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch('/api/sessions', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Session listesi çekilirken hata oluştu:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Load configuration and session list on mount
  useEffect(() => {
    fetchSessionsList();

    try {
      const savedTheme = localStorage.getItem('ai_consensus_theme') as 'dark' | 'light' | null;
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      }

      const savedKeys = localStorage.getItem('ai_consensus_keys');
      if (savedKeys) {
        const parsedKeys = JSON.parse(savedKeys);
        setApiKeys({ ...DEFAULT_KEYS, ...parsedKeys });
      }

      const savedConfig = localStorage.getItem('ai_consensus_config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        const parseResult = ConfigStateSchema.safeParse(parsedConfig);
        if (parseResult.success) {
          setConfig(parseResult.data);
        } else {
          console.warn('Geçersiz konfigürasyon, varsayılan ayarlara dönülüyor:', parseResult.error);
          setConfig(DEFAULT_CONFIG);
        }
      }

      const savedCriteria = localStorage.getItem('ai_consensus_criteria');
      if (savedCriteria) setEvaluationCriteria(savedCriteria);

      const savedMemory = localStorage.getItem('ai_consensus_memory');
      if (savedMemory) setMemory(savedMemory);

      const savedCrossReview = localStorage.getItem('ai_consensus_cross_review');
      if (savedCrossReview !== null) {
        setEnableCrossReview(savedCrossReview === 'true');
      }

      const savedNbUrl = localStorage.getItem('ai_consensus_open_notebook_url');
      if (savedNbUrl) setOpenNotebookUrl(savedNbUrl);

      // Clean up sensitive tokens from localStorage if present
      localStorage.removeItem('ai_consensus_open_notebook_api_key');
      localStorage.removeItem('ai_consensus_api_access_token');
    } catch (err) {
      console.error('localStorage okuma hatası:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync settings modal with browser back button / popstate and Escape key
  useEffect(() => {
    const handlePopState = () => {
      if (showSettings) {
        setShowSettings(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSettings) {
        closeSettings();
      }
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSettings]);

  const openSettings = () => {
    setShowSettings(true);
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({ settingsModal: true }, '');
    }
  };

  const closeSettings = () => {
    setShowSettings(false);
    if (typeof window !== 'undefined' && window.history.state?.settingsModal) {
      window.history.back();
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    try {
      localStorage.setItem('ai_consensus_theme', newTheme);
    } catch (e) {
      console.error('Tema kaydedilemedi:', e);
    }
  };

  const safeSaveStorage = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error(`Storage yazma hatası [${key}]:`, e);
    }
  };

  const saveSettings = () => {
    safeSaveStorage('ai_consensus_keys', JSON.stringify(apiKeys));
    safeSaveStorage('ai_consensus_config', JSON.stringify(config));
    safeSaveStorage('ai_consensus_criteria', evaluationCriteria);
    safeSaveStorage('ai_consensus_memory', memory);
    safeSaveStorage('ai_consensus_cross_review', String(enableCrossReview));
    safeSaveStorage('ai_consensus_open_notebook_url', openNotebookUrl);
    // Remove sensitive tokens from localStorage to prevent token exposure via XSS
    localStorage.removeItem('ai_consensus_open_notebook_api_key');
    localStorage.removeItem('ai_consensus_api_access_token');
    closeSettings();
  };

  // Start New Session (Fresh state)
  const handleNewSession = () => {
    setSessionId(null);
    setPrompt('');
    setStageResults(null);
    setErrorMessage(null);
  };

  // Select a session from history
  const handleSelectSession = async (id: string) => {
    try {
      setErrorMessage(null);
      const res = await fetch(`/api/sessions/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        setErrorMessage('Oturum verisi alınamadı.');
        return;
      }
      const data = await res.json();
      const s = data.session;
      if (s) {
        setSessionId(s.id);
        setPrompt(s.prompt || '');
        setMemory(s.memory || '');
        setEvaluationCriteria(s.evaluationCriteria || '');
        if (s.config) setConfig(s.config);
        setEnableCrossReview(s.enableCrossReview !== false);
        setStageResults(s.results || null);
        setActiveStageTab('stage3');
      }
    } catch (err) {
      console.error('Session seçme hatası:', err);
      setErrorMessage('Oturum yüklenirken hata oluştu.');
    }
  };

  // Delete a session from SQLite database
  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        if (sessionId === id) {
          handleNewSession();
        }
        await fetchSessionsList();
      }
    } catch (err) {
      console.error('Session silme hatası:', err);
    }
  };

  // Open MCP Modal
  const handleOpenMcpModal = () => {
    const targetUrl = openNotebookUrl || 'http://localhost:5055';
    setMcpBaseUrl(targetUrl);
    setMcpApiKey(openNotebookApiKey || '');
    setShowMcpModal(true);
    setMcpTestStatus(null);
    fetchMcpNotebooks(targetUrl, openNotebookApiKey || '');
  };

  // Test MCP Connection
  const handleTestMcpConnection = async () => {
    setMcpTesting(true);
    setMcpTestStatus(null);
    try {
      const res = await fetch('/api/mcp/open-notebook', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          action: 'test',
          baseUrl: mcpBaseUrl,
          apiKey: mcpApiKey,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMcpTestStatus({ success: true, message: data.message || 'Bağlantı başarılı!' });
        fetchMcpNotebooks(mcpBaseUrl, mcpApiKey);
      } else {
        setMcpTestStatus({ success: false, error: data.error || 'Bağlantı kurulamadı.' });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMcpTestStatus({ success: false, error: 'Ağ hatası: ' + errMsg });
    } finally {
      setMcpTesting(false);
    }
  };

  // Fetch Notebooks via MCP
  const fetchMcpNotebooks = async (url: string, key: string) => {
    setMcpLoadingNotebooks(true);
    try {
      const res = await fetch('/api/mcp/open-notebook', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          action: 'list_notebooks',
          baseUrl: url,
          apiKey: key,
        }),
      });
      const data = await res.json();
      if (res.ok && data.notebooks) {
        setMcpNotebooks(data.notebooks);
      } else {
        setMcpTestStatus({ success: false, error: data.error || 'Notebook listesi çekilemedi' });
      }
    } catch (err: unknown) {
      console.error('MCP Notebooks error:', err);
    } finally {
      setMcpLoadingNotebooks(false);
    }
  };

  // Import selected Notebook content into memory or prompt
  const handleImportNotebookContent = async (target: 'memory' | 'prompt') => {
    if (!mcpSelectedNotebookId) return;
    setMcpFetchingContent(true);
    try {
      const res = await fetch('/api/mcp/open-notebook', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          action: 'get_notebook',
          baseUrl: mcpBaseUrl,
          apiKey: mcpApiKey,
          notebookId: mcpSelectedNotebookId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.content) {
        const textToInsert = data.content;
        if (target === 'prompt') {
          setPrompt((prev) => (prev ? `${prev}\n\n${textToInsert}` : textToInsert));
        } else {
          setMemory((prev) => {
            const updated = prev ? `${prev}\n\n${textToInsert}` : textToInsert;
            safeSaveStorage('ai_consensus_memory', updated);
            return updated;
          });
        }
        setShowMcpModal(false);
      } else {
        setErrorMessage(data.error || 'Notebook içeriği alınamadı');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setErrorMessage('İçerik çekme hatası: ' + errMsg);
    } finally {
      setMcpFetchingContent(false);
    }
  };

  // Local Files Upload
  const handleLocalFilesUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let combinedText = '';
    let loadedCount = 0;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          combinedText += `\n\n--- Dosya: ${file.name} ---\n${content}`;
        }
        loadedCount++;
        if (loadedCount === files.length) {
          setMemory((prev) => {
            const updated = prev ? `${prev}${combinedText}` : combinedText.trim();
            safeSaveStorage('ai_consensus_memory', updated);
            return updated;
          });
        }
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  };

  // Local Folder Upload (Directory Tree)
  const handleLocalFolderUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let combinedText = '';
    let loadedCount = 0;

    files.forEach((file) => {
      const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      // Skip hidden files or node_modules
      if (path.includes('/.') || path.includes('node_modules/') || path.includes('.git/')) {
        loadedCount++;
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          combinedText += `\n\n--- Klasör İçi Dosya: ${path} ---\n${content}`;
        }
        loadedCount++;
        if (loadedCount === files.length) {
          setMemory((prev) => {
            const updated = prev ? `${prev}${combinedText}` : combinedText.trim();
            safeSaveStorage('ai_consensus_memory', updated);
            return updated;
          });
        }
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  };

  // Export Full Multi-Stage Report to Markdown
  const handleExportMarkdown = () => {
    if (!stageResults) return;
    const timestamp = new Date().toLocaleString('tr-TR');

    const primaryAgentsList = getPrimaryAgents(config);
    const s1 = stageResults.stage1Divergence || {};
    const s2 = stageResults.stage2CrossReview || {};
    const s3 = stageResults.stage3Synthesis || {};

    const formatAgentResult = (res?: AgentExecutionResult) => {
      if (!res) return 'Yanıt yok';
      if (res.status === 'rejected') return `Hata: ${res.error || 'Ajan yanıt üretirken hata oluştu'}`;
      if (res.status === 'skipped') return `Atlandı: ${res.error || 'İşlem atlandı'}`;
      return res.text || 'Yanıt yok';
    };

    const s1Formatted = primaryAgentsList
      .map((ag) => {
        const res = s1[ag.id || ''] || Object.values(s1).find((r) => r.agentName === ag.name);
        return `### ${ag.name} (${(res?.provider || ag.provider).toUpperCase()} - ${res?.model || ag.model})\n${formatAgentResult(res)}`;
      })
      .join('\n\n');

    const markdownContent = `# Multi-Agent Consensus Oturum Raporu

**Oturum ID:** ${sessionId || 'Yeni Oturum'}
**Tarih:** ${timestamp}
**Toplam Süre (Latency):** ${(stageResults.totalLatencyMs / 1000).toFixed(2)}s

---

## 1. Sorgu ve Bağlam
- **Ana Sorgu:** ${prompt || 'Girilmedi'}
- **Harici Hafıza:** ${memory ? `${memory.slice(0, 300)}...` : 'Yok'}
- **Değerlendirme Kriterleri:** ${evaluationCriteria || 'Varsayılan'}

---

## 2. Aşama 1: Bağımsız Ajan Yanıtları (Divergence)

${s1Formatted}

---

## 3. Aşama 2: Çapraz Eleştiriler (Cross-Review)
${
  s2 && Object.keys(s2).length > 0
    ? Object.entries(s2)
        .map(
          ([, res]) =>
            `### ${res.agentName} Eleştirisi (${res.provider.toUpperCase()} - ${res.model})\n${formatAgentResult(res)}`
        )
        .join('\n\n')
    : 'Aşama 2 (Çapraz Eleştiri) devre dışı bırakıldı veya çalıştırılmadı.'
}

---

## 4. Aşama 3: Hakem Konsensüs Raporu (Synthesis)
**Hakem Model:** ${s3.provider?.toUpperCase() || ''} - ${s3.model || ''}
${formatAgentResult(s3)}
`;

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consensus_session_${sessionId || new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = async () => {
    if (!stageResults) return;
    const s3Text = stageResults.stage3Synthesis?.status === 'fulfilled'
      ? stageResults.stage3Synthesis.text
      : stageResults.stage3Synthesis?.error || '';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(s3Text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = s3Text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Kopyalama hatası:', err);
      setErrorMessage('Pano kopyalama başarısız oldu.');
    }
  };

  const handleSearch = async () => {
    if (!prompt.trim()) return;
    setErrorMessage(null);
    setSessionWarning(null);
    setLoading(true);

    const activeId = sessionId || crypto.randomUUID();
    if (!sessionId) {
      setSessionId(activeId);
    }

    try {
      const res = await fetch('/api/consensus', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          sessionId: activeId,
          title: prompt.slice(0, 60).trim(),
          prompt,
          memory,
          evaluationCriteria,
          apiKeys,
          config,
          enableCrossReview,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.results) {
          setStageResults(data.results);
        }
        setErrorMessage(data.error || `Sunucu hatası: ${res.status}`);
        return;
      }

      setStageResults(data);
      setActiveStageTab('stage3');

      if (data.sessionSaved === false) {
        setSessionWarning('Oturum veritabanına kaydedilemedi (dizin okuma/yazma izni kontrol edilmeli).');
      }

      await fetchSessionsList();
    } catch (err) {
      console.error(err);
      setErrorMessage('Ağ isteği başarısız oldu. Lütfen bağlantınızı ve sunucunuzu kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Agent Add / Remove Handlers
  const handleAddAgent = () => {
    const currentAgents = getPrimaryAgents(config);
    const nextIdx = currentAgents.length + 1;
    const newAgent: AgentConfig = {
      id: `agent_${nextIdx}`,
      name: `Ajan ${nextIdx}`,
      provider: 'openai',
      model: 'gpt-4o-mini',
      systemPrompt: 'Sen analitik ve nesnel bir AI asistanısın.',
      temperature: 0.7,
    };
    setConfig({
      ...config,
      agents: [...currentAgents, newAgent],
    });
  };

  const handleRemoveAgent = (agentId: string) => {
    const currentAgents = getPrimaryAgents(config);
    if (currentAgents.length <= 2) {
      setErrorMessage('En az 2 ana ajan tanımlı olmalıdır.');
      return;
    }
    const updated = currentAgents.filter((a) => a.id !== agentId);
    setConfig({
      ...config,
      agents: updated,
    });
  };

  const handleUpdateAgent = (agentId: string, updatedAgent: Partial<AgentConfig>) => {
    const currentAgents = getPrimaryAgents(config);
    const updated = currentAgents.map((ag) => {
      if (ag.id === agentId) {
        return { ...ag, ...updatedAgent };
      }
      return ag;
    });
    setConfig({
      ...config,
      agents: updated,
    });
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* SIDEBAR */}
      <Sidebar
        isDark={isDark}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        sessions={sessions}
        loadingSessions={loadingSessions}
        sessionId={sessionId}
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
      />

      {/* MAIN CONTAINER */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-72' : 'ml-0'
        }`}
      >
        {/* TOP NAVBAR */}
        <Navbar
          isDark={isDark}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          toggleTheme={toggleTheme}
          showSettings={showSettings}
          openSettings={openSettings}
          closeSettings={closeSettings}
        />

        {/* MAIN BODY AREA */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* ERROR NOTIFICATION BANNER */}
          {errorMessage && (
            <div className="p-4 rounded-xl border border-red-500/50 bg-red-500/10 text-red-400 flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-xs hover:underline font-semibold text-red-300"
              >
                Kapat
              </button>
            </div>
          )}

          {/* SESSION WARNING NOTIFICATION BANNER */}
          {sessionWarning && (
            <div className="p-4 rounded-xl border border-amber-500/50 bg-amber-500/10 text-amber-400 flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0" />
                <span>{sessionWarning}</span>
              </div>
              <button
                onClick={() => setSessionWarning(null)}
                className="text-xs hover:underline font-semibold text-amber-300"
              >
                Kapat
              </button>
            </div>
          )}

          {/* MAIN PROMPT INPUT CARD */}
          <PromptForm
            isDark={isDark}
            prompt={prompt}
            setPrompt={setPrompt}
            memory={memory}
            setMemory={setMemory}
            evaluationCriteria={evaluationCriteria}
            setEvaluationCriteria={setEvaluationCriteria}
            config={config}
            loading={loading}
            filesInputRef={filesInputRef}
            folderInputRef={folderInputRef}
            onOpenMcpModal={handleOpenMcpModal}
            onLocalFilesUpload={handleLocalFilesUpload}
            onLocalFolderUpload={handleLocalFolderUpload}
            onSafeSaveStorage={safeSaveStorage}
            onSearch={handleSearch}
          />

          {/* EXECUTION RESULTS SECTION */}
          {stageResults && (
            <ResultsView
              isDark={isDark}
              sessionId={sessionId}
              stageResults={stageResults}
              config={config}
              enableCrossReview={enableCrossReview}
              activeStageTab={activeStageTab}
              setActiveStageTab={setActiveStageTab}
              onExportMarkdown={handleExportMarkdown}
              onCopyMarkdown={handleCopyMarkdown}
              copied={copied}
            />
          )}
        </main>
      </div>

      {/* SETTINGS MODAL */}
      <SettingsModal
        isDark={isDark}
        showSettings={showSettings}
        closeSettings={closeSettings}
        saveSettings={saveSettings}
        apiKeys={apiKeys}
        setApiKeys={setApiKeys}
        showKeys={showKeys}
        setShowKeys={setShowKeys}
        apiAccessToken={apiAccessToken}
        setApiAccessToken={setApiAccessToken}
        openNotebookUrl={openNotebookUrl}
        setOpenNotebookUrl={setOpenNotebookUrl}
        openNotebookApiKey={openNotebookApiKey}
        setOpenNotebookApiKey={setOpenNotebookApiKey}
        enableCrossReview={enableCrossReview}
        setEnableCrossReview={setEnableCrossReview}
        config={config}
        setConfig={setConfig}
        onAddAgent={handleAddAgent}
        onRemoveAgent={handleRemoveAgent}
        onUpdateAgent={handleUpdateAgent}
      />

      {/* OPEN-NOTEBOOK MCP MODAL */}
      <McpModal
        isDark={isDark}
        showMcpModal={showMcpModal}
        setShowMcpModal={setShowMcpModal}
        mcpBaseUrl={mcpBaseUrl}
        setMcpBaseUrl={setMcpBaseUrl}
        mcpApiKey={mcpApiKey}
        setMcpApiKey={setMcpApiKey}
        mcpTesting={mcpTesting}
        mcpTestStatus={mcpTestStatus}
        mcpNotebooks={mcpNotebooks}
        mcpLoadingNotebooks={mcpLoadingNotebooks}
        mcpSelectedNotebookId={mcpSelectedNotebookId}
        setMcpSelectedNotebookId={setMcpSelectedNotebookId}
        mcpFetchingContent={mcpFetchingContent}
        mcpSearchTerm={mcpSearchTerm}
        setMcpSearchTerm={setMcpSearchTerm}
        onTestMcpConnection={handleTestMcpConnection}
        onImportNotebookContent={handleImportNotebookContent}
      />
    </div>
  );
}
