
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Zap, Radio, Power, Target, Activity, Users, Wifi, X, Clock, Fingerprint, MousePointer2, Scan, Radar, Send } from 'lucide-react';
import { User, Language } from '../types';
import { doc, setDoc, onSnapshot, collection, query, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { globalAudio } from '../utils/audio';

interface TheConstructProps {
  user: User;
  language: Language;
}

interface Signal {
    fromId: string;
    fromName: string;
    type: 'nudge';
    timestamp: number;
}

interface OnlinePeer {
  uid: string;
  name: string; // Real name (hidden mostly)
  alias: string; // Display name
  avatar: string;
  topic: string;
  status: 'focusing' | 'idle';
  lastActive: number;
  stats: {
      level: number;
      todayFocus: number;
      rank: string;
  };
  signals?: Signal[];
}

// --- VISUAL COMPONENTS ---

const RadarScan = () => (
    <div className="relative w-64 h-64 flex items-center justify-center opacity-20 pointer-events-none">
        <div className="absolute inset-0 border border-black/20 rounded-full animate-ping [animation-duration:3s]"></div>
        <div className="absolute inset-8 border border-black/20 rounded-full animate-ping [animation-duration:3s] [animation-delay:0.5s]"></div>
        <div className="absolute inset-16 border border-black/20 rounded-full animate-ping [animation-duration:3s] [animation-delay:1s]"></div>
        <Radar className="w-12 h-12 text-black animate-spin [animation-duration:4s]" />
    </div>
);

const NeuralAvatar = ({ url, size = "md", active = false, level = 1 }: { url: string, size?: "sm" | "md" | "lg", active?: boolean, level?: number }) => {
    const dim = size === 'sm' ? 40 : size === 'md' ? 64 : 96;
    
    return (
        <div className="relative flex items-center justify-center" style={{ width: dim + 16, height: dim + 16 }}>
            {active && (
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, ease: "linear", repeat: Infinity }}
                    className="absolute inset-0 rounded-full border border-dashed border-gray-400"
                />
            )}
            <div className={`relative z-10 rounded-full overflow-hidden border-2 bg-white p-1 ${active ? 'border-black' : 'border-gray-200'}`} style={{ width: dim, height: dim }}>
                <img src={url} alt="User" className={`w-full h-full rounded-full object-cover ${active ? '' : 'grayscale opacity-70'}`} />
            </div>
            {level > 0 && (
                <div className="absolute -bottom-1 -right-1 bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white z-20 shadow-sm">
                    Lvl {level}
                </div>
            )}
        </div>
    );
};

