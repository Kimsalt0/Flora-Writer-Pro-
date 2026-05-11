import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Novel, WritingStat, ViewType } from '../types';
import { motion } from 'motion/react';
import { ArrowLeft, Clock, BarChart2, PieChart as PieChartIcon, Calendar, Info, Flower2, BookOpen, PenTool } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

const VIEW_COLORS: Record<string, string> = {
  manuscrit: '#9FAA74',
  perso_principaux: '#C66F80',
  lieux: '#D44084',
  organigramme: '#3B5226',
  notes_idees: '#FFCE99',
  settings: '#71717a'
};

const VIEW_LABELS: Record<string, string> = {
  manuscrit: 'Écriture (Manuscrit)',
  perso_principaux: 'Personnages',
  lieux: 'Lieux & Monde',
  organigramme: 'Schéma Narratif',
  notes_idees: 'Notes & Idées',
  settings: 'Configuration'
};

export default function WritingStatsDetails({ novel, onBack, accentColor, theme }: { novel: Novel, onBack: () => void, accentColor?: string, theme: 'dark' | 'light' }) {
  const [stats, setStats] = useState<WritingStat[]>([]);
  const [timeframe, setTimeframe] = useState<'semaine' | 'jour'>('semaine');
  const [selectedDay, setSelectedDay] = useState<WritingStat | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'novels', novel.id, 'writing_stats'), orderBy('id', 'desc'), limit(30));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WritingStat));
      setStats(data.reverse());
      if (data.length > 0) setSelectedDay(data[data.length - 1]);
    });
  }, [novel.id]);

  const totalMinutes = stats.slice(-7).reduce((acc, s) => acc + s.minutes, 0);

  // Grouped breakdown for the week
  const weekBreakdown = stats.slice(-7).reduce((acc, s) => {
    if (s.breakdown) {
      Object.entries(s.breakdown).forEach(([key, val]) => {
        acc[key] = (acc[key] || 0) + val;
      });
    }
    return acc;
  }, {} as Record<string, number>);

  const barData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const id = d.toISOString().split('T')[0];
    const stat = stats.find(s => s.id === id);
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return {
      id,
      label: dayNames[d.getDay()],
      minutes: stat ? stat.minutes : 0,
      breakdown: stat ? stat.breakdown : {}
    };
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-50 dark:bg-zinc-950 overflow-y-auto custom-scrollbar">
      {/* Selection Tabs */}
      <div className="p-8 pb-0">
        <div className="max-w-md mx-auto p-1.5 bg-zinc-200/50 dark:bg-zinc-400/10 rounded-full flex gap-1">
          <button 
            onClick={() => setTimeframe('semaine')}
            className={`flex-1 py-3 rounded-full text-sm font-medium transition-all ${timeframe === 'semaine' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500'}`}
          >
            Semaine
          </button>
          <button 
            onClick={() => setTimeframe('jour')}
            className={`flex-1 py-3 rounded-full text-sm font-medium transition-all ${timeframe === 'jour' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500'}`}
          >
            Jour
          </button>
        </div>
      </div>

      <main className="p-8 max-w-5xl mx-auto w-full space-y-6 pb-32">
        {/* Main Stats Card */}
        <div className="p-8 rounded-[2.5rem] bg-white dark:bg-zinc-900 shadow-xl border border-zinc-100 dark:border-white/20 relative overflow-hidden">
          <div className="relative z-10">
            <header className="mb-8">
              <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mb-1 font-sans">Temps d'écriture</h2>
              <p className="font-serif italic text-base text-zinc-500 dark:text-zinc-400 leading-tight">Cette semaine</p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-5xl font-serif font-black text-zinc-900 dark:text-white">{totalMinutes}</span>
                <span className="text-2xl font-serif font-black text-zinc-900 dark:text-white">min</span>
              </div>
            </header>

            <div className="h-48 w-full mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#A1A1AA', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-zinc-800 shadow-xl p-3 rounded-2xl border border-zinc-100 dark:border-white/5">
                            <p className="text-xl font-serif font-black text-zinc-900 dark:text-white">{payload[0].value} <span className="text-xs">min</span></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="minutes" 
                    radius={[6, 6, 6, 6]}
                    barSize={32}
                  >
                    {barData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.minutes > 0 ? (accentColor || '#C66F80') : theme === 'dark' ? '#27272a' : '#F4F4F5'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-center flex-wrap gap-x-8 gap-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#9FAA74]" />
                <span className="text-xs font-medium text-zinc-500">Construction</span>
                <span className="text-xs font-bold text-zinc-900 dark:text-white ml-0.5">{weekBreakdown.manuscrit || 0} min</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#C66F80]" />
                <span className="text-xs font-medium text-zinc-500">Écriture</span>
                <span className="text-xs font-bold text-zinc-900 dark:text-white ml-0.5">0 min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Minuteur de Session Card */}
        <div className="p-8 rounded-[2.5rem] bg-white dark:bg-zinc-900 shadow-xl border border-zinc-100 dark:border-white/20">
          <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mb-6 text-center font-sans">Minuteur de session</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 border-[#9FAA74]/20 bg-[#9FAA74]/5 hover:bg-[#9FAA74]/10 transition-all group gap-3 active:scale-95">
              <div className="h-10 w-10 rounded-full flex items-center justify-center text-[#9FAA74] group-hover:scale-110 transition-transform bg-[#9FAA74]/10">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="text-sm md:text-base font-medium text-zinc-700 dark:text-zinc-300">Construction</span>
            </button>
            
            <button className="flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 border-[#C66F80]/20 bg-[#C66F80]/5 hover:bg-[#C66F80]/10 transition-all group gap-3 active:scale-95">
              <div className="h-10 w-10 rounded-full flex items-center justify-center text-[#C66F80] group-hover:scale-110 transition-transform bg-[#C66F80]/10">
                <PenTool className="h-5 w-5" />
              </div>
              <span className="text-sm md:text-base font-medium text-zinc-700 dark:text-zinc-300">Écriture</span>
            </button>
          </div>
        </div>
      </main>

      <button 
        onClick={onBack}
        className="fixed bottom-10 left-1/2 -translate-x-1/2 px-10 py-5 bg-white dark:bg-zinc-800 rounded-full shadow-2xl border border-zinc-100 dark:border-white/5 flex items-center gap-3 text-zinc-500 font-bold uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all z-30"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>
    </div>
  );
}
