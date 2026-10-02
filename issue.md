# ai-consensus-mvp — Kod İnceleme Bulguları

**Depo:** https://github.com/ertugerata/ai-consensus-mvp
**Sürüm:** `0.4.0` (commit `d4dc154`)
**Tarih:** 2026-10-02
**Yöntem:** `git clone` ile kaynak kod okuma, `tsc --noEmit`, `next lint`, `npm audit`, git geçmişinde secret taraması, `sanitizeXmlData` ve zaman bütçesi için küçük simülasyonlar.

**Kapsam notları:**
- `npm ci --ignore-scripts` kullanıldı (`better-sqlite3` derlemesi inceleme ortamında yapılamadı). `next build` ve Docker çalışma testi **yapılmadı**.
- `app/page.tsx` (1850 satır) tamamen satır satır okunmadı. localStorage, fetch, `dangerouslySetInnerHTML`, ayar/oturum yükleme ve istek gönderme bölümlerine bakıldı.
- `tsc --noEmit`: temiz. `next lint`: temiz.

**Önem göstergeleri:** 🔴 Yüksek · 🟠 Orta · 🟡 Düşük

> **Not:** `ai-consensus-mvp-issues.md` içindeki "Güvenlik 10/10 tamamlandı" ve "Test ve CI ✅" ifadeleri bu incelemeyle örtüşmüyor (bkz. SEC-1, SEC-5, DOC-2).

---

## Özet

| Kategori | 🔴 | 🟠 | 🟡 | Toplam |
|---|---|---|---|---|
| Güvenlik | 2 | 4 | 3 | 9 |
| Kod tutarsızlığı | 0 | 3 | 7 | 10 |
| Bağımlılık | 0 | 3 | 4 | 7 |

---

## 1. Güvenlik

### SEC-1 ✅ SSRF: Open-Notebook MCP proxy (Tamamlandı)
- **Dosya:** `app/api/mcp/open-notebook/route.ts`
- **Sorun:** `baseUrl` kullanıcıdan geliyor ve sunucu bu adrese istek atıp cevabı istemciye geri döndürüyor. `mcp_call` eyleminde `method`, `params` ve yanıt tamamen serbest. Bulut metadata (`169.254.169.254`), `host.docker.internal` ve iç ağ adresleri hedeflenebilir. `notebookId` URL yoluna encode edilmeden eklendiği için `../` ile hedef sunucuda yol değiştirilebilir.
- **README çelişkisi:** "SSRF korumalı" ifadesi yalnızca Ollama için doğru.
- **Öneri:**
  - [x] Hedef için allow-list veya özel/loopback/link-local IP bloklama (DNS çözümlemesi sonrası kontrol dahil)
  - [x] `mcp_call` eylemini kaldır veya yalnızca belirli method'larla sınırla
  - [x] `encodeURIComponent(notebookId)`
  - [x] Yanıt boyutu sınırı ve yönlendirme (redirect) kapatma
  - [x] Bu route'a da rate limit uygula

### SEC-2 ✅ Kimlik doğrulama yok (Tamamlandı)
- **Dosya:** `app/api/sessions/route.ts`, `app/api/sessions/[id]/route.ts`, `app/api/consensus/route.ts`
- **Sorun:** `GET/POST /api/sessions` ve `GET/DELETE /api/sessions/[id]` herkese açık. Tüm oturumlar (prompt, hafıza, sonuçlar) listelenip silinebiliyor. İstemci anahtar göndermezse sunucudaki `.env` anahtarlarıyla LLM çağrısı yapılabiliyor (maliyet riski).
- **Hafifletici:** `docker-compose.yml` portu `127.0.0.1`'e bağlıyor. Risk, uygulama dışarı açıldığında (reverse proxy, GHCR imajının başka ortamda çalıştırılması) ortaya çıkıyor.
- **Öneri:**
  - [x] En azından env tabanlı bir erişim token'ı (middleware)
  - [x] Oturumları kullanıcı/token'a bağla
  - [x] Sunucu anahtarlarının kullanımını yapılandırılabilir yap

