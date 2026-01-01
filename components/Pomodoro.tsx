import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Zap, Layers, Volume2, VolumeX, Maximize2, Minimize2, Fingerprint, CheckCircle2, Sliders } from 'lucide-react';

interface SessionArtifact {
  id: string;
  timestamp: string;
  duration: number;
  intent: string;
  signature: string; // Fake crypto signature for visual flair
}

type AudioType = 'brown' | 'pink' | 'white';

// Audio Engine (Client Side - Zero Cost)
class AudioEngine {
  private ctx: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  toggleNoise(active: boolean, type: AudioType = 'brown') {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    if (this.sourceNode) {
        try { this.sourceNode.stop(); } catch(e) {}
        this.sourceNode = null;
    }

    if (active) {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Noise Generation Algorithms
      if (type === 'white') {
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      } else if (type === 'pink') {
          let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
          for (let i = 0; i < bufferSize; i++) {
              const white = Math.random() * 2 - 1;
              b0 = 0.99886 * b0 + white * 0.0555179;
              b1 = 0.99332 * b1 + white * 0.0750759;
              b2 = 0.96900 * b2 + white * 0.1538520;
              b3 = 0.86650 * b3 + white * 0.3104856;
              b4 = 0.55000 * b4 + white * 0.5329522;
              b5 = -0.7616 * b5 - white * 0.0168980;
              data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
              data[i] *= 0.11;
              b6 = white * 0.115926;
          }
      } else { // Brown
          let lastOut = 0;
          for (let i = 0; i < bufferSize; i++) {
              const white = Math.random() * 2 - 1;
              const brown = (lastOut + (0.02 * white)) / 1.02;
              lastOut = brown;
              data[i] = brown * 3.5;
          }
      }

      this.sourceNode = this.ctx.createBufferSource();
      this.sourceNode.buffer = buffer;
      this.sourceNode.loop = true;
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 0.05;
      this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 2);
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
      this.sourceNode.start();
    } else {
       if (this.gainNode) {
           this.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
       }
    }
  }
}

const audioEngine = new AudioEngine();

