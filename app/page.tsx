'use client';
import { useState, useEffect } from 'react';
import { Settings, Send, Database, ClipboardCheck, Loader2, Eye, EyeOff } from 'lucide-react';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [memory, setMemory] = useState('');
  const [evaluationCriteria, setEvaluationCriteria] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showKeys, setShowKeys] = useState(false);

  const [apiKeys, setApiKeys] = useState({ openai: '', anthropic: '', gemini: '' });
  const [config, setConfig] = useState({
    agentA: { provider: 'openai', model: 'gpt-4o-mini' },
    agentB: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' },
    agentC: { provider: 'gemini', model: 'gemini-1.5-flash' },
  });

  const [results, setResults] = useState({ agentA: '', agentB: '', agentC: '', consensus: '' });

  useEffect(() => {
    const savedKeys = localStorage.getItem('ai_consensus_keys');
    const savedConfig = localStorage.getItem('ai_consensus_config');
    const savedCriteria = localStorage.getItem('ai_consensus_criteria');
    if (savedKeys) setApiKeys(JSON.parse(savedKeys));
    if (savedConfig) setConfig(JSON.parse(savedConfig));
    if (savedCriteria) setEvaluationCriteria(savedCriteria);
  }, []);

  const saveSettings = () => {
    localStorage.setItem('ai_consensus_keys', JSON.stringify(apiKeys));
    localStorage.setItem('ai_consensus_config', JSON.stringify(config));
    localStorage.setItem('ai_consensus_criteria', evaluationCriteria);
    setShowSettings(false);
  };

  const handleSearch = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, memory, evaluationCriteria, apiKeys, config }),
      });
      const data = await res.json();
      setResults({
        agentA: data.agentA || '',
        agentB: data.agentB || '',
        agentC: data.agentC || '',
        consensus: data.consensus || '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            AI Consensus Suite v3
          </h1>
          <p className="text-sm text-slate-400">Özel Kriterli Çoklu Ajan ve Hakem Sistemi</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg border border-slate-700 transition-colors"
        >
          <Settings size={18} />
          <span>Ayarlar & Kriterler</span>
        </button>
      </header>

      {showSettings && (
        <div className="max-w-7xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2">API Anahtarları</h3>
            <div className="space-y-4">
              {['openai', 'anthropic', 'gemini'].map((p) => (
                <div key={p} className="flex flex-col gap-1">
                  <label className="text-xs uppercase text-slate-400 font-semibold">{p}</label>
                  <div className="relative">
                    <input
                      type={showKeys ? 'text' : 'password'}
                      value={(apiKeys as any)[p]}
                      onChange={(e) => setApiKeys({ ...apiKeys, [p]: e.target.value })}
                      placeholder={`${p.toUpperCase()} API Key`}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeys(!showKeys)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      {showKeys ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-emerald-400 flex items-center gap-2">
              <ClipboardCheck size={18} /> Çalışma Düzeni Kriterleri
            </h3>
            <div className="flex flex-col gap-4">
              <textarea
                value={evaluationCriteria}
                onChange={(e) => setEvaluationCriteria(e.target.value)}
                placeholder="Örn: Kod yazarken DRY prensiplerine uyumu incele. Metin yazıyorsan kurumsal ve sade bir Türkçe ile nihai çıktıyı ver..."
                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 resize-none"
              />
              <button
                onClick={saveSettings}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg transition-colors"
              >
                Ayarları Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
          <h2 className="font-semibold text-sm flex items-center gap-2 text-blue-400">
            <Database size={16} /> Harici Hafıza (Memory)
          </h2>
          <textarea
            value={memory}
            onChange={(e) => setMemory(e.target.value)}
            placeholder="Ajanlara aktarılacak doküman özeti veya kuralları buraya yapıştırın..."
            className="w-full flex-1 min-h-[200px] bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
          <h2 className="font-semibold text-sm text-slate-200">Sorgu Alanı</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ajanların yanıtlamasını istediğiniz ana soruyu girin..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 px-6 rounded-lg transition-colors flex items-center gap-2 font-medium"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              <span>Sorgula</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { key: 'agentA', label: 'Ajan A (GPT)', model: config.agentA.model },
          { key: 'agentB', label: 'Ajan B (Claude)', model: config.agentB.model },
          { key: 'agentC', label: 'Ajan C (Gemini)', model: config.agentC.model },
        ].map((item) => (
          <div key={item.key} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[350px]">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
              <span className="font-semibold text-sm text-slate-300">{item.label}</span>
              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400">{item.model}</span>
            </div>
            <div className="flex-1 overflow-y-auto text-xs text-slate-300 whitespace-pre-wrap bg-slate-950 p-3 rounded-lg border border-slate-800">
              {(results as any)[item.key] || (loading ? 'İstek işleniyor...' : 'Sorgu bekleniyor.')}
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 rounded-xl p-6">
        <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2 mb-4">
          <ClipboardCheck size={22} /> Hakem Penceresi: Çalışma Düzenine Göre Konsensüs
        </h2>
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-200 whitespace-pre-wrap min-h-[150px]">
          {results.consensus || (loading ? 'Hakem kriterlerinize göre süzüyor...' : 'Kriterlere göre filtrelenmiş sonuç burada görünecektir.')}
        </div>
      </div>
    </main>
  );
}
