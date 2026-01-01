import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Activity, BarChart3, AlertCircle, Download, Target, ChevronRight, ScanLine, Brain, Database, FileText } from 'lucide-react';
import { User, Language } from '../types';

interface ReportProps {
  user: User;
  language: Language;
}

export default function Report({ user, language }: ReportProps) {
  const isTr = language === 'tr';
  
  // REALITY CHECK: New users have no data. 
  // We switch to "Data Void" mode to encourage action.
  const hasData = false; 

  if (!hasData) {
    return (
        <div className="p-8 lg:p-16 max-w-[1600px] mx-auto min-h-screen flex flex-col">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-gray-100 pb-8">
                <div>
                    <h1 className="font-serif text-6xl text-black mb-2 tracking-tighter">
                        {isTr ? 'Gelişim Analizi' : 'Performance Audit'}
                    </h1>
                    <p className="text-gray-400 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-3 h-3" />
                        {isTr ? 'Veri Akışı Bekleniyor...' : 'Awaiting Data Stream...'}
                    </p>
                </div>
            </div>

            {/* EMPTY STATE: The Data Void */}
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-[2rem] bg-gray-50/50 relative overflow-hidden p-12">
                
                {/* Background Animation */}
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                     <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
                </div>

                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1 }}
                    className="relative z-10 text-center max-w-lg"
                >
                    <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
                        <div className="absolute inset-0 border border-gray-300 rounded-full animate-[spin_10s_linear_infinite]"></div>
                        <div className="absolute inset-2 border border-dashed border-gray-400 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
                        <ScanLine className="w-10 h-10 text-gray-400 animate-pulse" />
                    </div>

                    <h2 className="font-serif text-3xl font-bold mb-4">
                        {isTr ? 'Sinyal Yok' : 'No Signal Detected'}
                    </h2>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                        {isTr 
                          ? 'Neural sistem henüz analiz yapacak veri toplamada başarısız oldu. Algoritmaların çalışması için en az bir "Aktif Hatırlama" oturumu tamamlamanız gerekiyor.' 
                          : 'Neural system has failed to collect sufficient data for analysis. Complete at least one "Active Recall" session to initialize the algorithms.'}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button className="flex items-center justify-center gap-2 px-6 py-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-sharp hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                            <Brain className="w-4 h-4" /> {isTr ? 'Test Başlat' : 'Initiate Quiz'}
                        </button>
                        <button className="flex items-center justify-center gap-2 px-6 py-4 bg-white border border-black text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-all">
                            <FileText className="w-4 h-4" /> {isTr ? 'Not Yükle' : 'Upload Notes'}
                        </button>
                    </div>
                </motion.div>

                {/* Footer Status */}
                <div className="absolute bottom-8 flex gap-8 text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                    <span className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        Database: Empty
                    </span>
                    <span>Sync: Idle</span>
                </div>
            </div>
        </div>
    );
  }

  // If there was data, it would render here (keeping the structure for later)
  return null; 
}