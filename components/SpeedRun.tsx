
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Zap, RotateCcw, Trophy, ChevronsRight, Flame, Activity, X, Check, Keyboard, ArrowLeft, ArrowRight, TrendingUp, Medal, LogOut, Disc } from 'lucide-react';
import { Language, User } from '../types';

interface SpeedRunProps {
  language: Language;
  user?: User;
  onExit: () => void;
  demoMode?: boolean; 
}

interface GameQuestion {
  q: string;
  a: boolean;
  cat: string;
  rationale: string;
}

interface Mistake {
  question: string;
  correctAnswer: boolean;
  userAnswer: boolean;
  rationale: string;
}

// --- EXTENDED QUESTION POOLS ---
const QUESTIONS_TR: GameQuestion[] = [
  { q: "Mitokondri hücrenin enerji santralidir.", a: true, cat: 'BIO', rationale: "Oksijenli solunum burada gerçekleşir ve ATP üretilir." },
  { q: "DNA'nın yapısında Urasil bazı bulunur.", a: false, cat: 'BIO', rationale: "Urasil sadece RNA'da bulunur, DNA'da Timin vardır." },
  { q: "Enzimler tepkimeden değişmeden çıkar.", a: true, cat: 'BIO', rationale: "Enzimler biyolojik katalizörlerdir, harcanmazlar." },
  { q: "Akciğer atardamarı kirli kan taşır.", a: true, cat: 'BIO', rationale: "İstisnai bir damardır, kalpten akciğere CO2'li kan götürür." },
  { q: "Mantar bir bitki türüdür.", a: false, cat: 'BIO', rationale: "Mantarlar ayrı bir alemdir, fotosentez yapamazlar." },
  { q: "Ribozom zarlı bir organeldir.", a: false, cat: 'BIO', rationale: "Ribozom zarsızdır ve tüm canlılarda bulunur." },
  { q: "Fotosentez sadece gündüz olur.", a: false, cat: 'BIO', rationale: "Yapay ışıkta da fotosentez gerçekleşebilir." },
  { q: "Su donduğunda hacmi artar.", a: true, cat: 'PHY', rationale: "Su donarken hidrojen bağları nedeniyle genleşen nadir sıvılardandır." },
  { q: "Işık sesten daha yavaş yayılır.", a: false, cat: 'PHY', rationale: "Işık hızı (300.000 km/s), ses hızından (340 m/s) çok daha fazladır." },
  { q: "Atomun çekirdeğinde proton ve elektron bulunur.", a: false, cat: 'CHE', rationale: "Çekirdekte proton ve nötron bulunur, elektronlar yörüdedir." },
  { q: "Ses boşlukta yayılmaz.", a: true, cat: 'PHY', rationale: "Ses mekanik bir dalgadır, maddesel ortam gerekir." },
  { q: "İstanbul 1453 yılında fethedilmiştir.", a: true, cat: 'HIS', rationale: "Fatih Sultan Mehmet tarafından fethedildi." },
  { q: "Malazgirt Savaşı 1923'te yapılmıştır.", a: false, cat: 'HIS', rationale: "1071 yılında yapılmıştır. 1923 Cumhuriyet'in ilanıdır." },
  { q: "Piri Reis haritacıdır.", a: true, cat: 'HIS', rationale: "Dünya haritası ve Kitab-ı Bahriye ile tanınır." },
  { q: "Pi sayısı tam olarak 3'tür.", a: false, cat: 'GEN', rationale: "Yaklaşık 3,14'tür, sonsuza kadar gider." },
];

const QUESTIONS_EN: GameQuestion[] = [
  { q: "Mitochondria is the powerhouse of the cell.", a: true, cat: 'BIO', rationale: "It generates most of the chemical energy needed." },
  { q: "Light travels faster than sound.", a: true, cat: 'PHY', rationale: "Light: ~300,000 km/s, Sound: ~340 m/s." },
  { q: "H2O is the chemical formula for salt.", a: false, cat: 'CHE', rationale: "H2O is water. Salt is NaCl." },
  { q: "Humans have 23 pairs of chromosomes.", a: true, cat: 'BIO', rationale: "46 chromosomes in total." },
  { q: "Electrons have a positive charge.", a: false, cat: 'CHE', rationale: "Electrons are negative, Protons are positive." },
  { q: "Water expands when it freezes.", a: true, cat: 'PHY', rationale: "Due to crystal lattice structure of ice." },
  { q: "Venus is the hottest planet.", a: true, cat: 'PHY', rationale: "Due to its thick atmosphere and greenhouse effect." },
  { q: "Sound cannot travel in a vacuum.", a: true, cat: 'PHY', rationale: "Sound requires a medium like air or water." },
  { q: "The Ottoman Empire fell in 1923.", a: true, cat: 'HIS', rationale: "Replaced by the Republic of Turkey." },
  { q: "The Amazon is the longest river.", a: false, cat: 'GEO', rationale: "The Nile is traditionally considered longer." },
  { q: "A tomato is a fruit.", a: true, cat: 'GEN', rationale: "Botanically, it develops from a flower ovary." },
  { q: "Iron rusts due to oxidation.", a: true, cat: 'CHE', rationale: "Reaction of iron and oxygen in the presence of water." },
];

