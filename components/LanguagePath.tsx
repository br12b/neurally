
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Flag, CheckCircle2, Lock, ArrowRight, Loader2, Languages, MessageCircle, Mic, Send, Sparkles, Volume2, Shield, X, RefreshCw } from 'lucide-react';
import { createAIClient } from '../utils/ai';
import { Type } from "@google/genai";
import { LangNode, Language } from '../types';
import { checkRateLimit } from '../utils/security';

interface LanguagePathProps {
    language: Language;
    onAddXP: (amount: number) => void;
}

interface ChatMessage {
    id: string;
    sender: 'ai' | 'user';
    text: string;
    correction?: string; // Optional field for AI corrections
}

export default function LanguagePath({ language, onAddXP }: LanguagePathProps) {
    const isTr = language === 'tr';

    const [targetLang, setTargetLang] = useState<string>("");
    const [currentLevel, setCurrentLevel] = useState<string>("A1");
    const [roadmap, setRoadmap] = useState<LangNode[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // --- INTERACTIVE SESSION STATE ---
    const [activeNode, setActiveNode] = useState<LangNode | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState("");
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [sessionProgress, setSessionProgress] = useState(0); // 0 to 100
    const [sessionComplete, setSessionComplete] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);

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

    // Scroll to bottom of chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isAiTyping]);

    // --- SPEECH RECOGNITION (BROWSER NATIVE) ---
    const startListening = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Speech recognition is not supported in this browser. Try Chrome.");
            return;
        }
        
        // @ts-ignore
        const recognition = new window.webkitSpeechRecognition();
        
        // Set language based on target
        const langCodeMap: Record<string, string> = {
            'Spanish': 'es-ES', 'French': 'fr-FR', 'German': 'de-DE', 
            'Italian': 'it-IT', 'Japanese': 'ja-JP', 'English': 'en-US'
        };
        recognition.lang = langCodeMap[targetLang] || 'en-US';
        
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error("Speech Error:", event.error);
            setIsListening(false);
        };
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setUserInput(transcript);
        };

        recognition.start();
    };

    // --- TEXT-TO-SPEECH ---
    const speakText = (text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            const langCodeMap: Record<string, string> = {
                'Spanish': 'es-ES', 'French': 'fr-FR', 'German': 'de-DE', 
                'Italian': 'it-IT', 'Japanese': 'ja-JP', 'English': 'en-US'
            };
            utterance.lang = langCodeMap[targetLang] || 'en-US';
            utterance.rate = 0.9; // Slightly slower for learning
            window.speechSynthesis.speak(utterance);
        }
    };

    const generatePath = async () => {
        if (!targetLang) return;
        const limitCheck = checkRateLimit('generate_path');
        if (!limitCheck.allowed) { alert(`Limit exceeded. Wait ${limitCheck.waitTime}`); return; }

        setIsLoading(true);
        try {
            const ai = createAIClient();
            const prompt = isTr 
                ? `${targetLang} dili öğrenimi için ${currentLevel} seviyesinde 5 adımlık interaktif bir yol haritası oluştur. Her adım, kullanıcının AI ile rol yapabileceği gerçekçi bir senaryo olsun (Örn: "Taksiye Binmek", "Doktorda"). JSON: [{ id: "1", title: "Başlık", level: "A1", description: "Kısa açıklama", status: "locked" }]`
                : `Create a 5-step interactive language roadmap for ${targetLang} at ${currentLevel}. Each node is a roleplay scenario (e.g. "Ordering Coffee"). JSON: [{ id: "1", title: "Title", level: "A1", description: "Desc", status: "locked" }]`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            if (response.text) {
                const data = JSON.parse(response.text) as LangNode[];
                if(data.length > 0) data[0].status = 'active';
                setRoadmap(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- START SESSION ---
    const startSession = async (node: LangNode) => {
        if (node.status === 'locked') return;
        
        setActiveNode(node);
        setMessages([]);
        setSessionComplete(false);
        setSessionProgress(0);
        setIsAiTyping(true);

        // Initial AI Message (Set the Scene)
        try {
            const ai = createAIClient();
            const prompt = `Act as a character in this scenario: "${node.title}". Language: ${targetLang}. 
            Start the conversation. Keep it short (1 sentence). 
            Context: We are roleplaying. You are the local, I am the learner. 
            Output only the spoken text.`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt
            });

            const initialText = response.text || (isTr ? "Merhaba! Nasıl yardımcı olabilirim?" : "Hello! How can I help?");
            setMessages([{ id: 'init', sender: 'ai', text: initialText }]);
            speakText(initialText);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAiTyping(false);
        }
    };

    // --- SEND MESSAGE & AI REPLY ---
    const handleSendMessage = async () => {
        if (!userInput.trim() || !activeNode) return;

        const newUserMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: userInput };
        setMessages(prev => [...prev, newUserMsg]);
        setUserInput("");
        setIsAiTyping(true);

        // GAMIFICATION: Add XP per message
        onAddXP(10); 
        
        // Progress Logic
        const newProgress = Math.min(sessionProgress + 20, 100);
        setSessionProgress(newProgress);

        try {
            const ai = createAIClient();
            
            // Context Builder
            const history = messages.map(m => `${m.sender === 'user' ? 'Me' : 'You'}: ${m.text}`).join('\n');
            
            const prompt = `Roleplay Scenario: "${activeNode.title}" in ${targetLang}.
            History:
            ${history}
            Me: ${newUserMsg.text}
            
            Task: Reply naturally as the character. Keep it simple (${activeNode.level} level).
            IMPORTANT: If I made a grammar mistake, provide a subtle correction in parentheses at the end.
            Example: "Yes, here is your coffee. (Correction: You said 'el café', but coffee is masculine 'un café')"`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt
            });

            const replyText = response.text || "...";
            const newAiMsg: ChatMessage = { id: (Date.now()+1).toString(), sender: 'ai', text: replyText };
            
            setMessages(prev => [...prev, newAiMsg]);
            speakText(replyText);

            // Check for completion
            if (newProgress >= 100) {
                setSessionComplete(true);
                completeNode(activeNode.id);
            }

        } catch (error) {
            console.error("Chat Error", error);
        } finally {
            setIsAiTyping(false);
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
        onAddXP(150); // Big bonus for completion
    };

    const closeSession = () => {
        setActiveNode(null);
    };

    return (
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto min-h-screen bg-[#FAFAFA]">
            
            {/* Header */}
            <div className="flex justify-between items-end mb-12">
                <div>
                    <h1 className="font-serif text-5xl text-black mb-2">{isTr ? 'Dil Simülasyonu' : 'Neural Immersion'}</h1>
                    <p className="text-gray-400 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                        <Map className="w-3 h-3" /> {isTr ? 'İnteraktif Senaryo Haritası' : 'Interactive Scenario Map'}
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
                    <h2 className="font-serif text-3xl mb-6">{isTr ? 'Hangi Dili Konuşacağız?' : 'Target Language Protocol'}</h2>
                    
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
                        {isTr ? 'Simülasyonu Başlat' : 'Initialize Simulation'}
                    </button>
                </div>
            )}

            {/* ROADMAP VIEW */}
            {roadmap.length > 0 && (
                <div className="relative">
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
                                <div className={`
                                    w-12 h-12 rounded-full border-4 flex items-center justify-center shrink-0 bg-white z-10 transition-colors
                                    ${node.status === 'completed' ? 'border-green-500 text-green-500' : node.status === 'active' ? 'border-black text-black' : 'border-gray-200 text-gray-300'}
                                `}>
                                    {node.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : node.status === 'active' ? <MessageCircle className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                                </div>

                                <div 
                                    onClick={() => startSession(node)}
                                    className={`
                                        flex-1 bg-white border p-6 rounded-2xl transition-all relative overflow-hidden group
                                        ${node.status === 'active' ? 'border-black shadow-lg cursor-pointer hover:translate-x-2' : node.status === 'completed' ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded uppercase tracking-wider text-gray-500">
                                            LEVEL {node.level}
                                        </span>
                                        {node.status === 'active' && <span className="text-[10px] font-bold text-white bg-black px-2 py-1 rounded animate-pulse">LIVE SESSION</span>}
                                    </div>
                                    <h3 className="font-serif text-2xl mb-2 group-hover:underline decoration-1 underline-offset-4">{node.title}</h3>
                                    <p className="text-sm text-gray-500">{node.description}</p>
                                    
                                    {node.status === 'active' && (
                                        <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-black">
                                            <span>{isTr ? 'Başlamak için tıkla' : 'Click to Enter'}</span> <ArrowRight className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* LIVE CHAT SESSION MODAL */}
            <AnimatePresence>
                {activeNode && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 lg:p-8"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl relative"
                        >
                            {/* Chat Header */}
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{isTr ? 'CANLI BAĞLANTI' : 'LIVE CONNECTION'}</span>
                                    </div>
                                    <h3 className="font-serif text-2xl">{activeNode.title}</h3>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <motion.div 
                                            className="h-full bg-green-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${sessionProgress}%` }}
                                        />
                                    </div>
                                    <button onClick={closeSession} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            {/* Chat Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white custom-scrollbar">
                                {messages.map((msg) => (
                                    <motion.div 
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`
                                            max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed relative
                                            ${msg.sender === 'user' ? 'bg-black text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}
                                        `}>
                                            {msg.sender === 'ai' && (
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">AI Roleplay</div>
                                            )}
                                            {msg.text}
                                            {msg.sender === 'ai' && (
                                                <button onClick={() => speakText(msg.text)} className="absolute -right-8 top-2 p-1 text-gray-300 hover:text-black">
                                                    <Volume2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                                {isAiTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-gray-50 p-4 rounded-2xl rounded-bl-none">
                                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Session Complete Overlay */}
                            {sessionComplete && (
                                <motion.div 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8"
                                >
                                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                                        <CheckCircle2 className="w-12 h-12" />
                                    </div>
                                    <h2 className="font-serif text-4xl mb-4">{isTr ? 'Senaryo Tamamlandı!' : 'Scenario Complete!'}</h2>
                                    <p className="text-gray-500 mb-8 max-w-md">
                                        {isTr ? 'Harika iş çıkardın. +150 XP kazandın ve bir sonraki seviyenin kilidi açıldı.' : 'Great job. You earned +150 XP and unlocked the next level.'}
                                    </p>
                                    <button 
                                        onClick={closeSession}
                                        className="px-8 py-4 bg-black text-white font-bold uppercase tracking-widest rounded-xl hover:scale-105 transition-transform"
                                    >
                                        {isTr ? 'Devam Et' : 'Continue Journey'}
                                    </button>
                                </motion.div>
                            )}

                            {/* Input Area */}
                            <div className="p-6 bg-gray-50 border-t border-gray-100">
                                <div className="flex gap-4">
                                    <button 
                                        onClick={startListening}
                                        className={`p-4 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white border border-gray-200 text-gray-500 hover:border-black hover:text-black'}`}
                                    >
                                        <Mic className="w-6 h-6" />
                                    </button>
                                    <div className="flex-1 relative">
                                        <input 
                                            value={userInput}
                                            onChange={(e) => setUserInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder={isTr ? "Cevabını yaz (veya konuş)..." : "Type your reply (or speak)..."}
                                            className="w-full h-full pl-6 pr-12 rounded-xl border border-gray-200 focus:border-black focus:outline-none transition-colors"
                                            disabled={sessionComplete}
                                        />
                                        <button 
                                            onClick={handleSendMessage}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
