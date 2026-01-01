import React from 'react';
import { motion } from 'framer-motion';
import { Repeat, Zap, Layers } from 'lucide-react';
import { Language } from '../types';

interface AboutProps {
  language: Language;
}

export default function About({ language }: AboutProps) {
  const isTr = language === 'tr';

  return (
    <div className="p-8 lg:p-16 max-w-[1400px] mx-auto min-h-screen">
      
      {/* Hero */}
      <div className="text-center mb-24 max-w-4xl mx-auto">
         <h1 className="font-serif text-7xl md:text-8xl text-black mb-8 tracking-tighter leading-none">
            {isTr ? 'Bilişsel Mimari' : 'Cognitive Architecture'}
         </h1>
         <p className="text-2xl text-gray-500 font-light leading-relaxed">
            {isTr 
              ? 'Neurally, basit bir test uygulaması değil; öğrenme sürecini "veri odaklı bir mühendislik problemi" olarak ele alan, üniversite ve profesyonel seviyede bir zihin işletim sistemidir.' 
              : 'Neurally is not a quiz app. It is a high-performance mind operating system designed for university and professional level learning, treating education as a "data-driven engineering problem".'}
         </p>
      </div>

      {/* Methodology Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-24">
         
         <div className="space-y-6">
            <h2 className="font-serif text-4xl mb-6">
               {isTr ? 'Sistem Protokolleri' : 'System Protocols'}
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-8">
               {isTr 
                 ? 'Geleneksel "okuma ve altını çizme" yöntemleri modern akademi için verimsizdir. Neurally, nöroplastisiteyi manipüle ederek herhangi bir konudaki (Tıp, Hukuk, Mühendislik) öğrenme hızını %300 artırmak için tasarlanmıştır.' 
                 : 'Traditional "read and highlight" methods are inefficient for modern academia. Neurally is designed to increase learning speed by 300% in any field (Med, Law, Eng) by manipulating neuroplasticity.'}
            </p>
            
            <div className="h-px w-full bg-gray-200"></div>
         </div>

         <div className="grid grid-cols-1 gap-8">
            
            {/* Protocol 1 */}
            <div className="flex gap-6 items-start group">
               <div className="w-16 h-16 border border-gray-200 bg-white flex items-center justify-center shrink-0 group-hover:border-black transition-colors">
                  <Layers className="w-8 h-8 text-black" strokeWidth={1.5} />
               </div>
               <div>
                  <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                     {isTr ? 'Aktif Çağrışım (Active Recall)' : 'Active Recall'}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                     {isTr 
                       ? 'Bilgiyi pasif tüketmek yerine, zihinden "geri çağırmak" sinaptik bağları güçlendirir. Neurally, her seansta beyninizi bu efora zorlar.' 
                       : 'Instead of passively consuming information, "recalling" it from the mind strengthens synaptic bonds. Neurally forces your brain into this effort in every session.'}
                  </p>
               </div>
            </div>

            {/* Protocol 2 */}
            <div className="flex gap-6 items-start group">
               <div className="w-16 h-16 border border-gray-200 bg-white flex items-center justify-center shrink-0 group-hover:border-black transition-colors">
                  <Repeat className="w-8 h-8 text-black" strokeWidth={1.5} />
               </div>
               <div>
                  <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                     {isTr ? 'Aralıklı Tekrar (Spaced Repetition)' : 'Spaced Repetition'}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                     {isTr 
                       ? 'Unutma eğrisini hacklemek için algoritma, bir veriyi tam silinmek üzereyken size sorar. Bu, kalıcı hafızaya geçişin en verimli yoludur.' 
                       : 'To hack the forgetting curve, the algorithm asks you a piece of information just as you are about to forget it. This is the most efficient way to long-term memory.'}
                  </p>
               </div>
            </div>

            {/* Protocol 3 */}
            <div className="flex gap-6 items-start group">
               <div className="w-16 h-16 border border-gray-200 bg-white flex items-center justify-center shrink-0 group-hover:border-black transition-colors">
                  <Zap className="w-8 h-8 text-black" strokeWidth={1.5} />
               </div>
               <div>
                  <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                     {isTr ? 'Derin Odak (Deep Work)' : 'Deep Work'}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                     {isTr 
                       ? 'Pomodoro modülü, dikkati parçalayan dijital gürültüyü engeller. Flow (Akış) durumuna geçmek için biyolojik zamanlayıcıları kullanır.' 
                       : 'The Pomodoro module blocks digital noise that fragments attention. It uses biological timers to induce the Flow state.'}
                  </p>
               </div>
            </div>

         </div>
      </div>

      <div className="w-full h-px bg-black mb-20"></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
         <div>
            <h4 className="font-serif text-5xl mb-2">98%</h4>
            <p className="font-mono text-xs uppercase tracking-widest text-gray-400">Retention Rate</p>
         </div>
         <div>
            <h4 className="font-serif text-5xl mb-2">3.4x</h4>
            <p className="font-mono text-xs uppercase tracking-widest text-gray-400">Faster Learning</p>
         </div>
         <div>
            <h4 className="font-serif text-5xl mb-2">∞</h4>
            <p className="font-mono text-xs uppercase tracking-widest text-gray-400">Neural Plasticity</p>
         </div>
      </div>

    </div>
  );
}