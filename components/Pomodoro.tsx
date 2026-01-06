
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Plus, BarChart3, Calendar, CheckSquare, Music, X, MoreHorizontal, Clock, Zap, Target, Volume2, Trash2 } from 'lucide-react';

// --- AMBIENT SOUND ENGINE (Web Audio API) ---
class AmbientEngine {
    ctx: AudioContext | null = null;
    nodes: any[] = [];
    
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    playNoise(type: 'rain' | 'white') {
        this.init();
        if(!this.ctx) return;
        this.stop(); 

        const bufferSize = 2 * this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Pink noise (Yağmur benzeri) veya White noise
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; 
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        
        // Filter
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = type === 'rain' ? 800 : 2000;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.15;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        noise.start();
        this.nodes.push(noise);
    }

    stop() {
        this.nodes.forEach(n => n.stop());
        this.nodes = [];
    }
}
let lastOut = 0;
const ambientPlayer = new AmbientEngine();

// --- TYPES ---
interface Widget {
  id: string;
  type: 'tasks' | 'sound';
  x: number;
  y: number;
}

interface Task {
    id: number;
    text: string;
    done: boolean;
}

// Zeroed out Mock Data - Starts Empty
const WEEKLY_STATS = [
    { day: 'Pzt', minutes: 0 },
    { day: 'Sal', minutes: 0 },
    { day: 'Çar', minutes: 0 },
    { day: 'Per', minutes: 0 },
    { day: 'Cum', minutes: 0 },
    { day: 'Cmt', minutes: 0 },
    { day: 'Paz', minutes: 0 }, 
];

