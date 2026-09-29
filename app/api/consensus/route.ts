import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export async function POST(req: Request) {
  try {
    const { prompt, memory, evaluationCriteria, apiKeys, config } = await req.json();

    // Hafıza ve ana soruyu birleştirme
    const fullContextPrompt = memory 
      ? `[HAFIZA/BAĞLAM]\n${memory}\n\n[SORU]\n${prompt}`
      : prompt;

    // Dinamik sağlayıcı tanımları
    const providers: Record<string, any> = {};
    if (apiKeys.openai) providers.openai = createOpenAI({ apiKey: apiKeys.openai });
    if (apiKeys.anthropic) providers.anthropic = createAnthropic({ apiKey: apiKeys.anthropic });
    if (apiKeys.gemini) providers.google = createGoogleGenerativeAI({ apiKey: apiKeys.gemini });

    const getModelInstance = (providerName: string, modelName: string) => {
      if (providerName === 'openai' && providers.openai) return providers.openai(modelName);
      if (providerName === 'anthropic' && providers.anthropic) return providers.anthropic(modelName);
      if (providerName === 'gemini' && providers.google) return providers.google(modelName);
      return null;
    };

    const modelA = getModelInstance(config.agentA.provider, config.agentA.model);
    const modelB = getModelInstance(config.agentB.provider, config.agentB.model);
    const modelC = getModelInstance(config.agentC.provider, config.agentC.model);

    // 3 Ajanı paralel olarak tetikliyoruz
    const [resA, resB, resC] = await Promise.allSettled([
      modelA ? generateText({ model: modelA, prompt: fullContextPrompt }).then(r => r.text) : Promise.reject('Sağlayıcı veya anahtar eksik'),
      modelB ? generateText({ model: modelB, prompt: fullContextPrompt }).then(r => r.text) : Promise.reject('Sağlayıcı veya anahtar eksik'),
      modelC ? generateText({ model: modelC, prompt: fullContextPrompt }).then(r => r.text) : Promise.reject('Sağlayıcı veya anahtar eksik'),
    ]);

    const responses = {
      agentA: resA.status === 'fulfilled' ? resA.value : `Hata: ${resA.reason}`,
      agentB: resB.status === 'fulfilled' ? resB.value : `Hata: ${resB.reason}`,
      agentC: resC.status === 'fulfilled' ? resC.value : `Hata: ${resC.reason}`,
    };

    // 4. Hakem Ajanın sizin özel kriterlerinize göre süzme yaptığı alan
    let refereeText = "Hakem analizi için yeterli veri alınamadı.";
    const refereeModel = providers.openai ? providers.openai('gpt-4o') : (providers.anthropic ? providers.anthropic('claude-3-5-sonnet-20241022') : null);

    if (refereeModel && (resA.status === 'fulfilled' || resB.status === 'fulfilled' || resC.status === 'fulfilled')) {
      const refereePrompt = `
      Kullanıcı Sorusu: "${prompt}"
      
      Ajan Yanıtları:
      ---
      Ajan A (${config.agentA.model}): ${responses.agentA}
      ---
      Ajan B (${config.agentB.model}): ${responses.agentB}
      ---
      Ajan C (${config.agentC.model}): ${responses.agentC}
      ---
      
      ÖZEL ÇAILIŞMA DÜZENİ VE DEĞERLENDİRME KRİTERLERİ:
      "${evaluationCriteria || 'Genel doğruluk ve tutarlılık analizi yap.'}"
      
      GÖREVİN:
      1. Yukarıdaki 3 yanıtı verilen Özel Çalışma Düzeni ve Kriterlerine göre titizlikle değerlendir.
      2. Yanıtlar arasındaki çelişkileri, uydurmaları (hallucination) veya eksiklikleri tespit et.
      3. Belirtilen çalışma düzenine en uygun çözümü / sentezi üreterek nihai ve filtrelenmiş tek bir konsensüs yanıtı oluştur.
      `;

      const refRes = await generateText({ model: refereeModel, prompt: refereePrompt });
      refereeText = refRes.text;
    } else if (!refereeModel) {
      refereeText = "Hakem ajanının çalışabilmesi için geçerli bir OpenAI veya Anthropic API anahtarı gereklidir.";
    }

    return NextResponse.json({ ...responses, consensus: refereeText });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
