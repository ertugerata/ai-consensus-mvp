'use client';

import { Sparkles, PanelLeftClose, Plus, History, Loader2, Trash2 } from 'lucide-react';

export interface SessionListItem {
  id: string;
  title: string;
  prompt: string;
  created_at: string;
  updated_at: string;
}

interface SidebarProps {
  isDark: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  sessions: SessionListItem[];
  loadingSessions: boolean;
  sessionId: string | null;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
}

export function Sidebar({
  isDark,
  isSidebarOpen,
  setIsSidebarOpen,
  sessions,
  loadingSessions,
  sessionId,
  onNewSession,
  onSelectSession,
  onDeleteSession,
}: SidebarProps) {
  return (
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
          onClick={onNewSession}
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
                onClick={() => onSelectSession(s.id)}
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
                  onClick={(e) => onDeleteSession(e, s.id)}
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
  );
}
