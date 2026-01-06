
import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, animate, AnimatePresence } from 'framer-motion';
import { Zap, Trophy, ArrowRight, Sparkles, Plus, Loader2, Brain, Activity, Search, Users, Network, Globe, Terminal, Cpu, FileUp, UploadCloud, FileType, AlertTriangle, ShieldAlert, Check, X, CreditCard, Lock, Crown, Bitcoin, Wallet, QrCode, Copy, Shield, Flame, Target, Star, Medal, Crosshair } from 'lucide-react';
import { Type, Schema } from "@google/genai";
import { createAIClient, generateFallbackQuestions } from '../utils/ai'; 
import { checkRateLimit, sanitizeInput, getRemainingQuota } from '../utils/security';
import { Question, User, Language, Badge, DailyQuest } from '../types';
import { translations } from '../utils/translations';
import Marquee from './ui/Marquee';

interface DashboardProps {
  onQuestionsGenerated: (questions: Question[]) => void;
  user: User;
  language: Language;
}

// Visual Component for Badge
const BadgeIcon = ({ icon, locked }: { icon: string, locked: boolean }) => {
    const IconMap: Record<string, any> = { zap: Zap, clock: Activity, globe: Globe, crown: Crown };
    const LucideIcon = IconMap[icon] || Star;
    
    return (
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${locked ? 'bg-gray-50 border-gray-200 text-gray-300' : 'bg-black text-white border-black shadow-lg'}`}>
            {locked ? <Lock className="w-5 h-5" /> : <LucideIcon className="w-6 h-6" />}
        </div>
    );
};

export default function Dashboard({ onQuestionsGenerated, user, language }: DashboardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isDragging, setIsDragging] = useState(false); 
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);
  
  // Rate Limit State
  const [quotaRemaining, setQuotaRemaining] = useState(getRemainingQuota('generate_quiz'));
  
  // Gamification Stats (Derived from User)
  const stats = user.stats || {
      level: 1, currentXP: 0, nextLevelXP: 1000, streakDays: 0, totalFocusMinutes: 0, rankTitle: "Initiate", badges: [], dailyQuests: []
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language].dashboard;

  const currentDate = new Date().toLocaleDateString('en-GB').toUpperCase(); 

  const generateQuestions = async (content: string, isPdf: boolean = false, pdfData: string | null = null) => {
    // 1. SECURITY CHECK: Rate Limit
    if (user.tier === 'Free') { // Free users are rate limited
        const limitCheck = checkRateLimit('generate_quiz');
        if (!limitCheck.allowed) {
            alert(language === 'tr' 
                ? `Günlük limit aşıldı. Neural Guard protokolü isteği reddetti. Bekleme süresi: ${limitCheck.waitTime}` 
                : `Daily limit exceeded. Neural Guard protocol blocked request. Reset in: ${limitCheck.waitTime}`);
            return;
        }
        setQuotaRemaining(prev => prev - 1);
    }

    // 2. SECURITY CHECK: Input Sanitization
    const safeContent = sanitizeInput(content);

    if (!isPdf && (!safeContent || safeContent.length < 50)) {
      alert("Lütfen en az 50 karakterlik bir metin girin.");
      return;
    }

    setIsProcessing(true);
    setErrorState(null);
    setIsMockMode(false);

    try {
      const ai = createAIClient();
      let promptContent: any = "";
      let parts: any[] = [];
      
      const jsonStructure = `
      [
        {
          "id": 1,
          "topicTag": "Subject",
          "text": "Question text here?",
          "options": [
            { "id": "a", "text": "Option A", "isCorrect": false },
            { "id": "b", "text": "Option B", "isCorrect": true }
          ],
          "rationale": "Explanation here."
        }
      ]
      `;

      // UPDATED PROMPT: More General
      const systemPrompt = `Generate 10 Active Recall multiple-choice questions based strictly on the provided content. 
      CRITICAL INSTRUCTION: Detect the language of the provided content (e.g. Turkish or English) and generate ALL output (questions, options, rationales) IN THAT SAME LANGUAGE.
      Focus on critical thinking, deep analysis, and conceptual understanding suitable for an academic level.
      Return ONLY a raw JSON array. Do not wrap in markdown code blocks.
      Strictly follow this JSON structure for every item: ${jsonStructure}`;

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
          promptContent = `Content: "${safeContent}"\n\n${systemPrompt}`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptContent,
        config: { responseMimeType: "application/json" }
      });
      
      if (response.text) {
          const cleanText = response.text.replace(/```json\n?|\n?```/g, "").trim();
          const generatedQuestions = JSON.parse(cleanText) as Question[];
          onQuestionsGenerated(generatedQuestions.map((q, index) => ({ ...q, id: index + 1 })));
      } else {
          throw new Error("No text returned from AI");
      }
    } catch (error: any) {
      console.warn("AI Engine Failed, switching to fallback.", error);
      setIsMockMode(true);
      setTimeout(() => {
          const mockQuestions = generateFallbackQuestions();
          onQuestionsGenerated(mockQuestions);
          setIsProcessing(false);
      }, 1500);
      return; 
    }
  };

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

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } };

  // Calculate Level Progress
  const progressPercent = (stats.currentXP / stats.nextLevelXP) * 100;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-8 lg:p-12 max-w-[1920px] mx-auto min-h-screen relative"
    >
      
      {/* 1. TOP MARQUEE */}
      <motion.div variants={itemVariants} className="mb-8 border-y border-gray-100 py-2 bg-white/50 backdrop-blur-sm">
         <Marquee 
            text={`NEURAL OS // USER: ${user.name.toUpperCase()} // LEVEL: ${stats.level} // SYNC: ACTIVE // NEURAL GUARD: MONITORING`} 
            className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]"
            repeat={4}
         />
      </motion.div>

      {/* 2. GAMIFIED HEADER SECTION */}
      <motion.div variants={itemVariants} className="mb-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* USER IDENTITY CARD */}
          <div className="lg:col-span-8 flex flex-col justify-end">
              <div className="flex items-end gap-6 mb-6">
                  <div className="relative">
                      <div className="w-24 h-24 rounded-2xl bg-black overflow-hidden border-2 border-white shadow-xl">
                          <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover opacity-90" />
                      </div>
                      <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm font-serif font-bold text-lg">
                          {stats.level}
                      </div>
                  </div>
                  <div>
                      <div className="flex items-center gap-3 mb-1">
                          <h1 className="font-serif text-5xl text-black tracking-tighter">{user.name}</h1>
                          {user.tier === 'Fellow' && <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500" />}
                      </div>
                      <p className="text-gray-400 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                          <Medal className="w-3 h-3 text-black" /> {stats.rankTitle}
                      </p>
                  </div>
              </div>
              
              {/* XP Progress Bar */}
              <div className="w-full max-w-2xl">
                  <div className="flex justify-between text-[10px] font-mono font-bold uppercase tracking-widest mb-2 text-gray-500">
                      <span>XP Progress</span>
                      <span>{stats.currentXP} / {stats.nextLevelXP} XP</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${progressPercent}%` }}
                         transition={{ duration: 1, ease: "circOut" }}
                         className="h-full bg-black rounded-full"
                      />
                  </div>
              </div>
          </div>

          {/* QUICK STATS & STREAK */}
          <div className="lg:col-span-4 flex gap-4 items-end">
              <div className="flex-1 bg-white border border-gray-200 p-6 rounded-2xl shadow-sm group hover:border-orange-200 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><Flame className="w-5 h-5" /></div>
                      <span className="text-[10px] font-bold text-gray-300 uppercase">Day Streak</span>
                  </div>
                  <div className="text-4xl font-serif text-black">{stats.streakDays}</div>
                  <div className="text-[10px] text-gray-400 mt-1 font-mono">Keep the fire burning</div>
              </div>

              <div className="flex-1 bg-white border border-gray-200 p-6 rounded-2xl shadow-sm group hover:border-purple-200 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Activity className="w-5 h-5" /></div>
                      <span className="text-[10px] font-bold text-gray-300 uppercase">Focus Time</span>
                  </div>
                  <div className="text-4xl font-serif text-black">{Math.floor(stats.totalFocusMinutes / 60)}h</div>
                  <div className="text-[10px] text-gray-400 mt-1 font-mono">{stats.totalFocusMinutes % 60}m this week</div>
              </div>
          </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        
        {/* LEFT COLUMN: ACTION & QUESTS */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* AI INPUT SECTION */}
          <motion.div variants={itemVariants} className="relative group">
             {/* Header Label */}
             <div className="flex items-center justify-between mb-4 pl-1">
                 <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black flex items-center gap-2">
                    <Cpu className="w-3 h-3" /> {t.inputLabel} / Source Data
                 </label>
                 <span className="text-[10px] font-mono text-gray-400">{inputText.length} chars</span>
             </div>

             <AnimatePresence>
                 {isMockMode && (
                     <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mb-4 bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3"
                     >
                        <ShieldAlert className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-yellow-800 font-mono">
                            <span className="font-bold">SİMÜLASYON MODU AKTİF:</span> API bağlantısı başarısız oldu.
                        </div>
                     </motion.div>
                 )}
             </AnimatePresence>

             {/* TEXT AREA */}
             <div 
                className={`relative z-10 transition-all duration-300 ${isDragging ? 'scale-[1.01]' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
             >
                <textarea 
                  className={`w-full h-[350px] bg-white border p-8 resize-none focus:outline-none focus:ring-1 focus:ring-black/5 transition-all duration-300 font-serif text-xl text-black placeholder-gray-300 leading-relaxed z-10 relative shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] ${isDragging ? 'border-black' : 'border-gray-200 focus:border-black'} ${errorState ? 'border-red-200' : ''}`}
                  placeholder={t.placeholder}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isProcessing}
                />

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
                    px-10 py-4 bg-black text-white text-xs font-bold tracking-[0.2em] uppercase transition-all flex items-center gap-3 shadow-sharp hover:shadow-none hover:translate-x-1 hover:translate-y-1
                    ${isProcessing ? 'opacity-80' : ''}
                  `}
                >
                   {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                   {isProcessing ? t.processing : t.generate}
                </motion.button>
             </div>
          </motion.div>

          {/* DAILY QUESTS */}
          <motion.div variants={itemVariants}>
              <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-2">
                  <Target className="w-4 h-4 text-black" />
                  <h3 className="font-serif text-xl font-medium">Daily Neural Calibration</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                  {stats.dailyQuests.map(quest => (
                      <div key={quest.id} className="bg-white border border-gray-100 p-4 rounded-xl flex items-center justify-between group hover:border-black transition-colors">
                          <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${quest.completed ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                  {quest.completed ? <Check className="w-5 h-5" /> : <Crosshair className="w-5 h-5" />}
                              </div>
                              <div>
                                  <h4 className={`font-serif text-lg ${quest.completed ? 'line-through text-gray-300' : 'text-black'}`}>{quest.title}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-black rounded-full" style={{ width: `${(quest.current / quest.target) * 100}%` }}></div>
                                      </div>
                                      <span className="text-[10px] font-mono text-gray-400">{quest.current}/{quest.target}</span>
                               