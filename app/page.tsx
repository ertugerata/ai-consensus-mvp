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
  ChevronRight,
} from 'lucide-react';
import {
  ApiKeys,
  ConfigState,
  MultiStageResults,
  AgentExecutionResult,
} from '@/lib/types';
import {
  DEFAULT_CONFIG,
  PROVIDER_MODEL_PRESETS,
} from '@/lib/config/agents';

const DEFAULT_KEYS: ApiKeys = {
  openai: '',
  anthropic: '',
  gemini: '',
  openrouter: '',
  ollamaBaseUrl: 'http://localhost:11434',
};

const MAX_PROMPT_CHARS = 20000;
const MAX_MEMORY_CHARS = 200000;
const MAX_CRITERIA_CHARS = 20000;

export default function Home() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [prompt, setPrompt] = useState('');
  const [memory, setMemory] = useState('');
  const [evaluationCriteria, setEvaluationCriteria] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enableCrossReview, setEnableCrossReview] = useState(true);
  const [activeStageTab, setActiveStageTab] = useState<'stage1' | 'stage2' | 'stage3'>('stage3');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [apiKeys, setApiKeys] = useState<ApiKeys>(DEFAULT_KEYS);
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG);

  const [stageResults, setStageResults] = useState<MultiStageResults | null>(null);

  // Load configuration safely from localStorage on mount
  useEffect(() => {
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
        setConfig({
          agentA: { ...DEFAULT_CONFIG.agentA, ...parsedConfig.agentA },
          agentB: { ...DEFAULT_CONFIG.agentB, ...parsedConfig.agentB },
          agentC: { ...DEFAULT_CONFIG.agentC, ...parsedConfig.agentC },
          referee: { ...DEFAULT_CONFIG.referee, ...parsedConfig.referee },
        });
      }

      const savedCriteria = localStorage.getItem('ai_consensus_criteria');
      if (savedCriteria) setEvaluationCriteria(savedCriteria);

      const savedMemory = localStorage.getItem('ai_consensus_memory');
      if (savedMemory) setMemory(savedMemory);

      const savedCrossReview = localStorage.getItem('ai_consensus_cross_review');
      if (savedCrossReview !== null) {
        setEnableCrossReview(savedCrossReview === 'true');
      }
    } catch (err) {
      console.error('localStorage okuma hatası:', err);
    }
  }, []);

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
    setShowSettings(false);
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

  // Memory File Export
  const handleExportMemory = () => {
    if (!memory.trim()) return;
    const blob = new Blob([memory], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hafiza_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Full Multi-Stage Report to Markdown
  const handleExportMarkdown = () => {
    if (!stageResults) return;
    const timestamp = new Date().toLocaleString('tr-TR');

    const s1 = stageResults.stage1Divergence || {};
    const s2 = stageResults.stage2CrossReview || {};
    const s3 = stageResults.stage3Synthesis || {};

    const markdownContent = `# Multi-Agent Harness Consensus Raporu

**Tarih:** ${timestamp}
**Toplam Süre (Latency):** ${(stageResults.totalLatencyMs / 1000).toFixed(2)}s

---

## 1. Sorgu ve Bağlam
- **Ana Sorgu:** ${prompt || 'Girilmedi'}
- **Harici Hafıza:** ${memory ? `${memory.slice(0, 200)}...` : 'Yok'}
- **Değerlendirme Kriterleri:** ${evaluationCriteria || 'Varsayılan'}

---

## 2. Aşama 1: Bağımsız Ajan Yanıtları (Divergence)

### Ajan A (${config.agentA.provider.toUpperCase()} - ${config.agentA.model})
${s1.agentA?.text || 'Yanıt yok'}

### Ajan B (${config.agentB.provider.toUpperCase()} - ${config.agentB.model})
${s1.agentB?.text || 'Yanıt yok'}

### Ajan C (${config.agentC.provider.toUpperCase()} - ${config.agentC.model})
${s1.agentC?.text || 'Yanıt yok'}

---

## 3. Aşama 2: Çapraz Eleştiriler (Cross-Review)
${
  s2 && Object.keys(s2).length > 0
    ? Object.entries(s2)
        .map(
          ([id, res]) =>
            `### ${res.agentName} Eleştirisi (${res.provider.toUpperCase()} - ${res.model})\n${res.text}`
        )
        .join('\n\n')
    : 'Aşama 2 (Çapraz Eleştiri) devre dışı bırakıldı veya çalıştırılmadı.'
}

---

## 4. Aşama 3: Hakem Konsensüs Raporu (Synthesis)
**Hakem Model:** ${s3.provider?.toUpperCase() || ''} - ${s3.model || ''}
${s3.text || 'Sentez yok'}
`;

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consensus_harness_raporu_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = async () => {
    if (!stageResults) return;
    const s3 = stageResults.stage3Synthesis?.text || '';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(s3);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = s3;
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

    try {
      const res = await fetch('/api/consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        setErrorMessage(data.error || `Sunucu hatası: ${res.status}`);
        return;
      }

      setStageResults(data);
      setActiveStageTab('stage3');
    } catch (err) {
      console.error(err);
      setErrorMessage('Ağ isteği başarısız oldu. Lütfen bağlantınızı ve sunucunuzu kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <main
      className={`min-h-screen transition-colors duration-200 p-4 sm:p-6 md:p-8 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <header
          className={`flex flex-wrap justify-between items-center pb-4 border-b transition-colors ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 rounded-xl shadow-md text-white">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 bg-clip-text text-transparent">
                Multi-Agent Harness
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                OpenRouter & Yerel Model Desteği ile Çok Aşamalı Tartışma ve Konsensüs Mimarisi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3 sm:mt-0">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-medium ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
              }`}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
              <span className="hidden sm:inline">{isDark ? 'Açık' : 'Koyu'}</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              aria-label="Ayarlar panelini aç veya kapat"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                showSettings
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                  : isDark
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm'
              }`}
            >
              <Settings size={18} className={showSettings ? 'rotate-90 transition-transform duration-300' : ''} />
              <span>Ajan & Provider Ayarları</span>
            </button>
          </div>
        </header>

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

        {/* SETTINGS PANEL */}
        {showSettings && (
          <div
            className={`rounded-2xl border p-6 transition-all space-y-6 ${
              isDark ? 'bg-slate-900 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'
            }`}
          >
            <div className="flex justify-between items-center border-b pb-3 border-slate-700/50">
              <h2 className="text-lg font-bold flex items-center gap-2 text-blue-500">
                <Sliders size={20} /> Ajan Harness ve Provider Konfigürasyonu
              </h2>
              <button
                onClick={saveSettings}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                Ayarları Kaydet
              </button>
            </div>

            {/* API Keys & Provider Endpoint Settings */}
            <div>
              <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                1. Provider API Anahtarları ve Bağlantıları
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { key: 'openrouter' as const, label: 'OpenRouter API Key', placeholder: 'sk-or-v1-...' },
                  { key: 'openai' as const, label: 'OpenAI API Key', placeholder: 'sk-...' },
                  { key: 'anthropic' as const, label: 'Anthropic API Key', placeholder: 'sk-ant-...' },
                  { key: 'gemini' as const, label: 'Google Gemini Key', placeholder: 'AIzaSy...' },
                  { key: 'ollamaBaseUrl' as const, label: 'Ollama Base URL', placeholder: 'http://localhost:11434' },
                ].map((item) => (
                  <div key={item.key} className="flex flex-col gap-1.5">
                    <label htmlFor={`api-key-${item.key}`} className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {item.label}
                    </label>
                    <div className="relative">
                      <input
                        id={`api-key-${item.key}`}
                        type={item.key === 'ollamaBaseUrl' ? 'text' : showKeys ? 'text' : 'password'}
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
                      {item.key !== 'ollamaBaseUrl' && (
                        <button
                          type="button"
                          aria-label={showKeys ? 'API Anahtarlarını gizle' : 'API Anahtarlarını göster'}
                          onClick={() => setShowKeys(!showKeys)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                        >
                          {showKeys ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Configurations Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  2. Dinamik Ajan Ayarları (System Prompt, Temperature, Model)
                </h3>
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableCrossReview}
                    onChange={(e) => setEnableCrossReview(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                    Aşama 2: Çapraz Eleştiri (Cross-Review) Etkin
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { key: 'agentA' as const, name: 'Ajan A', color: 'border-blue-500/50' },
                  { key: 'agentB' as const, name: 'Ajan B', color: 'border-purple-500/50' },
                  { key: 'agentC' as const, name: 'Ajan C', color: 'border-amber-500/50' },
                  { key: 'referee' as const, name: 'Hakem Ajanı', color: 'border-emerald-500/50' },
                ].map((item) => {
                  const agentCfg = config[item.key] || DEFAULT_CONFIG[item.key];
                  const availablePresets = PROVIDER_MODEL_PRESETS[agentCfg.provider] || [];

                  return (
                    <div
                      key={item.key}
                      className={`p-3.5 rounded-xl border ${item.color} ${
                        isDark ? 'bg-slate-950/60' : 'bg-slate-50'
                      } space-y-3 flex flex-col justify-between`}
                    >
                      <div className="space-y-3">
                        <div className="font-semibold text-xs text-blue-400 flex items-center justify-between">
                          <span>{item.name}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">{agentCfg.provider}</span>
                        </div>

                        {/* Provider Select */}
                        <div className="space-y-1">
                          <label htmlFor={`provider-${item.key}`} className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Sağlayıcı
                          </label>
                          <select
                            id={`provider-${item.key}`}
                            value={agentCfg.provider}
                            onChange={(e) => {
                              const newProv = e.target.value as ConfigState['agentA']['provider'];
                              const defaultModel = PROVIDER_MODEL_PRESETS[newProv]?.[0] || '';
                              setConfig({
                                ...config,
                                [item.key]: { ...agentCfg, provider: newProv, model: defaultModel },
                              });
                            }}
                            className={`w-full border rounded-lg p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              isDark
                                ? 'bg-slate-900 border-slate-800 text-slate-100'
                                : 'bg-white border-slate-300 text-slate-800'
                            }`}
                          >
                            <option value="openrouter">OpenRouter</option>
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic</option>
                            <option value="gemini">Google Gemini</option>
                            <option value="ollama">Ollama (Yerel)</option>
                          </select>
                        </div>

                        {/* Model Select / Input */}
                        <div className="space-y-1">
                          <label htmlFor={`model-select-${item.key}`} className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Model Seçin veya Yazın
                          </label>
                          <select
                            id={`model-select-${item.key}`}
                            value={availablePresets.includes(agentCfg.model) ? agentCfg.model : 'custom'}
                            onChange={(e) => {
                              if (e.target.value !== 'custom') {
                                setConfig({
                                  ...config,
                                  [item.key]: { ...agentCfg, model: e.target.value },
                                });
                              }
                            }}
                            className={`w-full border rounded-lg p-1.5 text-xs mb-1 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              isDark
                                ? 'bg-slate-900 border-slate-800 text-slate-100'
                                : 'bg-white border-slate-300 text-slate-800'
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
                            value={agentCfg.model}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                [item.key]: { ...agentCfg, model: e.target.value },
                              })
                            }
                            placeholder="Model adı"
                            className={`w-full border rounded-lg p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              isDark
                                ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-600'
                                : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                            }`}
                          />
                        </div>

                        {/* Temperature Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Temperature
                            </label>
                            <span className="text-[11px] font-mono text-blue-400">{agentCfg.temperature ?? 0.7}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={agentCfg.temperature ?? 0.7}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                [item.key]: { ...agentCfg, temperature: parseFloat(e.target.value) },
                              })
                            }
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* System Prompt Input */}
                        <div className="space-y-1">
                          <label className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Sistem İstemi (System Prompt)
                          </label>
                          <textarea
                            value={agentCfg.systemPrompt || ''}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                [item.key]: { ...agentCfg, systemPrompt: e.target.value },
                              })
                            }
                            rows={3}
                            placeholder="Ajanın rol ve davranışını belirleyin..."
                            className={`w-full border rounded-lg p-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 leading-snug resize-y ${
                              isDark
                                ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-600'
                                : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Harici Hafıza ve Çalışma Düzeni Kriterleri */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-slate-700/50">
              {/* Harici Hafıza (Memory) */}
              <div
                className={`p-4 rounded-xl border flex flex-col gap-3 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-500">
                    <Database size={18} /> 3. Harici Hafıza (Memory)
                  </h3>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".txt,.md,.json,.csv"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                          : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                      title="Dosyadan Aktar (.txt, .md, .json)"
                    >
                      <Upload size={14} />
                      <span className="hidden sm:inline">İçeri Aktar</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportMemory}
                      disabled={!memory.trim()}
                      className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors disabled:opacity-40 ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                          : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Download size={14} />
                      <span className="hidden sm:inline">Dışarı Aktar</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    id="memory-input"
                    value={memory}
                    maxLength={MAX_MEMORY_CHARS}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMemory(val);
                      safeSaveStorage('ai_consensus_memory', val);
                    }}
                    placeholder="Ajanlara aktarılacak doküman özeti, geçmiş bağlam veya kuralları buraya yapıştırın..."
                    className={`w-full min-h-[140px] border rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y leading-relaxed ${
                      isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-600'
                        : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                    }`}
                  />
                  <div className="text-[10px] text-right text-slate-500 mt-1 font-mono">
                    {memory.length.toLocaleString('tr-TR')} / {MAX_MEMORY_CHARS.toLocaleString('tr-TR')} karakter
                  </div>
                </div>
              </div>

              {/* Değerlendirme Kriterleri */}
              <div
                className={`p-4 rounded-xl border flex flex-col gap-3 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-emerald-500">
                    <ClipboardCheck size={18} /> 4. Değerlendirme Kriterleri
                  </h3>
                </div>

                <div className="relative">
                  <textarea
                    id="criteria-input"
                    value={evaluationCriteria}
                    maxLength={MAX_CRITERIA_CHARS}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEvaluationCriteria(val);
                      safeSaveStorage('ai_consensus_criteria', val);
                    }}
                    placeholder="Hakemin değerlendirme kurallarını girin. Örn: Kod yazarken DRY standartlarına uy, çelişkileri belirt..."
                    className={`w-full min-h-[140px] border rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y leading-relaxed ${
                      isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-600'
                        : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                    }`}
                  />
                  <div className="text-[10px] text-right text-slate-500 mt-1 font-mono">
                    {evaluationCriteria.length.toLocaleString('tr-TR')} / {MAX_CRITERIA_CHARS.toLocaleString('tr-TR')} karakter
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAIN PROMPT INPUT AREA */}
        <div
          className={`border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="prompt-input" className={`font-semibold text-sm flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                <Bot size={18} className="text-blue-500" /> Ana Sorgu / Soru
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
              placeholder="Multi-Agent Harness ile analiz ettirmek ve tartıştırtmak istediğiniz ana soruyu buraya yazın..."
              className={`w-full min-h-[160px] border rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed resize-y ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Layers size={16} className="text-blue-400" />
              <span>
                Akış: Aşama 1 (Divergence) → {enableCrossReview ? 'Aşama 2 (Cross-Review) → ' : ''}Aşama 3 (Synthesis)
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
                  <span>Ajan Harness Çalışıyor...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Harness&apos;ı Başlat ve Tartıştır</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* EXECUTION PIPELINE VISUALIZATION & RESULTS */}
        {stageResults && (
          <div className="space-y-6">
            {/* Pipeline Metrics Summary */}
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
                  <h3 className="text-sm font-bold">Harness İş Akışı Tamamlandı</h3>
                  <p className="text-xs text-slate-400">
                    Tüm aşamalar başarıyla yürütüldü.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 text-slate-300">
                  <Clock size={14} className="text-blue-400" />
                  <span>Toplam Latency: {(stageResults.totalLatencyMs / 1000).toFixed(2)}s</span>
                </div>
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
                <span>Aşama 3: Synthesis (Hakem Konsensüsü)</span>
              </button>
            </div>

            {/* TAB CONTENT: STAGE 1 (DIVERGENCE) */}
            {activeStageTab === 'stage1' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { key: 'agentA' as const, name: 'Ajan A', cfg: config.agentA },
                  { key: 'agentB' as const, name: 'Ajan B', cfg: config.agentB },
                  { key: 'agentC' as const, name: 'Ajan C', cfg: config.agentC },
                ].map((item) => {
                  const res: AgentExecutionResult | undefined = stageResults.stage1Divergence[item.key];
                  return (
                    <div
                      key={item.key}
                      className={`border rounded-2xl p-4 flex flex-col h-[400px] transition-colors ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-slate-700/50">
                        <span className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {item.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded font-semibold">
                            {res?.provider || item.cfg.provider}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded truncate max-w-[120px] ${
                              isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                            }`}
                            title={res?.model || item.cfg.model}
                          >
                            {res?.model || item.cfg.model}
                          </span>
                        </div>
                      </div>

                      {/* Token usage & Latency info */}
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
                        {res?.text || 'Ajan yanıt veremedi veya çalıştırılmadı.'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT: STAGE 2 (CROSS-REVIEW) */}
            {activeStageTab === 'stage2' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { key: 'agentA' as const, name: 'Ajan A Eleştirisi', cfg: config.agentA },
                  { key: 'agentB' as const, name: 'Ajan B Eleştirisi', cfg: config.agentB },
                  { key: 'agentC' as const, name: 'Ajan C Eleştirisi', cfg: config.agentC },
                ].map((item) => {
                  const res: AgentExecutionResult | undefined = stageResults.stage2CrossReview?.[item.key];
                  return (
                    <div
                      key={item.key}
                      className={`border rounded-2xl p-4 flex flex-col h-[400px] transition-colors ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-slate-700/50">
                        <span className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {item.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono uppercase bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-semibold">
                            {res?.provider || item.cfg.provider}
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
                        {res?.text || 'Aşama 2 çapraz eleştiri çıktısı bulunmuyor.'}
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
                        Aşama 3: Hakem Konsensüs Raporu
                      </h2>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Hakem Model: {stageResults.stage3Synthesis?.provider?.toUpperCase()} ({stageResults.stage3Synthesis?.model})
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
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
                      <span>Raporu İndir (.md)</span>
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
                  className={`border rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed min-h-[200px] ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-100'
                      : 'bg-white border-slate-200 text-slate-900 shadow-inner'
                  }`}
                >
                  {stageResults.stage3Synthesis?.text || 'Konsensüs üretilemedi.'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
