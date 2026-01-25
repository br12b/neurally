
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Zap, Radio, Power, Target, Cpu, Activity, Lock, Users, Wifi, X, BarChart3, ScanLine, Clock, Shield } from 'lucide-react';
import { User, Language } from '../types';
import { doc, setDoc, onSnapshot, collection, query, deleteDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

interface TheConstructProps {
  user: User;
  language: Language;
}

interface OnlinePeer {
  uid: string;
  name: string;
  avatar: string;
  topic: string;
  status: 'focusing' | 'idle';
  lastActive: number;
  stats: {
      level: number;
      todayFocus: number;
      rank: string;
  };
}

// --- VISUAL COMPONENTS ---

// 1. NEURAL AVATAR (The "Logo" Replacement)
const NeuralAvatar = ({ url, size = "md", active = false, level = 1 }: { url: string, size?: "sm" | "md" | "lg", active?: boolean, level?: number }) => {
    const dim = size === 'sm' ? 40 : size === 'md' ? 64 : 96;
    const ringColor = active ? "border-cyan-500" : "border-gray-700";
    
    return (
        <div className="relative flex items-center justify-center" style={{ width: dim + 20, height: dim + 20 }}>
            {/* Outer Rotating Ring */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: active ? 10 : 20, ease: "linear", repeat: Infinity }}
                className={`absolute inset-0 rounded-full border border-dashed ${ringColor} opacity-40`}
            />
            
            {/* Inner Counter-Rotating Ring */}
            <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 15, ease: "linear", repeat: Infinity }}
                className={`absolute inset-2 rounded-full border border-t-transparent border-l-transparent ${active ? 'border-cyan-400' : 'border-gray-600'} opacity-60`}
            />

            {/* Level Badge (Orbiting) */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 8, ease: "linear", repeat: Infinity }}
                className="absolute inset-0"
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]"></div>
            </motion.div>

            {/* The Image */}
            <div className="relative z-10 rounded-full overflow-hidden border-2 border-black bg-black" style={{ width: dim, height: dim }}>
                <img src={url} alt="User" className={`w-full h-full object-cover ${active ? '' : 'grayscale'}`} />
            </div>

            {/* Status Dot */}
            {active && (
                <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black z-20 shadow-[0_0_10px_#22c55e]"></div>
            )}
        </div>
    );
};

