# AI Multi-Agent Consensus Web App (MVP)

Bu proje, **Next.js 15 (App Router)**, **Tailwind CSS** ve **TypeScript** mimarisi üzerinde çalışan; harici hafıza (memory) aktarımı, dinamik sağlayıcı (provider) ayarları ve 3 farklı AI modelinin (OpenAI, Anthropic, Google Gemini) çıktılarını yan yana gösteren ve karşılaştıran çoklu ajan konsensüs uygulamasıdır.

---

## 🚀 Özellikler

- **Çoklu Ajan Desteği:** OpenAI, Anthropic (Claude) ve Google Gemini modellerini tek bir panelden yönetin.
- **Harici Hafıza (Memory) Aktarımı:** Tüm ajanlara ortak bağlam, doküman özetleri veya kurallar iletin.
- **Dinamik Sağlayıcı ve Model Ayarları:** Arayüz üzerinden API anahtarlarını, modelleri ve aktif ajanları dinamik olarak düzenleyin.
- **Yan Yana Karşılaştırma:** Ajan çıktılarını eşzamanlı olarak panel görünümünde inceleyin.
- **Docker Desteği:** Standalone Docker ve `docker-compose` ile tek komutla kolay dağıtım.

---

## 📁 Proje Dizin Yapısı

```text
ai-consensus-mvp/
├── app/
│   ├── api/
│   │   └── consensus/
│   │       └── route.ts       # Paralel AI sağlayıcı istekleri API rotası
│   ├── globals.css             # Global stil tanımlamaları
│   ├── layout.tsx              # Kök düzen (Layout)
│   └── page.tsx                # Karşılaştırma paneli ön yüzü
├── public/                     # Statik dosyalar
├── .dockerignore               # Docker derleme dışı bırakılacak dosyalar
├── docker-compose.yml          # Docker Compose konfigürasyonu
├── Dockerfile                  # Çok aşamalı (multi-stage) Docker yapılandırması
├── next.config.mjs             # Next.js konfigürasyonu (standalone output)
├── package.json                # Bağımlılıklar ve npm betikleri
├── tsconfig.json               # TypeScript konfigürasyonu
├── README.md                   # Proje dokümantasyonu
└── ai-consensus-webapp.md     # Proje referans dokümanı
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

### Yöntem 2: Yerel Geliştirme Ortamı (Node.js)

1. **Gerekli Bağımlılıkları Yükleyin:**
   ```bash
   npm install
   ```

2. **Geliştirme Sunucusunu Başlatın:**
   ```bash
   npm run dev
   ```
   Tarayıcınızda `http://localhost:3000` adresini açın.

3. **Üretim (Production) Derlemesi:**
   ```bash
   npm run build
   npm run start
   ```

---

## 💡 Kullanım Rehberi

1. Uygulamayı açın ve sağ üstteki **"Model & API Ayarları"** butonuna tıklayın.
2. Kullanmak istediğiniz AI sağlayıcılarının (OpenAI, Anthropic, Google Gemini) API anahtarlarını (API Key) girin ve aktif olmasını istediğiniz ajanları seçin.
3. Sol taraftaki **"Harici Hafıza"** alanına modellerin dikkate almasını istediğiniz arka plan bilgilerini veya yönlendirmeleri yazın (opsiyonel).
4. **"Sormak İstediğiniz Soru"** alanına sorunuzu yazıp **"Tüm Ajanlara Sor"** butonuna basın.
5. Ajan yanıtlarını panel üzerinde yan yana karşılaştırın.

---

## 📝 Lisans

MIT
