import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, ArrowLeft, ArrowRight, Lightbulb, Plus, X, Layers, ScanLine, Database } from 'lucide-react';
import { Flashcard } from '../types';

interface FlashcardsProps {
  cards: Flashcard[];
  onAddCard: (card: Flashcard) => void;
}

export default function Flashcards({ cards, onAddCard }: FlashcardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // New Card State
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [newTag, setNewTag] = useState("GEN");

  const currentCard = cards[currentIndex];

  const handleNext = () => { setIsFlipped(false); setTimeout(() => setCurrentIndex((prev) => (prev + 1) % cards.length), 200); };
  const handlePrev = () => { setIsFlipped(false); setTimeout(() => setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length), 200); };

  const handleCreate = () => {
    if(!newFront || !newBack) return;
    const newCard: Flashcard = {
        id: Date.now(),
        front: newFront,
        back: newBack,
        tag: newTag.toUpperCase()
    };
    onAddCard(newCard);
    setIsCreating(false);
    setNewFront("");
    setNewBack("");
  };

  return (
    <div className="h-full flex flex-col p-8 lg:p-12 max-w-[1600px] mx-auto">
      
      {/* Header & Actions */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-end mb-12"
      >
        <div>
           <h1 className="font-serif text-5xl text-black mb-2">Flashcards</h1>
           <p className="text-gray-400 font-mono text-xs uppercase tracking-widest">
              Spaced Repetition System
           </p>
        </div>
        <motion.button 
           whileHover={{ scale: 1.05 }}
           whileTap={{ scale: 0.95 }}
           onClick={() => setIsCreating(true)}
           className="px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center gap-2"
        >
           <Plus className="w-4 h-4" /> Create Card
        </motion.button>
      </motion.div>

      {/* Creation Modal */}
      <AnimatePresence>
        {isCreating && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-white/80 backdrop-blur-md flex items-center justify-center p-4"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white border border-black p-8 w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-serif text-2xl">New Synapse</h3>
                        <button onClick={() => setIsCreating(false)}><X className="w-6 h-6" /></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest block mb-2">Question (Front)</label>
                            <input 
                                value={newFront} 
                                onChange={(e) => setNewFront(e.target.value)}
                                className="w-full border border-gray-200 p-3 font-serif focus:border-black outline-none transition-colors" 
                                placeholder="e.g. What is the powerhouse of the cell?"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest block mb-2">Answer (Back)</label>
                            <textarea 
                                value={newBack} 
                                onChange={(e) => setNewBack(e.target.value)}
                                className="w-full border border-gray-200 p-3 font-sans text-sm focus:border-black outline-none transition-colors h-24 resize-none" 
                                placeholder="e.g. Mitochondria"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest block mb-2">Tag</label>
                            <input 
                                value={newTag} 
                                onChange={(e) => setNewTag(e.target.value)}
                                className="w-full border border-gray-200 p-3 font-mono text-xs focus:border-black outline-none transition-colors" 
                                placeholder="BIO"
                            />
                        </div>
                        <button 
                            onClick={handleCreate}
                            className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest hover:bg-gray-800 transition-all mt-4"
                        >
                            Save to Deck
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Card Display */}
      {cards.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto"
          >
              <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                 <div className="absolute inset-0 border border-gray-200 rounded-full animate-ping opacity-20"></div>
                 <div className="absolute inset-0 border border-gray-100 rounded-full animate-ping opacity-10 animation-delay-500"></div>
                 <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center z-10 border border-gray-100">
                    <Database className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
                 </div>
              </div>
              
              <h3 className="font-serif text-2xl text-black mb-2">System Idle</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                 Neural database is empty. Waiting for input to generate synaptic connections.
              </p>
              
              <button 
                onClick={() => setIsCreating(true)}
                className="px-6 py-3 border border-black text-black font-bold text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all flex items-center gap-2"
              >
                  <Plus className="w-4 h-4" /> Initialize Data
              </button>
          </motion.div>
      ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
             
             {/* Progress */}
             <div className="mb-8 flex items-center gap-4 w-full max-w-2xl">
                <span className="font-mono text-xs text-gray-400">
                    {String(currentIndex + 1).padStart(2, '0')} / {String(cards.length).padStart(2, '0')}
                </span>
                <div className="flex-1 h-px bg-gray-200">
                    <motion.div 
                      className="h-full bg-black" 
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                </div>
             </div>

             {/* The Card - With Spring Physics */}
             <div className="relative w-full max-w-2xl aspect-[1.6/1] perspective-1000 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
                <motion.div
                  className="w-full h-full relative preserve-3d"
                  initial={false}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* FRONT */}
                  <div className="absolute inset-0 backface-hidden bg-white border border-gray-200 p-12 flex flex-col items-center justify-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:border-black transition-all duration-300 rounded-sm">
                      <span className="absolute top-8 right-8 font-mono text-xs font-bold border border-black px-2 py-1">
                          {currentCard.tag}
                      </span>
                      
                      <h3 className="font-serif text-3xl md:text-4xl text-black leading-tight select-none">
                          {currentCard.front}
                      </h3>

                      <div className="absolute bottom-8 text-xs font-bold uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors flex items-center gap-2">
                          <RotateCw className="w-3 h-3" /> Reveal
                      </div>
                  </div>

                  {/* BACK */}
                  <div 
                      className="absolute inset-0 backface-hidden bg-black text-white p-12 flex flex-col justify-center text-center rounded-sm"
                      style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
                  >
                      <p className="font-sans text-xl font-light leading-relaxed select-none">
                        {currentCard.back}
                      </p>
                      <div className="mt-8 flex items-center justify-center gap-2 text-gray-500">
                          <Lightbulb className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-widest">Rationale</span>
                      </div>
                  </div>
                </motion.div>
             </div>

             {/* Controls */}
             <div className="flex items-center gap-12 mt-12">
                <motion.button 
                  whileHover={{ scale: 1.1, x: -5 }} 
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePrev} 
                  className="group p-4 bg-white text-black rounded-full border border-gray-200 hover:border-black shadow-sm"
                >
                    <ArrowLeft className="w-6 h-6" />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.1, x: 5 }} 
                  whileTap={{ scale: 0.9 }}
                  onClick={handleNext} 
                  className="group p-4 bg-white text-black rounded-full border border-gray-200 hover:border-black shadow-sm"
                >
                    <ArrowRight className="w-6 h-6" />
                </motion.button>
             </div>
          </div>
      )}
    </div>
  );
}