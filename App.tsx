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
import BackgroundFlow from './components/BackgroundFlow'; 
import { AppView, Question, User, Language, Flashcard } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './utils/firebase';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('tr');

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const appUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || "Anonymous Scholar",
            email: firebaseUser.email || "No Email",
            avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.displayName || 'U'}&background=000000&color=fff`,
            tier: 'Scholar'
        };
        setUser(appUser);
      } else {
        // User is signed out, check localStorage for fallback/mock sessions
        const storedUser = localStorage.getItem('neurally_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          setUser(null);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleQuestionsGenerated = (newQuestions: Question[]) => {
    setQuestions(newQuestions);
    setActiveView('quiz');
  };

  const handleAddFlashcard = (card: Flashcard) => {
    setFlashcards(prev => [card, ...prev]);
  };

  // Called from LoginScreen if using manual/mock flow, or updated via AuthListener
  const handleLogin = (userData: User) => {
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

  return (
    <div className="flex min-h-screen text-ink-900 selection:bg-black selection:text-white overflow-hidden font-sans bg-transparent">
      
      {/* Global Ambient Background - Hide in SpeedRun for performance */}
      {activeView !== 'speedrun' && <BackgroundFlow />}

      <Sidebar 
        activeView={activeView} 
        onChangeView={setActiveView} 
        user={user}
        onLogout={handleLogout}
        language={language}
        setLanguage={setLanguage}
      />
      
      <main className="flex-1 relative overflow-y-auto h-screen z-10">
        <div className={`relative z-10 mx-auto min-h-screen ${activeView === 'speedrun' ? 'max-w-full' : 'max-w-[1600px]'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} // Custom cubic-bezier for snappy flow
              className="h-full"
            >
              {activeView === 'dashboard' && (
                <Dashboard 
                  user={user} 
                  onQuestionsGenerated={handleQuestionsGenerated}
                  language={language}
                />
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
                <SpeedRun language={language} />
              )}
              {activeView === 'flashcards' && (
                <Flashcards 
                  cards={flashcards} 
                  onAddCard={handleAddFlashcard}
                />
              )}
              {activeView === 'schedule' && (
                <Schedule language={language} />
              )}
              {activeView === 'keypoints' && (
                <KeyPoints language={language} />
              )}
              {activeView === 'pomodoro' && <Pomodoro />}
              {activeView === 'notes' && <SmartNotes />}
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