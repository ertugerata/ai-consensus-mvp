# AI Multi-Agent Harness & Consensus Suite

Bu proje, **Next.js 15 (App Router)**, **Tailwind CSS**, **TypeScript** ve **Vercel AI SDK** mimarisi üzerinde çalışan; OpenRouter, OpenAI, Anthropic, Google Gemini ve yerel **Ollama** modellerini destekleyen modüler bir **Multi-Agent Debate & Consensus Harness** sistemidir.

---

## 🚀 Öne Çıkan Özellikler

- **Çok Aşamalı İş Akışı (Multi-Stage Debate Workflow):**
  - **Aşama 1 (Divergence):** Tüm konfigüre edilmiş ajanların soruyu bağımsız olarak yanıtlaması.
  - **Aşama 2 (Cross-Review / Critique):** Ajanların birbirlerinin yanıtlarını inceleyip eleştirel gözden geçirmeler sunması.
  - **Aşama 3 (Synthesis / Aggregation):** Hakem (Judge) ajanın tüm girdi ve eleştirileri değerlendirip nihai konsensüs raporunu oluşturması.
- **Genişletilebilir Provider ve Model Soyutlama Katmanı:**
  - **OpenRouter Entegrasyonu:** Claude 3.5 Sonnet, DeepSeek-R1, Llama 3.3, Gemini 2.0 Flash, Qwen vb. yüzlerce modele tek noktadan erişim.
  - **Yerel Model Desteği (Ollama):** Yerel makinenizde çalışan Ollama modelleri (`llama3.3`, `deepseek-r1` vb.) ile tam entegrasyon.
  - **Direct AI Providers:** OpenAI, Anthropic, Google Gemini.
- **Dinamik Ajan Yapılandırması:**
  - Her ajan için bağımsız Sistem İstemi (System Prompt), Sıcaklık (Temperature), Sağlayıcı ve Model seçimi.
- **Harici Hafıza (Memory) ve Kriter Desteği:**
  - Ajanlara bağlam veya doküman aktarımı (`.txt`, `.md`, `.json`, `.csv` yükleme ve indirme desteği) ve özel çalışma kuralları tanımlama.
- **Loglama, Maliyet ve Metrik İzleme:**
  - Her aşama ve ajan için Latency (gecikme süresi) ve Token tüketimi izleme.
- **Güvenlik Sertleştirmeleri:**
  - Zod girdi doğrulaması, XML kaçışlı (`sanitizeXmlData`) prompt injection koruması, CSP ve Docker güvenlik sertleştirmeleri.

---

## 📁 Proje Dizin Yapısı

```text
ai-consensus-mvp/
├── app/
│   ├── api/
│   │   └── consensus/
│   │       └── route.ts         # Zod doğrulama ve Multi-Stage Harness API uç noktası
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
│   │   └── openrouter.ts         # OpenRouter Provider entegrasyonu (Custom Headers)
│   └── types.ts                  # Harness, Ajan ve Provider Tip Tanımlamaları
├── public/                       # Statik dosyalar
├── .dockerignore                 # Docker derleme dışı bırakılacak dosyalar
├── .env.example                  # Örnek ortam değişkenleri
├── ai-consensus-mvp-issues.md   # İnceleme raporu ve çözülen issue listesi
├── docker-compose.yml            # Docker Compose konfigürasyonu
├── Dockerfile                    # Multi-stage Dockerfile (Node 22 Alpine)
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

## 💡 Kullanım

1. **Ajan & Provider Ayarları:**
   - Sağ üstteki **"Ajan & Provider Ayarları"** butonuna tıklayın.
   - OpenRouter, OpenAI, Anthropic, Gemini API anahtarlarınızı veya Ollama adresinizi girin. API anahtarlarınızı dilerseniz sunucudaki `.env` dosyasından da otomatik olarak tanıtabilirsiniz.
   - Her ajan için Sistem İstemi, Sıcaklık ve Model seçin (OpenRouter modelleri, DeepSeek-R1, Claude 3.5 Sonnet vb.).

2. **Sorgu ve Tartışmayı Başlatma:**
   - **Harici Hafıza** alanına belgelerinizi aktarın veya yapıştırın.
   - **Ana Sorgu / Soru** alanına sorunuzu girin.
   - **"Harness'ı Başlat ve Tartıştır"** butonuna basın.

3. **Çok Aşamalı Sonuçları İnceleme:**
   - **Aşama 1 (Divergence):** Tüm ajanların bağımsız ilk yanıtları.
   - **Aşama 2 (Cross-Review):** Ajanların birbirlerinin yanıtlarına sunduğu eleştiriler.
   - **Aşama 3 (Synthesis):** Hakem ajanın ürettiği nihai konsensüs raporu.
   - **Raporu İndir (.md):** Tüm aşamaları ve token/süre metriklerini Markdown dosyası olarak indirin.

---

## 📝 Lisans

MIT
