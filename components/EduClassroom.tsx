
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Users, ArrowRight, Loader2, Trophy, Crown, Zap, Timer, Hash, Check, X, Shield, Info, Hand, HelpCircle, Sparkles, Brain, Copy, PenTool, Plus, Trash2, Save } from 'lucide-react';
import { User, Language, QuizRoom, BattlePlayer, Question, Option } from '../types';
import { db } from '../utils/firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { createAIClient, generateFallbackQuestions } from '../utils/ai';

interface QuizBattleProps {
  language: Language;
  user: User;
}

// --- SCORE SYSTEM INFO MODAL ---
const ScoreInfoModal = ({ onClose, isTr }: { onClose: () => void, isTr: boolean }) => (
    <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
    >
        <motion.div 
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <Trophy className="w-32 h-32" />
            </div>
            
            <h3 className="font-serif text-3xl mb-6">{isTr ? 'Puanlama Algoritması' : 'Scoring Algorithm'}</h3>
            
            <div className="space-y-6 relative z-10">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0">1</div>
                    <div>
                        <h4 className="font-bold text-sm uppercase tracking-widest mb-1">{isTr ? 'DOĞRULUK' : 'ACCURACY'}</h4>
                        <p className="text-sm text-gray-500">{isTr ? 'Her doğru cevap temel puanı garantiler.' : 'Every correct answer guarantees base points.'}</p>
                        <div className="mt-2 text-xl font-mono font-bold text-black">+100 PTS</div>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold shrink-0">2</div>
                    <div>
                        <h4 className="font-bold text-sm uppercase tracking-widest mb-1">{isTr ? 'HIZ BONUSU' : 'SPEED BONUS'}</h4>
                        <p className="text-sm text-gray-500">{isTr ? 'Kalan her saniye için ekstra puan alırsın.' : 'Earn extra points for every remaining second.'}</p>
                        <div className="mt-2 text-xl font-mono font-bold text-green-600">+(10 x SEC)</div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
                    <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">{isTr ? 'MAKSİMUM PUAN (SORU BAŞINA)' : 'MAX POTENTIAL'}</span>
                    <span className="text-3xl font-serif text-black">250 PTS</span>
                </div>
            </div>

            <button onClick={onClose} className="w-full mt-8 py-4 bg-black text-white font-bold uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform">
                {isTr ? 'ANLAŞILDI' : 'UNDERSTOOD'}
            </button>
        </motion.div>
    </motion.div>
);

