# AI Multi-Agent Harness & Consensus Suite

Bu proje, **Next.js 15 (App Router)**, **Tailwind CSS**, **TypeScript** ve **Vercel AI SDK** mimarisi üzerinde çalışan; OpenRouter, OpenAI, Anthropic, Google Gemini ve yerel **Ollama** modellerini destekleyen modüler bir **Multi-Agent Debate & Consensus Harness** sistemidir.

---

## 🚀 Öne Çıkan Özellikler

- **Çok Aşamalı İş Akışı (Multi-Stage Debate Workflow):**
  - **Aşama 1 (Divergence):** Yapılandırılmış tüm ilk aşama ajanlarının soruyu bağımsız olarak yanıtlaması.
  - **Aşama 2 (Cross-Review / Critique):** Ajanların hem kendi Aşama 1 yanıtlarını hem de diğer ajanların yanıtlarını inceleyip yapıcı eleştiri sunması.
  - **Aşama 3 (Synthesis / Aggregation):** Hakem (Judge) ajanın tüm girdi ve eleştirileri değerlendirip nihai konsensüs raporunu oluşturması.
- **Genişletilebilir Provider ve Model Soyutlama Katmanı:**
  - **OpenRouter Entegrasyonu:** Claude 3.7 Sonnet, DeepSeek-R1, Llama 3.3, Gemini 2.0 Flash vb. yüzlerce modele tek noktadan erişim.
  - **Yerel Model Desteği (Ollama):** Sunucu tarafı `OLLAMA_BASE_URL` konfigürasyonu ile SSRF korumalı yerel model entegrasyonu.
  - **Doğrudan Sağlayıcılar:** OpenAI, Anthropic, Google Gemini.
- **Dinamik Ajan Yapılandırması:**
  - Her ajan için bağımsız Sistem İstemi (System Prompt), Sıcaklık (Temperature), Sağlayıcı ve Model seçimi.
- **Harici Hafıza (Memory) ve Kriter Desteği:**
  - Ajanlara bağlam veya doküman aktarımı (`.txt`, `.md`, `.json`, `.csv`, `.py`, `.ts` yükleme ve indirme desteği), Open-Notebook MCP entegrasyonu ve özel çalışma kuralları tanımlama.
- **Güvenlik Sertleştirmeleri:**
  - **SSRF Koruması (isBlockedUrl):** `dns.promises.lookup` ile DNS çözümlemesi, IPv6, loopback, link-local, ULA, CGNAT, private IP aralıkları (`ipaddr.js`) ve bulut metadata adreslerinin (`169.254.169.254`, `metadata.google.internal`) tespiti ve engellenmesi.
  - **API Token Doğrulaması (API_ACCESS_TOKEN):** Sabit zamanlı karşılaştırma (`crypto.timingSafeEqual`) ve hem `Authorization: Bearer` hem de `x-api-token` başlık desteği.
  - **Zod Tip & Girdi Doğrulaması:** Tüm istekler `lib/types.ts` Zod şemaları ile doğrulanır.
  - **API Rate Limit:** Yol ve IP/Token bazlı akıllı kota sınırlaması.
  - **Prompt Injection Directives:** Kaçışlanmış XML verileri ve Sistem İstemi düzeyinde `SYSTEM_SECURITY_DIRECTIVE` koruması.

---

## 🔒 Ortam Değişkenleri (Environment Variables)

| Değişken | Açıklama | Varsayılan |
|---|---|---|
| `API_ACCESS_TOKEN` | Tüm API uç noktaları için sistem genelinde zorunlu doğrulama token'ı. | *Boş (İsteğe bağlı)* |
| `ALLOW_PRIVATE_IPS` | Özel ağ ve yerel IP adreslerine (192.168.x, 10.x, 172.16.x, 127.0.0.1) erişime izin verir (`true`/`false`). | `false` |
| `OPEN_NOTEBOOK_ALLOW_LIST` | İzin verilen Open-Notebook host veya `host:port` adreslerinin virgülle ayrılmış listesi. | *Boş* |
| `OLLAMA_BASE_URL` | Sunucu tarafındaki Ollama API adresi. | `http://localhost:11434` |
| `APP_URL` | Uygulama kamu adresi. | `http://localhost:3000` |
| `OPENROUTER_API_KEY` | Sunucu tarafı varsayılan OpenRouter API anahtarı. | *Boş* |
| `OPENAI_API_KEY` | Sunucu tarafı varsayılan OpenAI API anahtarı. | *Boş* |
| `ANTHROPIC_API_KEY` | Sunucu tarafı varsayılan Anthropic API anahtarı. | *Boş* |
| `GEMINI_API_KEY` | Sunucu tarafı varsayılan Google Gemini API anahtarı. | *Boş* |

