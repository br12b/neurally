
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
import { auth, db } from './utils/firebase';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('tr');

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

  // --- FIREBASE AUTH & REAL-TIME DATABASE LISTENER ---
  useEffect(() => {
    let unsubscribeFirestore: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 1. OPTIMISTIC UI: Google'dan gelen verilerle kullanıcıyı HEMEN içeri al.
        const optimisticUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || (firebaseUser.email?.split('@')[0] || "Scholar"),
            email: firebaseUser.email || "No Email",
            avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.email || 'User'}&background=000000&color=fff`,
            tier: 'Free',
            stats: generateDefaultStats()
        };

        setUser(optimisticUser);
        setIsLoading(false);

        // 2. BACKGROUND SYNC (User Data & Flashcards)
        const userDocRef = doc(db, "users", firebaseUser.uid);

        unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const dbData = docSnap.data();
                
                // Sync User Stats
                setUser((prev) => ({
                    ...prev!,
                    ...dbData, 
                    email: firebaseUser.email || dbData.email,
                    avatar: firebaseUser.photoURL || dbData.avatar
                }));

                // Sync Flashcards
                if (dbData.flashcards && Array.isArray(dbData.flashcards)) {
                    setFlashcards(dbData.flashcards);
                }
            } else {
                // Create user document if it doesn't exist (merge to be safe)
                setDoc(userDocRef, optimisticUser, { merge: true }).catch(err => console.error("Auto-create failed", err));
            }
        }, (error) => {
            console.error("Real-time Sync Error (Silent):", error);
        });

      } else {
        setUser(null);
        setIsLoading(false);
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
          await updateDoc(userDocRef, { stats: newStats });
      } catch (error) {
          console.error("XP Sync Error", error);
      }
  };

  const handleQuestionsGenerated = (newQuestions: Question[]) => {
    setQuestions(newQuestions);
    setActiveView('quiz');
  };

  // --- FLASHCARD CLOUD SYNC ---
  const handleAddFlashcard = async (card: Flashcard) => {
    // 1. Optimistic Update (Instant UI)
    setFlashcards(prev => [card, ...prev]);

    // 2. Background Sync
    if (user) {
        try {
            const userDocRef = doc(db, "users", user.id);
            // Use setDoc with merge instead of updateDoc to safeguard against missing doc/field
            // arrayUnion ensures we add to list without duplicating if somehow sent twice
            await setDoc(userDocRef, {
                flashcards: arrayUnion(card)
            }, { merge: true });
        } catch (error) {
            console.error("Flashcard Save Failed:", error);
        }
    }
  };

  const handleDeleteFlashcard = async (cardId: number) => {
      const cardToDelete = flashcards.find(c => c.id === cardId);
      if (!cardToDelete) return;

      // 1. Optimistic Update
      setFlashcards(prev => prev.filter(c => c.id !== cardId));

      // 2. Background Sync
      if (user) {
          try {
              const userDocRef = doc(db, "users", user.id);
              await updateDoc(userDocRef, {
                  flashcards: arrayRemove(cardToDelete)
              });
          } catch (error) {
              console.error("Flashcard Delete Failed:", error);
          }
      }
  };

  const handleManualLogin = (userData: User) => {
    if(!userData.stats) userData.stats = generateDefaultStats();
    setUser(userData);
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (error) {}
    setUser(null);
    setActiveView('dashboard');
  };

  if (isLoading) return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono text-xs">
          <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>CONNECTING TO NEURAL DATABASE...</span>
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
      
      {/* MOBILE OPTIMIZATION: Use dvh (dynamic viewport height) and add bottom padding for mobile nav */}
      <main className={`flex-1 relative h-[calc(100dvh-80px)] md:h-screen z-10 ${isImmersiveView ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar pb-24 md:pb-0'}`}>
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
