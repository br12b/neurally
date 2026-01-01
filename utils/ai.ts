import { GoogleGenAI } from "@google/genai";
import { Question } from "../types";

// ==============================================================================
// 🔑 API ANAHTARINI BURAYA YAPIŞTIR
// ------------------------------------------------------------------------------
// Google Gemini kullanıyorsan: "AIza..." ile başlayan anahtarı,
// Groq kullanıyorsan: "gsk_..." ile başlayan anahtarı
// aşağıdaki tırnakların içine yapıştır. Sistem otomatik algılar.
// ==============================================================================
const MANUAL_API_KEY: string = ""; 
// ==============================================================================

// --- API KEY DETECTION ---
export const getApiKey = (): string => {
  // 1. Önce manuel anahtarı kontrol et (En garantisi)
  if (MANUAL_API_KEY && MANUAL_API_KEY.length > 5) {
    return MANUAL_API_KEY;
  }

  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY;
    }
  } catch (e) {}

  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.NEXT_PUBLIC_API_KEY) return process.env.NEXT_PUBLIC_API_KEY;
      if (process.env.REACT_APP_API_KEY) return process.env.REACT_APP_API_KEY;
      if (process.env.API_KEY) return process.env.API_KEY;
    }
  } catch (e) {}

  return "";
};

// --- GROQ ADAPTER (Mimics Gemini SDK) ---
class GroqAdapter {
  private apiKey: string;
  private baseUrl = "https://api.groq.com/openai/v1/chat/completions";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Mimic the 'models' property structure of Gemini SDK
  get models() {
    return {
      generateContent: async (params: any) => {
        return this.generateContent(params);
      }
    };
  }

  async generateContent(params: any) {
    const { contents, config } = params;
    
    // Convert Gemini 'contents' to OpenAI/Groq 'messages'
    let userContent = "";
    
    // Handle Text or Object input
    if (typeof contents === 'string') {
        userContent = contents;
    } else if (contents.parts) {
        // Groq text-only fallback: Sadece text olan kısımları al
        userContent = contents.parts
            .filter((p: any) => p.text)
            .map((p: any) => p.text)
            .join("\n");
            
        // Eğer inlineData (Resim/PDF) varsa uyarı ekle ama patlatma
        if (contents.parts.some((p: any) => p.inlineData)) {
            console.warn("Neurally: PDF/Görsel verisi algılandı. Groq sadece metin destekler, dosya içeriği yoksayılıyor.");
            userContent += "\n[SYSTEM NOTE: The user attached a file, but the current AI engine (Groq) supports text only. Please generate the best possible response based on the text prompt provided.]";
        }
    } else {
       userContent = JSON.stringify(contents);
    }

    // Determine System Prompt
    let systemMessage = "You are a helpful AI tutor.";
    if (userContent.includes("Active Recall") || userContent.includes("Soru")) {
        systemMessage = "You are an expert exam creator. Output strict JSON only. No markdown formatting like ```json.";
    } else if (userContent.includes("Key Points") || userContent.includes("Püf Noktaları")) {
        systemMessage = "You are a study summarizer. Output strict JSON only. No markdown formatting.";
    }

    // JSON Zorlaması (Groq için kritik)
    if (config?.responseMimeType === "application/json") {
       userContent += "\n\nIMPORTANT: Return ONLY valid JSON. Do not include any explanation, prologue, or markdown backticks.";
    }

    const body = {
      model: "llama-3.3-70b-versatile", // En güncel ve güçlü Groq modeli
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userContent }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" } // JSON Modu
    };

