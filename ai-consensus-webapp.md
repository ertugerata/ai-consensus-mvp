# AI Multi-Agent Consensus Web App (MVP)

Bu döküman, **Next.js 14+ (App Router)**, **Tailwind CSS** ve **TypeScript** mimarisi üzerinde çalışan; harici hafıza (memory) aktarımı, dinamik sağlayıcı (provider) ayarları ve 3 farklı modelin çıktılarını yan yana gösteren tam teşekküllü bir MVP projesidir.

---

## 🚀 Proje Kurulum Adımları

1. **Yeni Proje Oluşturun:**
   ```bash
   npx create-next-app@latest ai-consensus-mvp --typescript --tailwind --app
   cd ai-consensus-mvp
   ```

2. **Gerekli Kütüphaneleri Yükleyin:**
   ```bash
   npm install openai @anthropic-ai/sdk @google/generative-ai lucide-react
   ```

3. **Dosya Yapısını Oluşturun:**
   Aşağıdaki kodları projenizdeki ilgili dosyalara yapıştırın.

---

## 🛠️ Kaynak Kodları

### 1. API Route (`app/api/consensus/route.ts`)

```typescript
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { prompt, memory, settings } = await req.json();

    // Hafıza (Memory) ve Ana Soruyu birleştiriyoruz
    const fullPrompt = memory 
      ? `[HARİCİ HAFIZA BİLGİSİ]\n${memory}\n\n[KULLANICI SORUSU]\n${prompt}`
      : prompt;

    // Paralel çağrılar için promise dizisi
    const promises = settings.map(async (agent: any) => {
      if (!agent.apiKey || !agent.enabled) {
        return { id: agent.id, name: agent.name, status: 'disabled', content: 'Bu ajan devre dışı veya API anahtarı girilmemiş.' };
      }

      try {
        if (agent.provider === 'openai') {
          const openai = new OpenAI({ apiKey: agent.apiKey });
          const res = await openai.chat.completions.create({
            model: agent.model || 'gpt-4o-mini',
            messages: [{ role: 'user', content: fullPrompt }],
          });
          return { id: agent.id, name: agent.name, status: 'success', content: res.choices[0].message.content };
        } 
        
        if (agent.provider === 'anthropic') {
          const anthropic = new Anthropic({ apiKey: agent.apiKey });
          const res = await anthropic.messages.create({
            model: agent.model || 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [{ role: 'user', content: fullPrompt }],
          });
          const text = res.content[0].type === 'text' ? (res.content[0] as any).text : '';
          return { id: agent.id, name: agent.name, status: 'success', content: text };
        }

        if (agent.provider === 'google') {
          const googleAI = new GoogleGenAI({ apiKey: agent.apiKey });
          const model = googleAI.getGenerativeModel({ model: agent.model || 'gemini-1.5-flash' });
          const res = await model.generateContent(fullPrompt);
          return { id: agent.id, name: agent.name, status: 'success', content: res.response.text() };
        }

        return { id: agent.id, name: agent.name, status: 'error', content: 'Bilinmeyen sağlayıcı.' };
      } catch (err: any) {
        return { id: agent.id, name: agent.name, status: 'error', content: `Hata: ${err.message}` };
      }
    });

    const results = await Promise.all(promises);
    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 2. Ana Arayüz Dosyası (`app/page.tsx`)

```tsx
'use client';

