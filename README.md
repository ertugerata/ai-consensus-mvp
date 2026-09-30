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
  - Ajanlara bağlam veya doküman aktarımı (`.txt`, `.md`, `.json`, `.csv` yükleme ve indirme desteği) ve özel çalışma kuralları tanımlama.
- **Güvenlik Sertleştirmeleri:**
  - Zod tek kaynaklı tip ve girdi doğrulaması (`lib/types.ts`), SSRF korumaları, API rate limit (10 istek/dk), `maxTokens` ve deadline zaman bütçesi yönetimi.
  - Tümüyle kaçışlanmış XML verileri ve Sistem İstemi düzeyinde prompt injection koruması (`SYSTEM_SECURITY_DIRECTIVE`).

---

## 📁 Proje Dizin Yapısı

```text
ai-consensus-mvp/
├── app/
│   ├── api/
│   │   └── consensus/
│   │       └── route.ts         # Zod doğrulama, Rate Limit ve Multi-Stage Harness API uç noktası
│   ├── globals.css               # Global Tailwind CSS stilleri
│   ├── layout.tsx                # Kök düzen (Layout)
│   └── page.tsx                  # Execution Pipeline UI ve Ajan Ayarları Ön Yüzü
├── lib/
│   ├── config/
│   │   └── agents.ts             # Varsayılan ajan ayarları ve model katalogları
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
│   └── types.ts                  # Zod Şemaları, Harness ve Ajan Tip Tanımlamaları
├── public/                       # Statik dosyalar
├── .dockerignore                 # Docker derleme dışı bırakılacak dosyalar
├── .env.example                  # Örnek ortam değişkenleri
├── ai-consensus-mvp-issues.md   # İnceleme raporu
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

3. **Üretim Derlemesi ve Tip Kontrolü:**
   ```bash
   npm run build
   ```

---

## 📝 Lisans

[MIT](LICENSE)
