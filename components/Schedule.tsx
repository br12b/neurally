import React from 'react';
import { motion } from 'framer-motion';
import { ScheduleItem, Language } from '../types';

interface ScheduleProps {
  language: Language;
}

export default function Schedule({ language }: ScheduleProps) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const times = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

  // Mock Data
  const scheduleItems: ScheduleItem[] = [
    { id: '1', day: 'Monday', time: '08:00', subject: 'Biology (Cell)', type: 'lecture' },
    { id: '2', day: 'Monday', time: '14:00', subject: 'Flashcards', type: 'study' },
    { id: '3', day: 'Wednesday', time: '10:00', subject: 'Math (Limits)', type: 'lecture' },
    { id: '4', day: 'Friday', time: '16:00', subject: 'Physics Review', type: 'study' },
    { id: '5', day: 'Saturday', time: '10:00', subject: 'Mock Exam', type: 'break' },
  ];

  const getItemsForCell = (day: string, time: string) => {
    return scheduleItems.filter(item => item.day === day && item.time === time);
  };

  return (
    <div className="p-8 lg:p-16 max-w-[1800px] mx-auto min-h-screen bg-white">
      
      <div className="mb-12 border-b border-black pb-6 flex justify-between items-end">
         <div>
            <h1 className="font-serif text-5xl text-black">Weekly Protocol</h1>
            <p className="font-mono text-xs text-gray-400 mt-2 uppercase tracking-widest">
               Design your routine. Master your time.
            </p>
         </div>
         <button className="px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all">
            + Add Block
         </button>
      </div>

      <div className="overflow-x-auto pb-12">
        <div className="min-w-[1000px] border-l border-t border-black">
           
           {/* Header Row */}
           <div className="grid grid-cols-8 border-b border-black">
              <div className="p-4 border-r border-black bg-gray-50 flex items-center justify-center font-mono text-xs font-bold uppercase text-gray-400">
                 Time / Day
              </div>
              {days.map(day => (
                 <div key={day} className="p-4 border-r border-black font-serif font-bold text-center bg-white text-black text-sm">
                    {day}
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
                          {items.map(item => (
                             <motion.div 
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`
                                   w-full h-full p-3 border border-black flex flex-col justify-between cursor-pointer hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all
                                   ${item.type === 'lecture' ? 'bg-white' : item.type === 'study' ? 'bg-black text-white' : 'bg-gray-200'}
                                `}
                             >
                                <span className="font-mono text-[10px] opacity-70 uppercase tracking-wider">
                                   {item.type}
                                </span>
                                <span className={`font-serif text-sm font-bold leading-tight ${item.type === 'study' ? 'text-white' : 'text-black'}`}>
                                   {item.subject}
                                </span>
                             </motion.div>
                          ))}
                          
                          {/* Empty Cell Hover Add */}
                          {items.length === 0 && (
                             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="text-gray-300 hover:text-black transition-colors">
                                   <span className="text-2xl font-light">+</span>
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

    </div>
  );
}