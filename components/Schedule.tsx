
// ... (imports remain same)
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScheduleItem, Language, User } from '../types';
import { Plus, X, Trash2, ChevronLeft, ChevronRight, Download, GripVertical, CheckSquare, Square, ListTodo, MoreHorizontal, Calendar, Settings, Palette, FileText, LayoutTemplate, Printer, Zap, Activity, Quote, ArrowLeft, Clock } from 'lucide-react';

// ... (Interfaces remain same)
interface ScheduleProps {
  language: Language;
  user: User;
}

// --- ADVANCED TYPES ---
interface SubTask {
    id: string;
    text: string;
    completed: boolean;
}

interface Category {
    id: string;
    label: string;
    color: string; // Tailwind class or Hex
    textColor: string;
}

interface ExtendedScheduleItem extends Omit<ScheduleItem, 'type'> {
    categoryId: string; // Linked to Category
    type: string; // Kept for legacy support
    subTasks: SubTask[];
    notes?: string;
}

// ... (Quotes remain same)
const QUOTES_TR = [
    "Zihin bir kap değil, tutuşturulması gereken bir ateştir.",
    "Yarınlar, yorgun ve bezgin kimselere değil, rahatını terk edebilenlere aittir.",
    "Disiplin, hedefler ile başarı arasındaki köprüdür.",
    "Büyük işler, sanki hiç ölmeyecekmiş gibi çalışarak başarılır.",
    "Ertelemek, zamanın hırsızıdır. Şimdi başla.",
    "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.",
    "Nereye gittiğini bilen kişiye yol vermek için dünya bir yana çekilir.",
    "Zorluklar, başarının değerini artıran süslerdir."
];

const QUOTES_EN = [
    "The mind is not a vessel to be filled, but a fire to be kindled.",
    "Discipline is the bridge between goals and accomplishment.",
    "Great things are done by a series of small things brought together.",
    "Procrastination is the thief of time. Begin now.",
    "Success is the sum of small efforts, repeated day in and day out.",
    "The world steps aside for the man who knows where he is going.",
    "Difficulties are meant to rouse, not discourage.",
    "Focus on being productive instead of busy."
];

