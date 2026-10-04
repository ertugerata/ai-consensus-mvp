'use client';

import {
  BookOpen,
  X,
  Server,
  Loader2,
  Check,
  AlertCircle,
  Search,
  Database,
  Send,
} from 'lucide-react';

export interface McpNotebookItem {
  id: string;
  name: string;
  description?: string;
  sourcesCount?: number;
  notesCount?: number;
  updatedAt?: string;
}

interface McpModalProps {
  isDark: boolean;
  showMcpModal: boolean;
  setShowMcpModal: (show: boolean) => void;
  mcpBaseUrl: string;
  setMcpBaseUrl: (url: string) => void;
  mcpApiKey: string;
  setMcpApiKey: (key: string) => void;
  mcpTesting: boolean;
  mcpTestStatus: { success?: boolean; error?: string; message?: string } | null;
  mcpNotebooks: McpNotebookItem[];
  mcpLoadingNotebooks: boolean;
  mcpSelectedNotebookId: string | null;
  setMcpSelectedNotebookId: (id: string | null) => void;
  mcpFetchingContent: boolean;
  mcpSearchTerm: string;
  setMcpSearchTerm: (term: string) => void;
  onTestMcpConnection: () => void;
  onImportNotebookContent: (target: 'memory' | 'prompt') => void;
}

export function McpModal({
  isDark,
  showMcpModal,
  setShowMcpModal,
  mcpBaseUrl,
  setMcpBaseUrl,
  mcpApiKey,
  setMcpApiKey,
  mcpTesting,
  mcpTestStatus,
  mcpNotebooks,
  mcpLoadingNotebooks,
  mcpSelectedNotebookId,
  setMcpSelectedNotebookId,
  mcpFetchingContent,
  mcpSearchTerm,
  setMcpSearchTerm,
  onTestMcpConnection,
  onImportNotebookContent,
}: McpModalProps) {
  if (!showMcpModal) return null;

  return (
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
              onClick={onTestMcpConnection}
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
              onClick={() => onImportNotebookContent('memory')}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              {mcpFetchingContent ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
              <span>Hafızaya / Bağlama Ekle</span>
            </button>
            <button
              type="button"
              disabled={!mcpSelectedNotebookId || mcpFetchingContent}
              onClick={() => onImportNotebookContent('prompt')}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              {mcpFetchingContent ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>Soruma Ekle</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
