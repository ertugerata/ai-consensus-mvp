'use client';

import { RefObject, ChangeEvent } from 'react';
import { Bot, Database, ClipboardCheck, BookOpen, FileText, Folder, Layers, Send, Loader2 } from 'lucide-react';
import { ConfigState, getPrimaryAgents } from '@/lib/types';

const MAX_PROMPT_CHARS = 20000;

interface PromptFormProps {
  isDark: boolean;
  prompt: string;
  setPrompt: (value: string) => void;
  memory: string;
  setMemory: (value: string | ((prev: string) => string)) => void;
  evaluationCriteria: string;
  setEvaluationCriteria: (value: string) => void;
  config: ConfigState;
  loading: boolean;
  filesInputRef: RefObject<HTMLInputElement | null>;
  folderInputRef: RefObject<HTMLInputElement | null>;
  onOpenMcpModal: () => void;
  onLocalFilesUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onLocalFolderUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onSafeSaveStorage: (key: string, value: string) => void;
  onSearch: () => void;
}

export function PromptForm({
  isDark,
  prompt,
  setPrompt,
  memory,
  setMemory,
  evaluationCriteria,
  setEvaluationCriteria,
  config,
  loading,
  filesInputRef,
  folderInputRef,
  onOpenMcpModal,
  onLocalFilesUpload,
  onLocalFolderUpload,
  onSafeSaveStorage,
  onSearch,
}: PromptFormProps) {
  const primaryAgentsList = getPrimaryAgents(config);

  return (
    <div
      className={`border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label
            htmlFor="prompt-input"
            className={`font-semibold text-sm flex items-center gap-2 ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}
          >
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
        <div
          className={`p-3 rounded-xl border ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
            <label htmlFor="memory-quick" className="text-xs font-semibold flex items-center gap-1.5 text-blue-400">
              <Database size={14} /> Harici Hafıza / Bağlam
            </label>

            {/* Hidden File and Folder Inputs */}
            <input
              type="file"
              ref={filesInputRef}
              onChange={onLocalFilesUpload}
              multiple
              accept=".txt,.md,.json,.csv,.py,.js,.ts,.tsx,.jsx,.html,.css,.sql,.yml,.yaml,.xml,.log"
              className="hidden"
            />
            <input
              type="file"
              ref={folderInputRef}
              onChange={onLocalFolderUpload}
              {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
              multiple
              className="hidden"
            />

            {/* Attachment Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={onOpenMcpModal}
                className="text-[10px] px-2 py-1 rounded border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-semibold flex items-center gap-1 transition-all"
                title="MCP sunucusundan kaynak seç"
              >
                <BookOpen size={11} /> MCP (Kaynaklar)
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
              onSafeSaveStorage('ai_consensus_memory', e.target.value);
            }}
            rows={2}
            placeholder="İsteğe bağlı ek hafıza/doküman bağlamı..."
            className={`w-full border rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-600'
                : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
            }`}
          />
        </div>

        <div
          className={`p-3 rounded-xl border ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
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
              onSafeSaveStorage('ai_consensus_criteria', e.target.value);
            }}
            rows={2}
            placeholder="Hakemin kararda göz önünde bulunduracağı özel kriterler..."
            className={`w-full border rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-600'
                : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
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
          onClick={onSearch}
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
  );
}
