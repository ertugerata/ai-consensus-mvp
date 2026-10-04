'use client';

import {
  Sliders,
  Check,
  X,
  EyeOff,
  Eye,
  AlertCircle,
  Server,
  Plus,
  Trash2,
  ClipboardCheck,
} from 'lucide-react';
import {
  ApiKeys,
  ConfigState,
  AgentConfig,
  ProviderType,
  getPrimaryAgents,
} from '@/lib/types';
import { PROVIDER_MODEL_PRESETS } from '@/lib/config/agents';

interface SettingsModalProps {
  isDark: boolean;
  showSettings: boolean;
  closeSettings: () => void;
  saveSettings: () => void;
  apiKeys: ApiKeys;
  setApiKeys: (keys: ApiKeys) => void;
  showKeys: boolean;
  setShowKeys: (show: boolean) => void;
  apiAccessToken: string;
  setApiAccessToken: (token: string) => void;
  openNotebookUrl: string;
  setOpenNotebookUrl: (url: string) => void;
  openNotebookApiKey: string;
  setOpenNotebookApiKey: (key: string) => void;
  enableCrossReview: boolean;
  setEnableCrossReview: (enable: boolean) => void;
  config: ConfigState;
  setConfig: (config: ConfigState) => void;
  onAddAgent: () => void;
  onRemoveAgent: (agentId: string) => void;
  onUpdateAgent: (agentId: string, updatedAgent: Partial<AgentConfig>) => void;
}

export function SettingsModal({
  isDark,
  showSettings,
  closeSettings,
  saveSettings,
  apiKeys,
  setApiKeys,
  showKeys,
  setShowKeys,
  apiAccessToken,
  setApiAccessToken,
  openNotebookUrl,
  setOpenNotebookUrl,
  openNotebookApiKey,
  setOpenNotebookApiKey,
  enableCrossReview,
  setEnableCrossReview,
  config,
  setConfig,
  onAddAgent,
  onRemoveAgent,
  onUpdateAgent,
}: SettingsModalProps) {
  if (!showSettings) return null;

  const primaryAgentsList = getPrimaryAgents(config);

  return (
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
          {/* Provider API Keys & API Token */}
          <div>
            <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              1. Provider API Key ve Sistem Doğrulama Ayarları
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-3">
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

              {/* System API Access Token Field */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="api-access-token-modal" className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  API Erişim Token&apos;ı (Sistem Doğrulama)
                </label>
                <div className="relative">
                  <input
                    id="api-access-token-modal"
                    type={showKeys ? 'text' : 'password'}
                    value={apiAccessToken}
                    onChange={(e) => setApiAccessToken(e.target.value)}
                    placeholder="API_ACCESS_TOKEN (varsa)..."
                    className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-xs space-y-2 ${
              isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-400 shrink-0" />
                <span>
                  <strong>Güvenlik Uyarısı:</strong> Tarayıcı ön yüzünden girilen API anahtarları yerel hafızada (localStorage) saklanır. Üretim ortamında anahtarlarınızı sunucu tarafında <code>.env</code> dosyasında tanımlamanız önerilir.
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800/50">
                <Server size={16} className="text-blue-400 shrink-0" />
                <span>
                  <strong>Ollama Yapılandırması:</strong> Yerel Ollama adresi sunucu tarafında <code>OLLAMA_BASE_URL</code> ortam değişkeni ile belirlenir.
                </span>
              </div>
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
                  onClick={onAddAgent}
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
                          onChange={(e) => onUpdateAgent(ag.id || '', { name: e.target.value })}
                          className={`font-semibold text-xs border rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isDark ? 'border-slate-800 text-blue-400' : 'border-slate-300 text-blue-700'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => onRemoveAgent(ag.id || '')}
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
                            onUpdateAgent(ag.id || '', { provider: newProv, model: defaultModel });
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
                              onUpdateAgent(ag.id || '', { model: e.target.value });
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
                          onChange={(e) => onUpdateAgent(ag.id || '', { model: e.target.value })}
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
                          onChange={(e) => onUpdateAgent(ag.id || '', { systemPrompt: e.target.value })}
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
  );
}
