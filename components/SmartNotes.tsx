
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Save, Type, Highlighter, List, Quote, Terminal, Maximize2, Minimize2, Check, Keyboard, Volume2, VolumeX, Laptop, Download, FileText, Image as ImageIcon, X, Trash2, Plus, FileUp, Loader2, ChevronRight, Search, Cloud, RefreshCw, Menu, WifiOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createAIClient } from '../utils/ai';
import { User } from '../types';
import { globalAudio } from '../utils/audio';
import { doc, onSnapshot, setDoc } from 'firebase/firestore'; 
import { db } from '../utils/firebase'; 

type SoundMode = 'off' | 'thock' | 'typewriter' | 'laptop';

interface Note {
  id: string;
  title: string;
  content: string;
  images: string[];
  lastModified: number;
}

interface SmartNotesProps {
    user: User;
}

export default function SmartNotes({ user }: SmartNotesProps) {
  // --- 1. SUPER FAST INIT (LOCAL STORAGE FIRST) ---
  const getCachedNotes = (): Note[] => {
      if (typeof window === 'undefined') return [];
      try {
          const saved = localStorage.getItem(`neurally_notes_cache_${user.id}`);
          if (saved) {
              return JSON.parse(saved);
          }
      } catch (e) {
          console.error("Cache parse error", e);
      }
      return []; // Return empty only if nothing is cached
  };

  const [notes, setNotes] = useState<Note[]>(getCachedNotes());
  // Eğer cache'den veri geldiyse direkt yüklendi say (isLoaded = true)
  const [isLoaded, setIsLoaded] = useState<boolean>(notes.length > 0); 
  const [activeNoteId, setActiveNoteId] = useState<string | null>(notes.length > 0 ? notes[0].id : null);
  
  // States
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); 
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [lastSaved, setLastSaved] = useState("Local");
  const [zenMode, setZenMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  const [justSaved, setJustSaved] = useState(false); 
  
  // Flag to prevent loop
  const isRemoteUpdate = useRef(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  
  const [soundMode, setSoundMode] = useState<SoundMode>('thock'); 

  // --- 2. SILENT CLOUD SYNC (BACKGROUND) ---
  useEffect(() => {
      if (!user) return;

      const userDocRef = doc(db, "users", user.id);
      
      // Bu listener arka planda çalışır, UI'ı bloklamaz.
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.smartNotes && Array.isArray(data.smartNotes) && data.smartNotes.length > 0) {
                  
                  // Gelen veri yerel veriden farklıysa güncelle
                  setNotes(prev => {
                      const isDifferent = JSON.stringify(prev) !== JSON.stringify(data.smartNotes);
                      if (isDifferent) {
                          isRemoteUpdate.current = true;
                          // Cache'i de güncelle ki sonraki açılışta güncel olsun
                          localStorage.setItem(`neurally_notes_cache_${user.id}`, JSON.stringify(data.smartNotes));
                          return data.smartNotes;
                      }
                      return prev;
                  });

                  if (!activeNoteId && data.smartNotes.length > 0) {
                      setActiveNoteId(data.smartNotes[0].id);
                  }
                  
                  setHasUnsavedChanges(false);
                  setLastSaved("Synced");
              } 
          }
          // Veri gelmese bile (veya boş olsa bile) artık yüklendi sayıyoruz.
          setIsLoaded(true);
          
          if (notes.length === 0 && isLoaded) {
             createDefaultNote();
          }

      }, (error) => {
          console.error("Sync Error (Silent):", error);
          setIsLoaded(true); // Hata olsa bile ekranı aç
      });

      globalAudio.init();
      return () => unsubscribe();
  }, [user.id]);

  // İlk açılışta hiç not yoksa default oluştur
  useEffect(() => {
      if (isLoaded && notes.length === 0) {
          createDefaultNote();
      }
  }, [isLoaded]);

  const createDefaultNote = () => {
      const newNote: Note = {
          id: Date.now().toString(),
          title: "Untitled Note",
          content: "",
          images: [],
          lastModified: Date.now()
      };
      setNotes([newNote]);
      setActiveNoteId(newNote.id);
      localStorage.setItem(`neurally_notes_cache_${user.id}`, JSON.stringify([newNote]));
  };

  // --- 3. LOCAL PERSISTENCE (INSTANT SAVE) ---
  useEffect(() => {
    if (!user) return;

    // Remote update ise (Firebase'den geldiyse) tekrar kaydetmeye çalışma
    if (isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
        return;
    }
    
    // Her tuş vuruşunda LocalStorage'a yaz (Hız kaybı olmaz, veri kaybını önler)
    localStorage.setItem(`neurally_notes_cache_${user.id}`, JSON.stringify(notes));

    // UI'da "Kaydedilmedi" durumunu göster
    setHasUnsavedChanges(true);
    setJustSaved(false);

  }, [notes, user]);

  // --- 4. MANUAL CLOUD SAVE ---
  const handleManualSave = () => {
      if (!user) return;
      
      setIsSaving(true);
      
      // Optimistic Update: Kullanıcıya hemen "Kaydedildi" göster
      const userDocRef = doc(db, "users", user.id);
      setDoc(userDocRef, { smartNotes: notes }, { merge: true })
        .then(() => {
            setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        })
        .catch((err) => {
            console.error("Cloud Save Failed:", err);
            setLastSaved("Error");
            setHasUnsavedChanges(true); // Geri al
            alert("Bulut senkronizasyonu başarısız. Yerel yedek güvende.");
        });

      // UI Feedback Loop (Yapay gecikme ile UX iyileştirme)
      setTimeout(() => {
          setIsSaving(false);
          setHasUnsavedChanges(false); 
          setJustSaved(true); 
          setTimeout(() => setJustSaved(false), 2000);
      }, 500);
  };

  // --- HANDLERS ---
  const activeNote = notes.find(n => n.id === activeNoteId) || notes[0];

  const updateActiveNote = (updates: Partial<Note>) => {
      if (!activeNote) return;
      isRemoteUpdate.current = false; // Kullanıcı yazıyor
      setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, ...updates, lastModified: Date.now() } : n));
  };

  const createNewNote = () => {
      const newNote: Note = {
          id: Date.now().toString(),
          title: "New Note",
          content: "",
          images: [],
          lastModified: Date.now()
      };
      const updatedNotes = [newNote, ...notes];
      setNotes(updatedNotes);
      setActiveNoteId(newNote.id);
      setIsMobileMenuOpen(false);
      // Local save immediately
      localStorage.setItem(`neurally_notes_cache_${user.id}`, JSON.stringify(updatedNotes));
  };

  const deleteNote = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (notes.length <= 1) {
          alert("En az bir not kalmalıdır.");
          return;
      }
      const newNotes = notes.filter(n => n.id !== id);
      setNotes(newNotes);
      if (activeNoteId === id) {
          setActiveNoteId(newNotes[0].id);
      }
      localStorage.setItem(`neurally_notes_cache_${user.id}`, JSON.stringify(newNotes));
      setHasUnsavedChanges(true);
  };

  const handleKeyDown = () => {
      globalAudio.play(soundMode);
  };

  const cycleSoundMode = () => {
      const modes: SoundMode[] = ['off', 'thock', 'typewriter', 'laptop'];
      const currentIndex = modes.indexOf(soundMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      const nextMode = modes[nextIndex];
      setSoundMode(nextMode);
      setTimeout(() => globalAudio.play(nextMode), 100);
  };

  const handleExport = () => {
    if (!activeNote) return;
    const fullContent = `NEURALLY SMART NOTE\nTitle: ${activeNote.title}\nDate: ${new Date(activeNote.lastModified).toLocaleString()}\n\n---\n\n${activeNote.content}`;
    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNote.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && activeNote) {
          const reader = new FileReader();
          reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                  updateActiveNote({ images: [...activeNote.images, reader.result as string] });
              }
          };
          reader.readAsDataURL(file);
      }
  };

  // --- PDF HANDLING ---
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !activeNote) return;

      if (file.size > 20 * 1024 * 1024) { 
          alert("Dosya çok büyük. Lütfen 20MB altı PDF yükleyin.");
          return;
      }

      setIsProcessingPdf(true);
      
      try {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onloadend = async () => {
              const base64Data = reader.result as string;
              const base64Content = base64Data.split(',')[1];

              const ai = createAIClient();
              
              const result = await ai.models.generateContent({
                  model: "gemini-2.5-flash",
                  contents: [
                      { inlineData: { mimeType: "application/pdf", data: base64Content } },
                      { text: "Extract all text from this PDF document. Formatting: Maintain headers and bullet points. Do not summarize, just extract the structured content." }
                  ]
              });

              const extractedText = result.text;
              
              if (extractedText) {
                  const newContent = activeNote.content + `\n\n--- PDF IMPORT: ${file.name} ---\n\n` + extractedText;
                  updateActiveNote({ content: newContent });
              }
              setIsProcessingPdf(false);
              
              if(pdfInputRef.current) pdfInputRef.current.value = "";
          };
      } catch (error) {
          console.error("PDF Error:", error);
          alert("PDF analizi başarısız oldu.");
          setIsProcessingPdf(false);
      }
  };

  const removeImage = (index: number) => {
      if (!activeNote) return;
      const newImages = activeNote.images.filter((_, i) => i !== index);
      updateActiveNote({ images: newImages });
  };

  const getSoundIcon = () => {
      switch(soundMode) {
          case 'thock': return <Keyboard className="w-3 h-3" />;
          case 'typewriter': return <Terminal className="w-3 h-3" />;
          case 'laptop': return <Laptop className="w-3 h-3" />;
          default: return <VolumeX className="w-3 h-3" />;
      }
  };

  const getSoundLabel = () => {
      switch(soundMode) {
          case 'thock': return 'Mech: Thock';
          case 'typewriter': return 'Typewriter';
          case 'laptop': return 'Soft Touch';
          default: return 'Sound: Off';
      }
  };

  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()));

  // NOTE LIST RENDERER
  const NoteList = () => (
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
         {filteredNotes.map(note => (
             <button 
                key={note.id}
                onClick={() => { setActiveNoteId(note.id); setIsMobileMenuOpen(false); }}
                className={`w-full text-left p-3 rounded-xl transition-all group relative ${activeNoteId === note.id ? 'bg-black text-white shadow-md' : 'hover:bg-gray-50 text-gray-600'}`}
             >
                 <h4 className={`font-medium text-sm truncate pr-6 ${activeNoteId === note.id ? 'text-white' : 'text-gray-900'}`}>{note.title || "Untitled"}</h4>
                 <p className={`text-[10px] truncate mt-1 ${activeNoteId === note.id ? 'text-gray-400' : 'text-gray-400'}`}>
                     {new Date(note.lastModified).toLocaleDateString()}
                 </p>
                 
                 <div 
                    onClick={(e) => deleteNote(note.id, e)}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${activeNoteId === note.id ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-400'}`}
                 >
                     <Trash2 className="w-3 h-3" />
                 </div>
             </button>
         ))}
      </div>
  );

  // --- SKELETON LOADING STATE (Only shows if NO cached notes exist) ---
  if (!isLoaded && notes.length === 0) {
      return (
          <div className="flex h-full p-4 md:p-8 gap-6 max-w-[1800px] mx-auto animate-pulse">
              <div className="hidden lg:block w-64 bg-gray-100 rounded-[24px]"></div>
              <div className="flex-1 bg-gray-100 rounded-[32px] flex flex-col p-8">
                  <div className="h-12 bg-gray-200 rounded-lg w-full mb-8"></div>
                  <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-12"></div>
                  <div className="space-y-4">
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                  </div>
              </div>
          </div>
      );
  }

  // Fallback if somehow activeNote is missing despite logic
  if (!activeNote) return null;

  return (
    <div className={`transition-all duration-500 h-full flex gap-6 ${zenMode ? 'fixed inset-0 z-[100] bg-white' : 'p-4 md:p-6 lg:p-8 max-w-[1800px] mx-auto'}`}>
      
      {/* SIDEBAR: DESKTOP */}
      {!zenMode && (
          <div className="hidden lg:flex flex-col w-64 bg-white rounded-[24px] border border-[#E7E5E4] overflow-hidden shadow-sm shrink-0">
             <div className="p-4 border-b border-[#F0F0EB] bg-[#FDFBF7]">
                 <div className="flex items-center justify-between mb-4">
                     <span className="text-xs font-bold text-ink-300 uppercase tracking-widest">Notebooks</span>
                     <button onClick={createNewNote} className="p-1 hover:bg-black hover:text-white rounded transition-colors"><Plus className="w-4 h-4" /></button>
                 </div>
                 <div className="relative">
                    <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search..." 
                        className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-8 pr-2 text-xs focus:border-black outline-none" 
                    />
                 </div>
             </div>
             <NoteList />
          </div>
      )}

      {/* MOBILE DRAWER */}
      <AnimatePresence>
          {isMobileMenuOpen && (
              <>
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="fixed inset-0 bg-black/50 z-[110] lg:hidden"
                />
                <motion.div 
                    initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed top-0 left-0 h-full w-[80%] max-w-sm bg-white z-[120] lg:hidden flex flex-col shadow-2xl"
                >
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#FDFBF7]">
                        <h3 className="font-serif text-xl font-bold">Notebooks</h3>
                        <button onClick={createNewNote} className="p-2 bg-black text-white rounded-lg"><Plus className="w-4 h-4" /></button>
                    </div>
                    <div className="p-4">
                        <div className="relative mb-4">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search notes..." 
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-black outline-none" 
                            />
                        </div>
                        <NoteList />
                    </div>
                </motion.div>
              </>
          )}
      </AnimatePresence>

      {/* MAIN EDITOR AREA */}
      <div className={`flex-1 flex flex-col h-full bg-white ${zenMode ? '' : 'rounded-[24px] md:rounded-[32px] shadow-[0_2px_24px_rgba(0,0,0,0.04)] border border-[#E7E5E4]'} overflow-hidden relative transition-all`}>
        
        {/* Toolbar */}
        <div className={`h-16 border-b border-[#F0F0EB] flex items-center justify-between px-4 md:px-8 bg-white/80 backdrop-blur-sm z-30 sticky top-0 transition-all ${zenMode ? 'py-8 h-24' : ''}`}>
           <div className="flex items-center gap-2 md:gap-4">
              {/* Mobile Menu Trigger */}
              <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-500">
                  <Menu className="w-6 h-6" />
              </button>

              <span className="text-xs font-bold text-ink-300 uppercase tracking-widest hidden sm:inline">Editor</span>
              {!zenMode && <div className="h-4 w-px bg-[#E5E5E0] hidden sm:block"></div>}
              
              {/* Sound Cycle Button */}
              <button 
                onClick={cycleSoundMode}
                className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-wider min-w-[120px] justify-center ${soundMode !== 'off' ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
              >
                  {getSoundIcon()}
                  {getSoundLabel()}
              </button>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 md:gap-2 ml-2">
                <button 
                    onClick={handleExport}
                    className="flex items-center justify-center w-8 h-8 md:w-auto md:h-auto md:gap-2 md:px-3 md:py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-black hover:border-black transition-all"
                    title="Export to .txt"
                >
                    <Download className="w-4 h-4 md:w-3 md:h-3" /> <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider">Export</span>
                </button>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center w-8 h-8 md:w-auto md:h-auto md:gap-2 md:px-3 md:py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-black hover:border-black transition-all"
                    title="Attach Image"
                >
                    <ImageIcon className="w-4 h-4 md:w-3 md:h-3" /> <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider">Image</span>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </button>
                <button 
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={isProcessingPdf}
                    className="flex items-center justify-center w-8 h-8 md:w-auto md:h-auto md:gap-2 md:px-3 md:py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-black hover:border-black transition-all disabled:opacity-50"
                    title="Extract Text from PDF"
                >
                    {isProcessingPdf ? <Loader2 className="w-4 h-4 md:w-3 md:h-3 animate-spin" /> : <FileUp className="w-4 h-4 md:w-3 md:h-3" />} 
                    <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider">{isProcessingPdf ? '...' : 'PDF'}</span>
                    <input type="file" ref={pdfInputRef} className="hidden" accept="application/pdf" onChange={handlePdfUpload} />
                </button>
              </div>

           </div>
           
           <div className="flex items-center gap-2 md:gap-4">
              
              {/* SYNC BUTTON */}
              <button 
                onClick={handleManualSave}
                disabled={isSaving || !hasUnsavedChanges}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-wider
                    ${justSaved 
                        ? 'bg-green-50 text-green-600 border-green-200 cursor-default' 
                        : hasUnsavedChanges 
                            ? 'bg-black text-white border-black hover:bg-gray-800 shadow-md' 
                            : 'bg-white text-gray-400 border-transparent cursor-default'
                    }
                `}
              >
                 {justSaved ? (
                     <><CheckCircle2 className="w-3 h-3" /> Saved</>
                 ) : isSaving ? (
                     <><RefreshCw className="w-3 h-3 animate-spin" /> Saving...</>
                 ) : (
                     <><Save className="w-3 h-3" /> {hasUnsavedChanges ? 'Save Changes' : 'Saved'}</>
                 )}
              </button>

              <button 
                onClick={() => setZenMode(!zenMode)} 
                className={`p-2 rounded-lg transition-colors border ${zenMode ? 'bg-black text-white border-black' : 'hover:bg-gray-100 border-transparent'}`}
                title={zenMode ? "Exit Zen Mode" : "Enter Zen Mode"}
              >
                  {zenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
           </div>
        </div>

        {/* Notebook Body */}
        <div className="flex-1 flex overflow-hidden">
           
           {/* Main Content */}
           <div className={`flex-1 overflow-y-auto bg-white relative group custom-scrollbar ${zenMode ? 'max-w-3xl mx-auto pt-12' : 'p-0'}`}>
              
              {/* Title Input */}
              <div className="px-6 md:px-12 pt-8 md:pt-12 pb-4">
                  <input 
                    value={activeNote.title}
                    onChange={(e) => updateActiveNote({ title: e.target.value })}
                    className="w-full text-3xl md:text-4xl font-serif font-bold text-black placeholder-gray-300 focus:outline-none bg-transparent"
                    placeholder="Untitled Note"
                  />
              </div>

              {/* Image Strip (Attachments) */}
              <AnimatePresence>
                {activeNote.images.length > 0 && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-[#F5F5F5] border-y border-[#E5E5E0] px-6 md:px-12 py-6 flex gap-4 overflow-x-auto z-20 relative"
                    >
                        {activeNote.images.map((img, idx) => (
                            <motion.div 
                                key={idx} 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="relative flex-shrink-0 w-48 h-32 group"
                            >
                                <img src={img} alt="attachment" className="w-full h-full object-cover rounded-lg border border-gray-200 shadow-sm" />
                                <button 
                                    onClick={() => removeImage(idx)}
                                    className="absolute -top-2 -right-2 bg-black text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
              </AnimatePresence>

              {/* PDF Processing Indicator */}
              {isProcessingPdf && (
                  <div className="px-6 md:px-12 py-4 bg-blue-50 border-y border-blue-100 flex items-center gap-3">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm text-blue-800 font-medium">Gemini AI is analyzing PDF document structure...</span>
                  </div>
              )}

              {/* Editor */}
              <div className="min-h-full relative w-full pb-32">
                 <div className="absolute inset-0 pointer-events-none opacity-[0.08]" 
                      style={{ 
                          backgroundImage: 'linear-gradient(to bottom, transparent 39px, #000 39px)', 
                          backgroundSize: '100% 40px',
                          backgroundAttachment: 'local', 
                          backgroundPosition: '0px 0px' 
                      }}>
                 </div>

                 <textarea 
                    ref={textareaRef}
                    value={activeNote.content}
                    onChange={(e) => updateActiveNote({ content: e.target.value })}
                    onKeyDown={handleKeyDown}
                    style={{
                        lineHeight: '40px',
                        fontSize: '18px',
                        paddingTop: '0px', 
                    }}
                    className="w-full h-full min-h-[calc(100vh-200px)] resize-none focus:outline-none bg-transparent font-serif text-ink-900 placeholder:text-gray-200 relative z-10 overflow-hidden leading-[40px] px-6 md:px-12"
                    placeholder="Start typing..."
                    spellCheck={false}
                 />
              </div>

           </div>
        </div>

        {/* Footer Summary (Hidden in Zen) */}
        {!zenMode && (
            <div className="h-16 border-t border-[#F0F0EB] bg-[#F9F9F7] px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-mono text-gray-500">{activeNote.content.length} chars</span>
                    <span className="text-gray-300">|</span>
                    <div className="flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-gray-400" />
                        <span className="text-xs font-mono text-gray-500">{activeNote.images.length} imgs</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {hasUnsavedChanges && (
                        <div className="flex items-center gap-1 text-[10px] text-orange-500 font-bold uppercase tracking-widest animate-pulse">
                            <AlertCircle className="w-3 h-3" /> Unsaved Changes
                        </div>
                    )}
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        Last Cloud Sync: {lastSaved}
                    </p>
                </div>
            </div>
        )}
      </div>

    </div>
  );
}