export default function Pomodoro() {
  // Timer State
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'FOCUS' | 'BREAK'>('FOCUS');
  
  // Tracker State - REAL DATA STARTING AT ZERO
  const [todayFocus, setTodayFocus] = useState(0); 
  const [sessionCount, setSessionCount] = useState(0);
  
  // Widget State
  const [widgets, setWidgets] = useState<Widget[]>([
      { id: 'default-tasks', type: 'tasks', x: 20, y: 20 }
  ]);
  const [isWidgetMenuOpen, setIsWidgetMenuOpen] = useState(false);

  // Task Widget Data
  const [tasks, setTasks] = useState<Task[]>([
      { id: 1, text: "Hedeflerini buraya yaz...", done: false },
  ]);
  const [newTask, setNewTask] = useState("");

  // Sound Widget Data
  const [playingSound, setPlayingSound] = useState<'none' | 'rain' | 'white'>('none');

  // TIMER LOGIC
  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
          setTimeLeft((t) => t - 1);
          // Simulate tracking
          if (mode === 'FOCUS' && timeLeft % 60 === 0) {
              setTodayFocus(prev => prev + 1);
          }
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (mode === 'FOCUS') setSessionCount(prev => prev + 1);
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audio.play();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  // Ambient Sound Handler
  const toggleSound = (type: 'rain' | 'white') => {
      if (playingSound === type) {
          ambientPlayer.stop();
          setPlayingSound('none');
      } else {
          ambientPlayer.playNoise(type);
          setPlayingSound(type);
      }
  };

  const formatTime = (s: number) => {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const toggleWidget = (type: 'tasks' | 'sound') => {
      const exists = widgets.find(w => w.type === type);
      if (exists) {
          setWidgets(widgets.filter(w => w.type !== type));
          if(type === 'sound') { ambientPlayer.stop(); setPlayingSound('none'); }
      } else {
          const positions = {
              'tasks': { x: 50, y: 50 },
              'sound': { x: 50, y: 350 },
          };
          setWidgets([...widgets, { id: Date.now().toString(), type, ...positions[type] }]);
      }
      setIsWidgetMenuOpen(false);
  };

  const addTask = () => {
      if(!newTask.trim()) return;
      setTasks([...tasks, { id: Date.now(), text: newTask, done: false }]);
      setNewTask("");
  };

  const deleteTask = (id: number) => {
      setTasks(tasks.filter(t => t.id !== id));
  };

  const progress = ((mode === 'FOCUS' ? 25 : 5) * 60 - timeLeft) / ((mode === 'FOCUS' ? 25 : 5) * 60);

  return (
    <div className="h-full w-full bg-[#FAFAFA] text-ink-900 p-8 lg:p-12 flex flex-col relative overflow-hidden font-sans">
      
      {/* HEADER */}
      <div className="flex justify-between items-start mb-12 relative z-20">
          <div>
              <h1 className="font-serif text-4xl text-black mb-1">Focus Studio</h1>
              <p className="text-gray-400 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-3 h-3 text-orange-500" />
                  {isActive ? 'Tracking Active' : 'Ready to Focus'}
              </p>
          </div>

          <div className="relative">
              <button 
                onClick={() => setIsWidgetMenuOpen(!isWidgetMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold uppercase tracking-widest hover:border-black transition-all shadow-sm"
              >
                  <Plus className="w-4 h-4" /> Add Widget
              </button>

              {/* Widget Menu Dropdown */}
              <AnimatePresence>
                  {isWidgetMenuOpen && (
                      <motion.div 
                         initial={{ opacity: 0, y: 10, scale: 0.95 }}
                         animate={{ opacity: 1, y: 0, scale: 1 }}
                         exit={{ opacity: 0, y: 10, scale: 0.95 }}
                         className="absolute right-0 top-12 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
                      >
                          <div className="p-2 space-y-1">
                              <button onClick={() => toggleWidget('tasks')} className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-xs font-medium flex items-center gap-2">
                                  <CheckSquare className="w-4 h-4 text-blue-500" /> Tasks
                              </button>
                              <button onClick={() => toggleWidget('sound')} className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-xs font-medium flex items-center gap-2">
                                  <Volume2 className="w-4 h-4 text-purple-500" /> Ambient Sound
                              </button>
                          </div>
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
          
          {/* LEFT: TIMER (Centerpiece) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center relative">
              
              {/* Timer Circle */}
              <div className="relative w-[340px] h-[340px] flex items-center justify-center">
                  {/* Background Circle */}
                  <svg className="absolute inset-0 w-full h-full rotate-[-90deg]">
                      <circle cx="50%" cy="50%" r="48%" stroke="#E5E5E5" strokeWidth="4" fill="none" />
                      <motion.circle 
                        cx="50%" cy="50%" r="48%" 
                        stroke="#000000" strokeWidth="4" fill="none"
                        strokeDasharray="300%"
                        strokeDashoffset={`${300 * (1 - progress)}%`}
                        strokeLinecap="round"
                        animate={{ strokeDashoffset: `${300 * (1 - progress)}%` }}
                        transition={{ duration: 1, ease: "linear" }}
                      />
                  </svg>

                  {/* Time Display */}
                  <div className="text-center z-10">
                      <div className="font-mono text-8xl font-medium tracking-tighter text-black tabular-nums">
                          {formatTime(timeLeft)}
                      </div>
                      <div className="mt-6 flex justify-center gap-4">
                          <button 
                            onClick={() => setIsActive(!isActive)}
                            className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                          >
                              {isActive ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-1" />}
                          </button>
                          <button 
                            onClick={() => setTimeLeft(25 * 60)}
                            className="w-14 h-14 rounded-full border border-gray-200 text-gray-400 flex items-center justify-center hover:border-black hover:text-black transition-colors"
                          >
                              <RotateCcw className="w-6 h-6" />
                          </button>
                      </div>
                  </div>
              </div>

              {/* Status Pill */}
              <div className="mt-12 px-6 py-3 bg-white border border-gray-200 rounded-full text-xs font-bold uppercase tracking-widest text-gray-500 shadow-sm flex items-center gap-3 cursor-pointer hover:border-black transition-colors" onClick={() => {
                  setMode(mode === 'FOCUS' ? 'BREAK' : 'FOCUS');
                  setTimeLeft(mode === 'FOCUS' ? 5*60 : 25*60);
                  setIsActive(false);
              }}>
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                  {mode} SESSION <span className="text-[10px] text-gray-300 ml-1">(Click to Switch)</span>
              </div>

          </div>

          {/* RIGHT: TRACKER & ANALYSIS */}
          <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Daily Stats Card */}
              <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-serif text-lg text-black">Günlük Analiz</h3>
                      <BarChart3 className="w-5 h-5 text-gray-400" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-gray-50 rounded-xl">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total Focus</p>
                          <p className="text-3xl font-mono text-black">{Math.floor(todayFocus / 60)}h {todayFocus % 60}m</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Sessions</p>
                          <p className="text-3xl font-mono text-black">{sessionCount}</p>
                      </div>
                  </div>

                  {sessionCount > 0 ? (
                      <div className="text-xs text-gray-600 bg-green-50 border border-green-100 p-4 rounded-lg flex items-start gap-3">
                          <Zap className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                          <p>Harika! Bugün <span className="font-bold text-green-700">{todayFocus} dakika</span> boyunca odaklandın. İstikrar, başarının anahtarıdır.</p>
                      </div>
                  ) : (
                       <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 p-4 rounded-lg flex items-start gap-3">
                          <Target className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <p>Veri bekleniyor. İlk odak oturumunu başlatarak günlük serini oluşturmaya başla.</p>
                      </div>
                  )}
              </div>

              {/* Weekly Graph */}
              <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-serif text-lg text-black">Haftalık Veri</h3>
                      <Calendar className="w-5 h-5 text-gray-400" />
                  </div>
                  
                  <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2">
                      {WEEKLY_STATS.map((stat, i) => {
                          const isToday = i === 6;
                          // Use real todayFocus for the last bar, 0 for others (since we wiped history)
                          const value = isToday ? todayFocus : stat.minutes;
                          const height = Math.min(100, (value / 60) * 100); // Scale: 1 hour max for visual

                          return (
                              <div key={i} className="flex flex-col items-center gap-2 flex-1 group cursor-pointer">
                                  <div className="relative w-full bg-gray-100 rounded-sm h-32 flex items-end overflow-hidden">
                                      <motion.div 
                                        initial={{ height: 0 }}
                                        animate={{ height: `${height}%` }}
                                        className={`w-full ${isToday ? 'bg-black' : 'bg-gray-300'} transition-colors`}
                                      />
                                      {/* Tooltip */}
                                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                          {value} min
                                      </div>
                                  </div>
                                  <span className={`text-[10px] font-bold uppercase ${isToday ? 'text-black' : 'text-gray-400'}`}>
                                      {stat.day}
                                  </span>
                              </div>
                          )
                      })}
                  </div>
              </div>

          </div>
      </div>

      {/* --- WIDGETS LAYER --- */}
      {widgets.map((widget) => (
          <motion.div 
            key={widget.id}
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bg-white border border-gray-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] rounded-xl w-80 overflow-hidden z-30"
            style={{ left: widget.x, top: widget.y }}
          >
              {/* Widget Header */}
              <div className="bg-gray-50 border-b border-gray-100 p-3 flex justify-between items-center cursor-move active:cursor-grabbing">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                      {widget.type === 'tasks' && <><CheckSquare className="w-3 h-3" /> Quick Tasks</>}
                      {widget.type === 'sound' && <><Volume2 className="w-3 h-3" /> Ambient</>}
                  </span>
                  <button onClick={() => toggleWidget(widget.type)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                  </button>
              </div>

              {/* Widget Content */}
              <div className="p-4 bg-white">
                  
                  {/* TASKS WIDGET */}
                  {widget.type === 'tasks' && (
                      <div className="space-y-3">
                          <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                              {tasks.map(t => (
                                  <div key={t.id} className="flex items-start gap-2 group">
                                      <button 
                                        onClick={() => setTasks(tasks.map(tsk => tsk.id === t.id ? {...tsk, done: !tsk.done} : tsk))} 
                                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${t.done ? 'bg-black border-black text-white' : 'border-gray-300 hover:border-black'}`}
                                      >
                                          {t.done && <CheckSquare className="w-3 h-3" />}
                                      </button>
                                      <span className={`text-xs flex-1 break-words ${t.done ? 'line-through text-gray-400' : 'text-black'}`}>{t.text}</span>
                                      <button onClick={() => deleteTask(t.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Trash2 className="w-3 h-3" />
                                      </button>
                                  </div>
                              ))}
                          </div>
                          
                          <div className="flex gap-2 pt-2 border-t border-gray-100">
                              <input 
                                value={newTask} 
                                onChange={(e) => setNewTask(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                                placeholder="New task..." 
                                className="flex-1 text-xs border-none focus:ring-0 p-0 bg-transparent placeholder:text-gray-400"
                              />
                              <button onClick={addTask} className="text-black hover:bg-gray-100 p-1 rounded">
                                  <Plus className="w-4 h-4" />
                              </button>
                          </div>
                      </div>
                  )}

                  {/* SOUND WIDGET (Functional) */}
                  {widget.type === 'sound' && (
                      <div className="space-y-4">
                          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200" onClick={() => toggleSound('rain')}>
                              <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${playingSound === 'rain' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                      <Volume2 className="w-4 h-4" />
                                  </div>
                                  <span className="text-xs font-medium">Soft Rain</span>
                              </div>
                              {playingSound === 'rain' && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>}
                          </div>

                          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200" onClick={() => toggleSound('white')}>
                              <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${playingSound === 'white' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                                      <Volume2 className="w-4 h-4" />
                                  </div>
                                  <span className="text-xs font-medium">Deep Focus (Brown)</span>
                              </div>
                              {playingSound === 'white' && <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>}
                          </div>
                          
                          {playingSound !== 'none' && (
                              <div className="pt-2 text-[10px] text-gray-400 text-center uppercase tracking-widest border-t border-gray-100 mt-2">
                                  Playing Live Audio
                              </div>
                          )}
                      </div>
                  )}

              </div>
          </motion.div>
      ))}

    </div>
  );
}