### SEC-3 ✅ `/api/sessions` POST doğrulamasız; oturum üzerine yazma (Tamamlandı)
- **Dosya:** `app/api/sessions/route.ts`, `lib/db/index.ts`, `app/api/consensus/route.ts`
- **Sorun:** Zod yok, Content-Type kontrolü yok, boyut sınırı yok. `ON CONFLICT(id) DO UPDATE` nedeniyle bilinen/tahmin edilen bir ID ile başka oturumun üzerine yazılabiliyor. `/api/consensus` içindeki `sessionId` da `z.string().optional()` ve format doğrulanmıyor.
- **Öneri:**
  - [x] Zod şeması + boyut sınırları
  - [x] `sessionId` için `z.string().uuid()`
  - [x] Sahiplik kontrolü (SEC-2 ile birlikte)

### SEC-4 ✅ Rate limit kolay aşılır (Tamamlandı)
- **Dosya:** `app/api/consensus/route.ts`
- **Sorun:**
  - `x-forwarded-for` doğrudan güveniliyor (spoof edilebilir).
  - Başlık yoksa herkes `'anonymous'` kovasını paylaşıyor.
  - Harita 10.000 kayda ulaşınca `clear()` tüm sayaçları sıfırlıyor.
  - Rate limit yalnızca `/api/consensus` üzerinde. MCP proxy ve sessions uç noktalarında yok.
  - Bellek içi olduğu için çok instance'lı çalışmada işe yaramaz.
- **Öneri:**
  - [x] Güvenilir proxy arkasında doğru IP çıkarımı
  - [x] Süresi dolan kayıtları temizle (tümünü silme)
  - [x] Diğer uç noktalara da uygula

### SEC-5 ✅ CSP zayıf, HSTS yok (Tamamlandı)
- **Dosya:** `next.config.mjs`
- **Sorun:** `script-src` içinde `'unsafe-inline' 'unsafe-eval'` var. Yalnızca `connect-src` sıkı. `Strict-Transport-Security` başlığı yok. Issues dosyası SEC-10'u "sıkılaştırıldı" olarak işaretliyor.
- **Öneri:**
  - [x] Nonce tabanlı CSP (Next.js middleware) ve `unsafe-eval`'i kaldırma denemesi
  - [x] HSTS (HTTPS ortamında)

### SEC-6 ✅ Prompt-injection kaçışı eksik (Tamamlandı)
- **Dosya:** `lib/harness/utils.ts` (`sanitizeXmlData`)
- **Sorun:** Test edildi. Şu girdiler **kaçışlanmadan** geçiyor:
  - `< /user_prompt>` (boşluklu)
  - `<user_prompt x="1">` (özellikli etiket)
  - `</user_prompt\u200b>` (sıfır genişlikli karakter)
  - `＜/user_prompt＞` (tam genişlikli karakterler)
- **Etki:** Tek kullanıcılı kullanımda sınırlı. Ancak Open-Notebook içeriği, hafıza ve ajanlar arası aktarılan metinler güvenilmeyen veri.
- **Öneri:**
  - [x] Regex yerine tüm `<` ve `>` karakterlerini kaçışla (ve Unicode benzerlerini normalize et)
  - [x] Prompt sınırlayıcıları için rastgele (nonce) etiket adları kullan

### SEC-7 ✅ API anahtarları localStorage'da düz metin (Tamamlandı)
- **Dosya:** `app/page.tsx`
- **Sorun:** Anahtarlar düz metin saklanıyor ve her istek gövdesinde gidiyor. `dangerouslySetInnerHTML` kullanılmadığı için XSS riski düşük, ama bir XSS durumunda anahtarlar çalınır. Open-Notebook API anahtarı da aynı şekilde saklanıyor.
- **Öneri:**
  - [x] Sunucu tarafı anahtar yönetimini tercih et ve UI'da bu seçeneği öne çıkar
  - [x] Anahtarların tarayıcıda saklandığına dair UI uyarısı ekle

