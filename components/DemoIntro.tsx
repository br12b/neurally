import React from 'react';
import { motion } from 'framer-motion';

export default function DemoIntro() {
  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center font-mono">
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="w-full h-full absolute inset-0 bg-black z-0"
        >
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[1] bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
        </motion.div>

        <motion.div
            initial={{ scale: 2, opacity: 0, filter: 'blur(10px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            exit={{ scale: 1.5, opacity: 0, filter: 'blur(20px)' }}
            transition={{ duration: 1, ease: "circOut" }}
            className="relative z-10 text-center"
        >
            <h1 className="text-8xl md:text-9xl font-black text-white tracking-tighter mix-blend-difference mb-4">
                NEURALLY
            </h1>
            <motion.p 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 1 }}
               className="text-white/50 text-xs tracking-[0.5em] uppercase"
            >
                Cognitive Operating System v2.5
            </motion.p>
        </motion.div>

        <motion.div 
           initial={{ width: 0 }}
           animate={{ width: "100%" }}
           transition={{ duration: 2, ease: "easeInOut", delay: 0.5 }}
           className="absolute bottom-0 left-0 h-1 bg-white"
        />
    </div>
  );
}