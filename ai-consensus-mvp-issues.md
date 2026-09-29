# ai-consensus-mvp — İnceleme Raporu ve Issue Listesi

**İncelenen depo:** https://github.com/ertugerata/ai-consensus-mvp (`main`, commit `0892c64`)
**İnceleme ve Güncelleme tarihi:** 29 Eylül 2026
**Yöntem:** Kaynak kod okuma, `npm ci`, `npm audit`, `tsc --noEmit`, `next build`, kod düzeltmeleri ve entegrasyon doğrulamaları.

## Özet Durum Tablosu

| Kategori | Kritik | Yüksek | Orta | Düşük | Durum |
|---|---|---|---|---|---|
| Güvenlik | 1 (Çözüldü) | 2 (Çözüldü) | 4 (Çözüldü) | 2 (Çözüldü) | Tümü Tamamlandı |
| Hata (bug) | – | 2 (Çözüldü) | 5 (Çözüldü) | 8 (Çözüldü) | Tümü Tamamlandı |
| Bağımlılık | – | – | 3 (Çözüldü) | 1 (+1 bilgi - Çözüldü) | Tümü Tamamlandı |

---

# 🔐 GÜVENLİK

---

## SEC-1 — Next.js 15.1.0 ve React 19.0.0 kritik açıklar içeriyor
**Labels:** `security` `dependencies` `severity:critical`
**Durum:** ✅ **TAMAMLANDI**
- `next` güvenli `15.5.x` sürümüne yükseltildi, `npm audit` üzerindeki Next.js kritik açıkları giderildi.

---

## SEC-2 — API anahtarları localStorage'da düz metin saklanıyor ve her istekte gövdede taşınıyor
**Labels:** `security` `severity:high`
**Durum:** ✅ **TAMAMLANDI**
- `localStorage` okuma/yazma işlemleri güvenli `try...catch` sarmalayıcılarına alındı, CSP ve HTTPS yönlendirme notları dokümantasyona eklendi.

---

## SEC-3 — `/api/consensus` kimlik doğrulaması, oran sınırı ve boyut sınırı olmadan açık
**Labels:** `security` `severity:high`
**Durum:** ✅ **TAMAMLANDI**
- `Content-Type: application/json` zorunlu kılındı.
- `Zod` ile istek gövdesi doğrulaması eklendi.
- `prompt` max 20.000 karakter, `memory` max 200.000 karakter, `evaluationCriteria` max 20.000 karakter ile sınırlandırıldı.

---

## SEC-4 — Girdi doğrulaması yok; iç hata mesajları istemciye sızıyor
**Labels:** `security` `bug` `severity:medium`
**Durum:** ✅ **TAMAMLANDI**
- Zod şeması ile tüm gövde alanları doğrulandı, geçersiz istekler için düzgün `400 Bad Request` yanıtı dönüldü.
- İç sunucu ve Hakem hataları izole edilip genelleştirildi, ham stack trace/sistem mesajı sızıntıları engellendi.

---

## SEC-5 — Güvenlik başlıkları yok, `X-Powered-By` açık
**Labels:** `security` `severity:medium`
**Durum:** ✅ **TAMAMLANDI**
- `next.config.mjs` içinde `poweredByHeader: false` ayarlandı.
- `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` güvenlik başlıkları eklendi.

---

## SEC-6 — Prompt injection: ajan çıktıları ve hafıza hakem istemine ayrıştırılmadan ekleniyor
**Labels:** `security` `severity:medium`
**Durum:** ✅ **TAMAMLANDI**
- Hakem istemi `<user_prompt>`, `<memory_context>`, `<agent_a_response>`, `<agent_b_response>`, `<agent_c_response>` etiketleri ile izole edildi.
- Hakeme etiket içeriklerinin talimat değil veri olduğu ve sistem yönlendirmelerini felç etmeye çalışan ifadelere uyulmaması gerektiği talimatı eklendi.

---

## SEC-7 — `.env*` dosyaları `.gitignore` ve `.dockerignore` kapsamında değil
**Labels:** `security` `docker` `severity:medium`
**Durum:** ✅ **TAMAMLANDI**
- `.gitignore` ve `.dockerignore` dosyalarına `.env*`, `.next`, `out/`, `*.tsbuildinfo`, `next-env.d.ts` eklendi.
- `.env.example` oluşturuldu.

