import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Zap, AlertTriangle, RotateCcw, Trophy, ChevronsRight, Brain, Flame, Activity, BarChart3, X, Check, Keyboard, ArrowLeft, ArrowRight, TrendingUp, Medal, LogOut } from 'lucide-react';
import { Language, User } from '../types';

interface SpeedRunProps {
  language: Language;
  user?: User;
  onExit: () => void;
  demoMode?: boolean; // New Prop
}

interface GameQuestion {
  q: string;
  a: boolean;
  cat: string; // Category: BIO, HIS, PHY, GEN, CHE
  rationale: string;
}

interface Mistake {
  question: string;
  correctAnswer: boolean;
  userAnswer: boolean;
  rationale: string;
}

// --- EXTENDED QUESTION POOLS WITH CATEGORIES ---

const QUESTIONS_TR: GameQuestion[] = [
  // Biyoloji
  { q: "Mitokondri hücrenin enerji santralidir.", a: true, cat: 'BIO', rationale: "Oksijenli solunum burada gerçekleşir ve ATP üretilir." },
  { q: "DNA'nın yapısında Urasil bazı bulunur.", a: false, cat: 'BIO', rationale: "Urasil sadece RNA'da bulunur, DNA'da Timin vardır." },
  { q: "Enzimler tepkimeden değişmeden çıkar.", a: true, cat: 'BIO', rationale: "Enzimler biyolojik katalizörlerdir, harcanmazlar." },
  { q: "Akciğer atardamarı kirli kan taşır.", a: true, cat: 'BIO', rationale: "İstisnai bir damardır, kalpten akciğere CO2'li kan götürür." },
  { q: "Mantar bir bitki türüdür.", a: false, cat: 'BIO', rationale: "Mantarlar ayrı bir alemdir, fotosentez yapamazlar." },
  { q: "Ribozom zarlı bir organeldir.", a: false, cat: 'BIO', rationale: "Ribozom zarsızdır ve tüm canlılarda bulunur." },
  { q: "Fotosentez sadece gündüz olur.", a: false, cat: 'BIO', rationale: "Yapay ışıkta da fotosentez gerçekleşebilir." },
  { q: "O grubu kan genel vericidir.", a: true, cat: 'BIO', rationale: "Antijen içermediği için diğer gruplara verilebilir." },
  // Fizik & Kimya
  { q: "Su donduğunda hacmi artar.", a: true, cat: 'PHY', rationale: "Su donarken hidrojen bağları nedeniyle genleşen nadir sıvılardandır." },
  { q: "Işık sesten daha yavaş yayılır.", a: false, cat: 'PHY', rationale: "Işık hızı (300.000 km/s), ses hızından (340 m/s) çok daha fazladır." },
  { q: "Bir kilo demir, bir kilo pamuktan ağırdır.", a: false, cat: 'PHY', rationale: "Kütleleri eşittir (1kg = 1kg). Hacimleri farklıdır." },
  { q: "Atomun çekirdeğinde proton ve elektron bulunur.", a: false, cat: 'CHE', rationale: "Çekirdekte proton ve nötron bulunur, elektronlar yörüdedir." },
  { q: "Asitlerin pH değeri 7'den küçüktür.", a: true, cat: 'CHE', rationale: "0-7 arası asit, 7 nötr, 7-14 arası bazdır." },
  { q: "Ses boşlukta yayılmaz.", a: true, cat: 'PHY', rationale: "Ses mekanik bir dalgadır, maddesel ortam gerekir." },
  { q: "Güneş bir yıldızdır.", a: true, cat: 'PHY', rationale: "Güneş sistemimizin merkezindeki orta büyüklükte bir yıldızdır." },
  { q: "Altın paslanmaz.", a: true, cat: 'CHE', rationale: "Altın soy bir metaldir, oksijenle kolay tepkimeye girmez." },
  // Tarih & Coğrafya
  { q: "Türkiye'nin en yüksek dağı Ağrı Dağı'dır.", a: true, cat: 'GEO', rationale: "5137 metre ile en yüksek zirvedir." },
  { q: "İstanbul 1453 yılında fethedilmiştir.", a: true, cat: 'HIS', rationale: "Fatih Sultan Mehmet tarafından fethedildi." },
  { q: "Malazgirt Savaşı 1923'te yapılmıştır.", a: false, cat: 'HIS', rationale: "1071 yılında yapılmıştır. 1923 Cumhuriyet'in ilanıdır." },
  { q: "Türkiye'nin başkenti İstanbul'dur.", a: false, cat: 'GEO', rationale: "Başkent Ankara'dır." },
  { q: "Piri Reis haritacıdır.", a: true, cat: 'HIS', rationale: "Dünya haritası ve Kitab-ı Bahriye ile tanınır." },
  { q: "Çin Seddi uzaydan çıplak gözle görülür.", a: false, cat: 'GEN', rationale: "Bu yaygın bir efsanedir, çıplak gözle görülemez." },
  { q: "Kutup ayıları Güney Kutbu'nda yaşar.", a: false, cat: 'GEO', rationale: "Kutup ayıları Kuzey Kutbu'nda (Arktik) yaşar." },
  { q: "Lozan Antlaşması Türkiye'nin tapusudur.", a: true, cat: 'HIS', rationale: "Bağımsızlığın uluslararası tescilidir." },
  // Genel
  { q: "Pi sayısı tam olarak 3'tür.", a: false, cat: 'GEN', rationale: "Yaklaşık 3,14'tür, sonsuza kadar gider." },
  { q: "Satrançta en önemli taş Şah'tır.", a: true, cat: 'GEN', rationale: "Şah düşerse oyun biter." },
  { q: "Google bir arama motorudur.", a: true, cat: 'GEN', rationale: "Web sayfalarını indeksleyen bir sistemdir." },
  { q: "Balıklar gözlerini kırpar.", a: false, cat: 'BIO', rationale: "Balıkların çoğunun göz kapağı yoktur." },
  { q: "Bir yıl 365 gün 6 saattir.", a: true, cat: 'GEN', rationale: "Bu yüzden 4 yılda bir Şubat 29 çeker." },
];

