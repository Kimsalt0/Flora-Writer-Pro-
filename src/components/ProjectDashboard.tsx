import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Novel, ViewType, WritingStat } from '../types';
import { motion } from 'motion/react';
import { Book, Users, PenTool, Hash, Clock, FileText, BookOpen, Globe, Brain, Layers, ChevronRight, Activity, Flower2, ArrowRight, BarChart as BarChartIcon, BrainCircuit } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function ProjectDashboard({ novel, onNavigate, accentColor }: { novel: Novel, onNavigate: (view: ViewType) => void, accentColor?: string }) {
  const [counts, setCounts] = useState({ 
    chapters: 0, 
    characters: 0, 
    parts: 0,
    words: 0 
  });
  const [writingStats, setWritingStats] = useState<WritingStat[]>([]);

  useEffect(() => {
    const unsubChapters = onSnapshot(collection(db, 'novels', novel.id, 'chapters'), (snap) => {
      setCounts(prev => ({ ...prev, chapters: snap.size }));
      
      // Calculate words lazily or debounced if needed, but let's just make it slightly faster
      let wordCount = 0;
      snap.docs.forEach(doc => {
        const content = doc.data().content || '';
        if (content.length > 0) {
          // Faster way than full regex for simple word count
          wordCount += content.split(/\s+/).length;
        }
      });
      setCounts(prev => ({ ...prev, words: wordCount }));
    });

    const unsubChars = onSnapshot(collection(db, 'novels', novel.id, 'characters'), (snap) => {
      setCounts(prev => ({ ...prev, characters: snap.size }));
    });

    const unsubParts = onSnapshot(collection(db, 'novels', novel.id, 'parts'), (snap) => {
      setCounts(prev => ({ ...prev, parts: snap.size }));
    });

    // Real stats fetching
    const unsubStats = onSnapshot(collection(db, 'novels', novel.id, 'writing_stats'), (snap) => {
      const statsMap = new Map();
      snap.docs.forEach(doc => {
        statsMap.set(doc.id, doc.data());
      });

      const normalized = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const id = d.toISOString().split('T')[0];
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const stat = statsMap.get(id);
        return {
          id,
          date: dayNames[d.getDay()],
          minutes: stat ? stat.minutes : 0,
          dominantActivity: stat ? stat.dominantActivity : 'manuscrit'
        };
      });
      setWritingStats(normalized);
    });

    return () => {
      unsubChapters();
      unsubChars();
      unsubParts();
      unsubStats();
    };
  }, [novel.id]);

  const cards: { title: string, description: string, icon: any, color: string, ring: string, borderType: string, view: ViewType }[] = [
    {
      title: 'MANUSCRIT',
      description: 'L\'atelier d\'écriture. Gérez vos parties et vos chapitres.',
      icon: <BookOpen className="h-8 w-8" />,
      color: 'bg-[#9FAA74] shadow-[#9FAA74]/20',
      ring: 'group-hover:ring-[#9FAA74]/30',
      borderType: 'border-dashed',
      view: 'manuscrit'
    },
    {
      title: 'PERSONNAGES',
      description: 'Donnez vie à vos protagonistes et figurants.',
      icon: <Users className="h-8 w-8" />,
      color: 'bg-[#C66F80] shadow-[#C66F80]/20',
      ring: 'group-hover:ring-[#C66F80]/30',
      borderType: 'border-solid border-4',
      view: 'perso_principaux'
    },
    {
      title: 'LIEUX',
      description: 'Cartographiez les décors de votre univers.',
      icon: <Globe className="h-8 w-8" />,
      color: 'bg-[#D44084] shadow-[#D44084]/20',
      ring: 'group-hover:ring-[#D44084]/30',
      borderType: 'border-outset',
      view: 'lieux'
    },
    {
      title: 'ORGANIGRAMME',
      description: 'Visualisez la structure et les liens de votre récit.',
      icon: <Layers className="h-8 w-8" />,
      color: 'bg-[#3B5226] shadow-[#3B5226]/20',
      ring: 'group-hover:ring-[#3B5226]/30',
      borderType: 'border-double border-4',
      view: 'organigramme'
    },
    {
      title: 'NOTES / IDÉES',
      description: 'Votre brouillon numérique pour ne rien oublier.',
      icon: <Brain className="h-8 w-8" />,
      color: 'bg-[#FFCE99] shadow-[#FFCE99]/20',
      ring: 'group-hover:ring-[#FFCE99]/30',
      borderType: 'border-dotted border-4',
      view: 'notes_idees'
    },
    {
      title: 'L\'ORACLE AI',
      description: 'Détecte les incohérences et trous dans l\'intrigue.',
      icon: <BrainCircuit className="h-8 w-8" />,
      color: 'bg-zinc-800 shadow-zinc-800/20',
      ring: 'group-hover:ring-zinc-800/30',
      borderType: 'border-dashed border-2',
      view: 'oracle'
    }
  ];

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative p-8 rounded-[2rem] bg-white dark:bg-zinc-900 border-2 border-zinc-100 overflow-hidden shadow-2xl transition-all"
        style={{ 
          borderColor: accentColor ? `${accentColor}33` : 'rgba(156,173,143,0.2)',
          boxShadow: accentColor ? `0 20px 50px ${accentColor}11` : '0 20px 50px rgba(0,0,0,0.05)'
        }}
      >
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-4">
            <div 
              className="h-16 w-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl relative overflow-hidden group/icon"
              style={{ backgroundColor: accentColor || '#9CAD8F' }}
            >
              <Flower2 className="h-8 w-8 relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: 'auto' }}
                  className="overflow-hidden"
                >
                  <span className="px-2 py-0.5 bg-white/10 rounded-full text-[8px] font-black uppercase tracking-[0.2em] whitespace-nowrap" style={{ color: accentColor || '#9CAD8F', backgroundColor: accentColor ? `${accentColor}33` : '#9CAD8F33' }}>Projet Actif</span>
                </motion.div>
                <div className="flex gap-1">
                   {[1, 2, 3].map(i => (
                     <div 
                       key={i} 
                       className="w-1 h-1 rounded-full opacity-40" 
                       style={{ backgroundColor: accentColor || '#9CAD8F' }}
                     />
                   ))}
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tighter italic uppercase leading-none">{novel.title}</h1>
            </div>
          </div>
          
          <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 font-medium max-w-xl leading-relaxed">
            {novel.description || "Gérez chaque détail de votre univers ici. Laissez votre créativité fleurir."}
          </p>
          
          <div className="flex flex-wrap gap-3 pt-2">
            <motion.button 
              whileHover={{ scale: 1.02, y: -2, boxShadow: `0 15px 40px ${accentColor}22` }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('writer' as any)}
              className="flex items-center gap-4 px-6 py-4 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-[1.5rem] shadow-xl transition-all group relative overflow-hidden border border-white/10"
            >
              <div 
                className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-900 dark:text-white transition-colors relative overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: accentColor || '#9CAD8F' }} />
                <PenTool className="h-4 w-4 relative z-10 group-hover:text-white transition-colors" />
              </div>
              <div className="text-left pr-2">
                <h3 className="text-base font-black uppercase italic tracking-tighter leading-none mb-0.5">Continuer le récit</h3>
                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Retour à votre plume</p>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <Activity className="h-4 w-4 text-emerald-500" />
              <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">En cours</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-transparent text-zinc-400 dark:text-zinc-600">
              <Clock className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Studio ouvert: {new Date(novel.createdAt?.seconds * 1000).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        </div>

        {/* Dynamic background accents */}
        <div className="absolute top-[-50px] right-[-50px] w-96 h-96 bg-sage-300/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-50px] left-[20%] w-96 h-96 bg-pink-300/5 rounded-full blur-[80px] pointer-events-none" />
      </motion.div>

      {/* Grid of Possibilities */}
      <div className="space-y-10">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
             <h2 className="text-sm font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.4em]">Exploration</h2>
             <div className="h-[2px] w-12 bg-sage-300/30 rounded-full" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, idx) => (
            <motion.button
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`group relative p-6 rounded-[2rem] bg-white dark:bg-zinc-900/40 border-2 ${card.borderType} border-zinc-100 dark:border-white/5 hover:border-sage-300 transition-all shadow-lg overflow-hidden text-left flex flex-col`}
              onClick={() => onNavigate(card.view)}
            >
              <div className="relative z-10 flex items-center gap-3 mb-6">
                <div className={`h-12 w-12 min-w-[48px] rounded-xl ${card.color} flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-all duration-500 ease-out border-2 border-white/20 ring-2 ring-black/5`}>
                  {React.cloneElement(card.icon, { className: 'h-6 w-6' })}
                </div>
                <h3 className="text-lg md:text-xl font-black text-zinc-900 dark:text-white italic uppercase tracking-tighter leading-tight break-words overflow-hidden">{card.title}</h3>
              </div>
              
              <p className="relative z-10 text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mb-8 opacity-70 group-hover:opacity-100 transition-opacity flex-1">{card.description}</p>
              
              <div className="relative z-10 flex items-center text-[9px] font-black uppercase tracking-[0.1em] text-zinc-400 dark:text-zinc-700 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                <span>Lancer le module</span>
                <ArrowRight className="ml-2 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Decorative accent */}
              <div className={`absolute -bottom-8 -right-8 w-32 h-32 ${card.color} opacity-5 rounded-full blur-[30px] group-hover:opacity-10 group-hover:scale-150 transition-all duration-1000`} />
            </motion.button>
          ))}

          {/* Quick Stats & Writing Time Column */}
          <div className="md:grid md:grid-cols-2 lg:grid-cols-1 gap-6 lg:space-y-6">
            {/* Writing Time Chart */}
            <div className="p-6 rounded-[2rem] bg-white dark:bg-zinc-900/40 border-2 border-dashed border-zinc-200 dark:border-white/10 flex flex-col shadow-lg overflow-hidden relative group">
              <header className="flex items-center justify-between mb-6 relative z-10">
                <div>
                  <h3 className="text-[8px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.2em] mb-1">Activité d'écriture</h3>
                  <div className="text-lg font-black italic text-zinc-900 dark:text-white uppercase tracking-tighter">TEMPS D'ÉCRITURE</div>
                </div>
                <button 
                  onClick={() => onNavigate('stats_details')}
                  className="h-8 px-3 rounded-xl bg-amber-100 dark:bg-amber-950/30 flex items-center gap-1.5 text-amber-500 border border-amber-200/50 hover:scale-105 transition-all text-[8px] font-black uppercase tracking-widest"
                >
                  <BarChartIcon className="h-3.5 w-3.5" />
                  INFOS
                </button>
              </header>

              <div className="h-32 w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={writingStats} margin={{ top: 0, right: 0, left: 0, bottom: 20 }}>
                    <Tooltip 
                      cursor={{ fill: 'transparent' }} 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-zinc-900 dark:bg-white p-2 rounded-xl shadow-xl border border-white/10 dark:border-transparent">
                              <p className="text-xs font-black text-white dark:text-zinc-900">
                                {payload[0].value} <span className="text-[8px] opacity-70">minutes</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="minutes" radius={[4, 4, 4, 4]}>
                      {writingStats.map((entry, index) => {
                        const colors: Record<string, string> = {
                          manuscrit: '#9FAA74',
                          perso_principaux: '#C66F80',
                          lieux: '#D44084',
                          organigramme: '#3B5226',
                          notes_idees: '#FFCE99',
                          settings: '#71717a'
                        };
                        const dominant = entry.dominantActivity || 'manuscrit';
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={colors[dominant] || '#9FAA74'} 
                            fillOpacity={0.8}
                          />
                        );
                      })}
                    </Bar>
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#A1A1AA', fontSize: 8, fontWeight: 700 }}
                      dy={10}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tableau des Scores Card */}
            <div className="p-6 rounded-[2rem] bg-zinc-50 dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col justify-between group shadow-xl relative overflow-hidden">
              <header className="flex items-center justify-between mb-6 relative z-10">
                <div>
                  <h3 className="text-[8px] font-black text-[#9FAA74] dark:text-[#9FAA74] uppercase tracking-[0.1em] mb-1">Production</h3>
                  <div className="text-lg font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter leading-none">Tableau des Scores</div>
                </div>
                <Activity className="h-4 w-4 text-[#9FAA74]/50" />
              </header>
              
              <div className="space-y-4 flex-1 relative z-10">
                <StatRow icon={<FileText className="h-3.5 w-3.5" />} label="Chapitres" value={counts.chapters} />
                <StatRow icon={<Users className="h-3.5 w-3.5" />} label="Personnages" value={counts.characters} />
                <StatRow icon={<PenTool className="h-3.5 w-3.5" />} label="Mots écrits" value={counts.words.toLocaleString()} />
              </div>

              <div className="pt-6 relative z-10">
                <button 
                  onClick={() => onNavigate('manuscrit')}
                  className="w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  style={{ backgroundColor: accentColor || '#9FAA74' }}
                >
                  <PenTool className="h-3.5 w-3.5" />
                  <span>Continuer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: any, label: string, value: string | number }) {
  return (
    <div className="flex items-center justify-between group/row">
      <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400 transition-colors">
        <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">{icon}</div>
        <span className="text-[9px] font-black uppercase tracking-[0.1em]">{label}</span>
      </div>
      <span className="text-xl font-black text-zinc-950 dark:text-white italic tracking-tighter">{value}</span>
    </div>
  );
}
