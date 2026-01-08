
import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Disc, ScanLine, AlertCircle, PlayCircle } from 'lucide-react';
import { User } from '../types';
import BackgroundFlow from './BackgroundFlow';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../utils/firebase';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse Physics
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth mouse for spotlight
  const smoothMouseX = useSpring(mouseX, { stiffness: 500, damping: 50 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 500, damping: 50 });

  // Parallax calculations
  const moveX = useTransform(smoothMouseX, [0, window.innerWidth], [-20, 20]);
  const moveY = useTransform(smoothMouseY, [0, window.innerHeight], [-20, 20]);
  const moveXReverse = useTransform(smoothMouseX, [0, window.innerWidth], [20, -20]);
  const moveYReverse = useTransform(smoothMouseY, [0, window.innerHeight], [20, -20]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    mouseX.set(clientX);
    mouseY.set(clientY);
    
    if (containerRef.current) {
        containerRef.current.style.setProperty('--x', `${clientX}px`);
        containerRef.current.style.setProperty('--y', `${clientY}px`);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    // Protocol Check before attempting login
    if (window.location.protocol === 'file:') {
        setErrorMsg("KRİTİK HATA: Google Girişi dosya sisteminden (file://) çalışmaz. Lütfen projeyi bir yerel sunucu (localhost) üzerinde çalıştırın.");
        setIsLoading(false);
        return;
    }

    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        // --- MOBILE APP DEEP LINK HANDLER ---
        // Mobil uygulama için deep link kontrolü
        const urlParams = new URLSearchParams(window.location.search);
        const isMobile = urlParams.get('mobile') === 'true';
        
        if (isMobile && result.user) {
          // Firebase ID Token'ı al (Doğrudan result üzerinden)
          const idToken = await result.user.getIdToken();
          
          // Mobil uygulamaya geri dön (deep link)
          window.location.href = `neurally.app://callback?token=${idToken}`;
          
          // İşlemi durdur (onLogin çağırma, zaten mobil app halleder)
          return;
        }
        // ------------------------------------

        const appUser: User = {
            id: user.uid,
            name: user.displayName || "Anonymous Scholar",
            email: user.email || "No Email",
            avatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=000000&color=fff`,
            tier: 'Scholar'
        };

        onLogin(appUser);
    } catch (error: any) {
        console.error("Firebase Auth Error Full:", error);
        
        if (error.code === 'auth/popup-closed-by-user') {
            setIsLoading(false);
            setErrorMsg(null);
            return;
        }

        let friendlyMessage = `Bağlantı Hatası: ${error.code}`;

        if (error.code === 'auth/unauthorized-domain') {
            const hostname = window.location.hostname;
            if (!hostname) {
                friendlyMessage = "SUNUCU HATASI: Alan adı bulunamadı. Uygulamayı 'file://' yerine bir sunucu (http://localhost) üzerinden açmalısınız.";
            } else {
                friendlyMessage = `Yetkisiz Alan Adı: "${hostname}" adresini Firebase Console > Auth > Settings > Authorized Domains kısmına eklemelisiniz.`;
            }
        } else if (error.code === 'auth/operation-not-allowed') {
            friendlyMessage = "Google Girişi aktif değil. Firebase Console > Sign-in method kısmından Google'ı açın.";
        } else if (error.code === 'auth/invalid-api-key') {
            friendlyMessage = "API Anahtarı geçersiz. utils/firebase.ts dosyasını kontrol edin.";
        }

        setErrorMsg(friendlyMessage);
        setIsLoading(false); // Stop loading to show error and allow Manual/Demo entry
    }
  };

  const handleMockLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      const mockUser: User = {
        id: '101',
        name: 'Demo Scholar',
        email: 'demo@neurally.co',
        avatar: 'https://ui-avatars.com/api/?name=Demo+Scholar&background=000000&color=fff',
        tier: 'Free'
      };
      setIsLoading(false);
      onLogin(mockUser);
      console.warn("Demo moduna geçildi.");
    }, 800);
  };

  return (
    <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="min-h-screen w-full flex flex-col items-center justify-center bg-black relative overflow-hidden cursor-crosshair selection:bg-white selection:text-black"
    >
      
      {/* 1. Base Layer: Ambient Flow */}
      <div className="opacity-40">
        <BackgroundFlow />
      </div>

      {/* 2. Grid Layer: Static Dim Grid */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
            backgroundImage: `linear-gradient(to right, #222 1px, transparent 1px), linear-gradient(to bottom, #222 1px, transparent 1px)`,
            backgroundSize: '4rem 4rem',
            maskImage: 'linear-gradient(to bottom, transparent, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black, transparent)'
        }}
      />

      {/* 3. Interactive Layer: Glowing White Grid (Revealed by Mouse) */}
      <div 
        className="absolute inset-0 z-1 pointer-events-none"
        style={{
            backgroundImage: `linear-gradient(to right, #FFF 1px, transparent 1px), linear-gradient(to bottom, #FFF 1px, transparent 1px)`,
            backgroundSize: '4rem 4rem',
            maskImage: `radial-gradient(300px circle at var(--x) var(--y), black, transparent)`,
            WebkitMaskImage: `radial-gradient(300px circle at var(--x) var(--y), black, transparent)`,
        }}
      />

      {/* 4. Flashing Data Streams */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
         {[...Array(3)].map((_, i) => (
             <motion.div
                key={i}
                className="absolute top-0 w-px bg-white/50 h-full blur-[1px]"
                initial={{ left: `${Math.random() * 100}%`, opacity: 0 }}
                animate={{ 
                    opacity: [0, 1, 0],
                    left: [`${Math.random() * 100}%`, `${Math.random() * 100}%`] 
                }}
                transition={{
                    duration: 0.2,
                    repeat: Infinity,
                    repeatDelay: Math.random() * 5 + 2,
                    ease: "linear"
                }}
             />
         ))}
         <motion.div 
            className="absolute left-0 w-full h-px bg-white/30 blur-[2px] shadow-[0_0_10px_white]"
            animate={{ top: ['0%', '100%'] }}
            transition={{ duration: 8, ease: "linear", repeat: Infinity }}
         />
      </div>

      {/* 5. Hypnotic Center */}
      <motion.div style={{ x: moveXReverse, y: moveYReverse }} className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
         <div className="w-[600px] h-[600px] border border-white/20 rounded-full animate-[spin_60s_linear_infinite]"></div>
         <div className="absolute w-[450px] h-[450px] border border-white/20 rounded-full animate-[spin_40s_linear_infinite_reverse]"></div>
      </motion.div>

      {/* MAIN CONTENT */}
      <motion.div 
        style={{ x: moveX, y: moveY }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="z-10 flex flex-col items-center max-w-xl w-full px-6 relative"
      >
        {/* Logo Section */}
        <div className="mb-12 text-center mix-blend-difference">
            <motion.div 
               initial={{ y: 20, opacity: 0, filter: "blur(10px)" }}
               animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
               transition={{ duration: 1, delay: 0.2 }}
               className="relative inline-block group"
            >
              <h1 className="font-serif text-8xl md:text-9xl font-medium text-white leading-[0.8] tracking-tighter select-none">
                Neurally
              </h1>
              <div className="absolute inset-0 text-white opacity-0 group-hover:opacity-100 animate-pulse mix-blend-overlay blur-[2px] pointer-events-none">
                 Neurally
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.8, duration: 1.5, ease: "circOut" }}
              className="h-px bg-white/50 mt-8 mb-6 mx-auto"
            />

            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 1.2 }}
               className="flex justify-between items-center w-full px-1 text-white/60"
            >
               <span className="font-mono text-xs uppercase tracking-widest">System v2.5</span>
               <span className="font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-2 text-white">
                 <ScanLine className="w-3 h-3 animate-pulse" /> Awaiting Auth
               </span>
            </motion.div>
        </div>

        {/* Action Section */}
        <div className="w-full max-w-xs space-y-4">
           {errorMsg && (
               <motion.div 
                 initial={{ opacity: 0, y: -10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="text-red-400 bg-red-900/40 border border-red-500/30 p-4 rounded font-mono text-[10px] text-center mb-4 flex flex-col items-center justify-center gap-2 backdrop-blur-sm"
               >
                   <div className="flex items-center gap-2 font-bold text-red-300"><AlertCircle className="w-4 h-4" /> BAĞLANTI HATASI</div>
                   <span className="text-white/90 leading-relaxed">{errorMsg}</span>
                   
                   {/* Manual Override Button when Error Occurs */}
                   <button 
                     onClick={handleMockLogin}
                     className="mt-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded flex items-center gap-2 transition-all"
                   >
                     <PlayCircle className="w-3 h-3" />
                     DEMO MODUNDA DEVAM ET
                   </button>
               </motion.div>
           )}

           <motion.button
             whileHover={{ scale: 1.02 }}
             whileTap={{ scale: 0.98 }}
             onClick={handleGoogleLogin}
             disabled={isLoading}
             className="group relative w-full bg-white text-black h-16 flex items-center justify-center gap-3 overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.4)]"
           >
             {isLoading ? (
                <div className="flex items-center gap-2 font-mono text-xs animate-pulse">
                   <div className="w-2 h-2 bg-black rounded-full"></div>
                   CONNECTING...
                </div>
             ) : (
                <>
                  <div className="absolute inset-0 bg-black translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                  
                  {/* Google Icon SVG */}
                  <svg className="w-4 h-4 relative z-10 group-hover:fill-white transition-colors" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                  </svg>
                  
                  <span className="relative z-10 font-mono text-xs tracking-[0.2em] uppercase font-bold group-hover:text-white transition-colors">
                    Continue with Google
                  </span>
                  <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 group-hover:text-white transition-all" />
                </>
             )}
             
             <div className="absolute top-0 left-[-100%] w-[20%] h-full bg-black/10 skew-x-12 group-hover:animate-[marquee_1s_linear_infinite]"></div>
           </motion.button>
           
           <p className="text-[10px] text-white/30 text-center font-mono">
               By accessing Neurally, you agree to the <br/> Cognitive Enhancement Protocol.
           </p>
        </div>

        {/* Footer Info */}
        <motion.div 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 2 }}
           className="absolute bottom-[-80px] text-[10px] font-mono text-white/30 uppercase tracking-widest flex gap-8"
        >
           <span>Secure Encrypted Auth</span>
           <span>Firebase Provider</span>
           <span>Node: EU-West</span>
        </motion.div>

      </motion.div>
    </div>
  );
}
