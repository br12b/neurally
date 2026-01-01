import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ArrowRight, RotateCw, Trophy, LayoutGrid, Brain, Save, PlusCircle, AlertCircle, RefreshCcw, Search, Globe, ExternalLink, Loader2, StopCircle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Question, QuizState, Flashcard } from '../types';

interface NeurallyQuizProps {
  questions: Question[];
  onRedirectToDashboard?: () => void;
  onAddToFlashcards?: (card: Flashcard) => void;
}

interface SearchResult {
  title: string;
  url: string;
}

const NeurallyQuiz: React.FC<NeurallyQuizProps> = ({ questions, onRedirectToDashboard, onAddToFlashcards }) => {
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>(questions);
  const [wrongQuestionIds, setWrongQuestionIds] = useState<Set<number>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizState, setQuizState] = useState<QuizState>('active');
  const [direction, setDirection] = useState(0); // 1 for next, -1 for prev
  const [loopCount, setLoopCount] = useState(0); // Track how many times we looped
  
  // Search Grounding State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);

  useEffect(() => {
    // Reset everything when new questions come in
    setCurrentQuestions(questions);
    setCurrentIndex(0);
    setWrongQuestionIds(new Set());
    setQuizState('active');
    setIsAnswered(false);
    setSelectedOptionId(null);
    setLoopCount(0);
    setSearchResults(null);
  }, [questions]);

  // Clear search results when moving to next question
  useEffect(() => {
      setSearchResults(null);
      setIsSearching(false);
  }, [currentIndex]);

  // GOOGLE SEARCH GROUNDING
  const handleDeepDive = async () => {
      if (!currentQuestion) return;
      
      setIsSearching(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          // Using gemini-2.5-flash which supports googleSearch tool (or pro)
          // As per instructions, requesting grounding
          const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: `Find 3 high-quality, educational web sources that explain this concept: "${currentQuestion.text}". The context is biology/science education.`,
              config: {
                  tools: [{ googleSearch: {} }]
              }
          });

          // Extract Grounding Chunks
          const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          const links: SearchResult[] = [];

          if (chunks) {
              chunks.forEach((chunk: any) => {
                  if (chunk.web?.uri && chunk.web?.title) {
                      links.push({
                          title: chunk.web.title,
                          url: chunk.web.uri
                      });
                  }
              });
          }

          // Fallback if structured chunks are tricky, sometimes model puts them in text, 
          // but for this specific "search tool" request, chunks are the way.
          // If no chunks, we might parse text, but let's rely on chunks for valid grounding.
          setSearchResults(links.length > 0 ? links : []);

      } catch (error) {
          console.error("Search failed", error);
          setSearchResults([]); 
      } finally {
          setIsSearching(false);
      }
  };

  // EMPTY STATE HANDLER
  if (!questions || questions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md"
        >
          <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-gray-100">
            <Brain className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
          </div>
          <h2 className="font-serif text-4xl font-bold text-black mb-4">No active session.</h2>
          <p className="text-gray-500 text-lg mb-8 leading-relaxed">
            Provide the AI with a subject or upload notes to initialize the Active Recall system.
          </p>
          <button 
            onClick={onRedirectToDashboard}
            className="px-8 py-4 bg-black text-white font-bold rounded-none hover:bg-gray-800 transition-all flex items-center gap-2 mx-auto uppercase tracking-widest text-xs"
          >
            <LayoutGrid className="w-4 h-4" /> Go to Analysis
          </button>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = currentQuestions[currentIndex];
  if (!currentQuestion) return <div>Loading...</div>;

  const progressPercentage = ((currentIndex + 1) / currentQuestions.length) * 100;

  const handleOptionSelect = (optionId: string) => {
    if (isAnswered) return;
    setSelectedOptionId(optionId);
  };

  const handleSubmit = () => {
    if (!selectedOptionId || isAnswered) return;
    
    setIsAnswered(true);
    const selectedOption = currentQuestion.options.find(o => o.id === selectedOptionId);
    
    if (!selectedOption?.isCorrect) {
      setWrongQuestionIds(prev => new Set(prev).add(currentQuestion.id));
    }
  };

  const handleNext = () => {
    setDirection(1);
    setSelectedOptionId(null);
    setIsAnswered(false);

    if (currentIndex < currentQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleBatchComplete();
    }
  };

  const handleBatchComplete = () => {
    if (wrongQuestionIds.size === 0) {
      setQuizState('completed');
    } else {
      setQuizState('summary');
    }
  };

  const startRetryLoop = () => {
    const retryQuestions = questions.filter(q => wrongQuestionIds.has(q.id));
    setCurrentQuestions(retryQuestions);
    setWrongQuestionIds(new Set()); 
    setCurrentIndex(0);
    setLoopCount(prev => prev + 1);
    setQuizState('active');
  };

  const handleSaveMistakesToFlashcards = () => {
    if (onAddToFlashcards) {
        const mistakes = questions.filter(q => wrongQuestionIds.has(q.id));
        mistakes.forEach(q => {
            onAddToFlashcards({
                id: Date.now() + q.id + Math.random(),
                front: q.text,
                back: q.rationale,
                tag: q.topicTag || "REVIEW"
            });
        });
        alert(`${mistakes.length} errors saved to neural deck.`);
    }
  };

  // --- COMPLETED STATE ---
  if (quizState === 'completed') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center relative"
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
              <div className="w-[600px] h-[600px] bg-gradient-radial from-black to-transparent rounded-full blur-3xl"></div>
          </div>

          <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center mx-auto mb-8 relative z-10 shadow-2xl ring-4 ring-gray-100">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="font-serif text-6xl font-bold text-black mb-4 tracking-tighter">
            Mastery Achieved.
          </h2>
          <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto leading-relaxed">
            Loop count: <span className="text-black font-bold font-mono">{loopCount}</span>. All logic circuits verified.
          </p>
          
          <button 
            onClick={onRedirectToDashboard}
            className="px-10 py-4 bg-white border border-black text-black font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-sharp hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            Return to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // --- LOOP / SUMMARY STATE ---
  if (quizState === 'summary') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 relative overflow-hidden bg-white">
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
           <div className="w-[600px] h-[600px] border border-black rounded-full animate-[spin_20s_linear_infinite]"></div>
           <div className="absolute w-[400px] h-[400px] border border-dashed border-black rounded-full animate-[spin_30s_linear_infinite_reverse]"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center max-w-md w-full relative z-10"
        >
          <div className="w-20 h-20 bg-white border-2 border-red-500 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <AlertCircle className="w-8 h-8" />
          </div>
          
          <h3 className="font-serif text-4xl font-bold text-black mb-2 tracking-tight">Loop Option Available</h3>
          
          <div className="flex items-center justify-center gap-2 mb-6">
             <p className="font-mono text-xs uppercase tracking-widest text-red-500 font-bold">
                {wrongQuestionIds.size} Conceptual Errors
             </p>
          </div>

          <p className="text-gray-600 mb-10 leading-relaxed text-sm">
            Mistakes were detected. You can choose to enter a repair loop to fix these specific errors, or finish the session and review later.
          </p>
          
          <div className="space-y-4">
            {/* OPTION 1: REPAIR LOOP */}
            <button 
                onClick={startRetryLoop}
                className="w-full py-5 bg-black text-white font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-3 border border-black"
            >
                <RotateCw className="w-4 h-4" /> Initialize Repair Loop
            </button>
            
            {/* OPTION 2: SAVE ERRORS */}
            <button 
                onClick={handleSaveMistakesToFlashcards}
                className="w-full py-4 bg-gray-100 text-black font-bold uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-2 text-xs"
            >
                <Save className="w-4 h-4" /> Save Errors to Flashcards
            </button>

             {/* OPTION 3: QUIT */}
             <button 
                onClick={onRedirectToDashboard}
                className="w-full py-4 border border-transparent text-gray-400 font-bold uppercase tracking-widest hover:text-red-600 transition-all flex items-center justify-center gap-2 text-xs"
            >
                <StopCircle className="w-4 h-4" /> Terminate Session
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Animation Variants for Question Sliding
  const questionVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto px-6 py-12 overflow-hidden">
      
      {/* Top Bar */}
      <div className="flex items-end justify-between mb-12 border-b border-gray-100 pb-6">
        <div>
          <span className="text-xs font-mono text-gray-400 mb-2 block tracking-wider uppercase font-bold flex items-center gap-2">
             {loopCount > 0 && <span className="text-red-500 flex items-center gap-1"><RefreshCcw className="w-3 h-3"/> Loop {loopCount}</span>}
             <span>Active Session</span>
          </span>
          <motion.h2 
            key={currentQuestion.topicTag}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl font-bold text-black flex items-center gap-2 font-serif"
          >
             {currentQuestion.topicTag}
          </motion.h2>
        </div>
        <div className="flex items-center gap-4">
           <span className="font-mono text-gray-400 text-sm">
             {String(currentIndex + 1).padStart(2, '0')} / {String(currentQuestions.length).padStart(2, '0')}
           </span>
           <div className="w-32 h-1 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-black"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
           </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <AnimatePresence mode='wait' custom={direction}>
          <motion.div
            key={currentQuestion.id}
            custom={direction}
            variants={questionVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="space-y-8 w-full"
          >
            <h1 className="font-serif text-3xl lg:text-4xl font-medium text-black leading-tight">
              {currentQuestion.text}
            </h1>

            <div className="grid gap-3">
              {currentQuestion.options.map((option) => {
                let optionClass = "border-gray-200 bg-white text-gray-500 hover:border-black hover:text-black";
                let icon = null;
                
                if (isAnswered) {
                  if (option.isCorrect) {
                    optionClass = "border-emerald-500 bg-emerald-50 text-emerald-800";
                    icon = <Check className="w-5 h-5 text-emerald-600" />;
                  } else if (selectedOptionId === option.id && !option.isCorrect) {
                    optionClass = "border-red-500 bg-red-50 text-red-800";
                    icon = <X className="w-5 h-5 text-red-600" />;
                  } else {
                    optionClass = "border-gray-100 text-gray-300 opacity-50";
                  }
                } else if (selectedOptionId === option.id) {
                   optionClass = "border-black bg-gray-50 text-black shadow-soft scale-[1.01]";
                }

                return (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    key={option.id}
                    onClick={() => handleOptionSelect(option.id)}
                    disabled={isAnswered}
                    className={`
                      w-full text-left p-5 lg:p-6 rounded-xl border transition-all duration-200 flex items-center justify-between group font-medium text-lg
                      ${optionClass}
                    `}
                  >
                    <span>{option.text}</span>
                    {icon}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Rationale / Action Footer */}
      <div className="mt-8 min-h-[140px]">
        {!isAnswered ? (
          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={!selectedOptionId}
              className={`px-10 py-4 rounded-none font-bold text-sm tracking-widest uppercase transition-all duration-300 ${
                selectedOptionId 
                  ? 'bg-black text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Confirm Answer
            </motion.button>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-gray-100 pt-6"
          >
            <div className="flex gap-6 items-start">
               <div className="flex-1">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-black bg-gray-100 px-2 py-1">Rationale</span>
                    
                    {/* --- DEEP DIVE BUTTON --- */}
                    <button 
                        onClick={handleDeepDive}
                        disabled={isSearching || searchResults !== null}
                        className={`
                            text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border px-3 py-1 transition-all
                            ${isSearching ? 'border-gray-100 text-gray-400' : 'border-gray-200 text-blue-600 hover:border-blue-600 hover:bg-blue-50'}
                            ${searchResults !== null ? 'opacity-50 cursor-default' : ''}
                        `}
                    >
                        {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        {isSearching ? 'Scanning Web...' : 'Neural Search'}
                    </button>
                 </div>
                 
                 <p className="text-gray-600 leading-relaxed text-lg font-light font-serif">
                    {currentQuestion.rationale}
                 </p>

                 {/* --- GOOGLE GROUNDING RESULTS --- */}
                 {searchResults && searchResults.length > 0 && (
                     <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 bg-gray-50 border border-gray-100 p-4 rounded-lg"
                     >
                         <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
                             <Globe className="w-3 h-3" /> External Sources Verified
                         </p>
                         <div className="space-y-2">
                             {searchResults.map((result, i) => (
                                 <a 
                                    key={i} 
                                    href={result.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-2 bg-white border border-gray-100 hover:border-black hover:text-blue-600 transition-all group"
                                 >
                                     <span className="text-xs font-medium truncate max-w-[80%]">{result.title}</span>
                                     <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-black" />
                                 </a>
                             ))}
                         </div>
                     </motion.div>
                 )}
                 {searchResults && searchResults.length === 0 && !isSearching && (
                    <div className="mt-2 text-xs text-gray-400 italic">No external links found for this context.</div>
                 )}
                 
                 <div className="flex gap-4 mt-4">
                    <button 
                        onClick={() => onAddToFlashcards && onAddToFlashcards({id: Date.now(), front: currentQuestion.text, back: currentQuestion.rationale, tag: currentQuestion.topicTag})}
                        className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black flex items-center gap-1"
                    >
                        <PlusCircle className="w-3 h-3" /> Save to Flashcards
                    </button>
                 </div>
               </div>
               
               <motion.button 
                whileHover={{ scale: 1.1, rotate: 0 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleNext}
                className="h-14 w-14 bg-black flex items-center justify-center hover:bg-gray-800 transition-colors shrink-0 text-white shadow-lg"
              >
                <ArrowRight className="w-6 h-6" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default NeurallyQuiz;