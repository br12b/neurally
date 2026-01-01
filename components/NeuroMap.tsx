import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Save, Target, ChevronRight, Share2, Database, LayoutList, Activity, Cloud, RefreshCw, Loader2, WifiOff } from 'lucide-react';
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

  // --- HYBRID STATE INITIALIZATION (INSTANT LOAD) ---
  // Initialize directly from LocalStorage if available to prevent flickering
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

  // State
  const [setupMode, setSetupMode] = useState<boolean>(!localData.subject);
  const [subject, setSubject] = useState<string>(localData.subject || "");
  const [topicsInput, setTopicsInput] = useState("");
  const [nodes, setNodes] = useState<MindNode[]>(localData.nodes || []);
  const [selectedNode, setSelectedNode] = useState<MindNode | null>(null);
  
  // Sync States
  const [isSaving, setIsSaving] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false); // Background sync indicator

  // --- 1. BACKGROUND CLOUD FETCH (Non-Blocking) ---
  useEffect(() => {
    if (!user) return;

    const syncFromCloud = async () => {
        setIsCloudSyncing(true);
        try {
            const docRef = doc(db, "neuralLists", user.id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                // Compare timestamps or simply prefer cloud if it exists and local is empty
                // Here we prefer Cloud if it has content
                if (cloudData.nodes && cloudData.nodes.length > 0) {
                    setNodes(cloudData.nodes);
                    setSubject(cloudData.subject || "");
                    setSetupMode(false);
                    
                    // Update LocalStorage to match Cloud
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

    syncFromCloud();
  }, [user]);

  // --- 2. HYBRID SAVE (Local + Cloud) ---
  useEffect(() => {
    if (!user || nodes.length === 0) return;
    
    setIsSaving(true);
    
    // A. Instant Local Save
    localStorage.setItem(localKey, JSON.stringify({ subject, nodes }));

    // B. Debounced Cloud Save
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
          // Clear State
          setNodes([]);
          setSubject("");
          setTopicsInput("");
          setSetupMode(true);
          setSelectedNode(null);

          // Clear Local
          localStorage.removeItem(localKey);

          // Clear Cloud (Fire & Forget)
          if (user) {
              deleteDoc(doc(db, "neuralLists", user.id)).catch(e => console.error(e));
          }
      }
  };

  // Get Core and Satellites
  const coreNode = nodes.find(n => n.type === 'core');
  const listNodes = nodes.filter(n => n.type === 'satellite');

  return (
    <div className="h-full w-full relative bg-[#FAFAFA] flex flex-col font-sans select-none text-ink-900 overflow-hidden">
      
      {/* HEADER UI */}
      <div className="absolute top-0 left-0 w-full p-8 z-[70] flex justify-between items-start pointer-events-none">
         <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="pointer-events-auto"
         >
             <h1 className="font-serif text-4xl text-black mb-1 flex items-center gap-3 tracking-tighter">
                 Neural List <span className="text-white bg-black font-sans text-[10px] font-bold tracking-[0.2em] px-2 py-0.5 rounded-full">LIVE</span>
             </h1>
             {/* Account Info Badge */}
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
                     <Plus className="w-3 h-3 group-hover:rotate-90 transition-transform" /> {isTr ? 'Yeni Liste' : 'New List'}
                 </button>
             </motion.div>
         )}
      </div>

      {/* SETUP VIEW (Modal) */}
      <AnimatePresence>
      {setupMode && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-white/60 backdrop-blur-md">
              <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="w-full max-w-5xl bg-white border border-gray-200 shadow-2xl rounded-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]"
              >
                  {/* Left: Branding & INFO */}
                  <div className="w-full md:w-[45%] bg-black text-white p-12 flex flex-col justify-between relative overflow-hidden">
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
                              <p>
                                {isTr
                                    ? "Beynimiz bilgiyi doğrusal listeler halinde daha iyi işler. Bu modülü kullanarak ana konunuzu alt başlıklarına ayırın."
                                    : "Our brains process information better in linear lists. Use this module to break your core subject into subtopics."}
                              </p>
                          </div>
                      </div>
                      <div className="absolute bottom-0 right-0 opacity-10">
                          <Database className="w-64 h-64 -mb-10 -mr-10" />
                      </div>
                  </div>

                  {/* Right: Form */}
                  <div className="w-full md:w-[55%] p-12 flex flex-col justify-center bg-white relative">
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

      {/* MAIN LAYOUT (Split Screen) */}
      {!setupMode && (
          <div className="flex h-full pt-24 px-8 pb-8 gap-8">
              
              {/* LEFT COLUMN: Core Subject (Fixed) */}
              <motion.div 
                 initial={{ opacity: 0, x: -50 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="w-1/3 flex flex-col justify-between h-full py-4"
              >
                  <div>
                      <div className="flex items-center gap-2 mb-6">
                         <div className="px-2 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded">
                             Root Directory
                         </div>
                         <div className="h-px bg-gray-200 flex-1"></div>
                      </div>

                      <h2 className="font-serif text-6xl md:text-7xl font-medium text-black leading-[0.9] tracking-tighter mb-8 break-words">
                          {coreNode?.label}
                      </h2>
                      
                      <div className="space-y-4 font-mono text-xs text-gray-400">
                          <div className="flex justify-between border-b border-gray-100 pb-2">
                              <span className="uppercase tracking-widest">OWNER</span>
                              <span className="text-black">{user?.name}</span>
                          </div>
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

                      <div className="mt-12 p-6 bg-white border border-gray-100 shadow-sm rounded-lg relative overflow-hidden group cursor-pointer hover:border-black transition-colors" onClick={() => coreNode && setSelectedNode(coreNode)}>
                          <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                          <h3 className="font-bold text-sm mb-2 uppercase tracking-wide">Core Metadata</h3>
                          <p className="text-sm text-gray-500 line-clamp-3 font-serif leading-relaxed">
                              {coreNode?.notes.replace('Ana Ders: ' + coreNode.label, '').trim() || "No detailed notes provided for the core subject."}
                          </p>
                      </div>
                  </div>

                  <div className="opacity-20 pointer-events-none">
                       {/* Abstract decorative element */}
                       <div className="w-full h-32 border border-black/20 flex items-end justify-between p-1">
                           {[...Array(20)].map((_,i) => (
                               <div key={i} className="w-1 bg-black" style={{ height: `${Math.random() * 100}%` }}></div>
                           ))}
                       </div>
                       <p className="text-[10px] font-mono mt-2 text-right">NEURAL LIST // V.3.3</p>
                  </div>
              </motion.div>

              {/* RIGHT COLUMN: List (Scrollable) */}
              <div className="w-2/3 h-full flex flex-col bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  
                  {/* List Header */}
                  <div className="h-16 border-b border-gray-100 bg-gray-50/50 flex items-center px-8 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      <div className="w-16">ID</div>
                      <div className="flex-1">Data Block</div>
                      <div className="w-32 text-right">State</div>
                      <div className="w-16"></div>
                  </div>

                  {/* Scrollable Area */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                      {listNodes.map((node, i) => (
                          <motion.div 
                              key={node.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              onClick={() => setSelectedNode(node)}
                              className="group flex items-center h-20 px-6 border-b border-gray-50 hover:bg-gray-50 hover:border-black/5 rounded-lg transition-all cursor-pointer"
                          >
                              {/* Index */}
                              <div className="w-16 font-mono text-xs text-gray-300 group-hover:text-black font-bold">
                                  {String(i + 1).padStart(2, '0')}
                              </div>

                              {/* Content */}
                              <div className="flex-1 pr-8">
                                  <h4 className="font-serif text-xl text-black group-hover:translate-x-1 transition-transform duration-300">
                                      {node.label}
                                  </h4>
                              </div>

                              {/* Metadata */}
                              <div className="w-32 text-right font-mono text-[10px] text-gray-400 group-hover:text-black transition-colors">
                                  {node.notes.length > 50 ? 'POPULATED' : 'EMPTY'}
                              </div>

                              {/* Action */}
                              <div className="w-16 flex justify-end">
                                  <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-black group-hover:border-black transition-all">
                                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white" />
                                  </div>
                              </div>
                          </motion.div>
                      ))}

                      {/* Add Button at bottom of list */}
                      <motion.div 
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         transition={{ delay: listNodes.length * 0.05 + 0.2 }}
                         className="flex items-center justify-center p-8 opacity-50 hover:opacity-100 transition-opacity"
                      >
                         <div className="h-px bg-gray-200 w-full"></div>
                         <div className="px-4 text-[10px] uppercase font-bold text-gray-400 whitespace-nowrap">End of Index</div>
                         <div className="h-px bg-gray-200 w-full"></div>
                      </motion.div>
                  </div>
              </div>

              {/* SIDE PANEL (Slide Over) */}
              <AnimatePresence>
                  {selectedNode && (
                      <div className="absolute inset-0 z-[60] flex items-center justify-end pointer-events-none">
                          {/* Backdrop */}
                          <motion.div 
                             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                             onClick={() => setSelectedNode(null)}
                             className="absolute inset-0 bg-white/20 backdrop-blur-[2px] pointer-events-auto"
                          />

                          <motion.div 
                             layoutId={selectedNode.id + "panel"}
                             initial={{ x: '100%' }}
                             animate={{ x: 0 }}
                             exit={{ x: '100%' }}
                             transition={{ type: "spring", damping: 30, stiffness: 300 }}
                             className="h-full w-full max-w-lg bg-white border-l border-gray-200 shadow-2xl flex flex-col pointer-events-auto"
                          >
                              {/* HEADER */}
                              <div className="p-6 border-b border-gray-200 bg-white flex justify-between items-start z-20">
                                  <div>
                                      <div className="flex items-center gap-2 mb-2">
                                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-black px-2 py-1 rounded">
                                              {selectedNode.type === 'core' ? 'ROOT' : 'BLOCK'}
                                          </span>
                                          <span className="text-[10px] font-mono text-gray-400">
                                              #{selectedNode.id.toUpperCase()}
                                          </span>
                                      </div>
                                      <h3 className="font-serif text-3xl font-medium text-black leading-tight">{selectedNode.label}</h3>
                                  </div>
                                  
                                  <button 
                                    onClick={() => setSelectedNode(null)}
                                    className="p-2 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-gray-200 hover:border-red-200"
                                  >
                                      <X className="w-5 h-5" />
                                  </button>
                              </div>

                              {/* Editor Area */}
                              <div className="flex-1 relative bg-white z-10">
                                  <textarea 
                                     value={nodes.find(n => n.id === selectedNode.id)?.notes || ""}
                                     onChange={(e) => updateNodeNotes(selectedNode.id, e.target.value)}
                                     className="w-full h-full p-8 focus:outline-none font-serif text-lg leading-relaxed resize-none text-gray-800 placeholder:text-gray-300"
                                     placeholder={isTr ? "Veri girişi yapın..." : "Input node data..."}
                                     autoFocus
                                     spellCheck={false}
                                  />
                              </div>

                              {/* Footer */}
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