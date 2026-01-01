import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, animate, AnimatePresence } from 'framer-motion';
import { Zap, Trophy, ArrowRight, Sparkles, Plus, Loader2, Brain, Activity, Search, Users, Network, Globe, Terminal, Cpu, FileUp, UploadCloud, FileType, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Type, Schema } from "@google/genai";
import { createAIClient, generateFallbackQuestions } from '../utils/ai'; 
import { Question, User, Language } from '../types';
import { translations } from '../utils/translations';
import Marquee from './ui/Marquee';

interface DashboardProps {
  onQuestionsGenerated: (questions: Question[]) => void;
  user: User;
  language: Language;
}

// Counting Animation Component
const Counter = ({ from, to, duration = 2.5 }: { from: number; to: number; duration?: number }) => {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(from, to, {
      duration: duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(value) {
        node.textContent = value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      }
    });

    return () => controls.stop();
  }, [from, to, duration]);

  return <span ref={nodeRef} />;
};

export default function Dashboard({ onQuestionsGenerated, user, language }: DashboardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isDragging, setIsDragging] = useState(false); // Drag state
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language].dashboard;

  // Live Stats Simulation
  const [activeUsers, setActiveUsers] = useState(1240);
  const [totalSynapses, setTotalSynapses] = useState(843921);

  const currentDate = new Date().toLocaleDateString('en-GB').toUpperCase(); // DD/MM/YYYY format

  useEffect(() => {
    // Simulate User Fluctuation
    const userInterval = setInterval(() => {
      setActiveUsers(prev => prev + (Math.random() > 0.5 ? Math.floor(Math.random() * 3) : -Math.floor(Math.random() * 2)));
    }, 3000);

    // Simulate Synapses Growing Fast
    const synapseInterval = setInterval(() => {
      setTotalSynapses(prev => prev + Math.floor(Math.random() * 15));
    }, 800);

    return () => {
      clearInterval(userInterval);
      clearInterval(synapseInterval);
    };
  }, []);

  const generateQuestions = async (content: string, isPdf: boolean = false, pdfData: string | null = null) => {
    if (!isPdf && (!content || content.length < 50)) {
      alert("Lütfen en az 50 karakterlik bir metin girin.");
      return;
    }

    setIsProcessing(true);
    setErrorState(null);
    setIsMockMode(false);

    try {
      // Use centralized client
      const ai = createAIClient();

      let promptContent: any = "";
      let parts: any[] = [];
      
      const systemPrompt = "Generate 10 Active Recall multiple-choice questions based strictly on the provided content. Focus on logic, causal relationships, and common misconceptions. Return ONLY JSON.";

      if (isPdf && pdfData) {
          parts = [
              {
                  inlineData: {
                      mimeType: "application/pdf",
                      data: pdfData
                  }
              },
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
                id: { type: Type.INTEGER },
                text: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: { id: { type: Type.STRING }, text: { type: Type.STRING }, isCorrect: { type: Type.BOOLEAN } },
                    required: ["id", "text", "isCorrect"]
                  },
                },
                rationale: { type: Type.STRING },
                topicTag: { type: Type.STRING },
              },
              required: ["id", "text", "options", "rationale", "topicTag"]
            }
          }
        }
      });
      
      if (response.text) {
          const generatedQuestions = JSON.parse(response.text) as Question[];
          onQuestionsGenerated(generatedQuestions.map((q, index) => ({ ...q, id: index + 1 })));
      } else {
          throw new Error("No text returned from AI");
      }
    } catch (error: any) {
      console.warn("AI Engine Failed, switching to fallback.", error);
      
      // FALLBACK MECHANISM: If API fails (Quota, Key, Network), use Mock Data
      // This ensures the app never looks "broken" to the user.
      setIsMockMode(true);
      
      // Simulate network delay for realism
      setTimeout(() => {
          const mockQuestions = generateFallbackQuestions();
          onQuestionsGenerated(mockQuestions);
          setIsProcessing(false);
      }, 1500);

      // Don't set errorState, just log it. We want a seamless failover.
      return; 
    }
  };

  // Helper to process PDF files (used by Input and Drop)
  const processPdfFile = (file: File) => {
      if (file.size > 20 * 1024 * 1024) {
          alert("PDF boyutu 20MB'dan küçük olmalıdır.");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          generateQuestions("", true, base64String);
      };
      reader.readAsDataURL(file);
  };

  // Helper to process Text files
  const processTextFile = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => { 
          const text = e.target?.result as string;
          setInputText(text); 
      };
      reader.readAsText(file);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     if (file.type === "text/plain") processTextFile(file);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      processPdfFile(file);
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      if (file.type === 'application/pdf') {
          processPdfFile(file);
      } else if (file.type === 'text/plain') {
          processTextFile(file);
      } else {
          alert("Sadece PDF veya TXT dosyaları desteklenmektedir.");
      }
  };

  // Stagger Container
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-8 lg:p-12 max-w-[1920px] mx-auto min-h-screen"
    >
      
      {/* 1. TOP MARQUEE - Integrated Style */}
      <motion.div variants={itemVariants} className="mb-8 border-y border-gray-100 py-2 bg-white/50 backdrop-blur-sm">
         <Marquee 
            text={`NEURALLY OS v2.5 // ARCHITECTURE: ACTIVE RECALL // DATE: ${currentDate} // SYNC: 12ms // OPTIMIZATION: 99.8% //`} 
            className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]"
            repeat={4}
         />
      </motion.div>

      {/* 2. LIVE DASHBOARD HEAD - Split Design */}
      <motion.div variants={itemVariants} className="mb-16 flex flex-col md:flex-row justify-between items-end gap-8">
        <div>
          <h1 className="font-serif text-8xl text-black mb-4 tracking-tighter leading-[0.8]">
            {t.title}
          </h1>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1.5 border border-black rounded-full bg-white">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-black">System Online</span>
             </div>
             <p className="text-gray-400 font-mono text-xs uppercase tracking-widest">
               {new Date().toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
             </p>
          </div>
        </div>
        
        {/* Right Stats Block */}
        <div className="flex gap-8">
           <div className="text-right hidden md:block">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{language === 'tr' ? 'Aktif Nöronlar' : 'Active Nodes'}</p>
              <p className="font-mono text-xl text-black tabular-nums">
                 <Counter from={1000} to={activeUsers} duration={1} />
              </p>
           </div>
           <div className="text-right hidden md:block">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{language === 'tr' ? 'Veri Akışı' : 'Data Stream'}</p>
              <p className="font-mono text-xl text-black tabular-nums">
                 <Counter from={800000} to={totalSynapses} duration={0.5} /> ops/s
              </p>
           </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        
        {/* INPUT SECTION - "The Neural Core" */}
        <div className="lg:col-span-8 space-y-8">
          
          <motion.div variants={itemVariants} className="relative group">
             {/* Header Label */}
             <div className="flex items-center justify-between mb-4 pl-1">
                 <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black flex items-center gap-2">
                    <Cpu className="w-3 h-3" /> {t.inputLabel} / Source Data
                 </label>
                 <span className="text-[10px] font-mono text-gray-400">{inputText.length} chars</span>
             </div>

             {/* MOCK MODE NOTIFICATION */}
             <AnimatePresence>
                 {isMockMode && (
                     <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mb-4 bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3"
                     >
                        <ShieldAlert className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-yellow-800 font-mono">
                            <span className="font-bold">SİMÜLASYON MODU AKTİF:</span> API bağlantısı başarısız oldu. Lütfen geçerli bir API Anahtarı (Gemini veya Groq) girdiğinizden emin olun.
                        </div>
                     </motion.div>
                 )}
             </AnimatePresence>

             {/* DRAG AND DROP ZONE / TEXT AREA */}
             <div 
                className={`relative z-10 transition-all duration-300 ${isDragging ? 'scale-[1.01]' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
             >
                <textarea 
                  className={`w-full h-[450px] bg-white border p-8 resize-none focus:outline-none focus:ring-1 focus:ring-black/5 transition-all duration-300 font-serif text-xl text-black placeholder-gray-300 leading-relaxed z-10 relative shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] ${isDragging ? 'border-black' : 'border-gray-200 focus:border-black'} ${errorState ? 'border-red-200' : ''}`}
                  placeholder={t.placeholder}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isProcessing}
                />

                {/* DRAG OVERLAY */}
                <AnimatePresence>
                  {isDragging && (
                    <motion.div 
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       exit={{ opacity: 0 }}
                       className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center border-2 border-white border-dashed m-2"
                    >
                       <UploadCloud className="w-16 h-16 text-white mb-4 animate-bounce" />
                       <h3 className="text-white font-serif text-3xl mb-2">Drop Data</h3>
                       <p className="text-gray-400 font-mono text-xs uppercase tracking-widest">
                          PDF or TXT Accepted
                       </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Decorative Corners */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-black pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-black pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-black pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-black pointer-events-none"></div>
             </div>
             
             {/* Action Bar */}
             <div className="flex justify-between items-center mt-6">
                <div className="flex items-center gap-4">
                    <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
                    >
                    <div className="w-6 h-6 border border-gray-200 group-hover:border-black flex items-center justify-center transition-colors rounded-sm">
                        <Plus className="w-3 h-3" />
                    </div>
                    <span>{t.upload}</span>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".txt" onChange={handleFileUpload} />
                    </button>

                    <button 
                    onClick={() => pdfInputRef.current?.click()}
                    className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
                    >
                    <div className="w-6 h-6 border border-gray-200 group-hover:border-black flex items-center justify-center transition-colors rounded-sm">
                        <FileUp className="w-3 h-3" />
                    </div>
                    <span>PDF Analiz</span>
                    <input type="file" ref={pdfInputRef} className="hidden" accept="application/pdf" onChange={handlePdfUpload} />
                    </button>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => generateQuestions(inputText)}
                  disabled={isProcessing || (inputText.length < 10 && !isProcessing)}
                  className={`
                    px-12 py-5 bg-black text-white text-xs font-bold tracking-[0.2em] uppercase transition-all flex items-center gap-3 shadow-sharp hover:shadow-none hover:translate-x-1 hover:translate-y-1
                    ${isProcessing ? 'opacity-80' : ''}
                  `}
                >
                   {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                   {isProcessing ? t.processing : t.generate}
                </motion.button>
             </div>
          </motion.div>

          {/* Quick Stats Row */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-100">
             {[
               { icon: Zap, label: t.streak, value: 0, sub: "DAYS" },
               { icon: Trophy, label: t.points, value: 0, sub: "XP" },
               { icon: Activity, label: "FOCUS", value: "0%", sub: "EFFICIENCY" },
             ].map((stat, i) => (
                <div key={i} className="group p-6 border border-transparent hover:border-gray-100 hover:bg-gray-50/50 transition-all duration-300">
                   <div className="flex items-center gap-2 mb-2 text-gray-400 group-hover:text-black transition-colors">
                      <stat.icon className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{stat.label}</span>
                   </div>
                   <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-serif text-black">{stat.value}</span>
                      <span className="text-[10px] font-mono text-gray-400">{stat.sub}</span>
                   </div>
                </div>
             ))}
          </motion.div>

        </div>

        {/* RIGHT SIDEBAR - "Activity Feed" */}
        <motion.div variants={itemVariants} className="lg:col-span-4 pl-0 lg:pl-8 border-l border-gray-100">
           <div className="flex items-center justify-between mb-8">
               <h3 className="font-serif text-2xl flex items-center gap-2">
                 {t.recent}
               </h3>
               <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
           </div>
           
           <div className="relative min-h-[300px] flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg p-8 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Activity className="w-6 h-6 text-gray-300" />
              </div>
              <h4 className="font-bold text-sm text-gray-400 mb-2">Sessizlik.</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                  Henüz bir aktivite kaydedilmedi. İlk aktif hatırlama testini başlatmak için sol taraftaki alana ders notlarını veya bir PDF yükle.
              </p>
           </div>

           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: 0.5 }}
             className="mt-8 bg-black text-white p-8 relative overflow-hidden group cursor-pointer"
           >
              <div className="absolute inset-0 bg-neutral-800 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
              <div className="relative z-10 flex justify-between items-start">
                <div>
                    <h4 className="font-serif text-xl mb-2 flex items-center gap-2">
                       {t.upgrade}
                    </h4>
                    <p className="text-xs text-gray-400 mb-0 leading-relaxed font-mono uppercase tracking-wide">
                      Pro License Required
                    </p>
                </div>
                <ArrowRight className="w-5 h-5 text-white" />
              </div>
           </motion.div>
        </motion.div>

      </div>
    </motion.div>
  );
}