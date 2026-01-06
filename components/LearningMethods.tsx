
import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Clock, Repeat, Mic, PenTool, ArrowUpRight } from 'lucide-react';

const methods = [
  {
    title: "Feynman Tekniği",
    description: "Konuyu 5 yaşındaki bir çocuğa anlatır gibi basitleştir. Takıldığın yerler, bilgi boşluklarını gösterir.",
    icon: Mic,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100"
  },
  {
    title: "Active Recall",
    description: "Pasif okuma yerine, bilgiyi beyninden aktif olarak çağırmaya zorla. Neurally'nin temel prensibidir.",
    icon: Brain,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-100"
  },
  {
    title: "Spaced Repetition",
    description: "Unutma eğrisini kırmak için bilgiyi artan aralıklarla (1, 3, 7 gün) tekrar et.",
    icon: Repeat,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100"
  },
  {
    title: "Pomodoro & Flow",
    description: "25dk odaklanma, 5dk mola. Nöroplastisiteyi artırmak için sıkı zaman blokları kullan.",
    icon: Clock,
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-100"
  },
  {
    title: "Blurting Method",
    description: "Çalıştıktan sonra kitaba bakmadan aklında kalan her şeyi boş bir kağıda yaz.",
    icon: PenTool,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-100"
  }
];

export default function LearningMethods() {
  return (
    <div className="p-8 lg:p-12 max-w-[1600px] mx-auto min-h-screen">
      
      <div className="mb-16 max-w-2xl">
        <h1 className="font-serif text-5xl font-medium text-ink-900 mb-4 tracking-tight">Öğrenme Metotları</h1>
        <p className="text-ink-500 text-lg leading-relaxed font-light">
          Bilişsel bilim tarafından kanıtlanmış bu teknikler, çalışma verimini %400'e kadar artırabilir. Ezberleme, öğren.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {methods.map((method, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative bg-white rounded-[2rem] p-8 border border-[#F0EFE9] hover:border-[#E7E5E4] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex justify-between items-start mb-6">
               <div className={`w-14 h-14 rounded-2xl ${method.bg} ${method.border} border flex items-center justify-center`}>
                 <method.icon className={`w-6 h-6 ${method.color}`} strokeWidth={1.5} />
               </div>
               <ArrowUpRight className="w-5 h-5 text-ink-300 group-hover:text-ink-900 transition-colors" />
            </div>
            
            <h3 className="font-serif text-2xl text-ink-900 mb-3">{method.title}</h3>
            
            <p className="text-ink-500 leading-relaxed text-sm font-medium">
              {method.description}
            </p>

            <div className="mt-8 pt-6 border-t border-[#F5F5F0] flex items-center gap-2">
               <span className="text-[10px] font-bold uppercase tracking-widest text-ink-300 group-hover:text-primary transition-colors">Bilimsel Kanıt</span>
               <div className="flex-1 h-px bg-[#F5F5F0]"></div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}