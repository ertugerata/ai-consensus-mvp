# ai-consensus-mvp — İnceleme Raporu ve Issue Listesi (Güncel)

**Depo:** https://github.com/ertugerata/ai-consensus-mvp  
**Sürüm:** `0.4.0` · **Commit:** `fe1b030` (PR #27 sonrası) · **Tarih:** 2026-10-04 · **Önceki doğrulama:** `ddfe621`  
**Yöntem:** kaynak kod okuma, `tsc --noEmit`, `npm test`, `next lint`, `npm audit`; `isBlockedUrl` (DNS mock'lu), rate limit ve token davranışları için izole testler.

**Durum göstergeleri:** ✅ Doğrulandı / kapandı · 🟡 Kısmen çözüldü / açık · ❔ Bu incelemede doğrulanamadı · ℹ️ Bilgi

> **Numaralandırma notu:** Önceki raporun kimlikleri (SEC-1…10, BUG-1…16, DEP-1…6) "Eski rapor ile uzlaştırma" bölümünde korunmuştur. Güncel işler **ISS-01…ISS-13** olarak numaralandırılmıştır.

> **Önceki sürümle fark:** Bu dosyanın bir önceki sürümü ISS-01…11'i "çözüldü" olarak işaretliyordu. Aşağıdaki doğrulamaya göre yalnızca ISS-02, ISS-03 ve ISS-06 kapandı; diğerlerinin her biri için nedeni belirtildi.

---

## Özet

| Alan | Sonuç |
|---|---|
| İşler (ISS) | 13 iş: ✅ 3 kapandı · 🟡 10 açık (🟠 6 orta · 🟡 4 düşük · 🔴 0 yüksek) |
| Eski rapor maddeleri | 32 madde: ✅ 21 · 🟡 8 · ❔ 2 · ℹ️ 1 |
| `tsc --noEmit` | ✅ Temiz |
| `npm test` | ✅ 17/17 geçti |
| `next lint` | ✅ Temiz ("next lint Next 16'da kaldırılıyor" uyarısı var) |
| `npm audit` | ⚠️ 17 açık (6 düşük, 2 orta, 9 yüksek) |

**En önemli iş:** ISS-05 (rate limit). Token tanımlı değilse (varsayılan) sahte `Bearer` veya değişen `x-real-ip` ile limit aşılıp sunucudaki LLM anahtarlarıyla sınırsız `/api/consensus` çağrısı yapılabiliyor.

**`npm audit` notu:** Önceki doğrulamadaki 10 açıktan 17'ye çıkış kod değişikliğinden değil (tek yeni bağımlılık `ipaddr.js`, advisory yok), büyük olasılıkla yeni yayımlanan advisory'lerden (özellikle `braces` zinciri) kaynaklanıyor; advisory tarihleri doğrulanmadı.

**Kapsam notları:** `npm ci --ignore-scripts` kullanıldı (`better-sqlite3` native derlemesi yapılmadı); `next build` ve Docker çalışma testi **yapılmadı**. `app/page.tsx` (1938 satır) tamamen satır satır okunmadı; yalnızca değişen kısımlar incelendi.

---

## İş durum tablosu

| ID | Öncelik | Başlık | Önceki iddia | Doğrulanan durum | Not |
|---|---|---|---|---|---|
| ISS-01 | 🟠 Orta | SSRF: DNS rebinding (bağlantı doğrulanan IP'ye sabitlenmeli) ve yanıt boyutu sınırı | ✅ | 🟡 Açık | DNS, IPv6 ve metadata bypass'ları kapandı (24 girdi BLOCK). Kalan: DNS rebinding, yanıt boyutu sınırı |
| ISS-02 | — | API_ACCESS_TOKEN uçtan uca çalışmıyor; token kapalıyken oturumlar üzerine yazılabiliyor | ✅ | ✅ Kapandı | Env, compose, README, arayüz, `timingSafeEqual`, production uyarısı, transaction. Token boşsa açık (kabul edilen risk) |
| ISS-03 | — | Open-Notebook varsayılan olarak çalışmıyor (özel ağ engeli belgelenmemiş) ve test eylemi yanlış pozitif veriyor | ✅ | ✅ Kapandı | `ALLOW_PRIVATE_IPS` / `OPEN_NOTEBOOK_ALLOW_LIST` belgelendi, `host:port` desteği, `test` eylemi 401/403 ayrımı |
| ISS-04 | 🟠 Orta | CSP script-src içinde 'unsafe-inline' duruyor; dev modu doğrulanmalı | ✅ | 🟡 Açık | Yalnızca HSTS `preload` kaldırıldı; `unsafe-inline` duruyor |
| ISS-05 | 🟠 Orta | Rate limit hâlâ aşılabiliyor: sahte Bearer ve x-real-ip her istekte yeni kova açıyor | ✅ | 🟡 Açık | Sahte Bearer ve değişen `x-real-ip` ile limit tamamen aşılıyor (30 istekte 0 engel) |
| ISS-06 | — | MCP route'u hata mesajlarını ham olarak istemciye döndürüyor | ✅ | ✅ Kapandı | `sanitizeErrorMessage` MCP route'larında kullanılıyor |
| ISS-07 | 🟡 Düşük | API anahtarları ve erişim token'ı tarayıcıda localStorage'da saklanıyor (kapatma seçeneği yok) | ✅ | 🟡 Açık | Güvenlik uyarısı eklendi; saklamayı kapatma seçeneği yok |
| ISS-08 | 🟡 Düşük | Dağıtım güvenilirliği: bind mount izin sorunu ve dar zaman payı (58 sn / maxDuration 60) | ✅ | 🟡 Açık | `sessionSaved` uyarı bandı eklendi; bind mount ve 58 sn bütçe payı aynı |
| ISS-09 | 🟡 Düşük | Model katalogları ve varsayılanlar güncel mi doğrulanmalı | ✅ | 🟡 Açık | `agents.ts` değişmedi; "doğrulandı" iddiasının dayanağı yok |
| ISS-10 | 🟡 Düşük | app/page.tsx tek bileşen (1938 satır, büyümeye devam ediyor) | ✅ | 🟡 Açık | `any` temizlendi (0); `page.tsx` 1938 satıra büyüdü |
| ISS-11 | 🟠 Orta | CI'a lint ve npm audit ekle; rate limit ve DNS rebinding regresyon testleri | ✅ | 🟡 Açık | 17 test (security dahil) eklendi; CI'da lint/audit yok, bypass'lar test edilmiyor |
| ISS-12 | 🟠 Orta | ai@4 ve @ai-sdk/* zincirini yükselt (jsondiffpatch, provider-utils advisory'leri) | 🟡 Ertelendi | 🟡 Açık | `ai@4` zinciri aynen duruyor |
| ISS-13 | 🟠 Orta | Next 16 (gömülü postcss), ESLint 9 ve braces/tailwind zinciri | 🟡 Ertelendi | 🟡 Açık | `next` postcss, ESLint 8, `braces`/tailwind zinciri |

---

## Açık işler

### ISS-01 🟠 [Güvenlik] SSRF: DNS rebinding (bağlantı doğrulanan IP'ye sabitlenmeli) ve yanıt boyutu sınırı

**Etiketler:** `security`, `priority:medium` · **Durum:** 🟡 Açık

#### Durum
PR #27 ile SSRF filtresinin büyük kısmı kapandı. `lib/security.ts` artık `ipaddr.js` ve `dns.promises.lookup` kullanıyor, hostname normalize ediyor (köşeli parantez, sondaki nokta). İzole testte (DNS mock'lu) şu girdilerin **tamamı BLOCK** döndü:

`[::1]`, `[::ffff:127.0.0.1]`, `[::ffff:7f00:1]`, `[fe80::1]`, `[fc00::1]`, `[fd00:ec2::254]`, `127.0.0.1.nip.io`, `localtest.me`, `host.docker.internal`, `*.internal`, `100.100.100.200`, `168.63.129.16`, `100.64.0.1`, `0.1.2.3`, `metadata.google.internal.`, `169.254.169.254`, `169.254.170.2`, `2130706433`, `0x7f.1`, `192.168.1.50`, `[::]`, `224.0.0.1`, `240.0.0.1`, `file://`

Bu issue yalnızca **kalan** boşlukları kapsar.

#### Kalan sorunlar
1. **DNS rebinding (TOCTOU).** `isBlockedUrl` hostname'i bir kez çözümlüyor, ardından route `fetch` ile hostname'i **tekrar** çözümlüyor. İzole testte ilk sorguda `93.184.216.34`, ikinci sorguda `127.0.0.1` dönen bir DNS için `isBlockedUrl` ALLOW verdi; gerçek bağlantı ikinci çözümlemede loopback'e gidebilir. Bağlantı doğrulanan IP'ye sabitlenmiyor.
2. **Yanıt boyutu sınırı yok.** `res.json()` yanıtın tamamını okuyor; kesme (200.000 karakter) sonradan yapılıyor. Bu PR bu konuda değişiklik içermiyor.
3. **`mcp_call` yanıtı ham dönüyor.** (Bu PR'da değişmedi.)
4. **Allow-list DNS kontrolünü tamamen atlıyor.** Allow-list'teki bir hostname çözümlenmeden `false` dönüyor; allow-list'e alınan ad daha sonra başka bir IP'ye çözülürse korunmaz (operatör kontrolünde, bilinçli bir seçim olarak belgelenmeli).
5. **Not (opt-in):** `ALLOW_PRIVATE_IPS=true` iken `169.254.170.2` (ECS kimlik bilgileri) ve `fd00:ec2::254` (AWS IPv6 metadata) açık kalıyor; yalnızca `169.254.169.254` ve listedeki metadata adresleri engelli.

#### Yapılacaklar
- [ ] Bağlantıyı doğrulanan IP'ye sabitle: özel `lookup` fonksiyonu ile (undici `Agent({ connect: { lookup } })` veya `http(s).request({ lookup })`) **her** çözümlenen adresi bağlantı anında doğrula; böylece hem http hem https (SNI) çalışır
- [ ] Yanıtı akış (stream) ile okuyup boyut sınırı uygula; sınır aşılınca iptal et
- [ ] `mcp_call` yanıtını boyut ve şema açısından sınırla
- [ ] Allow-list davranışını belgele (DNS kontrolü uygulanmaz)
- [ ] `ALLOW_PRIVATE_IPS=true` iken metadata engel listesini genişlet (`169.254.170.2`, `fd00:ec2::254`)

#### Kabul kriterleri
- Birinci ve ikinci çözümlemede farklı IP dönen bir DNS için bağlantı engelleniyor (test mevcut).
- Boyut sınırını aşan yanıt kesiliyor ve hata dönüyor.

### ISS-04 🟠 [Güvenlik] CSP script-src içinde 'unsafe-inline' duruyor; dev modu doğrulanmalı

**Etiketler:** `security`, `priority:medium` · **Durum:** 🟡 Açık

#### Durum
PR #27'de yalnızca HSTS'ten `preload` kaldırıldı (bu kısım tamam). CSP'de değişiklik yok: `script-src 'self' 'unsafe-inline'` duruyor (`unsafe-eval` zaten daha önce kaldırılmıştı).

#### Kalan sorunlar
- `script-src` içindeki `'unsafe-inline'` XSS'e karşı etkisiz kılıyor. Tarayıcıda saklanan API anahtarları ve API erişim token'ı (bkz. ISS-07) bu yüzden daha riskli.
- **Doğrulanmadı:** Next.js dev modunda React `eval` kullandığı için `unsafe-eval` olmadan `npm run dev` bozulabilir. Denenmesi gerekiyor.
- HSTS `includeSubDomains` ihtiyacı gözden geçirilmeli (paylaşılan alan adlarında etkisi olabilir).

#### Yapılacaklar
- [ ] Nonce tabanlı CSP (middleware) ile `'unsafe-inline'`'ı kaldır
- [ ] Dev ortamında `unsafe-eval`'i koşullu ekle (`NODE_ENV !== 'production'`) ve `npm run dev`'i tarayıcıda dene
- [ ] `includeSubDomains` gerekliliğini gözden geçir

#### Kabul kriterleri
- `npm run dev` ve production build tarayıcıda CSP ihlali olmadan çalışıyor.
- Production CSP'de `unsafe-inline` ve `unsafe-eval` yok.

### ISS-05 🟠 [Güvenlik] Rate limit hâlâ aşılabiliyor: sahte Bearer ve x-real-ip her istekte yeni kova açıyor

**Etiketler:** `security`, `priority:medium` · **Durum:** 🟡 Açık

#### Özet
PR #27 rate limit'i `TRUST_PROXY` ayarına bağladı ve token bazlı anahtar ekledi, ancak iki yol hâlâ limiti tamamen aşıyor. Token tanımlı değilse (varsayılan) herkes sunucudaki LLM anahtarlarıyla sınırsız `/api/consensus` çağrısı yapabilir.

#### Doğrulama (izole test, limit = 10, 30 istek)
| Senaryo | Engellenen istek |
|---|---|
| Başlıksız | 20 (beklenen davranış) |
| Her istekte farklı sahte `Authorization: Bearer rastgele-N` | **0** |
| Her istekte farklı `x-real-ip` (`TRUST_PROXY` tanımsız) | **0** |
| `TRUST_PROXY=true`, her istekte farklı `x-forwarded-for` | 0 (proxy sahte başlığı ezmiyorsa) |

#### Neden
- `checkRateLimit`, `verifyApiToken`'dan **önce** çağrılıyor (tüm route'larda) ve anahtara istemcinin gönderdiği **ham** token giriyor (`token:<değer>:<yol>`). Geçersiz token da yeni bir kova açıyor.
- `TRUST_PROXY` kapalıyken `x-real-ip` kullanılıyor; bu başlık, uygulama doğrudan erişilebilirse istemci tarafından serbestçe ayarlanır. Next.js 15 route handler'larında `req.ip` yok.
- Temizlik yalnızca harita 2000 kaydı geçince ve yalnızca süresi dolanlar için çalışıyor; sahte token'larla bellek (anahtara tüm token string'i giriyor) şişirilebilir.

#### Yapılacaklar
- [ ] Token bazlı anahtarı yalnızca token **doğrulandıktan sonra** kullan; doğrulanamayan istekleri IP/anonim kovaya düşür
- [ ] `TRUST_PROXY` kapalıyken istemci başlıklarını (`x-real-ip`, `x-forwarded-for`) yok say; tek kovaya düşür veya bağlantı adresini kullan
- [ ] Haritaya üst sınır koy (LRU veya boyut sınırı)
- [ ] Tüm kovalar için tek bir genel limit ekle (bir kovanın aşılması tüm sistemi korumasız bırakmasın)
- [ ] Bu iki bypass için regresyon testi ekle (bkz. ISS-11)

#### Kabul kriterleri
- Sahte Bearer veya değişen `x-real-ip` ile limit aşılamıyor (test mevcut).

### ISS-07 🟡 [Güvenlik] API anahtarları ve erişim token'ı tarayıcıda localStorage'da saklanıyor (kapatma seçeneği yok)

**Etiketler:** `security`, `enhancement`, `priority:low` · **Durum:** 🟡 Açık

#### Durum
PR #27 ile ayarlar penceresine, anahtarların `localStorage`'da saklandığına ve üretimde sunucu `.env` kullanılması gerektiğine dair bir güvenlik uyarısı eklendi (bu kısım tamam).

#### Kalan
- Yeni eklenen API erişim token'ı da (`ai_consensus_api_access_token`) `localStorage`'da düz metin saklanıyor.
- `script-src 'unsafe-inline'` (bkz. ISS-04) açıkken bir XSS durumunda anahtarlar ve token çalınır.
- Kullanıcının anahtarı saklamayı kapatma veya yalnızca oturum boyunca tutma seçeneği yok.

#### Yapılacaklar
- [ ] "Anahtarları hatırla" seçeneği ekle; kapalıyken `sessionStorage` kullan veya hiç saklama
- [ ] Sunucu tarafı `.env` kullanımını arayüzde öne çıkar

#### Kabul kriterleri
- Kullanıcı anahtar/token saklamayı kapatabiliyor.

### ISS-08 🟡 [Hata] Dağıtım güvenilirliği: bind mount izin sorunu ve dar zaman payı (58 sn / maxDuration 60)

**Etiketler:** `bug`, `priority:low` · **Durum:** 🟡 Açık

#### Durum
PR #27 ile `sessionSaved === false` olduğunda arayüzde amber uyarı bandı gösteriliyor (bu kısım tamam).

#### Kalan
- `docker-compose.yml` hâlâ `./data:/app/data` bind mount kullanıyor. Container'da `nextjs` (uid 1001) yazamazsa oturumlar kaydedilmiyor; artık görünür ama kök neden çözülmedi.
- En kötü durum zaman bütçesi 20 + 18 + 20 = **58 sn**, `maxDuration = 60`. DB yazma ve ağ gecikmesi için pay 2 sn. Self-host için sorun değil; sunucusuz platformlarda zaman aşımı riski var (`engine.ts` bu PR'da değişmedi).

#### Yapılacaklar
- [ ] Named volume kullan veya sahiplik/izin ayarını belgele
- [ ] Toplam bütçeyi 50-52 sn'ye çek veya `maxDuration`'ı artır

#### Kabul kriterleri
- Docker compose ile ilk çalıştırmada oturumlar kaydediliyor.
- Worst-case toplam süre `maxDuration` değerinin anlamlı şekilde altında.

### ISS-09 🟡 [Hata] Model katalogları ve varsayılanlar güncel mi doğrulanmalı

**Etiketler:** `bug`, `priority:low` · **Durum:** 🟡 Açık

#### Durum
`lib/config/agents.ts` PR #27'de değişmedi. Repodaki rapor "güncel sağlayıcı modelleriyle doğrulandı" diyor; bu doğrulamanın dayanağı repoda görünmüyor ve ben de sağlayıcı dokümanlarına karşı doğrulamadım.

#### Sorun
`gemini-1.5-*`, `claude-3-5-*`, `claude-3-7-*`, `o1-mini` gibi modellerin bir kısmı sağlayıcılar tarafından emekli edilmiş veya edilmek üzere olabilir (sağlayıcı dokümanlarından doğrulanmalı). Varsayılan konfigürasyon bunlara dayanıyor.

#### Yapılacaklar
- [ ] Her sağlayıcının güncel model listesine göre kataloğu ve varsayılanları gözden geçir
- [ ] Emekli model için kullanıcıya anlaşılır hata mesajı ver
- [ ] Katalog tarihini veya kaynağını dosyada not et (özel model girişi zaten mevcut)

#### Kabul kriterleri
- Varsayılan ajanlar güncel modellerle ilk denemede çalışıyor.

### ISS-10 🟡 [Refactor] app/page.tsx tek bileşen (1938 satır, büyümeye devam ediyor)

**Etiketler:** `refactor`, `priority:low` · **Durum:** 🟡 Açık

#### Durum
PR #27 ile `app/` ve `lib/` genelinde `any` kullanımları temizlendi (taramada 0 sonuç) ve `McpNotebookItem` tipi eklendi (bu kısım tamam).

#### Kalan
- `app/page.tsx` ayarlar, oturum listesi, MCP paneli ve pipeline arayüzünü tek bileşende topluyor; 1850 satırdan **1938** satıra çıktı.
- Open-Notebook yanıtları için çalışma zamanı doğrulaması (Zod) yok; yalnızca tip tanımı eklendi.

#### Yapılacaklar
- [ ] Bileşenlere ve hook'lara böl (SettingsModal, SessionSidebar, StageTabs, `useLocalSettings`, `getAuthHeaders` için paylaşılan istemci)
- [ ] Open-Notebook yanıtları için Zod şeması ekle

#### Kabul kriterleri
- `page.tsx` belirgin biçimde küçülmüş, davranış değişmemiş; `tsc` ve lint temiz.

### ISS-11 🟠 [Test/CI] CI'a lint ve npm audit ekle; rate limit ve DNS rebinding regresyon testleri

**Etiketler:** `testing`, `priority:medium` · **Durum:** 🟡 Açık

#### Durum
PR #27 ile `lib/security.test.ts` eklendi ve `npm test` artık 17 testi çalıştırıyor (SSRF, token, rate limit, sanitizer). Bu kısım tamam.

#### Kalan
- CI (`.github/workflows`) değişmedi: yalnızca `npm ci --ignore-scripts`, `typecheck`, `test`. **Lint ve `npm audit` adımı yok.**
- Mevcut `checkRateLimit` testi yalnızca "aynı anahtar için limit uygulanıyor" doğruluyor; ISS-05'teki iki bypass'ı (sahte Bearer, değişen `x-real-ip`) yakalamıyor.
- DNS rebinding senaryosu (ISS-01) için test yok.
- API route'ları (401/429/400 senaryoları) test edilmiyor.

#### Yapılacaklar
- [ ] CI'a lint adımı ekle
- [ ] CI'a `npm audit --audit-level=high` ekle (kabul edilen açıklar için not düş)
- [ ] ISS-05 bypass'ları için regresyon testi (önce başarısız olmalı)
- [ ] ISS-01 DNS rebinding testi (lookup'ı iki farklı IP döndürecek şekilde mock'la)
- [ ] Route'lar için en az 400/401/429 senaryoları

#### Kabul kriterleri
- PR'larda typecheck, lint, test ve audit çalışıyor; ISS-01 ve ISS-05 senaryoları test kapsamında.

### ISS-12 🟠 [Bağımlılık] ai@4 ve @ai-sdk/* zincirini yükselt (jsondiffpatch, provider-utils advisory'leri)

**Etiketler:** `dependencies`, `priority:medium` · **Durum:** 🟡 Açık

#### Özet
`npm audit` 17 açık raporluyor (6 düşük, 2 orta, 9 yüksek). Önceki turdaki 10'dan artış kod değişikliğinden değil (tek yeni bağımlılık `ipaddr.js`, advisory yok), büyük olasılıkla yeni yayımlanan advisory'lerden (özellikle `braces` zinciri) kaynaklanıyor; advisory tarihleri doğrulanmadı.

Bu issue `ai` zincirini kapsar. `braces`/`tailwindcss` zinciri için bkz. ISS-13.

#### Detay
- `jsondiffpatch <=0.7.5` (yüksek): XSS ve prototype pollution. Proje yalnızca sunucuda `generateText` kullandığı için pratik etkisi düşük.
- `@ai-sdk/provider-utils <3.0.28` (düşük): kontrolsüz kaynak tüketimi; `@ai-sdk/anthropic|google|openai|react|ui-utils` ve `ai` (orta) bunun üzerinden etkileniyor.
- `npm audit` düzeltmesi `ai@7`'ye geçişi gerektiriyor (breaking).

#### Yapılacaklar
- [ ] `ai` ve `@ai-sdk/*` paketlerini yükselt
- [ ] API değişikliklerine uyum: `LanguageModelV1` → yeni model tipi, `maxTokens` → `maxOutputTokens`, `usage.promptTokens` → `inputTokens`
- [ ] Provider factory'sini (`lib/providers/*`) ve engine'i yeni tiplere göre güncelle
- [ ] `npm audit` sonucunu tekrar al

#### Kabul kriterleri
- `jsondiffpatch` ve `provider-utils` advisory'leri kapanmış; typecheck, test ve elle çalıştırma temiz.
- Repodaki rapor bu işi "ertelendi" olarak işaretliyor; karar buysa gerekçe ve hedef sürüm bu issue'da belirtilmeli.

### ISS-13 🟠 [Bağımlılık] Next 16 (gömülü postcss), ESLint 9 ve braces/tailwind zinciri

**Etiketler:** `dependencies`, `priority:medium` · **Durum:** 🟡 Açık

#### Özet
Yüksek önemli açıkların çoğu bu başlık altında. Hepsi derleme/geliştirme zamanı araçları üzerinden; çalışma zamanı etkisi düşük ama `npm audit` çıktısını kirletiyor.

#### Detay
- **`next` içindeki gömülü `postcss <=8.5.22`** (yüksek; `</style>` XSS ve `sourceMappingURL` ile dosya okuma). Düzeltme Next 16.3.x gerektiriyor (breaking).
- **`braces` zinciri** (yüksek; derin iç içe desenlerle stack tükenmesi / DoS): `tailwindcss@3` → `chokidar`, `micromatch`, `fast-glob`; `eslint-config-next` → `@next/eslint-plugin-next`, `fast-glob`, `micromatch`. `npm audit` önerisi Tailwind 4'e geçiş.
- **ESLint 8 EOL ve `next lint`** Next 16'da kaldırılıyor (CLI her çalıştırmada uyarı veriyor).

#### Yapılacaklar
- [ ] Next 16'ya geçişi planla ve uygula (geçici çözüm olarak `overrides` ile postcss sürümü denenebilir; denenmedi)
- [ ] ESLint 9 + flat config'e geç: `npx @next/codemod@canary next-lint-to-eslint-cli .`
- [ ] `eslint-config-next` sürümünü Next ile uyumlu yükselt
- [ ] Tailwind 4 geçişini değerlendir veya `braces` advisory'sinin dev-only olduğunu belgeleyip kabul et
- [ ] CI lint adımını yeni CLI'ya taşı (bkz. ISS-11)

#### Kabul kriterleri
- `npm audit` çıktısında `next`/`postcss` kaynaklı yüksek önemli açık yok; lint `next lint` olmadan çalışıyor.
- `braces` zinciri ya kapanmış ya da gerekçesiyle kabul edilmiş.

---

## Kapanan işler (doğrulandı)

- ✅ **ISS-02** — API_ACCESS_TOKEN uçtan uca (env, compose, README, arayüz, timingSafeEqual, production uyarısı, transaction). Not: token boşsa tüm uç noktalar bilinçli olarak açık; bu durumda /api/consensus allowOverwrite ile oturum üzerine yazmaya izin veriyor (kabul edilen risk)
- ✅ **ISS-03** — Open-Notebook özel ağ yapılandırması belgelendi, host:port allow-list, test eylemi 401/403 ayrımı. Not: CIDR desteği yok
- ✅ **ISS-06** — MCP route hata mesajları sanitizeErrorMessage ile maskeleniyor. Not: iç IP maskelemesi (10.x, 192.168.x) ayrıca test edilmedi

---

## Çözülenler (doğrulandı)

- ✅ SSRF filtresi: `ipaddr.js` ile IPv4/IPv6/IPv4-mapped aralık kontrolü, `dns.promises.lookup` ile çözülen tüm adreslerin doğrulanması, hostname normalizasyonu (köşeli parantez, sondaki nokta), metadata IP/host engeli, `file://` ve diğer protokollerin reddi.
- ✅ Allow-list `host` ve `host:port` eşleştirmesi destekliyor; `ALLOW_PRIVATE_IPS` ve `OPEN_NOTEBOOK_ALLOW_LIST` `.env.example`, compose ve README'de belgelendi.
- ✅ API token: env, compose, README ve arayüz ayarı; istemci `Authorization: Bearer` ve `x-api-token` gönderiyor; `crypto.timingSafeEqual`; production'da token yoksa uyarı.
- ✅ `saveSession` kontrol ve yazma adımları tek transaction içinde (TOCTOU kapandı).
- ✅ MCP `test` eylemi: yalnızca `ok` yanıtı başarı sayılıyor, 401/403 ayrı hata olarak dönüyor.
- ✅ `sanitizeErrorMessage` MCP route'larında kullanılıyor; anahtar desenleri `\b` sınırlı (`disk-space` maskelenmiyor), Gemini anahtarı maskeleniyor.
- ✅ `sessionSaved === false` iken arayüzde uyarı bandı gösteriliyor.
- ✅ `app/` ve `lib/` genelinde `any` kullanımı kaldırıldı; `McpNotebookItem` tipi eklendi.
- ✅ `lib/security.test.ts` eklendi; `npm test` 17 test çalıştırıyor (SSRF, token, rate limit, sanitizer).
- ✅ HSTS başlığından `preload` kaldırıldı.
- ✅ Önceki turlardan: sessions girdi doğrulaması (`CreateSessionSchema`), prompt-injection kaçışı, `data/*.db` takipten çıkarıldı, zaman bütçesi (hakeme 20 sn garanti), sessiz yedek ajanlar kaldırıldı, ajan ID benzersizliği, istemci config doğrulaması, Zod `.issues`, `APP_URL`, `@types/*` ve `engines`, README ağacı, CI (Node 22 + typecheck + test).

---

## Eski rapor ile uzlaştırma

Önceki raporda tamamı ✅ görünen 32 maddenin güncel durumu:

| Eski ID | Başlık | Eski | Güncel | Not |
|---|---|---|---|---|
| SEC-1 | Next.js/React kritik açıkları | ✅ | 🟡 | Next sürümü güncel; gömülü `postcss` advisory'si açık → ISS-13 |
| SEC-2 | API anahtarları sunucu fallback desteği | ✅ | ✅ | Çelişen bulgu yok |
| SEC-3 | Kimlik doğrulama / rate limit / boyut sınırı | ✅ | 🟡 | Zod ve boyut sınırları tamam; token artık arayüzden gönderiliyor ve `timingSafeEqual` kullanılıyor (token opsiyonel, bilinçli). Rate limit hâlâ aşılabiliyor → ISS-05 |
| SEC-4 | Girdi doğrulaması ve hata mesajı sızıntısı | ✅ | ✅ | `sanitizeErrorMessage` MCP route'larına entegre edildi, anahtar desenleri `\b` sınırlı (test var) |
| SEC-5 | Güvenlik başlıkları | ✅ | 🟡 | HSTS `preload` kaldırıldı; CSP `script-src 'unsafe-inline'` duruyor → ISS-04 |
| SEC-6 | Prompt injection | ✅ | ✅ | `sanitizeXmlData` tüm `<` `>` karakterlerini kaçışlıyor, testli |
| SEC-7 | .env ve ignore dosyaları | ✅ | ✅ | `data/*.db` git takibinden çıkarıldı (PR #12) |
| SEC-8 | Docker/Compose sertleştirme | ✅ | ❔ | Bu incelemede yeniden doğrulanmadı; bind mount hâlâ var → ISS-08 |
| SEC-9 | Geçişli bağımlılık advisory'leri | ✅ | 🟡 | `npm audit`: 17 açık (6 düşük, 2 orta, 9 yüksek) → ISS-12, ISS-13 |
| SEC-10 | CSP sıkılaştırma | ✅ | 🟡 | `connect-src 'self'` doğru; `script-src 'unsafe-inline'` duruyor → ISS-04 |
| BUG-1 | Hakem hatası tüm yanıtları kaybettiriyor | ✅ | ✅ | Çelişen bulgu yok |
| BUG-2 | Dockerfile `public*` COPY hatası | ✅ | ✅ | Çelişen bulgu yok |
| BUG-3 | Hakem istemi hafızayı içermiyor | ✅ | ✅ | Çelişen bulgu yok |
| BUG-4 | Hata metni hakeme yanıt olarak veriliyor | ✅ | ✅ | Çelişen bulgu yok |
| BUG-5 | İstemci `res.ok` kontrol etmiyor | ✅ | ✅ | Çelişen bulgu yok |
| BUG-6 | Zaman aşımı / iptal / retry | ✅ | ✅ | Mekanizma var; açıklamadaki 28000 ms koda uymuyor (güncel: 20/18/20 sn, toplam 58 sn) → ISS-08 |
| BUG-7 | localStorage korumasız | ✅ | ✅ | İstemci config'i Zod ile doğrulanıyor |
| BUG-8 | "Özel Model Gir..." işlevsiz | ✅ | ✅ | Çelişen bulgu yok |
| BUG-9 | Model listeleri ve varsayılanlar eskimiş | ✅ | ❔ | `lib/config/agents.ts` değişmedi; sağlayıcı dokümanlarına karşı doğrulanmadı → ISS-09 |
| BUG-10 | `navigator.clipboard` hatası | ✅ | ✅ | Çelişen bulgu yok |
| BUG-11 | Hakem isteminde yazım hatası | ✅ | ✅ | Çelişen bulgu yok |
| BUG-12 | Erişilebilirlik ve UX | ✅ | ✅ | Çelişen bulgu yok |
| BUG-13 | Dokümantasyon uyumsuzluğu | ✅ | ✅ | README güncel; SSRF anlatımı büyük ölçüde doğru, DNS rebinding hariç → ISS-01 |
| BUG-14 | Test ve CI altyapısı | ✅ | 🟡 | CI typecheck + test çalıştırıyor, testler 17 (güvenlik dahil); lint, audit ve regresyon testleri eksik → ISS-11 |
| BUG-15 | Hakem yedek mantığı | ✅ | ✅ | Çelişen bulgu yok |
| BUG-16 | Yükleme sınırı ile sunucu sınırı uyuşmuyor | ✅ | ✅ | Çelişen bulgu yok |
| DEP-1 | ESLint eksik | ✅ | ✅ | ESLint mevcut; sürüm sorunu DEP-3/DEP-6 altında |
| DEP-2 | Eklenmesi gereken paketler | ✅ | ✅ | Çelişen bulgu yok |
| DEP-3 | Eskimiş bağımlılıklar | ✅ | 🟡 | `ai@4`, `next` postcss, `braces` zinciri, ESLint 8 → ISS-12, ISS-13 |
| DEP-4 | `package.json` yapılandırma eksikleri | ✅ | ✅ | `engines`, `typecheck`, `test` eklendi; `@types/*` düzeltildi |
| DEP-5 | Kullanılmayan bağımlılık kontrolü | ℹ️ | ℹ️ | Kullanılmayan paket bulunmadı |
| DEP-6 | ESLint yanlış bölümde ve eski sürüm | ✅ | 🟡 | `devDependencies`'te; ancak ESLint 8 EOL → ISS-13 |

---

## Önerilen sıra

1. **ISS-05:** rate limit (token'ı doğrulamadan anahtar yapma, `x-real-ip`'i yok sayma)
2. **ISS-01:** DNS rebinding (bağlantıyı doğrulanan IP'ye sabitle) ve yanıt boyutu sınırı
3. **ISS-11:** CI'a lint/audit, ISS-05 ve ISS-01 için regresyon testleri
4. **ISS-04:** nonce tabanlı CSP
5. **ISS-12, ISS-13:** `ai` SDK, Next 16, ESLint 9 ve `braces`/tailwind zinciri
6. **ISS-07…ISS-10:** anahtar saklama seçeneği, dağıtım güvenilirliği, model kataloğu, `page.tsx` bölme
