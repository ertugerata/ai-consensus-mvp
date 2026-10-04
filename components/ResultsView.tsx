'use client';

import {
  Zap,
  Clock,
  Download,
  Globe,
  MessageSquare,
  ClipboardCheck,
  AlertCircle,
  Check,
  FileText,
} from 'lucide-react';
import {
  MultiStageResults,
  AgentExecutionResult,
  ConfigState,
  getPrimaryAgents,
} from '@/lib/types';

interface ResultsViewProps {
  isDark: boolean;
  sessionId: string | null;
  stageResults: MultiStageResults;
  config: ConfigState;
  enableCrossReview: boolean;
  activeStageTab: 'stage1' | 'stage2' | 'stage3';
  setActiveStageTab: (tab: 'stage1' | 'stage2' | 'stage3') => void;
  onExportMarkdown: () => void;
  onCopyMarkdown: () => void;
  copied: boolean;
}

export function ResultsView({
  isDark,
  sessionId,
  stageResults,
  config,
  enableCrossReview,
  activeStageTab,
  setActiveStageTab,
  onExportMarkdown,
  onCopyMarkdown,
  copied,
}: ResultsViewProps) {
  const primaryAgentsList = getPrimaryAgents(config);

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

  return (
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
            onClick={onExportMarkdown}
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
                onClick={onCopyMarkdown}
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
                onClick={onExportMarkdown}
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
  );
}
