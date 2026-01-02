
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
}

export interface ScheduleItem {
  id: string;
  day: string; // "Monday", "Tuesday"...
  time: string; // "09:00"
  subject: string;
  type: 'lecture' | 'study' | 'break';
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  tier: 'Free' | 'Scholar' | 'Fellow';
  isAdmin?: boolean; // Added Admin Flag
}

export type QuizState = 'intro' | 'active' | 'summary' | 'completed';

export type AppView = 'login' | 'dashboard' | 'quiz' | 'flashcards' | 'pomodoro' | 'notes' | 'methods' | 'report' | 'about' | 'schedule' | 'keypoints' | 'speedrun' | 'neurallist' | 'construct' | 'admin';

export type Language = 'tr' | 'en';