const QUESTIONS_EN: GameQuestion[] = [
  // Science
  { q: "Mitochondria is the powerhouse of the cell.", a: true, cat: 'BIO', rationale: "It generates most of the chemical energy needed." },
  { q: "Light travels faster than sound.", a: true, cat: 'PHY', rationale: "Light: ~300,000 km/s, Sound: ~340 m/s." },
  { q: "H2O is the chemical formula for salt.", a: false, cat: 'CHE', rationale: "H2O is water. Salt is NaCl." },
  { q: "Humans have 23 pairs of chromosomes.", a: true, cat: 'BIO', rationale: "46 chromosomes in total." },
  { q: "Electrons have a positive charge.", a: false, cat: 'CHE', rationale: "Electrons are negative, Protons are positive." },
  { q: "Water expands when it freezes.", a: true, cat: 'PHY', rationale: "Due to crystal lattice structure of ice." },
  { q: "Venus is the hottest planet.", a: true, cat: 'PHY', rationale: "Due to its thick atmosphere and greenhouse effect." },
  { q: "Spiders are insects.", a: false, cat: 'BIO', rationale: "Spiders are arachnids, having 8 legs." },
  { q: "Sound cannot travel in a vacuum.", a: true, cat: 'PHY', rationale: "Sound requires a medium like air or water." },
  // History & Geo
  { q: "The Ottoman Empire fell in 1923.", a: true, cat: 'HIS', rationale: "Replaced by the Republic of Turkey." },
  { q: "The Amazon is the longest river.", a: false, cat: 'GEO', rationale: "The Nile is traditionally considered longer." },
  { q: "Mount Everest is the highest peak.", a: true, cat: 'GEO', rationale: "8,848 meters above sea level." },
  { q: "Tokyo is the capital of Japan.", a: true, cat: 'GEO', rationale: "It is the political and economic center." },
  { q: "World War II ended in 1945.", a: true, cat: 'HIS', rationale: "Ended with the surrender of Japan." },
  { q: "Australia is a country and a continent.", a: true, cat: 'GEO', rationale: "It is the only country that is also a continent." },
  // General
  { q: "A tomato is a fruit.", a: true, cat: 'GEN', rationale: "Botanically, it develops from a flower ovary." },
  { q: "Iron rusts due to oxidation.", a: true, cat: 'CHE', rationale: "Reaction of iron and oxygen in the presence of water." },
  { q: "Sharks are mammals.", a: false, cat: 'BIO', rationale: "Sharks are fish." },
  { q: "The Great Wall of China is visible from space.", a: false, cat: 'GEN', rationale: "It is not visible to the naked eye from orbit." },
  { q: "Diamond is the hardest natural substance.", a: true, cat: 'CHE', rationale: "It scores 10 on the Mohs scale." },
];

