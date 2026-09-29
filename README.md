# AI Multi-Agent Consensus Web App (MVP)

Bu proje, **Next.js 15 (App Router)**, **Tailwind CSS**, **TypeScript** ve **Vercel AI SDK (`ai`)** mimarisi üzerinde çalışan; harici hafıza (memory) aktarımı, dinamik sağlayıcı (provider) ayarları, OpenRouter entegrasyonu ve 3 farklı AI modelinin (OpenAI, Anthropic, Google Gemini, OpenRouter) çıktılarını yan yana gösteren ve hakem ajan ile konsensüs oluşturan çoklu ajan uygulamasıdır.

---

## 🚀 Özellikler

- **Çoklu Ajan Desteği:** OpenAI, Anthropic (Claude), Google Gemini ve OpenRouter modellerini tek bir panelden yönetin.
- **Hakem Konsensüs Ajanı:** Farklı modellerin yanıtlarını özel çalışma kriterlerinize göre analiz eder ve konsensüs raporu oluşturur.
- **Harici Hafıza (Memory) Aktarımı:** Tüm ajanlara ortak bağlam, doküman özetleri veya kurallar iletin (`.txt`, `.md`, `.json`, `.csv` içeri aktarma ve dışarı aktarma desteği).
- **Dinamik Sağlayıcı ve Model Ayarları:** Arayüz üzerinden API anahtarlarını, modelleri ve aktif ajanları dinamik olarak düzenleyin.
- **Güvenlik Sertleştirmeleri:** Zod girdi doğrulaması, prompt injection koruma sınırlayıcıları, CSP ve güvenlik başlıkları.
- **Docker Desteği:** Node 22 Alpine tabanlı standalone Docker ve `docker-compose` ile kolay ve güvenli dağıtım.

---

## 📁 Proje Dizin Yapısı

```text
ai-consensus-mvp/
├── app/
│   ├── api/
│   │   └── consensus/
│   │       └── route.ts       # Paralel AI sağlayıcı istekleri ve Hakem Konsensüs API rotası
│   ├── globals.css             # Global stil tanımlamaları
│   ├── layout.tsx              # Kök düzen (Layout)
│   └── page.tsx                # Karşılaştırma ve ayarlar paneli ön yüzü
├── public/                     # Statik dosyalar
├── .dockerignore               # Docker derleme dışı bırakılacak dosyalar
├── .env.example                # Örnek ortam değişkenleri
├── docker-compose.yml          # Docker Compose konfigürasyonu
├── Dockerfile                  # Multi-stage Dockerfile (Node 22)
├── next.config.mjs             # Next.js konfigürasyonu (standalone output & security headers)
├── package.json                # Bağımlılıklar ve npm betikleri
├── tsconfig.json               # TypeScript konfigürasyonu
├── README.md                   # Proje dokümantasyonu
└── ai-consensus-webapp.md     # Proje mimari referans dokümanı
```

---

## 🛠️ Kurulum ve Çalıştırma

Projeyi yerel ortamınızda veya Docker konteyneri içerisinde çalıştırabilirsiniz.

### Yöntem 1: Docker ile Kurulum (Tavsiye Edilen)

#### Docker Compose ile Çalıştırma:
```bash
docker-compose up -d --build
```
Uygulama arka planda derlenecek ve çalışmaya başlayacaktır. Tarayıcınızda `http://localhost:3000` adresine giderek erişebilirsiniz.

Konteyneri durdurmak için:
```bash
docker-compose down
```

#### Standalone Docker CLI ile Çalıştırma:
```bash
# Docker imajını oluşturun
docker build -t ai-consensus-app .

# Konteyneri başlatın
docker run -d -p 3000:3000 --name ai-consensus-app ai-consensus-app
```

---

### Yöntem 2: Yerel Geliştirme Ortamı (Node.js 22+)

1. **Gerekli Bağımlılıkları Yükleyin:**
   ```bash
   npm install
   ```

2. **Geliştirme Sunucusunu Başlatın:**
   ```bash
   npm run dev
   ```
   Tarayıcınızda `http://localhost:3000` adresini açın.

3. **Üretim (Production) Derlemesi ve Test:**
   ```bash
   npm run build
   npm run start
   ```

---

## 💡 Kullanım ve Güvenlik Notları

1. Uygulamayı açın ve sağ üstteki **"Ayarlar & Modeller"** butonuna tıklayın.
2. Kullanmak istediğiniz AI sağlayıcılarının (OpenAI, Anthropic, Google Gemini, OpenRouter) API anahtarlarını girin.
3. API anahtarlarınız varsayılan olarak tarayıcınızın yerel depolama alanında (`localStorage`) tutulur ve yalnızca ilgili AI istekleri için API sunucunuza iletilir.
4. Sol taraftaki **"Harici Hafıza"** alanına modellerin dikkate almasını istediğiniz arka plan bilgilerini yazın veya dosya yükleyin.
5. **"Ana Sorgu / Soru"** alanına sorunuzu yazıp **"Ajanları Çalıştır ve Konsensüs Sağla"** butonuna basın.

---

## 📝 Lisans

MIT
