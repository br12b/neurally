import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Activity, Users, DollarSign, Server, Terminal, AlertTriangle, Search, CheckCircle, XCircle, ChevronUp, Lock, Unlock, Cpu, Database } from 'lucide-react';
import { User, Language } from '../types';

interface AdminPanelProps {
  user: User; // Current admin user
  updateUserTier: (tier: 'Free' | 'Scholar' | 'Fellow') => void; // Function to update self for testing
}

// Mock User Data for visualization
const MOCK_USERS = [
    { id: 'u-1', name: 'John Doe', email: 'john@example.com', tier: 'Free', status: 'Active', lastActive: '2m ago' },
    { id: 'u-2', name: 'Sarah Connor', email: 'sarah@skynet.com', tier: 'Fellow', status: 'Active', lastActive: '5h ago' },
    { id: 'u-3', name: 'Neo Anderson', email: 'theone@matrix.com', tier: 'Scholar', status: 'Banned', lastActive: '999 days ago' },
    { id: 'u-4', name: 'Alice Wonderland', email: 'alice@rabbit.hole', tier: 'Free', status: 'Active', lastActive: '1d ago' },
    { id: 'u-5', name: 'Rick Sanchez', email: 'wubba@lubba.dub', tier: 'Fellow', status: 'Active', lastActive: 'Just now' },
];

