import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { School, Users, Plus, Hash, ArrowRight, Share2, FileUp, GraduationCap, Cast, Download, Database, Copy, Check, Clock, Activity, XCircle } from 'lucide-react';
import { User, Language, Classroom, EduAssignment } from '../types';

interface EduClassroomProps {
  language: Language;
  user: User;
}

export default function EduClassroom({ language, user }: EduClassroomProps) {
  const isTr = language === 'tr';

  // --- MOCK DATA FOR DEMO ---
  const MOCK_CLASSES: Classroom[] = [
      {
          id: 'cls-1',
          name: '12-A Advanced Biology',
          code: 'BIO-992',
          instructorId: 'teacher-1',
          instructorName: 'Dr. Neural',
          studentCount: 24,
          assignments: [
              { id: 'asg-1', title: 'Cellular Respiration Quiz', type: 'quiz', content: '...', timestamp: Date.now() - 86400000, dueDate: 'Tomorrow' },
              { id: 'asg-2', title: 'Lecture Notes: Week 4', type: 'resource', content: '...', timestamp: Date.now() - 172800000 }
          ]
      }
  ];

  // STATE
  const [role, setRole] = useState<'instructor' | 'student'>('student');
  const [classes, setClasses] = useState<Classroom[]>(MOCK_CLASSES);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  
  // Create / Join State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [newClassName, setNewClassName] = useState("");

  // Assignment State
  const [isAssigning, setIsAssigning] = useState(false);
  const [newAssignmentTitle, setNewAssignmentTitle] = useState("");

  const activeClass = classes.find(c => c.id === activeClassId);

  const handleCreateClass = () => {
      if(!newClassName) return;
      const code = Math.random().toString(36).substring(2,8).toUpperCase();
      const newClass: Classroom = {
          id: `cls-${Date.now()}`,
          name: newClassName,
          code: code,
          instructorId: user.id,
          instructorName: user.name,
          studentCount: 1,
          assignments: []
      };
      setClasses([...classes, newClass]);
      setActiveClassId(newClass.id);
      setIsModalOpen(false);
      setNewClassName("");
  };

  const handleJoinClass = () => {
      // In a real app, verify code against DB
      if (inputCode === 'BIO-992' || inputCode.length > 3) {
          alert(isTr ? "Sınıfa başarıyla katıldınız." : "Successfully joined class protocol.");
          setIsModalOpen(false);
          setActiveClassId(classes[0].id); // Demo: Jump to mock class
      } else {
          alert(isTr ? "Geçersiz Bağlantı Kodu" : "Invalid Link Code");
      }
  };

  const handlePostAssignment = (type: 'quiz' | 'resource') => {
      if(!activeClass || !newAssignmentTitle) return;
      
      const newAsg: EduAssignment = {
          id: `asg-${Date.now()}`,
          title: newAssignmentTitle,
          type: type,
          content: "Demo Content",
          timestamp: Date.now(),
          dueDate: "Next Week"
      };

      const updatedClasses = classes.map(c => {
          if(c.id === activeClass.id) {
              return { ...c, assignments: [newAsg, ...c.assignments] };
          }
          return c;
      });
      
      setClasses(updatedClasses);
      setIsAssigning(false);
      setNewAssignmentTitle("");
  };

  return (
    <div className="p-8 lg:p-12 max-w-[1600px] mx-auto min-h-screen font-sans">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-gray-100 pb-8">
            <div>
                <h1 className="font-serif text-6xl text-black mb-2 tracking-tighter">
                    {isTr ? 'Nöral Sınıf' : 'Neural Class'}
                </h1>
                <p className="text-gray-400 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                    <School className="w-3 h-3" />
                    {isTr ? 'Eğitim Yönetim Protokolü' : 'Education Management Protocol'}
                </p>
            </div>
            
            {/* ROLE TOGGLE */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setRole('student')}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded transition-all ${role === 'student' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
                >
                    {isTr ? 'Öğrenci' : 'Student'}
                </button>
                <button 
                    onClick={() => setRole('instructor')}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded transition-all ${role === 'instructor' ? 'bg-black text-white shadow-sm' : 'text-gray-400'}`}
                >
                    {isTr ? 'Öğretmen' : 'Instructor'}
                </button>
            </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* SIDEBAR: CLASS LIST */}
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-sm uppercase tracking-widest">{isTr ? 'Sınıflarım' : 'My Classes'}</h3>
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {classes.map(cls => (
                            <div 
                                key={cls.id}
                                onClick={() => setActiveClassId(cls.id)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all group ${activeClassId === cls.id ? 'bg-black text-white border-black' : 'bg-white border-gray-100 hover:border-black/20'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-serif text-lg leading-tight">{cls.name}</h4>
                                    {activeClassId === cls.id && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
                                </div>
                                <div className={`text-[10px] font-mono uppercase tracking-widest flex justify-between ${activeClassId === cls.id ? 'text-gray-400' : 'text-gray-400'}`}>
                                    <span>{cls.studentCount} {isTr ? 'Öğrenci' : 'Scholars'}</span>
                                    <span>{cls.code}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {classes.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                            <School className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-xs uppercase tracking-widest">{isTr ? 'Sınıf Bulunamadı' : 'No Classes Linked'}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* MAIN: CLASS STREAM */}
            <div className="lg:col-span-8">
                {activeClass ? (
                    <div className="space-y-8">
                        {/* CLASS HEADER CARD */}
                        <div className="bg-black text-white p-8 rounded-3xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                            
                            <div className="relative z-10 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-1 bg-white/20 rounded text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm">
                                            {role === 'instructor' ? 'Instructor Mode' : 'Student Mode'}
                                        </span>
                                        <span className="text-[10px] font-mono text-gray-400">ID: {activeClass.code}</span>
                                    </div>
                                    <h2 className="font-serif text-4xl">{activeClass.name}</h2>
                                    <p className="text-gray-400 text-sm mt-2">{activeClass.instructorName}</p>
                                </div>
                                
                                {role === 'instructor' && (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(activeClass.code)}
                                            className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-full hover:bg-gray-200 transition-colors flex items-center gap-2"
                                        >
                                            <Copy className="w-3 h-3" /> {activeClass.code}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ACTION BAR (INSTRUCTOR ONLY) */}
                        {role === 'instructor' && (
                            <div className="flex gap-4">
                                <div className="flex-1 bg-white border border-gray-200 p-4 rounded-xl flex items-center gap-4 shadow-sm group hover:border-black transition-colors">
                                    <input 
                                        value={newAssignmentTitle}
                                        onChange={(e) => setNewAssignmentTitle(e.target.value)}
                                        placeholder={isTr ? "Yeni görev başlığı..." : "New assignment title..."}
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium"
                                    />
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handlePostAssignment('resource')}
                                            disabled={!newAssignmentTitle}
                                            className="p-2 bg-gray-100 hover:bg-black hover:text-white rounded-lg transition-colors"
                                            title="Upload Resource"
                                        >
                                            <FileUp className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handlePostAssignment('quiz')}
                                            disabled={!newAssignmentTitle}
                                            className="p-2 bg-gray-100 hover:bg-black hover:text-white rounded-lg transition-colors"
                                            title="Create Quiz"
                                        >
                                            <Cast className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STREAM */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-xs uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <Activity className="w-3 h-3" /> {isTr ? 'Sınıf Akışı' : 'Class Stream'}
                            </h3>
                            
                            {activeClass.assignments.map(asg => (
                                <motion.div 
                                    key={asg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white border border-gray-200 p-6 rounded-xl hover:shadow-md transition-all group cursor-pointer"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${asg.type === 'quiz' ? 'bg-purple-50 border-purple-100 text-purple-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                                {asg.type === 'quiz' ? <Cast className="w-6 h-6" /> : <Database className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <h4 className="font-serif text-xl group-hover:underline decoration-1 underline-offset-4">{asg.title}</h4>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 font-mono uppercase tracking-widest">
                                                    <span>{new Date(asg.timestamp).toLocaleDateString()}</span>
                                                    {asg.dueDate && <span className="text-red-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {asg.dueDate}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button className="px-6 py-3 border border-gray-200 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors group-hover:border-black">
                                            {asg.type === 'quiz' ? (isTr ? 'Başlat' : 'Start') : (isTr ? 'İndir' : 'Download')}
                                        </button>
                                    </div>
                                </motion.div>
                            ))}

                            {activeClass.assignments.length === 0 && (
                                <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                                    <p className="text-gray-400 text-sm">{isTr ? 'Henüz paylaşım yapılmadı.' : 'No data broadcasted yet.'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50 min-h-[400px]">
                        <School className="w-16 h-16 mb-4 text-gray-300" />
                        <h3 className="font-serif text-2xl text-gray-400">{isTr ? 'Sınıf Seçin' : 'Select a Class'}</h3>
                    </div>
                )}
            </div>
        </div>

        {/* MODAL: CREATE / JOIN */}
        <AnimatePresence>
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl relative"
                    >
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black">
                            <XCircle className="w-6 h-6" />
                        </button>

                        <h3 className="font-serif text-2xl mb-6">
                            {role === 'instructor' ? (isTr ? 'Yeni Sınıf Oluştur' : 'Create New Protocol') : (isTr ? 'Sınıfa Katıl' : 'Establish Neural Link')}
                        </h3>

                        {role === 'instructor' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">{isTr ? 'Sınıf Adı' : 'Class Name'}</label>
                                    <input 
                                        value={newClassName}
                                        onChange={(e) => setNewClassName(e.target.value)}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:border-black outline-none font-serif text-lg"
                                        placeholder="12-A Biology..."
                                        autoFocus
                                    />
                                </div>
                                <button 
                                    onClick={handleCreateClass}
                                    className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest hover:bg-gray-800 transition-all"
                                >
                                    {isTr ? 'Oluştur' : 'Create'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">{isTr ? 'Sınıf Kodu' : 'Access Code'}</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            value={inputCode}
                                            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                            className="w-full p-3 pl-10 border border-gray-200 rounded-lg focus:border-black outline-none font-mono text-lg uppercase"
                                            placeholder="BIO-992"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <button 
                                    onClick={handleJoinClass}
                                    className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest hover:bg-gray-800 transition-all"
                                >
                                    {isTr ? 'Bağlan' : 'Connect'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

    </div>
  );
}