
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid, 
  BrainCircuit, 
  AudioLines, 
  GalleryVerticalEnd, 
  Network, 
  FileText, 
  Sparkles, 
  CalendarRange, 
  Timer, 
  Zap, 
  LineChart, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Swords, 
  Languages,
  Globe // New Icon
} from 'lucide-react';
import { AppView, User, Language } from '../types';
import { translations } from '../utils/translations';

interface SidebarProps {
  activeView: AppView;
  onChangeView: (view: AppView) => void;
  user: User;
  onLogout: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

// --- RESTORED ORIGINAL CIPHER LOGO ---
const CipherLogo = () => {
    const [text, setText] = useState("Neurally");
    const [isHovering, setIsHovering] = useState(false);
    const originalText = "Neurally";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    
    // Neural Icon Animation
    const spinTransition = { duration: 20, ease: "linear", repeat: Infinity };

    const handleMouseEnter = () => {
        setIsHovering(true);
        let iteration = 0;
        const interval = setInterval(() => {
            setText(prev => 
                originalText.split("").map((letter, index) => {
                    if (index < iteration) {
                        return originalText[index];
                    }
                    return chars[Math.floor(Math.random() * chars.length)];
                }).join("")
            );

            if (iteration >= originalText.length) {
                clearInterval(interval);
                setText(originalText);
            }

            iteration += 1 / 3; 
        }, 30);
    };

    return (
        <div 
            className="flex items-center gap-3 group cursor-pointer" 
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Neural Core Icon */}
            <div className="relative w-10 h-10 flex items-center justify-center">
                {/* Outer Ring */}
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={spinTransition}
                    className="absolute inset-0 border border-gray-300 rounded-full border-dashed"
                />
                {/* Inner Ring - Counter Rotate */}
                <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ ...spinTransition, duration: 15 }}
                    className="absolute inset-1.5 border border-black rounded-full border-t-transparent border-l-transparent"
                />
                {/* Core Pulse */}
                <motion.div 
                    animate={{ scale: isHovering ? [1, 1.2, 1] : 1 }}
                    className="w-2 h-2 bg-black rounded-full"
                />
            </div>

            <div className="flex flex-col">
                <h1 className="font-serif text-3xl font-medium text-black tracking-tight w-[140px] tabular-nums">
                    {text}
                </h1>
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className={`w-1 h-1 rounded-full transition-colors duration-300 ${isHovering ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                    <p className="text-[9px] text-gray-400 uppercase tracking-[0.3em] font-mono">
                        Cognitive OS
                    </p>
                </div>
            </div>
        </div>
    );
};

export default function Sidebar({ activeView, onChangeView, user, onLogout, language, setLanguage }: SidebarProps) {
  const t = translations[language].menu;

  const menuItems = [
    { id: 'dashboard', icon: LayoutGrid, label: t.dashboard },
    { id: 'hub', icon: Globe, label: t.hub }, // New Item
    { id: 'quiz', icon: BrainCircuit, label: t.quiz },
    { id: 'language', icon: Languages, label: t.language },
    { id: 'podcast', icon: AudioLines, label: t.podcast },
    { id: 'flashcards', icon: GalleryVerticalEnd, label: t.flashcards },
    { id: 'neurallist', icon: Network, label: t.neurallist },
    { id: 'notes', icon: FileText, label: t.notes },
    { id: 'keypoints', icon: Sparkles, label: t.keypoints },
    { id: 'schedule', icon: CalendarRange, label: t.schedule },
    { id: 'edu', icon: Swords, label: "Quiz Arena" }, 
    { id: 'pomodoro', icon: Timer, label: t.pomodoro },
    { id: 'speedrun', icon: Zap, label: t.speedrun },
    { id: 'report', icon: LineChart, label: t.report },
    { id: 'about', icon: HelpCircle, label: t.about },
  ];

  return (
    <motion.div 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="hidden md:flex flex-col w-[280px] h-screen bg-white border-r border-gray-100 relative z-50 font-sans"
    >
      
      {/* HEADER */}
      <div className="h-32 flex flex-col justify-center px-8" onClick={() => onChangeView('dashboard')}>
        <CipherLogo />
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-6 space-y-1 pb-6">
        {menuItems.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id as AppView)}
              className={`
                relative w-full flex items-center h-12 px-4 rounded-xl transition-all duration-300 group
                ${isActive ? 'text-black' : 'text-gray-400 hover:text-gray-900'}
              `}
            >
              {/* Magic Motion Background */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-bg"
                  className="absolute inset-0 bg-gray-100 rounded-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <div className="relative z-10 flex items-center gap-4 w-full">
                <Icon 
                    className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} 
                    strokeWidth={1.5} 
                />
                <span className={`text-sm font-medium tracking-wide ${isActive ? 'font-semibold' : ''}`}>
                    {item.label}
                </span>
                
                {/* Active Chevron Indicator */}
                {isActive && (
                    <motion.div 
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="ml-auto"
                    >
                        <ChevronRight className="w-3 h-3 text-black" />
                    </motion.div>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* FOOTER: Minimal User Profile */}
      <div className="p-6 border-t border-gray-100 bg-white">
        
        {/* Language Toggle */}
        <div className="flex justify-center mb-6">
            <div className="bg-gray-100 p-1 rounded-full flex relative">
                <motion.div 
                    layoutId="lang-active"
                    className={`absolute top-1 bottom-1 w-[30px] bg-white rounded-full shadow-sm ${language === 'tr' ? 'left-1' : 'left-[38px]'}`}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                <button 
                    onClick={() => setLanguage('tr')}
                    className={`relative z-10 w-9 h-6 text-[10px] font-bold uppercase transition-colors ${language === 'tr' ? 'text-black' : 'text-gray-400'}`}
                >
                    TR
                </button>
                <button 
                    onClick={() => setLanguage('en')}
                    className={`relative z-10 w-9 h-6 text-[10px] font-bold uppercase transition-colors ${language === 'en' ? 'text-black' : 'text-gray-400'}`}
                >
                    EN
                </button>
            </div>
        </div>

        <div className="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-colors">
            <div className="relative">
                <img src={user.avatar} alt="User" className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                <div className="absolute bottom-0 right-0 bg-black text-white text-[8px] font-bold px-1 rounded-full border border-white">
                    {user.stats?.level || 1}
                </div>
            </div>
            
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs text-black truncate leading-tight">
                    {user.name}
                </h4>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-mono truncate">
                    {user.stats?.rankTitle || "Novice"}
                </p>
            </div>

            <button 
                onClick={onLogout} 
                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Logout"
            >
                <LogOut className="w-4 h-4" />
            </button>
        </div>
      </div>

    </motion.div>
  );
}
