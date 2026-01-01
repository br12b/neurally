import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Brain, Zap, BookOpen, Layers, LogOut, PieChart, Info, Calendar, Lightbulb, Activity, Rocket, LayoutList } from 'lucide-react';
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
    { id: 'neurallist', icon: LayoutList, label: t.neurallist }, // UPDATED ITEM
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
      
      {/* Brand - Dot Removed */}
      <div className="h-32 flex flex-col justify-center px-8">
        <h1 
          className="font-serif text-4xl font-semibold text-black tracking-tighter cursor-pointer hover:scale-[1.02] transition-transform origin-left" 
          onClick={() => onChangeView('dashboard')}
        >
          Neurally
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id as AppView)}
              className={`
                relative group flex items-center w-full px-4 py-4 rounded-xl transition-colors duration-200 z-10
                ${isActive ? 'text-white' : 'text-gray-400 hover:text-black'}
              `}
            >
              {/* Magic Motion Background */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-black rounded-xl z-[-1]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <Icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-white' : 'text-current'}`} strokeWidth={1.5} />
              <span className={`ml-4 font-sans text-sm tracking-wide relative z-10 ${isActive ? 'font-medium' : 'font-normal'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Language & User */}
      <div className="p-8 border-t border-gray-100 space-y-6 bg-white/50 backdrop-blur-sm">
        
        {/* Language Toggle */}
        <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg w-fit">
           {(['tr', 'en'] as Language[]).map((lang) => (
             <button 
               key={lang}
               onClick={() => setLanguage(lang)}
               className="relative px-3 py-1 text-[10px] font-bold rounded z-10"
             >
               {language === lang && (
                 <motion.div 
                   layoutId="activeLang"
                   className="absolute inset-0 bg-white shadow-sm rounded border border-gray-100 z-[-1]"
                   transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                 />
               )}
               <span className="relative z-10" style={{ color: language === lang ? '#000' : '#9CA3AF' }}>
                 {lang.toUpperCase()}
               </span>
             </button>
           ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold font-mono border border-gray-200">
             MY
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-black truncate">{user.name}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">{user.tier} Account</p>
          </div>
          <button onClick={onLogout} className="text-gray-400 hover:text-red-600 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}