export default function QuizBattle({ language, user }: QuizBattleProps) {
  const isTr = language === 'tr';

  // --- VIEW STATE ---
  const [view, setView] = useState<'menu' | 'host_setup' | 'join_setup' | 'lobby' | 'game' | 'results'>('menu');
  
  // --- DATA STATE ---
  const [roomCode, setRoomCode] = useState("");
  const [topic, setTopic] = useState("");
  const [username, setUsername] = useState(user.name.split(' ')[0]);
  const [isHost, setIsHost] = useState(false);
  const [roomData, setRoomData] = useState<QuizRoom | null>(null);
  const [isSimulation, setIsSimulation] = useState(false);
  
  // --- CREATION STATE (NEW) ---
  const [creationMode, setCreationMode] = useState<'ai' | 'manual'>('ai');
  const [manualQuestions, setManualQuestions] = useState<Question[]>([]);
  const [tempQText, setTempQText] = useState("");
  const [tempOpts, setTempOpts] = useState<string[]>(["", "", "", ""]);
  const [tempCorrectIdx, setTempCorrectIdx] = useState<number>(0);

  // --- GAME STATE ---
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timer, setTimer] = useState(15);
  
  // --- UI STATE ---
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [nudgedPlayer, setNudgedPlayer] = useState<string | null>(null);

  // ------------------------------------------
  // FIREBASE LISTENER
  // ------------------------------------------
  useEffect(() => {
      if (!roomCode || isSimulation) return;

      const unsubscribe = onSnapshot(doc(db, "quizRooms", roomCode), (doc) => {
          if (doc.exists()) {
              const data = doc.data() as QuizRoom;
              setRoomData(data);
              
              if (data.status === 'active' && view === 'lobby') {
                  setView('game');
                  setTimer(15);
              } else if (data.status === 'finished') {
                  setView('results');
              }
          } else {
              if (view !== 'menu') {
                  // Room closed logic
              }
          }
      }, (error) => {
          console.error("Firebase Sync Error", error);
      });

      return () => unsubscribe();
  }, [roomCode, view, isSimulation]);

  // Timer
  useEffect(() => {
      let interval: any;
      if (view === 'game' && roomData?.status === 'active' && timer > 0 && !isAnswered) {
          interval = setInterval(() => setTimer(t => t - 1), 1000);
      }
      return () => clearInterval(interval);
  }, [timer, view, roomData, isAnswered]);

  // ------------------------------------------
  // ACTIONS
  // ------------------------------------------

  // Add Manual Question to List
  const handleAddManualQuestion = () => {
      if (!tempQText || tempOpts.some(o => !o)) {
          alert(isTr ? "Lütfen soruyu ve 4 şıkkı doldurun." : "Please fill question and all 4 options.");
          return;
      }

      const newQ: Question = {
          id: manualQuestions.length + 1,
          topicTag: "Custom",
          text: tempQText,
          rationale: "Manual Entry",
          options: tempOpts.map((txt, idx) => ({
              id: ['a', 'b', 'c', 'd'][idx],
              text: txt,
              isCorrect: idx === tempCorrectIdx
          }))
      };

      setManualQuestions([...manualQuestions, newQ]);
      // Reset Form
      setTempQText("");
      setTempOpts(["", "", "", ""]);
      setTempCorrectIdx(0);
  };

  const handleRemoveQuestion = (idx: number) => {
      setManualQuestions(manualQuestions.filter((_, i) => i !== idx));
  };

  const handleCreateRoom = async () => {
      // Validate inputs before starting loading
      if (creationMode === 'ai' && !topic) return;
      if (creationMode === 'manual' && manualQuestions.length === 0) {
          alert(isTr ? "Lütfen en az bir soru ekleyin." : "Please add at least one question.");
          return;
      }

      setIsLoading(true);
      setIsSimulation(false);
      setRoomCode("");
      
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000));

      try {
          let questions: Question[] = [];
          let usedSimulation = false;

          if (creationMode === 'manual') {
              // --- MANUAL PATH ---
              // Directly use the questions from state, no AI call needed.
              questions = manualQuestions.map((q, i) => ({ ...q, id: i + 1 }));
          } else {
              // --- AI PATH ---
              try {
                  const aiPromise = (async () => {
                      const ai = createAIClient();
                      const prompt = `Create 5 difficult multiple-choice questions about "${topic}".
                      Language: ${isTr ? 'Turkish' : 'English'}.
                      Output JSON ONLY: Array of { id: number, topicTag: string, text: string, options: [{id: "a", text: "...", isCorrect: boolean}], rationale: string }`;

                      const response = await ai.models.generateContent({
                          model: "gemini-2.5-flash",
                          contents: prompt,
                          config: { responseMimeType: "application/json" }
                      });
                      return response;
                  })();

                  const response: any = await Promise.race([aiPromise, timeoutPromise]);

                  if (response.text) {
                      const cleanText = response.text.replace(/```json\n?|\n?```/g, "").trim();
                      const parsed = JSON.parse(cleanText);
                      questions = parsed.map((q: any) => ({ ...q, topicTag: q.topicTag || topic })) as Question[];
                  } else throw new Error("Empty response");
              } catch (aiError) {
                  console.warn("AI Fallback:", aiError);
                  questions = generateFallbackQuestions(); 
                  usedSimulation = true;
                  setIsSimulation(true);
              }
          }
          
          // Generate Room Code
          const code = Math.floor(1000 + Math.random() * 9000).toString(); 
          
          const newRoom: QuizRoom = {
              code, 
              hostId: user.id, 
              topic: creationMode === 'manual' ? 'Custom Quiz' : topic, 
              status: 'waiting', 
              currentQuestionIndex: 0,
              questions: questions.map((q, i) => ({...q, id: i + 1})),
              players: [{ id: user.id, username: username, score: 0, avatar: user.avatar, isHost: true }],
              createdAt: Date.now()
          };

          if (usedSimulation) {
              setRoomData(newRoom);
          } else {
              // Try to save to Firebase
              try {
                  await setDoc(doc(db, "quizRooms", code), newRoom);
              } catch (err) {
                  console.error("Firebase Create Error", err);
                  // If firebase fails, fallback to simulation mode so the user can still play
                  setIsSimulation(true);
                  setRoomData(newRoom);
              }
          }
          
          setRoomCode(code);
          setIsHost(true);
          setView('lobby');

      } catch (error) {
          console.error("Create Room Error", error);
          alert(isTr ? "Oda oluşturulurken bir hata oluştu." : "Error creating room.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleJoinRoom = async () => {
      if (!roomCode || roomCode.length !== 4) return;
      setIsLoading(true);

      try {
          const roomRef = doc(db, "quizRooms", roomCode);
          const roomSnap = await getDoc(roomRef);

          if (!roomSnap.exists()) { alert("Room not found"); setIsLoading(false); return; }
          const room = roomSnap.data() as QuizRoom;
          if (room.status !== 'waiting') { alert("Game started"); setIsLoading(false); return; }

          await updateDoc(roomRef, {
              players: arrayUnion({ id: user.id, username: username || "Player", score: 0, avatar: user.avatar, isHost: false })
          });

          setIsHost(false);
          setView('lobby');
      } catch (error) {
          alert("Connection failed");
      } finally { setIsLoading(false); }
  };

  const handleStartGame = async () => {
      if (!roomCode) return;
      if (isSimulation && roomData) {
          setRoomData({...roomData, status: 'active', currentQuestionIndex: 0});
          setView('game'); setTimer(15);
      } else {
          await updateDoc(doc(db, "quizRooms", roomCode), { status: 'active', currentQuestionIndex: 0 });
      }
  };

  const handleSubmitAnswer = async (optionId: string) => {
      if (isAnswered || !roomData) return;
      setSelectedOptionId(optionId);
      setIsAnswered(true);

      const currentQ = roomData.questions[roomData.currentQuestionIndex];
      const isCorrect = currentQ.options.find(o => o.id === optionId)?.isCorrect;

      if (isCorrect) {
          const points = 100 + (timer * 10);
          const updatedPlayers = roomData.players.map(p => p.id === user.id ? { ...p, score: p.score + points } : p);
          
          if (isSimulation) setRoomData({...roomData, players: updatedPlayers});
          else await updateDoc(doc(db, "quizRooms", roomCode), { players: updatedPlayers });
      }
  };

  const handleNextQuestion = async () => {
      if (!roomData) return;
      const nextIndex = roomData.currentQuestionIndex + 1;
      
      if (nextIndex >= roomData.questions.length) {
          if (isSimulation) { setRoomData({...roomData, status: 'finished'}); setView('results'); }
          else await updateDoc(doc(db, "quizRooms", roomCode), { status: 'finished' });
      } else {
          if (isSimulation) {
              setRoomData({...roomData, currentQuestionIndex: nextIndex});
              setIsAnswered(false); setSelectedOptionId(null); setTimer(15);
          } else {
              await updateDoc(doc(db, "quizRooms", roomCode), { currentQuestionIndex: nextIndex });
          }
      }
  };

  const handleNudge = (targetName: string) => {
      setNudgedPlayer(targetName);
      setTimeout(() => setNudgedPlayer(null), 1000);
  };

  const copyCode = () => {
      navigator.clipboard.writeText(roomCode);
      alert(isTr ? "Kod kopyalandı!" : "Code copied!");
  };

  // --- RENDER HELPERS ---
  const currentQ = roomData?.questions[roomData.currentQuestionIndex];

  return (
    <div className="p-6 lg:p-12 min-h-screen max-w-[1600px] mx-auto font-sans flex flex-col items-center bg-gray-50/50">
        
        <AnimatePresence>
            {showScoreInfo && <ScoreInfoModal onClose={() => setShowScoreInfo(false)} isTr={isTr} />}
        </AnimatePresence>

        {/* LOGO HEADER */}
        <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-12 flex flex-col items-center cursor-pointer"
            onClick={() => setView('menu')}
        >
            <div className="bg-black text-white p-5 rounded-3xl mb-4 shadow-xl shadow-black/10">
                <Swords className="w-8 h-8" />
            </div>
            <h1 className="font-serif text-4xl lg:text-5xl text-black tracking-tighter">Quiz Arena</h1>
            <p className="text-gray-400 font-mono text-[10px] uppercase tracking-[0.3em] mt-2 bg-white px-3 py-1 rounded-full border border-gray-100">
                Multiplayer Cognitive Sync
            </p>
        </motion.div>

        {/* 1. MENU VIEW */}
        {view === 'menu' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                {/* Host Card */}
                <motion.button 
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setView('host_setup')}
                    className="h-72 bg-white rounded-[2rem] p-8 flex flex-col justify-between group shadow-lg border border-gray-100 hover:border-black transition-all relative overflow-hidden text-left"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Crown className="w-40 h-40" />
                    </div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mb-6 text-white">
                            <Crown className="w-6 h-6" />
                        </div>
                        <h2 className="font-serif text-3xl text-black">{isTr ? 'Oda Kur' : 'Host Game'}</h2>
                        <p className="text-gray-500 text-sm mt-3 leading-relaxed max-w-xs">
                            {isTr ? 'Yapay zeka ile saniyeler içinde quiz oluştur ve arkadaşlarını davet et.' : 'Generate an AI quiz in seconds and invite peers to battle.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-black relative z-10">
                        {isTr ? 'BAŞLA' : 'START'} <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                    </div>
                </motion.button>

                {/* Join Card */}
                <motion.button 
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setView('join_setup')}
                    className="h-72 bg-[#F5F5F5] rounded-[2rem] p-8 flex flex-col justify-between group shadow-sm border border-transparent hover:bg-white hover:border-gray-200 transition-all text-left relative overflow-hidden"
                >
                     <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Users className="w-40 h-40" />
                    </div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white border border-gray-200 rounded-2xl flex items-center justify-center mb-6 text-black">
                            <Users className="w-6 h-6" />
                        </div>
                        <h2 className="font-serif text-3xl text-black">{isTr ? 'Katıl' : 'Join Game'}</h2>
                        <p className="text-gray-500 text-sm mt-3 leading-relaxed max-w-xs">
                            {isTr ? 'Var olan bir odaya kod ile bağlan ve yarışmaya dahil ol.' : 'Connect to an existing arena via code and compete.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 group-hover:text-black relative z-10 transition-colors">
                        {isTr ? 'GİRİŞ' : 'ENTER'} <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                    </div>
                </motion.button>
            </div>
        )}

        {/* 2. SETUP VIEWS */}
        {(view === 'host_setup' || view === 'join_setup') && (
            <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className={`w-full ${view === 'host_setup' && creationMode === 'manual' ? 'max-w-4xl' : 'max-w-lg'} bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 relative transition-all`}
            >
                <button onClick={() => setView('menu')} className="absolute top-8 right-8 text-gray-300 hover:text-black transition-colors"><X className="w-6 h-6" /></button>
                
                <h2 className="font-serif text-4xl mb-2">{view === 'host_setup' ? (isTr ? 'Arena Kurulumu' : 'Setup Arena') : (isTr ? 'Giriş Bileti' : 'Entry Pass')}</h2>
                <p className="text-gray-400 text-sm mb-8">{isTr ? 'Parametreleri yapılandır.' : 'Configure parameters.'}</p>
                
                <div className="space-y-6">
                    {/* HOST SETUP SPECIFIC CONTROLS */}
                    {view === 'host_setup' ? (
                        <>
                            {/* MODE TOGGLE */}
                            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                                <button 
                                    onClick={() => setCreationMode('ai')}
                                    className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${creationMode === 'ai' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
                                >
                                    <Brain className="w-4 h-4" /> AI Generator
                                </button>
                                <button 
                                    onClick={() => setCreationMode('manual')}
                                    className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${creationMode === 'manual' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
                                >
                                    <PenTool className="w-4 h-4" /> {isTr ? 'Kendim Yaz' : 'Manual'}
                                </button>
                            </div>

                            {/* AI MODE */}
                            {creationMode === 'ai' && (
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">{isTr ? 'Konu Başlığı' : 'Subject Topic'}</label>
                                    <div className="relative">
                                        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                        <input 
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            placeholder={isTr ? "Örn: Kuantum Fiziği" : "e.g. Quantum Physics"}
                                            className="w-full p-5 pl-12 bg-gray-50 border border-gray-200 rounded-2xl focus:border-black outline-none font-serif text-xl transition-all"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {['History', 'Biology', 'Art', 'Tech'].map(t => (
                                            <button key={t} onClick={() => setTopic(t)} className="text-[10px] font-bold px-3 py-1 bg-gray-100 rounded-full hover:bg-black hover:text-white transition-colors text-gray-500">{t}</button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* MANUAL MODE */}
                            {creationMode === 'manual' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Left: Input Form */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">{isTr ? 'Soru Metni' : 'Question'}</label>
                                                <textarea 
                                                    value={tempQText}
                                                    onChange={(e) => setTempQText(e.target.value)}
                                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-black outline-none h-24 resize-none"
                                                    placeholder="Soru buraya..."
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {tempOpts.map((opt, i) => (
                                                    <div key={i} className="relative">
                                                        <input 
                                                            value={opt}
                                                            onChange={(e) => {
                                                                const newOpts = [...tempOpts];
                                                                newOpts[i] = e.target.value;
                                                                setTempOpts(newOpts);
                                                            }}
                                                            placeholder={`Option ${['A','B','C','D'][i]}`}
                                                            className={`w-full p-3 pr-8 border rounded-lg text-sm outline-none transition-colors ${tempCorrectIdx === i ? 'border-green-500 bg-green-50' : 'border-gray-200 focus:border-black'}`}
                                                        />
                                                        <button 
                                                            onClick={() => setTempCorrectIdx(i)}
                                                            className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border flex items-center justify-center ${tempCorrectIdx === i ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent hover:border-gray-400'}`}
                                                        >
                                                            <Check className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <button 
                                                onClick={handleAddManualQuestion}
                                                className="w-full py-3 border border-dashed border-gray-300 text-gray-500 font-bold text-xs uppercase tracking-widest hover:border-black hover:text-black transition-all flex items-center justify-center gap-2 rounded-xl"
                                            >
                                                <Plus className="w-4 h-4" /> {isTr ? 'Listeye Ekle' : 'Add to List'}
                                            </button>
                                        </div>

                                        {/* Right: Preview List */}
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 h-full max-h-[400px] overflow-y-auto">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 block flex justify-between">
                                                <span>{isTr ? 'Soru Kuyruğu' : 'Questions Queue'}</span>
                                                <span>{manualQuestions.length}</span>
                                            </label>
                                            {manualQuestions.length === 0 ? (
                                                <div className="text-center py-8 text-gray-400 text-xs">{isTr ? 'Henüz soru eklenmedi.' : 'No questions added.'}</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {manualQuestions.map((q, idx) => (
                                                        <div key={idx} className="bg-white p-3 rounded-lg border border-gray-100 flex justify-between items-start group">
                                                            <div>
                                                                <div className="font-bold text-xs mb-1 line-clamp-1">#{idx+1} {q.text}</div>
                                                                <div className="text-[10px] text-gray-400">{q.options.find(o=>o.isCorrect)?.text}</div>
                                                            </div>
                                                            <button onClick={() => handleRemoveQuestion(idx)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        // JOIN SETUP (Code Input)
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">{isTr ? 'Oda Kodu' : 'Access Code'}</label>
                            <div className="relative">
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                <input 
                                    value={roomCode}
                                    onChange={(e) => setRoomCode(e.target.value.replace(/[^0-9]/g, '').substring(0,4))}
                                    placeholder="0000"
                                    className="w-full p-5 pl-12 bg-gray-50 border border-gray-200 rounded-2xl focus:border-black outline-none font-mono text-3xl tracking-[0.5em] transition-all"
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">{isTr ? 'Takma Ad' : 'Alias'}</label>
                        <input 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:border-black outline-none font-mono text-sm"
                        />
                    </div>

                    <button 
                        onClick={view === 'host_setup' ? handleCreateRoom : handleJoinRoom}
                        disabled={
                            isLoading || 
                            (view === 'host_setup' && creationMode === 'ai' && !topic) || 
                            (view === 'host_setup' && creationMode === 'manual' && manualQuestions.length === 0) ||
                            (view === 'join_setup' && roomCode.length < 4)
                        }
                        className="w-full py-5 bg-black text-white font-bold text-xs uppercase tracking-[0.2em] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (view === 'host_setup' ? <Save className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />)}
                        {isLoading ? (isTr ? 'İŞLENİYOR...' : 'PROCESSING...') : (view === 'host_setup' ? (isTr ? 'OLUŞTUR' : 'GENERATE') : (isTr ? 'BAĞLAN' : 'CONNECT'))}
                    </button>
                </div>
            </motion.div>
        )}

        {/* 3. LOBBY */}
        {view === 'lobby' && roomData && (
            <div className="w-full max-w-5xl">
                {/* Lobby Header */}
                <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 mb-8">
                    <div className="text-center md:text-left mb-6 md:mb-0">
                        <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                            <span className={`w-2 h-2 rounded-full ${isSimulation ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`}></span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                {isSimulation ? 'SIMULATION MODE' : 'LIVE CONNECTION'}
                            </span>
                        </div>
                        <h2 className="font-serif text-6xl text-black tracking-tighter" onClick={copyCode} title="Copy">
                            {roomData.code}
                        </h2>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 justify-center md:justify-start cursor-pointer hover:text-black transition-colors" onClick={copyCode}>
                            {isTr ? 'Kodu arkadaşlarına ilet' : 'Share code with peers'} <Copy className="w-3 h-3" />
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button 
                            onClick={() => setShowScoreInfo(true)}
                            className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-black hover:border-black transition-all bg-white"
                            title="Scoring Rules"
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>
                        {isHost ? (
                            <button 
                                onClick={handleStartGame}
                                className="px-8 py-4 bg-black text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:scale-105 transition-transform shadow-lg flex items-center gap-3"
                            >
                                {isTr ? 'BAŞLAT' : 'START MATCH'} <Zap className="w-4 h-4 fill-white" />
                            </button>
                        ) : (
                            <div className="px-8 py-4 bg-gray-50 border border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-widest rounded-2xl flex items-center gap-3">
                                <Loader2 className="w-4 h-4 animate-spin" /> {isTr ? 'BEKLENİYOR...' : 'WAITING...'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Player Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {roomData.players.map(p => (
                        <motion.div 
                            key={p.id}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1, x: nudgedPlayer === p.username ? [0, -5, 5, -5, 5, 0] : 0 }}
                            className="bg-white p-6 rounded-3xl border border-gray-200 flex flex-col items-center justify-center shadow-sm relative group overflow-hidden min-h-[180px]"
                        >
                            {/* Hover Actions */}
                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px] z-10">
                                <button 
                                    onClick={() => handleNudge(p.username)}
                                    className="bg-white text-black px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg transform scale-90 hover:scale-100 transition-transform flex items-center gap-2"
                                >
                                    <Hand className="w-3 h-3" /> {isTr ? 'Dürt' : 'Nudge'}
                                </button>
                            </div>

                            {p.isHost && <div className="absolute top-4 right-4 text-yellow-500"><Crown className="w-4 h-4" /></div>}
                            
                            <div className="relative mb-3">
                                <img src={p.avatar} className="w-16 h-16 rounded-full bg-gray-100 border-2 border-white shadow-md object-cover" alt="avatar" />
                                {nudgedPlayer === p.username && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                        className="absolute -top-2 -right-6 bg-black text-white text-[9px] px-2 py-1 rounded-full font-bold"
                                    >
                                        HEY!
                                    </motion.div>
                                )}
                            </div>
                            <span className="font-bold text-sm truncate w-full text-center">{p.username}</span>
                            <span className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-wide">Ready</span>
                        </motion.div>
                    ))}
                    
                    {/* Placeholders */}
                    {[...Array(Math.max(0, 4 - roomData.players.length))].map((_, i) => (
                        <div key={i} className="border-2 border-dashed border-gray-200 rounded-3xl p-6 flex flex-col items-center justify-center opacity-40 min-h-[180px]">
                            <div className="w-12 h-12 rounded-full bg-gray-100 mb-3"></div>
                            <span className="text-[10px] uppercase font-bold text-gray-300">{isTr ? 'BOŞ KOLTUK' : 'EMPTY SEAT'}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* 4. GAME PLAY */}
        {view === 'game' && currentQ && (
            <div className="w-full max-w-3xl flex flex-col h-full justify-center">
                {/* HUD */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-gray-400">
                        <span className="bg-black text-white px-3 py-1 rounded-lg">Q{roomData?.currentQuestionIndex! + 1}</span>
                        <span>/ {roomData?.questions.length}</span>
                    </div>
                    <div className={`flex items-center gap-2 font-mono text-2xl font-bold ${timer < 5 ? 'text-red-500 animate-pulse' : 'text-black'}`}>
                        <Timer className="w-6 h-6" /> {timer}
                    </div>
                </div>

                {/* Question Card */}
                <motion.div 
                    key={currentQ.id}
                    initial={{ y: 20, opacity: 0, filter: 'blur(10px)' }}
                    animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                    className="bg-white p-10 md:p-14 rounded-[3rem] border border-gray-100 shadow-2xl mb-8 text-center relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-black to-transparent opacity-10"></div>
                    <h2 className="font-serif text-2xl md:text-4xl leading-tight text-gray-900">
                        {currentQ.text}
                    </h2>
                </motion.div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQ.options.map((opt, idx) => {
                        let btnClass = "bg-white border-gray-200 hover:border-black hover:bg-gray-50 text-gray-600";
                        if (isAnswered) {
                            if (opt.isCorrect) btnClass = "bg-[#EEFBF0] border-[#34D399] text-[#065F46]"; // Success
                            else if (selectedOptionId === opt.id) btnClass = "bg-[#FEF2F2] border-[#F87171] text-[#991B1B]"; // Error
                            else btnClass = "bg-gray-50 border-gray-100 text-gray-300 opacity-50"; // Disabled
                        } else if (selectedOptionId === opt.id) {
                            btnClass = "bg-black border-black text-white"; // Selected state
                        }

                        return (
                            <motion.button
                                key={opt.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                onClick={() => handleSubmitAnswer(opt.id)}
                                disabled={isAnswered}
                                className={`p-6 rounded-2xl border-2 font-bold text-lg transition-all transform active:scale-[0.98] relative overflow-hidden group ${btnClass}`}
                            >
                                <span className="relative z-10 flex items-center justify-between w-full">
                                    {opt.text}
                                    {isAnswered && opt.isCorrect && <Check className="w-5 h-5" />}
                                    {isAnswered && !opt.isCorrect && selectedOptionId === opt.id && <X className="w-5 h-5" />}
                                </span>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Host Controls */}
                {isHost && isAnswered && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 flex justify-center">
                        <button 
                            onClick={handleNextQuestion}
                            className="px-10 py-4 bg-black text-white font-bold uppercase tracking-widest rounded-2xl hover:bg-gray-800 transition-all flex items-center gap-2 shadow-xl hover:translate-y-[-2px]"
                        >
                            {isTr ? 'Sonraki Soru' : 'Next Question'} <ArrowRight className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
                
                {!isHost && isAnswered && (
                    <div className="mt-8 flex flex-col items-center gap-2 text-gray-400 animate-pulse">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-mono text-xs uppercase tracking-widest">{isTr ? 'HOST BEKLENİYOR...' : 'WAITING FOR HOST...'}</span>
                    </div>
                )}
            </div>
        )}

        {/* 5. RESULTS */}
        {view === 'results' && roomData && (
            <div className="w-full max-w-2xl text-center">
                <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }} 
                    className="w-32 h-32 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl text-white"
                >
                    <Trophy className="w-16 h-16" />
                </motion.div>
                
                <h1 className="font-serif text-5xl md:text-6xl text-black mb-12">{isTr ? 'Sonuçlar' : 'Final Standings'}</h1>

                <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
                    {roomData.players.sort((a,b) => b.score - a.score).map((p, i) => (
                        <motion.div 
                            key={p.id} 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`flex items-center p-6 ${i===0 ? 'bg-yellow-50/50' : ''}`}
                        >
                            <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold mr-4 ${i===0 ? 'bg-yellow-400 text-white shadow-lg' : 'bg-gray-100 text-gray-500'}`}>
                                {i===0 ? <Crown className="w-5 h-5" /> : `#${i+1}`}
                            </div>
                            <img src={p.avatar} className="w-12 h-12 rounded-full bg-gray-200 mr-4 border border-white shadow-sm" alt="ava" />
                            <div className="flex-1 text-left">
                                <div className="font-bold text-lg text-black">{p.username}</div>
                                {i===0 && <div className="text-[9px] font-bold text-yellow-600 uppercase tracking-widest">GRAND CHAMPION</div>}
                            </div>
                            <div className="font-mono text-2xl font-bold text-black">{p.score.toLocaleString()}</div>
                        </motion.div>
                    ))}
                </div>

                <button 
                    onClick={() => { setView('menu'); setRoomCode(""); }}
                    className="mt-12 px-8 py-4 bg-gray-100 text-black font-bold uppercase tracking-widest rounded-2xl hover:bg-black hover:text-white transition-all"
                >
                    {isTr ? 'Lobiye Dön' : 'Return to Lobby'}
                </button>
            </div>
        )}

    </div>
  );
}
