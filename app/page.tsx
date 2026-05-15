"use client";
"use client";
import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Zap, Send, Sparkles, Box, BarChart3, Filter, MessageCircle } from 'lucide-react';

export default function LogisticsDashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [timeFilter, setTimeFilter] = useState("14D");
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    fetch('http://localhost:8000/api/forecast')
      .then(res => res.json())
      .then(data => setData(data))
      .catch(err => setError(true));
  }, []);

  if (error) return <div className="p-10 text-red-500 font-bold text-center">Backend Connection Failed</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-blue-600 font-black animate-pulse">ORACLE SYNCING...</div>;

  // Converts the long paragraph into clean bullet points
  const formatBulletPoints = (text: string) => {
    return text.split(/\d+\.\s/).filter(item => item.trim() !== "").map((point, index) => {
      const [title, ...desc] = point.split(":");
      return (
        <div key={index} className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm mb-3">
          <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
            {index + 1}
          </div>
          <div>
            <span className="font-black text-slate-800 uppercase text-xs tracking-wider block mb-1">
              {title.replaceAll("**", "").trim()}
            </span>
            <p className="text-slate-500 text-sm leading-relaxed font-medium">
              {desc.join(":").replaceAll("**", "").trim()}
            </p>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-sans text-slate-800">
      
      {/* 1. TOP HEADER */}
      <div className="max-w-7xl mx-auto flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
            COMMAND <span className="text-blue-600">ORACLE</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em] mt-1">JAFZA Logistics Control</p>
        </div>
        
        {/* TIME FILTER TABS */}
        <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200">
          {["7D", "14D", "30D"].map((t) => (
            <button 
              key={t}
              onClick={() => setTimeFilter(t)}
              className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${timeFilter === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8">
        
        {/* 2. MAIN ANALYTICS SECTION (LEFT 8 COLUMNS) */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          
          {/* STATS OVERVIEW */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Next 24h</p>
              <h3 className="text-3xl font-black">{Math.round(data.values[0])} <span className="text-sm font-normal text-slate-400">u</span></h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Avg Demand</p>
              <h3 className="text-3xl font-black">{Math.round(data.avg_sales)}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Reliability</p>
              <h3 className="text-3xl font-black text-emerald-500">94%</h3>
            </div>
          </div>

          {/* MAIN CHART */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
              <TrendingUp size={16} /> Velocity Forecast
            </h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dates.map((d: any, i: number) => ({ date: d.split('T')[0], sales: data.values[i] }))}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" hide />
                  <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={3} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* POINT-TO-POINT STRATEGY BOX (Now clean and separate) */}
          <div className="space-y-4">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
              <Sparkles size={14} className="text-blue-500" /> Strategic Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formatBulletPoints(data.advice)}
            </div>
          </div>
        </div>

        {/* 3. SEPARATE CONVERSATION PANEL (RIGHT 4 COLUMNS) */}
        <div className="col-span-12 lg:col-span-4">
          <div className="sticky top-10 bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl h-[calc(100vh-80px)] flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/50">
                <MessageCircle className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-white font-black text-lg tracking-tight">Oracle Chat</h2>
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Llama 3.3 Active</p>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto mb-6 space-y-4 pr-2 custom-scrollbar">
              <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none text-slate-300 text-sm border border-slate-700">
                Data loaded. I'm ready to answer specific questions about your **JAFZA-04** inventory or forecast peaks.
              </div>
            </div>

            <div className="relative mt-auto">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask follow-up..."
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-5 pr-14 text-sm focus:outline-none focus:border-blue-500 transition-all text-white placeholder:text-slate-500"
              />
              <button className="absolute right-2 top-2 p-2.5 bg-blue-600 rounded-xl text-white hover:bg-blue-500 active:scale-95 transition-all">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}