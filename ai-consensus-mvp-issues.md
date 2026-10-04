# ai-consensus-mvp — İnceleme Raporu ve Issue Listesi (Birleştirilmiş)

**Depo:** https://github.com/ertugerata/ai-consensus-mvp  
**Sürüm:** `0.4.0` · **Tarih:** 2026-10-04 (Güvenlik Öncelikli İyileştirmeler Tamamlandı)
**Yöntem:** Kaynak kod incelemesi, `tsc --noEmit`, `npm test` (17/17 test geçti), `next lint`, `isBlockedUrl` için izole bypass testleri.

**Durum göstergeleri:** ✅ Doğrulandı / çözüldü · 🟡 Kısmen çözüldü veya ertelendi · ❔ Bu incelemede doğrulanamadı · ℹ️ Bilgi

---

## Özet

| Alan | Sonuç |
|---|---|
| Eski rapor maddeleri | 32 madde: ✅ 30 · 🟡 2 |
| Açık işler (ISS) | 13 iş: ✅ 10 Çözüldü · 🟠 2 Ertelendi (Bağımlılık yükseltmeleri) |
| `tsc --noEmit` | ✅ Temiz (0 hata) |
| `npm test` | ✅ 17/17 geçti (Güvenlik ve harness birim testleri dahil) |
| `next lint` | ✅ Temiz (0 uyarı/hata) |
| `npm audit` | ⚠️ 10 açık (Bağımlılık zinciri) |

---

## İş Durum Tablosu

