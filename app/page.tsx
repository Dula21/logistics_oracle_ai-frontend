"use client";
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, CheckCircle, Package, TrendingUp } from 'lucide-react';

export default function LogisticsDashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Fetching the JSON data from your FastAPI Brain
    fetch('http://localhost:8000/api/forecast')
      .then(res => res.json())
      .then(data => setData(data))
      .catch(err => {
        console.error("Brain not found:", err);
        setError(true);
      });
  }, []);

  if (error) return <div className="p-10 text-red-500 font-bold text-center">❌ Brain (FastAPI) is offline. Start your Python server!</div>;
  if (!data) return <div className="p-10 text-center animate-pulse text-blue-600 font-bold">📡 Oracle is syncing with JAFZA data...</div>;

  // LOGIC: Red Alert if avg sales are high (risk of stockout)
  const isHighRisk = data.avg_sales > 150;

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-10 font-sans text-slate-800">
      {/* HEADER SECTION */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">LOGISTICS <span className="text-blue-600">ORACLE</span></h1>
          <p className="text-slate-500 font-medium italic">UAE Distribution Hub - Predictive Analysis</p>
        </div>
        
        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl shadow-sm border-2 font-bold ${isHighRisk ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
          {isHighRisk ? <AlertTriangle className="animate-bounce" /> : <CheckCircle />}
          {isHighRisk ? "CRITICAL: STOCKOUT RISK" : "INVENTORY STABLE"}
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CHART SECTION */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="text-blue-600" /> 14-Day Sales Velocity</h2>
            <div className="text-right text-sm text-slate-400">Model: Prophet v1.1</div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dates.map((d: string, i: number) => ({ date: d.split('T')[0], sales: data.values[i] }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickMargin={10} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={4} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI ADVICE PANEL */}
        <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl flex flex-col relative overflow-hidden">
          <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-blue-600 opacity-20 rounded-full blur-3xl"></div>
          
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 relative z-10">
            🤖 <span className="text-blue-400">AI</span> Strategy
          </h2>
          
          <div className="flex-grow bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 relative z-10">
            <p className="text-slate-300 leading-relaxed italic text-lg italic font-serif">
              "{data.advice}"
            </p>
          </div>

          <div className="mt-10 flex items-center gap-4 relative z-10">
            <div className="p-3 bg-blue-600 rounded-xl font-bold text-xl">
              {Math.round(data.avg_sales)}
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Avg Units / Day</p>
              <p className="text-sm font-semibold text-blue-400">Projected Demand</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}