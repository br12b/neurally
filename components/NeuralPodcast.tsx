
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, Play, Pause, FastForward, Rewind, Mic2, Sparkles, Download, FileText, Loader2, Globe, Terminal, XCircle, AudioLines, Disc, ShieldAlert } from 'lucide-react';
import { createAIClient } from '../utils/ai';
import { Type, Modality } from "@google/genai";
import { Language } from '../types';
import { checkRateLimit, sanitizeInput } from '../utils/security';

interface NeuralPodcastProps {
    language: Language;
}

interface ScriptLine {
    speaker: 'Host' | 'Expert';
    text: string;
}

type PodcastLang = 'tr' | 'en' | 'es' | 'de' | 'fr';

// --- WAV HEADER UTILITIES ---
const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

const createWavBlob = (pcmData: Uint8Array): Blob => {
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length, true);

    const wavFile = new Uint8Array(header.byteLength + pcmData.length);
    wavFile.set(new Uint8Array(header), 0);
    wavFile.set(pcmData, header.byteLength);

    return new Blob([wavFile], { type: 'audio/wav' });
};

export default function NeuralPodcast({ language }: NeuralPodcastProps) {
    const isTr = language === 'tr';
    
    // Core State
    const [inputText, setInputText] = useState("");
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [isSynthesizingAudio, setIsSynthesizingAudio] = useState(false);
    const [script, setScript] = useState<ScriptLine[]>([]);
    
    // Audio State
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const [targetLanguage, setTargetLanguage] = useState<PodcastLang>(isTr ? 'tr' : 'en');
    
    // DEBUGGER STATE
    const [logs, setLogs] = useState<string[]>([]);
    const [showDebug, setShowDebug] = useState(false);

    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [`[${time}] ${msg}`, ...prev]);
        console.log(`[NeuralPodcast] ${msg}`);
    };

    // --- 1. SCRIPT GENERATION ---
    const generateScript = async () => {
        // RATE LIMIT
        const limitCheck = checkRateLimit('generate_podcast');
        if (!limitCheck.allowed) {
            addLog(`BLOCKED: Rate limit exceeded. Wait ${limitCheck.waitTime}`);
            alert(`Rate limit active. Please wait ${limitCheck.waitTime}.`);
            return;
        }

        const safeInput = sanitizeInput(inputText);
        if (!safeInput) return;

        setIsGeneratingScript(true);
        setScript([]);
        setAudioUrl(null);
        setAudioBlob(null);
        setLogs([]); 
        addLog("Starting script generation...");

        try {
            const ai = createAIClient();
            
            const langMap = {
                tr: "Turkish",
                en: "English",
                es: "Spanish",
                de: "German",
                fr: "French"
            };

            const selectedLangName = langMap[targetLanguage];

            const prompt = `Convert the source text into an engaging, educational podcast script between two people in ${selectedLangName}.
            
            Characters:
            1. "Host": Energetic, curious, asks clarifying questions.
            2. "Expert": Calm, knowledgeable, uses analogies to explain.
            
            Rules:
            - Keep it conversational and natural.
            - Total length: About 10-15 exchanges.
            - Output JSON format ONLY: array of objects {speaker: "Host" | "Expert", text: "..."}
            
            Source Text: "${safeInput.substring(0, 4000)}"`;

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
                                speaker: { type: Type.STRING, enum: ["Host", "Expert"] },
                                text: { type: Type.STRING }
                            },
                            required: ["speaker", "text"]
                        }
                    }
                }
            });

            if (response.text) {
                const data = JSON.parse(response.text) as ScriptLine[];
                setScript(data);
                addLog(`Script generated successfully. ${data.length} lines.`);
            }
        } catch (error: any) {
            addLog(`ERROR (Script): ${error.message || error}`);
            alert("Script generation failed. Check logs.");
        } finally {
            setIsGeneratingScript(false);
        }
    };

    // --- 2. HD AUDIO SYNTHESIS (GEMINI TTS) ---
    const generateHDAudio = async () => {
        if (script.length === 0) return;
        setIsSynthesizingAudio(true);
        addLog("Starting HD Audio Synthesis...");

        try {
            const ai = createAIClient();
            const dialogueText = script.map(line => `${line.speaker}: ${line.text}`).join('\n');

            addLog(`Sending ${dialogueText.length} chars to TTS Model...`);

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts", 
                contents: [{ parts: [{ text: dialogueText }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        multiSpeakerVoiceConfig: {
                            speakerVoiceConfigs: [
                                { speaker: 'Host', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } },
                                { speaker: 'Expert', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } }
                            ]
                        }
                    }
                }
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio) {
                addLog("Audio data received from API.");
                const binaryString = atob(base64Audio);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                addLog(`Audio Raw Size: ${(len / 1024).toFixed(2)} KB`);

                const wavBlob = createWavBlob(bytes);
                const url = URL.createObjectURL(wavBlob);
                
                setAudioBlob(wavBlob);
                setAudioUrl(url);
                addLog("WAV Container created. Ready for playback.");
            } else {
                throw new Error("API returned no audio data.");
            }

        } catch (error: any) {
            addLog(`ERROR (Audio): ${error.message || error}`);
            alert("Audio generation failed. Check logs.");
        } finally {
            setIsSynthesizingAudio(false);
        }
    };

    // --- 3. AUDIO PLAYER LOGIC ---
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const playAudio = async () => {
            try {
                if (isPlaying) {
                    await audio.play();
                } else {
                    audio.pause();
                }
            } catch (err: any) {
                console.error(err);
                setIsPlaying(false);
                addLog(`PLAYBACK ERROR: ${err.message}`);
            }
        };
        playAudio();
    }, [isPlaying]);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            setDuration(audioRef.current.duration || 0);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleDownload = () => {
        if (audioUrl) {
            const a = document.createElement('a');
            a.href = audioUrl;
            a.download = `Neurally_Podcast_${new Date().toISOString().slice(0,10)}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    const formatTime = (t: number) => {
        if (isNaN(t)) return "0:00";
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const togglePlay = () => {
        if (!audioUrl) return;
        setIsPlaying(!isPlaying);
    };

    const handleError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
        const error = e.currentTarget.error;
        addLog(`AUDIO ELEMENT ERROR: ${error?.message || 'Unknown error'}`);
        setIsPlaying(false);
    };

    return (
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto min-h-screen">
            
            {/* DEBUGGER (Minimal) */}
            <AnimatePresence>
                {showDebug && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="fixed bottom-4 right-4 w-96 max-h-48 bg-black text-green-400 font-mono text-[10px] p-4 rounded border border-green-900 z-50 overflow-y-auto"
                    >
                        <div className="flex justify-between border-b border-green-900 pb-1 mb-2">
                            <span>TERMINAL</span>
                            <button onClick={() => setShowDebug(false)}><XCircle className="w-3 h-3" /></button>
                        </div>
                        {logs.map((log, i) => <div key={i}>{log}</div>)}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HEADER */}
            <div className="mb-12 flex flex-col md:flex-row justify-between items-end border-b border-gray-100 pb-8">
                <div>
                    <h1 className="font-serif text-5xl md:text-6xl text-black mb-4 tracking-tighter">
                        Neural Podcast
                    </h1>
                    <p className="text-gray-400 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                        <AudioLines className="w-3 h-3" />
                        {isTr ? 'Yapay Zeka Ses Sentezi Modülü' : 'AI Audio Synthesis Module'}
                    </p>
                </div>
                
                {/* Language Selector (Minimal) */}
                <div className="flex items-center gap-1 mt-4 md:mt-0">
                    {(['tr', 'en', 'es', 'de', 'fr'] as PodcastLang[]).map(lang => (
                        <button
                            key={lang}
                            onClick={() => setTargetLanguage(lang)}
                            disabled={script.length > 0} 
                            className={`
                                w-8 h-8 flex items-center justify-center text-[10px] font-bold uppercase transition-all rounded-full
                                ${targetLanguage === lang 
                                    ? 'bg-black text-white' 
                                    : 'text-gray-300 hover:text-black hover:bg-gray-100'}
                            `}
                        >
                            {lang}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
                
                {/* LEFT: INPUT & SCRIPT */}
                <div className="lg:col-span-5 space-y-8 h-full flex flex-col">
                    
                    {/* Input Block */}
                    <div className="bg-white group">
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                                {isTr ? 'KAYNAK VERİ' : 'SOURCE DATA'}
                            </label>
                            <span className="text-[10px] font-mono text-gray-300">{inputText.length} chars</span>
                        </div>
                        <textarea 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            className="w-full h-40 p-4 bg-gray-50 border border-gray-200 resize-none focus:border-black focus:outline-none font-serif text-sm leading-relaxed transition-colors placeholder:text-gray-300"
                            placeholder={isTr ? "İçeriği buraya yapıştır..." : "Paste content here..."}
                        />
                        <button 
                            onClick={generateScript}
                            disabled={!inputText || isGeneratingScript}
                            className="w-full mt-4 py-4 border border-black text-black font-bold text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isGeneratingScript ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                            {isGeneratingScript ? 'PROCESSING...' : (isTr ? 'SENARYO OLUŞTUR' : 'GENERATE SCRIPT')}
                        </button>
                    </div>

                    {/* Script Preview (Screenplay Format) */}
                    {script.length > 0 && (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="flex-1 border-t border-gray-100 pt-8 flex flex-col min-h-[400px]"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                                    {isTr ? 'SENARYO DÖKÜMÜ' : 'SCRIPT TRANSCRIPT'}
                                </label>
                                <div className="px-2 py-1 bg-gray-100 text-[9px] font-mono uppercase rounded">
                                    {script.length} LINES
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 font-mono text-xs">
                                {script.map((line, idx) => (
                                    <div key={idx} className="flex flex-col items-center text-center">
                                        <div className="font-bold uppercase tracking-wider text-gray-400 mb-1 text-[10px]">
                                            {line.speaker}
                                        </div>
                                        <div className="max-w-md font-serif text-sm text-black leading-relaxed">
                                            {line.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* RIGHT: STUDIO PLAYER */}
                <div className="lg:col-span-7 flex flex-col">
                    <div className="sticky top-8">
                        {/* THE BLACK BOX (Player) */}
                        <div className="bg-[#0A0A0A] text-white rounded-none p-8 lg:p-12 shadow-2xl relative overflow-hidden min-h-[400px] flex flex-col justify-between border border-gray-800">
                            
                            {/* Texture Overlay */}
                            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

                            {/* Header Status */}
                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">STATUS</span>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${audioUrl ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500 animate-pulse'}`}></div>
                                        <span className="font-bold text-sm tracking-wide">
                                            {isSynthesizingAudio ? 'SYNTHESIZING...' : (audioUrl ? 'ONLINE' : 'STANDBY')}
                                        </span>
                                    </div>
                                </div>
                                
                                {audioUrl && (
                                    <button 
                                        onClick={handleDownload}
                                        className="p-3 border border-white/20 hover:bg-white hover:text-black transition-colors rounded-full"
                                        title="Download .WAV"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Center Visualizer */}
                            <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-12">
                                {script.length > 0 && !audioUrl && !isSynthesizingAudio && (
                                    <motion.button 
                                        onClick={generateHDAudio}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="group relative px-8 py-4 border border-white/30 text-white font-mono text-xs uppercase tracking-[0.2em] hover:border-white hover:bg-white hover:text-black transition-all"
                                    >
                                        <span className="flex items-center gap-3">
                                            <Mic2 className="w-4 h-4" /> {isTr ? 'SES SENTEZLE' : 'SYNTHESIZE AUDIO'}
                                        </span>
                                    </motion.button>
                                )}

                                {isSynthesizingAudio && (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        <span className="font-mono text-xs text-gray-500 animate-pulse">PROCESSING NEURAL AUDIO...</span>
                                    </div>
                                )}

                                {audioUrl && (
                                    <div className="w-full flex items-center justify-center gap-1 h-16">
                                        {/* Fake Visualizer Bars */}
                                        {[...Array(20)].map((_, i) => (
                                            <motion.div 
                                                key={i}
                                                animate={{ 
                                                    height: isPlaying ? [10, Math.random() * 60 + 10, 10] : 4,
                                                    opacity: isPlaying ? 1 : 0.3
                                                }}
                                                transition={{ 
                                                    duration: 0.2, 
                                                    repeat: Infinity, 
                                                    repeatType: "reverse",
                                                    delay: i * 0.05
                                                }}
                                                className="w-1 bg-white rounded-full"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer Controls */}
                            <div className="relative z-10">
                                <div className="flex items-center justify-between gap-6 mb-4">
                                    <span className="font-mono text-xs text-gray-500 tabular-nums w-12">{formatTime(currentTime)}</span>
                                    
                                    <div className="flex-1 relative h-1 bg-gray-800 rounded-full cursor-pointer group">
                                        <div 
                                            className="absolute top-0 left-0 h-full bg-white rounded-full transition-all" 
                                            style={{ width: `${(currentTime / duration) * 100}%` }}
                                        ></div>
                                        <input 
                                            type="range" 
                                            min="0" max={duration} 
                                            value={currentTime} 
                                            onChange={handleSeek}
                                            disabled={!audioUrl}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                    </div>

                                    <span className="font-mono text-xs text-gray-500 tabular-nums w-12 text-right">{formatTime(duration)}</span>
                                </div>

                                <div className="flex justify-center items-center gap-8">
                                    <button 
                                        onClick={() => { if(audioRef.current) audioRef.current.currentTime -= 10; }}
                                        disabled={!audioUrl}
                                        className="text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                                    >
                                        <Rewind className="w-6 h-6" />
                                    </button>
                                    
                                    <button 
                                        onClick={togglePlay}
                                        disabled={!audioUrl}
                                        className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100"
                                    >
                                        {isPlaying ? <Pause className="w-6 h-6 fill-black" /> : <Play className="w-6 h-6 fill-black ml-1" />}
                                    </button>

                                    <button 
                                        onClick={() => { if(audioRef.current) audioRef.current.currentTime += 10; }}
                                        disabled={!audioUrl}
                                        className="text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                                    >
                                        <FastForward className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                        </div>
                        
                        <div className="mt-4 flex justify-between items-center px-2">
                             <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 uppercase">
                                 <Terminal className="w-3 h-3" />
                                 <button onClick={() => setShowDebug(!showDebug)} className="hover:text-black transition-colors">
                                     {showDebug ? 'HIDE LOGS' : 'VIEW LOGS'}
                                 </button>
                             </div>
                             <div className="text-[10px] font-mono text-gray-400">
                                 GEMINI 2.5 / 24kHz
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Audio Element */}
            {audioUrl && (
                <audio 
                    ref={audioRef} 
                    src={audioUrl} 
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleEnded}
                    onLoadedMetadata={handleTimeUpdate}
                    onError={handleError}
                />
            )}
        </div>
    );
}