export default function SpeedRun({ language, user, onExit, demoMode = false }: SpeedRunProps) {
  const isTr = language === 'tr';
  
  // Game State
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'running' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [activeQuestions, setActiveQuestions] = useState<GameQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  
  // Analytics State
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [catStats, setCatStats] = useState<Record<string, { total: number, correct: number }>>({});
  
  // Visual State
  const [combo, setCombo] = useState(0);
  const [feedbackColor, setFeedbackColor] = useState<'neutral' | 'correct' | 'wrong'>('neutral');

  // Load High Score
  useEffect(() => {
    if (!user) return;
    const key = `neurally_speedrun_highscore_${user.id}`;
    const savedScore = localStorage.getItem(key);
    if (savedScore) setHighScore(parseInt(savedScore, 10));
    else setHighScore(0);
  }, [user]);

  // Save High Score
  useEffect(() => {
    if (gameState === 'gameover' && user) {
        if (score > highScore) {
            setHighScore(score);
            const key = `neurally_speedrun_highscore_${user.id}`;
            localStorage.setItem(key, score.toString());
        }
    }
  }, [gameState, score, highScore, user]);

  // Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (gameState !== 'running') return;
        if (e.key === 'ArrowLeft') handleAnswer(false);
        if (e.key === 'ArrowRight') handleAnswer(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, currentQ]); 

  // Initialize
  useEffect(() => { loadQuestions(); }, [language, isTr]);

  const loadQuestions = () => {
    const pool = isTr ? [...QUESTIONS_TR] : [...QUESTIONS_EN];
    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setActiveQuestions(pool);
  };

  // Timer
  useEffect(() => {
    let interval: any;
    if (gameState === 'running' && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'running') {
      endGame();
    }
    return () => clearInterval(interval);
  }, [gameState, timeLeft]);

  const startGame = () => {
    loadQuestions();
    setScore(0);
    setTimeLeft(60);
    setCurrentQ(0);
    setCombo(0);
    setMistakes([]);
    setCatStats({});
    setGameState('countdown');
    setTimeout(() => setGameState('running'), 3000);
  };

  const endGame = () => {
    setGameState('gameover');
  };

  const updateStats = (category: string, isCorrect: boolean) => {
      setCatStats(prev => {
          const current = prev[category] || { total: 0, correct: 0 };
          return {
              ...prev,
              [category]: {
                  total: current.total + 1,
                  correct: current.correct + (isCorrect ? 1 : 0)
              }
          };
      });
  };

  const handleAnswer = (answer: boolean) => {
    const question = activeQuestions[currentQ % activeQuestions.length];
    const isCorrect = question.a === answer;
    
    updateStats(question.cat, isCorrect);

    if (isCorrect) {
       const comboMultiplier = Math.min(combo + 1, 5);
       setScore(s => s + (100 * comboMultiplier));
       setCombo(c => c + 1);
       setFeedbackColor('correct');
    } else {
       setCombo(0);
       setFeedbackColor('wrong');
       setMistakes(prev => [...prev, {
           question: question.q,
           correctAnswer: question.a,
           userAnswer: answer,
           rationale: question.rationale
       }]);
       setTimeLeft(t => Math.max(0, t - 5));
    }

    setTimeout(() => setFeedbackColor('neutral'), 300);
    setCurrentQ(prev => prev + 1);
  };

  const getRank = () => {
      if (score > 5000) return isTr ? "Nöral Mimar" : "Neural Architect";
      if (score > 3000) return isTr ? "Veri Gezgini" : "Data Drifter";
      if (score > 1000) return isTr ? "Bağlantı" : "Node";
      return isTr ? "Çevrimdışı" : "Offline Entity";
  };

  // --- RENDERING ---
  const bgColor = feedbackColor === 'correct' ? 'bg-emerald-950/30' : feedbackColor === 'wrong' ? 'bg-red-950/30' : 'bg-neutral-950';

  return (
    <div className={`relative w-full h-full overflow-hidden ${bgColor} flex flex-col items-center justify-center font-sans transition-colors duration-300`}>
      
      {/* 1. AMBIENT BACKGROUND (The Void) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-neutral-950"></div>
          {/* Subtle Radial Gradient to Focus Center */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(40,40,40,0.5)_0%,rgba(0,0,0,1)_100%)]"></div>
          
          {/* Animated Particles (Stars/Data) */}
          {gameState === 'running' && [...Array(20)].map((_, i) => (
             <motion.div 
               key={i}
               className="absolute w-1 h-1 bg-white rounded-full opacity-20"
               initial={{ 
                   x: Math.random() * window.innerWidth, 
                   y: Math.random() * window.innerHeight, 
                   scale: 0 
               }}
               animate={{ 
                   scale: [0, 1.5, 0],
                   opacity: [0, 0.5, 0],
                   y: [null, Math.random() * window.innerHeight] // Simple float effect
               }}
               transition={{ 
                   duration: Math.random() * 2 + 1, 
                   repeat: Infinity,
                   ease: "linear"
               }}
             />
          ))}
      </div>

      {/* 2. HUD LAYER */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-8">
          {/* Top Bar */}
          <div className="flex justify-between items-start">
             {/* Score */}
             <div className="text-white">
                 <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-1">SCORE</div>
                 <div className="text-4xl font-serif">{score.toLocaleString()}</div>
                 {combo > 1 && (
                     <motion.div 
                        initial={{ opacity: 0, y: 5 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="text-yellow-500 font-mono text-xs font-bold mt-1 flex items-center gap-1"
                     >
                         <Flame className="w-3 h-3" /> {combo}x COMBO
                     </motion.div>
                 )}
             </div>

             {/* Exit */}
             <button onClick={onExit} className="pointer-events-auto p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors border border-white/5">
                 <X className="w-5 h-5" />
             </button>
          </div>
          
          {/* Center Timer (Floating) */}
          {gameState === 'running' && (
              <div className="absolute top-8 left-1/2 -translate-x-1/2">
                  <div className={`px-4 py-2 rounded-full border border-white/10 bg-black/40 backdrop-blur-md font-mono text-xl ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                      {timeLeft}s
                  </div>
              </div>
          )}
      </div>

      {/* 3. GAMEPLAY LAYER */}
      <div className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center">
          
          {/* IDLE SCREEN */}
          {gameState === 'idle' && (
              <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="text-center"
              >
                  <div className="w-24 h-24 mx-auto mb-8 bg-black border border-white/20 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                      <Zap className="w-10 h-10 text-white" />
                  </div>
                  <h1 className="text-6xl md:text-8xl font-serif text-white mb-6 tracking-tighter">
                      Velocity
                  </h1>
                  <p className="text-gray-400 font-light text-lg mb-12 max-w-md mx-auto leading-relaxed">
                      {isTr 
                       ? "Hız ve hassasiyet testi. Yanlış cevaplar zamanı tüketir, doğrular akışı hızlandırır." 
                       : "Test of speed and precision. Mistakes consume time, accuracy accelerates flow."}
                  </p>
                  <button 
                     onClick={startGame}
                     className="px-10 py-5 bg-white text-black font-bold uppercase tracking-[0.2em] hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  >
                      {isTr ? 'BAŞLAT' : 'INITIALIZE'}
                  </button>
              </motion.div>
          )}

          {/* COUNTDOWN */}
          {gameState === 'countdown' && <Countdown />}

          {/* QUESTION CARD */}
          {gameState === 'running' && (
              <motion.div 
                 key={currentQ}
                 initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                 animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                 exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                 transition={{ duration: 0.3 }}
                 className="w-full text-center"
              >
                  {/* Category Tag */}
                  <div className="mb-6 inline-block px-3 py-1 border border-white/20 rounded-full text-[10px] font-mono text-white/60 uppercase tracking-widest">
                      DATA BLOCK: {activeQuestions[currentQ % activeQuestions.length].cat}
                  </div>

                  {/* Question Text */}
                  <h2 className="text-4xl md:text-6xl font-serif text-white leading-tight mb-16 drop-shadow-2xl">
                      {activeQuestions[currentQ % activeQuestions.length].q}
                  </h2>

                  {/* Visual Controls (Desktop/Mobile) */}
                  <div className="flex justify-center gap-8 w-full max-w-2xl mx-auto">
                      <button 
                         onClick={() => handleAnswer(false)}
                         className="flex-1 h-32 rounded-2xl border border-white/10 bg-white/5 hover:bg-red-500/10 hover:border-red-500/50 transition-all group relative overflow-hidden"
                      >
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <X className="w-8 h-8 text-white/50 group-hover:text-red-500 mb-2 transition-colors" />
                              <span className="font-bold text-white/50 group-hover:text-white uppercase tracking-widest text-sm">{isTr ? 'YANLIŞ' : 'FALSE'}</span>
                          </div>
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-white/20 font-mono hidden md:block">
                              ← LEFT
                          </div>
                      </button>

                      <button 
                         onClick={() => handleAnswer(true)}
                         className="flex-1 h-32 rounded-2xl border border-white/10 bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all group relative overflow-hidden"
                      >
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <Check className="w-8 h-8 text-white/50 group-hover:text-emerald-500 mb-2 transition-colors" />
                              <span className="font-bold text-white/50 group-hover:text-white uppercase tracking-widest text-sm">{isTr ? 'DOĞRU' : 'TRUE'}</span>
                          </div>
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-white/20 font-mono hidden md:block">
                              RIGHT →
                          </div>
                      </button>
                  </div>
              </motion.div>
          )}

          {/* GAME OVER REPORT */}
          {gameState === 'gameover' && (
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="w-full max-w-2xl bg-black border border-white/10 p-8 md:p-12 relative shadow-2xl"
             >
                 <div className="text-center mb-10">
                     <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Simulation Complete</p>
                     <h2 className="text-5xl font-serif text-white mb-2">{getRank()}</h2>
                     <div className="text-2xl font-mono text-white/80">{score.toLocaleString()} <span className="text-sm text-gray-500">PTS</span></div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 mb-8">
                     <div className="bg-white/5 p-4 text-center border border-white/10 rounded">
                         <div className="text-xs text-gray-500 uppercase mb-1">Accuracy</div>
                         <div className="text-xl text-white font-bold">{currentQ > 0 ? Math.round(((currentQ - mistakes.length) / currentQ) * 100) : 0}%</div>
                     </div>
                     <div className="bg-white/5 p-4 text-center border border-white/10 rounded">
                         <div className="text-xs text-gray-500 uppercase mb-1">Speed</div>
                         <div className="text-xl text-white font-bold">{(currentQ / 60).toFixed(1)} <span className="text-xs font-normal">Q/s</span></div>
                     </div>
                 </div>

                 {mistakes.length > 0 && (
                     <div className="border-t border-white/10 pt-6">
                         <h4 className="text-xs text-red-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                             <Activity className="w-3 h-3" /> Critical Errors Detected
                         </h4>
                         <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                             {mistakes.map((m, i) => (
                                 <div key={i} className="text-sm text-gray-400">
                                     <div className="text-white mb-1">"{m.question}"</div>
                                     <div className="text-xs opacity-70 border-l-2 border-red-500 pl-2">{m.rationale}</div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}

                 <div className="mt-8 flex gap-4">
                     <button onClick={startGame} className="flex-1 py-4 bg-white text-black font-bold uppercase tracking-widest hover:bg-gray-200">{isTr ? 'TEKRAR' : 'RETRY'}</button>
                     <button onClick={onExit} className="flex-1 py-4 border border-white/20 text-white font-bold uppercase tracking-widest hover:bg-white/10">{isTr ? 'ÇIKIŞ' : 'EXIT'}</button>
                 </div>
             </motion.div>
          )}

      </div>
    </div>
  );
}

function Countdown() {
  const [count, setCount] = useState(3);
  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [count]);

  return (
    <motion.div 
      key={count}
      initial={{ scale: 2, opacity: 0, filter: "blur(20px)" }}
      animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
      exit={{ scale: 0.5, opacity: 0, filter: "blur(10px)" }}
      className="text-9xl font-serif text-white font-bold"
    >
      {count > 0 ? count : "GO"}
    </motion.div>
  );
}
