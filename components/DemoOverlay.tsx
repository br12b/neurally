import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer2 } from 'lucide-react';

interface DemoOverlayProps {
  isGlitching: boolean;
  cursorTarget: { x: string, y: string } | null; // e.g., "50%", "50%"
  subtitle: string;
}

export default function DemoOverlay({ isGlitching, cursorTarget, subtitle }: DemoOverlayProps) {
  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      
      {/* 1. GLITCH TRANSITION LAYER */}
      <AnimatePresence>
        {isGlitching && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50 mix-blend-hard-light"
            >
                {/* Horizontal Glitch Bars */}
                {[...Array(10)].map((_, i) => (
                    <motion.div 
                        key={i}
                        className="w-full bg-white h-2 mb-4 opacity-50"
                        initial={{ x: -1000 }}
                        animate={{ x: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.1 }}
                    />
                ))}
                
                <h1 className="text-9xl font-black text-white mix-blend-difference tracking-tighter animate-pulse scale-150">
                    SYSTEM::REBOOT
                </h1>
            </motion.div>
        )}
      </AnimatePresence>

      {/* 2. FAKE CURSOR (Ghost User) */}
      <AnimatePresence>
        {cursorTarget && (
            <motion.div
                initial={{ left: "50%", top: "50%", opacity: 0 }}
                animate={{ left: cursorTarget.x, top: cursorTarget.y, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="absolute z-40 drop-shadow-2xl"
            >
                <div className="relative">
                    <MousePointer2 className="w-8 h-8 text-black fill-white stroke-[2px]" />
                    <div className="absolute top-0 left-0 w-8 h-8 bg-white rounded-full blur-xl opacity-50 animate-pulse"></div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* 3. VOICEOVER SUBTITLES */}
      <AnimatePresence>
          {subtitle && (
              <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
                 className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-8 py-4 rounded-full border border-white/10 z-30"
              >
                  <p className="font-mono text-sm text-white uppercase tracking-widest flex items-center gap-3">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      AI: "{subtitle}"
                  </p>
              </motion.div>
          )}
      </AnimatePresence>

      {/* 4. CRT SCANLINE EFFECT (Always on during demo) */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20"></div>

    </div>
  );
}