'use client';

import {
  Sliders,
  Check,
  X,
  AlertCircle,
  Plus,
  Trash2,
  ClipboardCheck,
  Zap,
  Folder,
  Sparkles,
  FileText,
  Eye,
  Server,
} from 'lucide-react';
import {
  ConfigState,
  AgentConfig,
  ProviderType,
  getPrimaryAgents,
  AgentSkill,
} from '@/lib/types';
import { PROVIDER_MODEL_PRESETS, AGENT_SKILLS } from '@/lib/config/agents';

interface SettingsModalProps {
  isDark: boolean;
  showSettings: boolean;
  closeSettings: () => void;
  saveSettings: () => void;
  apiAccessToken: string;
  setApiAccessToken: (token: string) => void;
  enableCrossReview: boolean;
  setEnableCrossReview: (enable: boolean) => void;
  config: ConfigState;
  setConfig: (config: ConfigState) => void;
  configuredProviders: Record<ProviderType, boolean>;
  onAddAgent: () => void;
  onRemoveAgent: (agentId: string) => void;
  onUpdateAgent: (agentId: string, updatedAgent: Partial<AgentConfig>) => void;
  skills?: AgentSkill[];
  skillsDirectory?: string;
  onOpenSkillManager?: () => void;
  mcpServerUrl?: string;
  setMcpServerUrl?: (url: string) => void;
  mcpApiKey?: string;
  setMcpApiKey?: (key: string) => void;
}

const PROVIDER_NAMES: Record<ProviderType, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
  openrouter: 'OpenRouter',
  ollama: 'Ollama (Yerel)',
};

