
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScheduleItem, ChecklistItem, Language, User } from '../types';
import { Plus, X, Trash2, Clock, BookOpen, Coffee, ChevronLeft, ChevronRight, CheckSquare, Square, Calendar, Settings, Edit2, ListFilter } from 'lucide-react';

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
  const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const [selectedDay, setSelectedDay] = useState(days[currentDayIndex]); 
  
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

    const checklistKey = `neurally_checklists_${user.id}`;
    const savedChecklists = localStorage.getItem(checklistKey);
    if (savedChecklists) setChecklists(JSON.parse(savedChecklists));

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

  const addTimeSlot = () => {
      if (newTimeInput && !timeSlots.includes(newTimeInput)) {
          const newSlots = [...timeSlots, newTimeInput].sort();
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

  // GRID CONFIGURATION: STRICT WIDTHS
  // 80px for Time Column, equal share (minmax 0) for the 7 days to prevent overflow.
  const GRID_CLASS = "grid grid-cols-[80px_repeat(7,minmax(0,1fr))]";

  return (
    <div className="flex flex-col h-full max-w-[1920px] mx-auto bg-white relative overflow-hidden">
      
      {/* HEADER SECTION */}
      <div className="p-6 md:p-8 lg:p-12 border-b border-black flex flex-col md:flex-row justify-between items-start md:items-end bg-white z-10 gap-6">
          <div className="w-full md:w-auto">
              <h1 className="font-serif text-3xl md:text-5xl text-black">{isTr ? 'Haftalık Protokol' : 'Weekly Protocol'}</h1>
              <div className="flex items-center justify-between md:justify-start gap-4 mt-4 md:mt-2 w-full">
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-gray-100 rounded-full border border-gray-200"><ChevronLeft className="w-4 h-4"/></button>
                    <span className="font-mono text-xs md:text-sm font-bold uppercase tracking-widest min-w-[100px] text-center bg-gray-50 py-1 rounded">
                        {currentWeekId}
                    </span>
                    <button onClick={() => changeWeek(1)} className="p-2 hover:bg-gray-100 rounded-full border border-gray-200"><ChevronRight className="w-4 h-4"/></button>
                  </div>
                  
                  {/* Mobile Actions */}
                  <div className="flex gap-2 md:hidden">
                      <button onClick={() => setIsTimeConfigOpen(true)} className="p-2 border border-gray-200 rounded-lg"><Settings className="w-4 h-4" /></button>
                      <button onClick={() => setIsModalOpen(true)} className="p-2 bg-black text-white rounded-lg"><Plus className="w-4 h-4" /></button>
                  </div>
              </div>
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden md:flex gap-4">
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

      <div className={`flex-1 flex flex-col md:flex-row h-full overflow-hidden transition-all duration-300 ${selectedDayPanel ? 'mr-0 md:mr-[400px]' : ''}`}>
        
        {/* === MOBILE VIEW (VERTICAL TIMELINE) === */}
        <div className="lg:hidden flex-1 flex flex-col h-full bg-[#FAFAFA]">
            
            {/* Day Selector */}
            <div className="bg-white border-b border-gray-200 p-2 shadow-sm sticky top-0 z-20">
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {days.map(day => {
                        const isSelected = selectedDay === day;
                        return (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                className={`
                                    flex flex-col items-center justify-center min-w-[60px] p-2 rounded-xl transition-all
                                    ${isSelected ? 'bg-black text-white shadow-md transform scale-105' : 'bg-white border border-gray-100 text-gray-400'}
                                `}
                            >
                                <span className="text-[10px] font-bold uppercase">{day.substring(0,3)}</span>
                                {getTasksForDay(day).some(t => !t.completed) && (
                                    <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-red-500'}`} />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Checklist Preview */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center" onClick={() => setSelectedDayPanel(selectedDay)}>
                <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                        {getTasksForDay(selectedDay).filter(t => t.completed).length}/{getTasksForDay(selectedDay).length} Tasks
                    </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>

            {/* Vertical Timeline */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {timeSlots.map(time => {
                    const items = getItemsForCell(selectedDay, time);
                    const isEmpty = items.length === 0;
                    
                    return (
                        <div key={time} className="flex gap-4">
                            {/* Time Column */}
                            <div className="w-12 pt-2 text-right flex-shrink-0">
                                <span className="text-xs font-mono font-bold text-gray-400">{time}</span>
                            </div>

                            {/* Content Column */}
                            <div className="flex-1 relative pb-4">
                                {/* Vertical Line */}
                                <div className="absolute left-[-17px] top-3 bottom-0 w-px bg-gray-200"></div>
                                <div className="absolute left-[-20px] top-2.5 w-1.5 h-1.5 rounded-full bg-gray-300 border-2 border-white z-10"></div>

                                {isEmpty ? (
                                    <button 
                                        onClick={() => openModalForCell(selectedDay, time)}
                                        className="w-full h-12 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-300 hover:border-gray-400 hover:text-gray-500 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        {items.map(item => (
                                            <div 
                                                key={item.id}
                                                className={`
                                                    p-4 rounded-xl shadow-sm border-l-4 relative group
                                                    ${item.type === 'lecture' ? 'bg-white border-l-blue-500' : item.type === 'study' ? 'bg-black text-white border-l-gray-500' : 'bg-orange-50 border-l-orange-400'}
                                                `}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${item.type === 'study' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {item.type.toUpperCase()}
                                                    </span>
                                                    <button onClick={(e) => handleDeleteItem(item.id, e)} className="text-red-500 opacity-50 hover:opacity-100">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <h4 className={`font-serif text-lg leading-tight ${item.type === 'study' ? 'text-white' : 'text-black'}`}>
                                                    {item.subject}
                                                </h4>
                                            </div>
                                        ))}
                                        <button onClick={() => openModalForCell(selectedDay, time)} className="w-full py-2 bg-gray-100 rounded text-gray-400 hover:bg-gray-200 flex justify-center"><Plus className="w-3 h-3" /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div className="h-20" />
            </div>
        </div>

        {/* === DESKTOP VIEW (GRID) === */}
        <div className="hidden lg:flex flex-1 overflow-auto custom-scrollbar p-8 bg-white">
            <div className="min-w-[1000px] border-l border-t border-black select-none w-full">
            
            {/* Header Row */}
            <div className={`${GRID_CLASS} border-b border-black sticky top-0 z-20 shadow-sm bg-white`}>
                <div className="p-4 border-r border-black bg-gray-50 flex items-center justify-center font-mono text-xs font-bold uppercase text-gray-400">
                    {isTr ? 'Saat' : 'Time'}
                </div>
                {days.map(day => (
                    <div 
                        key={day} 
                        onClick={() => setSelectedDayPanel(day)}
                        className={`
                            p-4 border-r border-black font-serif font-bold text-center text-sm uppercase tracking-wide cursor-pointer transition-colors group relative truncate
                            ${selectedDayPanel === day ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'}
                        `}
                    >
                        {day}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <CheckSquare className="w-3 h-3" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Time Rows */}
            {timeSlots.map(time => (
                <div key={time} className={`${GRID_CLASS} border-b border-black min-h-[128px]`}>
                    {/* Time Cell */}
                    <div className="p-4 border-r border-black bg-gray-50 flex items-start justify-center font-mono text-xs font-bold text-gray-400 pt-6 group cursor-pointer hover:text-black transition-colors">
                        {time}
                    </div>

                    {/* Day Cells */}
                    {days.map(day => {
                        const items = getItemsForCell(day, time);
                        return (
                        <div key={`${day}-${time}`} className="border-r border-black p-2 relative group hover:bg-gray-50 transition-colors flex flex-col gap-2 min-w-0">
                            {items.map(item => (
                                <motion.div 
                                    key={item.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`
                                    relative w-full p-2 border border-black flex flex-col justify-between group/item hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-default min-h-[60px]
                                    ${item.type === 'lecture' ? 'bg-white' : item.type === 'study' ? 'bg-black text-white' : 'bg-gray-100'}
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`font-mono text-[9px] opacity-70 uppercase tracking-wider truncate ${item.type === 'study' ? 'text-gray-300' : 'text-gray-500'}`}>
                                            {item.type.toUpperCase().substring(0,3)}
                                        </span>
                                        <button 
                                            onClick={(e) => handleDeleteItem(item.id, e)}
                                            className="opacity-0 group-hover/item:opacity-100 transition-opacity hover:text-red-500 p-1"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <span className={`font-serif text-xs font-bold leading-tight line-clamp-2 break-words ${item.type === 'study' ? 'text-white' : 'text-black'}`}>
                                        {item.subject}
                                    </span>
                                </motion.div>
                            ))}
                            
                            {/* Add Button (Hover) */}
                            {items.length < 3 && (
                                <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => openModalForCell(day, time)}
                                        className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 hover:bg-black hover:text-white flex items-center justify-center transition-colors"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                        );
                    })}
                </div>
            ))}
            
            {/* Empty State */}
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
                     className="bg-white border border-black p-8 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-2xl"
                  >
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-serif text-xl">{isTr ? 'Zaman Çizelgesi' : 'Time Slots'}</h3>
                          <button onClick={() => setIsTimeConfigOpen(false)}><X className="w-5 h-5" /></button>
                      </div>
                      
                      <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {timeSlots.map(time => (
                              <div key={time} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-100 rounded-lg">
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
                              className="flex-1 p-2 border border-gray-300 font-mono text-sm focus:border-black outline-none rounded-lg"
                          />
                          <button 
                              onClick={addTimeSlot}
                              disabled={!newTimeInput}
                              className="px-4 bg-black text-white font-bold uppercase text-xs hover:bg-gray-800 disabled:opacity-50 rounded-lg"
                          >
                              {isTr ? 'Ekle' : 'Add'}
                          </button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      {/* SLIDE-OVER CHECKLIST PANEL (Responsive) */}
      <AnimatePresence>
          {selectedDayPanel && (
              <>
                {/* Backdrop for Mobile */}
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setSelectedDayPanel(null)}
                    className="fixed inset-0 bg-black/50 z-[60] md:hidden"
                />
                
                <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed md:absolute top-0 right-0 h-full w-[85%] md:w-[400px] bg-white border-l border-black shadow-2xl z-[70] flex flex-col"
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
                                className="flex-1 bg-white border border-gray-200 px-3 py-2 text-sm focus:border-black outline-none rounded-lg"
                            />
                            <button 
                                onClick={() => addTask(selectedDayPanel)}
                                className="bg-black text-white px-4 py-2 text-xs font-bold uppercase hover:bg-gray-800 rounded-lg"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </motion.div>
              </>
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
                    className="bg-white border border-black p-8 w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-2xl"
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
                                    className="w-full p-3 bg-gray-50 border border-gray-200 font-mono text-xs focus:border-black outline-none rounded-lg"
                                >
                                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest block mb-2">{isTr ? 'Saat' : 'Time'}</label>
                                <select 
                                    value={selectedTime}
                                    onChange={(e) => setSelectedTime(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 font-mono text-xs focus:border-black outline-none rounded-lg"
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
                                className="w-full p-3 border border-gray-200 font-serif text-lg focus:border-black outline-none rounded-lg"
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
                                        className={`p-3 border flex flex-col items-center gap-2 transition-all rounded-lg ${type === t.id ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-black'}`}
                                    >
                                        <t.icon className="w-4 h-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={handleAddItem}
                            className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest hover:bg-gray-800 transition-all mt-4 rounded-lg"
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