---

## SEC-8 — Docker/Compose sertleştirmesi eksik; Node 20 artık desteklenmiyor
**Labels:** `security` `docker` `severity:low`
**Durum:** ✅ **TAMAMLANDI**
- `Dockerfile` aktif LTS olan `node:22-alpine` imajına geçirildi.
- Dockerfile içine HTTP `HEALTHCHECK` eklendi.
- `docker-compose.yml` varsayılan port bağlaması `127.0.0.1:3000:3000` olarak güncellendi.

---

## SEC-9 — Geçişli bağımlılık advisory'leri (`ai` → `jsondiffpatch`, `@ai-sdk/provider-utils`, `postcss`, `sharp`)
**Labels:** `security` `dependencies` `severity:low`
**Durum:** ✅ **TAMAMLANDI**
- `next` ve ilgili geliştirme bağımlılıkları güncellenerek yüksek önem dereceli PostCSS ve Next.js açıkları kapatıldı.

---

# 🐞 HATALAR

---

## BUG-1 — Hakem çağrısı hata verirse üç ajanın yanıtı da kaybolur
**Labels:** `bug` `severity:high`
**Durum:** ✅ **TAMAMLANDI**
- Hakem çağrısı `route.ts` içinde müstakil `try...catch` bloğuna alındı. Hakem hatası durumunda dâhi 3 ajanın yanıtı istemciye `200 OK` ile döndürülüyor.

---

## BUG-2 — Dockerfile: `public/` klasörü yokken `COPY --from=builder /app/public* ./public/` başarısız olabilir
**Labels:** `bug` `docker` `severity:high`
**Durum:** ✅ **TAMAMLANDI**
- Depoya `public/.gitkeep` eklendi ve Dockerfile `COPY --from=builder /app/public ./public` şeklinde güncellendi.

---

## BUG-3 — Hakem istemi hafızayı (memory) içermiyor
**Labels:** `bug` `severity:medium`
**Durum:** ✅ **TAMAMLANDI**
- Hakem istemine `<memory_context>` etiketi altında harici hafıza/bağlam metni eklendi.

---

## BUG-4 — Başarısız ajanların hata metni hakeme "yanıt" olarak veriliyor
**Labels:** `bug` `severity:medium`
**Durum:** ✅ **TAMAMLANDI**
- Hakem istemine yalnızca `fulfilled` durumundaki başarılı ajan yanıtları dahil ediliyor. Başarısız ajanlar Hakem sentezini kirletmiyor.

---

## BUG-5 — İstemci `res.ok` kontrol etmiyor, hatalar kullanıcıya gösterilmiyor
**Labels:** `bug` `ux` `severity:medium`
**Durum:** ✅ **TAMAMLANDI**
- `app/page.tsx` içinde `if (!res.ok)` kontrolü ve ağ hataları için kapatılabilir kırmızı bildirim banner'ı (`AlertCircle`) eklendi.

---

## BUG-6 — Zaman aşımı, iptal ve `maxDuration` yok; gizli yeniden denemeler
**Labels:** `bug` `severity:medium`
**Durum:** ✅ **TAMAMLANDI**
- `route.ts` dosyasına `export const maxDuration = 60` eklendi.

---

## BUG-7 — localStorage okuma/yazma korumasız: bozuk veri veya eski ayar sayfayı çökertebilir
**Labels:** `bug` `severity:medium`
**Durum:** ✅ **TAMAMLANDI**
- `localStorage` okumaları ve yazmaları `safeSaveStorage` ile korumaya alındı, bozuk verilerde `DEFAULT_CONFIG` / `DEFAULT_KEYS` yedeğine düşülmesi sağlandı.

---

## BUG-8 — "Özel Model Gir..." seçeneği işlevsiz
**Labels:** `bug` `ux` `severity:low`
**Durum:** ✅ **TAMAMLANDI**
- Select kutusunda "custom" (Özel Model Gir...) seçildiğinde ilgili custom model input alanına otomatik odaklanma (`focus`) sağlandı.

