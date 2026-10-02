'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import {
  Settings,
  Send,
  Database,
  ClipboardCheck,
  Loader2,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Upload,
  Download,
  FileText,
  Bot,
  Sparkles,
  Check,
  Globe,
  AlertCircle,
  Clock,
  Layers,
  MessageSquare,
  Zap,
  Sliders,
  Server,
  Plus,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  X,
  History,
  ChevronRight,
  BookOpen,
  FolderPlus,
  Folder,
  Search,
} from 'lucide-react';
import {
  ApiKeys,
  ConfigState,
  ConfigStateSchema,
  MultiStageResults,
  AgentExecutionResult,
  AgentConfig,
  getPrimaryAgents,
  ProviderType,
} from '@/lib/types';
import {
  DEFAULT_CONFIG,
  PROVIDER_MODEL_PRESETS,
} from '@/lib/config/agents';

interface SessionListItem {
  id: string;
  title: string;
  prompt: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_KEYS: ApiKeys = {
  openai: '',
  anthropic: '',
  gemini: '',
  openrouter: '',
};

const MAX_PROMPT_CHARS = 20000;
const MAX_MEMORY_CHARS = 200000;
const MAX_CRITERIA_CHARS = 20000;

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
  const [enableCrossReview, setEnableCrossReview] = useState(true);
  const [activeStageTab, setActiveStageTab] = useState<'stage1' | 'stage2' | 'stage3'>('stage3');

