
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
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'; // Firestore imports
import { auth, db } from './utils/firebase'; // Added db import

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

  // --- FIREBASE AUTH & DATABASE LISTENER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
            // 1. Check if user exists in Firestore Database
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userSnap = await getDoc(userDocRef);

            if (userSnap.exists()) {
                // 2a. User exists in DB -> Load their data
                const userData = userSnap.data() as User;
                // Merge with latest auth info (e.g. if photo changed)
                const updatedUser = {
                    ...userData,
                    email: firebaseUser.email || userData.email,
                    avatar: firebaseUser.photoURL || userData.avatar
                };
                setUser(updatedUser);
            } else {
                // 2b. New User -> Create record in DB
                const newUser: User = {
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || (firebaseUser.email?.split('@')[0] || "Scholar"),
                    email: firebaseUser.email || "No Email",
                    avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.email || 'User'}&background=000000&color=fff`,
                    tier: 'Free',
                    stats: generateDefaultStats()
                };
                
                // Write to Firestore
                await setDoc(userDocRef, newUser);
                setUser(newUser);
            }
        } catch (error) {
            console.error("Database Sync Error:", error);
            // Fallback for offline/demo if DB fails
            setUser({
                id: firebaseUser.uid,
                name: firebaseUser.displayName || "Offline User",
                email: firebaseUser.email || "",
                avatar: firebaseUser.photoURL || "",
                tier: 'Free',
                stats: generateDefaultStats()
            });
        }
      } else {
        // Not logged in
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- REAL-TIME XP SYNC ---
  // When XP changes locally, sync it to Firestore debounced
  useEffect(() => {
      if (user && user.id) {
          const timeout = setTimeout(() => {
              const userDocRef = doc(db, "users", user.id);
              // We only update stats to save bandwidth, not the whole user object constantly
              updateDoc(userDocRef, { stats: user.stats }).catch(e => console.log("Sync skip", e));
          }, 2000); // 2 second debounce
          return () => clearTimeout(timeout);
      }
  }, [user]);

  // Data Handlers
  const handleQuestionsGenerated = (newQuestions: Question[]) => {
    setQuestions(newQuestions);
    setActiveView('quiz');
  };

  const handleAddFlashcard = (card: Flashcard) => {
    setFlashcards(prev => [card, ...prev]);
  };

  const handleAddXP = (amount: number) => {
      if (!user || !user.stats) return;
      const newXP = user.stats.currentXP + amount;
      let newLevel = user.stats.level;
      let nextXP = user.stats.nextLevelXP;
      
      // Level Up Logic
      if (newXP >= nextXP) {
          newLevel += 1;
          nextXP = Math.floor(nextXP * 1.5);
      }
      
      const updatedUser = {
          ...user,
          stats: { ...user.stats, currentXP: newXP, level: newLevel, nextLevelXP: nextXP }
      };
      setUser(updatedUser);
  };

  // Manual Login Handler (Used by Demo Button)
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
    <div className="flex flex-col md:flex-row min-h-screen text-ink-900 selection:bg-black selection:text-white overflow-hidden font-sans bg-transparent relative">
      
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
      
      <main className={`flex-1 relative h-[calc(100vh-80px)] md:h-screen z-10 ${isImmersiveView ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
        <div className={`relative z-10 mx-auto ${isImmersiveView ? 'w-full h-full' : 'min-h-screen max-w-[1600px]'}`}>
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
              {activeView === 'flashcards' && <Flashcards cards={flashcards} onAddCard={handleAddFlashcard} />}
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
