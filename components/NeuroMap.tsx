
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Save, Target, ChevronRight, Share2, Database, LayoutList, Activity, Cloud, RefreshCw, Loader2, WifiOff, Edit3 } from 'lucide-react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Language, User } from '../types';

interface NeuroMapProps {
  language: Language;
  user?: User;
}

interface MindNode {
  id: string;
  label: string;
  type: 'core' | 'satellite';
  notes: string;
  timestamp: string; 
}

export default function NeuralList({ language, user }: NeuroMapProps) {
  const isTr = language === 'tr';

  // --- 1. HYBRID STATE INITIALIZATION (INSTANT LOAD) ---
  const getLocalData = (key: string, defaultVal: any) => {
      if (!user) return defaultVal;
      const saved = localStorage.getItem(key);
      try {
          return saved ? JSON.parse(saved) : defaultVal;
      } catch {
          return defaultVal;
      }
  };

  const localKey = user ? `neurally_neurallist_${user.id}` : '';
  const localData = getLocalData(localKey, { subject: "", nodes: [] });

  // State initialization directly from LocalStorage
  const [setupMode, setSetupMode] = useState<boolean>(!localData.subject);
  const [subject, setSubject] = useState<string>(localData.subject || "");
  const [topicsInput, setTopicsInput] = useState("");
  const [nodes, setNodes] = useState<MindNode[]>(localData.nodes || []);
  const [selectedNode, setSelectedNode] = useState<MindNode | null>(null);
  
  // Sync States
  const [isSaving, setIsSaving] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // --- 2. BACKGROUND CLOUD FETCH (Silent Sync) ---
  useEffect(() => {
    if (!user) return;

    const syncFromCloud = async () => {
        setIsCloudSyncing(true);
        try {
            const docRef = doc(db, "neuralLists", user.id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                
                // Compare Cloud vs Local to decide update
                const localStr = JSON.stringify({ subject, nodes });
                const cloudStr = JSON.stringify({ subject: cloudData.subject, nodes: cloudData.nodes });

                if (cloudData.nodes && cloudData.nodes.length > 0 && localStr !== cloudStr) {
                    // Update state and local cache with newer cloud data
                    setNodes(cloudData.nodes);
                    setSubject(cloudData.subject || "");
                    setSetupMode(false);
                    
                    localStorage.setItem(localKey, JSON.stringify({
                        subject: cloudData.subject,
                        nodes: cloudData.nodes
                    }));
                }
            }
        } catch (error) {
            console.warn("Background Sync Failed (Silent):", error);
        } finally {
            setIsCloudSyncing(false);
        }
    };

    // Delay slighty to let UI paint first
    const timer = setTimeout(syncFromCloud, 500);
    return () => clearTimeout(timer);
  }, [user]); // Run once on mount per user

  // --- 3. HYBRID SAVE (Local Instant + Cloud Debounced) ---
  useEffect(() => {
    if (!user || nodes.length === 0) return;
    
    // 1. Instant Local Save
    localStorage.setItem(localKey, JSON.stringify({ subject, nodes }));

    // 2. Debounced Cloud Save
    setIsSaving(true);
    const timeout = setTimeout(async () => {
        try {
            await setDoc(doc(db, "neuralLists", user.id), {
                subject: subject,
                nodes: nodes,
                lastUpdated: new Date()
            }, { merge: true });
        } catch (error) {
            console.error("Cloud Save Failed:", error);
        } finally {
            setIsSaving(false);
        }
    }, 2000); 

    return () => clearTimeout(timeout);
  }, [nodes, subject, user]);

  const generateMap = () => {
    if (!subject || !topicsInput) return;

    const topics = topicsInput.split('\n').filter(t => t.trim().length > 0);
    const newNodes: MindNode[] = [];
    const now = new Date().toLocaleTimeString();
    
    // 1. CORE NODE
    newNodes.push({
        id: 'core',
        label: subject,
        type: 'core',
        notes: `Ana Ders: ${subject}\n\nGenel Bakış:`,
        timestamp: now
    });

    // 2. LIST NODES
    topics.forEach((topic, i) => {
        newNodes.push({
            id: `node-${i}`,
            label: topic,
            type: 'satellite',
            notes: `${topic} hakkında notlar:\n- `,
            timestamp: now
        });
    });

    setNodes(newNodes);
    setSetupMode(false);
  };

  const updateNodeNotes = (id: string, text: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, notes: text } : n));
  };

  const handleReset = async () => {
      if(confirm(isTr ? "Liste silinecek. Emin misin?" : "Delete list?")) {
          setNodes([]);
          setSubject("");
          setTopicsInput("");
          setSetupMode(true);
          setSelectedNode(null);
          localStorage.removeItem(localKey);
          if (user) {
              deleteDoc(doc(db, "neuralLists", user.id)).catch(e => console.error(e));
          }
      }
  };

  const coreNode = nodes.find(n => n.type === 'core');
  const listNodes = nodes.filter(n => n.type === 'satellite');

  return (
    <div className="h-full w-full relative bg-[#FAFAFA] flex flex-col font-sans select-none text-ink-900 overflow-hidden">
      
      {/* HEADER UI */}
      <div className="absolute top-0 left-0 w-full p-6 md:p-8 z-[70] flex justify-between items-start pointer-events-none">
         <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="pointer-events-auto"
         >
             <h1 className="font-serif text-3xl md:text-4xl text-black mb-1 flex items-center gap-3 tracking-tighter">
                 Neural List <span className="text-white bg-black font-sans text-[10px] font-bold tracking-[0.2em] px-2 py-0.5 rounded-full">LIVE</span>
             </h1>
             <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 mt-2">
                 {isCloudSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                 <span>{isCloudSyncing ? 'SYNCING...' : `DB: ${user?.email}`}</span>
             </div>
         </motion.div>
         
         {!setupMode && (
             <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pointer-events-auto flex gap-3"
             >
                 <button 
                    onClick={handleReset}
                    className="h-10 px-4 bg-white border border-gray-200 text-black shadow-sm hover:border-black rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 group cursor-pointer active:scale-95"
                 >
                     <Plus className="w-3 h-3 group-hover:rotate-90 transition-transform" /> <span className="hidden md:inline">{isTr ? 'Yeni Liste' : 'New List'}</span>
                 </button>
             </motion.div>
         )}
      </div>

      {/* SETUP VIEW (Modal) */}
      <AnimatePresence>
      {setupMode && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-white/60 backdrop-blur-md">
              <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="w-full max-w-5xl bg-white border border-gray-200 shadow-2xl rounded-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] max-h-[90vh] overflow-y-auto"
              >
                  {/* Left: Branding & INFO */}
                  <div className="w-full md:w-[45%] bg-black text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
                      <div className="relative z-10">
                          <div className="w-12 h-12 border border-white/20 rounded-xl flex items-center justify-center mb-8">
                              <LayoutList className="w-6 h-6 text-white" />
                          </div>
                          <h2 className="font-serif text-3xl md:text-4xl mb-4 leading-tight">{isTr ? 'Neural List Nedir?' : 'What is Neural List?'}</h2>
                          
                          <div className="space-y-4 text-sm text-gray-400 leading-relaxed font-light">
                              <p>
                                {isTr 
                                    ? "Neural List, karmaşık ders konularını 'Chunking' (Parçalama) yöntemiyle yönetilebilir veri bloklarına dönüştüren hiyerarşik bir indeksleme sistemidir."
                                    : "Neural List is a hierarchical indexing system that transforms complex study topics into manageable data blocks using the 'Chunking' method."}
                              </p>
                          </div>
                      </div>
                  </div>

                  {/* Right: Form */}
                  <div className="w-full md:w-[55%] p-8 md:p-12 flex flex-col justify-center bg-white relative">
                      <div className="space-y-8">
                          <div className="group">
                              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2 flex items-center gap-2">
                                  <Target className="w-3 h-3" /> {isTr ? 'ANA KONU (ROOT)' : 'CORE SUBJECT'}
                              </label>
                              <input 
                                  value={subject}
                                  onChange={(e) => setSubject(e.target.value)}
                                  className="w-full py-4 px-4 bg-gray-50 border border-gray-200 rounded-lg font-serif text-2xl focus:border-black focus:outline-none transition-colors"
                                  placeholder={isTr ? "Örn: Dünya Tarihi" : "e.g. World History"}
                                  autoFocus
                              />
                          </div>

                          <div className="group">
                              <div className="flex justify-between items-end mb-2">
                                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                                      <Share2 className="w-3 h-3" /> {isTr ? 'ALT VERİ BLOKLARI' : 'DATA BLOCKS'}
                                  </label>
                              </div>
                              <textarea 
                                  value={topicsInput}
                                  onChange={(e) => setTopicsInput(e.target.value)}
                                  className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm leading-relaxed focus:border-black focus:outline-none resize-none transition-colors"
                                  placeholder={isTr ? "İlk Çağ Uygarlıkları\nOrta Çağ Avrupası\nFransız İhtilali..." : "Ancient Civs\nMiddle Ages\nFrench Revolution..."}
                              />
                              <p className="text-right text-[10px] text-gray-400 mt-2 font-mono">
                                  {topicsInput.split('\n').filter(t=>t.trim()).length} BLOCKS DETECTED
                              </p>
                          </div>

                          <button 
                              onClick={generateMap}
                              disabled={!subject || !topicsInput}
                              className="w-full py-5 bg-black text-white text-xs font-bold uppercase tracking-[0.25em] hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 rounded-lg disabled:opacity-50"
                          >
                              {isTr ? 'DİZİNİ BAŞLAT' : 'INITIALIZE INDEX'} <ChevronRight className="w-3 h-3" />
                          </button>
                      </div>
                  </div>
              </motion.div>
          </div>
      )}
      </AnimatePresence>

      {/* MAIN LAYOUT (Stack on Mobile, Row on Desktop) */}
      {!setupMode && (
          <div className="flex flex-col lg:flex-row h-full pt-20 md:pt-24 px-4 md:px-8 pb-8 gap-4 lg:gap-8">
              
              {/* CORE SUBJECT HEADER */}
              <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="w-full lg:w-1/3 flex flex-col justify-between shrink-0"
              >
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:shadow-none lg:bg-transparent lg:border-none lg:p-0">
                      <div className="flex items-center gap-2 mb-4 lg:mb-6">
                         <div className="px-2 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded">
                             Root Directory
                         </div>
                         <div className="h-px bg-gray-200 flex-1"></div>
                      </div>

                      <h2 className="font-serif text-4xl md:text-6xl lg:text-7xl font-medium text-black leading-[0.9] tracking-tighter mb-4 lg:mb-8 break-words">
                          {coreNode?.label}
                      </h2>
                      
                      <div className="space-y-2 lg:space-y-4 font-mono text-[10px] lg:text-xs text-gray-400">
                          <div className="flex justify-between border-b border-gray-100 pb-2">
                              <span className="uppercase tracking-widest">Blocks</span>
                              <span className="text-black">{listNodes.length} Units</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 pb-2">
                              <span className="uppercase tracking-widest">Status</span>
                              {isSaving ? (
                                  <span className="text-gray-400 font-bold flex items-center gap-1">
                                      <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
                                  </span>
                              ) : (
                                  <span className="text-green-600 font-bold flex items-center gap-1">
                                      <Cloud className="w-3 h-3" /> Online
                                  </span>
                              )}
                          </div>
                      </div>

                      <button 
                        onClick={() => coreNode && setSelectedNode(coreNode)}
                        className="mt-6 lg:mt-12 w-full p-4 bg-gray-50 border border-gray-200 rounded-lg text-left group hover:border-black transition-colors flex justify-between items-center"
                      >
                          <div>
                            <h3 className="font-bold text-xs uppercase tracking-wide mb-1">Core Metadata</h3>
                            <p className="text-[10px] text-gray-500">Click to edit root notes</p>
                          </div>
                          <Edit3 className="w-4 h-4 text-gray-400 group-hover:text-black" />
                      </button>
                  </div>
              </motion.div>

              {/* LIST AREA */}
              <div className="w-full lg:w-2/3 h-full flex flex-col bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex-1">
                  <div className="h-12 lg:h-16 border-b border-gray-100 bg-gray-50/50 flex items-center px-4 lg:px-8 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      <div className="w-10 lg:w-16">ID</div>
                      <div className="flex-1">Data Block</div>
                      <div className="w-16 lg:w-32 text-right hidden md:block">State</div>
                      <div className="w-8 lg:w-16"></div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                      {listNodes.map((node, i) => (
                          <motion.div 
                              key={node.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              onClick={() => setSelectedNode(node)}
                              className="group flex items-center h-16 lg:h-20 px-3 lg:px-6 border-b border-gray-50 hover:bg-gray-50 hover:border-black/5 rounded-lg transition-all cursor-pointer"
                          >
                              <div className="w-10 lg:w-16 font-mono text-xs text-gray-300 group-hover:text-black font-bold">
                                  {String(i + 1).padStart(2, '0')}
                              </div>
                              <div className="flex-1 pr-4">
                                  <h4 className="font-serif text-base lg:text-xl text-black group-hover:translate-x-1 transition-transform duration-300 truncate">
                                      {node.label}
                                  </h4>
                              </div>
                              <div className="w-16 lg:w-32 text-right font-mono text-[10px] text-gray-400 group-hover:text-black transition-colors hidden md:block">
                                  {node.notes.length > 50 ? 'POPULATED' : 'EMPTY'}
                              </div>
                              <div className="w-8 lg:w-16 flex justify-end">
                                  <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-black group-hover:border-black transition-all">
                                      <ChevronRight className="w-3 h-3 lg:w-4 lg:h-4 text-gray-400 group-hover:text-white" />
                                  </div>
                              </div>
                          </motion.div>
                      ))}
                  </div>
              </div>

              {/* EDITOR PANEL (Mobile Overlay / Desktop Slide) */}
              <AnimatePresence>
                  {selectedNode && (
                      <div className="fixed lg:absolute inset-0 z-[100] flex items-center justify-end pointer-events-none">
                          {/* Backdrop */}
                          <motion.div 
                             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                             onClick={() => setSelectedNode(null)}
                             className="absolute inset-0 bg-black/50 lg:bg-white/20 lg:backdrop-blur-[2px] pointer-events-auto"
                          />

                          <motion.div 
                             layoutId={selectedNode.id + "panel"}
                             initial={{ x: '100%' }}
                             animate={{ x: 0 }}
                             exit={{ x: '100%' }}
                             transition={{ type: "spring", damping: 30, stiffness: 300 }}
                             className="h-full w-full lg:max-w-lg bg-white border-l border-gray-200 shadow-2xl flex flex-col pointer-events-auto"
                          >
                              <div className="p-4 lg:p-6 border-b border-gray-200 bg-white flex justify-between items-start z-20">
                                  <div>
                                      <div className="flex items-center gap-2 mb-2">
                                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-black px-2 py-1 rounded">
                                              {selectedNode.type === 'core' ? 'ROOT' : 'BLOCK'}
                                          </span>
                                          <span className="text-[10px] font-mono text-gray-400">
                                              #{selectedNode.id.toUpperCase()}
                                          </span>
                                      </div>
                                      <h3 className="font-serif text-2xl lg:text-3xl font-medium text-black leading-tight line-clamp-2">{selectedNode.label}</h3>
                                  </div>
                                  
                                  <button 
                                    onClick={() => setSelectedNode(null)}
                                    className="p-2 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-gray-200 hover:border-red-200"
                                  >
                                      <X className="w-5 h-5" />
                                  </button>
                              </div>

                              <div className="flex-1 relative bg-white z-10">
                                  <textarea 
                                     value={nodes.find(n => n.id === selectedNode.id)?.notes || ""}
                                     onChange={(e) => updateNodeNotes(selectedNode.id, e.target.value)}
                                     className="w-full h-full p-6 lg:p-8 focus:outline-none font-serif text-base lg:text-lg leading-relaxed resize-none text-gray-800 placeholder:text-gray-300"
                                     placeholder={isTr ? "Veri girişi yapın..." : "Input node data..."}
                                     autoFocus
                                     spellCheck={false}
                                  />
                              </div>

                              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-xs text-gray-400 font-mono z-20">
                                  <div className="flex items-center gap-2">
                                      <Activity className="w-3 h-3" />
                                      <span>Ready to sync</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-green-600">
                                      {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                      {isSaving ? (isTr ? 'KAYDEDİLİYOR...' : 'SAVING...') : (isTr ? 'KAYDEDİLDİ' : 'SAVED')}
                                  </div>
                              </div>
                          </motion.div>
                      </div>
                  )}
              </AnimatePresence>

          </div>
      )}
    </div>
  );
}
