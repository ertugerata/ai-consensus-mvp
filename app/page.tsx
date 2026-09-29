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
  AlertCircle
} from 'lucide-react';

interface ApiKeys {
  openai: string;
  anthropic: string;
  gemini: string;
  openrouter: string;
}

interface AgentConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'openrouter';
  model: string;
}

interface ConfigState {
  agentA: AgentConfig;
  agentB: AgentConfig;
  agentC: AgentConfig;
  referee: AgentConfig;
}

const PROVIDER_MODEL_PRESETS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini', 'o3-mini'],
  anthropic: [
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
  ],
  gemini: [
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ],
  openrouter: [
    'openai/gpt-4o-mini',
    'openai/gpt-4o',
    'anthropic/claude-3.5-sonnet',
    'google/gemini-2.0-flash-001',
    'meta-llama/llama-3.3-70b-instruct',
    'deepseek/deepseek-r1',
    'mistralai/mistral-large',
  ],
};

const DEFAULT_CONFIG: ConfigState = {
  agentA: { provider: 'openai', model: 'gpt-4o-mini' },
  agentB: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' },
  agentC: { provider: 'gemini', model: 'gemini-1.5-flash' },
  referee: { provider: 'openai', model: 'gpt-4o' },
};

const DEFAULT_KEYS: ApiKeys = {
  openai: '',
  anthropic: '',
  gemini: '',
  openrouter: '',
};

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [apiKeys, setApiKeys] = useState<ApiKeys>(DEFAULT_KEYS);
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG);

  const [results, setResults] = useState({
    agentA: '',
    agentB: '',
    agentC: '',
    consensus: '',
  });

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
        setMemory(content);
        safeSaveStorage('ai_consensus_memory', content);
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

  // Results Markdown Export
  const handleExportMarkdown = () => {
    const timestamp = new Date().toLocaleString('tr-TR');
    const markdownContent = `# AI Consensus Suite - Rapor

**Tarih:** ${timestamp}

---

## 1. Kullanıcı Sorusu / Prompt
${prompt || 'Henüz bir soru girilmedi.'}

---

## 2. Harici Hafıza (Memory)
${memory || 'Harici hafıza bilgisi bulunmuyor.'}

---

## 3. Değerlendirme Kriterleri
${evaluationCriteria || 'Varsayılan kriterler kullanıldı.'}

---

## 4. Ajan Yanıtları

### Ajan A (${config.agentA.provider.toUpperCase()} - ${config.agentA.model})
${results.agentA || 'Yanıt yok.'}

### Ajan B (${config.agentB.provider.toUpperCase()} - ${config.agentB.model})
${results.agentB || 'Yanıt yok.'}

### Ajan C (${config.agentC.provider.toUpperCase()} - ${config.agentC.model})
${results.agentC || 'Yanıt yok.'}

---

## 5. Hakem Konsensüs Yanıtı (${config.referee.provider.toUpperCase()} - ${config.referee.model})
${results.consensus || 'Konsensüs henüz üretilmedi.'}
`;

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consensus_raporu_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = async () => {
    const markdownContent = `# AI Consensus Output
## Hakem Konsensüs Yanıtı:
${results.consensus}

## Ajan A (${config.agentA.model}):
${results.agentA}

## Ajan B (${config.agentB.model}):
${results.agentB}

## Ajan C (${config.agentC.model}):
${results.agentC}
`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(markdownContent);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = markdownContent;
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
    setResults({
      agentA: '',
      agentB: '',
      agentC: '',
      consensus: '',
    });

    try {
      const res = await fetch('/api/consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, memory, evaluationCriteria, apiKeys, config }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || `Sunucu hatası: ${res.status}`);
        return;
      }

      setResults({
        agentA: data.agentA || '',
        agentB: data.agentB || '',
        agentC: data.agentC || '',
        consensus: data.consensus || '',
      });
    } catch (err) {
      console.error(err);
      setErrorMessage('Ağ isteği başarısız oldu. Lütfen bağlantınızı kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <main
      className={`min-h-screen transition-colors duration-200 p-4 sm:p-6 md:p-8 ${
        isDark
          ? 'bg-slate-950 text-slate-100'
          : 'bg-slate-50 text-slate-900'
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
                AI Consensus Suite
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Çoklu Ajan, OpenRouter ve Hakem Konsensüs Paneli
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
              title={isDark ? 'Açık Mod' : 'Karanlık Mod'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
              <span className="hidden sm:inline">{isDark ? 'Açık Tema' : 'Koyu Tema'}</span>
            </button>

            {/* Settings Toggle Button */}
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
              <span>Ayarlar & Modeller</span>
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
              isDark
                ? 'bg-slate-900 border-slate-800 shadow-2xl'
                : 'bg-white border-slate-200 shadow-xl'
            }`}
          >
            <div className="flex justify-between items-center border-b pb-3 border-slate-700/50">
              <h2 className="text-lg font-bold flex items-center gap-2 text-blue-500">
                <Settings size={20} /> API Ve Model Ayarları
              </h2>
              <button
                onClick={saveSettings}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                Ayarları Kaydet
              </button>
            </div>

            {/* API Keys Grid */}
            <div>
              <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                1. API Anahtarları
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { key: 'openai' as const, label: 'OpenAI API Key', placeholder: 'sk-...' },
                  { key: 'anthropic' as const, label: 'Anthropic API Key', placeholder: 'sk-ant-...' },
                  { key: 'gemini' as const, label: 'Google Gemini Key', placeholder: 'AIzaSy...' },
                  { key: 'openrouter' as const, label: 'OpenRouter API Key', placeholder: 'sk-or-v1-...' },
                ].map((item) => (
                  <div key={item.key} className="flex flex-col gap-1.5">
                    <label htmlFor={`api-key-${item.key}`} className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {item.label}
                    </label>
                    <div className="relative">
                      <input
                        id={`api-key-${item.key}`}
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
            </div>

            {/* Agent & Referee Model Config */}
            <div>
              <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                2. Ajan ve Hakem Model Seçimleri
              </h3>
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
                      } space-y-3`}
                    >
                      <div className="font-semibold text-xs text-blue-400 flex items-center justify-between">
                        <span>{item.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase">{agentCfg.provider}</span>
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
                            const newProv = e.target.value as AgentConfig['provider'];
                            const defaultModel = PROVIDER_MODEL_PRESETS[newProv]?.[0] || '';
                            setConfig({
                              ...config,
                              [item.key]: { provider: newProv, model: defaultModel },
                            });
                          }}
                          className={`w-full border rounded-lg p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isDark
                              ? 'bg-slate-900 border-slate-800 text-slate-100'
                              : 'bg-white border-slate-300 text-slate-800'
                          }`}
                        >
                          <option value="openai">OpenAI</option>
                          <option value="anthropic">Anthropic</option>
                          <option value="gemini">Google Gemini</option>
                          <option value="openrouter">OpenRouter</option>
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
                            if (e.target.value === 'custom') {
                              const inputEl = document.getElementById(`model-input-${item.key}`) as HTMLInputElement;
                              if (inputEl) {
                                inputEl.focus();
                              }
                            } else {
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
                          id={`model-input-${item.key}`}
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
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Harici Hafıza ve Çalışma Düzeni Kriterleri */}
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

                  {/* Import / Export File Buttons */}
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
                      title="Hafızayı Dosya Olarak İndir"
                    >
                      <Download size={14} />
                      <span className="hidden sm:inline">Dışarı Aktar</span>
                    </button>
                  </div>
                </div>

                <label htmlFor="memory-input" className="sr-only">Harici Hafıza</label>
                <textarea
                  id="memory-input"
                  value={memory}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMemory(val);
                    safeSaveStorage('ai_consensus_memory', val);
                  }}
                  placeholder="Ajanlara aktarılacak doküman özeti, geçmiş bağlam veya kuralları buraya yapıştırın veya dosya yükleyin..."
                  className={`w-full min-h-[140px] border rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y leading-relaxed ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-600'
                      : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Çalışma Düzeni Kriterleri */}
              <div
                className={`p-4 rounded-xl border flex flex-col gap-3 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-emerald-500">
                    <ClipboardCheck size={18} /> 4. Çalışma Düzeni Kriterleri
                  </h3>
                </div>

                <label htmlFor="criteria-input" className="sr-only">Çalışma Düzeni Kriterleri</label>
                <textarea
                  id="criteria-input"
                  value={evaluationCriteria}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEvaluationCriteria(val);
                    safeSaveStorage('ai_consensus_criteria', val);
                  }}
                  placeholder="Hakemin değerlendirme kurallarını girin. Örn: Kod yazarken DRY standartlarına uy, çelişkileri belirt, net ve Türkçe yanıtlar ver..."
                  className={`w-full min-h-[140px] border rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y leading-relaxed ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-600'
                      : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* MAIN WORKING AREA - PROMPT INPUT */}
        <div
          className={`border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="space-y-2">
            <label htmlFor="prompt-input" className={`font-semibold text-sm flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              <Bot size={18} className="text-blue-500" /> Ana Sorgu / Soru
            </label>
            <textarea
              id="prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ajanların analiz etmesini ve yanıtlamasını istediğiniz ana soruyu ayrıntılı bir şekilde buraya yazın..."
              className={`w-full min-h-[200px] border rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed resize-y ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSearch}
              disabled={loading || !prompt.trim()}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Ajanlar Analiz Ediyor...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Ajanları Çalıştır ve Konsensüs Sağla</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3 AGENT OUTPUT PANELS */}
        <div>
          <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            <Globe size={18} className="text-indigo-500" /> Ajan Yanıtları
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { key: 'agentA' as const, name: 'Ajan A', cfg: config.agentA },
              { key: 'agentB' as const, name: 'Ajan B', cfg: config.agentB },
              { key: 'agentC' as const, name: 'Ajan C', cfg: config.agentC },
            ].map((item) => (
              <div
                key={item.key}
                className={`border rounded-2xl p-4 flex flex-col h-[380px] transition-colors ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-slate-700/50">
                  <span className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {item.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded font-semibold">
                      {item.cfg.provider}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded truncate max-w-[130px] ${
                        isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                      }`}
                      title={item.cfg.model}
                    >
                      {item.cfg.model}
                    </span>
                  </div>
                </div>

                <div
                  className={`flex-1 overflow-y-auto text-xs whitespace-pre-wrap leading-relaxed p-3.5 rounded-xl border ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {results[item.key] ||
                    (loading ? (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Loader2 className="animate-spin" size={14} />
                        <span>Ajan yanıtı bekleniyor...</span>
                      </div>
                    ) : (
                      'Sorgu bekleniyor.'
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* HAKEM REFEREE CONSENSUS PANEL */}
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
                  Hakem Penceresi: Konsensüs Yanıtı
                </h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Model: {config.referee.provider.toUpperCase()} ({config.referee.model})
                </p>
              </div>
            </div>

            {/* Markdown Export & Copy Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyMarkdown}
                disabled={!results.consensus}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 ${
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
                disabled={!results.consensus && !results.agentA}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Download size={14} />
                <span>Markdown Olarak İndir (.md)</span>
              </button>
            </div>
          </div>

          <div
            className={`border rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed min-h-[160px] ${
              isDark
                ? 'bg-slate-950 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900 shadow-inner'
            }`}
          >
            {results.consensus ||
              (loading ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="animate-spin" size={16} />
                  <span>Hakem kriterlerinize göre süzüyor ve konsensüs oluşturuyor...</span>
                </div>
              ) : (
                'Çalışma düzeni ve kriterlerine göre filtrelenmiş hakem konsensüs yanıtı burada görünecektir.'
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}