---

## 📁 Proje Dizin Yapısı

```text
ai-consensus-mvp/
├── app/
│   ├── api/
│   │   ├── consensus/
│   │   │   └── route.ts         # Zod doğrulama, Rate Limit ve Multi-Stage Harness API uç noktası
│   │   ├── mcp/
│   │   │   └── open-notebook/
│   │   │       └── route.ts     # Open-Notebook entegrasyonu için SSRF korumalı MCP Proxy uç noktası
│   │   └── sessions/
│   │       ├── route.ts         # Oturumları SQLite üzerinde listeleme ve kaydetme
│   │       └── [id]/
│   │           └── route.ts     # Oturum detayını getirme ve silme uç noktaları
│   ├── globals.css               # Global Tailwind CSS stilleri
│   ├── layout.tsx                # Kök düzen (Layout)
│   └── page.tsx                  # Execution Pipeline UI ve Ajan Ayarları Ön Yüzü
├── lib/
│   ├── config/
│   │   └── agents.ts             # Varsayılan ajan ayarları ve model katalogları
│   ├── db/
│   │   └── index.ts              # SQLite (better-sqlite3) veritabanı işlemleri ve oturum yönetimi
│   ├── harness/
│   │   ├── engine.ts             # Çok aşamalı (Multi-Stage) tartışma harness motoru
│   │   └── utils.ts              # XML sanitization ve hata temizleme yardımcıları
│   ├── providers/
│   │   ├── anthropic.ts          # Anthropic Provider entegrasyonu
│   │   ├── factory.ts            # Dinamik Provider Fabrikası & API key yönetimi
│   │   ├── google.ts             # Google Gemini Provider entegrasyonu
│   │   ├── ollama.ts             # Yerel Ollama Provider entegrasyonu
│   │   ├── openai.ts             # OpenAI Provider entegrasyonu
│   │   └── openrouter.ts         # OpenRouter Provider entegrasyonu
│   ├── security.ts               # SSRF engelleme, API Token doğrulaması ve Rate Limit yardımcısı
│   ├── security.test.ts          # Güvenlik modülleri birim testleri (18 test)
│   └── types.ts                  # Zod Şemaları, Harness ve Ajan Tip Tanımlamaları
├── public/                       # Statik dosyalar
├── .dockerignore                 # Docker derleme dışı bırakılacak dosyalar
├── .env.example                  # Örnek ortam değişkenleri
├── ai-consensus-mvp-issues.md   # İnceleme ve issue raporu
├── docker-compose.yml            # Docker Compose konfigürasyonu
├── Dockerfile                    # Multi-stage Dockerfile (Node 22 Alpine)
├── LICENSE                       # MIT Lisans belgesi
├── next.config.mjs               # Standalone output ve CSP güvenlik başlıkları
├── package.json                  # Bağımlılıklar ve npm betikleri
├── TODO.md                       # Harness dönüşüm yol haritası
└── tsconfig.json                 # TypeScript konfigürasyonu
```

---

## 🛠️ Kurulum ve Çalıştırma

### Yöntem 1: Docker Compose (Tavsiye Edilen)

Ortam değişkenlerinizi `.env` dosyasına ekleyin (veya `.env.example` dosyasını kopyalayın):
```bash
cp .env.example .env
```

Konteyneri başlatın:
```bash
docker-compose up -d --build
```
Uygulama `http://localhost:3000` adresinde çalışacaktır.

---

### Yöntem 2: Yerel Geliştirme Ortamı (Node.js 22+)

1. **Bağımlılıkları Yükleyin:**
   ```bash
   npm ci
   ```

2. **Geliştirme Sunucusunu Başlatın:**
   ```bash
   npm run dev
   ```

3. **Tip Kontrolü, Lint ve Birim Testleri:**
   ```bash
   npm run typecheck
   npm run lint
   npm test
   ```

4. **Üretim Derlemesi:**
   ```bash
   npm run build
   ```

---

## 📝 Lisans

[MIT](LICENSE)
