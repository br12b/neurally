import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Save, Type, Highlighter, List, Quote, Terminal, Maximize2, Minimize2, Check, Keyboard, Volume2, VolumeX, Laptop, Download, FileText, Image as ImageIcon, X, Trash2, Plus, FileUp, Loader2, ChevronRight, Search } from 'lucide-react';
import { createAIClient } from '../utils/ai';
import { User } from '../types';
import { globalAudio } from '../utils/audio';

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
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [lastSaved, setLastSaved] = useState("Just now");
  const [zenMode, setZenMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  
  // Sound Config
  const [soundMode, setSoundMode] = useState<SoundMode>('thock'); 

  // --- INITIALIZATION ---
  useEffect(() => {
      if (!user) return;
      const key = `neurally_smart_notes_${user.id}`;
      const savedData = localStorage.getItem(key);
      
      if (savedData) {
          try {
              const parsedNotes = JSON.parse(savedData);
              if (Array.isArray(parsedNotes) && parsedNotes.length > 0) {
                  setNotes(parsedNotes);
                  setActiveNoteId(parsedNotes[0].id);
              } else {
                  createDefaultNote();
              }
          } catch (e) {
              console.error("Failed to parse notes", e);
              createDefaultNote();
          }
      } else {
          createDefaultNote();
      }
      globalAudio.init();
  }, [user]);

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
  };

  // --- AUTO SAVE ---
  useEffect(() => {
    if (notes.length === 0 || !user) return;
    
    const timer = setTimeout(() => {
        setIsSaving(true);
        const key = `neurally_smart_notes_${user.id}`;
        setTimeout(() => {
            localStorage.setItem(key, JSON.stringify(notes));
            setLastSaved(new Date().toLocaleTimeString());
            setIsSaving(false);
        }, 600);
    }, 2000); 
    return () => clearTimeout(timer);
  }, [notes, user]);

  // --- HANDLERS ---
  const activeNote = notes.find(n => n.id === activeNoteId) || notes[0];

  const updateActiveNote = (updates: Partial<Note>) => {
      if (!activeNote) return;
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
      setNotes([newNote, ...notes]);
      setActiveNoteId(newNote.id);
  };

  const deleteNote = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (notes.length <= 1) {
          alert("At least one note must remain.");
          return;
      }
      const newNotes = notes.filter(n => n.id !== id);
      setNotes(newNotes);
      if (activeNoteId === id) {
          setActiveNoteId(newNotes[0].id);
      }
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

  // --- PDF HANDLING WITH GEMINI ---
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !activeNote) return;

      if (file.size > 20 * 1024 * 1024) { // 20MB limit for Gemini
          alert("File too large. Please upload PDF under 20MB.");
          return;
      }

      setIsProcessingPdf(true);
      
      try {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onloadend = async () => {
              const base64Data = reader.result as string;
              // Remove data URL prefix (e.g., "data:application/pdf;base64,")
              const base64Content = base64Data.split(',')[1];

              // Use Centralized Client
              const ai = createAIClient();
              
              const result = await ai.models.generateContent({
                  model: "gemini-2.5-flash",
                  contents: [
                      {
                          inlineData: {
                              mimeType: "application/pdf",
                              data: base64Content
                          }
                      },
                      { text: "Extract all text from this PDF document. Formatting: Maintain headers and bullet points. Do not summarize, just extract the structured content." }
                  ]
              });

              const extractedText = result.text;
              
              if (extractedText) {
                  const newContent = activeNote.content + `\n\n--- PDF IMPORT: ${file.name} ---\n\n` + extractedText;
                  updateActiveNote({ content: newContent });
              }
              setIsProcessingPdf(false);
              
              // Reset input
              if(pdfInputRef.current) pdfInputRef.current.value = "";
          };
      } catch (error) {
          console.error("PDF Error:", error);
          alert("Failed to analyze PDF. Please try a smaller file or text-based PDF.");
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

  if (!activeNote) return null;

  return (
    <div className={`transition-all duration-500 ${zenMode ? 'fixed inset-0 z-[100] bg-white' : 'h-full max-w-[1800px] mx-auto p-6 lg:p-8 flex gap-6'}`}>
      
      {/* SIDEBAR: NOTE LIST (Hidden in Zen) */}
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
                        placeholder="Search notes..." 
                        className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-8 pr-2 text-xs focus:border-black outline-none" 
                    />
                 </div>
             </div>
             <div className="flex-1 overflow-y-auto p-2 space-y-1">
                 {filteredNotes.map(note => (
                     <button 
                        key={note.id}
                        onClick={() => setActiveNoteId(note.id)}
                        className={`w-full text-left p-3 rounded-xl transition-all group relative ${activeNoteId === note.id ? 'bg-black text-white shadow-md' : 'hover:bg-gray-50 text-gray-600'}`}
                     >
                         <h4 className={`font-medium text-sm truncate pr-6 ${activeNoteId === note.id ? 'text-white' : 'text-gray-900'}`}>{note.title || "Untitled"}</h4>
                         <p className={`text-[10px] truncate mt-1 ${activeNoteId === note.id ? 'text-gray-400' : 'text-gray-400'}`}>
                             {new Date(note.lastModified).toLocaleDateString()}
                         </p>
                         
                         {/* Delete Button (Hover) */}
                         <div 
                            onClick={(e) => deleteNote(note.id, e)}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${activeNoteId === note.id ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-400'}`}
                         >
                             <Trash2 className="w-3 h-3" />
                         </div>
                     </button>
                 ))}
             </div>
          </div>
      )}

      {/* MAIN EDITOR AREA */}
      <div className={`flex-1 flex flex-col h-full bg-white ${zenMode ? '' : 'rounded-[32px] shadow-[0_2px_24px_rgba(0,0,0,0.04)] border border-[#E7E5E4]'} overflow-hidden relative transition-all`}>
        
        {/* Toolbar */}
        <div className={`h-16 border-b border-[#F0F0EB] flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm z-30 sticky top-0 transition-all ${zenMode ? 'py-8 h-24' : ''}`}>
           <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink-300 uppercase tracking-widest mr-4 hidden sm:inline">Editor</span>
              {!zenMode && <div className="h-4 w-px bg-[#E5E5E0] hidden sm:block"></div>}
              
              {/* Sound Cycle Button */}
              <button 
                onClick={cycleSoundMode}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-wider min-w-[120px] justify-center ${soundMode !== 'off' ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
              >
                  {getSoundIcon()}
                  {getSoundLabel()}
              </button>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-2">
                <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-black hover:border-black transition-all text-[10px] font-bold uppercase tracking-wider"
                    title="Export to .txt"
                >
                    <Download className="w-3 h-3" /> <span className="hidden sm:inline">Export</span>
                </button>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-black hover:border-black transition-all text-[10px] font-bold uppercase tracking-wider"
                    title="Attach Image"
                >
                    <ImageIcon className="w-3 h-3" /> <span className="hidden sm:inline">Image</span>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </button>
                <button 
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={isProcessingPdf}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-black hover:border-black transition-all text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                    title="Extract Text from PDF"
                >
                    {isProcessingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />} 
                    <span className="hidden sm:inline">{isProcessingPdf ? 'Scanning...' : 'PDF'}</span>
                    <input type="file" ref={pdfInputRef} className="hidden" accept="application/pdf" onChange={handlePdfUpload} />
                </button>
              </div>

           </div>
           
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                 {isSaving ? (
                     <span className="flex items-center gap-2 text-black"><div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse"></div> Saving...</span>
                 ) : (
                     <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Saved {lastSaved}</span>
                 )}
              </div>
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
              <div className="px-12 pt-12 pb-4">
                  <input 
                    value={activeNote.title}
                    onChange={(e) => updateActiveNote({ title: e.target.value })}
                    className="w-full text-4xl font-serif font-bold text-black placeholder-gray-300 focus:outline-none bg-transparent"
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
                        className="bg-[#F5F5F0] border-y border-[#E5E5E0] px-12 py-6 flex gap-4 overflow-x-auto z-20 relative"
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
                  <div className="px-12 py-4 bg-blue-50 border-y border-blue-100 flex items-center gap-3">
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
                        padding: '0 48px',
                        paddingTop: '0px', 
                    }}
                    className="w-full h-full min-h-[calc(100vh-200px)] resize-none focus:outline-none bg-transparent font-serif text-ink-900 placeholder:text-gray-200 relative z-10 overflow-hidden leading-[40px]"
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
                <p className="text-[10px] text-ink-300 font-bold uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> AI Context: Active
                </p>
            </div>
        )}
      </div>

    </div>
  );
}