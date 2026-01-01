import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, User as UserIcon, BookOpen, Coffee, Hand, Zap, Users, Filter, Search } from 'lucide-react';
import { User, Language } from '../types';

interface TheConstructProps {
  user: User;
  language: Language;
}

interface Peer {
  id: string;
  name: string;
  status: 'focusing' | 'break';
  topic: string;
  duration: number; // minutes
  location: string;
  avatarColor: string;
}

// Realistic Data Generation
const NAMES = [
    "Alex M.", "Selin K.", "Hiroshi T.", "Elena R.", "Marcus D.", "Zeynep Y.", 
    "Chen W.", "Sarah J.", "David B.", "Caner Ö.", "Lisa P.", "Omar F."
];

const TOPICS = [
    "Med School: Anatomy", "Calculus II", "Civil Procedure Law", "Python Algorithms", 
    "History of Art", "Biochemistry", "Macroeconomics", "Quantum Physics", "Literature"
];

const LOCATIONS = ["Istanbul", "London", "Berlin", "Tokyo", "New York", "Toronto", "Paris", "Seoul"];

const COLORS = ["bg-blue-100 text-blue-700", "bg-orange-100 text-orange-700", "bg-purple-100 text-purple-700", "bg-emerald-100 text-emerald-700", "bg-rose-100 text-rose-700"];

export default function TheConstruct({ user, language }: TheConstructProps) {
  const isTr = language === 'tr';
  
  const [peers, setPeers] = useState<Peer[]>([]);
  const [userTopic, setUserTopic] = useState("");
  const [isUserFocusing, setIsUserFocusing] = useState(false);
  const [activeCount, setActiveCount] = useState(1240);
  const [nudgedPeers, setNudgedPeers] = useState<Set<string>>(new Set());

  // Initialize Hub Data
  useEffect(() => {
      const initialPeers: Peer[] = Array.from({ length: 9 }).map((_, i) => ({
          id: `peer-${i}`,
          name: NAMES[i % NAMES.length],
          status: Math.random() > 0.2 ? 'focusing' : 'break',
          topic: TOPICS[Math.floor(Math.random() * TOPICS.length)],
          duration: Math.floor(Math.random() * 90) + 10,
          location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
          avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)]
      }));
      setPeers(initialPeers);

      // Live Count Simulation
      const interval = setInterval(() => {
        setActiveCount(prev => prev + Math.floor(Math.random() * 5) - 2);
      }, 4000);
      return () => clearInterval(interval);
  }, []);

  const handleNudge = (peerId: string) => {
      if(nudgedPeers.has(peerId)) return;
      setNudgedPeers(prev => new Set(prev).add(peerId));
      
      // Reset after animation
      setTimeout(() => {
          setNudgedPeers(prev => {
              const newSet = new Set(prev);
              newSet.delete(peerId);
              return newSet;
          });
      }, 2000);
  };

  const toggleSession = () => {
      setIsUserFocusing(!isUserFocusing);
  };

  return (
    <div className="h-full w-full bg-gray-50 text-ink-900 flex flex-col overflow-hidden">
      
      {/* HEADER */}
      <div className="px-8 py-6 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
          <div>
              <h1 className="font-serif text-3xl text-black">
                  {isTr ? 'Küresel Çalışma Salonu' : 'Global Study Hub'}
              </h1>
              <p className="text-gray-400 text-xs mt-1 font-medium flex items-center gap-2">
                  <span className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      {activeCount.toLocaleString()} {isTr ? 'Öğrenci Çevrimiçi' : 'Scholars Online'}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Worldwide
                  </span>
              </p>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
               <div className="bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium text-gray-500 border border-gray-200">
                   <Filter className="w-3 h-3" />
                   {isTr ? 'Tüm Konular' : 'All Topics'}
               </div>
          </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              
              {/* USER CARD (MY DESK) */}
              <motion.div 
                 layout
                 className="col-span-1 md:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[200px]"
              >
                  <div className="absolute top-0 right-0 p-3">
                      <div className="px-2 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-md">
                          {isTr ? 'Masam' : 'My Desk'}
                      </div>
                  </div>

                  <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                          <UserIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="flex-1">
                          <h3 className="font-serif text-xl font-medium text-black">{user.name}</h3>
                          <input 
                              value={userTopic}
                              onChange={(e) => setUserTopic(e.target.value)}
                              placeholder={isTr ? "Ne çalışıyorsun?" : "What are you studying?"}
                              className="w-full mt-2 text-sm text-gray-600 placeholder:text-gray-300 border-none focus:ring-0 p-0 bg-transparent font-medium"
                          />
                      </div>
                  </div>

                  <div className="mt-6 flex items-center gap-4">
                      <button 
                        onClick={toggleSession}
                        className={`flex-1 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isUserFocusing ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100' : 'bg-black text-white hover:bg-gray-800'}`}
                      >
                          {isUserFocusing ? (
                             <><Coffee className="w-4 h-4" /> {isTr ? 'Mola Ver' : 'Take Break'}</>
                          ) : (
                             <><BookOpen className="w-4 h-4" /> {isTr ? 'Odaklan' : 'Start Focus'}</>
                          )}
                      </button>
                  </div>
              </motion.div>

              {/* PEER CARDS */}
              <AnimatePresence>
                  {peers.map((peer) => (
                      <motion.div
                         key={peer.id}
                         initial={{ opacity: 0, scale: 0.9 }}
                         animate={{ opacity: 1, scale: 1 }}
                         className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative group"
                      >
                          <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${peer.avatarColor}`}>
                                      {peer.name.charAt(0)}
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-sm text-gray-900">{peer.name}</h4>
                                      <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                          {peer.location}
                                      </p>
                                  </div>
                              </div>
                              <div className={`w-2 h-2 rounded-full ${peer.status === 'focusing' ? 'bg-green-500' : 'bg-yellow-400'}`}></div>
                          </div>

                          <div className="mb-4 bg-gray-50 rounded-lg p-3 border border-gray-100">
                              <p className="text-xs font-medium text-gray-700 line-clamp-1" title={peer.topic}>
                                  {peer.topic}
                              </p>
                              <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                                  <Zap className="w-3 h-3" />
                                  {peer.duration}m
                              </div>
                          </div>

                          <button 
                             onClick={() => handleNudge(peer.id)}
                             className={`w-full py-2 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2
                                ${nudgedPeers.has(peer.id) 
                                    ? 'bg-green-50 text-green-600 border-green-100' 
                                    : 'border-gray-100 text-gray-400 hover:text-black hover:border-gray-300'
                                }`}
                          >
                             {nudgedPeers.has(peer.id) ? (
                                 <>{isTr ? 'GÖNDERİLDİ' : 'SENT'} <Hand className="w-3 h-3" /></>
                             ) : (
                                 <>{isTr ? 'KOLAY GELSİN DE' : 'NUDGE'} <Hand className="w-3 h-3" /></>
                             )}
                          </button>
                      </motion.div>
                  ))}
              </AnimatePresence>

          </div>
      </div>
    </div>
  );
}