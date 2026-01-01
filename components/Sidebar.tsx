import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Zap, BookOpen, Layers, LogOut, PieChart, Info, Calendar, Lightbulb, Activity, Rocket, LayoutList, Network, Hexagon } from 'lucide-react';
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

export default function Sidebar({ activeView, onChangeView, user, onLogout, language, setLanguage }: SidebarProps) {
  const t = translations[language].menu;

  const menuItems = [
    { id: 'dashboard', icon: Activity, label: t.dashboard }, 
    { id: 'construct', icon: Network, label: t.construct }, 
    { id: 'neurallist', icon: LayoutList, label: t.neurallist },
    { id: 'keypoints', icon: Lightbulb, label: t.keypoints }, 
    { id: 'quiz', icon: Brain, label: t.quiz },
    { id: 'speedrun', icon: Rocket, label: t.speedrun },
    { id: 'flashcards', icon: Layers, label: t.flashcards },
    { id: 'schedule', icon: Calendar, label: t.schedule },
    { id: 'notes', icon: BookOpen, label: t.notes },
    { id: 'pomodoro', icon: Zap, label: t.pomodoro },
    { id: 'report', icon: PieChart, label: t.report },
    { id: 'about', icon: Info, label: t.about },
  ];

  return (
    <motion.div 
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="hidden md:flex flex-col w-[280px] h-screen border-r border-gray-100 bg-white relative z-50"
    >
      
      {/* Brand - Reverted to Clean Serif */}
      <div className="h-32 flex flex-col justify-center px-8">
        <h1 
          className="font-serif text-4xl font-medium text-black tracking-tighter cursor-pointer" 
          onClick={() => onChangeView('dashboard')}
        >
          Neurally
        </h1>
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mt-1 ml-0.5">Cognitive OS</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id as AppView)}
              className={`
                relative group flex items-center w-full px-4 py-3.5 rounded-lg transition-all duration-200 z-10
                ${isActive ? 'text-black bg-gray-100 font-medium' : 'text-gray-500 hover:text-black hover:bg-gray-50'}
              `}
            >
              <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-black' : 'text-gray-400 group-hover:text-black'}`} strokeWidth={1.5} />
              <span className="ml-3 font-sans text-xs tracking-wide relative z-10">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* FOOTER: MINIMALIST PROFILE */}
      <div className="p-8 border-t border-gray-100 bg-white">
        
        {/* Language Toggles */}
        <div className="flex gap-2 mb-6">
            {(['tr', 'en'] as Language[]).map((lang) => (
                <button 
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`text-[10px] font-bold uppercase tracking-widest transition-all ${language === lang ? 'text-black border-b border-black' : 'text-gray-300 hover:text-gray-500'}`}
                >
                {lang}
                </button>
            ))}
        </div>

        {/* User Info - Clean & Professional */}
        <div className="flex items-start gap-3">
            <img src={user.avatar} alt="User" className="w-8 h-8 rounded-full grayscale opacity-80" />
            <div className="flex-1 min-w-0">
                <h4 className="font-serif text-sm font-medium text-black truncate leading-tight">
                    {user.name}
                </h4>
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mt-0.5">
                    {user.tier} Plan
                </p>
            </div>
            <button onClick={onLogout} className="text-gray-300 hover:text-black transition-colors" title="Logout">
                <LogOut className="w-4 h-4" />
            </button>
        </div>

      </div>
    </motion.div>
  );
}