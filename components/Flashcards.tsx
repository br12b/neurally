
import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, ArrowLeft, ArrowRight, Lightbulb, Plus, X, Database, Sparkles, Loader2, Image as ImageIcon, Trash2, Upload, Filter, Tag } from 'lucide-react';
import { Flashcard } from '../types';
import { createAIClient } from '../utils/ai';

interface FlashcardsProps {
  cards: Flashcard[];
  onAddCard: (card: Flashcard) => void;
  onDeleteCard?: (id: number) => void; // Added Delete Prop
}

export default function Flashcards({ cards, onAddCard, onDeleteCard }: FlashcardsProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // New Card State
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [newTag, setNewTag] = useState("GEN");
  const [newImage, setNewImage] = useState<string | null>(null);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter Cards based on Selection
  const filteredCards = useMemo(() => {
      if (!selectedTag) return cards;
      return cards.filter(c => c.tag === selectedTag);
  }, [cards, selectedTag]);

  // Extract Unique Tags
  const uniqueTags = useMemo(() => {
      const tags = new Set(cards.map(c => c.tag));
      return Array.from(tags).sort();
  }, [cards]);

  const currentCard = filteredCards[currentIndex];

  const handleNext = () => { setIsFlipped(false); setTimeout(() => setCurrentIndex((prev) => (prev + 1) % filteredCards.length), 200); };
  const handlePrev = () => { setIsFlipped(false); setTimeout(() => setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length), 200); };

  const handleCreate = () => {
    if(!newFront || !newBack) return;
    const newCard: Flashcard = {
        id: Date.now(),
        front: newFront,
        back: newBack,
        tag: newTag.toUpperCase(),
        mnemonicImage: newImage || undefined
    };
    onAddCard(newCard);
    resetForm();
    setIsCreating(false);
    // Reset filter to see new card if possible, or stay
    if (newTag === selectedTag) setCurrentIndex(filteredCards.length); 
  };

  const handleDeleteCurrent = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (currentCard && onDeleteCard) {
          if (confirm("Kart silinsin mi? / Delete card?")) {
              onDeleteCard(currentCard.id);
              setIsFlipped(false);
              setCurrentIndex(0); // Reset index to avoid out of bounds
          }
      }
  };

  const resetForm = () => {
    setNewFront("");
    setNewBack("");
    setNewImage(null);
    setNewTag("GEN");
  }

  // MANUAL IMAGE UPLOAD
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
               setNewImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  // AI IMAGE GENERATION (VISUAL MNEMONIC)
  const handleGenerateMnemonic = async () => {
      if (!newFront && !newBack) {
          alert("Please enter a question or answer first to generate a context.");
          return;
      }

      setIsGeneratingImg(true);
      try {
          const ai = createAIClient();
          const prompt = `Create a surreal, minimalist, and highly memorable 'Visual Mnemonic' illustration to help a student memorize this concept.
          Concept/Question: "${newFront}"
          Answer/Definition: "${newBack}"
          Style: High-contrast line art with a single focal point. Symbolic and abstract. 
          Do NOT include text in the image.`;

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image', 
              contents: { parts: [{ text: prompt }] }
          });

          if (response.candidates?.[0]?.content?.parts) {
              for (const part of response.candidates[0].content.parts) {
                  if (part.inlineData && part.inlineData.data) {
                      const base64String = part.inlineData.data;
                      setNewImage(`data:image/png;base64,${base64String}`);
                      break;
                  }
              }
          }
      } catch (error) {
          console.error("Mnemonic Gen Error:", error);
          alert("Visual generation failed. Try again or check API limits.");
      } finally {
          setIsGeneratingImg(false);
      }
  };

  return (
    <div className="h-full flex flex-col p-8 lg:p-12 max-w-[1600px] mx-auto">
      
      {/* Header & Filter Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6"
      >
        <div>
           <h1 className="font-serif text-5xl text-black mb-2">Flashcards</h1>
           <p className="text-gray-400 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
              <Database className="w-3 h-3" />
              {cards.length} Synaptic Connections
           </p>
        </div>
        
        <div className="flex items-center gap-4">
             {/* Category Filter */}
             <div className="flex items-center gap-2 overflow-x-auto max-w-[300px] md:max-w-[500px] custom-scrollbar pb-2">
                 <button 
                    onClick={() => { setSelectedTag(null); setCurrentIndex(0); }}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap
                        ${!selectedTag ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 hover:text-black'}
                    `}
                 >
                    All Decks
                 </button>
                 {uniqueTags.map(tag => (
                     <button 
                        key={tag}
                        onClick={() => { setSelectedTag(tag); setCurrentIndex(0); }}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border
                            ${selectedTag === tag ? 'bg-white border-black text-black shadow-sm' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400'}
                        `}
                     >
                        {tag}
                     </button>
                 ))}
             </div>

             <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsCreating(true)}
                className="px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg shrink-0"
             >
                <Plus className="w-4 h-4" /> Create
             </motion.button>
        </div>
      </motion.div>

      {/* Creation Modal */}
      <AnimatePresence>
        {isCreating && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex items-center justify-center p-4"
                onClick={() => setIsCreating(false)}
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white border border-black p-8 w-full max-w-2xl shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden"
                >
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h3 className="font-serif text-2xl flex items-center gap-2">
                            New Synapse 
                            {newImage && <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-sans font-bold uppercase tracking-wider">Visual Enhanced</span>}
                        </h3>
                        <button onClick={() => setIsCreating(false)}><X className="w-6 h-6 hover:rotate-90 transition-transform" /></button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        {/* LEFT: TEXT INPUTS */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest block mb-2 text-gray-500">Question (Front)</label>
                                <input 
                                    value={newFront} 
                                    onChange={(e) => setNewFront(e.target.value)}
                                    className="w-full border-b-2 border-gray-100 p-3 font-serif text-lg focus:border-black outline-none transition-colors bg-transparent placeholder:text-gray-300" 
                                    placeholder="e.g. Mitochondria function?"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest block mb-2 text-gray-500">Answer (Back)</label>
                                <textarea 
                                    value={newBack} 
                                    onChange={(e) => setNewBack(e.target.value)}
                                    className="w-full border border-gray-100 bg-gray-50 p-3 font-sans text-sm focus:border-black outline-none transition-colors h-32 resize-none rounded-lg" 
                                    placeholder="The definition..."
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest block mb-2 text-gray-500 flex justify-between">
                                    Tag / Category
                                </label>
                                <div className="relative">
                                    <input 
                                        value={newTag} 
                                        onChange={(e) => setNewTag(e.target.value)}
                                        className="w-full border-b border-gray-100 p-2 font-mono text-xs focus:border-black outline-none transition-colors uppercase" 
                                        placeholder="BIO"
                                    />
                                    {/* Tag Suggestions */}
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                        {uniqueTags.slice(0, 4).map(t => (
                                            <button 
                                                key={t}
                                                onClick={() => setNewTag(t)}
                                                className="text-[9px] px-2 py-1 bg-gray-100 text-gray-500 hover:bg-black hover:text-white rounded transition-colors"
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: IMAGE GENERATOR */}
                        <div className="flex flex-col h-full">
                            <label className="text-xs font-bold uppercase tracking-widest block mb-2 text-gray-500 flex items-center justify-between">
                                <span className="flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Visual Mnemonic</span>
                            </label>
                            
                            <div className="flex-1 bg-gray-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center relative overflow-hidden group">
                                {newImage ? (
                                    <>
                                        <img src={newImage} alt="Mnemonic" className="w-full h-full object-cover" />
                                        <button 
                                            onClick={() => setNewImage(null)}
                                            className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-full hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center p-6">
                                        {isGeneratingImg ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                                                <span className="text-xs font-mono text-purple-600 animate-pulse">Dreaming...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                <p className="text-xs text-gray-400 max-w-[150px] mx-auto leading-relaxed">
                                                    Generate with AI or upload your own visual anchor.
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 mt-4">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold text-[10px] uppercase tracking-widest hover:border-black hover:text-black transition-all flex items-center justify-center gap-2 rounded-lg"
                                >
                                    <Upload className="w-3 h-3" /> Upload
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </button>
                                <button 
                                    onClick={handleGenerateMnemonic}
                                    disabled={isGeneratingImg || (!newFront && !newBack)}
                                    className="flex-[2] py-3 bg-purple-50 text-purple-700 border border-purple-100 font-bold text-[10px] uppercase tracking-widest hover:bg-purple-100 transition-all flex items-center justify-center gap-2 rounded-lg disabled:opacity-50"
                                >
                                    <Sparkles className="w-3 h-3" /> 
                                    {newImage ? 'Regenerate' : 'AI Generate'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleCreate}
                        disabled={!newFront || !newBack}
                        className="w-full py-5 bg-black text-white font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all mt-8 disabled:opacity-50"
                    >
                        Save Synapse
                    </button>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Card Display */}
      {filteredCards.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto"
          >
              <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mb-6 border border-gray-100">
                 <Tag className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-2xl text-black mb-2">
                 {selectedTag ? `Empty Deck: ${selectedTag}` : 'System Idle'}
              </h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                 {selectedTag ? 'No cards found in this category. Create one?' : 'Neural database is empty. Waiting for input.'}
              </p>
              <button 
                onClick={() => setIsCreating(true)}
                className="px-6 py-3 border border-black text-black font-bold text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all flex items-center gap-2"
              >
                  <Plus className="w-4 h-4" /> Create Card
              </button>
          </motion.div>
      ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
             
             {/* Progress */}
             <div className="mb-8 flex items-center gap-4 w-full max-w-2xl">
                <span className="font-mono text-xs text-gray-400">
                    {String(currentIndex + 1).padStart(2, '0')} / {String(filteredCards.length).padStart(2, '0')}
                </span>
                <div className="flex-1 h-px bg-gray-200">
                    <motion.div 
                      className="h-full bg-black" 
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentIndex + 1) / filteredCards.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                </div>
             </div>

             {/* The Card - With Spring Physics */}
             <div className="relative w-full max-w-3xl aspect-[1.6/1] perspective-1000 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
                <motion.div
                  className="w-full h-full relative preserve-3d"
                  initial={false}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* FRONT */}
                  <div 
                    className="absolute inset-0 backface-hidden bg-white border border-gray-200 p-12 flex flex-col items-center justify-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:border-black transition-all duration-300 rounded-xl overflow-hidden"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                      <div className="absolute top-0 right-0 p-6 flex gap-2">
                        {currentCard.mnemonicImage && (
                            <span className="flex items-center gap-1 font-mono text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">
                                <Sparkles className="w-3 h-3" /> VISUAL
                            </span>
                        )}
                        <span className="font-mono text-xs font-bold border border-black px-2 py-1 rounded">
                            {currentCard.tag}
                        </span>
                        {onDeleteCard && (
                            <button 
                                onClick={handleDeleteCurrent}
                                className="p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded transition-colors z-20"
                                title="Delete Card"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                      </div>
                      
                      <h3 className="font-serif text-3xl md:text-5xl text-black leading-tight select-none z-10">
                          {currentCard.front}
                      </h3>

                      <div className="absolute bottom-8 text-xs font-bold uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors flex items-center gap-2">
                          <RotateCw className="w-3 h-3" /> Reveal
                      </div>
                  </div>

                  {/* BACK */}
                  <div 
                      className="absolute inset-0 backface-hidden bg-black text-white p-0 flex flex-col justify-center text-center rounded-xl overflow-hidden shadow-2xl"
                      style={{ 
                          transform: "rotateY(180deg)", 
                          backfaceVisibility: "hidden",
                          WebkitBackfaceVisibility: "hidden"
                      }}
                  >
                      {currentCard.mnemonicImage ? (
                          <div className="flex h-full w-full">
                              <div className="w-1/2 p-8 flex flex-col justify-center items-center border-r border-white/10">
                                  <p className="font-sans text-xl font-light leading-relaxed select-none">
                                    {currentCard.back}
                                  </p>
                                  <div className="mt-8 flex items-center justify-center gap-2 text-gray-500">
                                      <Lightbulb className="w-4 h-4" />
                                      <span className="text-xs font-bold uppercase tracking-widest">Rationale</span>
                                  </div>
                              </div>
                              <div className="w-1/2 relative bg-neutral-900 h-full overflow-hidden">
                                  <img 
                                    src={currentCard.mnemonicImage} 
                                    alt="Mnemonic" 
                                    className="w-full h-full object-cover" 
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-50"></div>
                                  <div className="absolute bottom-4 right-4 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[9px] font-mono text-white/70 uppercase border border-white/10">
                                      Visual Anchor
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="p-12 flex flex-col justify-center h-full">
                              <p className="font-sans text-2xl font-light leading-relaxed select-none">
                                {currentCard.back}
                              </p>
                              <div className="mt-8 flex items-center justify-center gap-2 text-gray-500">
                                  <Lightbulb className="w-4 h-4" />
                                  <span className="text-xs font-bold uppercase tracking-widest">Rationale</span>
                              </div>
                          </div>
                      )}
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