export default function Schedule({ language, user }: ScheduleProps) {
  const isTr = language === 'tr';
  // Shortened Day Labels
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayLabels = isTr ? ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Grid View Time Slots (2-Hour Blocks) - Expanded to include 06:00
  const gridTimeSlots = [
      '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'
  ];

  // Modal & Day View Time Slots (30 Minute Intervals for precision)
  const detailedTimeSlots = [];
  for (let i = 6; i < 24; i++) {
      detailedTimeSlots.push(`${i.toString().padStart(2, '0')}:00`);
      detailedTimeSlots.push(`${i.toString().padStart(2, '0')}:30`);
  }

  // ... (Initial categories and state remain same)
  const getInitialCategories = (): Category[] => {
      if (isTr) {
          return [
            { id: 'deep-work', label: 'Derin Odak', color: '#171717', textColor: '#FFFFFF' },
            { id: 'lecture', label: 'Ders / Okul', color: '#E0F2FE', textColor: '#0369A1' }, 
            { id: 'life', label: 'Yaşam & Mola', color: '#F3F4F6', textColor: '#374151' },
            { id: 'sport', label: 'Spor', color: '#DCFCE7', textColor: '#15803D' }
          ];
      }
      return [
        { id: 'deep-work', label: 'Deep Work', color: '#171717', textColor: '#FFFFFF' },
        { id: 'lecture', label: 'Lecture', color: '#E0F2FE', textColor: '#0369A1' },
        { id: 'life', label: 'Life', color: '#F3F4F6', textColor: '#374151' },
        { id: 'sport', label: 'Sport', color: '#DCFCE7', textColor: '#15803D' }
      ];
  };

  // --- STATE ---
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [scheduleItems, setScheduleItems] = useState<ExtendedScheduleItem[]>([]);
  const [categories, setCategories] = useState<Category[]>(getInitialCategories());
  const [dailyQuote, setDailyQuote] = useState("");
  
  // View Mode State
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState<string>(days[0]); // For Day View

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#000000");

  // Print State
  const [printMode, setPrintMode] = useState<'landscape' | 'portrait'>('landscape');
  
  // Drag & Drop
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{day: string, time: string} | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExtendedScheduleItem | null>(null);
  
  // Form State
  const [formDay, setFormDay] = useState(days[0]);
  const [formTime, setFormTime] = useState(detailedTimeSlots[4]); // Default 08:00
  const [formSubject, setFormSubject] = useState("");
  const [formCategory, setFormCategory] = useState<string>('lecture');
  const [formSubTasks, setFormSubTasks] = useState<SubTask[]>([]);
  const [newTaskInput, setNewTaskInput] = useState("");

  // Initialize Quote
  useEffect(() => {
      const quotes = isTr ? QUOTES_TR : QUOTES_EN;
      setDailyQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, [isTr]);

  // Week ID Helper
  const getWeekId = (date: Date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
      return `${d.getUTCFullYear()}-W${weekNo}`;
  };
  const currentWeekId = getWeekId(currentDate);
  const todayIndex = (new Date().getDay() + 6) % 7; // 0=Monday

  // --- PERSISTENCE ---
  useEffect(() => {
      if(!user) return;
      const savedCats = localStorage.getItem(`neurally_cats_${user.id}`);
      if(savedCats) {
          setCategories(JSON.parse(savedCats));
      } else {
          setCategories(getInitialCategories()); 
      }
  }, [user, isTr]); 

  useEffect(() => {
      if(!user) return;
      localStorage.setItem(`neurally_cats_${user.id}`, JSON.stringify(categories));
  }, [categories, user]);

  useEffect(() => {
    if (!user) return;
    const key = `neurally_planner_v3_${user.id}_${currentWeekId}`;
    const saved = localStorage.getItem(key);
    if (saved) setScheduleItems(JSON.parse(saved));
    else setScheduleItems([]); 
  }, [user, currentWeekId]);

  useEffect(() => {
    if (!user) return;
    const key = `neurally_planner_v3_${user.id}_${currentWeekId}`;
    localStorage.setItem(key, JSON.stringify(scheduleItems));
  }, [scheduleItems, user, currentWeekId]);

  // --- HANDLERS ---
  const changeWeek = (dir: -1 | 1) => {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + (dir * 7));
      setCurrentDate(newDate);
  };

  const handleDayClick = (dayIndex: number) => {
      setSelectedDay(days[dayIndex]);
      setViewMode('day');
  };

  const handlePrint = (mode: 'landscape' | 'portrait') => {
      setPrintMode(mode);
      setTimeout(() => window.print(), 100);
  };

  // ... (Category add/delete handlers remain same)
  const addCategory = () => {
      if(!newCatName) return;
      const isLight = (color: string) => {
          const hex = color.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          return ((r * 0.299 + g * 0.587 + b * 0.114) > 186);
      };

      const newCat: Category = {
          id: Date.now().toString(),
          label: newCatName,
          color: newCatColor,
          textColor: isLight(newCatColor) ? '#000000' : '#FFFFFF'
      };
      setCategories([...categories, newCat]);
      setNewCatName("");
  };

  const deleteCategory = (id: string) => {
      if(categories.length <= 1) return;
      setCategories(categories.filter(c => c.id !== id));
  };

  const openModal = (item?: ExtendedScheduleItem, day?: string, time?: string) => {
      const defaultCat = categories.find(c => c.id === 'lecture' || c.label.includes('Ders'))?.id || categories[0].id;

      if (item) {
          setEditingItem(item);
          setFormDay(item.day);
          setFormTime(item.time);
          setFormSubject(item.subject);
          setFormCategory(item.categoryId || defaultCat);
          setFormSubTasks(item.subTasks || []);
      } else {
          setEditingItem(null);
          setFormDay(day || (viewMode === 'day' ? selectedDay : days[0]));
          setFormTime(time || detailedTimeSlots[4]); // Default 08:00
          setFormSubject("");
          setFormCategory(defaultCat);
          setFormSubTasks([]);
      }
      setNewTaskInput("");
      setIsModalOpen(true);
  };

  const handleSaveItem = () => {
      if (!formSubject) return;

      const newItem: ExtendedScheduleItem = {
          id: editingItem ? editingItem.id : Date.now().toString(),
          day: formDay,
          time: formTime,
          subject: formSubject,
          categoryId: formCategory,
          type: 'custom',
          subTasks: formSubTasks,
          weekId: currentWeekId
      };

      if (editingItem) {
          setScheduleItems(prev => prev.map(i => i.id === editingItem.id ? newItem : i));
      } else {
          setScheduleItems(prev => [...prev, newItem]);
      }
      setIsModalOpen(false);
  };

  const handleDeleteItem = (id: string) => {
      if(confirm(isTr ? "Bloğu silmek istediğine emin misin?" : "Delete this block?")) {
          setScheduleItems(prev => prev.filter(i => i.id !== id));
          setIsModalOpen(false);
      }
  };

  const addSubTask = () => {
      if (!newTaskInput.trim()) return;
      const newTask: SubTask = { id: Date.now().toString(), text: newTaskInput, completed: false };
      setFormSubTasks([...formSubTasks, newTask]);
      setNewTaskInput("");
  };

  const deleteFormSubTask = (id: string) => {
      setFormSubTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleSubTask = (itemId: string, taskId: string) => {
      setScheduleItems(prev => prev.map(item => {
          if (item.id === itemId) {
              return {
                  ...item,
                  subTasks: item.subTasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
              };
          }
          return item;
      }));
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
      setDraggedItem(id);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, day: string, time: string) => {
      e.preventDefault();
      if (!draggedItem) return;
      setScheduleItems(prev => prev.map(item => item.id === draggedItem ? { ...item, day, time } : item));
      setDraggedItem(null);
      setDragOverCell(null);
  };

  // Helper to get items specifically for a time slot
  // Note: Since items can have granular times (08:30) but grid is 2 hours (08:00),
  // we filter loosely for the grid view
  const getItemsForGrid = (day: string, timeSlot: string) => {
      const slotHour = parseInt(timeSlot.split(':')[0]);
      return scheduleItems.filter(i => {
          const itemHour = parseInt(i.time.split(':')[0]);
          return i.day === day && itemHour >= slotHour && itemHour < slotHour + 2;
      }).sort((a, b) => a.time.localeCompare(b.time)); // SORT BY TIME
  };

  const getItemsForDay = (day: string) => {
      return scheduleItems.filter(i => i.day === day).sort((a,b) => a.time.localeCompare(b.time));
  };

  const getProgress = (item: ExtendedScheduleItem) => {
      if (!item.subTasks || item.subTasks.length === 0) return 0;
      const completed = item.subTasks.filter(t => t.completed).length;
      return (completed / item.subTasks.length) * 100;
  };

  const getCategoryStyle = (catId: string) => {
      const cat = categories.find(c => c.id === catId);
      if (!cat) return { background: '#f3f4f6', color: '#000', border: '1px solid #e5e7eb' };
      return { 
          background: cat.color, 
          color: cat.textColor,
          border: `1px solid ${cat.color}`
      };
  };

  // Stats for Gamification
  const totalBlocks = scheduleItems.length;
  const completedBlocks = scheduleItems.filter(i => i.subTasks.length > 0 && i.subTasks.every(t => t.completed)).length;
  const weeklyEfficiency = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-[#FDFBF9] relative font-sans">
      
      {/* PRINT STYLES */}
      <style>{`
        @media print {
          @page { size: ${printMode}; margin: 5mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .planner-grid { border: 2px solid #000 !important; box-shadow: none !important; }
          .planner-cell { border: 1px solid #ddd !important; page-break-inside: avoid; }
          .planner-header { background-color: #f0f0f0 !important; color: black !important; border-bottom: 2px solid #000; }
          .print-portrait-container { display: flex; flex-direction: column; gap: 20px; }
          .print-portrait-day { border: 2px solid #000; padding: 10px; break-inside: avoid; }
        }
      `}</style>

      {/* 1. HEADER */}
      <div className="no-print px-6 py-4 md:px-8 md:py-6 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          
          <div className="flex flex-col gap-4 max-w-xl">
              <div>
                  <div className="flex items-center gap-2">
                      <h1 className="font-serif text-3xl md:text-4xl text-black tracking-tight">
                          {isTr ? 'Neural Blueprint' : 'Neural Blueprint'}
                      </h1>
                      <div className="bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">v3.3</div>
                  </div>
                  
                  {/* INSPIRATIONAL QUOTE */}
                  <motion.p 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-xs text-gray-500 font-serif italic mt-1 flex items-center gap-2"
                  >
                      <Quote className="w-3 h-3 text-gray-300 transform scale-x-[-1]" />
                      {dailyQuote}
                  </motion.p>
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-3">
                  {viewMode === 'day' && (
                      <button onClick={() => setViewMode('week')} className="p-1 hover:bg-gray-100 rounded-full mr-2" title="Back to Week">
                          <ArrowLeft className="w-5 h-5 text-gray-500" />
                      </button>
                  )}
                  <div className="flex items-center bg-gray-100 rounded-full p-1 border border-gray-200 shadow-inner">
                      <button onClick={() => changeWeek(-1)} className="p-1 hover:bg-white rounded-full shadow-sm transition-all"><ChevronLeft className="w-4 h-4" /></button>
                      <span className="px-3 font-mono text-xs font-bold w-24 text-center">{currentWeekId}</span>
                      <button onClick={() => changeWeek(1)} className="p-1 hover:bg-white rounded-full shadow-sm transition-all"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                  {viewMode === 'day' && (
                      <span className="text-sm font-bold ml-2 font-serif text-black">{dayLabels[days.indexOf(selectedDay)]}</span>
                  )}
              </div>
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-end md:pr-12 lg:pr-32">
              <button onClick={() => setIsSettingsOpen(true)} className="p-2 md:p-3 bg-white border border-gray-200 rounded-xl hover:border-black transition-all text-gray-500 hover:text-black shadow-sm">
                  <Settings className="w-4 h-4 md:w-5 md:h-5" />
              </button>

              <div className="relative group">
                  <button className="px-3 py-2 md:px-4 md:py-3 bg-white border border-gray-200 text-black text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-gray-50 hover:border-black transition-all flex items-center gap-2 shadow-sm">
                      <Download className="w-4 h-4" /> <span className="hidden sm:inline">PDF</span>
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden hidden group-hover:block z-50">
                      <button onClick={() => handlePrint('landscape')} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-xs font-bold flex items-center gap-2">
                          <LayoutTemplate className="w-4 h-4" /> Landscape (Grid)
                      </button>
                      <button onClick={() => handlePrint('portrait')} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-xs font-bold flex items-center gap-2 border-t border-gray-100">
                          <FileText className="w-4 h-4" /> Portrait (List)
                      </button>
                  </div>
              </div>

              <button 
                  onClick={() => openModal()}
                  className="px-4 py-2 md:px-6 md:py-3 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-lg hover:translate-y-[-2px]"
              >
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">{isTr ? 'Blok Ekle' : 'Add Block'}</span>
              </button>
          </div>
      </div>

      {/* 2. MAIN VIEW AREA */}
      <div className="flex-1 overflow-auto bg-[#FDFBF9] p-4 md:p-8 relative custom-scrollbar">
          
          {/* --- WEEKLY GRID VIEW --- */}
          {viewMode === 'week' && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white max-w-[1800px] mx-auto min-h-[600px] shadow-[0_0_50px_rgba(0,0,0,0.03)] border border-gray-200 p-6 md:p-8 relative planner-grid rounded-2xl"
              >
                    {/* Dot Grid Background */}
                    <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                    <div className="relative z-10 grid grid-cols-[50px_repeat(7,1fr)] border-t border-l border-gray-100">
                        
                        {/* Header Row */}
                        <div className="border-b border-r border-gray-100 bg-gray-50/50"></div>
                        {dayLabels.map((day, i) => {
                            const isToday = i === todayIndex;
                            return (
                                <div 
                                    key={day} 
                                    onClick={() => handleDayClick(i)}
                                    className={`planner-header border-b border-r border-gray-100 p-3 text-center cursor-pointer hover:bg-gray-100 transition-colors bg-white group`}
                                >
                                    <div className="flex flex-col items-center">
                                        <span className={`font-serif font-bold text-xs md:text-sm uppercase block tracking-wide ${isToday ? 'text-blue-600' : 'text-black'}`}>
                                            {day}
                                        </span>
                                        {isToday && <div className="w-1 h-1 bg-blue-500 rounded-full mt-1"></div>}
                                    </div>
                                    <span className="text-[9px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">View Day</span>
                                </div>
                            );
                        })}

                        {/* Time Slots (2-Hour Blocks) */}
                        {gridTimeSlots.map(time => (
                            <React.Fragment key={time}>
                                <div className="border-b border-r border-gray-100 p-2 text-center bg-white planner-cell">
                                    <span className="font-mono text-[10px] font-bold text-gray-400 block -mt-2">{time}</span>
                                </div>

                                {days.map((day, i) => {
                                    const items = getItemsForGrid(day, time);
                                    const isOver = dragOverCell?.day === day && dragOverCell?.time === time;
                                    
                                    return (
                                        <div 
                                            key={`${day}-${time}`}
                                            onDragOver={(e) => { e.preventDefault(); setDragOverCell({ day, time }); }}
                                            onDrop={(e) => handleDrop(e, day, time)}
                                            onClick={() => items.length === 0 && openModal(undefined, day, time)}
                                            className={`planner-cell border-b border-r border-gray-100 min-h-[100px] relative transition-all duration-200 p-1 group/cell flex flex-col gap-1
                                                ${isOver ? 'bg-blue-50/50 ring-2 ring-inset ring-blue-200' : 'bg-white hover:bg-gray-50'}
                                            `}
                                        >
                                            <AnimatePresence>
                                                {items.map(item => {
                                                    const catStyle = getCategoryStyle(item.categoryId);
                                                    const progress = getProgress(item);
                                                    
                                                    return (
                                                        <motion.div
                                                            layoutId={item.id}
                                                            key={item.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e as any, item.id)}
                                                            onClick={(e) => { e.stopPropagation(); openModal(item); }}
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            style={catStyle}
                                                            className={`
                                                                planner-block relative w-full mb-1 rounded-lg p-2 md:p-3 cursor-grab active:cursor-grabbing group select-none flex flex-col gap-1 overflow-hidden shadow-sm hover:shadow-md transition-shadow
                                                                ${draggedItem === item.id ? 'opacity-50' : 'opacity-100'}
                                                            `}
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex items-center gap-1 opacity-70">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                                                                    <span className="text-[7px] md:text-[8px] font-bold uppercase tracking-wider truncate max-w-[60px]">
                                                                        {categories.find(c => c.id === item.categoryId)?.label}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[9px] font-mono opacity-50">{item.time}</span>
                                                            </div>
                                                            
                                                            <p className="font-serif text-xs font-bold leading-tight line-clamp-2 md:line-clamp-3">
                                                                {item.subject}
                                                            </p>

                                                            {item.subTasks.length > 0 && (
                                                                <div className="mt-auto pt-1">
                                                                    <div className="h-1 w-full bg-black/10 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-current transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>
                                            
                                            {/* Subtle Hover Add Icon */}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-opacity">
                                                {items.length === 0 && <Plus className="w-4 h-4 text-gray-300" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
              </motion.div>
          )}

          {/* ... (Single Day View and Print layout remain same) ... */}
          {/* --- SINGLE DAY FOCUS VIEW --- */}
          {viewMode === 'day' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl mx-auto bg-white rounded-3xl p-8 shadow-xl border border-gray-100 min-h-[800px] relative"
              >
                  <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                      <div>
                          <h2 className="font-serif text-4xl text-black">{dayLabels[days.indexOf(selectedDay)]} Agenda</h2>
                          <p className="text-gray-400 font-mono text-xs uppercase tracking-widest mt-1">Detailed Timeline</p>
                      </div>
                      <button onClick={() => openModal(undefined, selectedDay)} className="px-6 py-3 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center gap-2">
                          <Plus className="w-4 h-4" /> {isTr ? 'Hızlı Ekle' : 'Quick Add'}
                      </button>
                  </div>

                  <div className="space-y-4">
                      {getItemsForDay(selectedDay).length === 0 && (
                          <div className="text-center py-20 text-gray-300">
                              <p>{isTr ? 'Bu gün için plan yok.' : 'No plans for this day.'}</p>
                          </div>
                      )}
                      
                      {getItemsForDay(selectedDay).map((item) => {
                          const catStyle = getCategoryStyle(item.categoryId);
                          return (
                              <div key={item.id} className="flex gap-4 group" onClick={() => openModal(item)}>
                                  <div className="w-20 pt-2 text-right">
                                      <span className="font-mono text-sm font-bold text-gray-900">{item.time}</span>
                                  </div>
                                  <div 
                                    className="flex-1 p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md"
                                    style={catStyle}
                                  >
                                      <div className="flex justify-between items-start mb-2">
                                          <span className="text-[10px] uppercase font-bold tracking-widest opacity-70">
                                              {categories.find(c => c.id === item.categoryId)?.label}
                                          </span>
                                          <MoreHorizontal className="w-4 h-4 opacity-0 group-hover:opacity-50" />
                                      </div>
                                      <h3 className="font-serif text-xl font-bold mb-2">{item.subject}</h3>
                                      {item.subTasks.length > 0 && (
                                          <div className="space-y-1">
                                              {item.subTasks.map(st => (
                                                  <div key={st.id} className="flex items-center gap-2 text-xs opacity-80">
                                                      <div className={`w-3 h-3 border border-current flex items-center justify-center ${st.completed ? 'bg-current' : ''}`}>
                                                          {st.completed && <CheckSquare className="w-2 h-2 text-white" />}
                                                      </div>
                                                      <span className={st.completed ? 'line-through' : ''}>{st.text}</span>
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </motion.div>
          )}

          {/* PORTRAIT PRINT LAYOUT (Hidden on Screen) */}
          <div className={`hidden ${printMode === 'portrait' ? 'print:block' : ''} bg-white p-8`}>
              <div className="mb-8 border-b-2 border-black pb-4">
                  <h1 className="text-3xl font-serif font-bold">NEURAL AGENDA</h1>
                  <span className="font-mono text-sm">{currentWeekId} // {user.name}</span>
              </div>
              <div className="print-portrait-container space-y-6">
                  {days.map(day => {
                      const dayItems = scheduleItems.filter(i => i.day === day).sort((a,b) => a.time.localeCompare(b.time));
                      if (dayItems.length === 0) return null;
                      return (
                          <div key={day} className="print-portrait-day">
                              <h3 className="font-serif text-xl font-bold border-b border-black pb-2 mb-3 bg-gray-100 p-2">{day}</h3>
                              <div className="space-y-2">
                                  {dayItems.map(item => (
                                      <div key={item.id} className="flex gap-4 items-center border-b border-gray-100 pb-2">
                                          <span className="font-mono text-sm font-bold w-16">{item.time}</span>
                                          <div className="flex-1">
                                              <div className="font-bold text-sm">{item.subject}</div>
                                              <div className="text-xs text-gray-500 uppercase tracking-widest">{categories.find(c=>c.id===item.categoryId)?.label}</div>
                                              {item.subTasks.length > 0 && (
                                                  <div className="ml-4 mt-1 space-y-1">
                                                      {item.subTasks.map(st => (
                                                          <div key={st.id} className="flex items-center gap-2 text-xs">
                                                              <div className="w-3 h-3 border border-black"></div> {st.text}
                                                          </div>
                                                      ))}
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>

      </div>

      {/* ... (Modals remain same) ... */}
      {/* CATEGORY SETTINGS MODAL */}
      <AnimatePresence>
          {isSettingsOpen && (
              <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 no-print"
                  onClick={() => setIsSettingsOpen(false)}
              >
                  <motion.div 
                      initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-8"
                  >
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-serif text-2xl font-bold flex items-center gap-2">
                              <Palette className="w-6 h-6" /> {isTr ? 'Kategoriler' : 'Categories'}
                          </h3>
                          <button onClick={() => setIsSettingsOpen(false)}><X className="w-5 h-5" /></button>
                      </div>

                      <div className="space-y-4 mb-8 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                          {categories.map(cat => (
                              <div key={cat.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 group">
                                  <div className="w-8 h-8 rounded-full border shadow-sm" style={{ backgroundColor: cat.color }}></div>
                                  <span className="flex-1 font-bold text-sm">{cat.label}</span>
                                  <button onClick={() => deleteCategory(cat.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                          ))}
                      </div>

                      <div className="border-t border-gray-100 pt-6">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">Yeni Kategori Ekle</label>
                          <div className="flex gap-2">
                              <input 
                                  value={newCatName} 
                                  onChange={(e) => setNewCatName(e.target.value)} 
                                  placeholder="Kategori Adı" 
                                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-black outline-none"
                              />
                              <input 
                                  type="color" 
                                  value={newCatColor} 
                                  onChange={(e) => setNewCatColor(e.target.value)} 
                                  className="w-12 h-10 rounded-xl border-none p-0 cursor-pointer overflow-hidden"
                              />
                              <button onClick={addCategory} className="bg-black text-white p-2 rounded-xl">
                                  <Plus className="w-5 h-5" />
                              </button>
                          </div>
                      </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* TASK EDITOR MODAL */}
      <AnimatePresence>
        {isModalOpen && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 no-print"
                onClick={() => setIsModalOpen(false)}
            >
                <motion.div 
                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                >
                    <div className="bg-[#FAFAFA] p-6 md:p-8 border-b border-gray-100 flex justify-between items-center shrink-0">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">
                                {isTr ? 'PLANLAMA MOTORU' : 'PLANNING ENGINE'}
                            </span>
                            <h3 className="font-serif text-2xl font-bold">
                                {editingItem ? (isTr ? 'Bloğu Düzenle' : 'Edit Block') : (isTr ? 'Yeni Blok' : 'New Block')}
                            </h3>
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="bg-white p-2 rounded-full border border-gray-200 hover:border-black transition-colors"><X className="w-5 h-5" /></button>
                    </div>
                    
                    <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
                        
                        <div className="space-y-4">
                            <input 
                                value={formSubject}
                                onChange={(e) => setFormSubject(e.target.value)}
                                className="w-full p-4 border border-gray-200 rounded-2xl text-xl font-serif focus:border-black outline-none bg-white transition-shadow shadow-sm focus:shadow-md"
                                placeholder={isTr ? "Ne üzerinde çalışacaksın?" : "Task Name..."}
                                autoFocus
                            />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">{isTr ? 'Gün' : 'Day'}</label>
                                    <select value={formDay} onChange={(e) => setFormDay(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none">
                                        {days.map((d, i) => <option key={d} value={d}>{dayLabels[i]}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block flex items-center gap-2"><Clock className="w-3 h-3"/> {isTr ? 'Başlangıç Saati' : 'Start Time'}</label>
                                    <select value={formTime} onChange={(e) => setFormTime(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none">
                                        {detailedTimeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">{isTr ? 'Kategori' : 'Category'}</label>
                                <div className="flex flex-wrap gap-2">
                                    {categories.map((cat) => (
                                        <button 
                                            key={cat.id}
                                            onClick={() => setFormCategory(cat.id)}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all border flex items-center gap-2
                                                ${formCategory === cat.id ? 'ring-2 ring-offset-1 ring-black' : 'border-gray-200 text-gray-500 hover:border-black'}
                                            `}
                                            style={formCategory === cat.id ? { backgroundColor: cat.color, color: cat.textColor, borderColor: cat.color } : {}}
                                        >
                                            <div className="w-2 h-2 rounded-full bg-current"></div>
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Subtasks */}
                        <div className="border-t border-gray-100 pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <ListTodo className="w-3 h-3" /> {isTr ? 'Alt Görevler' : 'Subtasks'}
                                </label>
                                <span className="text-[10px] font-mono text-gray-400">{formSubTasks.filter(t=>t.completed).length}/{formSubTasks.length}</span>
                            </div>

                            <div className="space-y-2 mb-4">
                                {formSubTasks.map(task => (
                                    <div key={task.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 group">
                                        <button 
                                            onClick={() => setFormSubTasks(prev => prev.map(t => t.id === task.id ? {...t, completed: !t.completed} : t))}
                                            className={`text-gray-400 hover:text-black transition-colors ${task.completed ? 'text-green-500' : ''}`}
                                        >
                                            {task.completed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                        </button>
                                        <span className={`flex-1 text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                            {task.text}
                                        </span>
                                        <button onClick={() => deleteFormSubTask(task.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <input 
                                    value={newTaskInput}
                                    onChange={(e) => setNewTaskInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addSubTask()}
                                    className="flex-1 p-3 text-sm border border-gray-200 rounded-xl focus:border-black outline-none"
                                    placeholder={isTr ? "+ Görev Ekle" : "+ Add Subtask"}
                                />
                                <button onClick={addSubTask} className="p-3 bg-gray-100 rounded-xl hover:bg-black hover:text-white transition-colors">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 flex justify-between bg-gray-50 shrink-0">
                        {editingItem ? (
                            <button 
                                onClick={() => handleDeleteItem(editingItem.id)}
                                className="px-6 py-3 bg-white border border-red-200 text-red-500 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-red-50 transition-all"
                            >
                                {isTr ? 'Sil' : 'Delete'}
                            </button>
                        ) : ( <div></div> )}
                        
                        <button 
                            onClick={handleSaveItem}
                            className="px-8 py-3 bg-black text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-neutral-800 transition-all shadow-lg flex items-center gap-2"
                        >
                            <Calendar className="w-4 h-4" /> {isTr ? 'Kaydet' : 'Save'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
