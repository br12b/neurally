
export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: number;
  text: string;
  options: Option[];
  rationale: string;
  topicTag: string;
}

export interface Flashcard {
  id: number;
  front: string;
  back: string;
  tag: string;
  mnemonicImage?: string; // Base64 data URL for AI Visual Mnemonic
}

export interface ScheduleItem {
  id: string;
  day: string; // "Monday", "Tuesday"...
  time: string; // "09:00"
  subject: string;
  type: 'lecture' | 'study' | 'break';
  weekId?: string; // "2023-W42" to support history
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  date: string; // "YYYY-MM-DD"
}

// --- GAMIFICATION TYPES ---
export interface Badge {
  id: string;
  icon: string; // Lucide icon name or emoji
  name: string;
  description: string;
  unlockedAt?: string; // ISO Date
  isLocked: boolean;
}

export interface DailyQuest {
  id: string;
  title: string;
  target: number;
  current: number;
  xpReward: number;
  completed: boolean;
  type: 'quiz' | 'flashcard' | 'focus';
}

export interface UserStats {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  streakDays: number;
  totalFocusMinutes: number;
  rankTitle: string; // e.g., "Novice", "Architect", "Omniscient"
  badges: Badge[];
  dailyQuests: DailyQuest[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  tier: 'Free' | 'Scholar' | 'Fellow';
  stats?: UserStats; // New Gamification Stats
}

export interface PodcastEpisode {
    id: string;
    title: string;
    duration: string;
    topic: string;
    script: { speaker: 'Host' | 'Expert', text: string }[];
}

// --- EDU MODULE TYPES ---
export interface EduAssignment {
    id: string;
    title: string;
    type: 'quiz' | 'resource';
    content: string; // Description or JSON string of questions
    dueDate?: string;
    timestamp: number;
}

export interface Classroom {
    id: string;
    name: string;
    code: string; // 6-digit join code
    instructorId: string;
    instructorName: string;
    studentCount: number;
    assignments: EduAssignment[];
}

// --- LANGUAGE PATH TYPES ---
export interface LangNode {
    id: string;
    title: string; // e.g., "Airport Arrival"
    level: string; // "A1", "A2"
    description: string;
    status: 'locked' | 'active' | 'completed';
    scenario?: {
        context: string;
        dialogueStart: string;
        keyVocabulary: { word: string; meaning: string }[];
    }
}

export type QuizState = 'intro' | 'active' | 'summary' | 'completed';

export type AppView = 'login' | 'dashboard' | 'quiz' | 'flashcards' | 'pomodoro' | 'notes' | 'report' | 'about' | 'schedule' | 'keypoints' | 'speedrun' | 'neurallist' | 'podcast' | 'edu' | 'language';

export type Language = 'tr' | 'en';
