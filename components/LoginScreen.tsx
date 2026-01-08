
import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { ScanLine, AlertCircle, PlayCircle, Mail, Key, ChevronLeft, UserPlus, LogIn } from 'lucide-react';
import { User } from '../types';
import BackgroundFlow from './BackgroundFlow';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../utils/firebase';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

type AuthMode = 'selection' | 'email';

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>('selection');
  
  // Email Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // --- PHYSICS ENGINE ---
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 500, damping: 50 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 500, damping: 50 });
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

  // --- 1. GOOGLE LOGIN ---
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
        console.error("Google Auth Error:", error);
        setErrorMsg("Google bağlantısı başarısız. Lütfen 'E-Posta' yöntemini deneyin.");
        setIsLoading(false);
    }
  };

  // --- 2. EMAIL/PASSWORD LOGIN & REGISTER ---
  const handleEmailAuth = async () => {
      if (!email || !password) {
          setErrorMsg("Lütfen e-posta ve şifre girin.");
          return;
      }
      if (password.length < 6) {
          setErrorMsg("Şifre en az 6 karakter olmalıdır.");
          return;
      }

      setIsLoading(true);
      setErrorMsg(null);

      try {
          if (isRegistering) {
              await createUserWithEmailAndPassword(auth, email, password);
          } else {
              await signInWithEmailAndPassword(auth, email, password);
          }
      } catch (error: any) {
          console.error("Email Auth Error:", error);
          let msg = "İşlem başarısız.";
          
          if (error.code) {
            switch (error.code) {
                case 'auth/email-already-in-use':
                    msg = "Bu e-posta zaten kullanımda. Giriş yapmayı deneyin.";
                    break;
                case 'auth/invalid-email':
                    msg = "Geçersiz e-posta formatı.";
                    break;
                case 'auth/operation-not-allowed':
                    msg = "Sistem Hatası: E-posta/Şifre girişi Firebase panelinden aktif edilmemiş.";
                    break;
                case 'auth/weak-password':
                    msg = "Şifre çok zayıf. Daha güçlü bir şifre seçin.";
                    break;
                case 'auth/user-disabled':
                    msg = "Bu hesap devre dışı bırakılmış.";
                    break;
                case 'auth/user-not-found':
                    msg = "Kullanıcı bulunamadı. Lütfen kayıt olun.";
                    break;
                case 'auth/wrong-password':
                    msg = "Hatalı şifre.";
                    break;
                case 'auth/too-many-requests':
                    msg = "Çok fazla deneme yapıldı. Lütfen biraz bekleyin.";
                    break;
                case 'auth/network-request-failed':
                    msg = "Ağ hatası. İnternet bağlantınızı kontrol edin.";
                    break;
                default:
                    msg = `Hata Kodu: ${error.code}`;
            }
          } else {
              msg = `Beklenmedik Hata: ${error.message}`;
          }
          
          setErrorMsg(msg);
          setIsLoading(false);
      }
  };

  // --- 3. DEMO LOGIN ---
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
      onLogin(mockUser);
    }, 800);
  };

  return (
    <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="min-h-screen w-full flex flex-col items-center justify-center bg-black relative overflow-hidden cursor-crosshair selection:bg-white selection:text-black"
    >
      <div className="opacity-40"><BackgroundFlow /></div>

      {/* Grid Layers */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(to right, #222 1px, transparent 1px), linear-gradient(to bottom, #222 1px, transparent 1px)`, backgroundSize: '4rem 4rem', maskImage: 'linear-gradient(to bottom, transparent, black, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black, transparent)' }} />
      <div className="absolute inset-0 z-1 pointer-events-none" style={{ backgroundImage: `linear-gradient(to right, #FFF 1px, transparent 1px), linear-gradient(to bottom, #FFF 1px, transparent 1px)`, backgroundSize: '4rem 4rem', maskImage: `radial-gradient(300px circle at var(--x) var(--y), black, transparent)`, WebkitMaskImage: `radial-gradient(300px circle at var(--x) var(--y), black, transparent)` }} />

      {/* Hypnotic Center */}
      <motion.div style={{ x: moveXReverse, y: moveYReverse }} className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
         <div className="w-[600px] h-[600px] border border-white/20 rounded-full animate-[spin_60s_linear_infinite]"></div>
      </motion.div>

      {/* MAIN CONTENT CONTAINER */}
      <motion.div 
        style={{ x: moveX, y: moveY }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2 }}
        className="z-10 flex flex-col items-center max-w-sm w-full px-6 relative"
      >
        {/* LOGO */}
        <div className="mb-12 text-center mix-blend-difference w-full">
            <motion.h1 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                className="font-serif text-7xl md:text-8xl font-medium text-white tracking-tighter select-none"
            >
                Neurally
            </motion.h1>
            <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} className="h-px bg-white/50 mt-4 mb-4 mx-auto" />
            <div className="flex justify-between text-white/60 font-mono text-xs uppercase tracking-widest px-1">
               <span>Secure Gateway</span>
               <span className="flex items-center gap-2 text-white"><ScanLine className="w-3 h-3 animate-pulse" /> v2.5</span>
            </div>
        </div>

        {/* ERROR BOX */}
        <div className="w-full min-h-[20px] mb-4">
            <AnimatePresence>
                {errorMsg && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="w-full bg-red-900/40 border border-red-500/50 p-3 rounded text-[10px] text-red-200 font-mono text-center flex items-center justify-center gap-2 backdrop-blur-sm"
                >
                    <AlertCircle className="w-3 h-3 flex-shrink-0" /> {errorMsg}
                </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* AUTH FORMS */}
        <div className="w-full relative min-h-[220px]">
            <AnimatePresence mode="wait">
                
                {/* MODE 1: SELECTION */}
                {mode === 'selection' && (
                    <motion.div 
                        key="selection"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        className="w-full space-y-3 absolute top-0 left-0"
                    >
                        {/* Google Button */}
                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="group relative w-full bg-white text-black h-14 flex items-center justify-center gap-3 overflow-hidden transition-all hover:scale-[1.02]"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.033s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>
                            <span className="font-mono text-xs font-bold uppercase tracking-widest">Google ile Giriş</span>
                            {isLoading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><div className="w-4 h-4 border-2 border-black rounded-full animate-spin border-t-transparent"/></div>}
                        </button>

                        {/* Email Button */}
                        <button
                            onClick={() => setMode('email')}
                            className="group w-full bg-transparent border border-white/30 text-white h-14 flex items-center justify-center gap-3 hover:bg-white/10 hover:border-white transition-all"
                        >
                            <Mail className="w-4 h-4" />
                            <span className="font-mono text-xs font-bold uppercase tracking-widest">E-Posta / Şifre</span>
                        </button>

                        {/* Demo Button */}
                        <button onClick={handleMockLogin} className="w-full py-2 text-[10px] text-gray-500 hover:text-white uppercase tracking-widest flex items-center justify-center gap-2">
                            <PlayCircle className="w-3 h-3" /> Sorun mu var? Demo Modu
                        </button>
                    </motion.div>
                )}

                {/* MODE 2: EMAIL FORM */}
                {mode === 'email' && (
                    <motion.div 
                        key="email"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="w-full space-y-4 absolute top-0 left-0"
                    >
                        <div className="space-y-3">
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="E-Posta Adresi"
                                    className="w-full h-14 bg-white/5 border border-white/20 text-white pl-12 pr-4 text-sm font-mono focus:border-white focus:bg-white/10 outline-none placeholder:text-gray-600 transition-colors rounded-none"
                                    autoComplete="email"
                                />
                            </div>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Şifre"
                                    className="w-full h-14 bg-white/5 border border-white/20 text-white pl-12 pr-4 text-sm font-mono focus:border-white focus:bg-white/10 outline-none placeholder:text-gray-600 transition-colors rounded-none"
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleEmailAuth}
                            disabled={isLoading}
                            className={`w-full h-14 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${isRegistering ? 'bg-white text-black hover:bg-gray-200' : 'bg-transparent border border-white text-white hover:bg-white hover:text-black'}`}
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-current rounded-full animate-spin border-t-transparent"/>
                            ) : (
                                isRegistering ? <><UserPlus className="w-4 h-4"/> Kayıt Ol</> : <><LogIn className="w-4 h-4"/> Giriş Yap</>
                            )}
                        </button>

                        <div className="flex justify-between items-center pt-2">
                            <button 
                                onClick={() => { setMode('selection'); setErrorMsg(null); }} 
                                className="text-[10px] text-gray-500 hover:text-white uppercase font-mono tracking-wide flex items-center gap-1 transition-colors"
                            >
                                <ChevronLeft className="w-3 h-3" /> Geri Dön
                            </button>
                            
                            <button 
                                onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(null); }} 
                                className="text-[10px] text-white border-b border-white/30 hover:border-white pb-0.5 uppercase font-mono tracking-wide transition-all"
                            >
                                {isRegistering ? 'Hesabım Var: Giriş Yap' : 'Hesap Yok: Kayıt Ol'}
                            </button>
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>

        <p className="absolute bottom-8 text-[9px] text-white/20 text-center font-mono uppercase tracking-widest">
            Cognitive OS Authentication Layer
        </p>
      </motion.div>
    </div>
  );
}