    try {
      console.log("Neurally: Sending request to Groq API...");
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Groq API Error Details:", errData);
        throw new Error(`Groq API Error: ${response.status} ${errData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || "";

      // Gemini formatına çevir
      return {
        text: content,
        candidates: [{ content: { parts: [{ text: content }] } }]
      };

    } catch (error) {
      console.error("Groq Adapter Failed:", error);
      throw error;
    }
  }
}

// --- FACTORY FUNCTION ---
export const createAIClient = () => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
      console.warn("Neurally: No API Key found. Using Dummy.");
      return new GoogleGenAI({ apiKey: "dummy" });
  }

  // HYBRID SWITCH
  // Eğer key 'gsk_' ile başlıyorsa Groq kullan
  if (apiKey.startsWith("gsk_")) {
      console.log("Neurally: Groq Engine Active (Llama 3.3)");
      // @ts-ignore
      return new GroqAdapter(apiKey);
  }

  // Yoksa Gemini kullan
  return new GoogleGenAI({ apiKey });
};


// --- MOCK / FALLBACK DATA GENERATORS ---
export const generateFallbackQuestions = (): Question[] => {
  return [
    {
      id: 1,
      topicTag: "Simülasyon Modu: Biyoloji",
      text: "Mitokondriyal DNA'nın (mtDNA) sadece anneden aktarılmasının temel biyolojik sebebi nedir?",
      options: [
        { id: "a", text: "Spermdeki mitokondrilerin kuyruk kısmında kalması ve döllenmeye girmemesi", isCorrect: true },
        { id: "b", text: "Yumurta hücresinin mitokondri DNA'sını baskılaması", isCorrect: false },
        { id: "c", text: "Sperm mitokondrilerinin döllenme anında lizozomlarca sindirilmemesi", isCorrect: false },
        { id: "d", text: "mtDNA'nın X kromozomu üzerinde taşınması", isCorrect: false }
      ],
      rationale: "Sperm hücresinin mitokondrileri, hareket için gereken enerjiyi sağlayan kuyruk (boyun) kısmında bulunur. Döllenme sırasında genellikle sadece baş kısmı yumurtaya girer, bu yüzden babadan mitokondri aktarılmaz.",
    },
    {
      id: 2,
      topicTag: "Simülasyon Modu: Fizik",
      text: "Bir asansör yukarı doğru 'yavaşlayarak' çıkarken, içindeki kişinin hissettiği ağırlık (Görünür Ağırlık) gerçek ağırlığına göre nasıl değişir?",
      options: [
        { id: "a", text: "Değişmez, kütle korunur.", isCorrect: false },
        { id: "b", text: "Artar, çünkü eylemsizlik yukarı doğrudur.", isCorrect: false },
        { id: "c", text: "Azalır, çünkü ivme vektörü aşağı yönlüdür.", isCorrect: true },
        { id: "d", text: "Sıfırlanır (Ağırlıksızlık hissi).", isCorrect: false }
      ],
      rationale: "Asansör yukarı giderken yavaşlıyorsa, ivmesi hareket yönüne terstir (aşağı doğrudur). Newton'un yasalarına göre (F=m.a), zemin tepki kuvveti azalır. N = m(g-a) olur, yani daha hafif hissedersiniz.",
    },
    {
      id: 3,
      topicTag: "Simülasyon Modu: Tarih",
      text: "Sanayi Devrimi'nin Osmanlı İmparatorluğu üzerindeki en yıkıcı ekonomik etkisi aşağıdakilerden hangisidir?",
      options: [
        { id: "a", text: "Tarımsal üretimin tamamen durması", isCorrect: false },
        { id: "b", text: "Lonca teşkilatının çökmesi ve yerli üretimin rekabet edememesi", isCorrect: true },
        { id: "c", text: "Nüfusun hızla kırsala göç etmesi", isCorrect: false },
        { id: "d", text: "Dış borçların tamamen silinmesi", isCorrect: false }
      ],
      rationale: "Avrupa'da fabrikalarda ucuza ve seri üretilen mallar, kapitülasyonlar sayesinde Osmanlı pazarına gümrüksüz girdi. El tezgahlarında üretim yapan Lonca esnafı bu fiyatlarla rekabet edemeyip iflas etti.",
    },
    {
      id: 4,
      topicTag: "Simülasyon Modu: Kimya",
      text: "İdeal gaz denklemine (PV=nRT) göre, kapalı sabit hacimli bir kaptaki gazın sıcaklığı (Kelvin cinsinden) iki katına çıkarılırsa basıncı ne olur?",
      options: [
        { id: "a", text: "Değişmez", isCorrect: false },
        { id: "b", text: "Yarıya iner", isCorrect: false },
        { id: "c", text: "Dört katına çıkar", isCorrect: false },
        { id: "d", text: "İki katına çıkar", isCorrect: true }
      ],
      rationale: "Gay-Lussac Yasası: Hacim (V) ve miktar (n) sabitken, Basınç (P) ile Mutlak Sıcaklık (T) doğru orantılıdır. T iki katına çıkarsa, P de iki katına çıkar.",
    },
    {
      id: 5,
      topicTag: "Simülasyon Modu: Mantık",
      text: "Aşağıdakilerden hangisi 'Active Recall' (Aktif Çağrışım) yönteminin temel prensibidir?",
      options: [
        { id: "a", text: "Metni tekrar tekrar okuyarak ezberlemek", isCorrect: false },
        { id: "b", text: "Önemli yerlerin altını renkli kalemle çizmek", isCorrect: false },
        { id: "c", text: "Bilgiyi dışarıdan yardım almadan zihinden geri çağırmaya zorlamak", isCorrect: true },
        { id: "d", text: "Ders dinlerken not almak", isCorrect: false }
      ],
      rationale: "Aktif Çağrışım, bilgiyi pasif olarak almak (okumak, dinlemek) değil, beyni zorlayarak bilgiyi içeriden dışarıya çıkarmak (test çözmek, anlatmak) üzerine kuruludur. Bu, nöral bağları en çok güçlendiren yöntemdir.",
    }
  ];
};

export const generateFallbackKeyPoints = () => {
  return [
    {
      title: "Mitokondriyal Kalıtım (Simülasyon)",
      content: "mtDNA sadece anneden geçer. Soy takibinde (matrilineal) kullanılır. Baba kaynaklı mitokondri hastalığı çocuğa geçmez.",
      importance: "Critical"
    },
    {
      title: "Eylemsizlik Prensibi",
      content: "Cisimler hareket durumlarını korumak ister. Net kuvvet sıfırsa, duran durur, giden sabit hızla gider.",
      importance: "High"
    },
    {
      title: "Osmoz vs Difüzyon",
      content: "Osmoz SADECE suyun geçişidir ve yarı geçirgen zar gerektirir. Difüzyon her madde için olabilir ve enerji harcanmaz.",
      importance: "Medium"
    },
    {
      title: "Lozan Antlaşması (Önem)",
      content: "Türkiye'nin tapu senedidir. Kapitülasyonlar kaldırılmış, ekonomik bağımsızlık sağlanmıştır. Sınırlar büyük ölçüde belirlenmiştir.",
      importance: "High"
    },
    {
      title: "Limit-Süreklilik İlişkisi",
      content: "Bir fonksiyonun bir noktada limitinin olması, orada sürekli olduğu anlamına gelmez. Ama sürekliyse limiti kesinlikle vardır.",
      importance: "Critical"
    }
  ];
};