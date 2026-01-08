
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
import { auth } from './utils/firebase';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Flashcards state
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('tr');

  // Helper to generate default stats for new users
  const generateDefaultStats = (): UserStats => ({
      level: 1,
      currentXP: 120,
      nextLevelXP: 500,
      streakDays: 3,
      totalFocusMinutes: 45,
      rankTitle: "Neural Initiate",
      badges: [
          { id: 'b1', name: 'First Link', description: 'Created first account', icon: 'zap', isLocked: false, unlockedAt: new Date().toISOString() },
          { id: 'b2', name: 'Deep Diver', description: 'Complete 5 Focus Sessions', icon: 'clock', isLocked: true },
          { id: 'b3', name: 'Polyglot', description: 'Unlock Language Module', icon: 'globe', isLocked: true },
          { id: 'b4', name: 'Architect', description: 'Reach Level 10', icon: 'crown', isLocked: true },
      ],
      dailyQuests: [
          { id: 'q1', title: 'Complete 1 Quiz', target: 1, current: 0, xpReward: 50, completed: false, type: 'quiz' },
          { id: 'q2', title: 'Review 10 Flashcards', target: 10, current: 4, xpReward: 30, completed: false, type: 'flashcard' },
          { id: 'q3', title: '25m Focus Session', target: 25, current: 15, xpReward: 100, completed: false, type: 'focus' },
      ]
  });

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // CRITICAL FIX: Check if we are in the middle of a Mobile Redirect Flow
      const isMobileAuthPending = sessionStorage.getItem('neurally_mobile_auth') === 'true';

      if (firebaseUser) {
        // If mobile auth is pending, DO NOT set the user yet.
        // Keep rendering LoginScreen so it can process getRedirectResult and Deep Link.
        if (isMobileAuthPending) {
            console.log("App: Mobile Auth Pending - Holding Dashboard render to allow Redirect processing.");
            setIsLoading(false);
            return; 
        }

        // Retrieve stats from local storage if available to persist game state
        const localStatsKey = `neurally_stats_${firebaseUser.uid}`;
        const savedStats = localStorage.getItem(localStatsKey);
        const stats = savedStats ? JSON.parse(savedStats) : generateDefaultStats();

        const appUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || "Anonymous Scholar",
            email: firebaseUser.email || "No Email",
            avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.displayName || 'U'}&background=000000&color=fff`,
            tier: 'Scholar',
            stats: stats
        };
        setUser(appUser);
      } else {
        const storedUser = localStorage.getItem('neurally_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (!parsedUser.stats) parsedUser.stats = generateDefaultStats();
          setUser(parsedUser);
        } else {
          setUser(null);
          setFlashcards([]); 
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync Stats to LocalStorage whenever user changes
  useEffect(() => {
      if (user && user.stats) {
          const localStatsKey = `neurally_stats_${user.id}`;
          localStorage.setItem(localStatsKey, JSON.stringify(user.stats));
          localStorage.setItem('neurally_user', JSON.stringify(user));
      }
  }, [user]);

  // LOAD User Flashcards
  useEffect(() => {
    if (user) {
        const key = `neurally_flashcards_${user.id}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                setFlashcards(JSON.parse(saved));
            } catch (e) { console.error("Data Load Error", e); }
        } else {
            setFlashcards([]);
        }
    }
  }, [user]);

  // SAVE User Flashcards
  useEffect(() => {
    if (user && flashcards.length > 0) {
        const key = `neurally_flashcards_${user.id}`;
        localStorage.setItem(key, JSON.stringify(flashcards));
    }
  }, [flashcards, user]);

  const handleQuestionsGenerated = (newQuestions: Question[]) => {
    setQuestions(newQuestions);
    setActiveView('quiz');
  };

  const handleAddFlashcard = (card: Flashcard) => {
    setFlashcards(prev => [card, ...prev]);
  };

  // --- GAMIFICATION HANDLER ---
  const handleAddXP = (amount: number) => {
      if (!user || !user.stats) return;
      
      const newXP = user.stats.currentXP + amount;
      let newLevel = user.stats.level;
      let nextXP = user.stats.nextLevelXP;

      // Simple Level Up Logic
      if (newXP >= nextXP) {
          newLevel += 1;
          nextXP = Math.floor(nextXP * 1.5);
      }

      const updatedUser = {
          ...user,
          stats: {
              ...user.stats,
              currentXP: newXP,
              level: newLevel,
              nextLevelXP: nextXP
          }
      };
      setUser(updatedUser);
  };

  const handleLogin = (userData: User) => {
    // This is called from LoginScreen when NOT in mobile redirect mode
    if(!userData.stats) userData.stats = generateDefaultStats();
    setUser(userData);
    localStorage.setItem('neurally_user', JSON.stringify(userData));
  };

  const handleLogout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error:", error);
    }
    setUser(null);
    localStorage.removeItem('neurally_user');
    setActiveView('dashboard');
  };

  if (isLoading) return null;

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Views that need full screen or dark mode specifically
  const isImmersiveView = activeView === 'speedrun';

  return (
    <div className="flex flex-col md:flex-row min-h-screen text-ink-900 selection:bg-black selection:text-white overflow-hidden font-sans bg-transparent relative">
      
      {/* Global Ambient Background - Hide in immersive modes for performance/aesthetic */}
      {!isImmersiveView && <BackgroundFlow />}

      {/* DESKTOP SIDEBAR */}
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

      {/* MOBILE NAVIGATION (Only visible on small screens) */}
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
              {activeView === 'dashboard' && (
                <Dashboard 
                  user={user} 
                  onQuestionsGenerated={handleQuestionsGenerated}
                  language={language}
                />
              )}
              {activeView === 'neurallist' && (
                <NeuroMap language={language} user={user} />
              )}
              {activeView === 'quiz' && (
                <NeurallyQuiz 
                  key={questions[0]?.id || 'quiz'} 
                  questions={questions} 
                  onRedirectToDashboard={() => setActiveView('dashboard')}
                  onAddToFlashcards={handleAddFlashcard}
                />
              )}
              {activeView === 'speedrun' && (
                <SpeedRun 
                    language={language} 
                    user={user} 
                    onExit={() => setActiveView('dashboard')} 
                />
              )}
              {activeView === 'flashcards' && (
                <Flashcards 
                  cards={flashcards} 
                  onAddCard={handleAddFlashcard}
                />
              )}
              {activeView === 'schedule' && (
                <Schedule language={language} user={user} />
              )}
              {activeView === 'keypoints' && (
                <KeyPoints language={language} />
              )}
              {activeView === 'podcast' && (
                <NeuralPodcast language={language} />
              )}
              {activeView === 'edu' && (
                <EduClassroom language={language} user={user} />
              )}
              {activeView === 'language' && (
                <LanguagePath 
                    language={language} 
                    onAddXP={handleAddXP} // PASSING XP HANDLER
                />
              )}
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