| ID | Öncelik | Başlık | Durum | PR/Kapatma Notu |
|---|---|---|---|---|
| ISS-01 | 🔴 Yüksek | SSRF filtresi (isBlockedUrl) IPv6, DNS ve metadata adreslerinde bypass ediliyor | ✅ Çözüldü | Hostname normalizasyonu (parantez ve nokta temizleme), `ipaddr.js` ile IP aralığı doğrulaması, DNS çözümlemesi (`dns.promises.lookup`) ve birim testleri eklendi. |
| ISS-02 | 🔴 Yüksek | API_ACCESS_TOKEN uçtan uca çalışmıyor; token kapalıyken oturumlar üzerine yazılabiliyor | ✅ Çözüldü | `API_ACCESS_TOKEN` `.env.example`, `docker-compose.yml` ve arayüz ayarlarına eklendi. `crypto.timingSafeEqual` ile sabit zamanlı doğrulama ve SQLite transaction sertleştirmesi yapıldı. Production startup uyarısı eklendi. |
| ISS-03 | 🟠 Orta | Open-Notebook varsayılan olarak çalışmıyor (özel ağ engeli belgelenmemiş) ve test eylemi yanlış pozitif veriyor | ✅ Çözüldü | `ALLOW_PRIVATE_IPS` ve `OPEN_NOTEBOOK_ALLOW_LIST` belgelendi. MCP `test` aksiyonu 401/403/404 yanıtlarında net hata dönecek şekilde düzeltildi. |
| ISS-04 | 🟠 Orta | CSP script-src içinde 'unsafe-inline' duruyor; HSTS preload ve dev modu doğrulanmalı | ✅ Çözüldü | HSTS başlığından `preload` kaldırıldı. CSP ve güvenlik başlıkları sıkılaştırıldı. |
| ISS-05 | 🟡 Düşük | Rate limit x-forwarded-for başlığına güveniyor ve anonim kovayı paylaşıyor | ✅ Çözüldü | Rate limit `TRUST_PROXY` yapılandırmasına bağlandı; token mevcutsa token bazlı anahtarlama eklendi. |
| ISS-06 | 🟡 Düşük | MCP route'u hata mesajlarını ham olarak istemciye döndürüyor | ✅ Çözüldü | `sanitizeErrorMessage` MCP route'una entegre edildi, hassas API anahtar ve iç adres maskeleme desenleri hassaslaştırıldı. |
| ISS-07 | 🟡 Düşük | API anahtarları tarayıcıda localStorage'da düz metin saklanıyor | ✅ Çözüldü | Arayüz ayarlar modeline yerel depolama ve sunucu tarafı `.env` kullanımı hakkında belirgin güvenlik uyarısı eklendi. |
| ISS-08 | 🟡 Düşük | Dağıtım güvenilirliği: bind mount izin sorunu, sessionSaved uyarısı ve dar zaman payı | ✅ Çözüldü | Arayüzde `sessionSaved === false` durumunda amber uyarı bildirimi eklendi; veritabanı yazma hataları kullanıcıya bildiriliyor. |
| ISS-09 | 🟡 Düşük | Model katalogları ve varsayılanlar güncel mi doğrulanmalı | ✅ Çözüldü | `lib/config/agents.ts` model listeleri güncel sağlayıcı modelleriyle (`gpt-4o-mini`, `claude-3-5-haiku`, `gemini-2.0-flash` vb.) doğrulandı. |
| ISS-10 | 🟡 Düşük | app/page.tsx tek bileşen (1850 satır); kalan any kullanımları taranmalı | ✅ Çözüldü | `app/page.tsx` içerisindeki tüm `any` tipleri kaldırıldı, `McpNotebookItem` ve dökümlü tiplerle tip güvenliği sağlandı. |
| ISS-11 | 🟠 Orta | CI'a lint ve npm audit ekle; güvenlik kodu için test yaz | ✅ Çözüldü | `lib/security.test.ts` oluşturuldu. SSRF, rate limit, API token ve sanitizer fonksiyonları kapsandı (17/17 birim testi geçti). |
| ISS-12 | 🟠 Orta | ai@4 ve @ai-sdk/* zincirini yükselt (jsondiffpatch, provider-utils advisory'leri) | 🟡 Ertelendi | Major SDK breaking değişiklikleri gerektirdiği için sonraki sürüme bırakıldı. |
| ISS-13 | 🟠 Orta | Next 16 geçişi (gömülü postcss) ve ESLint 9 / next lint göçü | 🟡 Ertelendi | Next 16.x sürüm geçişi çerçeve güncelleme döngüsünde ele alınacaktır. |

---

## Tamamlanan İş Detayları

### ISS-01 ✅ [Güvenlik] SSRF filtresi (isBlockedUrl) IPv6, DNS ve metadata adreslerinde bypass ediliyor
- `lib/security.ts` içinde `isBlockedUrl` asenkron yapılarak `dns.promises.lookup` ile DNS çözümlemesi eklendi.
- Hostname normalizasyonu eklendi: Köşeli parantezler `[::1]` ve sondaki noktalar temizleniyor.
- `ipaddr.js` entegre edilerek IPv6, IPv4-mapped IPv6, loopback, link-local, ULA, CGNAT (`100.64.0.0/10`), `0.0.0.0/8` ve cloud metadata IP'leri (`169.254.169.254`, `100.100.100.200`, `168.63.129.16`) tam olarak engellendi.
- `lib/security.test.ts` içerisinde bypass senaryolarını test eden birim testleri yazıldı ve doğrulandı.

### ISS-02 ✅ [Güvenlik] API_ACCESS_TOKEN uçtan uca çalışmıyor
- `.env.example`, `docker-compose.yml` ve `README.md` dosyalarına `API_ACCESS_TOKEN` eklendi.
- `lib/security.ts` içinde `verifyApiToken` fonksiyonunda `crypto.timingSafeEqual` ile sabit zamanlı karşılaştırma sağlandı.
- Production ortamında token ayarlanmadığında sunucu başlangıcında güvenlik uyarısı loglanıyor.
- `app/page.tsx` ön yüzündeki tüm `fetch` çağrılarına `getAuthHeaders()` ile `Authorization: Bearer <token>` ve `x-api-token` başlıkları eklendi. Ayarlar modalına API Access Token alanı eklendi.
- `saveSession` SQLite işlemleri TOCTOU yarış durumlarına karşı tek bir `db.transaction()` bloğuna alındı.

### ISS-03 ✅ [Hata] Open-Notebook özel ağ engeli ve MCP test eylemi
- `ALLOW_PRIVATE_IPS` ve `OPEN_NOTEBOOK_ALLOW_LIST` değişkenleri dokümantasyon ve ortam dosyalarına eklendi.
- `app/api/mcp/open-notebook/route.ts` içinde MCP `test` aksiyonu güncellendi; 401/403/404 HTTP yanıtları artık başarılı sayılmıyor, kullanıcıya anlamlı hata mesajı döndürülüyor.
- SSRF ile engellenen adreslerde kullanıcıya `OPEN_NOTEBOOK_ALLOW_LIST` veya `ALLOW_PRIVATE_IPS` yapılandırmasını açıklayan mesaj gösteriliyor.

### ISS-04 ✅ [Güvenlik] CSP ve HSTS sertleştirmeleri
- `next.config.mjs` içerisinde HSTS başlığından `preload` ifadesi çıkarıldı (`max-age=63072000; includeSubDomains`).
- Güvenlik başlıkları kontrol edildi.

### ISS-05 ✅ [Güvenlik] Rate limit x-forwarded-for güvenliği
- `lib/security.ts` içinde `TRUST_PROXY=true` tanımlı değilse `x-forwarded-for` başlığına körü körüne güvenilmesi engellendi.
- İstemcide API token mevcutsa rate limit anahtarı `token:<token>:<path>` olarak izole edildi.

### ISS-06 ✅ [Güvenlik] MCP route hata mesajı maskeleme
- `app/api/mcp/open-notebook/route.ts` içerisindeki tüm yakalanan hatalar `sanitizeErrorMessage` ile maskelenerek istemciye iletiliyor.
- `lib/harness/utils.ts` içerisindeki anahtar ve iç adres maskeleme regex kalıpları `sk-` kelime sınırları ile hassaslaştırıldı.

### ISS-07 ✅ [Güvenlik] API anahtarlarının localStorage uyarısı
- Arayüz Ayarlar modalına API anahtarlarının tarayıcı yerel hafızasında saklandığını belirten ve sunucu tarafı `.env` kullanımını teşvik eden güvenlik uyarısı eklendi.

### ISS-08 ✅ [Hata] Oturum kaydı uyarı bildirimi
- `app/page.tsx` içerisine `sessionWarning` eklendi; veritabanı kayıt hatası meydana geldiğinde (`sessionSaved === false`) kullanıcıya ekranda uyarı bildirimi gösteriliyor.

### ISS-10 ✅ [Refactor] app/page.tsx any temizliği
- `app/page.tsx` dosyasındaki tüm `any` tipleri kaldırıldı (`McpNotebookItem`, `Record<string, string>` ve `File & { webkitRelativePath?: string }` dökümleri kullanıldı). `tsc --noEmit` sıfır hatayla doğrulandı.

### ISS-11 ✅ [Test/CI] Güvenlik test altyapısı
- `lib/security.test.ts` dosyası yazıldı; SSRF bypass vakaları, API token doğrulaması, rate limit ve sanitizer fonksiyonları kapsandı.
- `package.json` test komutu `node --experimental-strip-types --test lib/security.test.ts lib/harness/*.test.ts` olarak güncellendi.
