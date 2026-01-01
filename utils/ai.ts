import { GoogleGenAI } from "@google/genai";
import { Question } from "../types";

// --- API KEY DETECTION ---
// Vercel veya .env dosyasından anahtarı okur.
export const getApiKey = (): string => {
  try {
    // 1. Vite Environment Variable (Vercel için önerilen: VITE_API_KEY)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY;
    }
  } catch (e) {}

  try {
    // 2. Next.js / Create React App Environment Variable
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.NEXT_PUBLIC_API_KEY) return process.env.NEXT_PUBLIC_API_KEY;
      if (process.env.REACT_APP_API_KEY) return process.env.REACT_APP_API_KEY;
      if (process.env.API_KEY) return process.env.API_KEY;
    }
  } catch (e) {}

  return "";
};

// --- OPENROUTER ADAPTER ---
class OpenRouterAdapter {
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1/chat/completions";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  get models() {
    return {
      generateContent: async (params: any) => {
        return this.generateContent(params);
      }
    };
  }

  async generateContent(params: any) {
    const { contents, config } = params;
    
    let userContent = "";
    
    if (typeof contents === 'string') {
        userContent = contents;
    } else if (contents.parts) {
        userContent = contents.parts
            .filter((p: any) => p.text)
            .map((p: any) => p.text)
            .join("\n");
            
        if (contents.parts.some((p: any) => p.inlineData)) {
            console.warn("Neurally: Dosya algılandı. OpenRouter adaptörü şu an sadece metin işliyor.");
            userContent += "\n[SYSTEM NOTE: The user attached a file. Please generate the best possible response based on the text prompt provided.]";
        }
    } else {
       userContent = JSON.stringify(contents);
    }

    let systemMessage = "You are a helpful AI tutor.";
    if (userContent.includes("Active Recall") || userContent.includes("Soru")) {
        systemMessage = "You are an expert exam creator. IMPORTANT: Detect the language of the input text and generate the JSON response IN THE SAME LANGUAGE. Output strict JSON only. No markdown formatting like ```json.";
    } else if (userContent.includes("Key Points") || userContent.includes("Püf Noktaları")) {
        systemMessage = "You are a study summarizer. Output strict JSON only. No markdown formatting.";
    }

    if (config?.responseMimeType === "application/json") {
       userContent += "\n\nIMPORTANT: Return ONLY valid JSON. Do not include any explanation, prologue, or markdown backticks.";
    }

    const body = {
      model: "google/gemini-2.0-flash-001", // OpenRouter üzerinden hızlı ve ucuz model
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userContent }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      provider: {
        order: ["Google", "DeepInfra"],
        allow_fallbacks: true
      }
    };

    try {
      console.log("Neurally: Sending request to OpenRouter API...");
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": window.location.href, // OpenRouter gereksinimi
          "X-Title": "Neurally App",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("OpenRouter API Error Details:", errData);
        throw new Error(`OpenRouter API Error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || "";

      return {
        text: content,
        candidates: [{ content: { parts: [{ text: content }] } }]
      };

    } catch (error) {
      console.error("OpenRouter Adapter Failed:", error);
      throw error;
    }
  }
}

// --- GROQ ADAPTER ---
class GroqAdapter {
  private apiKey: string;
  private baseUrl = "https://api.groq.com/openai/v1/chat/completions";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  get models() {
    return {
      generateContent: async (params: any) => {
        return this.generateContent(params);
      }
    };
  }

  async generateContent(params: any) {
    const { contents, config } = params;
    
    let userContent = "";
    
    if (typeof contents === 'string') {
        userContent = contents;
    } else if (contents.parts) {
        userContent = contents.parts
            .filter((p: any) => p.text)
            .map((p: any) => p.text)
            .join("\n");
            
        if (contents.parts.some((p: any) => p.inlineData)) {
            userContent += "\n[SYSTEM NOTE: File content ignored by Groq text-only adapter.]";
        }
    } else {
       userContent = JSON.stringify(contents);
    }

    let systemMessage = "You are a helpful AI tutor.";
    if (userContent.includes("Active Recall") || userContent.includes("Soru")) {
        systemMessage = "You are an expert exam creator. IMPORTANT: Detect the language of the input text and generate the JSON response IN THE SAME LANGUAGE. Output strict JSON only. No markdown formatting like ```json.";
    } else if (userContent.includes("Key Points") || userContent.includes("Püf Noktaları")) {
        systemMessage = "You are a study summarizer. Output strict JSON only. No markdown formatting.";
    }

    if (config?.responseMimeType === "application/json") {
       userContent += "\n\nIMPORTANT: Return ONLY valid JSON. Do not include any explanation, prologue, or markdown backticks.";
    }

    const body = {
      model: "llama-3.3-70b-versatile", 
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userContent }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" }
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
        throw new Error(`Groq API Error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || "";

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

  // 1. OPENROUTER CHECK
  if (apiKey.startsWith("sk-or-")) {
      console.log("Neurally: OpenRouter Engine Active");
      // @ts-ignore
      return new OpenRouterAdapter(apiKey);
  }

  // 2. GROQ CHECK
  if (apiKey.startsWith("gsk_")) {
      console.log("Neurally: Groq Engine Active");
      // @ts-ignore
      return new GroqAdapter(apiKey);
  }

  // 3. GEMINI DEFAULT
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