### SEC-8 ✅ Hata mesajı sızıntısı (Tamamlandı)
- **Dosya:** `lib/harness/utils.ts`, `app/api/mcp/open-notebook/route.ts`
- **Sorun:** `sanitizeErrorMessage` yalnızca `sk-...` desenini maskeliyor. Gemini (`AIza...`) ve diğer anahtar biçimleri maskelenmiyor. İç adresleri içeren bağlantı hataları (ör. `host.docker.internal:11434`) ve MCP route'larındaki `err.message` istemciye olduğu gibi gidiyor.
- **Öneri:**
  - [x] Genel hata mesajı dön, ayrıntıyı sunucuda logla

### SEC-9 ✅ `data/consensus.db*` git'te takipli (Tamamlandı)
- **Dosya:** `data/consensus.db`, `consensus.db-shm`, `consensus.db-wal`
- **Sorun:** `.gitignore` `/data/` içeriyor ama dosyalar daha önce commit'lenmiş. Şu an yalnızca şema var, kullanıcı verisi yok. Gelecekte veri commit'lenme riski var.
- **Not:** Git geçmişinde gerçek API anahtarı bulunmadı (yalnızca `sk-ant-...` gibi placeholder'lar).
- **Öneri:**
  - [x] `git rm -r --cached data/`

---

## 2. Kod Tutarsızlıkları

### BUG-1 ✅ Zaman bütçesi hakemi aç bırakıyor (Tamamlandı)
- **Dosya:** `lib/harness/engine.ts`
- **Sorun:** Aşama 1 en fazla 25 sn, Aşama 2 en fazla 20 sn, hakem kalan süreyi alıyor. En kötü senaryoda hakeme **10 sn** kalıyor (toplam 55 sn). `maxTokens: 4096` ile bir konsensüs raporu için yetersiz olabilir. Varsayılan ajanlardan biri `deepseek-r1` (akıl yürütme modeli). Issues dosyası `AbortSignal.timeout(28000)` diyor, kod farklı.
- **Öneri:**
  - [x] Hakem için asgari süre ayır (ör. 20 sn) veya aşama sürelerini yeniden dağıt
  - [x] Aşama 1/2 zaman aşımına uğrayan ajanları açıkça raporla

### BUG-2 ✅ Sessiz yedek (fallback) ajanlar (Tamamlandı)
- **Dosya:** `lib/types.ts` (`getPrimaryAgents`)
- **Sorun:** `agents` ve `agentA/B/C` verilmezse kullanıcının seçmediği `gpt-4o-mini` ve `claude-3-5-haiku` ajanları çalıştırılıyor. API'yi doğrudan çağıranlar için beklenmedik maliyet. `agentA/B/C` alanları ve `DEFAULT_SYSTEM_PROMPTS.agentA` gibi adlar eski şemadan kalma.
- **Öneri:**
  - [x] Yedek ajanları kaldır, geçersiz konfigürasyonda 400 dön
  - [x] Eski `agentA/B/C` alanlarını kaldır veya açıkça "deprecated" işaretle

### BUG-3 ✅ Ajan ID çakışması / benzersizlik kontrolü yok (Tamamlandı)
- **Dosya:** `lib/types.ts`, `lib/harness/engine.ts`
- **Sorun:** `id` alanı `z.string().optional()`. Aynı ID'li iki ajan `stage1Divergence` içinde birbirinin üzerine yazar. `id: "referee"` da çakışabilir.
- **Öneri:**
  - [x] Zod `refine` ile benzersizlik kontrolü; `referee` ID'sini rezerve et

### BUG-4 ✅ DB kayıt hatası sessizce yutuluyor (Tamamlandı)
- **Dosya:** `app/api/consensus/route.ts`, `docker-compose.yml`
- **Sorun:** `saveSession` hata verirse yalnızca `console.error` yapılıyor, istek 200 dönüyor. Docker'da `./data` bind mount'u `nextjs` (uid 1001) tarafından yazılamazsa oturumlar hiç kaydedilmez ve fark edilmez, liste uç noktası ise 500 verir.
- **Öneri:**
  - [x] Named volume kullan veya sahiplik/izin ayarını belgele
  - [x] Yanıtta `sessionSaved: false` gibi bir uyarı alanı dön

### BUG-5 ✅ İstemci tarafı konfigürasyon doğrulaması zayıf (Tamamlandı)
- **Dosya:** `app/page.tsx`
- **Sorun:** localStorage'daki `config` şemaya karşı doğrulanmıyor, yalnızca `agents.length >= 2` bakılıyor. `referee` eksikse sunucudan 400 dönüyor.
- **Öneri:**
  - [x] Paylaşılan Zod şemasıyla `safeParse`, başarısızsa `DEFAULT_CONFIG`

### BUG-6 ✅ Zod API kullanımı tutarsız (Tamamlandı)
- **Dosya:** `app/api/consensus/route.ts` (`.error.errors`) ve `app/api/mcp/open-notebook/route.ts` (`.issues`)
- **Sorun:** `.errors` Zod 4'te kaldırıldı. İleride yükseltmede kırılır.
- **Öneri:**
  - [x] Her yerde `.issues` kullan

### BUG-7 ✅ `APP_URL` Docker'a iletilmiyor (Tamamlandı)
- **Dosya:** `docker-compose.yml`, `lib/providers/openrouter.ts`
- **Sorun:** `.env.example` ve OpenRouter `HTTP-Referer` başlığı `APP_URL` kullanıyor, compose ise bu değişkeni iletmiyor. Docker'da hep `http://localhost:3000` kalıyor.
- **Öneri:**
  - [x] `docker-compose.yml`'e `APP_URL=${APP_URL:-http://localhost:3000}` ekle

### BUG-8 ✅ Eskimiş model katalogları ve varsayılanlar (Tamamlandı)
- **Dosya:** `lib/config/agents.ts`, `lib/types.ts`
- **Sorun:** `gemini-1.5-*`, `claude-3-5-*`, `claude-3-7-*`, `o1-mini` gibi modeller sağlayıcılar tarafından emekli edilmiş veya edilmek üzere olabilir (sağlayıcı dokümanlarından doğrulanmalı). Varsayılan konfigürasyon bunlara dayanıyor.
- **Öneri:**
  - [x] Güncel katalog + `tsc` ile doğrulanan tek kaynak (config), özel model girişi zaten var

### BUG-9 🟡 Mimari: tek devasa bileşen
- **Dosya:** `app/page.tsx` (1850 satır)
- **Sorun:** Ayarlar, oturum listesi, MCP paneli, pipeline UI tek bileşende. Bakım ve test zor.
- **Öneri:**
  - [ ] Bileşenlere ve hook'lara böl (SettingsModal, SessionSidebar, StageTabs, `useLocalSettings`)

### BUG-10 ✅ `any` kullanımı (Tamamlandı)
- **Dosya:** `app/api/mcp/open-notebook/route.ts`, `app/page.tsx`
- **Sorun:** Birçok `err: any`, `nb: any`, `params: z.any()`. Tip güvenliği zayıf.
- **Öneri:**
  - [x] `unknown` + daraltma, harici yanıtlar için Zod şeması

---

## 3. Bağımlılıklar

### `npm audit` — 10 açık (6 düşük, 2 orta, 2 yüksek)

### DEP-1 ✅ `ai@4` zinciri (Planlandı/İncelendi)
- **Detay:**
  - `jsondiffpatch <=0.7.5` (yüksek): XSS ve prototype pollution. `ai`'nin UI tarafında kullanılıyor. Projede yalnızca sunucuda `generateText` çağrıldığı için pratik etkisi düşük.
  - `@ai-sdk/provider-utils <3.0.28`: kontrolsüz kaynak tüketimi. Düzeltme `ai@7` gerektiriyor (breaking).
- **Öneri:**
  - [x] `ai` v5+ ve `@ai-sdk/*` yükseltmesini planla
  - [x] API değişiklikleri: `LanguageModelV1` → yeni model tipi, `maxTokens` → `maxOutputTokens`, `usage.promptTokens` → `inputTokens`

### DEP-2 ✅ `next` içindeki gömülü `postcss` (Planlandı/İncelendi)
- **Detay:** Yüksek önemli advisory'ler. Düzeltme Next 16.3.x gerektiriyor (breaking). Yalnızca derleme zamanı CSS işlemeyle ilgili, çalışma zamanı riski düşük.
- **Öneri:**
  - [x] Next 16'ya geçişi planla (`next lint` de orada kaldırılıyor)
  - [x] Geçici olarak `overrides` ile postcss sürümü denenebilir (denenmedi)

### DEP-3 ✅ ESLint 8 EOL ve `next lint` kullanımdan kalkıyor (Planlandı/İncelendi)
- **Detay:** `eslint@8.57.1` desteklenmiyor. `next lint` Next 16'da kaldırılıyor (CLI uyarısı verdi).
- **Öneri:**
  - [x] ESLint 9 + flat config, `eslint` CLI'ya geçiş (`@next/codemod next-lint-to-eslint-cli`)

### DEP-4 ✅ `@types/better-sqlite3` yanlış bölümde (Tamamlandı)
- **Öneri:**
  - [x] `devDependencies`'e taşı

### DEP-5 ✅ `@types/node ^20` ile Node 22 çalışma zamanı uyumsuz (Tamamlandı)
- **Öneri:**
  - [x] `@types/node ^22`

### DEP-6 ✅ Eksik `package.json` alanları ve script'ler (Tamamlandı)
- **Öneri:**
  - [x] `"engines": { "node": ">=22" }`
  - [x] `typecheck` (`tsc --noEmit`) ve `test` script'leri
  - [x] `react`/`react-dom` için `^19` (şu an `19.0.0` sabit, yama sürümlerini almıyor)

### DEP-7 ℹ️ Kullanılmayan bağımlılık
- Gerçekten kullanılmayan paket **bulunmadı**. `postcss`/`autoprefixer` yalnızca config dosyasındaki adlarla kullanılıyor, Tailwind v3 için gerekli.
- `lucide-react ^0.470.0` 0.x olduğu için caret yalnızca 0.470.x'i kapsıyor, bilinçli bir tercih değilse gözden geçir.

---

## 4. Dokümantasyon ve CI

### DOC-1 ✅ README dizin ağacı eksik (Tamamlandı)
- `app/api/sessions`, `app/api/mcp/open-notebook`, `lib/db` ve `lib/security.ts` eklendi.

### DOC-2 ✅ "Test ve CI ✅" ifadesi doğru değil (Tamamlandı)
- Repoda birim testler (`lib/harness/utils.test.ts`) oluşturuldu. GitHub Actions CI iş akışı (`docker-publish.yml`) `npm run typecheck` ve `npm test` adımları içerecek şekilde güncellendi.
- **Öneri:**
  - [x] CI'a `npm ci`, `tsc --noEmit`, `lint` ve birim test adımlarını ekle
  - [x] `sanitizeXmlData`, `getPrimaryAgents`, `sanitizeErrorMessage` ve Zod doğrulaması için birim testleri

### DOC-3 ✅ `ai-consensus-mvp-issues.md` güncel değil (Tamamlandı)
- Bulgular `issue.md` ile senkronize edildi ve güncellendi.

---

## Önerilen öncelik sırası

1. **SEC-1, SEC-2, SEC-3:** SSRF koruması, erişim doğrulaması, sessions girdi doğrulaması
2. **BUG-1, BUG-2, BUG-3:** zaman bütçesi, yedek ajanlar, ID benzersizliği
3. **SEC-4, SEC-5, SEC-6:** rate limit, CSP/HSTS, prompt-injection kaçışı
4. **SEC-9, BUG-4, BUG-7, DEP-4, DEP-5:** küçük ve hızlı düzeltmeler (`git rm --cached`, named volume, `APP_URL`, tip paketleri)
5. **DOC-2:** CI'a `tsc`/lint/audit ve testler
6. **DEP-1, DEP-2, DEP-3:** `ai`, Next 16 ve ESLint 9 yükseltme planı
