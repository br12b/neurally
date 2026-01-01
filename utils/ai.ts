import { GoogleGenAI } from "@google/genai";

// Bu fonksiyon Vercel, Vite, Next.js veya Create React App ortamlarındaki
// farklı değişken isimlendirmelerini otomatik algılar.
export const getApiKey = (): string => {
  // 1. Vite (Vercel standart Vite dağıtımı)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY;
  }

  // 2. Next.js (Client Side)
  if (process.env.NEXT_PUBLIC_API_KEY) {
    return process.env.NEXT_PUBLIC_API_KEY;
  }

  // 3. Create React App
  if (process.env.REACT_APP_API_KEY) {
    return process.env.REACT_APP_API_KEY;
  }

  // 4. Standart Node/Fallback
  return process.env.API_KEY || "";
};

export const createAIClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("API Anahtarı bulunamadı! Vercel Environment Variables kısmına 'VITE_API_KEY' eklediğinizden emin olun.");
  }
  return new GoogleGenAI({ apiKey });
};