export default function AdminPanel({ user, updateUserTier }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'system' | 'logs'>('system');
  const [userList, setUserList] = useState(MOCK_USERS);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Real-time chart simulation
  const [cpuUsage, setCpuUsage] = useState(12);
  const [tokenUsage, setTokenUsage] = useState(8432);

  useEffect(() => {
      const interval = setInterval(() => {
          setCpuUsage(prev => Math.min(100, Math.max(0, prev + (Math.random() * 10 - 5))));
          setTokenUsage(prev => prev + Math.floor(Math.random() * 50));
      }, 1000);
      return () => clearInterval(interval);
  }, []);

  // Filter users including the CURRENT user (to allow self-promotion for testing)
  const allUsers = [
      { id: user.id, name: user.name + " (YOU)", email: user.email, tier: user.tier, status: 'Admin', lastActive: 'Now' },
      ...userList
  ];

  const filteredUsers = allUsers.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTierChange = (userId: string, newTier: string) => {
      if (userId === user.id) {
          updateUserTier(newTier as any);
      } else {
          setUserList(prev => prev.map(u => u.id === userId ? { ...u, tier: newTier as any } : u));
      }
  };

  const handleBanToggle = (userId: string) => {
      if (userId === user.id) { alert("You cannot ban yourself, Architect."); return; }
      setUserList(prev => prev.map(u => u.id === userId ? { ...u, status: u.status === 'Banned' ? 'Active' : 'Banned' } : u));
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-200 font-sans p-8 lg:p-12 overflow-y-auto custom-scrollbar">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-12 border-b border-gray-800 pb-8">
            <div>
                <h1 className="font-serif text-5xl text-white mb-2 flex items-center gap-3">
                    Overwatch <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded font-mono tracking-widest uppercase">Admin</span>
                </h1>
                <p className="text-gray-500 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" /> System Architecture Control
                </p>
            </div>
            <div className="flex gap-4">
                <button 
                    onClick={() => setActiveTab('system')} 
                    className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'system' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                >
                    System
                </button>
                <button 
                    onClick={() => setActiveTab('users')} 
                    className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'users' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                >
                    Users
                </button>
            </div>
        </div>

        {/* SYSTEM DASHBOARD */}
        {activeTab === 'system' && (
            <div className="space-y-8">
                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-[#111] border border-gray-800 p-6 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Users className="w-16 h-16" /></div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Users</div>
                        <div className="text-3xl font-mono text-white">12,403</div>
                        <div className="text-green-500 text-xs mt-2 flex items-center gap-1"><ChevronUp className="w-3 h-3" /> +12% this week</div>
                    </div>
                    <div className="bg-[#111] border border-gray-800 p-6 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><DollarSign className="w-16 h-16" /></div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">MRR (Est.)</div>
                        <div className="text-3xl font-mono text-white">$4,290</div>
                        <div className="text-gray-500 text-xs mt-2">Recurring Revenue</div>
                    </div>
                    <div className="bg-[#111] border border-gray-800 p-6 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Cpu className="w-16 h-16" /></div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Gemini Tokens</div>
                        <div className="text-3xl font-mono text-white">{tokenUsage.toLocaleString()}</div>
                        <div className="text-blue-500 text-xs mt-2">API Cost: ${(tokenUsage * 0.000001).toFixed(4)}</div>
                    </div>
                    <div className="bg-[#111] border border-gray-800 p-6 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Activity className="w-16 h-16" /></div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">System Health</div>
                        <div className="text-3xl font-mono text-green-500">99.9%</div>
                        <div className="w-full bg-gray-800 h-1 mt-3 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 w-[99%]"></div>
                        </div>
                    </div>
                </div>

                {/* SERVER TERMINAL */}
                <div className="bg-[#050505] border border-gray-800 rounded-xl p-6 font-mono text-xs overflow-hidden">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
                        <Terminal className="w-4 h-4 text-green-500" />
                        <span className="text-gray-400">System Logs / Realtime</span>
                    </div>
                    <div className="space-y-1 text-gray-500 h-64 overflow-y-auto custom-scrollbar flex flex-col-reverse">
                        <p><span className="text-green-600">[SUCCESS]</span> User {user.id} accessed admin panel.</p>
                        <p><span className="text-blue-600">[INFO]</span> Gemini 2.5 API latency: 120ms</p>
                        <p><span className="text-yellow-600">[WARN]</span> High traffic detected in 'SpeedRun' module.</p>
                        <p><span className="text-green-600">[SUCCESS]</span> Database sync completed.</p>
                        <p><span className="text-blue-600">[INFO]</span> New user registration: u-9923</p>
                        {[...Array(10)].map((_, i) => (
                             <p key={i} className="opacity-50">Log entry #{9900-i}: Routine check passed.</p>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* USERS MANAGEMENT */}
        {activeTab === 'users' && (
            <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
                {/* User Search Bar */}
                <div className="p-4 border-b border-gray-800 flex items-center gap-4">
                    <Search className="w-4 h-4 text-gray-500" />
                    <input 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search users by name or email..."
                        className="bg-transparent border-none focus:ring-0 text-white w-full placeholder:text-gray-600 font-mono text-sm"
                    />
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-6 p-4 bg-[#151515] border-b border-gray-800 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    <div className="col-span-2">User</div>
                    <div>Status</div>
                    <div>Tier</div>
                    <div>Last Active</div>
                    <div className="text-right">Actions</div>
                </div>

                {/* User Rows */}
                <div className="divide-y divide-gray-800">
                    {filteredUsers.map(u => (
                        <div key={u.id} className="grid grid-cols-6 p-4 items-center hover:bg-[#151515] transition-colors group">
                            <div className="col-span-2">
                                <div className="font-bold text-white text-sm">{u.name}</div>
                                <div className="text-xs text-gray-500 font-mono">{u.email}</div>
                                <div className="text-[10px] text-gray-600 font-mono">ID: {u.id}</div>
                            </div>
                            <div>
                                <span className={`
                                    px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide
                                    ${u.status === 'Active' ? 'bg-green-900/30 text-green-500' : u.status === 'Admin' ? 'bg-purple-900/30 text-purple-500' : 'bg-red-900/30 text-red-500'}
                                `}>
                                    {u.status}
                                </span>
                            </div>
                            <div>
                                <select 
                                    value={u.tier}
                                    onChange={(e) => handleTierChange(u.id, e.target.value)}
                                    className="bg-black border border-gray-700 text-xs text-white rounded px-2 py-1 focus:border-white outline-none"
                                >
                                    <option value="Free">Free</option>
                                    <option value="Scholar">Scholar</option>
                                    <option value="Fellow">Fellow (Pro)</option>
                                </select>
                            </div>
                            <div className="text-xs text-gray-400 font-mono">{u.lastActive}</div>
                            <div className="text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleBanToggle(u.id)}
                                    title={u.status === 'Banned' ? 'Unban' : 'Ban'}
                                    className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
                                >
                                    {u.status === 'Banned' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                </button>
                                <button className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors">
                                    <Database className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

    </div>
  );
}