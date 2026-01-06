
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Flag, CheckCircle2, Lock, ArrowRight, Loader2, Languages, MessageCircle, Mic, Play, Sparkles, Volume2, Eye, EyeOff, Shield } from 'lucide-react';
import { createAIClient } from '../utils/ai';
import { Type } from "@google/genai";
import { LangNode, Language } from '../types';
import { checkRateLimit } from '../utils/security';

interface LanguagePathProps {
    language: Language;
}

export default function LanguagePath({ language }: LanguagePathProps) {
    const isTr = language === 'tr';

    const [targetLang, setTargetLang] = useState<string>("");
    const [currentLevel, setCurrentLevel] = useState<string>("A1");
    const [roadmap, setRoadmap] = useState<LangNode[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Node Detail View
    const [selectedNode, setSelectedNode] = useState<LangNode | null>(null);
    const [isLoadingNode, setIsLoadingNode] = useState(false);

    // Practice Mode State
    const [practiceRole, setPracticeRole] = useState<string | null>(null); // Name of the speaker to hide
    const [speakingLine, setSpeakingLine] = useState<number | null>(null);

    // Initial Load
    useEffect(() => {
        const saved = localStorage.getItem('neurally_lang_path');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                setRoadmap(data.roadmap);
                setTargetLang(data.target);
            } catch (e) {}
        }
    }, []);

    // Save
    useEffect(() => {
        if(roadmap.length > 0) {
            localStorage.setItem('neurally_lang_path', JSON.stringify({ roadmap, target: targetLang }));
        }
    }, [roadmap, targetLang]);

    // Browser TTS (Simple & Free)
    const speakText = (text: string, index: number) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Stop previous
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Try to set correct voice based on targetLang
            // Simple mapping - in production, need more robust voice selection
            const langCode = targetLang === 'Spanish' ? 'es-ES' : 
                             targetLang === 'French' ? 'fr-FR' : 
                             targetLang === 'German' ? 'de-DE' : 
                             targetLang === 'Japanese' ? 'ja-JP' : 'en-US';
            utterance.lang = langCode;
            
            utterance.onstart = () => setSpeakingLine(index);
            utterance.onend = () => setSpeakingLine(null);
            
            window.speechSynthesis.speak(utterance);
        } else {
            alert("Your browser does not support text-to-speech.");
        }
    };

    const generatePath = async () => {
        if (!targetLang) return;

        // RATE LIMIT CHECK
        const limitCheck = checkRateLimit('generate_path');
        if (!limitCheck.allowed) {
            alert(isTr 
                ? `Günlük dil rotası oluşturma limitine ulaştınız. Neural Guard protokolü devrede. ${limitCheck.waitTime} sonra tekrar deneyin.` 
                : `Daily language path limit reached. Neural Guard active. Try again in ${limitCheck.waitTime}.`);
            return;
        }

        setIsLoading(true);

        try {
            const ai = createAIClient();
            
            // DYNAMIC PROMPT BASED ON APP LANGUAGE
            const prompt = isTr 
                ? `${targetLang} dili öğrenimi için ${currentLevel} seviyesinden başlayan 6 adımlık bir yol haritası oluştur.
                   Her adım (node) gerçek hayattan bir senaryo olmalı (örneğin: "Kahve Siparişi", "Otel Check-in", "Yol Tarifi Sorma").
                   
                   ÖNEMLİ KURALLAR:
                   1. "title" ve "description" alanları KESİNLİKLE TÜRKÇE olmalıdır.
                   2. İlk adımın durumu "active", diğerleri "locked" olsun.
                   
                   JSON Formatı: { id: "1", title: "Senaryo Başlığı (TR)", level: "A1", description: "Kısa açıklama (TR)", status: "locked" }`
                
                : `Create a language learning roadmap for learning ${targetLang} starting at ${currentLevel}.
                   Generate 6 progressive milestones/nodes.
                   Each node represents a real-world scenario (e.g., "Ordering Coffee", "Job Interview").
                   Output JSON array of objects: { id: "1", title: "Scenario Title", level: "A1", description: "Short goal description", status: "locked" }
                   Make the first one "active".`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                title: { type: Type.STRING },
                                level: { type: Type.STRING },
                                description: { type: Type.STRING },
                                status: { type: Type.STRING, enum: ["locked", "active", "completed"] }
                            },
                            required: ["id", "title", "level", "description", "status"]
                        }
                    }
                }
            });

            if (response.text) {
                const data = JSON.parse(response.text) as LangNode[];
                // Ensure first is active (double check)
                if(data.length > 0) data[0].status = 'active';
                setRoadmap(data);
            }
        } catch (error) {
            console.error(error);
            alert(isTr ? "Rota oluşturulamadı. Lütfen tekrar dene." : "Failed to generate path. Try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const loadNodeDetails = async (node: LangNode) => {
        if (node.status === 'locked') return;
        setSelectedNode(node);
        setPracticeRole(null); // Reset practice mode
        
        if (node.scenario) return; // Already loaded

        setIsLoadingNode(true);
        try {
            const ai = createAIClient();
            
            // DYNAMIC PROMPT FOR SCENARIO DETAILS
            const prompt = isTr
                ? `Şu dil öğrenme senaryosu için detaylı içerik oluştur: "${node.title}".
                   Hedef Dil: ${targetLang} (${node.level}).
                   
                   İstenen JSON Yapısı ve Kurallar:
                   1. "context": Senaryonun geçtiği bağlamı TÜRKÇE olarak betimle.
                   2. "dialogueStart": ${targetLang} dilinde, iki kişi (Örn: Ana ve Marco) arasında geçen doğal bir diyalog. (En az 6 satır). Format: "Isim: Konuşma"
                   3. "keyVocabulary": Bu senaryodaki 5 kritik kelime. "word" (${targetLang}) ve "meaning" (TÜRKÇE).
                   
                   Output JSON: { context: string, dialogueStart: string, keyVocabulary: [{ word: string, meaning: string }] }`
                
                : `Create a detailed learning scenario for: "${node.title}" in ${targetLang} (${node.level}).
                   1. Context description.
                   2. A short dialogue between two people (e.g. Ana and Marco). At least 6 lines. Format "Name: Line".
                   3. 5 Key vocabulary words with meanings.
                   Output JSON: { context: string, dialogueStart: string, keyVocabulary: [{ word: string, meaning: string }] }`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            if (response.text) {
                const details = JSON.parse(response.text);
                const updatedNodes = roadmap.map(n => n.id === node.id ? { ...n, scenario: details } : n);
                setRoadmap(updatedNodes);
                setSelectedNode({ ...node, scenario: details });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingNode(false);
        }
    };

    const completeNode = (id: string) => {
        const index = roadmap.findIndex(n => n.id === id);
        const newMap = [...roadmap];
        newMap[index].status = 'completed';
        if (index + 1 < newMap.length) {
            newMap[index + 1].status = 'active';
        }
        setRoadmap(newMap);
        setSelectedNode(null);
    };

    return (
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto min-h-screen bg-[#FAFAFA]">
            
            <div className="flex justify-between items-end mb-12">
                <div>
                    <h1 className="font-serif text-5xl text-black mb-2">{isTr ? 'Dil Rotası' : 'Neural Lang'}</h1>
                    <p className="text-gray-400 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                        <Map className="w-3 h-3" /> {isTr ? 'Bağlamsal Öğrenme Haritası' : 'Contextual Learning Map'}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {roadmap.length > 0 && (
                        <button onClick={() => { setRoadmap([]); setTargetLang(""); }} className="text-xs font-bold text-red-500 uppercase">
                            {isTr ? 'Rotayı Sil' : 'Reset Path'}
                        </button>
                    )}
                </div>
            </div>

            {/* SETUP SCREEN */}
            {roadmap.length === 0 && (
                <div className="max-w-2xl mx-auto bg-white border border-gray-200 p-12 rounded-2xl shadow-sm text-center">
                    <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-8">
                        <Languages className="w-10 h-10" />
                    </div>
                    <h2 className="font-serif text-3xl mb-6">{isTr ? 'Hangi Dili Öğreniyorsun?' : 'Target Language Protocol'}</h2>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        {['Spanish', 'French', 'German', 'Italian', 'Japanese', 'English'].map(lang => (
                            <button 
                                key={lang}
                                onClick={() => setTargetLang(lang)}
                                className={`py-4 border rounded-xl font-bold transition-all ${targetLang === lang ? 'bg-black text-white border-black' : 'hover:bg-gray-50'}`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                    
                    <button 
                        onClick={generatePath}
                        disabled={!targetLang || isLoading}
                        className="w-full py-5 bg-black text-white font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 rounded-xl disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        {isTr ? 'Rotayı Oluştur (AI)' : 'Generate Path (AI)'}
                    </button>
                </div>
            )}

            {/* ROADMAP VIEW */}
            {roadmap.length > 0 && (
                <div className="relative">
                    {/* Visual Line */}
                    <div className="absolute left-[23px] top-8 bottom-8 w-1 bg-gray-200 rounded-full"></div>

                    <div className="space-y-12 relative z-10">
                        {roadmap.map((node, i) => (
                            <motion.div 
                                key={node.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className={`flex items-start gap-8 group ${node.status === 'locked' ? 'opacity-50 blur-[1px]' : 'opacity-100'}`}
                            >
                                {/* Status Icon */}
                                <div className={`
                                    w-12 h-12 rounded-full border-4 flex items-center justify-center shrink-0 bg-white z-10
                                    ${node.status === 'completed' ? 'border-green-500 text-green-500' : node.status === 'active' ? 'border-black text-black' : 'border-gray-200 text-gray-300'}
                                `}>
                                    {node.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : node.status === 'active' ? <Flag className="w-6 h-6 fill-current" /> : <Lock className="w-5 h-5" />}
                                </div>

                                {/* Content Card */}
                                <div 
                                    onClick={() => loadNodeDetails(node)}
                                    className={`
                                        flex-1 bg-white border p-6 rounded-2xl transition-all relative overflow-hidden
                                        ${node.status === 'active' ? 'border-black shadow-lg cursor-pointer hover:translate-x-2' : node.status === 'completed' ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded uppercase tracking-wider text-gray-500">
                                            LEVEL {node.level}
                                        </span>
                                        {node.status === 'active' && <span className="text-[10px] font-bold text-white bg-black px-2 py-1 rounded animate-pulse">CURRENT OBJECTIVE</span>}
                                    </div>
                                    <h3 className="font-serif text-2xl mb-2">{node.title}</h3>
                                    <p className="text-sm text-gray-500">{node.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* DETAIL MODAL */}
            <AnimatePresence>
                {selectedNode && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setSelectedNode(null)}
                    >
                        <motion.div 
                            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-0 relative flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {isLoadingNode ? (
                                <div className="flex flex-col items-center justify-center h-64 p-8">
                                    <Loader2 className="w-12 h-12 animate-spin text-black mb-4" />
                                    <p className="font-mono text-xs uppercase tracking-widest">{isTr ? 'Senaryo oluşturuluyor...' : 'Generating Context...'}</p>
                                </div>
                            ) : selectedNode.scenario ? (
                                <>
                                    {/* Modal Header */}
                                    <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-gray-50 rounded-t-2xl">
                                        <div>
                                            <h3 className="font-serif text-3xl mb-1">{selectedNode.title}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold bg-black text-white px-3 py-1 rounded-full">{targetLang}</span>
                                                <span className="text-xs text-gray-500">{isTr ? 'Rol Yapma Simülasyonu' : 'Roleplay Simulation'}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-black">
                                            <ArrowRight className="w-6 h-6 rotate-90" />
                                        </button>
                                    </div>

                                    <div className="p-8 space-y-8 flex-1 overflow-y-auto">
                                        
                                        {/* Context Box */}
                                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3">
                                            <Map className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-800 mb-1">{isTr ? 'BAĞLAM' : 'CONTEXT'}</h4>
                                                <p className="text-sm text-blue-900 leading-relaxed">{selectedNode.scenario.context}</p>
                                            </div>
                                        </div>

                                        {/* Interactive Dialogue */}
                                        <div>
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                                    <MessageCircle className="w-3 h-3" /> {isTr ? 'DİYALOG (Tıkla & Dinle)' : 'DIALOGUE (Click to Listen)'}
                                                </h4>
                                                
                                                {/* Practice Mode Toggle */}
                                                <button 
                                                    onClick={() => setPracticeRole(practiceRole ? null : 'User')} // Simple toggle for now, ideally detect names
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all border
                                                        ${practiceRole ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-gray-500 border-gray-200 hover:border-black'}
                                                    `}
                                                >
                                                    {practiceRole ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                    {isTr ? (practiceRole ? 'Gizli Mod: Aktif' : 'Pratik Modu') : (practiceRole ? 'Hidden Mode' : 'Practice Mode')}
                                                </button>
                                            </div>

                                            <div className="space-y-3 font-serif text-lg leading-relaxed">
                                                {selectedNode.scenario.dialogueStart.split('\n').filter(l => l.trim()).map((line, i) => {
                                                    const [speaker, text] = line.split(':');
                                                    const isHidden = practiceRole && i % 2 !== 0; // Simple alternation logic for demo

                                                    return (
                                                        <div 
                                                            key={i} 
                                                            className={`
                                                                p-3 rounded-lg border transition-all flex items-start gap-4 group
                                                                ${speakingLine === i ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-transparent hover:border-gray-200'}
                                                            `}
                                                        >
                                                            <button 
                                                                onClick={() => speakText(text || line, i)}
                                                                className={`mt-1 p-2 rounded-full transition-colors ${speakingLine === i ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-100 text-gray-400 group-hover:text-black group-hover:bg-gray-200'}`}
                                                            >
                                                                {speakingLine === i ? <Volume2 className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4" />}
                                                            </button>

                                                            <div className="flex-1">
                                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                                                    {speaker || 'Speaker'}
                                                                </span>
                                                                <p className={`transition-all duration-300 ${isHidden ? 'blur-sm select-none text-gray-400' : 'text-black'}`}>
                                                                    {text || line}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Vocab Cards */}
                                        <div>
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                                <Sparkles className="w-3 h-3" /> {isTr ? 'KRİTİK KELİMELER' : 'KEY VOCABULARY'}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {selectedNode.scenario.keyVocabulary.map((vocab, i) => (
                                                    <div key={i} className="p-4 border border-gray-200 rounded-xl hover:border-black transition-all bg-white hover:shadow-md flex justify-between items-center group">
                                                        <div>
                                                            <div className="font-bold text-lg text-black">{vocab.word}</div>
                                                            <div className="text-xs text-gray-500 font-mono">{vocab.meaning}</div>
                                                        </div>
                                                        <button 
                                                            onClick={() => speakText(vocab.word, 999)}
                                                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-black transition-opacity"
                                                        >
                                                            <Volume2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Action */}
                                    <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                                        <button 
                                            onClick={() => completeNode(selectedNode.id)}
                                            className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest hover:bg-green-600 transition-colors rounded-xl flex items-center justify-center gap-2 shadow-lg"
                                        >
                                            <CheckCircle2 className="w-5 h-5" /> {isTr ? 'Görevi Tamamla' : 'Complete Mission'}
                                        </button>
                                    </div>
                                </>
                            ) : null}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
