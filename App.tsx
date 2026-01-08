
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MobileNavigation from './components/MobileNavigation';
import Dashboard from './components/Dashboard';
import NeurallyQuiz from './components/NeurallyQuiz';
import Pomodoro from './components/Pomodoro';
import SmartNotes from './components/SmartNotes';
import Flashcards from './components/Flashcards';
import LoginScreen from './components/LoginScreen';
import Report from './components/Report';
import About from './components/About';
import Schedule from './components/Schedule'; 
import KeyPoints from './components/KeyPoints'; 
import SpeedRun from './components/SpeedRun';
import NeuroMap from './components/NeuroMap';
import NeuralPodcast from './components/NeuralPodcast';
import EduClassroom from './components/EduClassroom';
import LanguagePath from './components/LanguagePath';
import BackgroundFlow from './components/BackgroundFlow'; 
import { AppView, Question, User, Language, Flashcard, UserStats } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, updateDoc, onSnapshot, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore'; 
import { auth, db, sanitizeForFirestore } from './utils/firebase';
import { AlertTriangle } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('tr');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  
  // New Error State for Database Setup Issues
  const [dbError, setDbError] = useState<string | null>(null);

  // Default Stats Generator
  const generateDefaultStats = (): UserStats => ({
      level: 1,
      currentXP: 0,
      nextLevelXP: 500,
      streakDays: 1,
      totalFocusMinutes: 0,
      rankTitle: "Neural Initiate",
      badges: [
          { id: 'b1', name: 'First Link', description: 'Created first account', icon: 'zap', isLocked: false, unlockedAt: new Date().toISOString() },
          { id: 'b2', name: 'Deep Diver', description: 'Complete 5 Focus Sessions', icon: 'clock', isLocked: true },
          { id: 'b3', name: 'Polyglot', description: 'Unlock Language Module', icon: 'globe', isLocked: true },
          { id: 'b4', name: 'Architect', description: 'Reach Level 10', icon: 'crown', isLocked: true },
      ],
      dailyQuests: [
          { id: 'q1', title: 'Complete 1 Quiz', target: 1, current: 0, xpReward: 50, completed: false, type: 'quiz' },
          { id: 'q2', title: 'Review 10 Flashcards', target: 10, current: 0, xpReward: 30, completed: false, type: 'flashcard' },
          { id: 'q3', title: '25m Focus Session', target: 25, current: 0, xpReward: 100, completed: false, type: 'focus' },
      ]
  });

  // --- MOBILE OAUTH CALLBACK HANDLER ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isMobile = urlParams.get('mobile') === 'true';
    const callbackUrl = urlParams.get('callback');
    
    if (isMobile && callbackUrl) {
      console.log('Mobile OAuth flow detected, callback URL:', callbackUrl);
      
      // Listen for successful auth specifically for mobile redirect
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          console.log('User authenticated, preparing mobile redirect...');
          
          try {
            // Get ID token
            const idToken = await firebaseUser.getIdToken();
            
            // Redirect back to mobile app with token
            // The mobile app should listen for this deep link
            const redirectUrl = `${callbackUrl}?token=${idToken}`;
            console.log('Redirecting to:', redirectUrl);
            
            window.location.href = redirectUrl;
          } catch (error) {
            console.error('Failed to get ID token for mobile redirect:', error);
          }
        }
      });
      return () => unsubscribe();
    }
  }, []);

  // --- FIREBASE AUTH & REAL-TIME DATABASE LISTENER ---
  useEffect(() => {
    let unsubscribeFirestore: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // If we are in the middle of a mobile auth flow, we might not want to fully load the app UI 
      // but just wait for the redirect. However, loading it doesn't hurt.
      
      if (firebaseUser) {
        setSyncStatus('syncing');
        setDbError(null);
        
        // 1. Initial User Setup (Skeleton)
        const initialUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || (firebaseUser.email?.split('@')[0] || "Scholar"),
            email: firebaseUser.email || "No Email",
            avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.email || 'User'}&background=000000&color=fff`,
            tier: 'Free',
            stats: generateDefaultStats()
        };

        // 2. BACKGROUND SYNC (User Data & Flashcards)
        const userDocRef = doc(db, "users", firebaseUser.uid);

        unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const dbData = docSnap.data();
                
                // FORCE SYNC: Always prefer DB data over local state
                setUser((prev) => ({
                    ...initialUser,
                    ...dbData, // This overwrites local with cloud
                    email: firebaseUser.email || dbData.email,
                    avatar: firebaseUser.photoURL || dbData.avatar
                }));

                // Flashcards Sync
                if (dbData.flashcards && Array.isArray(dbData.flashcards)) {
                    setFlashcards(dbData.flashcards);
                } else {
                    setFlashcards([]);
                }
                
                setSyncStatus('synced');
                setIsLoading(false);
            } else {
                // New User: Create Doc
                setDoc(userDocRef, sanitizeForFirestore(initialUser), { merge: true })
                    .then(() => {
                        setUser(initialUser);
                        setSyncStatus('synced');
                        setIsLoading(false);
                    })
                    .catch(err => {
                        console.error("Auto-create failed", err);
                        // Check for common permission error
                        if (err.code === 'permission-denied') {
                            setDbError("Erişim Reddedildi: Lütfen Firebase Konsol'da 'Firestore Database' oluşturduğunuzdan ve Kuralları (Rules) test moduna aldığınızdan emin olun.");
                        } else {
                            setDbError(`Veritabanı Hatası: ${err.message}`);
                        }
                        setSyncStatus('error');
                    });
            }
        }, (error) => {
            console.error("Real-time Sync Error:", error);
            if (error.code === 'permission-denied') {
                setDbError("İZİN HATASI: Firebase Konsol -> Firestore Database -> Rules sekmesinden kuralları 'Test Mode' olarak ayarlayın veya veritabanını oluşturun.");
            } else if (error.code === 'unavailable') {
                setDbError("BAĞLANTI HATASI: İnternet bağlantınızı kontrol edin veya Firebase servisi kapalı.");
            } else {
                setDbError(`Sync Error: ${error.message}`);
            }
            setSyncStatus('error');
            setIsLoading(false);
        });

      } else {
        setUser(null);
        setFlashcards([]);
        setIsLoading(false);
        setSyncStatus('idle');
        if (unsubscribeFirestore) unsubscribeFirestore();
      }
    });

    return () => {
        unsubscribeAuth();
        if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  const handleAddXP = async (amount: number) => {
      if (!user || !user.stats) return;
      
      const newXP = user.stats.currentXP + amount;
      let newLevel = user.stats.level;
      let nextXP = user.stats.nextLevelXP;
      
      if (newXP >= nextXP) {
          newLevel += 1;
          nextXP = Math.floor(nextXP * 1.5);
      }
      
      const newStats = { ...user.stats, currentXP: newXP, level: newLevel, nextLevelXP: nextXP };
      
      setUser(prev => prev ? { ...prev, stats: newStats } : null);

      try {
          const userDocRef = doc(db, "users", user.id);
          await updateDoc(userDocRef, { stats: sanitizeForFirestore(newStats) });
      } catch (error) {
          console.error("XP Sync Error", error);
      }
  };

  const handleQuestionsGenerated = (newQuestions: Question[]) => {
    setQuestions(newQuestions);
    setActiveView('quiz');
  };

  // --- FLASHCARD CLOUD SYNC (Direct Write) ---
  const handleAddFlashcard = async (card: Flashcard) => {
    if (!user) return;
    setSyncStatus('syncing');

    try {
        const userDocRef = doc(db, "users", user.id);
        
        // FİX: Global sanitizer kullanımı. Artık veri hatası yok.
        await setDoc(userDocRef, {
            flashcards: arrayUnion(sanitizeForFirestore(card))
        }, { merge: true });
        
    } catch (error: any) {
        console.error("Flashcard Save Failed:", error);
        setSyncStatus('error');
        alert(`Bulut hatası: Kart kaydedilemedi. (${error.message})`);
    }
  };

  const handleDeleteFlashcard = async (cardId: number) => {
      if (!user) return;
      const cardToDelete = flashcards.find(c => c.id === cardId);
      if (!cardToDelete) return;
      
      setSyncStatus('syncing');

      try {
          const userDocRef = doc(db, "users", user.id);
          await updateDoc(userDocRef, {
              flashcards: arrayRemove(cardToDelete)
          });
      } catch (error) {
          console.error("Flashcard Delete Failed:", error);
          setSyncStatus('error');
      }
  };

  const handleManualLogin = (userData: User) => {
    if(!userData.stats) userData.stats = generateDefaultStats();
    setUser(userData);
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (error) {}
    setUser(null);
    setFlashcards([]);
    setActiveView('dashboard');
  };

  // --- CRITICAL ERROR SCREEN ---
  if (dbError) {
      return (
          <div className="min-h-screen bg-red-50 flex items-center justify-center p-8">
              <div className="max-w-md bg-white p-8 rounded-2xl shadow-xl border border-red-100 text-center">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-serif text-red-900 mb-4">Veritabanı Bağlantı Hatası</h2>
                  <p className="text-red-700 text-sm mb-6 leading-relaxed">
                      {dbError}
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg text-left text-xs text-gray-600 space-y-2 font-mono">
                      <p>1. Firebase Konsol'a gidin.</p>
                      <p>2. Sol menüden <strong>Build {'>'} Firestore Database</strong> seçin.</p>
                      <p>3. <strong>Create Database</strong> butonuna basın.</p>
                      <p>4. Mutlaka <strong>Start in Test Mode</strong> seçeneğini işaretleyin.</p>
                  </div>
                  <button 
                    onClick={() => window.location.reload()}
                    className="mt-8 w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
                  >
                      Sayfayı Yenile
                  </button>
              </div>
          </div>
      )
  }

  if (isLoading) return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono text-xs">
          <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>CONNECTING TO NEURAL CLOUD...</span>
          </div>
      </div>
  );

  if (!user) {
    return <LoginScreen onLogin={handleManualLogin} />;
  }

  const isImmersiveView = activeView === 'speedrun';

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] text-ink-900 selection:bg-black selection:text-white overflow-hidden font-sans bg-transparent relative">
      
      {!isImmersiveView && <BackgroundFlow />}

      {activeView !== 'speedrun' && (
        <Sidebar 
          activeView={activeView} 
          onChangeView={setActiveView} 
          user={user}
          onLogout={handleLogout}
          language={language}
          setLanguage={setLanguage}
        />
      )}

      {activeView !== 'speedrun' && (
        <MobileNavigation 
          activeView={activeView}
          onChangeView={setActiveView}
          user={user}
          onLogout={handleLogout}
        />
      )}
      
      <main className={`flex-1 relative h-[calc(100dvh-80px)] md:h-screen z-10 ${isImmersiveView ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar pb-24 md:pb-0'}`}>
        
        {/* SYNC INDICATOR (Top Right) */}
        {!isImmersiveView && (
            <div className="absolute top-4 right-4 md:right-8 z-50 pointer-events-none">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white/80 backdrop-blur shadow-sm transition-all ${
                    syncStatus === 'synced' ? 'border-green-200 text-green-700' : 
                    syncStatus === 'syncing' ? 'border-blue-200 text-blue-700' : 
                    'border-gray-200 text-gray-400'
                }`}>
                    <div className={`w-2 h-2 rounded-full ${
                        syncStatus === 'synced' ? 'bg-green-500' : 
                        syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' : 
                        'bg-gray-300'
                    }`} />
                    <span className="text-[9px] font-bold uppercase tracking-widest">
                        {syncStatus === 'synced' ? 'CLOUD LINKED' : syncStatus === 'syncing' ? 'SYNCING...' : 'OFFLINE'}
                    </span>
                </div>
            </div>
        )}

        <div className={`relative z-10 mx-auto ${isImmersiveView ? 'w-full h-full' : 'min-h-full max-w-[1600px]'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} 
              className="h-full"
            >
              {activeView === 'dashboard' && <Dashboard user={user} onQuestionsGenerated={handleQuestionsGenerated} language={language} />}
              {activeView === 'neurallist' && <NeuroMap language={language} user={user} />}
              {activeView === 'quiz' && <NeurallyQuiz key={questions[0]?.id || 'quiz'} questions={questions} onRedirectToDashboard={() => setActiveView('dashboard')} onAddToFlashcards={handleAddFlashcard} />}
              {activeView === 'speedrun' && <SpeedRun language={language} user={user} onExit={() => setActiveView('dashboard')} />}
              {activeView === 'flashcards' && <Flashcards cards={flashcards} onAddCard={handleAddFlashcard} onDeleteCard={handleDeleteFlashcard} />}
              {activeView === 'schedule' && <Schedule language={language} user={user} />}
              {activeView === 'keypoints' && <KeyPoints language={language} />}
              {activeView === 'podcast' && <NeuralPodcast language={language} />}
              {activeView === 'edu' && <EduClassroom language={language} user={user} />}
              {activeView === 'language' && <LanguagePath language={language} onAddXP={handleAddXP} />}
              {activeView === 'pomodoro' && <Pomodoro />}
              {activeView === 'notes' && <SmartNotes user={user} />}
              {activeView === 'report' && <Report user={user} language={language} />}
              {activeView === 'about' && <About language={language} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;