const ProfileHUD = ({ peer, onClose, isTr, onNudge }: { peer: OnlinePeer, onClose: () => void, isTr: boolean, onNudge: () => void }) => {
    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div 
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                className="w-full max-w-sm bg-white border border-gray-200 rounded-[2rem] overflow-hidden shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-[#F8F8F8] p-8 flex flex-col items-center border-b border-gray-100 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors">
                        <X className="w-4 h-4 text-black" />
                    </button>
                    <NeuralAvatar url={peer.avatar} size="lg" active={peer.status === 'focusing'} />
                    <h3 className="font-serif text-2xl text-black mt-4 font-bold">{peer.alias}</h3>
                    <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">{peer.stats.rank}</p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="p-4 border border-gray-100 rounded-2xl bg-white shadow-sm">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                            <Activity className="w-3 h-3" /> {isTr ? 'Canlı Odak' : 'Live Focus'}
                        </div>
                        <p className="text-sm font-medium text-black leading-relaxed font-serif italic">
                            "{peer.topic}"
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <div className="text-xl font-bold font-mono">{peer.stats.todayFocus}m</div>
                            <div className="text-[9px] text-gray-400 uppercase tracking-widest">Today</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <div className="text-xl font-bold font-mono">{peer.stats.level}</div>
                            <div className="text-[9px] text-gray-400 uppercase tracking-widest">Level</div>
                        </div>
                    </div>

                    <button 
                        onClick={() => { onNudge(); onClose(); }}
                        className="w-full py-4 bg-black text-white font-bold text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-gray-800 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Zap className="w-4 h-4" /> {isTr ? 'Sinyal Gönder' : 'Send Nudge'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default function TheConstruct({ user, language }: TheConstructProps) {
  const isTr = language === 'tr';
  
  // State
  const [peers, setPeers] = useState<OnlinePeer[]>([]);
  // Default alias is empty to force user to choose one, or prepopulate but allow change
  const [alias, setAlias] = useState(user.name.split(' ')[0]); 
  const [userTopic, setUserTopic] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [selectedPeer, setSelectedPeer] = useState<OnlinePeer | null>(null);
  const [incomingSignal, setIncomingSignal] = useState<Signal | null>(null);

  const heartbeatRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // --- 1. REAL-TIME PRESENCE SYSTEM ---
  useEffect(() => {
      const q = query(collection(db, "hub_presence"));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const now = Date.now();
          const activePeers: OnlinePeer[] = [];
          
          snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              
              // Self Handling (Signals)
              if (data.uid === user.id) {
                  if (data.signals && data.signals.length > 0) {
                      const latestSignal = data.signals[data.signals.length - 1];
                      handleIncomingSignal(latestSignal);
                      // Clean up signal
                      updateDoc(doc(db, "hub_presence", user.id), { signals: arrayRemove(latestSignal) });
                  }
              }

              // Peer Handling (Active within 2 mins)
              if (now - data.lastActive < 120000 && data.uid !== user.id) {
                  activePeers.push({
                      uid: data.uid,
                      alias: data.alias || "Anonymous",
                      name: data.name,
                      avatar: data.avatar,
                      topic: data.topic,
                      status: data.status,
                      lastActive: data.lastActive,
                      stats: data.stats || { level: 1, todayFocus: 0, rank: 'Novice' }
                  });
              }
          });
          setPeers(activePeers);
      });

      return () => {
          unsubscribe();
          stopHeartbeat();
      };
  }, [user.id]);

  // --- 2. SIGNAL HANDLING ---
  const handleIncomingSignal = (signal: Signal) => {
      if (signal.type === 'nudge') {
          globalAudio.play('typewriter');
          setIncomingSignal(signal);
          setTimeout(() => setIncomingSignal(null), 5000);
      }
  };

  const sendNudge = async (targetId: string) => {
      try {
          const signal: Signal = {
              fromId: user.id,
              fromName: alias,
              type: 'nudge',
              timestamp: Date.now()
          };
          await updateDoc(doc(db, "hub_presence", targetId), { signals: arrayUnion(signal) });
      } catch (e) {
          console.error("Signal failed", e);
      }
  };

  // --- 3. CONNECTION LOGIC ---
  const startSession = async () => {
      if (!userTopic.trim() || !alias.trim()) {
          alert(isTr ? "Lütfen bir takma ad ve çalışma konusu girin." : "Please enter an alias and your study topic.");
          return;
      }
      setIsConnected(true);
      sendHeartbeat();
      heartbeatRef.current = setInterval(sendHeartbeat, 30000); // 30s Heartbeat
      timerRef.current = setInterval(() => setSessionTime(prev => prev + 1), 1000);
  };

  const endSession = async () => {
      setIsConnected(false);
      setSessionTime(0);
      stopHeartbeat();
      try { await deleteDoc(doc(db, "hub_presence", user.id)); } catch (e) {}
  };

  const sendHeartbeat = async () => {
      const currentStats = {
          level: user.stats?.level || 1,
          todayFocus: Math.floor((user.stats?.totalFocusMinutes || 0) + (sessionTime / 60)), 
          rank: user.stats?.rankTitle || "Novice"
      };
      try {
          await setDoc(doc(db, "hub_presence", user.id), {
              uid: user.id,
              name: user.name,
              alias: alias, // Important: Use the custom alias
              avatar: user.avatar,
              topic: userTopic,
              status: 'focusing',
              lastActive: Date.now(),
              stats: currentStats
          }, { merge: true });
      } catch (e) {
          console.error("HB Error", e);
      }
  };

  const stopHeartbeat = () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (s: number) => {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full w-full bg-[#FDFBF9] text-black flex flex-col font-sans relative overflow-hidden">
      
      {/* 0. INCOMING SIGNAL NOTIFICATION */}
      <AnimatePresence>
          {incomingSignal && (
              <motion.div 
                  initial={{ opacity: 0, y: -100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -100 }}
                  className="fixed top-6 left-0 right-0 z-[200] flex justify-center pointer-events-none"
              >
                  <div className="bg-black text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 pointer-events-auto">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                      <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Incoming Signal</div>
                          <div className="text-sm font-medium">
                              <span className="font-bold text-white">{incomingSignal.fromName}</span> {isTr ? 'sana kolay gelsin dedi!' : 'sent a focus nudge!'}
                          </div>
                      </div>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      <AnimatePresence>
          {selectedPeer && <ProfileHUD peer={selectedPeer} onClose={() => setSelectedPeer(null)} isTr={isTr} onNudge={() => sendNudge(selectedPeer.uid)} />}
      </AnimatePresence>

      {/* 1. HEADER */}
      <div className="px-8 py-8 flex justify-between items-end bg-white border-b border-gray-100 z-20">
          <div>
              <h1 className="font-serif text-4xl text-black tracking-tighter flex items-center gap-3">
                  Global Nexus
              </h1>
              <div className="flex items-center gap-4 mt-2">
                  <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${isConnected ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                      {isConnected ? (isTr ? 'YAYINDA' : 'BROADCASTING') : (isTr ? 'ÇEVRİMDIŞI' : 'OFFLINE')}
                  </div>
                  <div className="h-4 w-px bg-gray-200"></div>
                  <div className="text-[10px] font-mono text-gray-500 flex items-center gap-2">
                      <Users className="w-3 h-3" /> {peers.length} {isTr ? 'AKTİF' : 'ACTIVE'}
                  </div>
              </div>
          </div>
      </div>

      {/* 2. MAIN SCROLL AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 relative z-10">
          
          {/* CONTROL CARD */}
          <div className="max-w-5xl mx-auto mb-16">
              <motion.div 
                  layout
                  className="bg-white border border-gray-200 rounded-[2.5rem] p-8 md:p-12 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] relative overflow-hidden"
              >
                  {isConnected && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent animate-pulse"></div>}

                  <div className="flex flex-col md:flex-row gap-10 items-center">
                      
                      {/* Avatar & Status */}
                      <div className="flex flex-col items-center gap-4 shrink-0">
                          <NeuralAvatar url={user.avatar} size="lg" active={isConnected} level={user.stats?.level} />
                          {isConnected && (
                              <div className="font-mono text-4xl font-light tabular-nums tracking-tight">
                                  {formatTime(sessionTime)}
                              </div>
                          )}
                      </div>

                      {/* Inputs / Display */}
                      <div className="flex-1 w-full space-y-6">
                          {isConnected ? (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-center md:text-left">
                                  <div>
                                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">{isTr ? 'KİMLİK' : 'IDENTITY'}</label>
                                      <div className="text-xl font-bold">{alias}</div>
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">{isTr ? 'GÖREV' : 'MISSION'}</label>
                                      <div className="font-serif text-3xl md:text-4xl text-black leading-tight">"{userTopic}"</div>
                                  </div>
                              </motion.div>
                          ) : (
                              // EDIT MODE
                              <div className="space-y-6">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      <div className="md:col-span-1">
                                          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2 flex items-center gap-2">
                                              <Fingerprint className="w-3 h-3" /> {isTr ? 'KOD ADI' : 'CODENAME'}
                                          </label>
                                          <input 
                                              value={alias}
                                              onChange={(e) => setAlias(e.target.value)}
                                              placeholder="Neo"
                                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-black outline-none transition-all"
                                          />
                                      </div>
                                      <div className="md:col-span-2">
                                          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2 flex items-center gap-2">
                                              <Target className="w-3 h-3" /> {isTr ? 'ODAK KONUSU' : 'FOCUS OBJECTIVE'}
                                          </label>
                                          <input 
                                              value={userTopic}
                                              onChange={(e) => setUserTopic(e.target.value)}
                                              placeholder={isTr ? "Ne üzerinde çalışıyorsun?" : "What are you working on?"}
                                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-serif text-lg focus:border-black outline-none transition-all"
                                          />
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0 w-full md:w-auto">
                          <button 
                              onClick={isConnected ? endSession : startSession}
                              className={`
                                  w-full md:w-32 h-20 md:h-32 rounded-2xl md:rounded-[2rem] font-bold text-xs uppercase tracking-widest flex flex-col items-center justify-center gap-2 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95
                                  ${isConnected 
                                      ? 'bg-white border-2 border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200' 
                                      : 'bg-black text-white border-2 border-black'}
                              `}
                          >
                              <Power className="w-6 h-6" />
                              <span>{isConnected ? (isTr ? 'KES' : 'ABORT') : (isTr ? 'BAĞLAN' : 'CONNECT')}</span>
                          </button>
                      </div>
                  </div>
              </motion.div>
          </div>

          {/* NETWORK GRID */}
          <div className="max-w-[1600px] mx-auto">
              <div className="flex items-center gap-4 mb-8">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-200">
                      {isTr ? 'AĞ DURUMU' : 'NETWORK STATUS'}
                  </span>
                  <div className="h-px bg-gray-200 flex-1"></div>
              </div>

              {peers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-50">
                      <RadarScan />
                      <p className="mt-8 font-serif text-xl text-gray-400">
                          {isTr ? 'Sinyal taranıyor...' : 'Scanning frequency...'}
                      </p>
                      <p className="text-sm text-gray-300">
                          {isTr ? 'Şu an bağlı başka kimse yok.' : 'No other nodes detected in this sector.'}
                      </p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      <AnimatePresence>
                          {peers.map(peer => (
                              <motion.div
                                  layout
                                  key={peer.uid}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  onClick={() => setSelectedPeer(peer)}
                                  className="group bg-white border border-gray-200 p-6 rounded-3xl hover:border-black hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                              >
                                  <div className="flex flex-col items-center text-center">
                                      <div className="mb-4 relative">
                                          <NeuralAvatar url={peer.avatar} size="md" active={false} level={peer.stats.level} />
                                          {peer.status === 'focusing' && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>}
                                      </div>
                                      
                                      <h4 className="font-bold text-sm mb-1">{peer.alias}</h4>
                                      
                                      <div className="w-full bg-gray-50 rounded-xl p-3 mt-3 border border-gray-100 group-hover:bg-black group-hover:text-white transition-colors">
                                          <p className="text-[10px] font-serif italic line-clamp-2 min-h-[2em] flex items-center justify-center">
                                              {peer.topic}
                                          </p>
                                      </div>

                                      <div className="mt-4 flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-300 group-hover:text-black transition-colors">
                                          <MousePointer2 className="w-3 h-3" /> {isTr ? 'İNCELE' : 'INSPECT'}
                                      </div>
                                  </div>
                              </motion.div>
                          ))}
                      </AnimatePresence>
                  </div>
              )}
          </div>

      </div>
    </div>
  );
}
