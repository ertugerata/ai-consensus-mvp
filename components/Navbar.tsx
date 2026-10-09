'use client';

import { PanelLeft, Settings, Sun, Moon, Sparkles } from 'lucide-react';

interface NavbarProps {
  isDark: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  toggleTheme: () => void;
  showSettings: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  openSkillManager?: () => void;
  skillCount?: number;
}

export function Navbar({
  isDark,
  isSidebarOpen,
  setIsSidebarOpen,
  toggleTheme,
  showSettings,
  openSettings,
  closeSettings,
  openSkillManager,
  skillCount,
}: NavbarProps) {
  return (
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

        {/* Skills Manager Button */}
        {openSkillManager && (
          <button
            onClick={openSkillManager}
            aria-label="Ajan becerilerini yönet"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-indigo-400'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-indigo-700 shadow-sm'
            }`}
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline">Beceriler (.md)</span>
            {typeof skillCount === 'number' && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-400 font-bold">
                {skillCount}
              </span>
            )}
          </button>
        )}

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
  );
}