export default function Pomodoro() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [taskIntent, setTaskIntent] = useState("");
  const [artifacts, setArtifacts] = useState<SessionArtifact[]>([]);
  const [zenMode, setZenMode] = useState(false);
  
  // Audio Config
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [noiseType, setNoiseType] = useState<AudioType>('brown');

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      mintArtifact();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  useEffect(() => {
    if (isActive && audioEnabled) audioEngine.toggleNoise(true, noiseType);
    else audioEngine.toggleNoise(false);
    return () => audioEngine.toggleNoise(false);
  }, [isActive, audioEnabled, noiseType]);

  const mintArtifact = () => {
    const newArtifact: SessionArtifact = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        duration: 25,
        intent: taskIntent || "Deep Work Protocol",
        signature: Array.from({length: 4}, () => Math.floor(Math.random()*256).toString(16).padStart(2,'0')).join('').toUpperCase()
    };
    setArtifacts(prev => [newArtifact, ...prev]);
    setTaskIntent("");
    // Play completion sound (optional, kept silent for now)
  };

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => { setIsActive(false); setTimeLeft(25 * 60); };
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className={`h-full w-full flex flex-col transition-all duration-700 ${zenMode ? 'fixed inset-0 z-[100] bg-white' : 'p-8 relative max-w-[1600px] mx-auto'}`}>
      
      {/* ZEN MODE Toggle */}
      <button 
        onClick={() => setZenMode(!zenMode)}
        className="absolute top-8 right-8 z-50 p-3 bg-gray-100 hover:bg-black hover:text-white rounded-full transition-colors"
      >
        {zenMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </button>

      {/* Header (Hidden in Zen) */}
      {!zenMode && (
        <div className="flex justify-between items-end mb-12">
            <div>
            <h1 className="font-serif text-5xl text-black mb-2">Focus Station</h1>
            <p className="text-gray-400 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-3 h-3" /> Cognitive Enhancement Module
            </p>
            </div>
        </div>
      )}

      <div className={`grid ${zenMode ? 'grid-cols-1 h-screen' : 'grid-cols-1 lg:grid-cols-12 gap-12 h-full'}`}>
        
        {/* LEFT: THE REACTOR (Timer) */}
        <div className={`flex flex-col items-center justify-center transition-all ${zenMode ? 'col-span-1 scale-110' : 'lg:col-span-7'}`}>
          
          <motion.div 
             className="relative w-full max-w-[500px] aspect-square flex flex-col items-center justify-center group"
          >
             {/* Dynamic Ring */}
             <div className="absolute inset-0 rounded-full border border-gray-100"></div>
             <svg className="absolute inset-0 w-full h-full -rotate-90">
                 <circle
                   cx="50%" cy="50%" r="48%"
                   stroke="black" strokeWidth="2" fill="none"
                   strokeDasharray="300%"
                   strokeDashoffset={isActive ? "0%" : "300%"} // Simulate progress
                   className="transition-all duration-[1s] ease-linear"
                   style={{ strokeDashoffset: `${300 - (300 * (timeLeft / 1500))}%` }}
                 />
             </svg>

             {/* Breathing Glow in Active Mode */}
             {isActive && (
                 <motion.div 
                    animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-black rounded-full blur-3xl z-0"
                 />
             )}

             {/* Time Display */}
             <div className="relative z-10 text-center">
                 <span className="font-serif text-8xl md:text-9xl text-black tracking-tighter tabular-nums leading-none block mb-6">
                    {formatTime(timeLeft)}
                 </span>

                 {/* Intent Input or Display */}
                 <div className="h-12 flex items-center justify-center">
                    {!isActive ? (
                        <input 
                            type="text" 
                            value={taskIntent}
                            onChange={(e) => setTaskIntent(e.target.value)}
                            placeholder="Set Objective..."
                            className="bg-transparent border-b border-gray-300 text-center font-mono text-sm focus:border-black outline-none placeholder:text-gray-300 w-48 transition-colors"
                        />
                    ) : (
                        <div className="flex items-center gap-2 px-4 py-1 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-full">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                            {taskIntent || "Deep Focus"}
                        </div>
                    )}
                 </div>
             </div>

             {/* Controls */}
             <div className="absolute bottom-16 flex gap-6 z-20">
                <button onClick={toggleTimer} className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-2xl">
                    {isActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </button>
                {!isActive && timeLeft !== 1500 && (
                    <button onClick={resetTimer} className="w-12 h-12 bg-white border border-gray-200 text-black rounded-full flex items-center justify-center hover:border-black transition-colors">
                        <RotateCcw className="w-5 h-5" />
                    </button>
                )}
             </div>
          </motion.div>

          {/* Synthesizer Controls (Audio) - Hidden in Zen if you prefer, or subtle */}
          <div className={`mt-12 p-6 bg-gray-50 rounded-2xl border border-gray-100 w-full max-w-md transition-opacity ${zenMode && isActive ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500">
                      <Sliders className="w-4 h-4" /> Neural Audio Synth
                  </div>
                  <button onClick={() => setAudioEnabled(!audioEnabled)} className={audioEnabled ? 'text-black' : 'text-gray-300'}>
                      {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                  {['brown', 'pink', 'white'].map(type => (
                      <button 
                        key={type}
                        onClick={() => setNoiseType(type as AudioType)}
                        disabled={!audioEnabled}
                        className={`py-2 text-[10px] font-bold uppercase tracking-wider border rounded transition-all ${noiseType === type && audioEnabled ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200'}`}
                      >
                          {type}
                      </button>
                  ))}
              </div>
          </div>

        </div>

        {/* RIGHT: ARTIFACTS (Inventory) - Hidden in Zen */}
        {!zenMode && (
            <div className="lg:col-span-5 flex flex-col h-full border-l border-gray-100 pl-8">
            <div className="flex items-center justify-between mb-8">
                <h3 className="font-serif text-2xl">Session Artifacts</h3>
                <span className="font-mono text-xs text-gray-400">{artifacts.length} MINTED</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-4">
                {artifacts.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-lg text-gray-400">
                        <Layers className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs font-mono uppercase">No artifacts generated</span>
                    </div>
                ) : (
                    artifacts.map((art) => (
                        <motion.div 
                            key={art.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white border border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <Fingerprint className="w-4 h-4 text-gray-400" />
                                    <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">ID: {art.id}</span>
                                </div>
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </div>
                            <h4 className="font-serif text-lg font-medium leading-tight mb-1">{art.intent}</h4>
                            <div className="flex justify-between items-end mt-4 pt-4 border-t border-gray-100">
                                <span className="font-mono text-xs text-gray-500">{art.duration}m Focus</span>
                                <span className="font-mono text-[10px] bg-black text-white px-2 py-0.5 rounded-sm">
                                    SIG: {art.signature}
                                </span>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
            </div>
        )}

      </div>
    </div>
  );
}