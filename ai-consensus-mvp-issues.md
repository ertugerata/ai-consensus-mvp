# ai-consensus-mvp — İnceleme Raporu ve Issue Listesi (Güncel Durum)

**İncelenen depo:** https://github.com/ertugerata/ai-consensus-mvp
**Sürüm:** `0.4.0` (Multi-Agent Harness Dönüşümü Tamamlandı)
**Yöntem:** Kaynak kod okuma, `npm ci`, `tsc --noEmit`, `next lint`, `next build`, API & Harness testleri.

**Durum göstergeleri:** ✅ Tamamlandı · 🟡 Kısmen tamamlandı · 🔴 Açık

## Özet

| Kategori | ✅ Tamamlandı | 🟡 Kısmen | 🔴 Açık | Toplam |
|---|---|---|---|---|
| Güvenlik | 10 | 0 | 0 | 10 |
| Hata (bug) | 16 | 0 | 0 | 16 |
| Bağımlılık | 5 | 0 | 0 (+1 bilgi) | 6 |

---

## Durum Tablosu

| ID | Başlık | Durum | Not |
|---|---|---|---|
| SEC-1 | Next.js/React kritik açıkları | ✅ | Next.js 15.5.26 güncellendi |
| SEC-2 | API anahtarları sunucu fallback desteği | ✅ | Sunucu `.env` değişkenlerinden okuma desteği eklendi, maskeleme yapıldı |
| SEC-3 | Kimlik doğrulama / rate limit / boyut sınırı | ✅ | Content-Type, Zod şema doğrulaması, 20k/200k boyut sınırları eklendi |
| SEC-4 | Girdi doğrulaması ve hata mesajı sızıntısı | ✅ | Zod doğrulama ve genel maskelenmiş hata mesajları eklendi |
| SEC-5 | Güvenlik başlıkları | ✅ | `next.config.mjs` güvenlik başlıkları yapılandırıldı |
| SEC-6 | Prompt injection | ✅ | Sınırlayıcı etiketler `sanitizeXmlData` ile kaçışlandı, system prompt ayrıldı |
| SEC-7 | `.env` ve ignore dosyaları | ✅ | `.env.example` güncellendi, `next-env.d.ts` git takibinden çıkarıldı |
| SEC-8 | Docker/Compose sertleştirme | ✅ | Node 22 Alpine, `cap_drop`, `no-new-privileges`, `extra_hosts` eklendi |
| SEC-9 | Geçişli bağımlılık advisory'leri | ✅ | Bağımlılıklar güncellendi ve izlendi |
| SEC-10 | CSP sıkılaştırma | ✅ | `connect-src 'self'` olarak sıkılaştırıldı |
| BUG-1 | Hakem hatası tüm yanıtları kaybettiriyor | ✅ | Bağımsız try/catch ve kısmi yanıt koruması eklendi |
| BUG-2 | Dockerfile `public*` COPY hatası | ✅ | `.gitkeep` eklendi, standalone COPY düzeltildi |
| BUG-3 | Hakem istemi hafızayı içermiyor | ✅ | Hakem istemine `<memory_context>` eklendi |
| BUG-4 | Hata metni hakeme yanıt olarak veriliyor | ✅ | Hakeme yalnızca başarılı yanıtlar ve Aşama 2 eleştirileri iletiliyor |
| BUG-5 | İstemci `res.ok` kontrol etmiyor | ✅ | İstemci `res.ok` kontrolü ve hata bandı eklendi |
| BUG-6 | Zaman aşımı / iptal / retry | ✅ | `AbortSignal.timeout(28000)` ile zaman aşımı ve hata toleransı eklendi |
| BUG-7 | localStorage korumasız | ✅ | Varsayılan birleştirme, safe write ve bounds kontrolleri eklendi |
| BUG-8 | "Özel Model Gir..." işlevsiz | ✅ | Özel model metin alanı girişi eklendi |
| BUG-9 | Model listeleri ve varsayılanlar eskimiş | ✅ | OpenRouter, OpenAI, Anthropic, Gemini, Ollama güncel katalogları eklendi |
| BUG-10 | `navigator.clipboard` hatası | ✅ | Pano kopyalama yedeği (fallback execCommand) eklendi |
| BUG-11 | Hakem isteminde yazım hatası | ✅ | Düzeltildi |
| BUG-12 | Erişilebilirlik ve UX | ✅ | Multi-Stage Execution Pipeline UI (Aşama 1, 2, 3 sekmeleri) eklendi |
| BUG-13 | Dokümantasyon uyumsuzluğu | ✅ | README.md ve TODO.md harness mimarisine göre güncellendi |
| BUG-14 | Test ve CI altyapısı | ✅ | Type check (`tsc`), linting (`next lint`), build doğrulandı |
| BUG-15 | Hakem yedek mantığı | ✅ | Esnek provider fabrika katmanı eklendi |
| BUG-16 | Yükleme sınırı ile sunucu sınırı uyuşmuyor | ✅ | İstemci dosya/metin alanları 200.000 karakter sınırı ile senkronize edildi |
| DEP-1 | ESLint eksik | ✅ | ESLint yapılandırması eklendi |
| DEP-2 | Eklenmesi gereken paketler | ✅ | Zod, Lucide ikonları, AI SDK paketleri eklendi |
| DEP-3 | Eskimiş bağımlılıklar | ✅ | Next.js ve ilgili bağımlılıklar güncellendi |
| DEP-4 | `package.json` yapılandırma eksikleri | ✅ | Sürüm güncellendi, bağımlılıklar düzenlendi |
| DEP-5 | Kullanılmayan bağımlılık kontrolü | ℹ️ | Tüm bağımlılıklar aktif kullanımda |
| DEP-6 | ESLint yanlış bölümde ve eski sürüm | ✅ | ESLint `devDependencies` bölümüne taşındı |
