import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScheduleItem, Language, User } from '../types';
import { Plus, X, Trash2, Clock, BookOpen, Coffee, RefreshCcw } from 'lucide-react';

interface ScheduleProps {
  language: Language;
  user: User;
}

export default function Schedule({ language, user }: ScheduleProps) {
  const isTr = language === 'tr';
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const times = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

  // State
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [selectedTime, setSelectedTime] = useState(times[0]);
  const [subject, setSubject] = useState("");
  const [type, setType] = useState<'lecture' | 'study' | 'break'>('study');

  // Load from LocalStorage on mount (User Specific)
  useEffect(() => {
    if (!user) return;
    const key = `neurally_schedule_${user.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure it's an array
        if (Array.isArray(parsed)) {
            setScheduleItems(parsed);
        }
      } catch (e) {
        console.error("Schedule parse error", e);
      }
    } else {
        setScheduleItems([]);
    }
  }, [user]);

  // Save to LocalStorage on change (User Specific)
  useEffect(() => {
    if (!user) return;
    const key = `neurally_schedule_${user.id}`;
    localStorage.setItem(key, JSON.stringify(scheduleItems));
  }, [scheduleItems, user]);

  const handleAddItem = () => {
    if (!subject) return;

    const newItem: ScheduleItem = {
      id: Date.now().toString(),
      day: selectedDay,
      time: selectedTime,
      subject,
      type
    };

    setScheduleItems(prev => [...prev, newItem]);
    resetForm();
    setIsModalOpen(false);
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setScheduleItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearAll = () => {
      if(confirm(isTr ? "Tüm program silinsin mi?" : "Clear entire schedule?")) {
          setScheduleItems([]);
      }
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
    <div className="p-8 lg:p-16 max-w-[1800px] mx-auto min-h-screen bg-white relative">
      
      {/* Header */}
      <div className="mb-12 border-b border-black pb-6 flex justify-between items-end">
         <div>
            <h1 className="font-serif text-5xl text-black">{isTr ? 'Haftalık Protokol' : 'Weekly Protocol'}</h1>
            <p className="font-mono text-xs text-gray-400 mt-2 uppercase tracking-widest">
               {isTr ? 'Rutini Tasarla. Zamanı Yönet.' : 'Design your routine. Master your time.'}
            </p>
         </div>
         <div className="flex gap-4">
             {scheduleItems.length > 0 && (
                 <button 
                    onClick={handleClearAll}
                    title={isTr ? "Tümünü Temizle" : "Clear All"}
                    className="px-4 py-3 border border-gray-200 text-gray-400 text-xs font-bold uppercase tracking-widest hover:border-red-500 hover:text-red-500 transition-all"
                 >
                    <Trash2 className="w-4 h-4" />
                 </button>
             )}
             <button 
                onClick={() => setIsModalOpen(true)}
                title={isTr ? "Yeni Blok Ekle" : "Add New Block"}
                className="px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center gap-2"
             >
                <Plus className="w-4 h-4" /> {isTr ? 'Blok Ekle' : 'Add Block'}
             </button>
         </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto pb-12 custom-scrollbar">
        <div className="min-w-[1000px] border-l border-t border-black select-none">
           
           {/* Header Row (Days) */}
           <div className="grid grid-cols-8 border-b border-black">
              <div className="p-4 border-r border-black bg-gray-50 flex items-center justify-center font-mono text-xs font-bold uppercase text-gray-400">
                 {isTr ? 'Saat / Gün' : 'Time / Day'}
              </div>
              {days.map(day => (
                 <div key={day} className="p-4 border-r border-black font-serif font-bold text-center bg-white text-black text-sm uppercase tracking-wide">
                    {isTr ? day.substring(0, 3) : day.substring(0, 3)}
                 </div>
              ))}
           </div>

           {/* Time Rows */}
           {times.map(time => (
              <div key={time} className="grid grid-cols-8 border-b border-black h-32">
                 {/* Time Label */}
                 <div className="p-4 border-r border-black bg-gray-50 flex items-start justify-center font-mono text-xs font-bold text-gray-400 pt-6">
                    {time}
                 </div>

                 {/* Day Cells */}
                 {days.map(day => {
                    const items = getItemsForCell(day, time);
                    return (
                       <div key={`${day}-${time}`} className="border-r border-black p-2 relative group hover:bg-gray-50 transition-colors">
                          
                          {/* Existing Items */}
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
                                            title={isTr ? "Sil" : "Delete"}
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
                          
                          {/* Empty Cell Hover Add Button - Only shows if cell isn't full */}
                          {items.length < 2 && (
                             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <button 
                                    onClick={() => openModalForCell(day, time)}
                                    title={isTr ? "Buraya Ekle" : "Add Here"}
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
        </div>
      </div>

      {/* ADD MODAL */}
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
                        {/* Day & Time Selection */}
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
                                    {times.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Subject */}
                        <div>
                             <label className="text-[10px] font-bold uppercase tracking-widest block mb-2">{isTr ? 'Konu / Ders' : 'Subject / Task'}</label>
                             <input 
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder={isTr ? "Örn: Matematik (Türev)" : "e.g. Math (Calculus)"}
                                className="w-full p-3 border border-gray-200 font-serif text-lg focus:border-black outline-none"
                                autoFocus
                             />
                        </div>

                        {/* Type Selection */}
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