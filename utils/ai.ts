import { GoogleGenAI } from "@google/genai";
import { Question } from "../types";

// --- API KEY DETECTION ---
export const getApiKey = (): string => {
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
            console.warn("Neurally: File detected. Adapter handling text only.");
            userContent += "\n[SYSTEM NOTE: The user attached a file. Analyze the implied content.]";
        }
    } else {
       userContent = JSON.stringify(contents);
    }

    // UPDATED PROMPT: ACADEMIC & UNIVERSAL
    let systemMessage = "You are a high-level academic tutor and cognitive engine.";
    if (userContent.includes("Active Recall") || userContent.includes("Soru")) {
        systemMessage = "You are an expert professor capable of creating university-level assessment material. IMPORTANT: Detect the language of the input text and generate the JSON response IN THE SAME LANGUAGE. Focus on critical thinking, deep analysis, and conceptual understanding. Output strict JSON only.";
    } else if (userContent.includes("Key Points") || userContent.includes("Püf Noktaları")) {
        systemMessage = "You are a research assistant. Extract the most critical academic concepts, theorems, or data points. Output strict JSON only.";
    }

    if (config?.responseMimeType === "application/json") {
       userContent += "\n\nIMPORTANT: Return ONLY valid JSON. Do not include any explanation, prologue, or markdown backticks.";
    }

    const body = {
      model: "google/gemini-2.0-flash-001",
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
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": window.location.href,
          "X-Title": "Neurally App",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error(`OpenRouter API Error: ${response.status}`);
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
    let userContent = ""; // (Same logic as OpenRouter...)
    
    if (typeof contents === 'string') {
        userContent = contents;
    } else if (contents.parts) {
        userContent = contents.parts.map((p:any) => p.text).join("\n");
    }

    let systemMessage = "You are an advanced academic AI.";
    if (userContent.includes("Active Recall")) {
        systemMessage = "You are a university professor. Create high-quality, logic-based questions. Detect input language and output JSON in that language.";
    }

    if (config?.responseMimeType === "application/json") {
       userContent += "\n\nReturn ONLY valid JSON.";
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
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Authorization": `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(`Groq API Error: ${response.status}`);
      const data = await response.json();
      const content = data.choices[0]?.message?.content || "";
      return { text: content, candidates: [{ content: { parts: [{ text: content }] } }] };
    } catch (error) { throw error; }
  }
}

// --- FACTORY FUNCTION ---
export const createAIClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) return new GoogleGenAI({ apiKey: "dummy" });
  if (apiKey.startsWith("sk-or-")) return new OpenRouterAdapter(apiKey);
  if (apiKey.startsWith("gsk_")) return new GroqAdapter(apiKey);
  return new GoogleGenAI({ apiKey });
};


// --- MOCK / FALLBACK DATA GENERATORS ---
export const generateFallbackQuestions = (): Question[] => {
  return [
    {
      id: 1,
      topicTag: "Simulation: Neurobiology",
      text: "Which of the following best describes the role of the Myelin Sheath in signal transmission?",
      options: [
        { id: "a", text: "It generates the action potential.", isCorrect: false },
        { id: "b", text: "It insulates the axon and increases transmission speed via saltatory conduction.", isCorrect: true },
        { id: "c", text: "It releases neurotransmitters into the synaptic cleft.", isCorrect: false },
        { id: "d", text: "It absorbs excess ions to prevent signal noise.", isCorrect: false }
      ],
      rationale: "Myelin acts as an electrical insulator. The gaps (Nodes of Ranvier) allow the signal to 'jump' (saltatory conduction), significantly speeding up the neural impulse.",
    },
    {
      id: 2,
      topicTag: "Simulation: Quantum Mechanics",
      text: "What is the fundamental implication of the Heisenberg Uncertainty Principle?",
      options: [
        { id: "a", text: "Everything is relative to the observer's speed.", isCorrect: false },
        { id: "b", text: "You cannot simultaneously know the exact position and momentum of a particle.", isCorrect: true },
        { id: "c", text: "Energy can be created from nothing for short periods.", isCorrect: false },
        { id: "d", text: "Light behaves only as a wave, never as a particle.", isCorrect: false }
      ],
      rationale: "Werner Heisenberg showed that the act of measuring one variable (like position) with high precision necessarily disturbs the other variable (momentum), making it less precise.",
    }
  ];
};

export const generateFallbackKeyPoints = () => {
  return [
    {
      title: "Pareto Principle (80/20 Rule)",
      content: "In many events, roughly 80% of the effects come from 20% of the causes. Focus on the vital few, not the trivial many.",
      importance: "Critical"
    },
    {
      title: "First Principles Thinking",
      content: "Boiling things down to their fundamental truths and reasoning up from there, rather than reasoning by analogy.",
      importance: "High"
    }
  ];
};