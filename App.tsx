import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
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
import TheConstruct from './components/TheConstruct'; 
import BackgroundFlow from './components/BackgroundFlow'; 
import AdminPanel from './components/AdminPanel';
import { AppView, Question, User, Language, Flashcard } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './utils/firebase';

// --- SECURITY CONFIGURATION ---
// Kendi e-posta adresini buraya ekle. Sadece bu listedekiler Admin panelini görebilir.
const ADMIN_EMAILS = [
    "emrebe12b@gmail.com",
    "admin@neurally.co",
    "demo@neurally.co"
];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Flashcards state
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('tr');

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // SECURITY CHECK: Is this user in the allowed admin list?
        const isAdmin = firebaseUser.email ? ADMIN_EMAILS.includes(firebaseUser.email) : false;

        const appUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || "Anonymous Scholar",
            email: firebaseUser.email || "No Email",
            avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.displayName || 'U'}&background=000000&color=fff`,
            tier: 'Scholar',
            isAdmin: isAdmin
        };
        setUser(appUser);
      } else {
        const storedUser = localStorage.getItem('neurally_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // Re-verify admin status on load just in case
          parsedUser.isAdmin = parsedUser.email ? ADMIN_EMAILS.includes(parsedUser.email) : false;
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

  // LOAD User Data when User changes
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

  // SAVE User Data
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

  const handleLogin = (userData: User) => {
    // Check admin status for manual login (Demo mode)
    userData.isAdmin = userData.email ? ADMIN_EMAILS.includes(userData.email) : false;
    
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
  
  // ADMIN: Upgrade User Function
  const handleUpdateUserTier = (tier: 'Free' | 'Scholar' | 'Fellow') => {
      if (user) {
          setUser({ ...user, tier });
      }
  };

  if (isLoading) return null;

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Views that need full screen or dark mode specifically
  const isImmersiveView = activeView === 'speedrun' || activeView === 'construct' || activeView === 'admin';

  return (
    <div className="flex min-h-screen text-ink-900 selection:bg-black selection:text-white overflow-hidden font-sans bg-transparent relative">
      
      {/* Global Ambient Background - Hide in immersive modes for performance/aesthetic */}
      {!isImmersiveView && <BackgroundFlow />}

      {/* SIDEBAR: Only show if NOT in SpeedRun mode */}
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
      
      <main className={`flex-1 relative h-screen z-10 ${isImmersiveView ? 'overflow-hidden' : 'overflow-y-auto'}`}>
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
              {activeView === 'construct' && (
                <TheConstruct language={language} user={user} />
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
              {activeView === 'pomodoro' && <Pomodoro />}
              {activeView === 'notes' && <SmartNotes user={user} />}
              {activeView === 'report' && <Report user={user} language={language} />}
              {activeView === 'about' && <About language={language} />}
              
              {/* ADMIN PANEL ROUTE - Protected */}
              {activeView === 'admin' && user.isAdmin && (
                  <AdminPanel user={user} updateUserTier={handleUpdateUserTier} />
              )}
              {/* Fallback if non-admin tries to access */}
              {activeView === 'admin' && !user.isAdmin && (
                  <Dashboard 
                    user={user} 
                    onQuestionsGenerated={handleQuestionsGenerated}
                    language={language}
                  />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;