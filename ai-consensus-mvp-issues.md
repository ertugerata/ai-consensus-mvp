# ai-consensus-mvp — İnceleme Raporu ve Issue Listesi (Birleştirilmiş)

**Depo:** https://github.com/ertugerata/ai-consensus-mvp  
**Sürüm:** `0.4.0` · **Commit:** `ddfe621` (PR #12 sonrası) · **Tarih:** 2026-10-03  
**Kaynaklar:** `ai-consensus-mvp-issues.md` (önceki durum raporu) + `issue.md` v2 (yeniden inceleme). İki dosya bu belgede birleştirilmiştir; eski `issue.md` kaldırılabilir.  
**Yöntem:** kaynak kod okuma, `tsc --noEmit`, `npm test`, `next lint`, `npm audit`, `isBlockedUrl` için izole bypass testleri, zaman bütçesi simülasyonu.

**Durum göstergeleri:** ✅ Doğrulandı / çözüldü · 🟡 Kısmen çözüldü veya yeniden açıldı · ❔ Bu incelemede doğrulanamadı · ℹ️ Bilgi

> **Numaralandırma notu:** Önceki raporun kimlikleri (SEC-1…10, BUG-1…16, DEP-1…6) olduğu gibi korunmuştur ve yalnızca "Eski rapor ile uzlaştırma" bölümünde kullanılır. Güncel açık işler **ISS-01…ISS-13** olarak numaralandırılmıştır; her iş, kapsadığı eski ve `issue.md` v2 kimliklerini belirtir.

---

## Özet

| Alan | Sonuç |
|---|---|
| Eski rapor maddeleri | 32 madde: ✅ 20 · 🟡 9 · ❔ 2 · ℹ️ 1 |
| Açık işler (ISS) | 13 iş: 🔴 2 yüksek · 🟠 5 orta · 🟡 6 düşük |
| `tsc --noEmit` | ✅ Temiz |
| `npm test` | ✅ 5/5 geçti |
| `next lint` | ✅ Temiz ("next lint Next 16'da kaldırılıyor" uyarısı var) |
| `npm audit` | ⚠️ 10 açık (6 düşük, 2 orta, 2 yüksek) |

**En önemli iki iş:** ISS-01 (SSRF filtresi bypass) ve ISS-02 (token mekanizması uçtan uca çalışmıyor).

**Kapsam notları:** `npm ci --ignore-scripts` kullanıldı (`better-sqlite3` native derlemesi yapılmadı); `next build` ve Docker çalışma testi **yapılmadı**. `app/page.tsx` (1850 satır) tamamen satır satır okunmadı; yalnızca değişen kısımlar ve fetch/localStorage kullanımları incelendi.

---

## Açık işler

| ID | Öncelik | Başlık | Kapsadığı kimlikler |
|---|---|---|---|
| ISS-01 | 🔴 Yüksek | SSRF filtresi (isBlockedUrl) IPv6, DNS ve metadata adreslerinde bypass ediliyor | issue.md v2: SEC-1 · Eski rapor: BUG-13 (README iddiası) |
| ISS-02 | 🔴 Yüksek | API_ACCESS_TOKEN uçtan uca çalışmıyor; token kapalıyken oturumlar üzerine yazılabiliyor | issue.md v2: SEC-2, SEC-10 · Eski rapor: SEC-3 |
| ISS-03 | 🟠 Orta | Open-Notebook varsayılan olarak çalışmıyor (özel ağ engeli belgelenmemiş) ve test eylemi yanlış pozitif veriyor | issue.md v2: BUG-11, BUG-12 |
| ISS-04 | 🟠 Orta | CSP script-src içinde 'unsafe-inline' duruyor; HSTS preload ve dev modu doğrulanmalı | issue.md v2: SEC-5 · Eski rapor: SEC-5, SEC-10 |
| ISS-05 | 🟡 Düşük | Rate limit x-forwarded-for başlığına güveniyor ve anonim kovayı paylaşıyor | issue.md v2: SEC-4 |
| ISS-06 | 🟡 Düşük | MCP route'u hata mesajlarını ham olarak istemciye döndürüyor | issue.md v2: SEC-8 · Eski rapor: SEC-4 |
| ISS-07 | 🟡 Düşük | API anahtarları tarayıcıda localStorage'da düz metin saklanıyor | issue.md v2: SEC-7 |
| ISS-08 | 🟡 Düşük | Dağıtım güvenilirliği: bind mount izin sorunu, sessionSaved uyarısı ve dar zaman payı | issue.md v2: BUG-4, BUG-13 |
| ISS-09 | 🟡 Düşük | Model katalogları ve varsayılanlar güncel mi doğrulanmalı | issue.md v2: BUG-8 · Eski rapor: BUG-9 |
| ISS-10 | 🟡 Düşük | app/page.tsx tek bileşen (1850 satır); kalan any kullanımları taranmalı | issue.md v2: BUG-9, BUG-10 |
| ISS-11 | 🟠 Orta | CI'a lint ve npm audit ekle; güvenlik kodu için test yaz | issue.md v2: DOC-2, DOC-4 · Eski rapor: BUG-14 |
| ISS-12 | 🟠 Orta | ai@4 ve @ai-sdk/* zincirini yükselt (jsondiffpatch, provider-utils advisory'leri) | issue.md v2: DEP-1 · Eski rapor: SEC-9, DEP-3 |
| ISS-13 | 🟠 Orta | Next 16 geçişi (gömülü postcss) ve ESLint 9 / next lint göçü | issue.md v2: DEP-2, DEP-3 · Eski rapor: SEC-1, DEP-6 |

### ISS-01 🔴 [Güvenlik] SSRF filtresi (isBlockedUrl) IPv6, DNS ve metadata adreslerinde bypass ediliyor

**Etiketler:** `security`, `priority:high` · **Kapsadığı kimlikler:** issue.md v2: SEC-1 · Eski rapor: BUG-13 (README iddiası)

#### Özet
`isBlockedUrl` (`lib/security.ts`) yalnızca hostname metnine bakıyor; DNS çözümlemesi yapmıyor ve IPv6 kapsamı eksik. Bu yüzden Open-Notebook MCP proxy'si (`app/api/mcp/open-notebook/route.ts`) iç ağ ve cloud metadata adreslerine yönlendirilebiliyor.

#### Yapılmış olanlar (doğru)
- `mcp_call` için method allow-list'i
- `encodeURIComponent(notebookId)`
- Tüm fetch çağrılarında `redirect: 'error'`

#### Bypass testleri
Varsayılan ayarlarla (`ALLOW_PRIVATE_IPS` tanımsız) izole test sonuçları:

| Girdi | Sonuç | Neden |
|---|---|---|
| `http://[::1]:5055` | ALLOW | `URL.hostname` `[::1]` (köşeli parantezli) döndürüyor, `'::1'` karşılaştırması eşleşmiyor |
| `http://[::ffff:127.0.0.1]` | ALLOW | IPv4-mapped IPv6 kontrol edilmiyor |
| `http://[fe80::1]`, `http://[fc00::1]` | ALLOW | IPv6 link-local ve ULA yok |
| `http://[fd00:ec2::254]` | ALLOW | AWS IPv6 metadata |
| `http://127.0.0.1.nip.io`, `http://localtest.me` | ALLOW | DNS ile loopback'e çözülüyor |
| `http://host.docker.internal:5055`, `*.internal` | ALLOW | `.env.example` Ollama için bunu öneriyor; Docker'da host servisleri açık |
| `http://100.100.100.200` | ALLOW | Alibaba Cloud metadata |
| `http://168.63.129.16` | ALLOW | Azure |
| `http://100.64.0.1` | ALLOW | CGNAT (`100.64.0.0/10`) |
| `http://0.1.2.3` | ALLOW | `0.0.0.0/8` |
| `http://metadata.google.internal./` | ALLOW | Sondaki nokta eşleşmeyi kaçırıyor |

#### Diğer sorunlar
- Metadata listesindeki `162.254.169.254` büyük olasılıkla `169.254.169.254` yazım hatası.
- Yanıt boyutu sınırı yok: `res.json()` tamamını okuyor, 200.000 karakter kesmesi sonradan yapılıyor.
- `mcp_call` yanıtı ham olarak istemciye dönüyor.
- README "SSRF korumalı" diyor; bu madde kapanana kadar iddialı.

#### Yapılacaklar
- [ ] `dns.lookup(host, { all: true })` ile çözülen **tüm** IP'leri kontrol et ve bağlantıyı doğrulanan IP'ye yap (DNS rebinding'e karşı)
- [ ] `ipaddr.js` veya benzeri ile IPv6, IPv4-mapped, loopback, link-local, ULA, CGNAT, `0.0.0.0/8` ve bilinen metadata adreslerini kapsa
- [ ] Hostname'i normalize et (köşeli parantezleri ve sondaki noktayı sil)
- [ ] `162.254.169.254` kaydını düzelt
- [ ] Yanıtı akış (stream) ile okuyup boyut sınırı uygula
- [ ] README ifadesini gerçek duruma göre güncelle

#### Kabul kriterleri
- Yukarıdaki tablonun tamamı için `isBlockedUrl` BLOCK döndüren bir birim testi var ve CI'da çalışıyor.
- Bağlantı, DNS sonrası doğrulanan IP üzerinden kuruluyor.
- `ALLOW_PRIVATE_IPS` / `OPEN_NOTEBOOK_ALLOW_LIST` bilinçli olarak ayarlandığında beklenen adresler çalışmaya devam ediyor (bkz. ISS-03).

### ISS-02 🔴 [Güvenlik] API_ACCESS_TOKEN uçtan uca çalışmıyor; token kapalıyken oturumlar üzerine yazılabiliyor

**Etiketler:** `security`, `priority:high` · **Kapsadığı kimlikler:** issue.md v2: SEC-2, SEC-10 · Eski rapor: SEC-3

#### Özet
Tüm API uç noktalarına `verifyApiToken` eklendi, ancak mekanizma kullanılabilir durumda değil ve varsayılan olarak kapalı.

#### Sorunlar
- `API_ACCESS_TOKEN` tanımlı değilse tüm uç noktalar **açık** (varsayılan davranış).
- Değişken `.env.example`, `docker-compose.yml` ve README'de **yok**; compose'a geçirilmediği için Docker'da ayarlanamıyor.
- `app/page.tsx` içindeki dört `fetch` çağrısının hiçbiri token göndermiyor (yalnızca `Content-Type`). Token etkinleştirilirse arayüz tamamen 401 verir.
- Karşılaştırma `===` ile yapılıyor, sabit zamanlı değil.
- `/api/consensus` `allowOverwrite: true` ile kaydediyor ve `GET /api/sessions` tüm ID'leri listeliyor. Token kapalıyken (varsayılan) herkes ID'leri listeleyip herhangi bir oturumun içeriğini değiştirebilir.
- `saveSession` içinde `getSessionById` kontrolü ile yazma aynı transaction'da değil (TOCTOU, düşük risk).

#### Yapılacaklar
- [ ] `API_ACCESS_TOKEN` değişkenini `.env.example`, `docker-compose.yml` ve README'ye ekle
- [ ] Arayüzde token ayarı ekle; istekler `Authorization: Bearer ...` ile gitsin (veya aynı-origin için oturum çerezi / middleware)
- [ ] `crypto.timingSafeEqual` kullan
- [ ] `NODE_ENV=production` iken token yoksa uyarı logla veya başlatmayı reddet
- [ ] `/api/consensus` içinde `allowOverwrite: true` kullanımını gözden geçir (sahiplik modeli veya token zorunluluğu)
- [ ] `saveSession` kontrol ve yazma adımlarını tek transaction içinde yap

#### Kabul kriterleri
- Token ayarlıyken arayüz çalışıyor, token'sız istekler 401 alıyor.
- Token yokken production'da net bir uyarı/hata var.
- Token kapalıyken oturum üzerine yazma riski belgelenmiş veya kapatılmış.

### ISS-03 🟠 [Hata] Open-Notebook varsayılan olarak çalışmıyor (özel ağ engeli belgelenmemiş) ve test eylemi yanlış pozitif veriyor

**Etiketler:** `bug`, `documentation`, `priority:medium` · **Kapsadığı kimlikler:** issue.md v2: BUG-11, BUG-12

#### Özet
SSRF korumasıyla birlikte özel ağ adresleri varsayılan olarak engellenmeye başlandı, ancak bunun nasıl açılacağı hiçbir yerde belgelenmedi. Ayrıca bağlantı testi yanlış pozitif veriyor.

#### Sorunlar
- `192.168.x.x`, `10.x` ve `172.16.0.0/12` varsayılan olarak engelleniyor. Arayüzdeki ve MCP şemasındaki örnek adres (`http://192.168.1.50:5055`) artık reddediliyor.
- Çözüm için `ALLOW_PRIVATE_IPS` veya `OPEN_NOTEBOOK_ALLOW_LIST` gerekiyor; ikisi de `.env.example`, `docker-compose.yml` ve README'de **yok**.
- `ALLOW_PRIVATE_IPS=true` loopback dahil tüm özel ağları açıyor. Allow-list yalnızca hostname eşleştiriyor; `host:port` veya CIDR desteği yok.
- MCP `test` eyleminde `/mcp` için `mcpTest.ok || mcpTest.status < 500` olan her yanıt (401, 403, 404 dahil) "bağlantı başarılı" sayılıyor.

#### Yapılacaklar
- [ ] Her iki değişkeni `.env.example`, `docker-compose.yml` ve README'de belgele
- [ ] Engellenen adreslerde arayüz hata mesajı çözüm yolunu göstersin (örn. sunucu yöneticisi `OPEN_NOTEBOOK_ALLOW_LIST` ayarlamalı)
- [ ] Allow-list'i `host:port` ve CIDR destekleyecek şekilde genişlet
- [ ] `test` eyleminde yalnızca 2xx (veya geçerli JSON-RPC yanıtı) başarılı sayılsın; 401/403 ayrı hata olarak dönsün
- [ ] Dokümantasyondaki örnek adresi güncelle

#### Kabul kriterleri
- Belgelenmiş yapılandırma ile yerel ağdaki bir Open-Notebook'a bağlanılabiliyor.
- 401/404 dönen bir sunucu için "bağlantı başarılı" gösterilmiyor.

### ISS-04 🟠 [Güvenlik] CSP script-src içinde 'unsafe-inline' duruyor; HSTS preload ve dev modu doğrulanmalı

**Etiketler:** `security`, `priority:medium` · **Kapsadığı kimlikler:** issue.md v2: SEC-5 · Eski rapor: SEC-5, SEC-10

#### Özet
`next.config.mjs` içinde `unsafe-eval` kaldırıldı ve HSTS eklendi; ancak CSP hâlâ zayıf.

#### Sorunlar
- `script-src` içinde `'unsafe-inline'` var; XSS'e karşı etkisi sınırlı. `'unsafe-inline'` açıkken localStorage'daki API anahtarları (bkz. ISS-07) riski artıyor.
- **Doğrulanmadı:** Next.js dev modunda React `eval` kullandığı için `unsafe-eval` olmadan `npm run dev` bozulabilir. Denenmesi gerekiyor.
- HSTS değeri `max-age=63072000; includeSubDomains; preload`. Preload listesine girilirse geri dönüş zor; yerel/HTTP kullanımda etkisi yok ama başka alt alan adlarını etkileyebilir.

#### Yapılacaklar
- [ ] Nonce tabanlı CSP (middleware) ile `'unsafe-inline'`'ı kaldır
- [ ] Dev ortamında `unsafe-eval`'i koşullu ekle (`NODE_ENV !== 'production'`)
- [ ] HSTS'ten `preload`'u kaldır ve `includeSubDomains` ihtiyacını gözden geçir

#### Kabul kriterleri
- `npm run dev` ve production build tarayıcıda CSP ihlali olmadan çalışıyor.
- Production CSP'de `unsafe-inline` ve `unsafe-eval` yok.

### ISS-05 🟡 [Güvenlik] Rate limit x-forwarded-for başlığına güveniyor ve anonim kovayı paylaşıyor

**Etiketler:** `security`, `priority:low` · **Kapsadığı kimlikler:** issue.md v2: SEC-4

#### Özet
Rate limit iyileştirildi (yol bazlı anahtar, süresi dolan kayıtların temizlenmesi, sessions ve MCP uç noktalarına uygulanması) ancak istemci kimliği hâlâ güvenilmeyen başlıktan geliyor.

#### Sorunlar
- `x-forwarded-for` doğrudan güveniliyor; her istekte değiştirilerek limit aşılabilir.
- Başlık yoksa herkes `anonymous` kovasını paylaşıyor.
- Bellek içi olduğu için çok instance'lı çalışmada etkisiz.

#### Yapılacaklar
- [ ] `x-forwarded-for` yalnızca güvenilir proxy arkasında kullanılsın (ayarlanabilir)
- [ ] Token varsa token bazlı kota düşün (bkz. ISS-02)
- [ ] Çok instance'lı dağıtım için sınırlamayı belgele

#### Kabul kriterleri
- Başlık sahteciliği ile limit aşılamıyor (güvenilir proxy yapılandırması yoksa başlık yok sayılıyor).

### ISS-06 🟡 [Güvenlik] MCP route'u hata mesajlarını ham olarak istemciye döndürüyor

**Etiketler:** `security`, `priority:low` · **Kapsadığı kimlikler:** issue.md v2: SEC-8 · Eski rapor: SEC-4

#### Özet
`sanitizeErrorMessage` iyileşti (Gemini anahtarı, `localhost`, `127.0.0.1`, `host.docker.internal` maskeleniyor) ama MCP route'unda kullanılmıyor.

#### Sorunlar
- `app/api/mcp/open-notebook/route.ts` içinde `err.message` doğrudan istemciye gidiyor (örn. `Open-Notebook adresine ulaşılamadı (${errMsg})`); iç adresler sızabilir.
- Maskeleme `sk-` desenini çok geniş yakalıyor (örn. `disk-space` içindeki `sk-space` eşleşir).

#### Yapılacaklar
- [ ] MCP route'unda genel hata mesajı dön, ayrıntıyı sunucuda logla
- [ ] Anahtar desenlerini sınırla (`\bsk-...`)

#### Kabul kriterleri
- İç adres veya anahtar içeren hata metni istemciye dönmüyor (test ile doğrulanıyor).

### ISS-07 🟡 [Güvenlik] API anahtarları tarayıcıda localStorage'da düz metin saklanıyor

**Etiketler:** `security`, `enhancement`, `priority:low` · **Kapsadığı kimlikler:** issue.md v2: SEC-7

#### Özet
Anahtarlar `localStorage`'da düz metin saklanıyor ve her istek gövdesinde gidiyor. `dangerouslySetInnerHTML` kullanılmadığı için doğrudan XSS riski düşük, ancak bir XSS durumunda anahtarlar çalınır; `script-src 'unsafe-inline'` (bkz. ISS-04) bu riski artırıyor. Open-Notebook API anahtarı da aynı şekilde saklanıyor.

#### Yapılacaklar
- [ ] Sunucu tarafı anahtar yönetimini öne çıkar (`.env` ile)
- [ ] Arayüzde anahtarların tarayıcıda saklandığına dair uyarı göster
- [ ] (İsteğe bağlı) "Anahtarı hatırlama" seçeneği ve oturum bazlı saklama (sessionStorage)

#### Kabul kriterleri
- Kullanıcı anahtarın nerede saklandığını arayüzde görüyor ve saklamayı kapatabiliyor.

### ISS-08 🟡 [Hata] Dağıtım güvenilirliği: bind mount izin sorunu, sessionSaved uyarısı ve dar zaman payı

**Etiketler:** `bug`, `priority:low` · **Kapsadığı kimlikler:** issue.md v2: BUG-4, BUG-13

#### Özet
Oturum kaydı hatası artık yanıtta görünüyor (`sessionSaved`), fakat kök nedenler ve arayüz tarafı açık.

#### Sorunlar
- `docker-compose.yml` hâlâ `./data` bind mount kullanıyor. Container'da `nextjs` (uid 1001) yazamazsa oturumlar kaydedilmez; `sessionSaved: false` dönüyor ama arayüz bunu göstermiyor olabilir (doğrulanmadı).
- En kötü durum zaman bütçesi: 20 sn + 18 sn + 20 sn = **58 sn**, `maxDuration = 60`. DB yazma ve ağ gecikmesi için pay yalnızca 2 sn. Self-host için sorun değil; sunucusuz platformlarda zaman aşımı riski var.
- (Not) Eski rapordaki `AbortSignal.timeout(28000)` açıklaması koda uymuyor; güncel değerler yukarıdaki gibi.

#### Yapılacaklar
- [ ] Named volume kullan veya sahiplik/izin ayarını belgele
- [ ] Arayüzde `sessionSaved === false` ise uyarı göster
- [ ] Toplam bütçeyi 50-52 sn'ye çek veya `maxDuration`'ı artır

#### Kabul kriterleri
- Docker compose ile ilk çalıştırmada oturumlar kaydediliyor; kaydedilemezse kullanıcı uyarılıyor.
- Worst-case toplam süre `maxDuration` değerinin anlamlı şekilde altında.

### ISS-09 🟡 [Hata] Model katalogları ve varsayılanlar güncel mi doğrulanmalı

**Etiketler:** `bug`, `priority:low` · **Kapsadığı kimlikler:** issue.md v2: BUG-8 · Eski rapor: BUG-9

#### Özet
`lib/config/agents.ts` PR #12'de değişmedi. Eski raporda "güncel katalogları eklendi" deniyor; bu incelemede sağlayıcı dokümanlarına karşı doğrulanmadı.

#### Sorun
`gemini-1.5-*`, `claude-3-5-*`, `claude-3-7-*`, `o1-mini` gibi modellerin bir kısmı sağlayıcılar tarafından emekli edilmiş veya edilmek üzere olabilir (sağlayıcı dokümanlarından doğrulanmalı). Varsayılan konfigürasyon bunlara dayanıyor.

#### Yapılacaklar
- [ ] Her sağlayıcının güncel model listesine göre kataloğu ve varsayılanları gözden geçir
- [ ] Emekli model için kullanıcıya anlaşılır hata mesajı ver
- [ ] Katalog tarihini veya kaynağını dosyada not et (özel model girişi zaten mevcut)

#### Kabul kriterleri
- Varsayılan ajanlar güncel modellerle ilk denemede çalışıyor.

### ISS-10 🟡 [Refactor] app/page.tsx tek bileşen (1850 satır); kalan any kullanımları taranmalı

**Etiketler:** `refactor`, `priority:low` · **Kapsadığı kimlikler:** issue.md v2: BUG-9, BUG-10

#### Özet
`app/page.tsx` ayarlar, oturum listesi, MCP paneli ve pipeline arayüzünü tek bileşende topluyor; bakım ve test zor. `page.tsx` ve MCP route'unda `any` kullanımları temizlendi, ancak tüm depo taranmadı.

#### Yapılacaklar
- [ ] Bileşenlere ve hook'lara böl (SettingsModal, SessionSidebar, StageTabs, `useLocalSettings`)
- [ ] Kalan `any` kullanımlarını `grep` ile tara ve `unknown` + daraltma / Zod ile değiştir
- [ ] Harici yanıtlar (Open-Notebook) için Zod şeması ekle

#### Kabul kriterleri
- `page.tsx` belirgin biçimde küçülmüş, davranış değişmemiş; `tsc` ve lint temiz.

### ISS-11 🟠 [Test/CI] CI'a lint ve npm audit ekle; güvenlik kodu için test yaz

**Etiketler:** `testing`, `priority:medium` · **Kapsadığı kimlikler:** issue.md v2: DOC-2, DOC-4 · Eski rapor: BUG-14

#### Özet
CI artık Node 22 ile `npm ci --ignore-scripts`, `npm run typecheck` ve `npm test` çalıştırıyor. Mevcut 5 test yalnızca `utils` ve `types` kapsıyor.

#### Eksikler
- CI'da `lint` ve `npm audit --audit-level=high` yok.
- `lib/security.ts` (SSRF, rate limit, token), engine bütçesi ve API route'ları için test yok; ISS-01'deki bypass'ları hiçbir test yakalamıyor.
- Eski raporda "Test ve CI ✅ (build doğrulandı)" deniyor; kalite kapısı bu kadarıyla sınırlı.

#### Yapılacaklar
- [ ] CI'a lint adımı ekle
- [ ] CI'a `npm audit --audit-level=high` ekle (bilinen kabul edilmiş açıklar için not düş)
- [ ] `isBlockedUrl` için tablo tabanlı test (ISS-01 tablosu)
- [ ] `checkRateLimit` ve `verifyApiToken` testleri
- [ ] API route'ları için en az 400/401/429 senaryoları
- [ ] (Opsiyonel) Docker'dan bağımsız `next build` adımı

#### Kabul kriterleri
- PR'larda typecheck, lint, test ve audit çalışıyor; güvenlik modülleri test kapsamında.

### ISS-12 🟠 [Bağımlılık] ai@4 ve @ai-sdk/* zincirini yükselt (jsondiffpatch, provider-utils advisory'leri)

**Etiketler:** `dependencies`, `priority:medium` · **Kapsadığı kimlikler:** issue.md v2: DEP-1 · Eski rapor: SEC-9, DEP-3

#### Özet
`npm audit` 10 açık raporluyor (6 düşük, 2 orta, 2 yüksek); PR #12 sonrasında da değişmedi.

#### Detay
- `jsondiffpatch <=0.7.5` (yüksek): XSS ve prototype pollution. Proje yalnızca sunucuda `generateText` kullandığı için pratik etkisi düşük.
- `@ai-sdk/provider-utils <3.0.28`: kontrolsüz kaynak tüketimi. Düzeltme `ai@7` gerektiriyor (breaking).

#### Yapılacaklar
- [ ] `ai` ve `@ai-sdk/*` paketlerini yükselt
- [ ] API değişikliklerine uyum: `LanguageModelV1` → yeni model tipi, `maxTokens` → `maxOutputTokens`, `usage.promptTokens` → `inputTokens`
- [ ] Provider factory'sini (`lib/providers/*`) ve engine'i yeni tiplere göre güncelle
- [ ] `npm audit` sonucunu tekrar al

#### Kabul kriterleri
- `jsondiffpatch` ve `provider-utils` advisory'leri kapanmış; typecheck, test ve elle çalıştırma temiz.

### ISS-13 🟠 [Bağımlılık] Next 16 geçişi (gömülü postcss) ve ESLint 9 / next lint göçü

**Etiketler:** `dependencies`, `priority:medium` · **Kapsadığı kimlikler:** issue.md v2: DEP-2, DEP-3 · Eski rapor: SEC-1, DEP-6

#### Özet
`next` içindeki gömülü `postcss` yüksek önemli advisory'ler taşıyor; ESLint 8 EOL ve `next lint` Next 16'da kaldırılıyor (CLI her çalıştırmada uyarı veriyor).

#### Detay
- Düzeltme Next 16.3.x gerektiriyor (breaking). Yalnızca derleme zamanı CSS işlemeyle ilgili, çalışma zamanı riski düşük.
- `eslint@8.57.1` desteklenmiyor.

#### Yapılacaklar
- [ ] Next 16'ya geçişi planla ve uygula (geçici çözüm olarak `overrides` ile postcss sürümü denenebilir; denenmedi)
- [ ] ESLint 9 + flat config'e geç: `npx @next/codemod@canary next-lint-to-eslint-cli .`
- [ ] CI lint adımını yeni CLI'ya taşı (bkz. ISS-11)

#### Kabul kriterleri
- `npm audit` çıktısında `next`/`postcss` kaynaklı yüksek önemli açık yok; lint `next lint` olmadan çalışıyor.

---

## Çözülenler (doğrulandı)

- ✅ Sessions girdi doğrulaması: `CreateSessionSchema` (UUID, boyut sınırları); aynı ID'ye yazma `allowOverwrite` olmadan 409 dönüyor.
- ✅ Prompt-injection kaçışı: tüm `<` `>` kaçışlanıyor, sıfır genişlikli karakterler siliniyor, tam genişlikli `＜＞` normalize ediliyor; birim testleri var.
- ✅ `data/consensus.db*` dosyaları git takibinden çıkarıldı (`.gitignore` ile uyumlu).
- ✅ Zaman bütçesi: hakeme 20 sn garanti (en kötü durum 20 + 18 + 20 = 58 sn).
- ✅ Sessiz yedek ajanlar kaldırıldı; geçersiz konfigürasyon artık hata veriyor.
- ✅ Ajan ID benzersizliği ve `referee` ID rezervasyonu zorunlu (`superRefine`).
- ✅ `sessionSaved` alanı eklendi; DB kayıt hatası artık yanıtta görünüyor.
- ✅ İstemci tarafı konfigürasyon `ConfigStateSchema` ile doğrulanıyor.
- ✅ Zod `.errors` yerine `.issues` kullanılıyor.
- ✅ `APP_URL` compose'a eklendi.
- ✅ `@types/better-sqlite3` devDependencies'e taşındı, `@types/node ^22`, `engines`, `typecheck` ve `test` script'leri, `react ^19`.
- ✅ README dizin ağacı güncellendi.
- ✅ Rate limit: yol bazlı anahtar, süresi dolan kayıtların temizlenmesi, sessions ve MCP uç noktalarına da uygulandı.
- ✅ MCP proxy: `mcp_call` method allow-list'i, `encodeURIComponent(notebookId)`, `redirect: 'error'`.
- ✅ CI: Node 22 + `npm ci --ignore-scripts` + `typecheck` + `test`.

---

## Eski rapor ile uzlaştırma

Önceki raporda tamamı ✅ görünen maddelerin güncel durumu:

| Eski ID | Başlık | Eski | Güncel | Not |
|---|---|---|---|---|
| SEC-1 | Next.js/React kritik açıkları | ✅ | 🟡 | Sürüm güncellendi; gömülü postcss advisory'si açık → ISS-13 |
| SEC-2 | API anahtarları sunucu fallback desteği | ✅ | ✅ | Çelişen bulgu yok |
| SEC-3 | Kimlik doğrulama / rate limit / boyut sınırı | ✅ | 🟡 | Zod ve boyut sınırları tamam; kimlik doğrulama opsiyonel ve arayüz token göndermiyor → ISS-02, ISS-05 |
| SEC-4 | Girdi doğrulaması ve hata mesajı sızıntısı | ✅ | 🟡 | MCP route'unda ham hata mesajı → ISS-06 |
| SEC-5 | Güvenlik başlıkları | ✅ | 🟡 | HSTS eklendi; CSP hâlâ zayıf → ISS-04 |
| SEC-6 | Prompt injection | ✅ | ✅ | `sanitizeXmlData` tüm `<` `>` karakterlerini kaçışlıyor, testli (PR #12) |
| SEC-7 | .env ve ignore dosyaları | ✅ | ✅ | `data/*.db` git takibinden çıkarıldı (PR #12) |
| SEC-8 | Docker/Compose sertleştirme | ✅ | ❔ | Bu incelemede yeniden doğrulanmadı; compose'ta `APP_URL` eklendi, bind mount hâlâ var → ISS-08 |
| SEC-9 | Geçişli bağımlılık advisory'leri | ✅ | 🟡 | `npm audit`: 10 açık → ISS-12, ISS-13 |
| SEC-10 | CSP sıkılaştırma | ✅ | 🟡 | `connect-src 'self'` doğru; `script-src 'unsafe-inline'` duruyor → ISS-04 |
| BUG-1 | Hakem hatası tüm yanıtları kaybettiriyor | ✅ | ✅ | Çelişen bulgu yok |
| BUG-2 | Dockerfile `public*` COPY hatası | ✅ | ✅ | Çelişen bulgu yok |
| BUG-3 | Hakem istemi hafızayı içermiyor | ✅ | ✅ | Çelişen bulgu yok |
| BUG-4 | Hata metni hakeme yanıt olarak veriliyor | ✅ | ✅ | Çelişen bulgu yok |
| BUG-5 | İstemci `res.ok` kontrol etmiyor | ✅ | ✅ | Çelişen bulgu yok |
| BUG-6 | Zaman aşımı / iptal / retry | ✅ | ✅ | Mekanizma var; açıklamadaki 28000 ms koda uymuyor (güncel: 20/18/20 sn, toplam 58 sn) → ISS-08 |
| BUG-7 | localStorage korumasız | ✅ | ✅ | İstemci config'i artık Zod ile doğrulanıyor (PR #12) |
| BUG-8 | "Özel Model Gir..." işlevsiz | ✅ | ✅ | Çelişen bulgu yok |
| BUG-9 | Model listeleri ve varsayılanlar eskimiş | ✅ | ❔ | Sağlayıcı dokümanlarına karşı doğrulanmadı → ISS-09 |
| BUG-10 | `navigator.clipboard` hatası | ✅ | ✅ | Çelişen bulgu yok |
| BUG-11 | Hakem isteminde yazım hatası | ✅ | ✅ | Çelişen bulgu yok |
| BUG-12 | Erişilebilirlik ve UX | ✅ | ✅ | Çelişen bulgu yok |
| BUG-13 | Dokümantasyon uyumsuzluğu | ✅ | ✅ | README ağacı güncellendi (PR #12); "SSRF korumalı" ifadesi ISS-01 ile birlikte düzeltilmeli |
| BUG-14 | Test ve CI altyapısı | ✅ | 🟡 | CI artık typecheck + test çalıştırıyor; lint, audit ve güvenlik testleri yok → ISS-11 |
| BUG-15 | Hakem yedek mantığı | ✅ | ✅ | Çelişen bulgu yok |
| BUG-16 | Yükleme sınırı ile sunucu sınırı uyuşmuyor | ✅ | ✅ | Çelişen bulgu yok |
| DEP-1 | ESLint eksik | ✅ | ✅ | ESLint mevcut; sürüm sorunu DEP-3/DEP-6 altında |
| DEP-2 | Eklenmesi gereken paketler | ✅ | ✅ | Çelişen bulgu yok |
| DEP-3 | Eskimiş bağımlılıklar | ✅ | 🟡 | `ai@4`, `next` postcss, ESLint 8 → ISS-12, ISS-13 |
| DEP-4 | `package.json` yapılandırma eksikleri | ✅ | ✅ | `engines`, `typecheck`, `test` eklendi; `@types/*` düzeltildi (PR #12) |
| DEP-5 | Kullanılmayan bağımlılık kontrolü | ℹ️ | ℹ️ | Kullanılmayan paket bulunmadı |
| DEP-6 | ESLint yanlış bölümde ve eski sürüm | ✅ | 🟡 | `devDependencies`'te; ancak ESLint 8 EOL → ISS-13 |

---

## Önerilen sıra

1. **ISS-01, ISS-02:** SSRF filtresi (DNS + IPv6) ve token'ın uçtan uca çalıştırılması
2. **ISS-03:** Open-Notebook özel ağ yapılandırması ve test eylemi
3. **ISS-04, ISS-11:** CSP nonce, CI'a lint/audit ve güvenlik testleri
4. **ISS-12, ISS-13:** `ai` SDK, Next 16 ve ESLint 9 yükseltmeleri
5. **ISS-05…ISS-10:** rate limit, hata mesajları, anahtar saklama, dağıtım güvenilirliği, model kataloğu, `page.tsx` bölme