// 2. PROFILE HUD (Detailed View)
const ProfileHUD = ({ peer, onClose, isTr, onNudge }: { peer: OnlinePeer, onClose: () => void, isTr: boolean, onNudge: () => void }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-sm bg-[#0A0A0A] border border-gray-800 rounded-[2rem] overflow-hidden relative shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Background */}
                <div className="h-32 bg-gradient-to-b from-gray-900 to-black relative overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-white hover:text-black transition-colors z-20">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-8 pb-8 -mt-16 relative z-10 flex flex-col items-center">
                    <NeuralAvatar url={peer.avatar} size="lg" active={peer.status === 'focusing'} />
                    
                    <h3 className="font-serif text-2xl text-white mt-4">{peer.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-gray-800 rounded text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                            LVL {peer.stats.level}
                        </span>
                        <span className="text-cyan-500 text-xs font-mono">{peer.stats.rank}</span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 w-full mt-8">
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
                            <Clock className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                            <div className="text-xl font-mono text-white">{peer.stats.todayFocus}m</div>
                            <div className="text-[9px] text-gray-500 uppercase tracking-widest">{isTr ? 'BUGÜN' : 'TODAY'}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
                            <Target className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                            <div className="text-white text-xs line-clamp-2 min-h-[1.75rem] flex items-center justify-center font-medium">
                                {peer.topic || (isTr ? 'Genel Çalışma' : 'General Study')}
                            </div>
                            <div className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">{isTr ? 'ODAK' : 'FOCUS'}</div>
                        </div>
                    </div>

                    {/* Action */}
                    <button 
                        onClick={() => { onNudge(); onClose(); }}
                        className="w-full mt-6 py-4 bg-white text-black font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-cyan-400 transition-colors shadow-lg flex items-center justify-center gap-2 text-xs"
                    >
                        <Zap className="w-4 h-4" /> {isTr ? 'SİNYAL GÖNDER' : 'SEND SIGNAL'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default function TheConstruct({ user, language }: TheConstructProps) {
  const isTr = language === 'tr';
  
  // State
  const [peers, setPeers] = useState<OnlinePeer[]>([]);
  const [userTopic, setUserTopic] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [selectedPeer, setSelectedPeer] = useState<OnlinePeer | null>(null);
  
  // Refs
  const heartbeatRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // --- 1. REAL-TIME PRESENCE SYSTEM ---
  useEffect(() => {
      const q = query(collection(db, "hub_presence"));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const now = Date.now();
          const activePeers: OnlinePeer[] = [];
          
          snapshot.forEach((doc) => {
              const data = doc.data();
              // Filter stale users (> 2 mins) & self
              if (now - data.lastActive < 120000 && data.uid !== user.id) {
                  activePeers.push({
                      uid: data.uid,
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

  // --- 2. CONNECTION HANDLERS ---
  const startSession = async () => {
      if (!userTopic.trim()) {
          alert(isTr ? "Lütfen bir odak konusu girin." : "Please enter a focus topic.");
          return;
      }

      setIsConnected(true);
      sendHeartbeat(); // Immediate first beat

      // Start Heartbeat Loop (30s)
      heartbeatRef.current = setInterval(sendHeartbeat, 30000);

      // Start Local Timer
      timerRef.current = setInterval(() => {
          setSessionTime(prev => prev + 1);
      }, 1000);
  };

  const endSession = async () => {
      setIsConnected(false);
      setSessionTime(0);
      stopHeartbeat();
      try {
          await deleteDoc(doc(db, "hub_presence", user.id));
      } catch (e) {
          console.error("Disconnect error", e);
      }
  };

  const sendHeartbeat = async () => {
      // Calculate Stats to share with the world
      const currentStats = {
          level: user.stats?.level || 1,
          todayFocus: Math.floor((user.stats?.totalFocusMinutes || 0) + (sessionTime / 60)), // Add current session approximation
          rank: user.stats?.rankTitle || "Novice"
      };

      try {
          await setDoc(doc(db, "hub_presence", user.id), {
              uid: user.id,
              name: user.name,
              avatar: user.avatar,
              topic: userTopic,
              status: 'focusing',
              lastActive: Date.now(),
              stats: currentStats // SHARING REAL DATA
          }, { merge: true });
      } catch (e) {
          console.error("Heartbeat failed", e);
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
    <div className="h-full w-full bg-[#050505] text-white flex flex-col relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-black">
      
      <AnimatePresence>
          {selectedPeer && (
              <ProfileHUD 
                  peer={selectedPeer} 
                  onClose={() => setSelectedPeer(null)} 
                  isTr={isTr} 
                  onNudge={() => alert(isTr ? "Sinyal gönderildi." : "Signal sent.")} 
              />
          )}
      </AnimatePresence>

      {/* 1. BACKGROUND EFFECTS */}
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
      </div>

      {/* 2. HEADER */}
      <div className="px-8 py-6 flex justify-between items-center border-b border-white/10 bg-black/50 backdrop-blur-md relative z-20">
          <div>
              <h1 className="font-serif text-2xl md:text-3xl text-white tracking-wider flex items-center gap-3">
                  <Globe className={`w-6 h-6 ${isConnected ? 'text-cyan-400 animate-pulse' : 'text-gray-600'}`} />
                  THE NEXUS
              </h1>
              <div className="flex items-center gap-4 mt-1">
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {isConnected ? (isTr ? 'AĞA BAĞLANDI' : 'UPLINK ESTABLISHED') : (isTr ? 'ÇEVRİMDIŞI' : 'OFFLINE')}
                  </p>
                  <span className="text-[10px] font-mono text-cyan-700/50">///</span>
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-3 h-3" /> {peers.length} {isTr ? 'AKTİF HÜCRE' : 'ACTIVE NODES'}
                  </p>
              </div>
          </div>
      </div>

      {/* 3. MAIN INTERFACE */}
      <div className="flex-1 flex flex-col items-center p-8 relative z-10 overflow-y-auto custom-scrollbar">
          
          {/* USER COCKPIT */}
          <div className="w-full max-w-4xl mb-20 mt-10 relative">
              <div className="absolute top-1/2 left-[-100px] right-[-100px] h-px bg-gradient-to-r from-transparent via-cyan-900/30 to-transparent pointer-events-none"></div>

              <motion.div 
                  layout
                  className={`relative z-20 bg-black border ${isConnected ? 'border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.1)]' : 'border-white/10'} p-8 md:p-12 rounded-[2rem] transition-all duration-500 overflow-hidden`}
              >
                  {/* Digital Noise Overlay */}
                  {isConnected && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none"></div>}

                  <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                      
                      {/* My Avatar */}
                      <div className="relative shrink-0">
                          <NeuralAvatar url={user.avatar} size="lg" active={isConnected} level={user.stats?.level} />
                          {isConnected && <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-cyan-900/80 backdrop-blur text-cyan-200 text-[9px] px-3 py-1 rounded-full font-mono border border-cyan-500/30 whitespace-nowrap">BROADCASTING</div>}
                      </div>

                      {/* Inputs / Status */}
                      <div className="flex-1 text-center md:text-left w-full">
                          {isConnected ? (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                  <label className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-1 block flex items-center justify-center md:justify-start gap-2">
                                      <Activity className="w-3 h-3" /> CURRENT OBJECTIVE
                                  </label>
                                  <h2 className="text-3xl md:text-4xl font-serif text-white mb-2">{userTopic}</h2>
                                  <div className="flex items-center justify-center md:justify-start gap-3">
                                      <div className="font-mono text-2xl text-gray-300 tabular-nums bg-white/5 px-3 py-1 rounded">
                                          {formatTime(sessionTime)}
                                      </div>
                                      <span className="text-[10px] text-gray-600 animate-pulse">/// SYNCED</span>
                                  </div>
                              </motion.div>
                          ) : (
                              <div className="w-full">
                                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block flex items-center gap-2 justify-center md:justify-start">
                                      <Target className="w-3 h-3" /> {isTr ? 'HEDEF TANIMLA' : 'DEFINE OBJECTIVE'}
                                  </label>
                                  <input 
                                      value={userTopic}
                                      onChange={(e) => setUserTopic(e.target.value)}
                                      placeholder={isTr ? "Ne üzerinde çalışıyorsun?" : "Identify your task..."}
                                      className="w-full bg-transparent border-b border-gray-700 py-2 text-xl md:text-2xl font-serif text-white placeholder:text-gray-700 focus:border-cyan-500 outline-none text-center md:text-left transition-colors"
                                  />
                              </div>
                          )}
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0 w-full md:w-auto">
                          <button 
                              onClick={isConnected ? endSession : startSession}
                              className={`w-full md:w-auto px-8 py-6 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3
                                  ${isConnected 
                                      ? 'bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white' 
                                      : 'bg-white text-black hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]'
                                  }`}
                          >
                              {isConnected ? (
                                  <><Power className="w-4 h-4" /> {isTr ? 'BAĞLANTIYI KES' : 'DISCONNECT'}</>
                              ) : (
                                  <><Zap className="w-4 h-4" /> {isTr ? 'SİSTEME BAĞLAN' : 'JACK IN'}</>
                              )}
                          </button>
                      </div>
                  </div>
              </motion.div>
          </div>

          {/* THE HIVE (Grid) */}
          <div className="w-full max-w-[1400px]">
              <div className="flex items-center gap-4 mb-8">
                  <div className="h-px bg-white/10 flex-1"></div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Wifi className="w-3 h-3" /> {isTr ? 'KÜRESEL AĞ' : 'GLOBAL NETWORK'}
                  </span>
                  <div className="h-px bg-white/10 flex-1"></div>
              </div>

              {peers.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/5">
                      <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-800">
                          <Radio className="w-6 h-6 text-gray-600 animate-pulse" />
                      </div>
                      <h3 className="text-gray-400 font-serif text-xl mb-2">
                          {isTr ? 'Ağ Sessiz' : 'Network Silent'}
                      </h3>
                      <p className="text-gray-600 text-sm max-w-md mx-auto">
                          {isTr 
                              ? 'Şu anda bağlı başka düğüm yok. İlk sinyali sen başlat.' 
                              : 'No other nodes active. Initiate the first signal to populate the grid.'}
                      </p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      <AnimatePresence>
                          {peers.map((peer) => (
                              <motion.div
                                  layout
                                  key={peer.uid}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  onClick={() => setSelectedPeer(peer)}
                                  className="group relative bg-[#0A0A0A] border border-white/10 p-6 rounded-3xl hover:border-cyan-500/50 transition-colors cursor-pointer flex flex-col items-center text-center"
                              >
                                  {/* Peer Avatar */}
                                  <div className="mb-4">
                                      <NeuralAvatar url={peer.avatar} size="md" active={peer.status === 'focusing'} level={peer.stats.level} />
                                  </div>
                                  
                                  <div className="w-full">
                                      <div className="text-white text-sm font-bold truncate mb-1">{peer.name}</div>
                                      <div className="text-[10px] text-gray-500 font-mono flex justify-center gap-2">
                                          <span>LVL {peer.stats.level}</span>
                                          <span className="text-cyan-600">|</span>
                                          <span>{Math.floor((Date.now() - peer.lastActive) / 1000 / 60)}m ago</span>
                                      </div>
                                  </div>
                                  
                                  <div className="mt-3 w-full bg-white/5 rounded-lg p-2 border border-white/5 group-hover:bg-white/10 transition-colors">
                                      <p className="text-[10px] text-gray-300 line-clamp-1 group-hover:text-cyan-400 transition-colors font-medium">
                                          {peer.topic}
                                      </p>
                                  </div>

                                  {/* Connector Line Effect on Hover */}
                                  <div className="absolute inset-0 border-2 border-cyan-500/0 rounded-3xl group-hover:border-cyan-500/20 pointer-events-none transition-all scale-105 group-hover:scale-100"></div>
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
