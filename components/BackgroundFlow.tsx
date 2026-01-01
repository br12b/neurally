import React from 'react';
import { motion } from 'framer-motion';

export default function BackgroundFlow() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      
      {/* Subtle Grid Layer - Light Gray for consistency with 'Technical Paper' vibe */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.4]"
        style={{
            backgroundImage: `linear-gradient(to right, #E5E5E5 1px, transparent 1px), linear-gradient(to bottom, #E5E5E5 1px, transparent 1px)`,
            backgroundSize: '4rem 4rem',
            maskImage: 'linear-gradient(to bottom, black 40%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent)'
        }}
      />

      {/* Orb 1 */}
      <motion.div
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -100, 50, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
          times: [0, 0.33, 0.66, 1]
        }}
        className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] rounded-full bg-gradient-to-r from-gray-100 to-gray-50 blur-[120px] opacity-60 mix-blend-multiply"
      />

      {/* Orb 2 */}
      <motion.div
        animate={{
          x: [0, -150, 50, 0],
          y: [0, 80, -120, 0],
          scale: [1, 1.1, 0.8, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
          delay: 2,
          times: [0, 0.33, 0.66, 1]
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[900px] h-[900px] rounded-full bg-gradient-to-l from-gray-200 to-white blur-[140px] opacity-50 mix-blend-multiply"
      />

      {/* Orb 3 - Center Pulse */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gray-50 blur-[100px] opacity-40 mix-blend-multiply"
      />
    </div>
  );
}