import React, { useState } from 'react';
import { Settings, Brain, Play, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface AgentSetting {
  id: number;
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  apiKey: string;
  enabled: boolean;
}

interface AgentResult {
  id: number;
  name: string;
  status: 'success' | 'error' | 'disabled';
  content: string;
}

export default function MVPPage() {
  const [showSettings, setShowSettings] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [memory, setMemory] = useState('');
  const [loading, setLoading] = useState(false);
  const [showKeys, setShowKeys] = useState<{ [key: number]: boolean }>({});
  
  // 3 Farklı Ajan için Varsayılan Ayarlar
  const [agents, setAgents] = useState<AgentSetting[]>([
    { id: 1, name: 'Ajan 1 (OpenAI)', provider: 'openai', model: 'gpt-4o-mini', apiKey: '', enabled: true },
    { id: 2, name: 'Ajan 2 (Anthropic)', provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', apiKey: '', enabled: true },
    { id: 3, name: 'Ajan 3 (Google)', provider: 'google', model: 'gemini-1.5-flash', apiKey: '', enabled: true },
  ]);

  const [results, setResults] = useState<AgentResult[]>([]);

  const handleAgentChange = (id: number, fields: Partial<AgentSetting>) => {
    setAgents(agents.map(a => a.id === id ? { ...a, ...fields } : a));
  };

  const toggleKeyVisibility = (id: number) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResults([]);

    try {
      const response = await fetch('/api/consensus', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, memory, settings: agents })
      });
      
      const data = await response.json();
      if (data.results) {
        setResults(data.results);
      } else {
        alert(data.error || 'Bir hata oluştu');
      }
    } catch (err: any) {
      alert('Sistem hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6 selection:bg-indigo-500 selection:text-white">
      {/* Üst Bar */}
      <header className="max-w-7xl mx-auto flex justify-between items-center pb-6 border-b border-slate-800 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Consensus AI MVP
            </h1>
            <p className="text-xs text-slate-400">Çoklu Ajan Karşılaştırma & Konsensüs Paneli</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
            showSettings 
              ? 'bg-slate-800 border-slate-700 text-indigo-400' 
              : 'bg-indigo-600/10 border-indigo-500/20 text-indigo-300 hover:bg-indigo-600/20'
          }`}
        >
          <Settings className={`w-4 h-4 ${showSettings ? 'rotate-45' : ''} transition-transform duration-300`} />
          {showSettings ? 'Ayarları Kapat' : 'Model & API Ayarları'}
        </button>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        {/* Ayarlar Paneli (Açılır/Kapanır) */}
        {showSettings && (
          <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-200">
            <h2 className="text-md font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-400" /> Yapay Zeka Sağlayıcıları Ayarları
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {agents.map((agent) => (
                <div key={agent.id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="font-medium text-sm text-indigo-300">{agent.name}</span>
                    <input 
                      type="checkbox" 
                      checked={agent.enabled}
                      onChange={(e) => handleAgentChange(agent.id, { enabled: e.target.checked })}
                      className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Sağlayıcı (Provider)</label>
                    <select 
                      value={agent.provider}
                      onChange={(e) => handleAgentChange(agent.id, { provider: e.target.value as any })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="google">Google Gemini</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Model Adı</label>
                    <input 
                      type="text"
                      value={agent.model}
                      onChange={(e) => handleAgentChange(agent.id, { model: e.target.value })}
                      placeholder="Örn: gpt-4o-mini"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">API Key</label>
                    <div className="relative">
                      <input 
                        type={showKeys[agent.id] ? 'text' : 'password'}
                        value={agent.apiKey}
                        onChange={(e) => handleAgentChange(agent.id, { apiKey: e.target.value })}
                        placeholder="sk-..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-2 pr-8 py-2 text-xs text-slate-200 tracking-wider focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility(agent.id)}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
                      >
                        {showKeys[agent.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Alanı (Memory + Prompt) */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol Kolon: Memory Input */}
          <div className="lg:col-span-1 bg-slate-800/40 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Brain className="w-4 h-4 text-purple-400" />
              <span>Harici Hafıza (Memory Aktarımı)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Modellere temel oluşturacak doküman özetleri, geçmiş konuşma bağlamları veya kuralları buraya yapıştırın. Tüm ajanlara ortak bağlam olarak iletilir.
            </p>
            <textarea
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              placeholder="Örn: Kullanıcı bir Frontend Developer. Cevaplarda TailwindCSS kullanmaya özen göster..."
              className="flex-1 min-h-[140px] bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-sm focus:ring-1 focus:ring-purple-500 focus:outline-none text-slate-200 resize-none placeholder:text-slate-600"
            />
          </div>

          {/* Sağ Kolon: Main Prompt */}
          <div className="lg:col-span-2 bg-slate-800/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 block">Sormak İstediğiniz Soru</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ajanların analiz etmesini istediğiniz soruyu buraya ayrıntılıca girin..."
                required
                className="w-full min-h-[120px] bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-200 resize-none placeholder:text-slate-600"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-600/10 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Ajanlar Analiz Ediyor...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>Tüm Ajanlara Sor</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Cevap Pencereleri (3 Sütun) */}
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-4">Ajan Çıktıları Panel Görünümü</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {agents.map((agent, index) => {
              const res = results.find(r => r.id === agent.id);
              
              return (
                <div 
                  key={agent.id} 
                  className={`border rounded-2xl bg-slate-900/40 flex flex-col min-h-[400px] transition-all duration-300 ${
                    loading ? 'opacity-40 pointer-events-none scale-[0.99]' : ''
                  } ${
                    !agent.enabled ? 'border-slate-800/40 bg-slate-950/20' : 'border-slate-800 hover:border-slate-700/80'
                  }`}
                >
                  {/* Pencere Başlığı */}
                  <div className="px-4 py-3 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/50 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        !agent.enabled ? 'bg-slate-600' : res?.status === 'error' ? 'bg-red-500' : res?.status === 'success' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`} />
                      <span className="font-semibold text-sm text-slate-300">{agent.name}</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                      {agent.provider}
                    </span>
                  </div>

                  {/* Pencere İçeriği */}
                  <div className="p-4 flex-1 text-sm text-slate-300 overflow-y-auto leading-relaxed whitespace-pre-wrap font-sans">
                    {!agent.enabled ? (
                      <p className="text-slate-500 text-center italic mt-12">Bu ajan ayarlardan devre dışı bırakıldı.</p>
                    ) : loading ? (
                      <div className="space-y-3 mt-4">
                        <div className="h-4 bg-slate-800 rounded w-3/4 animate-pulse" />
                        <div className="h-4 bg-slate-800 rounded animate-pulse" />
                        <div className="h-4 bg-slate-800 rounded w-5/6 animate-pulse" />
                      </div>
                    ) : res ? (
                      res.status === 'error' ? (
                        <div className="text-red-400 flex items-start gap-2 bg-red-950/20 border border-red-900/30 p-3 rounded-xl text-xs">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{res.content}</span>
                        </div>
                      ) : (
                        res.content
                      )
                    ) : (
                      <p className="text-slate-600 text-center italic mt-12">Soru bekleniyor...</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
```