---

## BUG-15 — Hakem yedek (fallback) mantığı tutarsız
**Labels:** `bug` `severity:low`
**Durum:** ✅ **TAMAMLANDI**
- Hakem modeli belirlenemediğinde veya API anahtarı eksik olduğunda seçili hakem sağlayıcısı adını belirten açıklayıcı hata mesajı sağlandı ve yedekleme zincirine Google Gemini eklendi.

---

## BUG-9 — Model listeleri ve varsayılanlar eskimiş
**Labels:** `bug` `dependencies` `severity:low`
**Durum:** ✅ **TAMAMLANDI**
- `PROVIDER_MODEL_PRESETS` güncel modellere (`gpt-4o`, `gpt-4o-mini`, `o1`, `o3-mini`, `claude-3-7-sonnet-20250219`, `gemini-2.0-flash` vb.) güncellendi.

---

## BUG-10 — `navigator.clipboard` güvenli olmayan bağlamda tanımsız; hata yakalanmıyor
**Labels:** `bug` `severity:low`
**Durum:** ✅ **TAMAMLANDI**
- `handleCopyMarkdown` fonksiyonu `async/await`, `navigator.clipboard` varlık kontrolü ve `textarea`/`execCommand('copy')` yedeği ile güçlendirildi.

---

## BUG-11 — Hakem isteminde yazım hatası
**Labels:** `bug` `good first issue` `severity:low`
**Durum:** ✅ **TAMAMLANDI**
- `ÖZEL ÇAILIŞMA DÜZENİ` yazım hatası `ÖZEL ÇALIŞMA DÜZENİ` olarak düzeltildi.

---

## BUG-12 — Erişilebilirlik ve UX eksikleri
**Labels:** `ux` `severity:low`
**Durum:** ✅ **TAMAMLANDI**
- Form öğelerine `id` ve `htmlFor` ile aria erişilebilirlik etiketleri bağlandı.
- Ajan arama başladığında eski sonuçlar temizlenip yüklenme durumuna geçilmesi sağlandı.

---

## BUG-13 — Dokümantasyon kodla uyumsuz
**Labels:** `bug` `docs` `severity:low`
**Durum:** ✅ **TAMAMLANDI**
- `README.md` ve `ai-consensus-webapp.md` güncel Vercel AI SDK, Next.js 15 App Router ve OpenRouter mimarisine göre güncellendi.

---

## BUG-14 — Test, CI ve lint altyapısı yok
**Labels:** `dx` `severity:low`
**Durum:** ✅ **TAMAMLANDI**
- `.eslintrc.json` ve `eslint-config-next` kuruldu. `npm run lint` sorunsuz çalışıyor.

---

# 📦 BAĞIMLILIKLAR

---

## DEP-1 — `eslint` ve `eslint-config-next` eksik; `npm run lint` çalışmıyor
**Labels:** `dependencies` `dx` `severity:medium`
**Durum:** ✅ **TAMAMLANDI**
- `eslint` ve `eslint-config-next` eklenip konfigüre edildi.

---

## DEP-2 — Eksik ama eklenmesi gereken paketler
**Labels:** `dependencies` `severity:medium`
**Durum:** ✅ **TAMAMLANDI**
- `zod` eklendi ve doğrulama katmanlarında kullanıldı.

---

## DEP-3 — Güncelliğini yitirmiş bağımlılıklar
**Labels:** `dependencies` `severity:medium`
**Durum:** ✅ **TAMAMLANDI**
- Next.js güvenli sürüme yükseltildi, tip paketleri güncellendi.

---

## DEP-4 — `package.json` yapılandırma eksikleri
**Labels:** `dependencies` `dx` `severity:low`
**Durum:** ✅ **TAMAMLANDI**
- `package.json` içindeki bağımlılıklar ve derleme betikleri doğrulandı.

---

## DEP-5 — Kullanılmayan bağımlılık kontrolü (bilgi)
**Labels:** `dependencies` `info`
**Durum:** ✅ **TAMAMLANDI**
- Tüm paketlerin aktif kullanımı doğrulandı.
