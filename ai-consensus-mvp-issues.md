# ai-consensus-mvp — İnceleme Raporu ve Issue Listesi (Güncel Durum)

**İncelenen depo:** https://github.com/ertugerata/ai-consensus-mvp (`main`)
**1. inceleme:** 29 Eylül 2026, commit `0892c64`
**2. inceleme (bu sürüm):** 29 Eylül 2026, commit `1d699d3` (PR #5 sonrası)
**Yöntem:** Kaynak kod okuma, `npm ci`, `npm audit`, `tsc --noEmit`, `next lint`, `next build`, standalone sunucuyu çalıştırıp `curl` ile uç nokta testleri.

**Durum göstergeleri:** ✅ Tamamlandı · 🟡 Kısmen tamamlandı (kalan iş belirtilmiş) · 🔴 Açık · 🆕 İkinci incelemede yeni bulundu

## Özet

| Kategori | ✅ Tamamlandı | 🟡 Kısmen | 🔴 Açık | Toplam |
|---|---|---|---|---|
| Güvenlik | 2 | 5 | 3 (1'i 🆕) | 10 |
| Hata (bug) | 9 | 3 | 4 (1'i 🆕) | 16 |
| Bağımlılık | 1 | 2 | 2 (1'i 🆕) | 5 (+1 bilgi) |

**Genel tablo:** Kritik açık kapandı (`npm audit`: 1 critical → 0; toplam bulgu 11 → 10). Girdi doğrulaması, güvenlik başlıkları, hata yönetimi ve Docker derlemesi düzeltildi. Kalan riskler ağırlıklı olarak kimlik doğrulama/rate limit, tarayıcıda saklanan API anahtarları, zayıf CSP, zaman aşımı ve eskimiş model/SDK sürümleri.

**Doğrulama notu:** Sandbox'ta Docker yoktu; Dockerfile/Compose değişiklikleri koddan doğrulandı, `docker build` ile denenmedi.

## Durum Tablosu

| ID | Başlık | Durum |
|---|---|---|
| SEC-1 | Next.js/React kritik açıkları | ✅ |
| SEC-2 | API anahtarları localStorage'da ve gövdede | 🔴 |
| SEC-3 | Kimlik doğrulama / rate limit / boyut sınırı | 🟡 |
| SEC-4 | Girdi doğrulaması ve hata mesajı sızıntısı | 🟡 |
| SEC-5 | Güvenlik başlıkları | ✅ |
| SEC-6 | Prompt injection | 🟡 |
| SEC-7 | `.env` ve ignore dosyaları | 🟡 |
| SEC-8 | Docker/Compose sertleştirme | 🟡 |
| SEC-9 | Geçişli bağımlılık advisory'leri | 🔴 |
| SEC-10 | CSP'de `unsafe-inline` / `unsafe-eval` | 🔴 🆕 |
| BUG-1 | Hakem hatası tüm yanıtları kaybettiriyor | ✅ |
| BUG-2 | Dockerfile `public*` COPY hatası | ✅ |
| BUG-3 | Hakem istemi hafızayı içermiyor | ✅ |
| BUG-4 | Hata metni hakeme yanıt olarak veriliyor | ✅ |
| BUG-5 | İstemci `res.ok` kontrol etmiyor | ✅ |
| BUG-6 | Zaman aşımı / iptal / retry | 🔴 |
| BUG-7 | localStorage korumasız | 🟡 |
| BUG-8 | "Özel Model Gir..." işlevsiz | ✅ |
| BUG-9 | Model listeleri ve varsayılanlar eskimiş | 🔴 |
| BUG-10 | `navigator.clipboard` hatası | ✅ |
| BUG-11 | Hakem isteminde yazım hatası | ✅ |
| BUG-12 | Erişilebilirlik ve UX | 🟡 |
| BUG-13 | Dokümantasyon uyumsuzluğu | 🟡 |
| BUG-14 | Test ve CI yok | 🔴 |
| BUG-15 | Hakem yedek mantığı | ✅ |
| BUG-16 | Yükleme sınırı ile sunucu sınırı uyuşmuyor | 🔴 🆕 |
| DEP-1 | ESLint eksik | ✅ |
| DEP-2 | Eklenmesi gereken paketler | 🟡 |
| DEP-3 | Eskimiş bağımlılıklar | 🔴 |
| DEP-4 | `package.json` yapılandırma eksikleri | 🟡 |
| DEP-5 | Kullanılmayan bağımlılık kontrolü | ℹ️ Bilgi |
| DEP-6 | ESLint yanlış bölümde ve eski sürüm | 🔴 🆕 |

**Etiketler:** `security`, `bug`, `dependencies`, `docker`, `docs`, `ux`, `dx` — önem: `severity:critical|high|medium|low`

---

# 🔴 AÇIK ve 🟡 KISMEN TAMAMLANAN MADDELER

---

## SEC-2 — API anahtarları localStorage'da düz metin saklanıyor ve her istekte gövdede taşınıyor
**Durum:** 🔴 Açık
**Labels:** `security` `severity:high`

**Açıklama**
`app/page.tsx` dört sağlayıcının API anahtarını `localStorage`'a düz metin yazıyor (`saveSettings`) ve anahtarlar her `/api/consensus` isteğinde JSON gövdesiyle gönderiliyor. Aynı sayfadaki herhangi bir XSS, zararlı tarayıcı eklentisi veya üçüncü taraf script anahtarları okuyabilir. Uygulama HTTPS olmadan çalıştırılırsa anahtarlar ağda açık gider; reverse proxy/APM gövdeyi loglarsa anahtarlar loglara düşer.

**Yapılan:** README artık anahtarların `localStorage`'da tutulduğunu belgeliyor. Risk ortadan kalkmadı.

**Kalan iş**
- Anahtarları sunucu tarafında ortam değişkeninden okuyun (`.env.example` zaten `OPENAI_API_KEY` vb. içeriyor ama `route.ts` bunları kullanmıyor); istemciden anahtar göndermeyi isteğe bağlı yapın.
- İstemcide tutulacaksa varsayılan `sessionStorage` olsun, "beni hatırla" isteğe bağlı olsun.
- README'ye HTTPS zorunluluğu uyarısı ekleyin.
- SEC-10'daki CSP düzeltmesiyle XSS yüzeyini daraltın.

> Not: Sunucu ortam değişkenlerine geçilirse SEC-3 (kimlik doğrulama/rate limit) **zorunlu** hale gelir; aksi halde herkes sizin anahtarlarınızla harcama yapabilir.

---

## SEC-3 — `/api/consensus` kimlik doğrulama ve oran sınırı olmadan açık
**Durum:** 🟡 Kısmen tamamlandı
**Labels:** `security` `severity:high`

**Yapılan (doğrulandı):**
- `Content-Type: application/json` zorunlu; `text/plain` artık `400` dönüyor.
- `prompt` ≤ 20.000, `memory` ≤ 200.000, `evaluationCriteria` ≤ 20.000 karakter; aşımda `400`.
- Bu sayede tarayıcıdan gelen cross-site basit form istekleri büyük ölçüde engelleniyor (JSON içerik tipi preflight gerektirir).

**Kalan iş**
- Kimlik doğrulama yok: `curl` gibi tarayıcı dışı istemciler ve `Origin: https://evil.example` başlıklı istekler doğrudan `200` alıyor (test edildi). En azından paylaşılan bir erişim token'ı veya reverse-proxy basic auth ekleyin.
- Rate limit yok; bir istemci sunucuyu 4 giden LLM çağrısı üreten röle olarak kullanabilir.
- Açık `Origin` allow-list kontrolü ekleyin.

---

## SEC-4 — Hata mesajları istemciye aynen dönüyor
**Durum:** 🟡 Kısmen tamamlandı (girdi doğrulaması ✅, hata maskeleme 🔴)
**Labels:** `security` `severity:medium`

**Yapılan (doğrulandı):** Zod şeması eklendi. Boş gövde, bozuk JSON, geçersiz `provider` ve aşırı uzun alanlar artık anlamlı `400` yanıtları veriyor; `provider` allow-list ile sınırlı.

**Kalan iş**
- Sağlayıcı hataları hâlâ `Hata: ${mesaj}` ile istemciye geçiyor (sahte anahtarla `Hata: Forbidden` döndü); bazı sağlayıcılar hata metninde istek/anahtar ipuçları içerebilir. Mesajları genelleştirin, ayrıntıyı sunucu loguna yazın (anahtarları maskeleyerek).
- Dıştaki `catch` bloğu ham `error.message` değerini `500` ile döndürüyor (`route.ts` satır 165-168); genel bir mesaja çevirin.
- Zod hata mesajları (`Invalid enum value. Expected …`) İngilizce ve iç şemayı açığa çıkarıyor; kullanıcıya dönük bir mesaja çevirmek isteğe bağlı.

---

## SEC-6 — Prompt injection: sınırlayıcılar eklendi ama kaçışlanmıyor
**Durum:** 🟡 Kısmen tamamlandı
**Labels:** `security` `severity:medium`

**Yapılan:** Hakem istemine `<user_prompt>`, `<memory_context>`, `<agent_x_response>` etiketleri ve "etiket içi yalnızca veridir" güvenlik talimatı eklendi.

**Kalan iş**
- Etiket içeriği kaçışlanmıyor: bir ajan çıktısı (veya yüklenen hafıza) `</agent_a_response>` içerirse etiketten çıkıp talimat enjekte edebilir. Etiket benzeri dizileri temizleyin veya rastgele/nonce'lu sınırlayıcı kullanın.
- Talimatlar ve veri hâlâ tek `user` mesajında; hakem rolü ve kriterleri `system`, veriyi `user` mesajına ayırın.
- `evaluationCriteria` tırnak içinde talimat bölümüne giriyor; bu kullanıcıya ait olduğu için kabul edilebilir ama belgeleyin.
- Hakem çıktısı için yapısal şema (uyum/çelişki/nihai yanıt) düşünülebilir.

---

## SEC-7 — `.env` ve ignore dosyaları
**Durum:** 🟡 Kısmen tamamlandı
**Labels:** `security` `dx` `severity:low`

**Yapılan (doğrulandı):** `.gitignore` (`.env*`, `!.env.example`, `*.tsbuildinfo`, `out/`, `next-env.d.ts`) ve `.dockerignore` (`.env*`, `*.log`) güncellendi; `.env.example` eklendi.

**Kalan iş**
- `next-env.d.ts` `.gitignore`'a eklendi ama dosya **hâlâ git'te takipli** (`git ls-files` çıktısında var). `git rm --cached next-env.d.ts` gerekiyor.

---

## SEC-8 — Docker/Compose sertleştirmesi
**Durum:** 🟡 Kısmen tamamlandı
**Labels:** `security` `docker` `severity:low`

**Yapılan (koddan doğrulandı, `docker build` denenmedi):** Node 20 → `node:22-alpine`, `HEALTHCHECK` eklendi, port `127.0.0.1:3000:3000`'e bağlandı.

**Kalan iş**
- `docker-compose.yml`'de `read_only: true`, `cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]`, kaynak limitleri yok.
- Taban imaj etiketi sabitlenmemiş (digest yok).
- TLS sonlandırma (reverse proxy) rehberi README'de yok.

---

## SEC-9 — Geçişli bağımlılık advisory'leri
**Durum:** 🔴 Açık
**Labels:** `security` `dependencies` `severity:low`

`npm audit` (güncel): **10 bulgu** (6 low, 2 moderate, 2 high, **0 critical**); üretim bağımlılıklarında da aynı tablo geçerli.
- `jsondiffpatch ≤0.7.5` — **high** (XSS, prototype pollution; `ai` üzerinden). Uygulama yalnızca `generateText` kullandığından erişilebilirliği düşük.
- `postcss ≤8.5.22` — **high**, `next` üzerinden (build zamanı).
- `ai ≤5.0.206` — moderate; `@ai-sdk/provider-utils <3.0.28` (kontrolsüz kaynak tüketimi) ve buna bağlı `@ai-sdk/*` paketleri — low.
- `next` hâlâ moderate olarak işaretli; `npm audit` çözüm olarak `next@16.3.7` (major) öneriyor.

Düzeltmeler `ai@7` / `@ai-sdk/*@4` ve `next@16` major geçişleri gerektiriyor. Bkz. DEP-3.

---

## SEC-10 — CSP `unsafe-inline` ve `unsafe-eval` içeriyor 🆕
**Durum:** 🔴 Açık
**Labels:** `security` `severity:medium`

**Açıklama**
`next.config.mjs` içindeki CSP `script-src 'self' 'unsafe-inline' 'unsafe-eval'` içeriyor. Bu, XSS'e karşı CSP'nin asıl faydasını büyük ölçüde ortadan kaldırıyor; API anahtarlarının `localStorage`'da tutulduğu (SEC-2) bir uygulamada bu önemli. `unsafe-eval` genellikle yalnızca geliştirme modunda gerekir.

Ayrıca `connect-src`'deki `https://openrouter.ai`, `https://api.openai.com`, `https://api.anthropic.com`, `https://generativelanguage.googleapis.com` gereksiz: tarayıcı yalnızca kendi `/api/consensus` uç noktasına bağlanıyor, sağlayıcı çağrıları sunucudan yapılıyor. Bu alan adlarını izin listesinde tutmak, bir XSS durumunda anahtarların bu adreslere gönderilmesine kapı bırakır.

**Öneri:** `middleware.ts` ile istek başına nonce üretip `script-src 'self' 'nonce-…' 'strict-dynamic'` kullanın; `unsafe-eval`'ı yalnızca `NODE_ENV !== 'production'` durumunda ekleyin; `connect-src`'yi `'self'` ile sınırlayın.

---

## BUG-6 — Zaman aşımı, iptal ve yeniden deneme kontrolü yok
**Durum:** 🔴 Açık (yalnızca `maxDuration` eklendi)
**Labels:** `bug` `severity:medium`

**Yapılan:** `route.ts`'e `export const maxDuration = 60` eklendi.

**Kalan iş**
- `generateText` çağrılarında `abortSignal`/timeout yok; AI SDK varsayılan olarak 2 kez yeniden dener, yavaş/hatalı sağlayıcıda süre ve maliyet katlanır.
- Akış: 3 ajan paralel → ardından hakem (sıralı). En kötü durumda toplam süre 60 sn'lik limiti aşar ve istek ortada kesilir; bu durumda o ana kadar alınan yanıtlar da kaybolur.
- İstemcide `AbortController` ve "İptal" düğmesi yok.

**Öneri:** Ajanlar için `abortSignal: AbortSignal.timeout(~25000)`, hakem için ayrı süre, `maxRetries: 0/1`; ajan yanıtlarını zaman aşımında kısmi olarak döndürmek; istemcide iptal düğmesi. Uzun vadede `streamText` ile akış.

---

## BUG-7 — localStorage yönetimi
**Durum:** 🟡 Kısmen tamamlandı
**Labels:** `bug` `severity:low`

**Yapılan (doğrulandı):** Okuma `try/catch` içinde; kayıtlı config `DEFAULT_CONFIG` ile birleştiriliyor (eski kayıtta `referee` yoksa çökmüyor); yazma `safeSaveStorage` ile korumalı; tema doğrulanıyor.

**Kalan iş**
- `safeSaveStorage` kota hatasını yalnızca `console.error` ile yutuyor; kullanıcı hafızanın kaydedilmediğini fark etmiyor.
- Hafıza ve kriter alanları hâlâ her tuş vuruşunda `localStorage`'a yazıyor (debounce yok).
- Kayıtlı `JSON` yalnızca birleştiriliyor, şema doğrulaması yok (örn. geçersiz `provider` değeri UI'ı bozabilir; Zod şeması istemcide de kullanılabilir).
- Kaydetme davranışı tutarsız: hafıza/kriter anında, anahtar/model "Ayarları Kaydet" ile kaydediliyor.

---

## BUG-9 — Model listeleri ve varsayılanlar eskimiş
**Durum:** 🔴 Açık
**Labels:** `bug` `severity:low`

**Yapılan:** Listeden `gpt-4-turbo` ve `claude-3-opus-20240229` çıkarıldı; `claude-3-7-sonnet-20250219` ve `gemini-2.0-flash` eklendi.

**Kalan iş**
- Varsayılan yapılandırma değişmedi: `claude-3-5-haiku-20241022`, `gemini-1.5-flash`, `gpt-4o`. Listede hâlâ `claude-3-5-sonnet-20241022`, `gemini-1.5-pro`, `gemini-1.5-flash`, `o1`, `o1-mini` var; bunların bir kısmı sağlayıcılar tarafından emekliye alınmış veya alınma sürecinde olabilir (resmî deprecation sayfalarından doğrulayın). Bu durumda ilk çalıştırmada varsayılan ayarlarla hata alınır.
- `route.ts`'teki hakem yedek zincirinde de eski model adları gömülü (`claude-3-5-sonnet-20241022`, `gemini-1.5-pro`).
- Yeni eklenen `claude-3-7-sonnet` de eski nesil bir model.

**Öneri:** Listeleri güncel modellerle yenileyin veya sağlayıcıların model listeleme uç noktalarından dinamik çekin; varsayılanları ve yedek modelleri tek bir yapılandırma dosyasında toplayın.

---

## BUG-12 — Erişilebilirlik ve UX
**Durum:** 🟡 Kısmen tamamlandı
**Labels:** `ux` `severity:low`

**Yapılan (doğrulandı):** `label`/`htmlFor` bağlantıları, ikon düğmelerine `aria-label`, yeni sorguda eski sonuçların temizlenmesi, hata banner'ı.

**Kalan iş**
- Tek bir "göster/gizle" düğmesi dört anahtar alanını birlikte açıyor.
- Tema varsayılan `dark` render edilip `useEffect` ile değiştirildiği için açık temayı kaydetmiş kullanıcıda ilk yüklemede karanlık→aydınlık flaş oluşuyor (`<html>` üzerinde inline script veya çerez ile çözülür).
- LLM çıktıları Markdown olduğu halde ham metin (`whitespace-pre-wrap`) gösteriliyor; `react-markdown` yok (bkz. DEP-2).

---

## BUG-13 — Dokümantasyon
**Durum:** 🟡 Kısmen tamamlandı
**Labels:** `docs` `severity:low`

**Yapılan:** README güncel mimariyi (Vercel AI SDK, OpenRouter, hakem ajanı), Node 22 ve güvenlik notlarını anlatıyor; eski, kodla uyumsuz `ai-consensus-webapp.md` silindi; `public/` klasörü artık var.

**Kalan iş**
- README dizin ağacında ve `.dockerignore`'da silinmiş `ai-consensus-webapp.md` hâlâ geçiyor.
- `LICENSE` ve CHANGELOG yok; sürüm `0.3.0` değişmedi.
- README'nin "Güvenlik Sertleştirmeleri" maddesi (Zod, prompt injection koruması, CSP) kısmen abartılı: CSP zayıf (SEC-10), kimlik doğrulama yok (SEC-3), sınırlayıcılar kaçışsız (SEC-6). İfadeyi gerçek duruma göre düzeltin veya bu maddeleri kapatın.
- Depoya eklenen `ai-consensus-mvp-issues.md` (ilk rapor) artık güncel değil; bu dosyayla değiştirin veya bulguları GitHub Issues'a taşıyıp depodan kaldırın.

---

## BUG-14 — Test ve CI altyapısı yok
**Durum:** 🔴 Açık (lint ✅, tip güvenliği kısmen ✅)
**Labels:** `dx` `severity:low`

**Yapılan:** `next lint` çalışıyor ("No ESLint warnings or errors"); `route.ts` ve `page.tsx`'teki `any` kullanımlarının çoğu kaldırıldı, `tsc --noEmit` temiz.

**Kalan iş:** Test altyapısı ve `.github/workflows` yok. `route.ts` içindeki iş mantığı (sağlayıcı seçimi, yedek hakem, hata birleştirme, istem oluşturma) test edilebilir fonksiyonlara ayrılmamış. Önerilen CI adımları: `npm ci`, `npm run lint`, `tsc --noEmit`, `npm run build`, `npm audit --omit=dev --audit-level=high`.

---

## BUG-16 — İstemci yükleme sınırı sunucu sınırıyla uyuşmuyor 🆕
**Durum:** 🔴 Açık
**Labels:** `bug` `ux` `severity:low`

**Açıklama**
`handleFileUpload` 5 MB'a kadar dosya kabul ediyor; sunucu ise `memory` alanını 200.000 karakterle sınırlıyor. Kullanıcı örneğin 1 MB'lık bir dosyayı sorunsuz içeri aktarıyor, ancak soruyu gönderdiğinde `Hafıza 200.000 karakterden uzun olamaz` hatası alıyor. Aynı büyüklükteki hafıza `localStorage` kotasını (yaklaşık 5 MB) da zorlayabilir ve BUG-7'deki sessiz hata yutma yüzünden kaydedilmediği fark edilmez.

**Öneri:** İstemci tarafında karakter sınırını (200.000) paylaşılan bir sabitle uygulayın; aşımda dosyayı kesmeyi/uyarmayı ve textarea'da karakter sayacı göstermeyi düşünün. Sınırları Zod şemasıyla ortaklaştırın.

---

## DEP-2 — Eklenmesi gereken paketler
**Durum:** 🟡 Kısmen tamamlandı
**Labels:** `dependencies` `severity:medium`

**Yapılan:** `zod` eklendi ve sunucuda kullanılıyor.

**Kalan iş**

| Paket | Neden |
|---|---|
| `react-markdown` (+ `remark-gfm`) | Model çıktıları Markdown; şu an ham metin (BUG-12) |
| Oran sınırlama (`@upstash/ratelimit` ya da basit in-memory limiter) | SEC-3 |
| `vitest` + `@testing-library/react` (opsiyonel `playwright`) | BUG-14 |
| `@openrouter/ai-sdk-provider` (opsiyonel) | OpenRouter şu an `createOpenAI` + `baseURL` ile çalışıyor; sağlayıcıya özgü özellikler için resmî paket daha uygun |

---

## DEP-3 — Eskimiş bağımlılıklar
**Durum:** 🔴 Açık
**Labels:** `dependencies` `severity:medium`

`next` 15.5.26'ya güncellendi, diğerleri değişmedi (`npm outdated`, 29 Eylül 2026):

| Paket | Mevcut | En son | Not |
|---|---|---|---|
| `next` | 15.5.26 | 16.3.7 | Kritik açıklar kapandı; kalan moderate için major geçiş (SEC-9) |
| `react` / `react-dom` | 19.0.0 | 19.3.0 | Hâlâ tam sabit; güncelleyin |
| `ai` | 4.3.19 | 7.0.122 | 3 major geride; SEC-9'daki advisory'ler bunu gerektiriyor |
| `@ai-sdk/openai` | 1.3.24 | 4.0.81 | `ai` ile birlikte yükseltilmeli |
| `@ai-sdk/anthropic` | 1.2.12 | 4.0.68 | " |
| `@ai-sdk/google` | 1.2.22 | 4.0.85 | " |
| `lucide-react` | 0.470.0 | 1.48.0 | Major |
| `tailwindcss` | 3.4.19 | 4.3.3 | Major, acil değil |
| `typescript` | 5.9.3 | 7.0.2 | Major, acil değil |
| `@types/node` | 20.19.43 | 26.6.3 | Node 22 için `@types/node@22` ile eşleştirin |

`ai` v4 → v7 geçişi `generateText` imzasını, `LanguageModelV1` tipini (şu an `route.ts`'te `import { LanguageModelV1 } from 'ai'`) ve sağlayıcı fabrika kullanımını etkileyebilir; tek PR'da yapıp release notlarına bakarak test edin.

---

## DEP-4 — `package.json` yapılandırma eksikleri
**Durum:** 🟡 Kısmen tamamlandı
**Labels:** `dependencies` `dx` `severity:low`

**Yapılan:** `next` artık `^15.5.26` aralıklı; `postcss` güncellendi.

**Kalan iş**
- `react` ve `react-dom` hâlâ tam sabit (`19.0.0`); `^` aralığı veya düzenli güncelleme politikası gerekiyor.
- `engines` (`"node": ">=22"`) ve `packageManager` alanı yok; Dockerfile Node 22, `@types/node` 20.
- Dependabot/Renovate ve `npm audit` içeren bir CI adımı yok.
- `tailwind.config.ts` içindeki `content` yolları var olmayan `pages/` ve `components/` klasörlerine bakıyor (zararsız ama gürültü).

---

## DEP-6 — ESLint yanlış bölümde ve eski sürüm 🆕
**Durum:** 🔴 Açık
**Labels:** `dependencies` `dx` `severity:low`

**Açıklama**
DEP-1'in çözümünde `eslint` (`^8.57.1`) ve `eslint-config-next` `dependencies` altına eklenmiş; geliştirme araçları olduğu için `devDependencies`'te olmalılar (Docker imajında `npm ci` tüm bağımlılıkları zaten builder aşamasında yüklediğinden işlevsel bir sorun yok, ama bağımlılık hijyeni bozuluyor). `eslint-config-next` `^15.2.0` iken `next` `^15.5.26`; sürümleri eşleştirin. ESLint 8 bakım dışı; `next lint` ise çıktıda uyarıldığı gibi Next 16'da kaldırılıyor.

**Öneri:** Paketleri `devDependencies`'e taşıyın; `npx @next/codemod@canary next-lint-to-eslint-cli .` ile ESLint 9 flat config'e ve doğrudan `eslint .` betiğine geçin.

---

## DEP-5 — Kullanılmayan bağımlılık kontrolü (bilgi)
**Durum:** ℹ️ Bilgi
**Labels:** `dependencies` `info`

Tüm çalışma zamanı ve geliştirme bağımlılıkları koddan/yapılandırmadan referanslanıyor; kaldırılacak paket yok. Yeni eklenen `zod`, `eslint`, `eslint-config-next` de kullanımda.

---

# ✅ TAMAMLANAN MADDELER

Bu maddeler ikinci incelemede yeniden doğrulandı ve kapatılabilir.

---

## SEC-1 — Next.js 15.1.0 ve React 19.0.0 kritik açıklar içeriyor
**Durum:** ✅ Tamamlandı
**Labels:** `security` `dependencies` `severity:critical`

`next` `^15.5.26`'ya çıkarıldı (`npm ls`: `next@15.5.26`). `npm audit`: critical **1 → 0**, high 3 → 2, toplam 11 → 10. React Flight RCE ve middleware bypass gibi advisory'ler kapandı. Kalan geçişli/major-geçiş gerektiren bulgular SEC-9 ve DEP-3'te izleniyor. `react`/`react-dom`'un sabit sürümde kalması DEP-4'te.

---

## SEC-5 — Güvenlik başlıkları yok, `X-Powered-By` açık
**Durum:** ✅ Tamamlandı
**Labels:** `security` `severity:medium`

`next.config.mjs`'e `poweredByHeader: false` ve `headers()` eklendi. Çalışan sunucuda doğrulanan yanıt başlıkları: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Content-Security-Policy` (`frame-ancestors 'none'` dahil); `X-Powered-By` artık yok. CSP'nin içeriğindeki zayıflık SEC-10 olarak ayrıca izleniyor.

---

## BUG-1 — Hakem çağrısı hata verirse üç ajanın yanıtı kaybolur
**Durum:** ✅ Tamamlandı
**Labels:** `bug` `severity:high`

Hakem çağrısı ayrı `try/catch` içine alındı; hata durumunda `consensus` alanında `Hakem analizi sırasında hata oluştu: …` mesajı dönüyor ve ajan yanıtları korunuyor. (Not: kalan zaman aşımı riski BUG-6'da.)

---

## BUG-2 — Dockerfile: `public/` yokken `COPY` başarısız olabilir
**Durum:** ✅ Tamamlandı (koddan doğrulandı; `docker build` denenmedi)
**Labels:** `bug` `docker` `severity:high`

`public/.gitkeep` eklendi, Dockerfile `COPY --from=builder /app/public ./public` olarak düzeltildi. `next build` standalone çıktısıyla başarıyla tamamlanıyor.

---

## BUG-3 — Hakem istemi hafızayı içermiyor
**Durum:** ✅ Tamamlandı

Hakem istemine `<memory_context>` bölümü eklendi (`memory` boşsa "Harici hafıza/bağlam bulunmuyor" yazıyor).

---

## BUG-4 — Başarısız ajanların hata metni hakeme "yanıt" olarak veriliyor
**Durum:** ✅ Tamamlandı

Hakeme yalnızca `fulfilled` yanıtlar gönderiliyor ve istemde "N/3 Ajan Yanıt Verdi" bilgisi veriliyor; hiçbir ajan yanıt vermezse hakem çağrılmıyor ve ayrı bir mesaj dönüyor. Hata metinleri istemci panelinde ajan alanında gösterilmeye devam ediyor (kabul edilebilir).

---

## BUG-5 — İstemci `res.ok` kontrol etmiyor
**Durum:** ✅ Tamamlandı

`handleSearch` `res.ok`'u kontrol ediyor; sunucu hata mesajı veya ağ hatası kırmızı bir uyarı bandında gösteriliyor, "Kapat" düğmesi var.

---

## BUG-8 — "Özel Model Gir..." seçeneği işlevsiz
**Durum:** ✅ Tamamlandı

`custom` seçilince model metin kutusu odaklanıyor.

---

## BUG-10 — `navigator.clipboard` güvenli olmayan bağlamda tanımsız
**Durum:** ✅ Tamamlandı

`await` + `try/catch` eklendi; `navigator.clipboard` yoksa `textarea` + `execCommand('copy')` yedeği çalışıyor, başarısızlıkta hata bandı gösteriliyor.

---

## BUG-11 — Hakem isteminde yazım hatası
**Durum:** ✅ Tamamlandı

"ÇAILIŞMA" → "ÇALIŞMA" düzeltildi.

---

## BUG-15 — Hakem yedek (fallback) mantığı tutarsız
**Durum:** ✅ Tamamlandı

Seçilen hakem kullanılamıyorsa yedek zincir artık Gemini'yi de içeriyor (openai → openrouter → anthropic → google); anahtar eksikliği mesajı seçilen hakem sağlayıcısını belirtiyor. Yedek zincirdeki eski model adları BUG-9 kapsamında.

---

## DEP-1 — `eslint` ve `eslint-config-next` eksik
**Durum:** ✅ Tamamlandı

Paketler eklendi, `.eslintrc.json` (`next/core-web-vitals`) oluşturuldu; `next lint` etkileşimsiz çalışıyor ve hatasız geçiyor. Paketlerin bölümü ve sürümü DEP-6'da.

---
