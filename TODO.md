# **🚀 Multi-Agent Harness Dönüşüm Yol Haritası (TODO.md)**

Bu doküman, var olan ai-consensus-mvp kod tabanını OpenRouter desteği de dahil olmak üzere ölçeklenebilir, modüler ve özelleştirilebilir bir **Multi-Agent Harness** yapısına dönüştürmek için gereken adım adım görevleri içerir.

## ---

**📌 Faz 1: Mimarinin ve Altyapının Modülerleştirilmesi**

> * **1.1. Model / Provider Soyutlama Katmanı (LLM Abstraction Layer)**  
  * Mevcut API çağrılarını tek bir provider yerine esnek ve genişletilebilir bir mimariye dönüştür.  
  * lib/providers/ klasörü oluştur:  
    * openrouter.ts: OpenRouter API entegrasyonu (Claude 3.5 Sonnet, DeepSeek-R1, Llama 3.3, Gemini 2.0 Flash vb. modeller için tek nokta erişimi). OpenRouter başlıkları (HTTP-Referer, X-Title) eklenecek.  
    * openai.ts, anthropic.ts, ollama.ts (yerel modeller için).  
  * Ortak bir BaseAgent arayüzü (Interface) ve provider fabrika sınıfı (Factory) tanımla:  
    `interface AgentConfig {`  
      `id: string;`  
      `name: string;`  
      `provider: 'openrouter' | 'openai' | 'anthropic' | 'ollama';`  
      `model: string; // örn: 'anthropic/claude-3.5-sonnet' veya 'deepseek/deepseek-r1'`  
      `systemPrompt: string;`  
      `temperature?: number;`  
    `}`  
> * **1.2. Dinamik Ajan Yönetimi ve OpenRouter Model Listesi**  
  * Ajanları sabit kodlamak yerine konfigüre edilebilir yapıya getir (config/agents.ts).  
  * OpenRouter üzerindeki güncel modelleri dinamik olarak çeken veya seçenek olarak sunan model kataloğu ekle.  
  * Kullanıcının arayüzden her ajana farklı bir OpenRouter modeli atamasına imkan tanı.

## **📌 Faz 2: Multi-Agent İş Akışı ve Tartışma (Debate) Mantığı**

> * **2.1. Çok Aşamalı Akış (Multi-Stage Workflow) Desteği**  
  * **Aşama 1 (Divergence):** Tüm ajanlara (farklı OpenRouter / yerel modellere) bağımsız olarak sorunun iletilmesi ve yanıtların toplanması.  
  * **Aşama 2 (Cross-Review / Critique):** Ajanların birbirlerinin yanıtlarını inceleyip eleştiri (feedback) sunması.  
  * **Aşama 3 (Synthesis / Aggregation):** Hakem (Judge) ajanın (örn. OpenRouter üzerindeki en yetkin model) tüm girdileri değerlendirip nihai yanıtı oluşturması.  
> * **2.2. Hata Toleransı ve Paralel Çağrı Yönetimi**  
  * Promise.allSettled yapısını kullanarak, OpenRouter API limiti veya zaman aşımı durumunda tek bir ajanın hatasının tüm akışı durdurmasını engelle.  
  * Zaman aşımı (Timeout) ve otomatik yeniden deneme (Retry) mekanizmaları ekle.

## **📌 Faz 3: Arayüz (UI/UX) ve Görselleştirme Geliştirmeleri**

> * **3.1. Akış Görselleştirme (Execution Pipeline UI)**  
  * app/page.tsx bileşenini güncelle. Ajan yanıtlarını, kullanılan OpenRouter model rozetlerini (badge) ve hakem sentezini sekmeler (tabs) halinde göster.  
> * **3.2. Ajan & Provider Konfigürasyon Paneli**  
  * Kullanıcının çalışma anında sistem istemini (System Prompt), sıcaklık değerini (Temperature), provider seçimini ve OpenRouter modelini ayarlayabileceği yan panel (Sidebar) oluştur.

## **📌 Faz 4: Yerel Model ve Ortam Konfigürasyonu (DevOps)**

> * **4.1. Ortam Değişkenleri ve Docker Güncellemesi**  
  * .env.example dosyasına OpenRouter ve diğer sağlayıcılar için gerekli anahtarları ekle:  
    `OPENROUTER_API_KEY=your_openrouter_api_key`  
    `OPENAI_API_KEY=your_openai_api_key`  
    `ANTHROPIC_API_KEY=your_anthropic_api_key`  
    `OLLAMA_BASE_URL=http://localhost:11434`  
  * docker-compose.yml dosyasını yerel modeller ile OpenRouter hibrit çalışabilecek şekilde ayarla.  
> * **4.2. Loglama ve Maliyet/Metrik İzleme**  
  * OpenRouter üzerinden dönen token tüketimi ve harcanan miktar/maliyet verilerini loglayan ve UI üzerinde gösteren metrik yapısı ekle.

## **📌 Faz 5: Test ve Doğrulama**

> * **5.1. Birim ve Entegrasyon Testleri**  
  * OpenRouter API uç noktası için mock yanıtlarla birim testleri yaz.  
  * Farklı OpenRouter modellerinin (örn. Claude \+ DeepSeek \+ Llama) birlikte çalıştığı entegrasyon test senaryolarını doğrula.