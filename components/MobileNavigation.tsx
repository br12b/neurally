
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid, 
  BrainCircuit, 
  CalendarRange, 
  Menu, 
  X, 
  AudioLines, 
  GalleryVerticalEnd, 
  Network, 
  FileText, 
  Sparkles, 
  Timer, 
  Zap, 
  LineChart, 
  HelpCircle,
  Swords,
  Languages,
  LogOut,
  Globe // New Icon
} from 'lucide-react';
import { AppView, User } from '../types';

interface MobileNavigationProps {
  activeView: AppView;
  onChangeView: (view: AppView) => void;
  user: User;
  onLogout: () => void;
}

export default function MobileNavigation({ activeView, onChangeView, user, onLogout }: MobileNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Primary tabs shown on the bottom bar
  const primaryTabs = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Analiz' },
    { id: 'quiz', icon: BrainCircuit, label: 'Quiz' },
    { id: 'schedule', icon: CalendarRange, label: 'Plan' },
  ];

  // Full menu list for the drawer
  const allMenuItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Analiz Merkezi' },
    { id: 'hub', icon: Globe, label: 'Global Study Hub' }, // New Item
    { id: 'quiz', icon: BrainCircuit, label: 'Aktif Hatırlama' },
    { id: 'language', icon: Languages, label: 'Dil Rotası' },
    { id: 'podcast', icon: AudioLines, label: 'Neural Podcast' },
    { id: 'flashcards', icon: GalleryVerticalEnd, label: 'Kartlar' },
    { id: 'neurallist', icon: Network, label: 'Neural List' },
    { id: 'notes', icon: FileText, label: 'Akıllı Notlar' },
    { id: 'keypoints', icon: Sparkles, label: 'Püf Noktalar' },
    { id: 'schedule', icon: CalendarRange, label: 'Haftalık Program' },
    { id: 'edu', icon: Swords, label: 'Quiz Arena' },
    { id: 'pomodoro', icon: Timer, label: 'Odak Modu' },
    { id: 'speedrun', icon: Zap, label: 'Hız Tüneli' },
    { id: 'report', icon: LineChart, label: 'Gelişim Raporu' },
    { id: 'about', icon: HelpCircle, label: 'Hakkında' },
  ];

  const handleNavClick = (view: string) => {
    onChangeView(view as AppView);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Spacer to prevent content from being hidden behind bottom bar */}
      <div className="h-20 md:hidden" />

      {/* FIXED BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-gray-200 z-[90] md:hidden px-6 flex items-center justify-between shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
        {primaryTabs.map((tab) => {
          const isActive = activeView === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleNavClick(tab.id)}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-black -translate-y-1' : 'text-gray-400'}`}
            >
              <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-black text-white shadow-lg' : ''}`}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* MENU BUTTON */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="flex flex-col items-center gap-1 text-gray-400"
        >
          <div className="p-2">
             <Menu className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-0">Menu</span>
        </button>
      </div>

      {/* FULL SCREEN MENU DRAWER */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-[#FAFAFA] md:hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-gray-100 bg-white">
              <div className="flex items-center gap-3">
                 <img src={user.avatar} className="w-10 h-10 rounded-full border border-gray-200" alt="User" />
                 <div>
                    <h3 className="font-bold text-sm text-black">{user.name}</h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">{user.stats?.rankTitle || 'Scholar'}</p>
                 </div>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                <X className="w-6 h-6 text-black" />
              </button>
            </div>

            {/* Menu Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-4">
                    {allMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNavClick(item.id)}
                                className={`
                                    p-4 rounded-2xl border text-left flex flex-col gap-3 transition-all
                                    ${isActive ? 'bg-black border-black text-white shadow-lg' : 'bg-white border-gray-100 text-gray-600 active:scale-95'}
                                `}
                            >
                                <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-black'}`} strokeWidth={1.5} />
                                <span className="text-xs font-bold uppercase tracking-wide leading-tight">
                                    {item.label}
                                </span>
                            </button>
                        )
                    })}
                </div>

                <div className="mt-8 mb-24">
                    <button 
                        onClick={onLogout}
                        className="w-full py-4 border border-red-100 bg-red-50 text-red-600 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" /> Çıkış Yap
                    </button>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