export default function SpeedRun({ language, user, onExit, demoMode = false }: SpeedRunProps) {
  const isTr = language === 'tr';
  
  // Game State
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'running' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [activeQuestions, setActiveQuestions] = useState<GameQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  
  // Analytics State
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [catStats, setCatStats] = useState<Record<string, { total: number, correct: number }>>({});
  
  // Visual State
  const [combo, setCombo] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState<'none' | 'green' | 'red'>('none');

  // Load High Score on Mount (User Specific)
  useEffect(() => {
    if (!user) return;
    const key = `neurally_speedrun_highscore_${user.id}`;
    const savedScore = localStorage.getItem(key);
    if (savedScore) setHighScore(parseInt(savedScore, 10));
    else setHighScore(0);
  }, [user]);

  // Save High Score on Game Over (User Specific)
  useEffect(() => {
    if (gameState === 'gameover' && user) {
        if (score > highScore) {
            setHighScore(score);
            const key = `neurally_speedrun_highscore_${user.id}`;
            localStorage.setItem(key, score.toString());
        }
    }
  }, [gameState, score, highScore, user]);

  // DEMO MODE: Auto Start
  useEffect(() => {
      if (demoMode && gameState === 'idle') {
          startGame();
      }
  }, [demoMode, gameState]);

  // DEMO MODE: Auto Play
  useEffect(() => {
      if (demoMode && gameState === 'running') {
          const autoPlayTimer = setInterval(() => {
              // Simulate highly skilled player (95% accuracy)
              const currentQuestion = activeQuestions[currentQ % activeQuestions.length];
              const willBeCorrect = Math.random() > 0.05; 
              handleAnswer(willBeCorrect ? currentQuestion.a : !currentQuestion.a);
          }, 1200); // Fast pace

          return () => clearInterval(autoPlayTimer);
      }
  }, [demoMode, gameState, currentQ, activeQuestions]);

  // Key Listener for Desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (gameState !== 'running') return;
        if (e.key === 'ArrowLeft') handleAnswer(false);
        if (e.key === 'ArrowRight') handleAnswer(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, currentQ]); 

  // Load & Shuffle Questions
  useEffect(() => {
    loadQuestions();
  }, [language, isTr]);

  const loadQuestions = () => {
    const pool = isTr ? [...QUESTIONS_TR] : [...QUESTIONS_EN];
    // Fisher-Yates Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setActiveQuestions(pool);
  };

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (gameState === 'running' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'running') {
      endGame();
    }
    return () => clearInterval(interval);
  }, [gameState, timeLeft]);

  const startGame = () => {
    loadQuestions();
    setScore(0);
    setTimeLeft(45);
    setCurrentQ(0);
    setSpeed(1);
    setCombo(0);
    setMistakes([]);
    setCatStats({});
    setGameState('countdown');
    setTimeout(() => setGameState('running'), 3000);
  };

  const endGame = () => {
    setGameState('gameover');
    setSpeed(0.1); // Slow down tunnel
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
       // Correct!
       const comboMultiplier = Math.min(combo + 1, 5);
       setScore(s => s + (100 * comboMultiplier));
       setCombo(c => c + 1);
       
       // Visual Feedback
       setSpeed(s => Math.min(s + 0.5, 5)); 
       setFlash('green');
       setTimeout(() => setFlash('none'), 150);
       
    } else {
       // Wrong!
       setCombo(0);
       setSpeed(0.5); 
       setShake(true);
       setFlash('red');
       
       // Log Mistake
       setMistakes(prev => [...prev, {
           question: question.q,
           correctAnswer: question.a,
           userAnswer: answer,
           rationale: question.rationale
       }]);

       setTimeout(() => {
         setShake(false);
         setFlash('none');
         setSpeed(1); 
       }, 400);
       
       // Penalty
       setTimeLeft(t => Math.max(0, t - 5));
    }
    // Always move next
    setCurrentQ(prev => prev + 1);
  };

  const getRank = () => {
      if (score > 5000) return isTr ? "Nöral Mimar" : "Neural Architect";
      if (score > 3000) return isTr ? "Veri Gezgini" : "Data Drifter";
      if (score > 1000) return isTr ? "Çırak Bağlantı" : "Novice Node";
      return isTr ? "Çevrimdışı" : "Offline Entity";
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-black flex flex-col items-center justify-center select-none font-sans">
      
      {/* --- 3D HYPER TUNNEL ENGINE --- */}
      <div className="absolute inset-0 perspective-1000 pointer-events-none z-0">
        
        {/* Dynamic Color Overlay based on Combo */}
        <div className={`absolute inset-0 z-10 transition-colors duration-500 mix-blend-overlay
            ${combo >= 5 ? 'bg-blue-900/60' : combo >= 3 ? 'bg-purple-900/40' : 'bg-transparent'}
        `}></div>

        {/* Floor Grid */}
        <div 
            className="absolute bottom-[-50%] left-[-50%] w-[200%] h-[200%] bg-grid-white opacity-20"
            style={{
                backgroundSize: '80px 80px',
                backgroundImage: `
                    linear-gradient(to right, rgba(255,255,255,${0.1 + (combo*0.05)}) 1px, transparent 1px), 
                    linear-gradient(to bottom, rgba(255,255,255,${0.1 + (combo*0.05)}) 1px, transparent 1px)
                `,
                transform: 'rotateX(80deg)',
                animation: `tunnelFlow ${0.5 / (speed || 0.1)}s linear infinite`,
                boxShadow: 'inset 0 0 100px 100px black'
            }}
        />
        
        {/* Ceiling Grid */}
        <div 
            className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-grid-white opacity-20"
            style={{
                backgroundSize: '80px 80px',
                backgroundImage: `
                    linear-gradient(to right, rgba(255,255,255,${0.1 + (combo*0.05)}) 1px, transparent 1px), 
                    linear-gradient(to bottom, rgba(255,255,255,${0.1 + (combo*0.05)}) 1px, transparent 1px)
                `,
                transform: 'rotateX(-80deg)',
                animation: `tunnelFlow ${0.5 / (speed || 0.1)}s linear infinite`,
                boxShadow: 'inset 0 0 100px 100px black'
            }}
        />

        {/* Warp Speed Lines (Only when running) */}
        {gameState === 'running' && (
           <div className="absolute inset-0 z-0">
              {[...Array(25)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute bg-white/60 w-[2px]"
                    style={{
                        height: `${100 + (speed * 50)}px`, 
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        opacity: Math.random(),
                        animation: `rain ${0.2 / (speed || 0.1)}s linear infinite`,
                        boxShadow: '0 0 10px white'
                    }}
                  />
              ))}
           </div>
        )}

        {/* FLASH EFFECT */}
        {flash !== 'none' && (
            <div className={`absolute inset-0 z-50 mix-blend-overlay ${flash === 'green' ? 'bg-green-500' : 'bg-red-600'}`}></div>
        )}
      </div>

      {/* --- HUD --- */}
      {/* EXIT BUTTON - ALWAYS VISIBLE IN TOP RIGHT */}
      <div className="absolute top-6 right-6 z-50">
        <button 
            onClick={onExit}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-all backdrop-blur-sm border border-white/5 group"
            title={isTr ? "Çıkış" : "Exit"}
        >
            <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {gameState !== 'idle' && gameState !== 'gameover' && (
        <div className="absolute top-6 left-6 flex justify-between items-start z-30 pointer-events-none">
            <div className="text-white relative group">
                <p className="font-mono text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-1">Score</p>
                <h2 className="font-serif text-6xl tabular-nums tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                    {score.toLocaleString()}
                </h2>
                {combo > 1 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={combo}
                        className="absolute -bottom-8 left-0 flex items-center gap-1 font-bold italic text-yellow-400 text-lg"
                    >
                        <Flame className="w-4 h-4 fill-yellow-400" /> {combo}x SURGE
                    </motion.div>
                )}
            </div>
        </div>
      )}

      {/* Center Timer for HUD */}
      {gameState !== 'idle' && gameState !== 'gameover' && (
         <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
             <div className={`
                    flex items-center gap-3 font-mono text-3xl font-bold px-4 py-2 rounded border
                    ${timeLeft < 10 ? 'text-red-500 border-red-500 bg-red-950/50 animate-pulse' : 'text-white border-white/20 bg-black/50'}
                `}>
                    <Timer className="w-6 h-6" /> {timeLeft}s
                </div>
         </div>
      )}

      {/* --- CONTENT LAYER --- */}
      <div className={`relative z-20 w-full max-w-5xl mx-auto flex flex-col items-center justify-center transition-transform duration-100 ${shake ? 'translate-x-2 rotate-1' : ''}`}>
         
         {/* IDLE SCREEN */}
         {gameState === 'idle' && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="text-center bg-black/60 backdrop-blur-xl p-16 border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] relative overflow-hidden group max-w-2xl"
             >
                 {/* Decorative background pulse */}
                 <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                 <Zap className="w-20 h-20 text-white mx-auto mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                 
                 <h1 className="font-serif text-7xl text-white mb-6 italic tracking-tighter">
                    {isTr ? 'HIZ TÜNELİ' : 'SPEED TUNNEL'}
                 </h1>
                 
                 <div className="grid grid-cols-3 gap-2 mb-8 text-white/60 text-xs font-mono uppercase tracking-widest">
                     <div className="border border-white/10 p-2 rounded">Arcade Mode</div>
                     <div className="border border-white/10 p-2 rounded">Time Attack</div>
                     <div className="border border-white/10 p-2 rounded flex items-center justify-center gap-2">
                         <Medal className="w-3 h-3 text-yellow-500" /> Best: {highScore.toLocaleString()}
                     </div>
                 </div>

                 <p className="text-gray-300 mb-10 mx-auto font-sans text-lg font-light leading-relaxed">
                    {isTr 
                      ? 'Reflekslerini test et. Sorular hızlanacak. Yanlış cevaplar zamanını çalar, doğrular kombo yapar. Tünelin sonuna ulaş.' 
                      : 'Test your reflexes. Questions accelerate. Mistakes steal time, accuracy builds combos. Reach the end of the tunnel.'}
                 </p>

                 {!demoMode && (
                     <button 
                     onClick={startGame}
                     className="relative group/btn w-full py-6 bg-white text-black font-black text-2xl uppercase tracking-[0.2em] overflow-hidden transition-all hover:scale-105"
                     >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {isTr ? 'BAŞLAT' : 'IGNITE'} <ChevronsRight className="w-6 h-6" />
                        </span>
                        <div className="absolute inset-0 bg-blue-500 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 mix-blend-overlay"></div>
                     </button>
                 )}
                 {demoMode && (
                     <div className="text-white/50 text-xs font-mono uppercase tracking-widest animate-pulse">
                         AUTO-PILOT ENGAGED
                     </div>
                 )}
             </motion.div>
         )}

         {/* COUNTDOWN */}
         {gameState === 'countdown' && (
             <Countdown />
         )}

         {/* GAME RUNNING */}
         {gameState === 'running' && (
             <motion.div 
               key={currentQ} // Force re-render animation on new question
               initial={{ scale: 0.9, opacity: 0, y: 50 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               transition={{ type: "spring", bounce: 0.5 }}
               className="w-full text-center"
             >
                 {/* Question Card */}
                 <div className="relative bg-black/80 border border-white/20 py-16 px-8 mb-16 backdrop-blur-xl shadow-2xl rounded-sm max-w-4xl mx-auto">
                    
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black border border-white/20 px-4 py-1 text-xs font-bold font-mono text-white/50 uppercase tracking-widest">
                        Data Packet #{currentQ + 1}
                    </div>

                    <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight font-serif drop-shadow-xl">
                       {activeQuestions[currentQ % activeQuestions.length].q}
                    </h2>
                 </div>

                 {/* Controls */}
                 <div className="flex gap-8 justify-center items-center">
                    {/* FALSE BUTTON */}
                    <button 
                       onClick={() => handleAnswer(false)}
                       disabled={demoMode}
                       className="group relative w-64 h-40 perspective-500 transition-transform hover:scale-105 active:scale-95 outline-none"
                    >
                       <div className="absolute inset-0 bg-gradient-to-br from-red-900/80 to-black border border-red-900/50 skew-x-[-6deg] group-hover:border-red-500 transition-colors"></div>
                       <span className="relative z-10 text-white text-4xl font-black uppercase tracking-widest flex flex-col items-center">
                          <X className="w-8 h-8 mb-2 text-red-500" />
                          {isTr ? 'YANLIŞ' : 'FALSE'}
                       </span>
                       <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-white/30 font-mono flex items-center gap-1">
                           <Keyboard className="w-3 h-3"/> <ArrowLeft className="w-3 h-3"/>
                       </div>
                    </button>

                    {/* TRUE BUTTON */}
                    <button 
                       onClick={() => handleAnswer(true)}
                       disabled={demoMode}
                       className="group relative w-64 h-40 perspective-500 transition-transform hover:scale-105 active:scale-95 outline-none"
                    >
                       <div className="absolute inset-0 bg-gradient-to-bl from-emerald-900/80 to-black border border-emerald-900/50 skew-x-[6deg] group-hover:border-emerald-500 transition-colors"></div>
                       <span className="relative z-10 text-white text-4xl font-black uppercase tracking-widest flex flex-col items-center">
                          <Check className="w-8 h-8 mb-2 text-emerald-500" />
                          {isTr ? 'DOĞRU' : 'TRUE'}
                       </span>
                       <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-white/30 font-mono flex items-center gap-1">
                           <Keyboard className="w-3 h-3"/> <ArrowRight className="w-3 h-3"/>
                       </div>
                    </button>
                 </div>
             </motion.div>
         )}

         {/* GAME OVER / ANALYTICS REPORT */}
         {gameState === 'gameover' && (
             <motion.div 
               initial={{ opacity: 0, y: 50 }}
               animate={{ opacity: 1, y: 0 }}
               className="w-full max-w-5xl bg-black/90 border border-white/20 backdrop-blur-xl p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row gap-12"
             >
                 {/* LEFT: SUMMARY */}
                 <div className="flex-1 space-y-8">
                     <div>
                        <div className="flex items-center gap-2 text-yellow-500 mb-2">
                            <Trophy className="w-5 h-5" />
                            <span className="text-xs font-bold uppercase tracking-widest">Mission Complete</span>
                        </div>
                        <h2 className="font-serif text-6xl text-white mb-2 tracking-tighter">{getRank()}</h2>
                        <div className="flex items-center gap-4 text-sm">
                            <p className="text-gray-400">
                                {isTr ? 'Toplam Skor' : 'Total Score'}: <span className="text-white font-bold">{score.toLocaleString()}</span>
                            </p>
                            {score >= highScore && highScore > 0 && (
                                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] uppercase font-bold border border-yellow-500/50 rounded">New Record!</span>
                            )}
                        </div>
                     </div>

                     {/* Stats Grid */}
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 border border-white/10">
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{isTr ? 'Cevaplar' : 'Answers'}</div>
                            <div className="text-2xl font-bold text-white">{currentQ}</div>
                        </div>
                        <div className="bg-white/5 p-4 border border-white/10">
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{isTr ? 'Doğruluk' : 'Accuracy'}</div>
                            <div className="text-2xl font-bold text-white">
                                {currentQ > 0 ? Math.round(((currentQ - mistakes.length) / currentQ) * 100) : 0}%
                            </div>
                        </div>
                     </div>

                     {/* Category Matrix */}
                     <div>
                         <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <BarChart3 className="w-3 h-3" /> {isTr ? 'Konu Analizi' : 'Subject Matrix'}
                         </h4>
                         <div className="space-y-2">
                             {Object.entries(catStats).map(([cat, stat]: [string, { total: number, correct: number }]) => (
                                 <div key={cat} className="flex items-center gap-4 text-xs">
                                     <span className="w-8 font-mono text-gray-500">{cat}</span>
                                     <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                         <div 
                                            className="h-full bg-blue-500" 
                                            style={{ width: `${(stat.correct / stat.total) * 100}%` }}
                                         />
                                     </div>
                                     <span className="text-white w-8 text-right">{Math.round((stat.correct / stat.total) * 100)}%</span>
                                 </div>
                             ))}
                         </div>
                     </div>
                     
                     <div className="flex gap-4">
                        <button 
                            onClick={startGame}
                            className="flex-1 py-4 bg-white text-black font-bold uppercase tracking-[0.2em] hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" /> {isTr ? 'TEKRAR' : 'RESTART'}
                        </button>
                        <button 
                            onClick={onExit}
                            className="flex-1 py-4 border border-white/20 text-white font-bold uppercase tracking-[0.2em] hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-4 h-4" /> {isTr ? 'ÇIKIŞ' : 'EXIT'}
                        </button>
                     </div>
                 </div>

                 {/* RIGHT: ERROR LOG (Neural Glitches) */}
                 <div className="flex-1 border-l border-white/10 pl-0 md:pl-12 flex flex-col h-[500px]">
                     <h3 className="text-lg font-serif text-white mb-6 flex items-center gap-2">
                         <Activity className="w-5 h-5 text-red-500" />
                         {isTr ? 'Hata Günlüğü' : 'Neural Glitches'}
                         <span className="text-xs font-mono text-gray-500 ml-auto">{mistakes.length} ERRORS</span>
                     </h3>

                     <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                         {mistakes.length === 0 ? (
                             <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 opacity-50">
                                 <TrendingUp className="w-12 h-12 mb-2" />
                                 <p className="text-xs uppercase tracking-widest">{isTr ? 'Mükemmel Performans' : 'Perfect Run'}</p>
                             </div>
                         ) : (
                             mistakes.map((mistake, i) => (
                                 <div key={i} className="bg-red-950/20 border border-red-900/30 p-4 rounded text-left">
                                     <div className="text-white font-medium mb-2 text-sm">{mistake.question}</div>
                                     <div className="flex justify-between items-center text-xs mb-2">
                                         <span className="text-red-400">Sen: {mistake.userAnswer ? (isTr?'DOĞRU':'TRUE') : (isTr?'YANLIŞ':'FALSE')}</span>
                                         <span className="text-green-400">Cevap: {mistake.correctAnswer ? (isTr?'DOĞRU':'TRUE') : (isTr?'YANLIŞ':'FALSE')}</span>
                                     </div>
                                     <p className="text-gray-400 text-xs italic border-t border-white/5 pt-2">
                                         "{mistake.rationale}"
                                     </p>
                                 </div>
                             ))
                         )}
                     </div>
                 </div>

             </motion.div>
         )}

      </div>

      {/* --- GLOBAL STYLES FOR ANIMATION --- */}
      <style>{`
        @keyframes tunnelFlow {
            0% { background-position: 0 0; }
            100% { background-position: 0 200px; }
        }
        @keyframes rain {
            0% { transform: translateY(-200px); opacity: 0; }
            20% { opacity: 1; }
            100% { transform: translateY(120vh); opacity: 0; }
        }
      `}</style>

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
      initial={{ scale: 3, opacity: 0, filter: "blur(10px)" }}
      animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
      exit={{ scale: 0, opacity: 0 }}
      className="text-[12rem] font-black text-white italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]"
    >
      {count > 0 ? count : "GO!"}
    </motion.div>
  );
}