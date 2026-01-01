import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, FileText, UploadCloud, Loader2, ArrowRight, CheckCircle2, Sparkles, Copy } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { Language } from '../types';

interface KeyPointsProps {
  language: Language;
}

interface Point {
  title: string;
  content: string;
  importance: 'High' | 'Medium' | 'Critical';
}

export default function KeyPoints({ language }: KeyPointsProps) {
  const [points, setPoints] = useState<Point[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTr = language === 'tr';

  const generateKeyPoints = async (content: string, isPdf: boolean = false, pdfData: string | null = null) => {
    if (!isPdf && (!content || content.length < 50)) {
        alert(isTr ? "Lütfen analiz için daha fazla içerik girin." : "Please enter more content for analysis.");
        return;
    }

    setIsProcessing(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const systemPrompt = isTr 
            ? "Verilen içerikten YKS sınavı için hayati önem taşıyan 'Püf Noktaları' çıkar. Öğrencilerin sık karıştırdığı yerlere, formüllere veya mantık hatalarına odaklan. 5 ile 8 arası madde çıkar. JSON formatında döndür."
            : "Extract critical 'Key Points' from the content for exam preparation. Focus on common misconceptions, formulas, or logic traps. Extract 5-8 points. Return as JSON.";

        let promptContent: any = "";
        let parts: any[] = [];

        if (isPdf && pdfData) {
            parts = [
                { inlineData: { mimeType: "application/pdf", data: pdfData } },
                { text: systemPrompt }
            ];
            promptContent = { parts: parts };
        } else {
            promptContent = `Content: "${content.substring(0, 20000)}"\n\n${systemPrompt}`;
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: promptContent,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            content: { type: Type.STRING },
                            importance: { type: Type.STRING, enum: ["High", "Medium", "Critical"] }
                        },
                        required: ["title", "content", "importance"]
                    }
                }
            }
        });

        if (response.text) {
            const data = JSON.parse(response.text) as Point[];
            setPoints(data);
        }
    } catch (error) {
        console.error(error);
        alert("AI Error.");
    } finally {
        setIsProcessing(false);
    }
  };

  // --- FILE HANDLING ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      processFile(file);
  };

  const processFile = (file: File) => {
      if (file.type === 'application/pdf') {
          if (file.size > 20 * 1024 * 1024) { alert("Max 20MB PDF"); return; }
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = (reader.result as string).split(',')[1];
              generateKeyPoints("", true, base64String);
          };
          reader.readAsDataURL(file);
      } else {
          const reader = new FileReader();
          reader.onload = (e) => setInputText(e.target?.result as string);
          reader.readAsText(file);
      }
  };

  // --- DRAG & DROP ---
  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
  };

  return (
    <div className="p-8 lg:p-12 max-w-[1600px] mx-auto min-h-screen">
      
      {/* HEADER */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
         <div>
            <h1 className="font-serif text-6xl text-black mb-4 tracking-tighter">
               {isTr ? 'Püf Noktalar' : 'Key Points'}
            </h1>
            <p className="text-gray-400 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
               <Lightbulb className="w-3 h-3" />
               {isTr ? 'Hafıza Damıtma Modülü' : 'Knowledge Distillation Module'}
            </p>
         </div>
         <button 
            onClick={() => { setPoints([]); setInputText(""); }}
            className="px-6 py-3 border border-gray-200 text-gray-500 text-xs font-bold uppercase tracking-widest hover:border-black hover:text-black transition-all"
         >
            {isTr ? 'Sıfırla' : 'Reset Context'}
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
         
         {/* LEFT: INPUT AREA */}
         <div className="lg:col-span-5 space-y-6">
            <div 
               className={`
                  relative h-[400px] bg-white border transition-all duration-300 group
                  ${isDragging ? 'border-black bg-gray-50 scale-[1.01]' : 'border-gray-200 focus-within:border-black'}
               `}
               onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
               onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
               onDrop={handleDrop}
            >
               <textarea 
                  className="w-full h-full p-8 resize-none focus:outline-none bg-transparent font-serif text-lg leading-relaxed placeholder:text-gray-300 relative z-10"
                  placeholder={isTr ? "Notlarını buraya yapıştır veya bir PDF dosyası sürükle..." : "Paste notes here or drag a PDF..."}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isProcessing}
               />
               
               {/* Decorative Corners */}
               <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-black pointer-events-none opacity-20 group-hover:opacity-100 transition-opacity"></div>
               <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-black pointer-events-none opacity-20 group-hover:opacity-100 transition-opacity"></div>
               
               {/* Drag Overlay */}
               <AnimatePresence>
                  {isDragging && (
                     <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/90 z-20 flex flex-col items-center justify-center text-white"
                     >
                        <UploadCloud className="w-12 h-12 mb-4 animate-bounce" />
                        <span className="font-serif text-2xl">Drop to Analyze</span>
                     </motion.div>
                  )}
               </AnimatePresence>
            </div>

            <div className="flex gap-4">
                <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="flex-1 py-4 border border-dashed border-gray-300 text-gray-400 hover:border-black hover:text-black transition-all font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                   <UploadCloud className="w-4 h-4" /> {isTr ? 'Dosya Seç' : 'Select File'}
                   <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.pdf" onChange={handleFileUpload} />
                </button>
                <button 
                   onClick={() => generateKeyPoints(inputText)}
                   disabled={isProcessing || (!inputText && points.length === 0)}
                   className="flex-[2] py-4 bg-black text-white font-bold uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                   {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                   {isTr ? 'Özeti Çıkar' : 'Extract Points'}
                </button>
            </div>
         </div>

         {/* RIGHT: OUTPUT LIST */}
         <div className="lg:col-span-7">
            {points.length === 0 ? (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg text-center p-12">
                   <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                      <FileText className="w-6 h-6 text-gray-300" />
                   </div>
                   <h3 className="font-serif text-xl text-gray-400 mb-2">
                      {isTr ? 'Veri Bekleniyor' : 'Awaiting Data'}
                   </h3>
                   <p className="text-sm text-gray-300 max-w-xs mx-auto">
                      {isTr ? 'Yapay zeka, yüklediğin içerikteki en kritik noktaları buraya listeleyecektir.' : 'AI will list the most critical points from your content here.'}
                   </p>
                </div>
            ) : (
                <div className="space-y-6">
                   {points.map((point, idx) => (
                      <motion.div 
                         key={idx}
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         transition={{ delay: idx * 0.1 }}
                         className="bg-white border border-gray-200 p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:border-black transition-all group relative"
                      >
                         <div className="flex justify-between items-start mb-4">
                            <span className={`
                               px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border
                               ${point.importance === 'Critical' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-600 border-gray-200'}
                            `}>
                               {point.importance} Priority
                            </span>
                            <span className="font-mono text-xs text-gray-300">#{String(idx + 1).padStart(2,'0')}</span>
                         </div>
                         
                         <h3 className="font-serif text-2xl mb-3 group-hover:text-black transition-colors">
                            {point.title}
                         </h3>
                         <p className="text-gray-600 leading-relaxed font-light text-lg">
                            {point.content}
                         </p>

                         {/* Quick Copy Action */}
                         <button 
                            onClick={() => navigator.clipboard.writeText(`${point.title}: ${point.content}`)}
                            className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-full"
                            title="Copy"
                         >
                            <Copy className="w-4 h-4 text-gray-500" />
                         </button>
                      </motion.div>
                   ))}
                </div>
            )}
         </div>

      </div>
    </div>
  );
}