export function SettingsModal({
  isDark,
  showSettings,
  closeSettings,
  saveSettings,
  apiAccessToken,
  setApiAccessToken,
  enableCrossReview,
  setEnableCrossReview,
  config,
  setConfig,
  configuredProviders,
  onAddAgent,
  onRemoveAgent,
  onUpdateAgent,
  skills = [],
  skillsDirectory = 'skills/agents',
  onOpenSkillManager,
  mcpServerUrl = 'http://localhost:5055',
  setMcpServerUrl = () => {},
  mcpApiKey = '',
  setMcpApiKey = () => {},
}: SettingsModalProps) {
  if (!showSettings) return null;

  const availableSkills = skills && skills.length > 0 ? skills : AGENT_SKILLS;
  const primaryAgentsList = getPrimaryAgents(config);

  const availableProviderKeys = (Object.keys(PROVIDER_NAMES) as ProviderType[]).filter(
    (p) => configuredProviders[p] !== false
  );

  const hasAnyConfiguredProvider = availableProviderKeys.length > 0;

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
            <Sliders size={20} /> Ajan Harness ve Model Yapılandırması
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
          {!hasAnyConfiguredProvider && (
            <div className="p-4 rounded-xl border border-amber-500/50 bg-amber-500/10 text-amber-400 flex items-center gap-3 text-xs">
              <AlertCircle size={18} className="shrink-0" />
              <span>
                Sunucuda herhangi bir API anahtarı tanımlanmamıştır. Lütfen sunucu tarafında <code>.env</code> dosyanıza API anahtarlarınızı (ör. <code>OPENAI_API_KEY</code>, <code>ANTHROPIC_API_KEY</code>, <code>OPENROUTER_API_KEY</code>) veya <code>OLLAMA_BASE_URL</code> değerini ekleyin.
              </span>
            </div>
          )}

          {/* System Access Token Section if needed */}
          <div className={`p-4 rounded-xl border text-xs space-y-2 ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label htmlFor="api-access-token-modal" className={`font-semibold text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Sistem API Erişim Token&apos;ı
                </label>
                <p className="text-[11px] text-slate-400">
                  Sunucuda <code>API_ACCESS_TOKEN</code> tanımlı ise doğrulamak için buraya girin. API anahtarları ise <code>.env</code> dosyasından çekilmektedir.
                </p>
              </div>
              <input
                id="api-access-token-modal"
                type="password"
                value={apiAccessToken}
                onChange={(e) => setApiAccessToken(e.target.value)}
                placeholder="API_ACCESS_TOKEN..."
                className={`w-full sm:w-64 border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-600'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {/* MCP Server Configuration Section */}
          <div className={`p-4 rounded-xl border text-xs space-y-3 ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b pb-2 border-slate-800/60">
              <div className="font-bold text-xs text-blue-400 flex items-center gap-1.5">
                <Server size={16} /> Model Context Protocol (MCP) Yapılandırması
              </div>
              <span className="text-[10px] text-slate-400 font-mono">MCP ENTEGRASYONU</span>
            </div>

            <p className="text-[11px] text-slate-400">
              Harici MCP sunucusuna bağlanarak kaynak, not ve dokümanları ajan hafızasına veya sorunuza aktarın. Sunucu tarafında <code>MCP_SERVER_URL</code> ve <code>MCP_API_KEY</code> ortam değişkenlerinden de yapılandırılabilir.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label htmlFor="mcp-server-url" className={`font-semibold text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  MCP Sunucu Adresi (URL)
                </label>
                <input
                  id="mcp-server-url"
                  type="text"
                  value={mcpServerUrl}
                  onChange={(e) => setMcpServerUrl(e.target.value)}
                  placeholder="http://localhost:5055"
                  className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-600'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="mcp-api-key" className={`font-semibold text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  MCP API Anahtarı (İsteğe Bağlı)
                </label>
                <input
                  id="mcp-api-key"
                  type="password"
                  value={mcpApiKey}
                  onChange={(e) => setMcpApiKey(e.target.value)}
                  placeholder="MCP API Key..."
                  className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-600'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
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
                  Ajan ve Beceri (Skill) Yapılandırması (En az 2 Ajan + 1 Hakem)
                </h3>
                <p className="text-xs text-slate-400">
                  Ajanlarınız için etkinleştirilmiş API sağlayıcılarından model seçebilir ve her ajana özel bir beceri atayabilirsiniz.
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

            {/* Designated Skills Directory Banner */}
            <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-4 ${
              isDark ? 'bg-indigo-950/40 border-indigo-900/60 text-indigo-300' : 'bg-indigo-50/90 border-indigo-200 text-indigo-900'
            }`}>
              <div className="flex items-center gap-2">
                <Folder size={16} className="text-indigo-400 shrink-0" />
                <span>
                  <strong>Ajan Beceri Dizini:</strong>{' '}
                  <code className="font-mono bg-black/20 px-1.5 py-0.5 rounded text-indigo-200 font-semibold">
                    {`${skillsDirectory || 'skills/agents'}/*.md`}
                  </code>
                  <span className="ml-2 opacity-80 hidden md:inline">
                    — Bu dizindeki tüm Markdown dosyaları ajan becerisi olarak seçilebilir.
                  </span>
                </span>
              </div>
              {onOpenSkillManager && (
                <button
                  type="button"
                  onClick={onOpenSkillManager}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0 shadow-sm"
                >
                  <Sparkles size={13} />
                  <span>.md Becerilerini Yönet</span>
                </button>
              )}
            </div>

            {/* Primary Agents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {primaryAgentsList.map((ag, idx) => {
                const availablePresets = PROVIDER_MODEL_PRESETS[ag.provider] || [];
                const currentSkill = availableSkills.find((s) => s.id === (ag.skill || 'analytical')) || availableSkills[0];

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

                      {/* Skill (Beceri) Select */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className={`text-[11px] font-medium flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                            <Zap size={13} /> Ajan Becerisi (Skill)
                          </label>
                          {onOpenSkillManager && (
                            <button
                              type="button"
                              onClick={onOpenSkillManager}
                              className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                            >
                              <FileText size={10} /> Dosyalar (.md)
                            </button>
                          )}
                        </div>
                        <select
                          value={ag.skill || 'analytical'}
                          onChange={(e) => {
                            const selectedSkill = availableSkills.find((s) => s.id === e.target.value);
                            onUpdateAgent(ag.id || '', {
                              skill: e.target.value,
                              systemPrompt: selectedSkill?.prompt || ag.systemPrompt,
                            });
                          }}
                          className={`w-full border rounded-lg p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                          }`}
                        >
                          {availableSkills.map((skill) => (
                            <option key={skill.id} value={skill.id}>
                              {skill.name} ({skill.filename || `${skill.id}.md`})
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-400 italic line-clamp-2">
                          {currentSkill?.description || 'Açıklama mevcut değil.'}
                        </p>
                      </div>

                      {/* Provider Select */}
                      <div className="space-y-1">
                        <label className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Sağlayıcı (.env ile etkinleştirilenler)
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
                          {(Object.keys(PROVIDER_NAMES) as ProviderType[]).map((prov) => {
                            const isConfigured = configuredProviders[prov] !== false;
                            return (
                              <option key={prov} value={prov} disabled={!isConfigured}>
                                {PROVIDER_NAMES[prov]} {!isConfigured ? '(.env anahtar yok)' : ''}
                              </option>
                            );
                          })}
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
                    {(Object.keys(PROVIDER_NAMES) as ProviderType[]).map((prov) => {
                      const isConfigured = configuredProviders[prov] !== false;
                      return (
                        <option key={prov} value={prov} disabled={!isConfigured}>
                          {PROVIDER_NAMES[prov]} {!isConfigured ? '(.env anahtar yok)' : ''}
                        </option>
                      );
                    })}
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
