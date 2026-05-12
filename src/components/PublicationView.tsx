import React, { useState } from 'react';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Novel, Part, Chapter } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Printer, Maximize2, Minimize2, Settings2, Palette, Type, Layout, Image as ImageIcon, Sparkles } from 'lucide-react';
import { User } from 'firebase/auth';
import { FONTS } from '../constants';

interface PublicationViewProps {
  novel: Novel;
  parts: Part[];
  chapters: Chapter[];
  onNavigate: (view: any) => void;
  theme: 'dark' | 'light';
  accentColor?: string;
  user: User;
}

export default function PublicationView({ novel, parts, chapters, onNavigate, theme, accentColor, user }: PublicationViewProps) {
  const [currentPage, setCurrentPage] = useState<number | 'cover-front' | 'cover-back' | 'stats' | 'toc'>('cover-front');
  const [viewMode, setViewMode] = useState<'grid' | 'reader'>('grid'); 
  const [gridTab, setGridTab] = useState<'synopsis' | 'selection'>('synopsis');
  const [activeMode, setActiveMode] = useState<'read' | 'edit'>('read');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Local publication settings (initially from novel settings or defaults)
  const [pubSettings, setPubSettings] = useState({
    fontFamily: novel.settings?.fontFamily || 'serif',
    fontSize: novel.settings?.fontSize || 14,
    lineSpacing: novel.settings?.lineSpacing || 1.6,
    ornamentStyle: 'style1', 
    ornamentBottomStyle: 'none',
    ornamentSideStyle: 'none',
    dropCap: true,
    dividerStyle: 'line', 
    accentColor: accentColor || '#9FAA74',
    coverStyle: 'elegant', 
    showPageBorder: false,
    showProgressBar: true,
    layoutMode: 'digital' 
  });

  // Sync settings when novel changes
  React.useEffect(() => {
    if (novel.settings) {
      setPubSettings(prev => ({
        ...prev,
        fontFamily: novel.settings?.fontFamily || prev.fontFamily,
        fontSize: novel.settings?.fontSize || prev.fontSize,
        lineSpacing: novel.settings?.lineSpacing || prev.lineSpacing,
      }));
    }
  }, [novel.settings]);

  const getPageBg = () => {
    if (theme === 'dark') return 'bg-zinc-950 text-zinc-100';
    return 'bg-white text-zinc-900';
  };

  const updatePubSetting = async (key: string, value: any) => {
    const newSettings = { ...pubSettings, [key]: value };
    setPubSettings(newSettings);
    
    // Also save specific shared settings to the novel
    if (['fontFamily', 'fontSize', 'lineSpacing'].includes(key)) {
      try {
        await updateDoc(doc(db, 'novels', novel.id), {
          settings: {
            ...novel.settings,
            [key]: value,
            updatedAt: Date.now()
          },
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.error('Error saving publication settings:', e);
      }
    }
  };

  // Group chapters by part
  const chaptersMap = chapters.reduce((acc, chap) => {
    const pId = chap.partId || 'no-part';
    if (!acc[pId]) acc[pId] = [];
    acc[pId].push(chap);
    return acc;
  }, {} as Record<string, Chapter[]>);

  // Sort chapters within each part
  Object.values(chaptersMap).forEach(list => list.sort((a, b) => a.order - b.order));

  // Determine full list of displayable units (chapters)
  const displayableChapters = chapters.sort((a, b) => {
    if (a.partId && b.partId && a.partId !== b.partId) {
      const partA = parts.find(p => p.id === a.partId);
      const partB = parts.find(p => p.id === b.partId);
      return (partA?.order || 0) - (partB?.order || 0);
    }
    return a.order - b.order;
  });

  const handleNext = () => {
    if (currentPage === 'cover-front') setCurrentPage('cover-back');
    else if (currentPage === 'cover-back') setCurrentPage('stats');
    else if (currentPage === 'stats') setCurrentPage('toc');
    else if (currentPage === 'toc') setCurrentPage(0);
    else if (typeof currentPage === 'number' && currentPage < displayableChapters.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage === 0) setCurrentPage('toc');
    else if (currentPage === 'toc') setCurrentPage('stats');
    else if (currentPage === 'stats') setCurrentPage('cover-back');
    else if (currentPage === 'cover-back') setCurrentPage('cover-front');
    else if (typeof currentPage === 'number' && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const openReader = (page: number | 'cover-front' | 'cover-back' | 'stats' | 'toc') => {
    setCurrentPage(page);
    setViewMode('reader');
    if (activeMode === 'edit') {
      setShowSettings(true);
    } else {
      setShowSettings(false);
    }
  };

  const printBook = () => {
    window.print();
  };

  const Ornament = ({ style, color, type = 'top' }: { style: string, color?: string, type?: 'top' | 'bottom' | 'part' | 'side' }) => {
    if (style === 'none') return null;
    
    const currentColor = color || (theme === 'dark' ? 'white' : '#18181b');
    
    // Adjust spacing: bottom is now much closer as requested
    const marginClass = type === 'top' ? 'mt-0 mb-1' : (type === 'bottom' ? 'mt-[-4px] mb-1' : 'my-0');

    // For side ornaments, we render a smaller version suitable for flanking text
    if (type === 'side') {
      const sideStyles: Record<string, React.ReactNode> = {
        style1: (
          <svg width="40" height="20" viewBox="0 0 100 50" fill="none" stroke={currentColor}>
            <path d="M10 25 C30 25 50 10 90 25" strokeWidth="2" />
            <path d="M10 25 C30 25 50 40 90 25" strokeWidth="1" opacity="0.5" />
          </svg>
        ),
        style2: (
          <svg width="50" height="15" viewBox="0 0 100 20" fill="none" stroke={currentColor}>
            <path d="M0 10 C30 0 70 0 100 10" strokeWidth="2" />
            <circle cx="50" cy="5" r="3" fill="currentColor" />
          </svg>
        ),
        style3: (
          <div className="flex gap-1 items-center">
            <div className="h-2 w-2 rotate-45 border border-current" />
            <div className="h-1 w-1 bg-current rounded-full" />
          </div>
        ),
        style8: (
          <svg width="40" height="20" viewBox="0 0 60 40" fill="none" stroke={currentColor}>
            <path d="M5 20 Q15 0 30 20 T55 20" strokeWidth="1.5" />
            <circle cx="30" cy="20" r="2" fill="currentColor" />
          </svg>
        ),
        style9: (
          <svg width="30" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        ),
        style15: (
          <svg width="30" height="20" viewBox="0 0 60 40" fill="none" stroke={currentColor}>
            <path d="M10 30 L30 10 L50 30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="30" cy="5" r="3" fill="currentColor" />
          </svg>
        ),
        style16: (
          <div className="flex items-center text-lg font-serif">~</div>
        )
      };

      return (
        <div className="flex items-center opacity-40 hover:opacity-100 transition-all duration-500">
           {sideStyles[style] || <div className="h-1 w-8 rounded-full bg-current opacity-20" />}
        </div>
      );
    }

    // Style 1: Elegant Floral Symmetrical (Image 1)
    if (style === 'style1') {
      return (
        <div className={`flex justify-center transition-all duration-700 ${marginClass}`}>
           <svg width="240" height="50" viewBox="0 0 240 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
             <path d="M120 35 C130 35 150 20 180 20 C210 20 230 40 235 35" stroke={currentColor} strokeWidth="0.8" fill="none" />
             <path d="M120 35 C110 35 90 20 60 20 C30 20 10 40 5 35" stroke={currentColor} strokeWidth="0.8" fill="none" />
             <path d="M120 35 C125 30 135 25 140 30" stroke={currentColor} strokeWidth="0.5" fill="none" />
             <path d="M120 35 C115 30 105 25 100 30" stroke={currentColor} strokeWidth="0.5" fill="none" />
             {/* Central Heart */}
             <path d="M116 33 C116 31 118 30 120 32 C122 30 124 31 124 33 C124 36 120 38 120 38 C120 38 116 36 116 33Z" fill={currentColor} />
             {/* Small hearts at the ends */}
             <path d="M233 34 C233 33 234 32.5 235 33.5 C236 32.5 237 33 237 34 C237 35.5 235 37 235 37 C235 37 233 35.5 233 34Z" fill={currentColor} />
             <path d="M3 34 C3 33 4 32.5 5 33.5 C6 32.5 7 33 7 34 C7 35.5 5 37 5 37 C5 37 3 35.5 3 34Z" fill={currentColor} />
             {/* Little stars/crosses */}
             <path d="M160 35 L160 29 M157 32 L163 32" stroke={currentColor} strokeWidth="0.3" />
             <path d="M80 35 L80 29 M77 32 L83 32" stroke={currentColor} strokeWidth="0.3" />
           </svg>
        </div>
      );
    }
    // Style 2: Classic Scroll (Image 2)
    if (style === 'style2') {
      return (
        <div className={`flex items-center justify-center gap-4 opacity-70 ${marginClass}`}>
           <svg width="200" height="30" viewBox="0 0 200 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M100 15 C110 5 125 5 130 15 C135 25 150 25 160 15 L200 15" stroke={currentColor} strokeWidth="1" />
              <path d="M100 15 C90 5 75 5 70 15 C65 25 50 25 40 15 L0 15" stroke={currentColor} strokeWidth="1" />
              <path d="M98 12 C98 10 100 8 102 10 Q105 12 100 15 Q95 12 98 10 Z" fill={currentColor} />
           </svg>
        </div>
      );
    }
    // Style 3: Dots & Geometric (Image 3 inspired)
    if (style === 'style3') {
      return (
        <div className={`flex justify-center items-center gap-4 opacity-40 ${marginClass}`}>
           <div className={`h-px w-20 ${theme === 'dark' ? 'bg-white/20' : 'bg-black/20'}`} />
           <div className="flex gap-2 items-center">
             <div className="h-1 w-1 rounded-full bg-current" />
             <div className="h-2 w-2 rotate-45 border border-current" />
             <div className="h-1.5 w-1.5 rounded-full border border-current" />
             <div className="h-2 w-2 rotate-45 border border-current" />
             <div className="h-1 w-1 rounded-full bg-current" />
           </div>
           <div className={`h-px w-20 ${theme === 'dark' ? 'bg-white/20' : 'bg-black/20'}`} />
        </div>
      );
    }
    // Style 4: Birds (Image 4)
    if (style === 'style4') {
      return (
        <div className={`flex justify-center opacity-70 ${marginClass}`}>
           <svg width="180" height="40" viewBox="0 0 180 40" fill="none" stroke={currentColor} xmlns="http://www.w3.org/2000/svg">
             <path d="M0 30 L75 30" strokeWidth="0.8" />
             <path d="M105 30 L180 30" strokeWidth="0.8" />
             {/* Two Birds silhouette */}
             <path d="M78 30 C78 20 85 15 90 25 C92 20 98 20 102 30" strokeWidth="1.2" strokeLinecap="round" />
           </svg>
        </div>
      );
    }
    // Style 5: Underline Bold
    if (style === 'style5') {
      return (
        <div className={`flex justify-center ${type === 'bottom' ? 'mt-2 mb-8' : 'mt-2 mb-6'}`}>
          <div className="h-1 w-32 rounded-full" style={{ backgroundColor: currentColor }} />
        </div>
      );
    }
    // Style 6: Doodle Lines (Original doodle)
    if (style === 'style6') {
      return (
        <div className={`flex items-center justify-center w-full gap-4 opacity-60 ${marginClass}`}>
           <div className="flex-1 flex flex-col gap-1.5 max-w-[120px]">
              <div className="h-[0.5px] w-full bg-current relative">
                 <div className="absolute -left-1 -top-0.5 h-1.5 w-1.5 rounded-full border border-current" />
              </div>
              <div className="h-[0.5px] w-[80%] bg-current relative ml-auto">
                 <div className="absolute -left-1 -top-0.5 h-1.5 w-1.5 rounded-full border border-current" />
              </div>
              <div className="h-[0.5px] w-full bg-current relative">
                 <div className="absolute -left-1 -top-0.5 h-1.5 w-1.5 rounded-full border border-current" />
              </div>
           </div>
           
           <div className="flex-1 flex flex-col gap-1.5 max-w-[120px] items-end">
              <div className="h-[0.5px] w-full bg-current relative">
                 <div className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full border border-current" />
              </div>
              <div className="h-[0.5px] w-[80%] bg-current relative mr-auto">
                 <div className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full border border-current" />
              </div>
              <div className="h-[0.5px] w-full bg-current relative">
                 <div className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full border border-current" />
              </div>
           </div>
        </div>
      );
    }
    // Style 7: Modern Minimal
    if (style === 'style7') {
      return (
        <div className={`flex justify-center opacity-20 ${marginClass}`}>
           <div className="flex gap-1.5">
             {[1, 2, 3, 4, 5].map(i => (
               <div key={i} className="h-1 w-1 bg-current rounded-full" />
             ))}
           </div>
        </div>
      );
    }
    // Style 8: Swirl Flourish (Image 8 inspired)
    if (style === 'style8') {
      return (
        <div className={`flex justify-center opacity-80 ${marginClass}`}>
          <svg width="240" height="40" viewBox="0 0 240 40" fill="none" stroke={currentColor}>
            <path d="M10 20 C30 20 40 5 60 5 C80 5 90 20 120 20 C150 20 160 35 180 35 C200 35 210 20 230 20" strokeWidth="0.8" />
            <path d="M115 15 Q120 10 125 15 T130 20" strokeWidth="0.5" />
            <circle cx="120" cy="20" r="1.5" fill="currentColor" />
          </svg>
        </div>
      );
    }
    // Style 9: Ornate Line with Heart (Image 9 inspired)
    if (style === 'style9') {
      return (
        <div className={`flex items-center justify-center w-full gap-4 opacity-70 ${marginClass}`}>
          <div className="h-px flex-1 bg-current max-w-[150px]" />
          <svg width="40" height="20" viewBox="0 0 40 20" fill="currentColor">
            <path d="M20 16 L18 14 C12 8 10 6 10 4 C10 2 11.5 0.5 13.5 0.5 C14.6 0.5 15.7 1 16.5 2 C17.3 1 18.4 0.5 19.5 0.5 C21.5 0.5 23 2 23 4 C23 6 21 8 15 14 L13 16" transform="translate(7, 2)" />
          </svg>
          <div className="h-px flex-1 bg-current max-w-[150px]" />
        </div>
      );
    }
    // Style 10: Wind-blown Leaves (Image 6)
    if (style === 'style10') {
      return (
        <div className={`flex justify-center opacity-60 ${marginClass}`}>
          <svg width="200" height="40" viewBox="0 0 200 40" fill="none" stroke={currentColor}>
            <path d="M20 25 Q60 5 100 25 T180 25" strokeWidth="0.5" strokeDasharray="2 1" />
            {[40, 70, 100, 130, 160].map((x, i) => (
              <path key={i} d={`M${x} ${20 + Math.sin(i) * 5} Q${x + 5} ${15 + Math.sin(i) * 5} ${x + 10} ${20 + Math.sin(i) * 5} T${x} ${20 + Math.sin(i) * 5}`} fill="none" strokeWidth="0.5" />
            ))}
          </svg>
        </div>
      );
    }
    // Style 11: Ornate Butterfly (Image 7 variation)
    if (style === 'style11') {
      return (
        <div className={`flex justify-center items-center gap-6 opacity-60 ${marginClass}`}>
          {[1, 2, 3].map(i => (
            <svg key={i} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={currentColor}>
              <path d="M10 10 C5 0 0 5 10 10 C20 5 15 0 10 10 Z" strokeWidth="0.8" />
              <path d="M10 10 C5 20 0 15 10 10 C20 15 15 20 10 10 Z" strokeWidth="0.8" />
            </svg>
          ))}
        </div>
      );
    }
    // Style 12: Flower Chain (Image 7 variation)
    if (style === 'style12') {
      return (
        <div className={`flex justify-center items-center gap-4 opacity-50 ${marginClass}`}>
          <div className="h-px w-12 bg-current" />
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-1">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="h-1.5 w-1.5 rounded-full border border-current" />
              ))}
            </div>
          ))}
          <div className="h-px w-12 bg-current" />
        </div>
      );
    }
    // Style 13: Heart Row
    if (style === 'style13') {
      return (
        <div className={`flex justify-center items-center gap-3 opacity-40 ${marginClass}`}>
           {[1, 2, 3, 4, 5].map(i => (
             <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
               <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
             </svg>
           ))}
        </div>
      );
    }
    // Style 14: Diamond Wave
    if (style === 'style14') {
      return (
        <div className={`flex justify-center items-center gap-2 opacity-50 ${marginClass}`}>
           <svg width="200" height="20" viewBox="0 0 200 20" fill="none" stroke={currentColor}>
             <path d="M0 10 Q50 0 100 10 T200 10" strokeWidth="0.5" />
             {[50, 100, 150].map(x => (
               <rect key={x} x={x-3} y={7} width="6" height="6" transform={`rotate(45 ${x} 10)`} strokeWidth="1" />
             ))}
           </svg>
        </div>
      );
    }
    // Style 15: Abstract Crown
    if (style === 'style15') {
      return (
        <div className={`flex justify-center opacity-60 ${marginClass}`}>
          <svg width="100" height="30" viewBox="0 0 100 30" fill="none" stroke={currentColor}>
             <path d="M10 25 L30 15 L50 25 L70 15 L90 25" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
             <circle cx="30" cy="12" r="2" fill="currentColor" />
             <circle cx="70" cy="12" r="2" fill="currentColor" />
             <circle cx="50" cy="8" r="2" fill="currentColor" />
          </svg>
        </div>
      );
    }
    // Style 16: Tilde Flourish
    if (style === 'style16') {
      return (
        <div className={`flex justify-center items-center gap-4 opacity-50 ${marginClass}`}>
          <div className="h-px w-12 bg-current" />
          <div className="text-xl font-serif">~</div>
          <div className="h-px w-12 bg-current" />
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`flex flex-col h-full transition-colors duration-700 ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'} ${isFullScreen ? 'fixed inset-0 z-[200] p-0' : ''}`}>
      {/* Dynamic Background Gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-[-5%] left-[-5%] w-[60%] h-[60%] blur-[120px] rounded-full animate-pulse ${theme === 'dark' ? 'bg-orange-600/50' : 'bg-orange-500/30'}`} style={{ animationDuration: '8s' }} />
        <div className={`absolute bottom-[-5%] right-[-5%] w-[60%] h-[60%] blur-[120px] rounded-full animate-pulse ${theme === 'dark' ? 'bg-rose-600/50' : 'bg-rose-500/30'}`} style={{ animationDelay: '2s', animationDuration: '10s' }} />
        <div className={`absolute top-[40%] left-[20%] w-[50%] h-[50%] blur-[130px] rounded-full animate-pulse ${theme === 'dark' ? 'bg-rose-500/30' : 'bg-rose-400/20'}`} style={{ animationDelay: '1s', animationDuration: '7s' }} />
        <div className={`absolute bottom-[40%] right-[20%] w-[50%] h-[50%] blur-[130px] rounded-full animate-pulse ${theme === 'dark' ? 'bg-orange-500/30' : 'bg-orange-400/20'}`} style={{ animationDelay: '3s', animationDuration: '11s' }} />
        <div className={`absolute top-[30%] right-[5%] w-[45%] h-[45%] blur-[100px] rounded-full animate-pulse ${theme === 'dark' ? 'bg-orange-400/25' : 'bg-orange-300/20'}`} style={{ animationDelay: '4s', animationDuration: '12s' }} />
        <div className={`absolute bottom-[30%] left-[5%] w-[45%] h-[45%] blur-[100px] rounded-full animate-pulse ${theme === 'dark' ? 'bg-rose-400/25' : 'bg-rose-300/20'}`} style={{ animationDelay: '6s', animationDuration: '9s' }} />
        {pubSettings.accentColor && (
           <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 50% 50%, ${pubSettings.accentColor}, transparent 80%)` }} />
        )}
      </div>

      {/* Action Bar */}
      <header className={`flex flex-col sm:flex-row items-center justify-between px-6 py-4 no-print border-b relative z-50 backdrop-blur-md transition-colors gap-4 ${theme === 'dark' ? 'bg-black/40 border-white/5' : 'bg-white/80 border-zinc-200'}`}>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button 
            onClick={() => {
              if (viewMode === 'reader') setViewMode('grid');
              else if (gridTab === 'selection') setGridTab('synopsis');
              else onNavigate('projet');
            }}
            className={`group flex items-center gap-2 transition-all flex-shrink-0 ${theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            <div className={`h-10 w-10 flex items-center justify-center rounded-full transition-colors ${theme === 'dark' ? 'bg-white/5 group-hover:bg-white/10' : 'bg-zinc-100 group-hover:bg-zinc-200'}`}>
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden xs:block">Retour</span>
          </button>
          
          <div className={`h-8 w-px ${theme === 'dark' ? 'bg-white/5' : 'bg-zinc-200'} hidden sm:block`} />
          
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 overflow-hidden">
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500 dark:text-emerald-400 whitespace-nowrap">Publication</span>
              <div className={`h-1 w-1 rounded-full flex-shrink-0 ${theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
              <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] whitespace-nowrap ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>{activeMode === 'edit' ? 'Modifications' : (viewMode === 'grid' && gridTab === 'synopsis' ? 'Galerie' : 'Lecture')}</span>
            </div>
            <p className={`text-xs sm:text-sm font-black italic tracking-tight uppercase truncate ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{novel.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          {viewMode === 'reader' && activeMode === 'edit' && (
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`flex-1 sm:flex-none px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border ${
                showSettings 
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' 
                  : theme === 'dark' 
                    ? 'bg-white/5 hover:bg-white/10 border-white/5 text-white' 
                    : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-900 shadow-sm'
              }`}
            >
              <Settings2 className="h-3 sm:h-4 w-3 sm:w-4 text-emerald-500 group-hover:text-white flex-shrink-0" />
              <span className="hidden xs:block">Style</span>
            </button>
          )}

          {viewMode === 'reader' && (
            <button 
              onClick={() => setViewMode('grid')}
              className={`flex-1 sm:flex-none px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border ${
                theme === 'dark' 
                  ? 'bg-white/5 hover:bg-white/10 border-white/5 text-white' 
                  : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-900 shadow-sm'
              }`}
            >
              <Maximize2 className="h-3 w-3 flex-shrink-0" />
              <span className="hidden xs:block">Selection</span>
            </button>
          )}
          
          <button 
            onClick={printBook}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] transition-all border ${
              theme === 'dark' 
                ? 'bg-white/5 hover:bg-white/10 border-white/5 text-white' 
                : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-900 shadow-sm'
            }`}
          >
            <Printer className="h-3 w-3 flex-shrink-0" />
            <span className="hidden xs:block">Imprimer</span>
          </button>
          
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)}
            className={`p-2 sm:p-2.5 h-8 sm:h-10 w-8 sm:w-10 flex items-center justify-center rounded-full transition-all border flex-shrink-0 ${
              theme === 'dark' 
                ? 'bg-white/5 hover:bg-white/10 border-white/5 text-white' 
                : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-900 shadow-sm'
            }`}
          >
            {isFullScreen ? <Minimize2 className="h-3 sm:h-4 w-3 sm:w-4" /> : <Maximize2 className="h-3 sm:h-4 w-3 sm:w-4" />}
          </button>
        </div>
      </header>

              <div className="flex-1 overflow-hidden relative flex flex-col">
                {/* Settings Bottom Sheet */}
                <AnimatePresence>
                  {showSettings && (
                    <>
                      {/* Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowSettings(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] no-print"
                      />
                      
                      {/* Bottom Sheet */}
                      <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className={`fixed bottom-0 left-0 right-0 z-[160] max-h-[80vh] flex flex-col rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.3)] no-print overflow-hidden transition-colors ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'}`}
                      >
                        {/* Handle */}
                        <div className="flex justify-center py-4 cursor-pointer" onClick={() => setShowSettings(false)}>
                          <div className={`h-1.5 w-16 rounded-full ${theme === 'dark' ? 'bg-white/10' : 'bg-zinc-200'}`} />
                        </div>

                        <div className={`px-8 pt-2 pb-6 flex items-center justify-between border-b ${theme === 'dark' ? 'border-white/5' : 'border-zinc-100'}`}>
                          <div className="flex items-center gap-3">
                            <Palette className="h-5 w-5 text-emerald-500" />
                            <h3 className={`text-sm font-black uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>Modifications du Style</h3>
                          </div>
                          <button 
                            onClick={() => setShowSettings(false)}
                            className={`p-2 rounded-full hover:bg-black/5 transition-colors ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}
                          >
                            <ChevronLeft className="h-5 w-5 rotate-[-90deg]" />
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pb-12">
                            {/* Column 1: Typography */}
                            <div className="space-y-6">
                              <div className="flex items-center gap-2">
                                <Type className={`h-4 w-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Typographie</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {FONTS.map((f) => (
                                  <button
                                    key={f.value}
                                    onClick={() => updatePubSetting('fontFamily', f.value)}
                                    className={`px-4 py-5 rounded-2xl text-[10px] font-bold transition-all border text-left flex flex-col gap-1 ${
                                      pubSettings.fontFamily === f.value 
                                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' 
                                        : theme === 'dark' 
                                          ? 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10' 
                                          : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100 shadow-sm'
                                    }`}
                                  >
                                    <span style={{ fontFamily: f.family }} className="text-xl">Abc</span>
                                    <span className="opacity-80">{f.name}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Column 2: Decorations */}
                            <div className="space-y-6">
                              <div className="flex items-center gap-2">
                                <Sparkles className={`h-4 w-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Ornements & Détails</span>
                              </div>
                              
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <p className={`text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`}>Ornement Supérieur (Haut)</p>
                                  <div className="flex flex-wrap gap-2">
                                    {['none', 'style1', 'style2', 'style3', 'style4', 'style5', 'style6', 'style7', 'style8', 'style9', 'style10', 'style11', 'style12', 'style13', 'style14', 'style15', 'style16'].map(s => (
                                      <button
                                        key={s}
                                        onClick={() => updatePubSetting('ornamentStyle', s)}
                                        className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                                          pubSettings.ornamentStyle === s 
                                            ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:text-black dark:border-white shadow-md'
                                            : theme === 'dark' ? 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 shadow-sm'
                                        }`}
                                      >
                                        {s === 'none' ? 'Aucun' : s.replace('style', 'Style ')}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <p className={`text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`}>Ornement Inférieur (Bas)</p>
                                  <div className="flex flex-wrap gap-2">
                                    {['none', 'style1', 'style2', 'style3', 'style4', 'style5', 'style6', 'style7', 'style8', 'style9', 'style10', 'style11', 'style12', 'style13', 'style14', 'style15', 'style16'].map(s => (
                                      <button
                                        key={s}
                                        onClick={() => updatePubSetting('ornamentBottomStyle', s)}
                                        className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                                          pubSettings.ornamentBottomStyle === s 
                                            ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:text-black dark:border-white shadow-md'
                                            : theme === 'dark' ? 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 shadow-sm'
                                        }`}
                                      >
                                        {s === 'none' ? 'Aucun' : s.replace('style', 'Style ')}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <p className={`text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`}>Ornements sur les côtés</p>
                                  <div className="flex flex-wrap gap-2">
                                    {['none', 'style1', 'style2', 'style3', 'style8', 'style9', 'style15', 'style16'].map(s => (
                                      <button
                                        key={s}
                                        onClick={() => updatePubSetting('ornamentSideStyle', s)}
                                        className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                                          pubSettings.ornamentSideStyle === s 
                                            ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:text-black dark:border-white shadow-md'
                                            : theme === 'dark' ? 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 shadow-sm'
                                        }`}
                                      >
                                        {s === 'none' ? 'Aucun' : s.replace('style', 'Style ')}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <button 
                                    onClick={() => updatePubSetting('dropCap', !pubSettings.dropCap)}
                                    className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${
                                      pubSettings.dropCap 
                                      ? 'bg-rose-50 border-rose-200 text-rose-600' 
                                      : theme === 'dark' ? 'bg-white/5 border-white/5 text-zinc-500' : 'bg-zinc-50 border-zinc-100 text-zinc-400'
                                    }`}
                                  >
                                    <div className="text-2xl font-serif italic leading-none">L.</div>
                                    <span className="text-[8px] font-black uppercase tracking-widest">Lettrine</span>
                                  </button>

                                  <button 
                                    onClick={() => updatePubSetting('showPageBorder', !pubSettings.showPageBorder)}
                                    className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${
                                      pubSettings.showPageBorder 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                                      : theme === 'dark' ? 'bg-white/5 border-white/5 text-zinc-500' : 'bg-zinc-50 border-zinc-100 text-zinc-400'
                                    }`}
                                  >
                                    <div className="h-6 w-full border border-current rounded-sm opacity-50" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Bordure</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Column 3: Ambiance */}
                            <div className="space-y-6">
                              <div className="flex items-center gap-2">
                                <Layout className={`h-4 w-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Disposition</span>
                              </div>
                              
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <p className={`text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`}>Mode d'affichage</p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => updatePubSetting('layoutMode', 'digital')}
                                      className={`flex-1 py-3 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                                        pubSettings.layoutMode === 'digital' 
                                          ? 'bg-emerald-500 text-white shadow-lg' 
                                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'
                                      }`}
                                    >
                                      Digital (Liseuse)
                                    </button>
                                    <button
                                      onClick={() => updatePubSetting('layoutMode', 'analog')}
                                      className={`flex-1 py-3 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                                        pubSettings.layoutMode === 'analog' 
                                          ? 'bg-emerald-500 text-white shadow-lg' 
                                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'
                                      }`}
                                    >
                                      Papier (Réalisme)
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className={`p-8 border-t transition-colors text-center ${theme === 'dark' ? 'border-white/5 bg-black/40' : 'border-zinc-100 bg-zinc-50'}`}>
                           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 mb-2">Flora Designer Experience</p>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full overflow-y-auto px-8 py-16 custom-scrollbar bg-transparent"
            >
              <div className="max-w-7xl mx-auto space-y-24 pb-32">
                {gridTab === 'synopsis' ? (
                  <>
                    {/* Simplified Landing with 2 main options */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
                      <div className="md:col-span-1">
                        <motion.div 
                          whileHover={{ y: -10, rotate: -2 }}
                          className={`w-full aspect-[2/3] rounded-3xl shadow-2xl overflow-hidden relative border transition-colors ${theme === 'dark' ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-100'}`}
                        >
                          <div 
                            className={`absolute inset-0 p-8 flex flex-col items-center justify-center text-center transition-all duration-500 ${(!novel.coverColor || novel.coverColor.startsWith('bg-')) ? (novel.coverColor || 'bg-sage-300') : ''}`}
                            style={{ 
                              backgroundColor: novel.coverColor && novel.coverColor.startsWith('#') ? novel.coverColor : undefined,
                              background: !novel.coverColor || novel.coverColor.startsWith('bg-') ? undefined : undefined
                            }}
                          >
                            <div 
                              className="h-1 w-12 mb-6" 
                              style={{ backgroundColor: pubSettings.accentColor || '#10b981' }} 
                            />
                            <h3 className={`text-3xl font-serif font-black italic uppercase leading-none tracking-tighter mb-4 ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{novel.title}</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-auto opacity-40">MANUSCRIT ORIGINAL</p>
                          </div>
                        </motion.div>
                      </div>
                      
                      <div className="md:col-span-2 space-y-10">
                         <div className="space-y-6">
                            <div className="flex items-center gap-3">
                              <div className="h-px w-8 bg-emerald-500" />
                              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Prêt pour l'expérience</span>
                            </div>
                            <h2 className={`text-4xl md:text-6xl font-serif font-black italic tracking-tighter leading-none uppercase ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                              Deux chemins,<br/>une seule oeuvre.
                            </h2>
                            <p className={`text-base font-serif italic max-w-xl leading-relaxed ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'}`}>
                              Choisissez votre mode d'interaction. Plongez dans la lecture pure ou ajustez chaque détail esthétique pour parfaire le voyage.
                            </p>
                         </div>
                         
                         <div className="flex flex-col sm:flex-row gap-6 pt-6">
                           <button 
                            onClick={() => { setGridTab('selection'); setActiveMode('read'); }}
                            className="px-12 py-6 text-[11px] font-black uppercase tracking-[0.4em] rounded-[2rem] hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-4 text-white"
                            style={{ backgroundColor: pubSettings.accentColor || '#10b981' }}
                           >
                             <BookOpen className="h-4 w-4" />
                             Lecture
                           </button>
                           
                           <button 
                            onClick={() => { setGridTab('selection'); setActiveMode('edit'); }}
                            className={`px-12 py-6 text-[11px] font-black uppercase tracking-[0.4em] rounded-[2rem] hover:scale-105 active:scale-95 transition-all border-2 flex items-center justify-center gap-4 ${
                              theme === 'dark' 
                                ? 'bg-zinc-900 text-white border-white/10 hover:bg-zinc-800' 
                                : 'bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50'
                            }`}
                           >
                             <Settings2 className="h-4 w-4" />
                             Modifications
                           </button>
                         </div>
                      </div>
                    </div>

                    {/* Synopsis Cadre Simple */}
                    <motion.div 
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className={`p-10 md:p-16 rounded-[2.5rem] relative overflow-hidden transition-all ${theme === 'dark' ? 'bg-zinc-900 border border-white/5 shadow-2xl' : 'bg-white border border-zinc-100 shadow-sm'}`}
                    >
                       <div className="relative z-10 max-w-4xl mx-auto space-y-12">
                          <div className="space-y-4">
                             <h2 className={`text-[10px] font-black uppercase tracking-[0.4em] ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Project Synopsis</h2>
                             <p className={`font-serif italic text-xl md:text-3xl leading-snug ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-800'}`}>
                                {novel.description || "Une oeuvre cultivée dans le jardin numérique de Flora Writer Pro. Chaque chapitre est une graine, chaque mot une respiration vers l'infini."}
                             </p>
                          </div>

                          <div className={`h-px w-full ${theme === 'dark' ? 'bg-white/5' : 'bg-zinc-100'}`} />

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                             {[
                               { label: 'Genre', value: novel.genre || 'Littérature' },
                               { label: 'Pages', value: Math.max(1, (chapters.length * 5) + 8) }, 
                               { label: 'Chapitres', value: chapters.length },
                               { label: 'Date', value: novel.createdAt ? new Date(novel.createdAt?.seconds ? novel.createdAt.seconds * 1000 : novel.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Mai 2024' }
                             ].map(s => (
                               <div key={s.label} className="space-y-2">
                                  <span className={`text-[9px] font-black uppercase tracking-widest block ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>{s.label}</span>
                                  <span className={`text-xl font-serif italic ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-900'}`}>{s.value}</span>
                               </div>
                             ))}
                          </div>
                       </div>
                    </motion.div>
                  </>
                ) : (
                  <>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                             <div className={`h-2 w-2 rounded-full ${activeMode === 'edit' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Exploration : Mode {activeMode === 'edit' ? 'Modifications' : 'Lecture'}</span>
                          </div>
                          <h2 className={`text-4xl font-serif font-black italic tracking-tighter leading-none uppercase ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>Exposition des Pages</h2>
                        </div>
                        <button 
                          onClick={() => setGridTab('synopsis')}
                          className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-white/5 text-zinc-400 hover:bg-white/10' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                        >
                          Retour au Synopsis
                        </button>
                      </div>

                      <div className="space-y-24 pt-12">
                        {parts.length > 0 ? (
                          parts.sort((a,b) => a.order - b.order).map((part, pIdx) => (
                            <div key={part.id} className="space-y-12">
                              <div className="flex flex-col gap-4">
                                 <div className="flex items-center gap-6">
                                    <div className="space-y-1">
                                       <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.5em] block">PARTIE {pIdx + 1}</span>
                                       <h3 className={`text-3xl font-serif italic tracking-tighter leading-none ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{part.title}</h3>
                                    </div>
                                    <div className={`h-px flex-1 ${theme === 'dark' ? 'bg-white/5' : 'bg-zinc-200'}`} />
                                 </div>
                                 
                              </div>
                              
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                                {chaptersMap[part.id]?.map((chap) => {
                                  const chapIdx = displayableChapters.findIndex(c => c.id === chap.id);
                                  return (
                                  <motion.button
                                    key={chap.id}
                                    whileHover={{ y: -6, scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => openReader(chapIdx)}
                                    className={`aspect-[3/4] rounded-2xl shadow-lg p-5 text-left flex flex-col relative overflow-hidden group border transition-all ${theme === 'dark' ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-100 shadow-sm'}`}
                                  >
                                     <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 pointer-events-none" />
                                     <div 
                                       className="absolute left-0 top-0 bottom-0 w-1 z-0 transition-colors group-hover:w-2" 
                                       style={{ backgroundColor: pubSettings.accentColor || '#10b981', opacity: 0.3 }}
                                     />
                                     
                                     <div className="relative z-10 flex flex-col h-full">
                                       <div className="mb-3">
                                          <span 
                                            className="text-[7px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border transition-colors"
                                            style={{ 
                                              color: pubSettings.accentColor || '#10b981', 
                                              borderColor: `${pubSettings.accentColor || '#10b981'}40` 
                                            }}
                                          >
                                            C.{chapIdx + 1}
                                          </span>
                                       </div>
                                       <h4 className={`font-serif italic font-black text-sm uppercase tracking-tight leading-tight line-clamp-3 ${theme === 'dark' ? 'text-white' : 'text-zinc-800'}`}>
                                         {chap.title}
                                       </h4>
                                       
                                       <div className="mt-auto flex items-center justify-between">
                                          <div className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${theme === 'dark' ? 'bg-white/5 group-hover:bg-emerald-500 shadow-lg' : 'bg-zinc-50 group-hover:bg-emerald-500 shadow-sm'}`}>
                                            <ChevronRight className={`h-4 w-4 transition-colors ${theme === 'dark' ? 'text-zinc-500 group-hover:text-white' : 'text-zinc-400 group-hover:text-white'}`} />
                                          </div>
                                          <span className={`text-[7px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-60 transition-opacity ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                                            {activeMode === 'edit' ? 'Edit' : 'Lire'}
                                          </span>
                                       </div>
                                     </div>
                                  </motion.button>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="space-y-12">
                            <div className="flex items-center gap-6">
                              <h3 className={`text-2xl font-serif italic tracking-tight ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Tous les Chapitres</h3>
                              <div className={`h-px flex-1 ${theme === 'dark' ? 'bg-white/5' : 'bg-zinc-200'}`} />
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                              {chapters.sort((a,b) => a.order - b.order).map((chap, idx) => (
                                <motion.button
                                  key={chap.id}
                                  whileHover={{ y: -6, scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => openReader(idx)}
                                  className={`aspect-[3/4] rounded-2xl shadow-lg p-5 text-left flex flex-col relative overflow-hidden group border border-white/5 ${theme === 'dark' ? 'bg-zinc-900' : 'bg-[#fffbf5]'}`}
                                >
                                   <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black/10 z-0" />
                                   
                                   <div className="relative z-10 flex flex-col h-full">
                                      <span className={`text-[7px] font-black uppercase tracking-[0.2em] mb-4 ${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-300'}`}>C.{idx + 1}</span>
                                      <h4 className={`font-serif italic font-black text-sm uppercase tracking-tight leading-tight line-clamp-3 ${theme === 'dark' ? 'text-white' : 'text-zinc-800'}`}>
                                        {chap.title}
                                      </h4>
                                      <div className="mt-auto flex items-center justify-between">
                                         <div className={`h-px flex-1 mr-3 ${theme === 'dark' ? 'bg-white/5' : 'bg-zinc-100'}`} />
                                         <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${theme === 'dark' ? 'bg-zinc-900/50 group-hover:bg-emerald-500' : 'bg-white group-hover:bg-emerald-500 shadow-sm'}`}>
                                            <ChevronRight className={`h-4 w-4 transition-colors ${theme === 'dark' ? 'text-zinc-500 group-hover:text-white' : 'text-zinc-400 group-hover:text-white'}`} />
                                         </div>
                                      </div>
                                   </div>
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ) : (         <motion.div
              key="reader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`h-full w-full flex flex-col items-center transition-colors relative z-10 ${theme === 'dark' ? 'bg-black/60' : 'bg-zinc-100/60'} backdrop-blur-[2px]`}
            >
              {/* Reader Container */}
              <div className="flex-1 flex flex-col w-full relative overflow-hidden items-center">
                {/* Side Navigation Buttons (Floating) */}
                <div className="absolute inset-0 flex items-center justify-between px-4 md:px-12 pointer-events-none z-50">
                  <motion.button 
                    whileHover={{ scale: 1.1, x: -5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handlePrev}
                    disabled={currentPage === 'cover-front'}
                    className={`h-7 w-7 flex items-center justify-center rounded-full border backdrop-blur-xl pointer-events-auto disabled:opacity-0 transition-all shadow-2xl ${
                      theme === 'dark' ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white/60 border-zinc-200 text-zinc-900 hover:bg-white'
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </motion.button>

                  <motion.button 
                    whileHover={{ scale: 1.1, x: 5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleNext}
                    disabled={typeof currentPage === 'number' && currentPage === displayableChapters.length - 1}
                    className={`h-7 w-7 flex items-center justify-center rounded-full border backdrop-blur-xl pointer-events-auto disabled:opacity-0 transition-all shadow-2xl ${
                      theme === 'dark' ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white/60 border-zinc-200 text-zinc-900 hover:bg-white'
                    }`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </motion.button>
                </div>

                {/* Floating Action Button for Modifications */}
                {viewMode === 'reader' && activeMode === 'edit' && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowSettings(true)}
                    className="fixed bottom-12 right-12 z-[100] px-8 py-4 bg-emerald-600 text-white rounded-full shadow-[0_20px_50px_rgba(16,185,129,0.4)] flex items-center gap-3 font-black uppercase tracking-[0.2em] text-[10px] border border-emerald-400 group"
                  >
                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-45 transition-transform">
                      <Settings2 className="h-4 w-4" />
                    </div>
                    Modifier Style
                  </motion.button>
                )}

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentPage.toString()}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -100) handleNext();
                      if (info.offset.x > 100) handlePrev();
                    }}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                    className={`w-full h-full flex flex-col ${pubSettings.layoutMode === 'analog' ? 'p-10 md:p-24' : 'pt-2 px-6 pb-6 md:pt-4 md:px-12 md:pb-12'} book-page relative overflow-y-auto custom-book-scrollbar cursor-grab active:cursor-grabbing transition-colors duration-500 ${
                      pubSettings.layoutMode === 'analog' ? 'border-l-[32px] border-zinc-200/20' : ''
                    } ${getPageBg()}`}
                  >
                    {/* Page Border Decoration */}
                    {pubSettings.showPageBorder && (
                      <div className={`absolute inset-8 border-[0.5px] pointer-events-none z-[5] ${theme === 'dark' ? 'border-zinc-100/10' : 'border-zinc-900/10'}`} />
                    )}
                    
                    {/* Spine Shadow Effect */}
                    {pubSettings.layoutMode === 'analog' && (
                      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black/10 via-black/5 to-transparent pointer-events-none" />
                    )}
                    
                    {/* Bookmark Ribbon */}
                    {pubSettings.layoutMode === 'analog' && (
                      <div className="absolute top-0 right-12 w-8 h-24 bg-emerald-500/20 border-x border-b border-emerald-500/30 z-[1] flex justify-center items-end pb-2">
                        <div className="w-px h-16 bg-white/40" />
                      </div>
                    )}

                    {/* Atelier Line Styles Integration */}
                    {novel.settings?.lineStyle && novel.settings.lineStyle !== 'none' && pubSettings.layoutMode === 'analog' && (
                      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[1]">
                        {novel.settings.lineStyle === 'horizontal' && (
                          <div className="w-full h-full" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px)', backgroundSize: '100% 2em' }} />
                        )}
                        {novel.settings.lineStyle === 'grid' && (
                          <div className="w-full h-full" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '1.5em 1.5em' }} />
                        )}
                        {novel.settings.lineStyle === 'dot' && (
                          <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '1.5em 1.5em' }} />
                        )}
                      </div>
                    )}

                    {currentPage === 'cover-front' && (
                      <div className={`flex-1 flex flex-col items-center justify-between py-16 px-8 relative z-10 text-center overflow-hidden transition-all duration-700 ${
                        pubSettings.layoutMode === 'analog' ? 'rounded-r-3xl shadow-2xl' : ''
                      } ${(!novel.coverColor || novel.coverColor.startsWith('bg-')) ? (novel.coverColor || 'bg-sage-300') : ''} ${theme === 'dark' ? 'shadow-inner shadow-black/40' : ''}`} 
                      style={{ 
                        backgroundColor: novel.coverColor && novel.coverColor.startsWith('#') ? novel.coverColor : (pubSettings.layoutMode === 'analog' && theme === 'dark' ? '#09090b' : undefined) 
                      }}>
                        {pubSettings.layoutMode === 'analog' && (
                          <div className="absolute left-0 top-0 bottom-0 w-8 bg-black/10 z-20" /> /* Spine edge shadow */
                        )}
                        
                        <div className="h-0.5 w-16 bg-zinc-900/10 mb-8" />
                        
                        <div className="space-y-12 relative z-10 w-full max-w-2xl">
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-2"
                          >
                            <p className={`text-xl font-serif italic ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>{user?.displayName || 'Auteur'}</p>
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="space-y-4"
                          >
                            <h1 
                              style={{ 
                                fontFamily: FONTS.find(f => f.value === pubSettings.fontFamily)?.family || 'serif',
                              }}
                              className={`text-6xl md:text-8xl font-black tracking-tighter uppercase leading-none ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}
                            >
                              {novel.title}
                            </h1>
                            <div className="h-1 w-24 bg-rose-500 mx-auto opacity-50" />
                            <p className={`text-sm font-black uppercase tracking-[0.4em] ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>{novel.genre || 'Roman'}</p>
                          </motion.div>
                        </div>

                        <div className="space-y-6 flex flex-col items-center relative z-10 pt-12">
                          <Ornament style={pubSettings.ornamentStyle} />
                          <div className="flex flex-col items-center gap-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-300">Publication Digitale</p>
                            <p className="text-xs font-serif italic text-zinc-400">Flora Studio Experience</p>
                          </div>
                        </div>

                        <div className="max-w-md space-y-8 relative z-10 pb-8">
                           <div className="flex justify-center items-center gap-4">
                            <div className="h-px w-8 bg-zinc-200/20" />
                            <div className="p-4 rounded-full border border-zinc-200/20 italic font-serif text-[10px] text-zinc-400">
                              {new Date().getFullYear()}
                            </div>
                            <div className="h-px w-8 bg-zinc-200/20" />
                          </div>
                        </div>
                        
                        {pubSettings.layoutMode === 'analog' && (
                          <div className="absolute bottom-8 right-8 text-[8px] font-black uppercase tracking-widest text-zinc-300 opacity-50">
                            Front Cover
                          </div>
                        )}
                      </div>
                    )}

                    {currentPage === 'cover-back' && (
                       <div className={`flex-1 flex flex-col items-center justify-center py-16 px-12 relative z-10 text-center overflow-hidden transition-all duration-700 ${
                         pubSettings.layoutMode === 'analog' ? 'shadow-2xl rounded-l-3xl' : ''
                       } ${(!novel.coverColor || novel.coverColor.startsWith('bg-')) ? (novel.coverColor || 'bg-sage-300') : ''} ${theme === 'dark' ? 'shadow-inner shadow-black/40' : ''}`} 
                       style={{ 
                         backgroundColor: novel.coverColor && novel.coverColor.startsWith('#') ? novel.coverColor : (pubSettings.layoutMode === 'analog' && theme === 'dark' ? '#09090b' : undefined)
                       }}>
                        {pubSettings.layoutMode === 'analog' && (
                          <div className="absolute right-0 top-0 bottom-0 w-8 bg-black/10 z-20" /> /* Edge shadow */
                        )}

                        <div className="max-w-lg space-y-12 relative z-10">
                           <div className="flex justify-center">
                              <Ornament style={pubSettings.ornamentStyle} />
                           </div>
                           
                           <div className="space-y-6">
                              <h3 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-400">Synopsis</h3>
                              <p className={`text-xl font-serif italic leading-relaxed text-center ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                {novel.description || "Une oeuvre cultivée dans le jardin numérique de Flora Writer Pro. Chaque chapitre est une graine, chaque mot une respiration."}
                              </p>
                           </div>

                           <div className="pt-12 border-t border-zinc-200/50 flex flex-col items-center gap-6 w-full">
                              <div className="flex items-center gap-8 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-300">
                                 <span>{chapters.length} Chapitres</span>
                                 <div className="h-1 w-1 bg-zinc-200 rounded-full" />
                                 <span>{parts.length} Parties</span>
                              </div>
                           </div>
                        </div>

                        {pubSettings.layoutMode === 'analog' && (
                          <div className="absolute bottom-8 left-8 text-[8px] font-black uppercase tracking-widest text-zinc-300 opacity-50">
                            Back Cover
                          </div>
                        )}
                       </div>
                    )}

                    {currentPage === 'stats' && (
                      <div className={`flex-1 flex flex-col items-center justify-between py-24 px-12 relative z-10 shadow-sm rounded-lg border overflow-hidden transform scale-95 md:scale-100 transition-colors duration-700 ${
                        pubSettings.layoutMode === 'analog' ? 'border-zinc-200' : 'border-transparent'
                      } ${getPageBg()}`}>
                         <div className="relative z-10 flex flex-col items-center w-full max-w-2xl h-full justify-between py-12 text-center">
                            {/* Author Name at Top */}
                            <div className="mt-8">
                               <p className={`text-2xl md:text-3xl font-serif tracking-tight ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-900'}`}>
                                 {user?.displayName || 'Auteur Flora'}
                               </p>
                            </div>

                            {/* Main Title Center */}
                            <div className="flex flex-col items-center space-y-10 py-12">
                               <div className="space-y-4">
                                 <h2 
                                   style={{ 
                                     fontFamily: FONTS.find(f => f.value === pubSettings.fontFamily)?.family || 'serif',
                                   }}
                                   className={`text-6xl md:text-8xl font-black tracking-tighter leading-none uppercase ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}
                                 >
                                   {novel.title}
                                 </h2>
                                 <div className={`h-[2px] w-24 mx-auto ${theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
                               </div>
                               
                               <div className="space-y-2">
                                  <p className={`text-xl font-serif italic ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                    {novel.genre || 'Roman'}
                                  </p>
                                  {parts.length > 0 && (
                                    <p className={`text-sm font-serif italic opacity-40 ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                      Comprend {parts.length} parties et {chapters.length} chapitres
                                    </p>
                                  )}
                               </div>
                            </div>

                            {/* Credits and Brand at Bottom */}
                            <div className="flex flex-col items-center space-y-16 mt-auto mb-8">
                               <div className="space-y-4 max-w-sm">
                                  <p className={`text-sm font-serif italic leading-relaxed ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                     Une oeuvre cultivée dans le jardin numérique de Flora Writer Pro.
                                  </p>
                               </div>
                               
                               <div className="space-y-2">
                                  <h4 className={`text-xl font-black tracking-[0.5em] uppercase ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                    FLORA STUDIO
                                  </h4>
                                  <div className={`h-px w-12 mx-auto ${theme === 'dark' ? 'bg-white/10' : 'bg-zinc-200'}`} />
                                  <p className={`text-[9px] font-black uppercase tracking-[0.3em] opacity-40 ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                                    EXPERIENCE ÉDITORIALE &bull; 2024
                                  </p>
                               </div>
                            </div>
                         </div>
                      </div>
                    )}

                    {currentPage === 'toc' && (
                      <div className="flex-1 relative z-10">
                        <Ornament style={pubSettings.ornamentStyle} />
                        <h2 className="text-xs font-black uppercase tracking-[0.5em] text-zinc-400 mb-16 text-center">Table des Matières</h2>
                        <div className="space-y-12">
                          {parts.length > 0 ? (
                            parts.sort((a,b) => a.order - b.order).map(part => (
                              <div key={part.id} className="space-y-6">
                                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-300 border-b border-zinc-100 pb-3 italic">{part.title}</h3>
                                <div className="grid gap-6">
                                  {chaptersMap[part.id]?.map(chap => (
                                    <button 
                                      key={chap.id}
                                      onClick={() => setCurrentPage(displayableChapters.findIndex(c => c.id === chap.id))}
                                      className="flex items-center justify-between group"
                                    >
                                      <span className={`font-serif italic text-2xl transition-colors uppercase tracking-tighter ${theme === 'dark' ? 'text-zinc-400 group-hover:text-white' : 'text-zinc-600 group-hover:text-zinc-900'}`}>{chap.title}</span>
                                      <div className={`flex-1 border-b mx-6 h-6 ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'}`} />
                                      <span className={`font-serif italic ${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-300'}`}>ch.</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="grid gap-6">
                               {chapters.sort((a,b) => a.order - b.order).map((chap, idx) => (
                                  <button 
                                    key={chap.id}
                                    onClick={() => setCurrentPage(idx)}
                                    className="flex items-center justify-between group"
                                  >
                                    <span className={`font-serif italic text-2xl transition-colors uppercase tracking-tighter ${theme === 'dark' ? 'text-zinc-400 group-hover:text-white' : 'text-zinc-600 group-hover:text-zinc-900'}`}>{chap.title}</span>
                                    <div className={`flex-1 border-b mx-6 h-6 ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'}`} />
                                    <span className={`font-serif italic ${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-300'}`}>{idx + 1}</span>
                                  </button>
                               ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {typeof currentPage === 'number' && (
                      <div className="flex-1 relative z-10 flex flex-col max-w-5xl mx-auto w-full h-full">
                        <Ornament style={pubSettings.ornamentStyle} type="top" />
                        
                        <div className="text-center space-y-1">
                          <div className="flex items-center justify-center gap-1.5">
                            <Ornament style={pubSettings.ornamentSideStyle} type="side" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400 italic">
                              {displayableChapters[currentPage].type === 'story' || !displayableChapters[currentPage].type 
                                ? `CHAPITRE ${displayableChapters.filter((c, i) => i <= currentPage && (c.type === 'story' || !c.type)).length}`
                                : (displayableChapters[currentPage].type === 'prologue' ? 'PROLOGUE' : 
                                   displayableChapters[currentPage].type === 'interlude' ? 'INTERLUDE' : 
                                   displayableChapters[currentPage].type === 'epilogue' ? 'ÉPILOGUE' : 
                                   displayableChapters[currentPage].type?.toUpperCase())}
                            </h4>
                            <div className="scale-x-[-1]">
                              <Ornament style={pubSettings.ornamentSideStyle} type="side" />
                            </div>
                          </div>
                          
                          <h3 
                            className="text-4xl md:text-5xl font-serif font-black italic uppercase tracking-tighter leading-none"
                            style={{ 
                              fontFamily: FONTS.find(f => f.value === pubSettings.fontFamily)?.family || 'serif'
                            }}
                          >
                            {displayableChapters[currentPage].title}
                          </h3>
                          
                          <Ornament style={pubSettings.ornamentBottomStyle} type="bottom" />
                        </div>

                        <div 
                          className={`chapter-content selection:bg-emerald-100 flex-1 pt-16 ${pubSettings.dropCap ? 'drop-cap-enabled' : ''}`}
                          style={{
                            fontFamily: FONTS.find(f => f.value === pubSettings.fontFamily)?.family || 'serif',
                            fontSize: `${pubSettings.fontSize}px`,
                            lineHeight: pubSettings.lineSpacing,
                          }}
                          dangerouslySetInnerHTML={{ __html: displayableChapters[currentPage].content }}
                        />

                        {/* Progress Bar moved to footer as per user request */}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {typeof currentPage === 'number' && (
                <footer className="px-12 py-2 flex flex-col items-center no-print bg-black backdrop-blur-xl border-t border-white/5 gap-1 shrink-0">
                  <div className="w-full max-w-4xl flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-[0.3em] opacity-40 text-white">
                      <span>DÉBUT</span>
                      <span>PAGE {currentPage + 1} SUR {displayableChapters.length}</span>
                      <span>FIN</span>
                    </div>
                    <div className="h-[1px] w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${((currentPage + 1) / displayableChapters.length) * 100}%` }}
                          className="h-full bg-emerald-500"
                        />
                    </div>
                  </div>
                  
                  <div className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600">
                    F L O R A &bull; P A G E &bull; {currentPage + 5}
                  </div>
                </footer>
              )}

              {/* Keep navigation for non-numeric pages but remove the text based on image 1 */}
              {(currentPage === 'cover-front' || currentPage === 'cover-back' || currentPage === 'stats' || currentPage === 'toc') && (
                <footer className="px-12 py-6 flex justify-center items-center no-print bg-black/40 backdrop-blur-xl border-t border-white/5">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                     {currentPage === 'cover-front' ? 'COUVERTURE AVANT' : 
                      currentPage === 'cover-back' ? 'COUVERTURE ARRIÈRE' :
                      currentPage === 'stats' ? 'PAGE DE TITRE' :
                      'SOMMAIRE'}
                  </div>
                </footer>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .book-page {
          font-variant-numeric: oldstyle-nums;
        }
        .chapter-content p {
          margin-bottom: 1.5em;
          text-indent: 0;
          text-align: justify;
          hyphens: auto;
        }
        .chapter-content h1, .chapter-content h2, .chapter-content h3 {
          margin-top: 2em;
          margin-bottom: 1em;
          font-weight: 900;
          line-height: 1.2;
        }
        .chapter-content.drop-cap-enabled p:first-of-type::first-letter {
          float: left;
          font-size: 4rem;
          line-height: 0.85;
          font-weight: 900;
          padding-right: 12px;
          padding-top: 4px;
          margin-top: 4px;
          color: inherit;
          font-family: inherit;
          font-style: italic;
          opacity: 0.9;
        }
        .chapter-content p:first-of-type {
          text-indent: 0;
        }
        .custom-book-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-book-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.05);
          border-radius: 10px;
        }
        @media print {
          .no-print { display: none !important; }
          .book-page { 
            box-shadow: none !important; 
            margin: 0 !important; 
            width: 100% !important; 
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            border-radius: 0 !important;
            background: white !important;
          }
          .fixed { position: static !important; }
        }
      `}</style>
    </div>
  );
}
