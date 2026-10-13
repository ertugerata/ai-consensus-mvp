'use client';

import { useState, useRef, ChangeEvent } from 'react';
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  Eye,
  RefreshCw,
  Check,
  X,
  Folder,
  Edit3,
  AlertCircle,
  Copy,
  FolderDown,
  Sparkles,
} from 'lucide-react';
import { AgentSkill } from '@/lib/types';

interface SkillManagerModalProps {
  isDark: boolean;
  isOpen: boolean;
  onClose: () => void;
  skills: AgentSkill[];
  skillsDirectory: string;
  onRefresh: () => Promise<void>;
  onUpload: (file: File) => Promise<boolean>;
  onCreateOrUpdate: (skill: {
    filename: string;
    content: string;
    name?: string;
    description?: string;
  }) => Promise<boolean>;
  onDelete: (skillId: string) => Promise<boolean>;
}

export function SkillManagerModal({
  isDark,
  isOpen,
  onClose,
  skills,
  skillsDirectory,
  onRefresh,
  onUpload,
  onCreateOrUpdate,
  onDelete,
}: SkillManagerModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewSkill, setPreviewSkill] = useState<AgentSkill | null>(null);
  const [editingSkill, setEditingSkill] = useState<{
    filename: string;
    name: string;
    description: string;
    content: string;
    isNew: boolean;
  } | null>(null);

  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      showFeedback('Beceri listesi güncellendi.');
    } catch {
      showFeedback('Beceriler yenilenirken hata oluştu.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let successCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.toLowerCase().endsWith('.md')) {
          const ok = await onUpload(file);
          if (ok) successCount++;
        }
      }
      if (successCount > 0) {
        showFeedback(`${successCount} adet .md beceri dosyası başarıyla yüklendi.`);
        await onRefresh();
      } else {
        showFeedback('Lütfen geçerli bir .md dosyası seçin.', 'error');
      }
    } catch {
      showFeedback('Dosya yükleme başarısız oldu.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveEditor = async () => {
    if (!editingSkill) return;
    if (!editingSkill.filename.trim()) {
      showFeedback('Dosya adı boş olamaz.', 'error');
      return;
    }
    if (!editingSkill.content.trim()) {
      showFeedback('Beceri içeriği boş olamaz.', 'error');
      return;
    }

    const ok = await onCreateOrUpdate({
      filename: editingSkill.filename.endsWith('.md')
        ? editingSkill.filename
        : `${editingSkill.filename}.md`,
      name: editingSkill.name || undefined,
      description: editingSkill.description || undefined,
      content: editingSkill.content,
    });

    if (ok) {
      showFeedback(`"${editingSkill.filename}" becerisi kaydedildi.`);
      setEditingSkill(null);
      await onRefresh();
    } else {
      showFeedback('Beceri kaydedilirken hata oluştu.', 'error');
    }
  };

  const handleDeleteSkill = async (skill: AgentSkill) => {
    if (!window.confirm(`"${skill.name}" (${skill.filename || skill.id}) beceri dosyasını silmek istediğinize emin misiniz?`)) {
      return;
    }

    const ok = await onDelete(skill.id);
    if (ok) {
      showFeedback(`"${skill.name}" silindi.`);
      if (previewSkill?.id === skill.id) setPreviewSkill(null);
      await onRefresh();
    } else {
      showFeedback('Beceri silinemedi.', 'error');
    }
  };

  const filteredSkills = skills.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.description.toLowerCase().includes(term) ||
      (s.filename || '').toLowerCase().includes(term) ||
      s.id.toLowerCase().includes(term)
    );
  });

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm overflow-y-auto"
    >
      <div
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border transition-all overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-slate-800 shadow-2xl text-slate-100'
            : 'bg-white border-slate-200 shadow-2xl text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`sticky top-0 z-20 p-5 border-b flex justify-between items-center backdrop-blur-md ${
            isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
          }`}
        >
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-400">
              <FileText size={20} /> Ajan Becerileri (Skills) ve Markdown Yöneticisi
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ajanlarınıza uzmanlık rolleri atamak için .md beceri dosyalarını yönetin.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className={`p-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                isDark
                  ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="Yenile"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Yenile</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              aria-label="Kapat"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Designated Directory Banner */}
        <div
          className={`px-5 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            isDark
              ? 'bg-indigo-950/40 border-slate-800 text-indigo-300'
              : 'bg-indigo-50/80 border-indigo-100 text-indigo-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Folder size={16} className="text-indigo-400 shrink-0" />
            <span>
              <strong>Belirlenen Beceri Dizini:</strong>{' '}
              <code className="px-1.5 py-0.5 rounded font-mono font-semibold bg-black/20 text-indigo-200">
                {skillsDirectory || 'skills/agents'}{'/*.md'}
              </code>
            </span>
          </div>

          <span className="text-[11px] opacity-80">
            Dizine eklediğiniz veya yüklediğiniz tüm .md dosyaları ajan seçim listesine otomatik eklenir.
          </span>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl border flex items-center gap-2 text-xs transition-all ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {feedbackMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Action Controls & Search */}
        <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Beceri adı, dosya veya açıklama ara..."
              className={`w-full sm:max-w-xs border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".md"
              multiple
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Upload size={14} />
              <span>{uploading ? 'Yükleniyor...' : '.md Dosyası Yükle'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setEditingSkill({
                  filename: '',
                  name: '',
                  description: '',
                  content: '# Yeni Ajan Becerisi\n\nSen bu alanda uzman bir AI asistanısın...\n',
                  isNew: true,
                })
              }
              className={`border px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                isDark
                  ? 'border-slate-800 hover:bg-slate-800 text-slate-200'
                  : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Plus size={14} />
              <span>Yeni Beceri Yaz</span>
            </button>
          </div>
        </div>

        {/* Main List Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredSkills.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-3">
              <FolderDown size={36} className="mx-auto opacity-40 text-indigo-400" />
              <p className="text-sm">Hiç beceri dosyası bulunamadı.</p>
              <p className="text-xs text-slate-400">
                <code>skills/agents/</code> dizinine bir <code>.md</code> dosyası yükleyerek veya sağ üstten yeni bir beceri oluşturarak başlayabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredSkills.map((skill) => (
                <div
                  key={skill.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    isDark
                      ? 'bg-slate-950/70 border-slate-800/90 hover:border-indigo-500/50'
                      : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-xs flex items-center gap-1.5 text-indigo-400">
                          <Sparkles size={13} className="shrink-0 text-amber-400" />
                          <span>{skill.name}</span>
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/20 text-slate-400 border border-slate-800">
                            {skill.filename || `${skill.id}.md`}
                          </span>
                          {skill.isCustom && (
                            <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                              Özel
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewSkill(skill)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors"
                          title="Önizle"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingSkill({
                              filename: skill.filename || `${skill.id}.md`,
                              name: skill.name,
                              description: skill.description,
                              content: skill.prompt,
                              isNew: false,
                            })
                          }
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
                          title="Düzenle"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSkill(skill)}
                          className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {skill.description || 'Açıklama belirtilmemiş.'}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                    <span>
                      {skill.prompt.length.toLocaleString('tr-TR')} karakter
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewSkill(skill)}
                      className="text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Talimatları İncele</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skill Preview Modal */}
        {previewSkill && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div
              className={`w-full max-w-2xl max-h-[85vh] rounded-2xl border flex flex-col overflow-hidden ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="p-4 border-b flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2 text-indigo-400">
                    <Eye size={16} /> {previewSkill.name}
                  </h3>
                  <span className="font-mono text-[10px] text-slate-400">
                    {skillsDirectory}/{previewSkill.filename || `${previewSkill.id}.md`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewSkill(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>Markdown Prompt İçeriği:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(previewSkill.prompt);
                      showFeedback('Prompt panoya kopyalandı.');
                    }}
                    className="hover:text-slate-200 flex items-center gap-1"
                  >
                    <Copy size={12} /> Kopyala
                  </button>
                </div>
                <pre
                  className={`p-3.5 rounded-xl border whitespace-pre-wrap leading-relaxed font-sans text-xs ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  {previewSkill.prompt}
                </pre>
              </div>

              <div className="p-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSkill({
                      filename: previewSkill.filename || `${previewSkill.id}.md`,
                      name: previewSkill.name,
                      description: previewSkill.description,
                      content: previewSkill.prompt,
                      isNew: false,
                    });
                    setPreviewSkill(null);
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                >
                  Bu Beceriyi Düzenle
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSkill(null)}
                  className="px-3 py-1.5 rounded-lg border text-xs font-medium border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create / Edit Skill Modal */}
        {editingSkill && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div
              className={`w-full max-w-2xl max-h-[88vh] rounded-2xl border flex flex-col overflow-hidden ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-sm font-bold flex items-center gap-2 text-indigo-400">
                  <Edit3 size={16} />{' '}
                  {editingSkill.isNew ? 'Yeni Markdown Becerisi Oluştur' : `Beceriyi Düzenle (${editingSkill.filename})`}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingSkill(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1 text-slate-300">
                    Dosya Adı (.md)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-slate-500">skills/agents/</span>
                    <input
                      type="text"
                      value={editingSkill.filename}
                      onChange={(e) =>
                        setEditingSkill({ ...editingSkill, filename: e.target.value })
                      }
                      placeholder="orn: yazilim-mimari.md"
                      className={`flex-1 border rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1 text-slate-300">
                      Görünen İsim (Opsiyonel)
                    </label>
                    <input
                      type="text"
                      value={editingSkill.name}
                      onChange={(e) =>
                        setEditingSkill({ ...editingSkill, name: e.target.value })
                      }
                      placeholder="Örn: Kıdemli Yazılım Mimarı"
                      className={`w-full border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1 text-slate-300">
                      Kısa Açıklama (Opsiyonel)
                    </label>
                    <input
                      type="text"
                      value={editingSkill.description}
                      onChange={(e) =>
                        setEditingSkill({ ...editingSkill, description: e.target.value })
                      }
                      placeholder="Örn: Temiz kod ve mimari tasarım..."
                      className={`w-full border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-300">
                      Markdown İçeriği / Talimatlar (Prompt)
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {editingSkill.content.length} karakter
                    </span>
                  </div>
                  <textarea
                    value={editingSkill.content}
                    onChange={(e) =>
                      setEditingSkill({ ...editingSkill, content: e.target.value })
                    }
                    rows={12}
                    placeholder="# Rol ve Talimatlar&#10;&#10;Sen kıdemli bir yazılım mimarısın..."
                    className={`w-full border rounded-xl p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div className="p-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSkill(null)}
                  className="px-3 py-1.5 rounded-lg border text-xs font-medium border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditor}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  <Check size={14} /> Kaydet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
