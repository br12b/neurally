
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScheduleItem, ChecklistItem, Language, User } from '../types';
import { Plus, X, Trash2, Clock, BookOpen, Coffee, ChevronLeft, ChevronRight, CheckSquare, Square, Calendar, Settings, Edit2 } from 'lucide-react';

interface ScheduleProps {
  language: Language;
  user: User;
}

export default function Schedule({ language, user }: ScheduleProps) {
  const isTr = language === 'tr';
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // --- STATE ---
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  
  // Custom Times State
  const [timeSlots, setTimeSlots] = useState<string[]>(['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']);
  const [isTimeConfigOpen, setIsTimeConfigOpen] = useState(false);
  const [newTimeInput, setNewTimeInput] = useState("");

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDayPanel, setSelectedDayPanel] = useState<string | null>(null); 
  
  // Form State
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [selectedTime, setSelectedTime] = useState(timeSlots[0]);
  const [subject, setSubject] = useState("");
  const [type, setType] = useState<'lecture' | 'study' | 'break'>('study');
  const [newTaskText, setNewTaskText] = useState("");

  // Helper to get Week ID (ISO-ish)
  const getWeekId = (date: Date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
      return `${d.getUTCFullYear()}-W${weekNo}`;
  };

  const currentWeekId = getWeekId(currentDate);

  // LOAD DATA
  useEffect(() => {
    if (!user) return;
    
    // Load Schedule Items
    const scheduleKey = `neurally_schedule_${user.id}_${currentWeekId}`;
    const savedSchedule = localStorage.getItem(scheduleKey);
    const legacyKey = `neurally_schedule_${user.id}`; 
    
    if (savedSchedule) {
        setScheduleItems(JSON.parse(savedSchedule));
    } else {
        const legacy = localStorage.getItem(legacyKey);
        if (legacy) setScheduleItems(JSON.parse(legacy));
        else setScheduleItems([]);
    }

    // Load Checklists
    const checklistKey = `neurally_checklists_${user.id}`;
    const savedChecklists = localStorage.getItem(checklistKey);
    if (savedChecklists) setChecklists(JSON.parse(savedChecklists));

    // Load Custom Time Slots
    const timeKey = `neurally_times_${user.id}`;
    const savedTimes = localStorage.getItem(timeKey);
    if (savedTimes) {
        setTimeSlots(JSON.parse(savedTimes));
    }

  }, [user, currentWeekId]);

  // SAVE DATA
  useEffect(() => {
    if (!user) return;
    const scheduleKey = `neurally_schedule_${user.id}_${currentWeekId}`;
    localStorage.setItem(scheduleKey, JSON.stringify(scheduleItems));
  }, [scheduleItems, user, currentWeekId]);

  useEffect(() => {
    if (!user) return;
    const checklistKey = `neurally_checklists_${user.id}`;
    localStorage.setItem(checklistKey, JSON.stringify(checklists));
  }, [checklists, user]);

  useEffect(() => {
      if(!user) return;
      localStorage.setItem(`neurally_times_${user.id}`, JSON.stringify(timeSlots));
      // Update selectedTime if it's no longer valid
      if (!timeSlots.includes(selectedTime) && timeSlots.length > 0) {
          setSelectedTime(timeSlots[0]);
      }
  }, [timeSlots, user]);

  // --- HANDLERS ---
  const changeWeek = (direction: -1 | 1) => {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + (direction * 7));
      setCurrentDate(newDate);
      setSelectedDayPanel(null); 
  };

  const handleAddItem = () => {
    if (!subject) return;
    const newItem: ScheduleItem = {
      id: Date.now().toString(),
      day: selectedDay,
      time: selectedTime,
      subject,
      type,
      weekId: currentWeekId
    };
    setScheduleItems(prev => [...prev, newItem]);
    resetForm();
    setIsModalOpen(false);
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setScheduleItems(prev => prev.filter(item => item.id !== id));
  };

  // Time Slot Handlers
  const addTimeSlot = () => {
      if (newTimeInput && !timeSlots.includes(newTimeInput)) {
          const newSlots = [...timeSlots, newTimeInput].sort(); // Keep sorted
          setTimeSlots(newSlots);
          setNewTimeInput("");
      }
  };

  const removeTimeSlot = (time: string) => {
      if (timeSlots.length <= 1) {
          alert(isTr ? "En az bir zaman dilimi kalmalı." : "At least one time slot required.");
          return;
      }
      setTimeSlots(timeSlots.filter(t => t !== time));
  };

  // Checklist Handlers
  const getTasksForDay = (dayName: string) => {
      const key = `${currentWeekId}-${dayName}`;
      return checklists.filter(c => c.date === key);
  };

  const addTask = (dayName: string) => {
      if(!newTaskText.trim()) return;
      const key = `${currentWeekId}-${dayName}`;
      const newTask: ChecklistItem = {
          id: Date.now().toString(),
          text: newTaskText,
          completed: false,
          date: key
      };
      setChecklists(prev => [...prev, newTask]);
      setNewTaskText("");
  };

  const toggleTask = (taskId: string) => {
      setChecklists(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };
  
  const deleteTask = (taskId: string) => {
      setChecklists(prev => prev.filter(t => t.id !== taskId));
  };

  const resetForm = () => {
    setSubject("");
    setType("study");
  };

  const openModalForCell = (day: string, time: string) => {
    setSelectedDay(day);
    setSelectedTime(time);
    setIsModalOpen(true);
  };

  const getItemsForCell = (day: string, time: string) => {
    return scheduleItems.filter(item => item.day === day && item.time === time);
  };

  return (
    <div className="flex h-full max-w-[1920px] mx-auto bg-white relative overflow-hidden">
      
      {/* MAIN CONTENT (Grid) */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ${selectedDayPanel ? 'mr-[400px]' : ''}`}>
        
        {/* Header */}
        <div className="p-8 lg:p-12 border-b border-black flex justify-between items-end bg-white z-10">
            <div>
                <h1 className="font-serif text-5xl text-black">{isTr ? 'Haftalık Protokol' : 'Weekly Protocol'}</h1>
                <div className="flex items-center gap-4 mt-2">
                    <button onClick={() => changeWeek(-1)} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-5 h-5"/></button>
                    <span className="font-mono text-sm font-bold uppercase tracking-widest min-w-[120px] text-center">
                        {currentWeekId}
                    </span>
                    <button onClick={() => changeWeek(1)} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-5 h-5"/></button>
                </div>
            </div>
            <div className="flex gap-4">
                <button 
                    onClick={() => setIsTimeConfigOpen(true)}
                    className="px-4 py-3 bg-white border border-gray-200 text-gray-500 text-xs font-bold uppercase tracking-widest hover:border-black hover:text-black transition-all flex items-center gap-2"
                >
                    <Settings className="w-4 h-4" /> {isTr ? 'Zaman Ayarları' : 'Config Times'}
                </button>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> {isTr ? 'Blok Ekle' : 'Add Block'}
                </button>
            </div>
        </div>

        {/* Grid Container */}
        <div className="flex-1 overflow-auto custom-scrollbar p-8 lg:p-12 bg-white">
            <div className="min-w-[1000px] border-l border-t border-black select-none">
            
            {/* Header Row (Days) */}
            <div className="grid grid-cols-8 border-b border-black sticky top-0 z-20 shadow-sm">
                <div className="p-4 border-r border-black bg-gray-50 flex items-center justify-center font-mono text-xs font-bold uppercase text-gray-400">
                    {isTr ? 'Zaman' : 'Time'}
                </div>
                {days.map(day => (
                    <div 
                        key={day} 
                        onClick={() => setSelectedDayPanel(day)}
                        className={`
                            p-4 border-r border-black font-serif font-bold text-center text-sm uppercase tracking-wide cursor-pointer transition-colors group relative
                            ${selectedDayPanel === day ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'}
                        `}
                    >
                        {isTr ? day.substring(0, 3) : day.substring(0, 3)}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <CheckSquare className="w-3 h-3" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Time Rows */}
            {timeSlots.map(time => (
                <div key={time} className="grid grid-cols-8 border-b border-black min-h-[128px]">
                    <div className="p-4 border-r border-black bg-gray-50 flex items-start justify-center font-mono text-xs font-bold text-gray-400 pt-6 group cursor-pointer hover:text-black transition-colors">
                        {time}
                    </div>

                    {days.map(day => {
                        const items = getItemsForCell(day, time);
                        return (
                        <div key={`${day}-${time}`} className="border-r border-black p-2 relative group hover:bg-gray-50 transition-colors">
                            <div className="flex flex-col gap-2 h-full">
                                {items.map(item => (
                                    <motion.div 
                                        key={item.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`
                                        relative w-full flex-1 p-2 border border-black flex flex-col justify-between group/item hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-default
                                        ${item.type === 'lecture' ? 'bg-white' : item.type === 'study' ? 'bg-black text-white' : 'bg-gray-100'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className={`font-mono text-[9px] opacity-70 uppercase tracking-wider ${item.type === 'study' ? 'text-gray-300' : 'text-gray-500'}`}>
                                                {item.type === 'lecture' ? (isTr ? 'Ders' : 'Lecture') : item.type === 'study' ? (isTr ? 'Etüt' : 'Study') : (isTr ? 'Mola' : 'Break')}
                                            </span>
                                            <button 
                                                onClick={(e) => handleDeleteItem(item.id, e)}
                                                className="opacity-0 group-hover/item:opacity-100 transition-opacity hover:text-red-500 p-1"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <span className={`font-serif text-sm font-bold leading-tight line-clamp-2 ${item.type === 'study' ? 'text-white' : 'text-black'}`}>
                                            {item.subject}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                            
                            {items.length < 2 && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <button 
                                        onClick={() => openModalForCell(day, time)}
                                        className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform pointer-events-auto"
                                    >
                                    <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                        );
                    })}
                </div>
            ))}
            
            {/* Empty State / Prompt */}
            {timeSlots.length === 0 && (
                <div className="p-12 text-center text-gray-400 font-mono text-sm border-b border-r border-black">
                     No time slots defined. Click "Config Times" to add rows.
                </div>
            )}
            </div>
        </div>
      </div>

      {/* TIME CONFIG MODAL */}
      <AnimatePresence>
          {isTimeConfigOpen && (
              <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                  <motion.div 
                     initial={{ scale: 0.95 }}
                     animate={{ scale: 1 }}
                     exit={{ scale: 0.95 }}
                     className="bg-white border border-black p-8 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                  >
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-serif text-xl">{isTr ? 'Zaman Çizelgesi' : 'Time Slots'}</h3>
                          <button onClick={() => setIsTimeConfigOpen(false)}><X className="w-5 h-5" /></button>
                      </div>
                      
                      <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {timeSlots.map(time => (
                              <div key={time} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-100">
                                  <span className="font-mono font-bold text-sm">{time}</span>
                                  <button onClick={() => removeTimeSlot(time)} className="text-gray-400 hover:text-red-500">
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                          ))}
                      </div>

                      <div className="flex gap-2">
                          <input 
                              type="time"
                              value={newTimeInput}
                              onChange={(e) => setNewTimeInput(e.target.value)}
                              className="flex-1 p-2 border border-gray-300 font-mono text-sm focus:border-black outline-none"
                          />
                          <button 
                              onClick={addTimeSlot}
                              disabled={!newTimeInput}
                              className="px-4 bg-black text-white font-bold uppercase text-xs hover:bg-gray-800 disabled:opacity-50"
                          >
                              {isTr ? 'Ekle' : 'Add'}
                          </button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      {/* SLIDE-OVER CHECKLIST PANEL */}
      <AnimatePresence>
          {selectedDayPanel && (
              <motion.div 
                 initial={{ x: '100%' }}
                 animate={{ x: 0 }}
                 exit={{ x: '100%' }}
                 transition={{ type: "spring", stiffness: 300, damping: 30 }}
                 className="absolute top-0 right-0 h-full w-[400px] bg-white border-l border-black shadow-2xl z-40 flex flex-col"
              >
                  {/* Panel Header */}
                  <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-black text-white">
                      <div>
                          <h3 className="font-serif text-2xl">{selectedDayPanel}</h3>
                          <p className="font-mono text-xs text-gray-400 mt-1 uppercase tracking-widest">Daily Objectives</p>
                      </div>
                      <button onClick={() => setSelectedDayPanel(null)} className="hover:rotate-90 transition-transform">
                          <X className="w-6 h-6" />
                      </button>
                  </div>

                  {/* Task List */}
                  <div className="flex-1 overflow-y-auto p-8">
                      <div className="space-y-4">
                          {getTasksForDay(selectedDayPanel).map(task => (
                              <motion.div 
                                 key={task.id}
                                 layout
                                 className="flex items-start gap-3 group"
                              >
                                  <button onClick={() => toggleTask(task.id)} className="mt-0.5">
                                      {task.completed ? <CheckSquare className="w-5 h-5 text-green-500" /> : <Square className="w-5 h-5 text-gray-300 group-hover:text-black" />}
                                  </button>
                                  <span className={`flex-1 text-sm ${task.completed ? 'line-through text-gray-300' : 'text-black'}`}>
                                      {task.text}
                                  </span>
                                  <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity">
                                      <X className="w-4 h-4" />
                                  </button>
                              </motion.div>
                          ))}
                          
                          {getTasksForDay(selectedDayPanel).length === 0 && (
                              <div className="text-center py-12 text-gray-300">
                                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                  <p className="text-xs uppercase tracking-widest">No tasks defined</p>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* Add Task Input */}
                  <div className="p-6 border-t border-gray-100 bg-gray-50">
                      <div className="flex gap-2">
                          <input 
                              value={newTaskText}
                              onChange={(e) => setNewTaskText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && addTask(selectedDayPanel)}
                              placeholder="Add micro-task..."
                              className="flex-1 bg-white border border-gray-200 px-3 py-2 text-sm focus:border-black outline-none"
                          />
                          <button 
                             onClick={() => addTask(selectedDayPanel)}
                             className="bg-black text-white px-4 py-2 text-xs font-bold uppercase hover:bg-gray-800"
                          >
                              Add
                          </button>
                      </div>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* ADD BLOCK MODAL */}
      <AnimatePresence>
        {isModalOpen && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setIsModalOpen(false)}
            >
                <motion.div 
                    initial={{ scale: 0.95, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 10 }}
                    className="bg-white border border-black p-8 w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-serif text-2xl">{isTr ? 'Yeni Blok Ekle' : 'Add New Block'}</h3>
                        <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6" /></button>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest block mb-2">{isTr ? 'Gün' : 'Day'}</label>
                                <select 
                                    value={selectedDay}
                                    onChange={(e) => setSelectedDay(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 font-mono text-xs focus:border-black outline-none"
                                >
                                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest block mb-2">{isTr ? 'Saat' : 'Time'}</label>
                                <select 
                                    value={selectedTime}
                                    onChange={(e) => setSelectedTime(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 font-mono text-xs focus:border-black outline-none"
                                >
                                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                             <label className="text-[10px] font-bold uppercase tracking-widest block mb-2">{isTr ? 'Konu / Ders' : 'Subject / Task'}</label>
                             <input 
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder={isTr ? "Örn: Matematik" : "e.g. Math"}
                                className="w-full p-3 border border-gray-200 font-serif text-lg focus:border-black outline-none"
                                autoFocus
                             />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest block mb-2">{isTr ? 'Aktivite Türü' : 'Activity Type'}</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'lecture', label: isTr ? 'Ders' : 'Lecture', icon: BookOpen },
                                    { id: 'study', label: isTr ? 'Etüt' : 'Study', icon: Clock },
                                    { id: 'break', label: isTr ? 'Mola' : 'Break', icon: Coffee }
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setType(t.id as any)}
                                        className={`p-3 border flex flex-col items-center gap-2 transition-all ${type === t.id ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-black'}`}
                                    >
                                        <t.icon className="w-4 h-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={handleAddItem}
                            className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest hover:bg-gray-800 transition-all mt-4"
                        >
                            {isTr ? 'Programa Kaydet' : 'Save to Schedule'}
                        </button>
                    </div>

                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
