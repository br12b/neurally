import { GoogleGenAI } from "@google/genai";

// Bu fonksiyon Vercel, Vite, Next.js veya Create React App ortamlarındaki
// farklı değişken isimlendirmelerini otomatik algılar ve process hatasını önler.
export const getApiKey = (): string => {
  // 1. Vite (import.meta) - En güvenli yöntem
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY;
    }
  } catch (e) {
    // import.meta erişim hatası olursa yoksay
  }

  // 2. Process Env (Güvenli Erişim)
  try {
    // Tarayıcıda process tanımlı olmayabilir, bu kontrol hayati önem taşır.
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.NEXT_PUBLIC_API_KEY) return process.env.NEXT_PUBLIC_API_KEY;
      if (process.env.REACT_APP_API_KEY) return process.env.REACT_APP_API_KEY;
      if (process.env.API_KEY) return process.env.API_KEY;
    }
  } catch (e) {
    // process erişim hatası olursa yoksay
  }

  return "";
};

export const createAIClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("API Anahtarı bulunamadı! Vercel Environment Variables kısmına 'VITE_API_KEY' eklediğinizden emin olun.");
  }
  return new GoogleGenAI({ apiKey });
};