  // Open-Notebook MCP Modal State
  const [showMcpModal, setShowMcpModal] = useState(false);
  const [mcpBaseUrl, setMcpBaseUrl] = useState('http://localhost:5055');
  const [mcpApiKey, setMcpApiKey] = useState('');
  const [mcpTesting, setMcpTesting] = useState(false);
  const [mcpTestStatus, setMcpTestStatus] = useState<{ success?: boolean; error?: string; message?: string } | null>(null);
  const [mcpNotebooks, setMcpNotebooks] = useState<any[]>([]);
  const [mcpLoadingNotebooks, setMcpLoadingNotebooks] = useState(false);
  const [mcpSelectedNotebookId, setMcpSelectedNotebookId] = useState<string | null>(null);
  const [mcpFetchingContent, setMcpFetchingContent] = useState(false);
  const [mcpSearchTerm, setMcpSearchTerm] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [apiKeys, setApiKeys] = useState<ApiKeys>(DEFAULT_KEYS);
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG);
  const [stageResults, setStageResults] = useState<MultiStageResults | null>(null);

  // Fetch session history from SQLite API
  const fetchSessionsList = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch('/api/sessions');
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

      const savedNbKey = localStorage.getItem('ai_consensus_open_notebook_api_key');
      if (savedNbKey) setOpenNotebookApiKey(savedNbKey);
    } catch (err) {
      console.error('localStorage okuma hatası:', err);
    }
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
    safeSaveStorage('ai_consensus_open_notebook_api_key', openNotebookApiKey);
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
      const res = await fetch(`/api/sessions/${id}`);
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
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
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

  // Memory File Import
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Dosya boyutu çok büyük (Maksimum 5MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        if (content.length > MAX_MEMORY_CHARS) {
          setErrorMessage(`Dosya ${MAX_MEMORY_CHARS.toLocaleString('tr-TR')} karakter sınırını aşıyor. Sınıra kadar kırpıldı.`);
          const truncated = content.slice(0, MAX_MEMORY_CHARS);
          setMemory(truncated);
          safeSaveStorage('ai_consensus_memory', truncated);
        } else {
          setMemory(content);
          safeSaveStorage('ai_consensus_memory', content);
        }
      }
    };
    reader.onerror = () => {
      setErrorMessage('Dosya okunurken bir hata oluştu.');
    };
    reader.readAsText(file);
    e.target.value = '';
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      const path = (file as any).webkitRelativePath || file.name;
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
    setLoading(true);

    const activeId = sessionId || crypto.randomUUID();
    if (!sessionId) {
      setSessionId(activeId);
    }

    try {
      const res = await fetch('/api/consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const renderExecutionResultText = (res?: AgentExecutionResult) => {
    if (!res) return 'Ajan çıktısı bulunmuyor.';
    if (res.status === 'rejected') {
      return (
        <div className="text-red-400 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertCircle size={14} /> Hata Oluştu
          </div>
          <div>{res.error || 'Bilinmeyen hata'}</div>
        </div>
      );
    }
    if (res.status === 'skipped') {
      return (
        <div className="text-amber-400/90 italic">
          {res.error || 'Aşama atlandı.'}
        </div>
      );
    }
    return res.text || 'Yanıt yok.';
  };

  const isDark = theme === 'dark';
  const primaryAgentsList = getPrimaryAgents(config);

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* SIDEBAR - JULES/GOOGLE INSPIRED */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 flex flex-col transition-transform duration-300 border-r ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'}`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              Oturumlar
            </span>
          </div>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            title="Menüyü Kapat"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* New Session Button */}
        <div className="p-3">
          <button
            onClick={handleNewSession}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs transition-all bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
          >
            <Plus size={16} />
            <span>Yeni Oturum Başlat</span>
          </button>
        </div>

        {/* Saved Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><History size={12} /> Geçmiş Oturumlar</span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full">{sessions.length}</span>
          </div>

          {loadingSessions ? (
            <div className="flex items-center justify-center p-6 text-slate-500 text-xs gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span>Yükleniyor...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 border border-dashed rounded-xl border-slate-800 my-2">
              Henüz kaydedilmiş bir oturum yok.
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = s.id === sessionId;
              const formattedDate = new Date(s.created_at).toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all border ${
                    isActive
                      ? isDark
                        ? 'bg-blue-600/15 border-blue-500/40 text-blue-300 font-medium'
                        : 'bg-blue-50 border-blue-200 text-blue-800 font-medium'
                      : isDark
                      ? 'border-transparent hover:bg-slate-800/60 text-slate-300'
                      : 'border-transparent hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2 space-y-0.5">
                    <p className="truncate text-xs font-semibold leading-tight">
                      {s.title || s.prompt || 'İsimsiz Oturum'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {formattedDate}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-opacity"
                    title="Oturumu Sil"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-72' : 'ml-0'
        }`}
      >
        {/* TOP NAVBAR (JULES / GOOGLE STYLE) */}
        <header
          className={`sticky top-0 z-30 px-4 py-3 border-b flex items-center justify-between backdrop-blur-md ${
            isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80"
                title="Menüyü Aç"
              >
                <PanelLeft size={18} />
              </button>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 bg-clip-text text-transparent">
                  Multi-Agent Harness
                </h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                  Consensus Suite
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Çok Aşamalı Tartışma, Hakem Sentezi ve SQLite Oturum Yönetimi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
              className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-medium ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
              }`}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Gear Icon (Settings Modal Trigger) */}
            <button
              onClick={() => {
                if (showSettings) {
                  closeSettings();
                } else {
                  openSettings();
                }
              }}
              aria-label="Ayarlar panelini aç"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                showSettings
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                  : isDark
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm'
              }`}
            >
              <Settings size={18} className={showSettings ? 'rotate-90 transition-transform duration-300' : ''} />
              <span className="hidden sm:inline">Ayarlar</span>
            </button>
          </div>
        </header>

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

          {/* MAIN PROMPT INPUT CARD */}
          <div
            className={`border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-colors ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="prompt-input" className={`font-semibold text-sm flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  <Bot size={18} className="text-blue-500" /> Soru veya Tartışma Konusu
                </label>
                <span className="text-[11px] font-mono text-slate-500">
                  {prompt.length.toLocaleString('tr-TR')} / {MAX_PROMPT_CHARS.toLocaleString('tr-TR')} karakter
                </span>
              </div>
              <textarea
                id="prompt-input"
                value={prompt}
                maxLength={MAX_PROMPT_CHARS}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ajanların bağımsız olarak yanıtlayıp tartışmasını ve hakemin sentezlemesini istediğiniz soruyu buraya yazın..."
                className={`w-full min-h-[140px] border rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed resize-y ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Quick Context Inputs (Memory & Criteria Collapsible) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                  <label htmlFor="memory-quick" className="text-xs font-semibold flex items-center gap-1.5 text-blue-400">
                    <Database size={14} /> Harici Hafıza / Bağlam
                  </label>

                  {/* Hidden File and Folder Inputs */}
                  <input
                    type="file"
                    ref={filesInputRef}
                    onChange={handleLocalFilesUpload}
                    multiple
                    accept=".txt,.md,.json,.csv,.py,.js,.ts,.tsx,.jsx,.html,.css,.sql,.yml,.yaml,.xml,.log"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={folderInputRef}
                    onChange={handleLocalFolderUpload}
                    {...({ webkitdirectory: '', directory: '' } as any)}
                    multiple
                    className="hidden"
                  />

                  {/* Attachment Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleOpenMcpModal}
                      className="text-[10px] px-2 py-1 rounded border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-semibold flex items-center gap-1 transition-all"
                      title="Open-Notebook sunucusundan notebook seç (MCP)"
                    >
                      <BookOpen size={11} /> Open-Notebook (MCP)
                    </button>
                    <button
                      type="button"
                      onClick={() => filesInputRef.current?.click()}
                      className="text-[10px] px-2 py-1 rounded border border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center gap-1 transition-all"
                      title="Yerelden dosya(lar) seç"
                    >
                      <FileText size={11} /> Dosya
                    </button>
                    <button
                      type="button"
                      onClick={() => folderInputRef.current?.click()}
                      className="text-[10px] px-2 py-1 rounded border border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center gap-1 transition-all"
                      title="Yerelden tüm klasör ağacını seç"
                    >
                      <Folder size={11} /> Klasör
                    </button>
                  </div>
                </div>
                <textarea
                  id="memory-quick"
                  value={memory}
                  onChange={(e) => {
                    setMemory(e.target.value);
                    safeSaveStorage('ai_consensus_memory', e.target.value);
                  }}
                  rows={2}
                  placeholder="İsteğe bağlı ek hafıza/doküman bağlamı..."
                  className={`w-full border rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-600' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="criteria-quick" className="text-xs font-semibold flex items-center gap-1.5 text-emerald-400">
                    <ClipboardCheck size={14} /> Hakem Değerlendirme Kriterleri
                  </label>
                </div>
                <textarea
                  id="criteria-quick"
                  value={evaluationCriteria}
                  onChange={(e) => {
                    setEvaluationCriteria(e.target.value);
                    safeSaveStorage('ai_consensus_criteria', e.target.value);
                  }}
                  rows={2}
                  placeholder="Hakemin kararda göz önünde bulunduracağı özel kriterler..."
                  className={`w-full border rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-600' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Layers size={16} className="text-blue-400" />
                <span>
                  Aktif Ajanlar: {primaryAgentsList.length} Ana Model + Hakem
                </span>
              </div>

              <button
                onClick={handleSearch}
                disabled={loading || !prompt.trim()}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Süreç İşleniyor (Ajanlar Tartışıyor)...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Harness&apos;ı Başlat ve Oturuma Kaydet</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* EXECUTION RESULTS SECTION */}
          {stageResults && (
            <div className="space-y-6">
              {/* Summary Metrics */}
              <div
                className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Tartışma Süreci Tamamlandı ve Oturuma Kaydedildi</h3>
                    <p className="text-xs text-slate-400">
                      Oturum ID: <code className="text-blue-400">{sessionId}</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 text-slate-300 text-xs font-mono">
                    <Clock size={14} className="text-blue-400" />
                    <span>Toplam Latency: {(stageResults.totalLatencyMs / 1000).toFixed(2)}s</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportMarkdown}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Download size={14} />
                    <span>Markdown Dışarı Aktar (.md)</span>
                  </button>
                </div>
              </div>

              {/* Stage Navigation Tabs */}
              <div className="flex border-b border-slate-800 gap-2">
                <button
                  onClick={() => setActiveStageTab('stage1')}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                    activeStageTab === 'stage1'
                      ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Globe size={16} />
                  <span>Aşama 1: Divergence (Bağımsız Yanıtlar)</span>
                </button>

                {enableCrossReview && (
                  <button
                    onClick={() => setActiveStageTab('stage2')}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                      activeStageTab === 'stage2'
                        ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare size={16} />
                    <span>Aşama 2: Cross-Review (Çapraz Eleştiri)</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveStageTab('stage3')}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                    activeStageTab === 'stage3'
                      ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ClipboardCheck size={16} />
                  <span>Aşama 3: Synthesis (Hakem Kararı)</span>
                </button>
              </div>

              {/* TAB CONTENT: STAGE 1 (DIVERGENCE) */}
              {activeStageTab === 'stage1' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {primaryAgentsList.map((ag) => {
                    const res: AgentExecutionResult | undefined =
                      stageResults.stage1Divergence[ag.id || ''] ||
                      Object.values(stageResults.stage1Divergence).find((r) => r.agentName === ag.name);

                    return (
                      <div
                        key={ag.id}
                        className={`border rounded-2xl p-4 flex flex-col h-[420px] transition-colors ${
                          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-slate-700/50">
                          <span className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {ag.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded font-semibold">
                              {res?.provider || ag.provider}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded truncate max-w-[120px] ${
                                isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                              }`}
                              title={res?.model || ag.model}
                            >
                              {res?.model || ag.model}
                            </span>
                          </div>
                        </div>

                        {res && (
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2 px-1">
                            <span>Süre: {res.latencyMs ? `${(res.latencyMs / 1000).toFixed(2)}s` : '-'}</span>
                            {res.usage && <span>Tokens: {res.usage.totalTokens || '-'}</span>}
                          </div>
                        )}

                        <div
                          className={`flex-1 overflow-y-auto text-xs whitespace-pre-wrap leading-relaxed p-3.5 rounded-xl border ${
                            isDark
                              ? 'bg-slate-950 border-slate-800 text-slate-300'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          {renderExecutionResultText(res)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB CONTENT: STAGE 2 (CROSS-REVIEW) */}
              {activeStageTab === 'stage2' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {primaryAgentsList.map((ag) => {
                    const res: AgentExecutionResult | undefined =
                      stageResults.stage2CrossReview?.[ag.id || ''] ||
                      (stageResults.stage2CrossReview &&
                        Object.values(stageResults.stage2CrossReview).find((r) => r.agentName === ag.name));

                    return (
                      <div
                        key={ag.id}
                        className={`border rounded-2xl p-4 flex flex-col h-[420px] transition-colors ${
                          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-slate-700/50">
                          <span className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {ag.name} Eleştirisi
                          </span>
                          <span className="text-[10px] font-mono uppercase bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-semibold">
                            {res?.provider || ag.provider}
                          </span>
                        </div>

                        {res && (
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2 px-1">
                            <span>Süre: {res.latencyMs ? `${(res.latencyMs / 1000).toFixed(2)}s` : '-'}</span>
                            {res.usage && <span>Tokens: {res.usage.totalTokens || '-'}</span>}
                          </div>
                        )}

                        <div
                          className={`flex-1 overflow-y-auto text-xs whitespace-pre-wrap leading-relaxed p-3.5 rounded-xl border ${
                            isDark
                              ? 'bg-slate-950 border-slate-800 text-slate-300'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          {renderExecutionResultText(res)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB CONTENT: STAGE 3 (SYNTHESIS / REFEREE) */}
              {activeStageTab === 'stage3' && (
                <div
                  className={`border rounded-2xl p-6 transition-all ${
                    isDark
                      ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-emerald-500/30'
                      : 'bg-gradient-to-b from-white to-emerald-50/30 border-emerald-300 shadow-md'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck size={22} className="text-emerald-500" />
                      <div>
                        <h2 className="text-lg font-bold text-emerald-500">
                          Aşama 3: Hakem Konsensüs Kararı
                        </h2>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Hakem Model: {stageResults.stage3Synthesis?.provider?.toUpperCase()} ({stageResults.stage3Synthesis?.model})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyMarkdown}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
                        }`}
                      >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <FileText size={14} />}
                        <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportMarkdown}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Download size={14} />
                        <span>Markdown İndir (.md)</span>
                      </button>
                    </div>
                  </div>

                  {stageResults.stage3Synthesis && (
                    <div className="flex items-center gap-4 text-xs font-mono text-slate-400 mb-3">
                      <span>Süre: {(stageResults.stage3Synthesis.latencyMs! / 1000).toFixed(2)}s</span>
                      {stageResults.stage3Synthesis.usage && (
                        <span>Tokens: {stageResults.stage3Synthesis.usage.totalTokens}</span>
                      )}
                    </div>
                  )}

                  <div
                    className={`border rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed min-h-[220px] ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-100'
                        : 'bg-white border-slate-200 text-slate-900 shadow-inner'
                    }`}
                  >
                    {renderExecutionResultText(stageResults.stage3Synthesis)}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* SETTINGS MODAL (GEAR ICON DIALOG) */}
      {showSettings && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSettings();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
        >
          <div
            className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border transition-all overflow-hidden ${
              isDark ? 'bg-slate-900 border-slate-800 shadow-2xl text-slate-100' : 'bg-white border-slate-200 shadow-2xl text-slate-900'
            }`}
          >
            {/* Sticky Header */}
            <div
              className={`sticky top-0 z-20 p-5 border-b flex justify-between items-center backdrop-blur-md ${
                isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
              }`}
            >
              <h2 className="text-lg font-bold flex items-center gap-2 text-blue-500">
                <Sliders size={20} /> Ajan Harness ve Provider Konfigürasyonu
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeSettings}
                  className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                  Geri Dön
                </button>
                <button
                  type="button"
                  onClick={saveSettings}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                >
                  <Check size={14} /> Kaydet & Kapat
                </button>
                <button
                  type="button"
                  onClick={closeSettings}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                  aria-label="Kapat"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Provider API Keys */}
              <div>
                <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  1. Provider API Key Ayarları
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                  {[
                    { key: 'openrouter' as const, label: 'OpenRouter API Key', placeholder: 'sk-or-v1-...' },
                    { key: 'openai' as const, label: 'OpenAI API Key', placeholder: 'sk-...' },
                    { key: 'anthropic' as const, label: 'Anthropic API Key', placeholder: 'sk-ant-...' },
                    { key: 'gemini' as const, label: 'Google Gemini Key', placeholder: 'AIzaSy...' },
                  ].map((item) => (
                    <div key={item.key} className="flex flex-col gap-1.5">
                      <label htmlFor={`api-key-modal-${item.key}`} className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {item.label}
                      </label>
                      <div className="relative">
                        <input
                          id={`api-key-modal-${item.key}`}
                          type={showKeys ? 'text' : 'password'}
                          value={apiKeys[item.key] || ''}
                          onChange={(e) =>
                            setApiKeys({ ...apiKeys, [item.key]: e.target.value })
                          }
                          placeholder={item.placeholder}
                          className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDark
                              ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600'
                              : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                          }`}
                        />
                        <button
                          type="button"
                          aria-label={showKeys ? 'API Anahtarlarını gizle' : 'API Anahtarlarını göster'}
                          onClick={() => setShowKeys(!showKeys)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                        >
                          {showKeys ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <Server size={16} className="text-blue-400 shrink-0" />
                  <span>
                    <strong>Ollama Yapılandırması:</strong> SSRF koruması gereği yerel Ollama adresi sunucu tarafında <code>OLLAMA_BASE_URL</code> ortam değişkeni ile belirlenir.
                  </span>
                </div>
              </div>

              {/* Open-Notebook MCP Server Settings */}
              <div>
                <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  2. Open-Notebook MCP Sunucu Ayarları
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Open-Notebook IP / Sunucu Adresi (URL)
                    </label>
                    <input
                      type="text"
                      value={openNotebookUrl}
                      onChange={(e) => setOpenNotebookUrl(e.target.value)}
                      placeholder="http://192.168.1.50:5055 veya http://localhost:5055"
                      className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark
                          ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Open-Notebook API Anahtarı (Varsa)
                    </label>
                    <input
                      type="password"
                      value={openNotebookApiKey}
                      onChange={(e) => setOpenNotebookApiKey(e.target.value)}
                      placeholder="İsteğe bağlı API / Auth Token"
                      className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark
                          ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Primary Agents & Referee Configuration */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      3. Dinamik Ajan Ayarları (En az 2 Ajan + 1 Hakem)
                    </h3>
                    <p className="text-xs text-slate-400">
                      İstediğiniz sayıda farklı model ve sağlayıcıya sahip ajan ekleyebilirsiniz.
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={enableCrossReview}
                        onChange={(e) => setEnableCrossReview(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                        Aşama 2: Çapraz Eleştiri Etkin
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={handleAddAgent}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Plus size={14} />
                      <span>Ajan Ekle</span>
                    </button>
                  </div>
                </div>

                {/* Primary Agents Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {primaryAgentsList.map((ag, idx) => {
                    const availablePresets = PROVIDER_MODEL_PRESETS[ag.provider] || [];

                    return (
                      <div
                        key={ag.id || idx}
                        className={`p-3.5 rounded-xl border border-blue-500/30 ${
                          isDark ? 'bg-slate-950/80' : 'bg-slate-50'
                        } space-y-3 flex flex-col justify-between`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between border-b pb-2 border-slate-800">
                            <input
                              type="text"
                              value={ag.name}
                              onChange={(e) => handleUpdateAgent(ag.id || '', { name: e.target.value })}
                              className={`font-semibold text-xs border rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                isDark ? 'border-slate-800 text-blue-400' : 'border-slate-300 text-blue-700'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveAgent(ag.id || '')}
                              disabled={primaryAgentsList.length <= 2}
                              className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 disabled:opacity-30"
                              title={primaryAgentsList.length <= 2 ? 'En az 2 ajan gereklidir' : 'Ajanı Sil'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* Provider Select */}
                          <div className="space-y-1">
                            <label className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Sağlayıcı
                            </label>
                            <select
                              value={ag.provider}
                              onChange={(e) => {
                                const newProv = e.target.value as ProviderType;
                                const defaultModel = PROVIDER_MODEL_PRESETS[newProv]?.[0] || '';
                                handleUpdateAgent(ag.id || '', { provider: newProv, model: defaultModel });
                              }}
                              className={`w-full border rounded-lg p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                              }`}
                            >
                              <option value="openrouter">OpenRouter</option>
                              <option value="openai">OpenAI</option>
                              <option value="anthropic">Anthropic</option>
                              <option value="gemini">Google Gemini</option>
                              <option value="ollama">Ollama (Yerel)</option>
                            </select>
                          </div>

                          {/* Model Select */}
                          <div className="space-y-1">
                            <label className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Model
                            </label>
                            <select
                              value={availablePresets.includes(ag.model) ? ag.model : 'custom'}
                              onChange={(e) => {
                                if (e.target.value !== 'custom') {
                                  handleUpdateAgent(ag.id || '', { model: e.target.value });
                                }
                              }}
                              className={`w-full border rounded-lg p-1.5 text-xs mb-1 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                              }`}
                            >
                              {availablePresets.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                              <option value="custom">Özel Model Gir...</option>
                            </select>

                            <input
                              type="text"
                              value={ag.model}
                              onChange={(e) => handleUpdateAgent(ag.id || '', { model: e.target.value })}
                              placeholder="Model adı"
                              className={`w-full border rounded-lg p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                isDark ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-600' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                              }`}
                            />
                          </div>

                          {/* System Prompt */}
                          <div className="space-y-1">
                            <label className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Sistem İstemi (System Prompt)
                            </label>
                            <textarea
                              value={ag.systemPrompt || ''}
                              onChange={(e) => handleUpdateAgent(ag.id || '', { systemPrompt: e.target.value })}
                              rows={2}
                              className={`w-full border rounded-lg p-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                isDark ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-600' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Referee Agent Config Card */}
                <div className={`p-4 rounded-xl border border-emerald-500/40 ${isDark ? 'bg-slate-950/80' : 'bg-emerald-50/40'} space-y-3`}>
                  <div className="flex items-center justify-between border-b pb-2 border-slate-800">
                    <div className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                      <ClipboardCheck size={16} /> Hakem Model Yapılandırması (Sentez)
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">{config.referee.provider}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Sağlayıcı</label>
                      <select
                        value={config.referee.provider}
                        onChange={(e) => {
                          const newProv = e.target.value as ProviderType;
                          const defaultModel = PROVIDER_MODEL_PRESETS[newProv]?.[0] || '';
                          setConfig({ ...config, referee: { ...config.referee, provider: newProv, model: defaultModel } });
                        }}
                        className={`w-full border rounded-lg p-1.5 text-xs ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'}`}
                      >
                        <option value="openrouter">OpenRouter</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="gemini">Google Gemini</option>
                        <option value="ollama">Ollama (Yerel)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Model</label>
                      <input
                        type="text"
                        value={config.referee.model}
                        onChange={(e) => setConfig({ ...config, referee: { ...config.referee, model: e.target.value } })}
                        className={`w-full border rounded-lg p-1.5 text-xs ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div
              className={`sticky bottom-0 z-20 p-4 border-t flex justify-between items-center backdrop-blur-md ${
                isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={closeSettings}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                Geri Dön
              </button>
              <button
                type="button"
                onClick={saveSettings}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Check size={16} /> Kaydet & Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPEN-NOTEBOOK MCP MODAL */}
      {showMcpModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMcpModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
        >
          <div
            className={`w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border transition-all overflow-hidden ${
              isDark ? 'bg-slate-900 border-slate-800 shadow-2xl text-slate-100' : 'bg-white border-slate-200 shadow-2xl text-slate-900'
            }`}
          >
            {/* Header */}
            <div className={`p-5 border-b flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2 text-blue-500 font-bold text-base">
                <BookOpen size={20} />
                <span>Open-Notebook MCP Entegrasyonu</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMcpModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Server Connection Bar */}
            <div className={`p-4 border-b space-y-3 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Open-Notebook IP / Sunucu Adresi (URL)</label>
                  <input
                    type="text"
                    value={mcpBaseUrl}
                    onChange={(e) => setMcpBaseUrl(e.target.value)}
                    placeholder="http://192.168.1.100:5055 veya http://localhost:5055"
                    className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div className="w-full sm:w-48 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">API Anahtarı (Opsiyonel)</label>
                  <input
                    type="password"
                    value={mcpApiKey}
                    onChange={(e) => setMcpApiKey(e.target.value)}
                    placeholder="Token"
                    className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTestMcpConnection}
                  disabled={mcpTesting || !mcpBaseUrl}
                  className="sm:self-end bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0"
                >
                  {mcpTesting ? <Loader2 size={14} className="animate-spin" /> : <Server size={14} />}
                  <span>Bağlan & Yenile</span>
                </button>
              </div>

              {mcpTestStatus && (
                <div className={`text-xs p-2.5 rounded-lg flex items-center gap-2 ${
                  mcpTestStatus.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {mcpTestStatus.success ? <Check size={14} /> : <AlertCircle size={14} />}
                  <span>{mcpTestStatus.message || mcpTestStatus.error}</span>
                </div>
              )}
            </div>

            {/* Notebook List Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={mcpSearchTerm}
                    onChange={(e) => setMcpSearchTerm(e.target.value)}
                    placeholder="Notebook ara..."
                    className={`w-full pl-9 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {mcpNotebooks.length} Notebook bulundu
                </span>
              </div>

              {mcpLoadingNotebooks ? (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-xs">
                  <Loader2 size={18} className="animate-spin text-blue-500" />
                  <span>Open-Notebook sunucusundan notebook listesi çekiliyor...</span>
                </div>
              ) : mcpNotebooks.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-xl border-slate-800 text-slate-500 text-xs space-y-2">
                  <BookOpen size={24} className="mx-auto text-slate-600" />
                  <p>Open-Notebook sunucusunda listelenecek notebook bulunamadı veya henüz bağlanılmadı.</p>
                  <p className="text-[11px] text-slate-600">IP adresini ve sunucunun çalıştığını (port 5055) kontrol edip &apos;Bağlan&apos; butonuna basın.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {mcpNotebooks
                    .filter((nb) => !mcpSearchTerm || (nb.name && nb.name.toLowerCase().includes(mcpSearchTerm.toLowerCase())))
                    .map((nb) => {
                      const isSelected = mcpSelectedNotebookId === nb.id;
                      return (
                        <div
                          key={nb.id}
                          onClick={() => setMcpSelectedNotebookId(nb.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500/10 text-blue-300 shadow-sm'
                              : isDark
                              ? 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                              : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-xs truncate max-w-[200px]">{nb.name}</h4>
                              {isSelected && <Check size={14} className="text-blue-400 shrink-0" />}
                            </div>
                            {nb.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-2">{nb.description}</p>
                            )}
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span>Kaynak Sayısı: {nb.sourcesCount || 0}</span>
                            <span>Notlar: {nb.notesCount || 0}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex flex-wrap items-center justify-between gap-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className="text-xs text-slate-400">
                {mcpSelectedNotebookId ? `Seçilen ID: ${mcpSelectedNotebookId}` : 'Lütfen bir notebook seçin'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMcpModal(false)}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-slate-300 border-slate-700 hover:bg-slate-800"
                >
                  İptal
                </button>
                <button
                  type="button"
                  disabled={!mcpSelectedNotebookId || mcpFetchingContent}
                  onClick={() => handleImportNotebookContent('memory')}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  {mcpFetchingContent ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                  <span>Hafızaya / Bağlama Ekle</span>
                </button>
                <button
                  type="button"
                  disabled={!mcpSelectedNotebookId || mcpFetchingContent}
                  onClick={() => handleImportNotebookContent('prompt')}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  {mcpFetchingContent ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Soruma Ekle</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
