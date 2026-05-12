import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  serverTimestamp, 
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  getDocFromServer,
  setDoc 
} from 'firebase/firestore';
import { auth, db, loginWithGoogle, logout, handleFirestoreError, OperationType } from './firebase';
import { Novel, ViewType, Part, Chapter, Character, Plot } from './types';
const ProjectDashboard = React.lazy(() => import('./components/ProjectDashboard'));
const ManuscriptEditor = React.lazy(() => import('./components/ManuscriptEditor'));
const WritingStatsDetails = React.lazy(() => import('./components/WritingStatsDetails'));
const CharacterList = React.lazy(() => import('./components/CharacterList'));
const SimpleTextEditor = React.lazy(() => import('./components/SimpleTextEditor'));
const IdeasView = React.lazy(() => import('./components/IdeasView'));
const StoryMap = React.lazy(() => import('./components/StoryMap'));
const SubcollectionList = React.lazy(() => import('./components/SubcollectionList'));
const SettingsView = React.lazy(() => import('./components/SettingsView'));
const PublicationView = React.lazy(() => import('./components/PublicationView'));
const StoryOracle = React.lazy(() => import('./components/StoryOracle'));
const StructuresView = React.lazy(() => import('./components/StructuresView'));
import InstallPWA from './components/InstallPWA';
import { 
  Book, 
  Library, 
  LogOut, 
  Plus, 
  Map,
  Download,
  LayoutDashboard, 
  Brain, 
  BrainCircuit,
  Flame, 
  Layers, 
  Users, 
  UserCircle, 
  BookOpen, 
  Globe, 
  AlignLeft,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Hash,
  Menu,
  X,
  Sun,
  Moon,
  Flower2,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  PenTool,
  Settings,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  Copy,
  Palette,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FloatingPetals } from './components/FloatingPetals';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [selectedNovelId, setSelectedNovelId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('projet');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Home states
  const [showLanding, setShowLanding] = useState(true);
  const [showFormatSelector, setShowFormatSelector] = useState(false);
  const [novelToUnlock, setNovelToUnlock] = useState<Novel | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [editingNovel, setEditingNovel] = useState<Novel | null>(null);
  const [showMainSettings, setShowMainSettings] = useState(false);
  
  // Customization states
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accentColor') || '#9FAA74');
  const [homeBackground, setHomeBackground] = useState<'default' | 'minimal' | 'warm' | 'custom'>(() => (localStorage.getItem('homeBackground') as any) || 'warm');
  const [homeBgCustomUrl, setHomeBgCustomUrl] = useState(() => localStorage.getItem('homeBgCustomUrl') || '');
  const [projectDisplay, setProjectDisplay] = useState<'grid' | 'compact'>(() => (localStorage.getItem('projectDisplay') as any) || 'grid');
  const [showInstallPWA, setShowInstallPWA] = useState(false);

  // Sync theme with system
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Novel content states
  const [parts, setParts] = useState<Part[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);

  useEffect(() => {
    localStorage.setItem('accentColor', accentColor);
    localStorage.setItem('homeBackground', homeBackground);
    localStorage.setItem('homeBgCustomUrl', homeBgCustomUrl);
    localStorage.setItem('projectDisplay', projectDisplay);
    
    // Set CSS variable for accent color
    document.documentElement.style.setProperty('--accent-color', accentColor);
    // Rough approximation for lighter version
    document.documentElement.style.setProperty('--accent-color-light', `${accentColor}33`);
  }, [accentColor, homeBackground, homeBgCustomUrl, projectDisplay]);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const selectedNovel = novels.find(n => n.id === selectedNovelId);

  useEffect(() => {
    // Safety check: if a novel is selected but not found in the list (e.g. deleted or invalid storage)
    // we reset the selection so the project list can be shown again.
    if (selectedNovelId && novels.length > 0 && !selectedNovel) {
      setSelectedNovelId(null);
      setShowLanding(true);
    }
  }, [selectedNovelId, novels, selectedNovel]);

  const getHomeBgStyle = () => {
    if (homeBackground === 'custom' && homeBgCustomUrl) {
      return {
        backgroundImage: `url(${homeBgCustomUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }
    return {};
  };

  const getHomeBgClass = () => {
    if (homeBackground === 'minimal') return 'bg-white dark:bg-zinc-950';
    if (homeBackground === 'warm') return 'bg-[#fffbf5] dark:bg-zinc-950';
    if (homeBackground === 'default') return 'bg-[#f0f5f0] dark:bg-zinc-900/50';
    if (homeBackground === 'custom' && homeBgCustomUrl) return '';
    return 'bg-white dark:bg-zinc-950';
  };

  const getHomeGlows = () => {
    if (homeBackground === 'custom' || homeBackground === 'minimal') return null;
    
    // Use accent color for glows to make personalization feel impactful
    const glowColor = accentColor;
    
    if (homeBackground === 'warm') return (
      <>
        <div 
          style={{ backgroundColor: glowColor }}
          className="absolute top-0 right-0 w-[800px] h-[800px] opacity-20 dark:opacity-10 rounded-full blur-[140px] pointer-events-none transition-all duration-700" 
        />
        <div 
          style={{ backgroundColor: glowColor }}
          className="absolute bottom-0 left-0 w-[600px] h-[600px] opacity-20 dark:opacity-10 rounded-full blur-[120px] pointer-events-none transition-all duration-700" 
        />
      </>
    );
    if (homeBackground === 'default') return (
      <>
        <div 
          style={{ backgroundColor: glowColor }}
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] opacity-20 dark:opacity-15 rounded-full blur-[120px] pointer-events-none transition-all duration-700" 
        />
        <div 
          style={{ backgroundColor: glowColor }}
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] opacity-20 dark:opacity-15 rounded-full blur-[120px] pointer-events-none transition-all duration-700" 
        />
      </>
    );
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setNovels([]);
      return;
    }

    const q = query(
      collection(db, 'novels'),
      where('authorId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Novel));
      setNovels(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'novels');
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!selectedNovelId) {
      setParts([]);
      setChapters([]);
      setCharacters([]);
      setPlots([]);
      return;
    }

    const pq = query(collection(db, 'novels', selectedNovelId, 'parts'), orderBy('order', 'asc'));
    const cq = query(collection(db, 'novels', selectedNovelId, 'chapters'), orderBy('order', 'asc'));
    const charQ = query(collection(db, 'novels', selectedNovelId, 'characters'));
    const plotQ = query(collection(db, 'novels', selectedNovelId, 'plots'));

    const unsubscribeParts = onSnapshot(pq, (snap) => {
      setParts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Part)));
    });

    const unsubscribeChapters = onSnapshot(cq, (snap) => {
      setChapters(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chapter)));
    });

    const unsubscribeCharacters = onSnapshot(charQ, (snap) => {
      setCharacters(snap.docs.map(d => ({ id: d.id, ...d.data() } as Character)));
    });

    const unsubscribePlots = onSnapshot(plotQ, (snap) => {
      setPlots(snap.docs.map(d => ({ id: d.id, ...d.data() } as Plot)));
    });

    return () => {
      unsubscribeParts();
      unsubscribeChapters();
      unsubscribeCharacters();
      unsubscribePlots();
    };
  }, [selectedNovelId]);

  useEffect(() => {
    if (!selectedNovelId || activeView === 'projet' || activeView === 'settings' || activeView === 'stats_details') return;

    const trackInterval = setInterval(async () => {
      // Record time if window is active
      if (document.hasFocus()) {
        const todayStr = new Date().toLocaleDateString('fr-FR', { weekday: 'short' });
        const statId = new Date().toISOString().split('T')[0];
        
        try {
          const todayDocRef = doc(db, 'novels', selectedNovelId, 'writing_stats', statId);
          const currentSnap = await getDocFromServer(todayDocRef);
          const currentData = currentSnap.exists() ? currentSnap.data() : { minutes: 0, breakdown: {} };
          
          const newMinutes = (currentData.minutes || 0) + 1;
          const newBreakdown = { ...(currentData.breakdown || {}) };
          newBreakdown[activeView] = (newBreakdown[activeView] || 0) + 1;

          // Find dominant activity
          let dominant: ViewType = activeView;
          let maxVal = newBreakdown[activeView];
          Object.entries(newBreakdown).forEach(([key, val]: [string, any]) => {
            if (val > maxVal) {
              maxVal = val;
              dominant = key as ViewType;
            }
          });

          await setDoc(todayDocRef, {
            minutes: newMinutes,
            breakdown: newBreakdown,
            dominantActivity: dominant,
            date: todayStr,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.error("Global stats tracking error:", e);
        }
      }
    }, 60000);

    return () => clearInterval(trackInterval);
  }, [selectedNovelId, activeView]);

  const createNovel = async (type: string = 'roman') => {
    if (!user) return;
    const title = prompt(`Titre de votre ${type} :`);
    if (!title) return;

    // Use a random color from the extended palettes as requested
    const allExtendedColors = EXTENDED_PALETTES.flatMap(p => p.colors);
    const randomColor = allExtendedColors[Math.floor(Math.random() * allExtendedColors.length)];

    const emojis = ['📖', '🎨', '🎬', '✨', '🪐', '🌿', '🐉', '⚔️', '🐚', '🌙', '🎻', '☕', '🔆', '💛', '💙', '🍁', '🪷', '🍂', '💸'];
    
    try {
      await addDoc(collection(db, 'novels'), {
        title,
        type,
        authorId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        universe: '',
        notes: '',
        coverColor: randomColor,
        coverEmoji: emojis[Math.floor(Math.random() * emojis.length)]
      });
      setShowFormatSelector(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'novels');
    }
  };

  const openNovel = (novel: Novel) => {
    if (novel.pinCode) {
      setNovelToUnlock(novel);
      setPinInput('');
      setPinError(false);
    } else {
      setSelectedNovelId(novel.id);
    }
  };

  const verifyPin = () => {
    if (novelToUnlock && pinInput === novelToUnlock.pinCode) {
      setSelectedNovelId(novelToUnlock.id);
      setNovelToUnlock(null);
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 500);
    }
  };

  const duplicateNovel = async (novel: Novel) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'novels'), {
        ...novel,
        title: `${novel.title} (Copie)`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        authorId: user.uid,
        id: undefined // Let firebase generate new ID
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRenamePart = async (part: Part) => {
    if (!selectedNovelId) return;
    const newTitle = prompt('Nouveau nom de la partie :', part.title);
    if (!newTitle || newTitle === part.title) return;
    try {
      await updateDoc(doc(db, 'novels', selectedNovelId, 'parts', part.id), { title: newTitle });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRenameChapter = async (chap: Chapter) => {
    if (!selectedNovelId) return;
    const newTitle = prompt('Nouveau nom du chapitre :', chap.title);
    if (!newTitle || newTitle === chap.title) return;
    try {
      await updateDoc(doc(db, 'novels', selectedNovelId, 'chapters', chap.id), { title: newTitle });
    } catch (e) {
      console.error(e);
    }
  };

  const deletePart = async (id: string) => {
    if (!selectedNovelId) return;
    if (!window.confirm('Supprimer cette partie ?')) return;
    try {
      await deleteDoc(doc(db, 'novels', selectedNovelId, 'parts', id));
    } catch (e) { console.error(e); }
  };

  const deleteChapter = async (id: string) => {
    if (!selectedNovelId) return;
    if (!window.confirm('Supprimer ce chapitre ?')) return;
    try {
      await deleteDoc(doc(db, 'novels', selectedNovelId, 'chapters', id));
    } catch (e) { console.error(e); }
  };

  const addPartInSidebar = async () => {
    if (!selectedNovelId) return;
    const title = prompt('Titre de la nouvelle partie :');
    if (!title) return;
    try {
      await addDoc(collection(db, 'novels', selectedNovelId, 'parts'), {
        title,
        order: parts.length + 1,
        createdAt: serverTimestamp()
      });
    } catch (e) { console.error(e); }
  };

  const addChapterInSidebar = async (partId: string) => {
    if (!selectedNovelId) return;
    const title = prompt('Titre du nouveau chapitre :');
    if (!title) return;
    try {
      await addDoc(collection(db, 'novels', selectedNovelId, 'chapters'), {
        title,
        content: '',
        order: chapters.length + 1,
        partId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e) { console.error(e); }
  };

  const duplicatePart = async (part: Part) => {
    if (!selectedNovelId) return;
    try {
      const newPartDoc = await addDoc(collection(db, 'novels', selectedNovelId, 'parts'), {
        title: `${part.title} (Copie)`,
        order: parts.length + 1,
        createdAt: serverTimestamp()
      });
      
      // Also duplicate chapters in this part
      const chaptersInPart = chapters.filter(c => c.partId === part.id);
      for (const chap of chaptersInPart) {
        await addDoc(collection(db, 'novels', selectedNovelId, 'chapters'), {
          ...chap,
          title: `${chap.title} (Copie)`,
          partId: newPartDoc.id,
          id: undefined,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (e) { console.error(e); }
  };

  const duplicateChapter = async (chap: Chapter) => {
    if (!selectedNovelId) return;
    try {
      await addDoc(collection(db, 'novels', selectedNovelId, 'chapters'), {
        ...chap,
        title: `${chap.title} (Copie)`,
        order: chapters.length + 1,
        id: undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e) { console.error(e); }
  };

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="h-16 w-16 rounded-[2rem] flex items-center justify-center shadow-2xl relative"
          style={{ backgroundColor: accentColor }}
        >
           <Flower2 className="h-8 w-8 text-white" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white dark:bg-zinc-950 p-6 text-center relative overflow-hidden transition-colors duration-1000">
        <FloatingPetals />
        <div className="absolute inset-0 bg-gradient-to-tr from-sage-400/5 via-white to-orange-400/5 dark:from-sage-900/10 dark:via-zinc-950 dark:to-orange-900/10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sage-400/10 dark:bg-sage-400/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-sage-400/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-400/5 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Animated background elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * 100 + "%", 
                y: Math.random() * 100 + "%",
                opacity: 0.1,
                scale: Math.random() * 0.5 + 0.5
              }}
              animate={{
                y: [null, "-20%", "120%"],
                x: [null, (Math.random() - 0.5) * 20 + "%"],
                rotate: [0, 360],
              }}
              transition={{
                duration: 20 + Math.random() * 30,
                repeat: Infinity,
                ease: "linear",
                delay: -Math.random() * 20
              }}
              className="absolute w-64 h-64 border-2 border-sage-300/10 rounded-full flex items-center justify-center"
            >
              <div className="w-4 h-4 rounded-full bg-sage-400/10" />
            </motion.div>
          ))}
        </div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-md w-full space-y-12 relative z-10"
        >
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="h-24 w-24 rounded-[2rem] bg-[#9FAA74] flex items-center justify-center shadow-2xl ring-8 ring-[#9FAA74]/10 dark:ring-white/5 transition-all">
                <Flower2 className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-800 dark:text-white uppercase italic">
              Flora <br />
              <span className="text-[#9FAA74]">Writer Pro</span>
            </h1>
            <p className="text-sm text-zinc-500 font-medium italic">Cultivez vos récits dans un jardin numérique.</p>
          </div>

          <button
            onClick={loginWithGoogle}
            className="group flex w-full items-center justify-center gap-4 rounded-[2rem] bg-sage-300 px-8 py-6 text-base font-black uppercase tracking-widest text-white shadow-2xl transition-all hover:bg-sage-400 active:scale-95"
          >
            Se connecter
            <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
          </button>
        </motion.div>
      </div>
    );
  }

  if (showLanding && !selectedNovelId) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-1000">
        <FloatingPetals />
        <div className="absolute inset-0 bg-gradient-to-tr from-sage-400/5 via-white to-orange-400/5 dark:from-sage-900/10 dark:via-zinc-950 dark:to-orange-900/10 pointer-events-none" />
        {/* Background Decorative Elements */}
        {getHomeGlows()}
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 text-center space-y-12 max-w-xl px-4"
        >
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex flex-col items-center space-y-8"
          >
            <div className="h-32 w-32 rounded-[2.5rem] flex items-center justify-center shadow-2xl relative overflow-hidden bg-[#9FAA74] ring-[12px] ring-[#9FAA74]/10 dark:ring-white/5 transition-all">
              <Flower2 className="h-14 w-14 text-white relative z-10" />
              <div className="absolute inset-0 bg-white/10 dark:bg-white/5 opacity-50" />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-5xl md:text-8xl font-black tracking-tight text-zinc-800 dark:text-white uppercase italic leading-[1]">
                Flora <br />
                <span className="text-[#9FAA74] block">Writer Pro</span>
              </h1>
              <p className="text-base text-[#4A6644]/70 dark:text-zinc-500 font-medium tracking-normal max-w-sm mx-auto leading-relaxed">
                L'espace de création où chaque mot prend racine et chaque idée fleurit.
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-col items-center gap-8"
          >
            <button 
              onClick={() => setShowLanding(false)}
              className="group px-16 py-6 bg-[#9FAA74] dark:bg-zinc-800 text-white rounded-[2rem] text-lg font-black uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-4"
            >
              <span>Commencer</span>
              <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
            </button>
            <div className="flex items-center gap-4 text-[#C66F80] font-black italic uppercase tracking-widest text-[11px]">
              <Sparkles className="h-4 w-4" />
              <span>Prêt à écrire ?</span>
              <Sparkles className="h-4 w-4" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (!selectedNovelId || !selectedNovel) {
    return (
      <div className={`min-h-screen ${getHomeBgClass()} p-8 transition-colors duration-500 overflow-y-auto relative`} style={getHomeBgStyle()}>
        <FloatingPetals />
        {getHomeGlows()}
        <div className="mx-auto max-w-5xl relative z-10">
          {isOffline && (
            <div className="fixed top-0 left-0 right-0 bg-sage-400 text-white text-[10px] font-black uppercase tracking-widest py-1.5 text-center z-[1000] shadow-lg">
              Mode Hors Ligne Activé - Flora Writer Pro
            </div>
          )}
          <AnimatePresence>
            {novelToUnlock && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-black/60"
              >
                <div className="bg-white dark:bg-zinc-900 p-10 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] border border-white/10 max-w-sm w-full text-center space-y-8">
                  <div className="flex justify-center">
                    <div className="h-20 w-20 bg-indigo-500 rounded-[2rem] flex items-center justify-center shadow-xl">
                      <Lock className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-900 dark:text-white">Projet Sécurisé</h2>
                    <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">Saisis ton code secret</p>
                  </div>

                  <div className="flex justify-center gap-3">
                    {[0, 1, 2, 3].map((i) => (
                      <div 
                        key={i}
                        className={`h-12 w-12 rounded-2xl border-4 transition-all duration-300 ${
                          pinInput.length > i 
                          ? 'bg-indigo-300 border-indigo-400 scale-110' 
                          : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                        } ${pinError ? 'translate-x-1 animate-shake border-red-500' : ''}`}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '←'].map((num) => (
                      <button
                        key={num}
                        onClick={() => {
                          if (num === 'C') setPinInput('');
                          else if (num === '←') setPinInput(prev => prev.slice(0, -1));
                          else if (typeof num === 'number' && pinInput.length < 4) {
                            const newPin = pinInput + num;
                            setPinInput(newPin);
                            if (newPin.length === 4) {
                              // Verify PIN happens on the next render or we can trigger it here
                              setTimeout(() => {
                                if (novelToUnlock && newPin === novelToUnlock.pinCode) {
                                  setSelectedNovelId(novelToUnlock.id);
                                  setNovelToUnlock(null);
                                } else {
                                  setPinError(true);
                                  setPinInput('');
                                  setTimeout(() => setPinError(false), 500);
                                }
                              }, 300);
                            }
                          }
                        }}
                        className="h-14 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-2xl flex items-center justify-center text-xl font-black text-zinc-900 dark:text-white transition-all active:scale-90"
                      >
                        {num}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => setNovelToUnlock(null)}
                    className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </motion.div>
            )}

            {editingNovel && (
              <EditNovelModal 
                novel={editingNovel} 
                onClose={() => setEditingNovel(null)} 
                onDuplicate={duplicateNovel}
              />
            )}

            {showMainSettings && (
              <MainSettingsModal 
                onClose={() => setShowMainSettings(false)}
                homeBackground={homeBackground}
                setHomeBackground={setHomeBackground}
                homeBgCustomUrl={homeBgCustomUrl}
                setHomeBgCustomUrl={setHomeBgCustomUrl}
                projectDisplay={projectDisplay}
                setProjectDisplay={setProjectDisplay}
                accentColor={accentColor}
                setAccentColor={setAccentColor}
                theme={theme}
                setTheme={setTheme}
              />
            )}
          </AnimatePresence>

          <header className="mb-8 flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-sage-300 dark:bg-zinc-800 flex items-center justify-center shadow-lg">
                <Book className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-lg font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter">Mes Projets</h1>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowFormatSelector(!showFormatSelector)}
                className="flex items-center gap-2 rounded-full bg-sage-300 dark:bg-zinc-800 px-5 py-2 text-xs font-black text-white dark:text-sage-300 hover:bg-sage-400 shadow-lg transition-all active:scale-95 border dark:border-white/5"
              >
                {showFormatSelector ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {showFormatSelector ? 'Fermer' : 'Nouveau Projet'}
              </button>
              <button 
                onClick={logout}
                className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {showFormatSelector ? (
              <motion.div
                key="selector"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                className="space-y-8"
              >
                <div className="text-center space-y-1">
                  <h2 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white italic uppercase tracking-tighter">Choisis ton format</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-600 font-medium italic">Quelle histoire vas-tu planter aujourd'hui ?</p>
                </div>
                
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                   <FormatCard 
                    title="📖 Roman" 
                    desc="Structure classique pour les récits longs et profonds." 
                    color="bg-sage-300"
                    onClick={() => createNovel('Roman')}
                   />
                   <FormatCard 
                    title="🎨 Comic / Manga" 
                    desc="Pensé pour les découpages en cases et le visuel." 
                    color="bg-pink-300"
                    onClick={() => createNovel('Comic')}
                   />
                   <FormatCard 
                    title="🎬 Scénario" 
                    desc="Structure technique pour le cinéma et le théâtre." 
                    color="bg-orange-300"
                    onClick={() => createNovel('Scénario')}
                   />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`grid gap-6 ${projectDisplay === 'compact' ? 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}
              >
              {novels.map((novel, index) => (
                  <motion.div
                    key={novel.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 1) }}
                    whileHover={{ y: -10 }}
                    onContextMenu={(e) => { e.preventDefault(); setEditingNovel(novel); }}
                    className={`group relative ${projectDisplay === 'compact' ? 'h-[180px] max-w-[130px]' : 'h-[240px] max-w-[170px]'} w-full mx-auto perspective-1000 select-none`}
                  >
                    <button 
                      onClick={() => openNovel(novel)}
                      className="relative h-full w-full rounded-r-[1rem] rounded-l-[0.2rem] bg-zinc-900 overflow-hidden shadow-[10px_20px_40px_rgba(0,0,0,0.3)] transition-transform duration-500 group-hover:rotate-y-[-15deg] group-hover:scale-105"
                    >
                      <div 
                        className={`absolute inset-0 ${(!novel.coverColor || novel.coverColor.startsWith('bg-')) ? (novel.coverColor || 'bg-sage-300') : ''} border-y border-r border-white/10`} 
                        style={novel.coverColor && novel.coverColor.startsWith('#') ? { backgroundColor: novel.coverColor } : {}}
                      />
                      
                      {novel.coverImageUrl && (
                        <img 
                          src={novel.coverImageUrl} 
                          className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-60" 
                          referrerPolicy="no-referrer"
                        />
                      )}

                      {/* Realistic book spine shadow & details */}
                      <div className="absolute left-0 top-0 bottom-0 w-4 bg-black/15 group-hover:bg-black/10 transition-colors" />
                      <div className="absolute left-4 top-0 bottom-0 w-[1px] bg-white/10" />
                      
                      {/* Cover content */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                        <div className="text-3xl mb-4 filter drop-shadow-xl transform group-hover:scale-110 transition-transform duration-700">
                          {novel.coverEmoji || '📖'}
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-sm font-black text-white italic uppercase tracking-tighter leading-tight drop-shadow-md [text-wrap:balance]">
                            {novel.title}
                          </h3>
                          <div className="h-0.5 w-8 bg-white/30 mx-auto rounded-full" />
                        </div>

                        <p className="absolute bottom-8 text-[7px] font-black uppercase tracking-[0.3em] text-white/50">
                          {novel.type || 'Roman'}
                        </p>
                      </div>

                      {/* Texture overlay */}
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] opacity-20 pointer-events-none mix-blend-overlay" />
                      
                      {/* Password lock indicator */}
                      {novel.pinCode && (
                        <div className="absolute top-3 right-3">
                          <Lock className="h-3 w-3 text-white/40" />
                        </div>
                      )}
                    </button>

                    {/* Edit Overlay (Small & Premium) */}
                    <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-all z-20 flex flex-col gap-2 translate-x-2 group-hover:translate-x-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingNovel(novel); }}
                        className="p-2.5 bg-white dark:bg-zinc-800 rounded-full shadow-2xl hover:scale-110 transition-transform hover:bg-sage-100 dark:hover:bg-zinc-700"
                        title="Paramètres"
                      >
                        <Settings className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); duplicateNovel(novel); }}
                        className="p-2.5 bg-white dark:bg-zinc-800 rounded-full shadow-2xl hover:scale-110 transition-transform hover:bg-indigo-50 dark:hover:bg-zinc-700"
                        title="Dupliquer"
                      >
                        <Copy className="h-4 w-4 text-indigo-400" />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if(window.confirm('Supprimer ce livre ?')) {
                            deleteDoc(doc(db, 'novels', novel.id));
                          }
                        }}
                        className="p-2.5 bg-white dark:bg-zinc-800 rounded-full shadow-2xl hover:scale-110 transition-transform hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>

                    {/* Page edges effect */}
                    <div className="absolute -right-1 top-2 bottom-2 w-3 bg-zinc-100 dark:bg-zinc-800 -z-10 rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                ))}

                {novels.length === 0 && (
                  <button 
                    onClick={() => setShowFormatSelector(true)}
                    className="h-[240px] w-full max-w-[170px] mx-auto rounded-r-[1rem] rounded-l-[0.3rem] border-2 border-dashed border-zinc-800 light:border-sage-200 flex flex-col items-center justify-center gap-3 text-zinc-600 hover:text-white light:hover:text-sage-500 hover:border-zinc-600 light:hover:border-sage-400 transition-all group shadow-sm bg-zinc-900/20 light:bg-white/50"
                  >
                    <div className="h-10 w-10 rounded-full bg-zinc-900 light:bg-white border border-zinc-800 light:border-sage-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus className="h-4 w-4" />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-center px-4">Cultiver une histoire</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="fixed bottom-10 right-10 flex flex-col gap-4 z-[60]">
          <button 
            onClick={() => setShowMainSettings(true)}
            className="p-5 bg-white dark:bg-zinc-800 rounded-full shadow-2xl border border-zinc-100 dark:border-white/10 hover:scale-110 active:scale-95 transition-all text-zinc-500 hover:text-sage-300"
            title="Personnaliser l'accueil"
          >
            <Settings className="h-6 w-6" />
          </button>

          <button 
            onClick={() => setShowInstallPWA(true)}
            className="p-5 bg-emerald-500 rounded-full shadow-2xl border border-emerald-400 hover:scale-110 active:scale-95 transition-all text-white"
            title="Télécharger l'application"
          >
            <Download className="h-6 w-6" />
          </button>
        </div>

        <InstallPWA manualTrigger={showInstallPWA} onManualClose={() => setShowInstallPWA(false)} />
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'} overflow-hidden font-sans transition-colors duration-700 relative`}>
      <FloatingPetals />
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-sage-400 text-white text-[10px] font-black uppercase tracking-widest py-1 text-center z-[1000] shadow-md">
          Mode Hors Ligne Activé
        </div>
      )}
      {/* Background Glows */}
      <div className={`absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none transition-all duration-1000 ${
        theme === 'dark' ? 'bg-sage-300 opacity-[0.03]' : 'bg-sage-100 opacity-20'
      }`} />
      {/* Sidebar */}
      <div className="relative flex h-full">
        <AnimatePresence mode="popLayout">
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 bottom-0 w-80 flex flex-col border-r border-zinc-900 dark:border-zinc-800 bg-white dark:bg-zinc-950 z-40 h-full shadow-[20px_0_60px_rgba(0,0,0,0.2)] dark:shadow-[10px_0_40px_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-center gap-2 p-8 border-b border-zinc-100 dark:border-zinc-900">
                <button 
                  onClick={() => setSelectedNovelId(null)}
                  className="p-2 -ml-2 text-zinc-400 dark:text-zinc-500 hover:text-sage-300 dark:hover:text-sage-400 transition-colors shrink-0"
                  title="Retour aux projets"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-3 font-black tracking-tighter uppercase italic text-2xl text-zinc-900 dark:text-white min-w-0 flex-1">
                  <motion.div 
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.8, ease: "anticipate" }}
                    className="h-9 w-9 rounded-xl flex items-center justify-center text-white shadow-lg overflow-hidden relative shrink-0"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Flower2 className="h-6 w-6 relative z-10" />
                  </motion.div>
                  <span className="hidden sm:inline">Flora</span>
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
                {/* Construction de l'histoire */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                    <div className="h-2 w-2 rounded-full bg-[#9FAA74]" />
                    <h3 className="font-serif italic text-lg text-zinc-800 dark:text-zinc-200">Construction de l'histoire</h3>
                  </div>

                  <SidebarSection label="PERSONNAGES">
                    <SidebarItem 
                      active={activeView === 'perso_principaux'} 
                      onClick={() => setActiveView('perso_principaux')}
                      icon={<UserCircle />}
                      label="Personnages Principaux"
                      accentColor={accentColor}
                    />
                    <SidebarItem 
                      active={activeView === 'perso_secondaires'} 
                      onClick={() => setActiveView('perso_secondaires')}
                      icon={<Users />}
                      label="Personnages Secondaires"
                      accentColor={accentColor}
                    />
                  </SidebarSection>

                  <SidebarSection label="UNIVERS">
                    <SidebarItem 
                      active={activeView === 'lieux'} 
                      onClick={() => setActiveView('lieux')}
                      icon={<Map />}
                      label="Lieux"
                      accentColor={accentColor}
                    />
                    <SidebarItem 
                      active={activeView === 'notes_idees'} 
                      onClick={() => setActiveView('notes_idees')}
                      icon={<Brain />}
                      label="Idées / Notes"
                      accentColor={accentColor}
                    />
                    <SidebarItem 
                      active={activeView === 'organigramme'} 
                      onClick={() => setActiveView('organigramme')}
                      icon={<Layers />}
                      label="Schéma Narratif"
                      accentColor={accentColor}
                    />
                  </SidebarSection>
                </div>

                {/* Atelier d'écriture */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                    <div className="h-2 w-2 rounded-full bg-[#C66F80]" />
                    <h3 className="font-serif italic text-lg text-zinc-800 dark:text-zinc-200">Atelier d'écriture</h3>
                  </div>

                  <SidebarSection label="STRUCTURE">
                    <SidebarItem 
                      active={activeView === 'manuscrit'} 
                      onClick={() => setActiveView('manuscrit')}
                      icon={<AlignLeft />}
                      label="Parties"
                      accentColor={accentColor}
                    />
                    <SidebarItem 
                      active={activeView === 'writer' as any} 
                      onClick={() => setActiveView('manuscrit')}
                      icon={<BookOpen />}
                      label="Chapitres"
                      accentColor={accentColor}
                    />
                    <SidebarItem 
                      active={activeView === 'publication'} 
                      onClick={() => setActiveView('publication')}
                      icon={<Layers />}
                      label="Publication"
                      accentColor={accentColor}
                    />
                    <SidebarItem 
                      active={activeView === 'oracle'} 
                      onClick={() => setActiveView('oracle')}
                      icon={<BrainCircuit />}
                      label="Oracle"
                      accentColor={accentColor}
                    />
                  </SidebarSection>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900">
                  <SidebarItem 
                    active={activeView === 'projet'} 
                    onClick={() => setActiveView('projet')}
                    icon={<LayoutDashboard />}
                    label="TABLEAU DE BORD"
                    accentColor={accentColor}
                  />
                  <SidebarItem 
                    active={activeView === 'settings'} 
                    onClick={() => setActiveView('settings')}
                    icon={<Settings />}
                    label="RÉGLAGES"
                    accentColor={accentColor}
                  />
                </div>
              </nav>

              <div className="p-6 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/20 dark:bg-zinc-950/20 flex flex-col gap-4">
                <div className="flex items-center gap-4 p-3 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-white/5 shadow-sm">
                   <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md" style={{ backgroundColor: accentColor }}>
                    {user.email?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 truncate">
                    <p className="text-xs font-black truncate text-zinc-900 dark:text-white uppercase tracking-tighter">{user.email?.split('@')[0]}</p>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-black">Maitre d'œuvre</p>
                  </div>
                  <button 
                    onClick={logout}
                    className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                    title="Se déconnecter"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Sidebar toggle attached to internal sidebar edge */}
              <button 
                onClick={() => setSidebarOpen(false)}
                className="absolute top-1/2 -translate-y-1/2 -right-8 z-50 h-20 w-8 bg-zinc-950 light:bg-white border border-zinc-900 light:border-rose-100 border-l-0 rounded-r-3xl flex items-center justify-center text-zinc-600 hover:text-sage-400 transition-all shadow-2xl"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Floating toggle when closed */}
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute top-1/2 -translate-y-1/2 left-0 z-50 h-20 w-8 bg-zinc-950 light:bg-white border border-zinc-900 light:border-rose-100 border-l-0 rounded-r-3xl flex items-center justify-center text-zinc-600 hover:text-sage-400 transition-all shadow-2xl"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-w-0 h-full relative overflow-hidden ${getHomeBgClass()}`} style={getHomeBgStyle()}>
        {getHomeGlows()}
        {/* Dynamic Background Glows */}
        <div className={`absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] opacity-[0.08] light:opacity-[0.03] pointer-events-none transition-all duration-1000 ${
          activeView === 'manuscrit' ? 'bg-sage-300' :
          activeView.includes('perso') ? 'bg-orange-300' :
          activeView === 'lieux' ? 'bg-pink-400' :
          activeView === 'organigramme' ? 'bg-pink-300' :
          activeView === 'notes_idees' ? 'bg-rose-400' :
          'bg-sage-300'
        }`} />
        <div className={`absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.05] light:opacity-[0.02] pointer-events-none transition-all duration-1000 ${
          activeView === 'manuscrit' ? 'bg-sage-200' :
          activeView.includes('perso') ? 'bg-orange-200' :
          activeView === 'lieux' ? 'bg-pink-200' :
          activeView === 'organigramme' ? 'bg-pink-200' :
          activeView === 'notes_idees' ? 'bg-rose-200' :
          'bg-sage-200'
        }`} />

        <div className={`flex-1 overflow-y-auto relative z-10 ${(activeView === 'organigramme' || activeView === 'manuscrit' || activeView === 'publication' || activeView === 'structure') ? 'p-0 overflow-hidden' : 'p-6 lg:p-10 pb-32'} custom-scrollbar`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView + selectedNovelId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'circOut' }}
              className={`${(activeView === 'organigramme' || activeView === 'manuscrit' || activeView === 'publication' || activeView === 'perso_principaux' || activeView === 'perso_secondaires') ? 'max-w-none w-full' : 'max-w-7xl mx-auto'} h-full`}
            >
              <React.Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                </div>
              }>
                <WorkspaceView 
                  novel={selectedNovel} 
                  view={activeView} 
                  onNavigate={setActiveView} 
                  theme={theme} 
                  accentColor={accentColor}
                  user={user}
                  parts={parts}
                  chapters={chapters}
                  characters={characters}
                  plots={plots}
                />
              </React.Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <InstallPWA manualTrigger={showInstallPWA} onManualClose={() => setShowInstallPWA(false)} />
    </div>
  );
}

function SidebarSection({ label, children, color }: { label: string, children: React.ReactNode, color?: string }) {
  return (
    <div className="space-y-3">
      {label && <h4 className="px-5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">{label}</h4>}
      <div className="space-y-0 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-[2rem] overflow-hidden border border-zinc-100 dark:border-white/5">
        {children}
      </div>
    </div>
  );
}

function SidebarItem({ active, onClick, icon, label, accentColor }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, accentColor?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-5 py-3 text-xs font-medium transition-all group relative ${
        active 
          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' 
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-800/30'
      }`}
    >
      <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
        active ? 'bg-zinc-100 dark:bg-zinc-900' : 'bg-transparent'
      }`}>
        <span className={`${active ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-600'} group-hover:scale-110 transition-transform`}>
          {React.cloneElement(icon as React.ReactElement<any>, { 
            style: { color: active ? accentColor : undefined },
            className: `${(icon as React.ReactElement<any>).props.className || ''} h-4 w-4`
          })}
        </span>
      </div>
      <span className="flex-1 text-left truncate font-medium">{label}</span>
      <ChevronRight className={`h-4 w-4 transition-all ${active ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`} style={{ color: accentColor }} />
      
      {active && (
        <motion.div 
          layoutId="sidebar-active-indicator"
          className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full"
          style={{ backgroundColor: accentColor }}
        />
      )}
    </button>
  );
}

function WorkspaceView({ 
  novel, 
  view, 
  onNavigate, 
  theme, 
  accentColor,
  user,
  parts,
  chapters,
  characters,
  plots
}: { 
  novel: Novel, 
  view: ViewType, 
  onNavigate: (view: ViewType) => void, 
  theme: 'dark' | 'light', 
  accentColor?: string,
  user: User,
  parts: Part[],
  chapters: Chapter[],
  characters: Character[],
  plots: Plot[]
}) {
  if (!novel) return null;
  switch (view) {
    case 'projet':
      return <ProjectDashboard novel={novel} onNavigate={onNavigate} accentColor={accentColor} />;
    case 'manuscrit':
      return <ManuscriptEditor novel={novel} theme={theme} />;
    case 'perso_principaux':
      return <CharacterList novel={novel} role="Main" />;
    case 'perso_secondaires':
      return <CharacterList novel={novel} role="Secondary" />;
    case 'lieux':
      return <SubcollectionList novel={novel} collectionName="locations" />;
    case 'organigramme':
      return <StoryMap novel={novel} onNavigate={onNavigate} />;
    case 'notes_idees':
      return <IdeasView novel={novel} />;
    case 'notes_generales':
      return <SimpleTextEditor novel={novel} field="notes" />;
    case 'settings':
      return <SettingsView novel={novel} />;
    case 'stats_details':
      return <WritingStatsDetails novel={novel} onBack={() => onNavigate('projet')} accentColor={accentColor} theme={theme} />;
    case 'publication':
      return <PublicationView 
        novel={novel} 
        parts={parts} 
        chapters={chapters} 
        onNavigate={onNavigate} 
        theme={theme} 
        accentColor={accentColor}
        user={user}
      />;
    case 'oracle':
      return <StoryOracle 
        novel={novel} 
        characters={characters} 
        chapters={chapters} 
        parts={parts}
        plots={plots}
        accentColor={accentColor}
      />;
    case 'structure':
      return <StructuresView novel={novel} />;
    default:
      return <ProjectDashboard novel={novel} onNavigate={onNavigate} accentColor={accentColor} />;
  }
}


function FormatCard({ title, desc, color, onClick }: { title: string, desc: string, color: string, onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -10, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-8 rounded-[3rem] ${color} text-left h-[340px] flex flex-col justify-between group overflow-hidden shadow-2xl border-4 border-white/20`}
    >
      <div className="relative z-10">
        <Sparkles className="h-5 w-5 text-white/40 mb-3 group-hover:rotate-45 transition-transform" />
        <h3 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter leading-tight mb-2">{title}</h3>
        <p className="text-white/80 font-medium text-xs leading-relaxed max-w-[180px]">{desc}</p>
      </div>

      <div className="relative z-10 flex items-center justify-between">
        <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
          <ArrowRight className="h-6 w-6 text-white group-hover:translate-x-1 transition-transform" />
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-1 w-4 rounded-full bg-white/30" />
          ))}
        </div>
      </div>

      {/* Decorative patterns */}
      <Flower2 className="absolute top-[-20px] right-[-20px] h-32 w-32 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
    </motion.button>
  );
}

// Reusing imports from top

import { BASE_COLORS, EMOJIS_PRESET, EMOJIS_EXTRA, EXTENDED_PALETTES } from './constants';

function MainSettingsModal({ 
  onClose, 
  homeBackground, 
  setHomeBackground, 
  homeBgCustomUrl,
  setHomeBgCustomUrl,
  projectDisplay, 
  setProjectDisplay,
  accentColor,
  setAccentColor,
  theme,
  setTheme
}: { 
  onClose: () => void, 
  homeBackground: string, 
  setHomeBackground: (b: any) => void,
  homeBgCustomUrl: string,
  setHomeBgCustomUrl: (u: string) => void,
  projectDisplay: string,
  setProjectDisplay: (d: any) => void,
  accentColor: string,
  setAccentColor: (c: string) => void,
  theme: string,
  setTheme: (t: any) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setHomeBgCustomUrl(reader.result as string);
        setHomeBackground('custom');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60"
    >
      <div className="bg-white dark:bg-zinc-950 rounded-[3rem] shadow-2xl border border-white/10 max-w-md w-full overflow-hidden flex flex-col">
        <div className="p-8 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Palette className="h-6 w-6" />
            </div>
            <h2 className="text-lg md:text-xl font-black uppercase italic tracking-tighter dark:text-white truncate">Personnalisation</h2>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8 space-y-10 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {/* Accent Color */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Couleur d'accentuation</label>
            <div className="flex flex-wrap gap-2">
              {['#9FAA74', '#C66F80', '#D44084', '#3B5226', '#FFCE99', '#F4C7D0', '#4A6644', '#F58421'].map(c => (
                <button
                  key={c}
                  onClick={() => setAccentColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-10 w-10 rounded-full border-4 transition-all ${accentColor === c ? 'border-white dark:border-zinc-950 scale-110 shadow-lg' : 'border-transparent'}`}
                />
              ))}
            </div>
          </div>

          {/* Theme Selector */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Apparence</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-3 p-4 rounded-3xl border transition-all ${theme === 'light' ? 'bg-zinc-900 text-white border-zinc-900 shadow-xl' : 'bg-zinc-50 dark:bg-zinc-900 border-transparent text-zinc-500'}`}
              >
                <Sun className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-widest">Claire</span>
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-3 p-4 rounded-3xl border transition-all ${theme === 'dark' ? 'bg-white text-black border-white shadow-xl' : 'bg-zinc-50 dark:bg-zinc-900 border-transparent text-zinc-500'}`}
              >
                <Moon className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-widest">Sombre</span>
              </button>
            </div>
          </div>

          {/* Background */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Atmosphère d'accueil</label>
            <div className="flex flex-wrap gap-3">
              {[
                { id: 'default', label: 'Studio' },
                { id: 'minimal', label: 'Epuré' },
                { id: 'warm', label: 'Solaire' },
                { id: 'custom', label: 'Perso' }
              ].map(bg => (
                <button
                  key={bg.id}
                  onClick={() => setHomeBackground(bg.id as any)}
                  className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                    homeBackground === bg.id 
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-xl scale-105' 
                    : 'bg-zinc-100 dark:bg-zinc-900/50 text-zinc-500 border-transparent'
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>

            {homeBackground === 'custom' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3 pt-2"
              >
                <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-white/5 overflow-hidden">
                  <Globe className="h-4 w-4 text-zinc-400 shrink-0" />
                  <input 
                    value={homeBgCustomUrl}
                    onChange={(e) => setHomeBgCustomUrl(e.target.value)}
                    placeholder="Lien de l'image (https://...)"
                    className="bg-transparent border-none outline-none text-xs w-full dark:text-white truncate"
                  />
                </div>
                
                <div className="flex gap-2">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-zinc-600 dark:text-zinc-300"
                  >
                    <Upload className="h-4 w-4" />
                    Importer depuis le téléphone
                  </button>
                  {homeBgCustomUrl && (
                    <button 
                      onClick={() => setHomeBgCustomUrl('')}
                      className="px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-2xl text-[10px] font-black uppercase transition-all"
                    >
                      Effacer
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Project Display */}
          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Présentation des projets</label>
             <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setProjectDisplay('grid')}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    projectDisplay === 'grid' 
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white' 
                    : 'bg-zinc-100 dark:bg-zinc-900/50 border-transparent text-zinc-500'
                  }`}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span className="text-xs font-black uppercase tracking-widest">Grille</span>
                </button>
                <button 
                  onClick={() => setProjectDisplay('compact')}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    projectDisplay === 'compact' 
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white' 
                    : 'bg-zinc-100 dark:bg-zinc-900/50 border-transparent text-zinc-500'
                  }`}
                >
                  <Layers className="h-5 w-5" />
                  <span className="text-xs font-black uppercase tracking-widest">Compact</span>
                </button>
             </div>
          </div>
        </div>

        <div className="p-8 bg-zinc-50 dark:bg-zinc-900/50 flex justify-center mt-auto">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl transition-all active:scale-95"
          >
            Appliquer
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function EditNovelModal({ novel, onClose, onDuplicate }: { novel: Novel, onClose: () => void, onDuplicate: (n: Novel) => void }) {
  const [title, setTitle] = useState(novel.title);
  const [description, setDescription] = useState(novel.description || '');
  const [emoji, setEmoji] = useState(novel.coverEmoji || '📖');
  const [image, setImage] = useState(novel.coverImageUrl || '');
  const [pin, setPin] = useState(novel.pinCode || '');
  const [saving, setSaving] = useState(false);
  const [showAllEmojis, setShowAllEmojis] = useState(false);
  const [showExtendedColors, setShowExtendedColors] = useState(true); // Default to true as user requested these colors
  const [customHex, setCustomHex] = useState(novel.coverColor?.startsWith('#') ? novel.coverColor : '');
  const [color, setColor] = useState(novel.coverColor?.startsWith('bg-') ? novel.coverColor : '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        alert("L'image est trop lourde (max 800 Ko)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'novels', novel.id), {
        title,
        description,
        coverEmoji: emoji,
        coverColor: customHex || color,
        coverImageUrl: image || null,
        pinCode: pin || null,
        updatedAt: serverTimestamp()
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce livre ?')) return;
    try {
      await deleteDoc(doc(db, 'novels', novel.id));
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const currentBgStyle = customHex ? { backgroundColor: customHex } : {};

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 backdrop-blur-xl bg-black/60"
    >
      <div className="bg-white dark:bg-zinc-900 rounded-[3rem] shadow-2xl border border-white/10 max-w-2xl w-full overflow-hidden flex flex-col max-h-[95vh]">
        <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 md:h-12 md:w-12 bg-sage-100 dark:bg-sage-950/30 rounded-2xl flex items-center justify-center">
              <Settings className="h-5 w-5 md:h-6 md:w-6 text-sage-500" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black uppercase italic tracking-tighter dark:text-white">Relier le livre</h2>
              <p className="text-[9px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Configuration & Apparence</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-10">
          <div className="grid md:grid-cols-2 gap-10">
            <div className="space-y-8">
              {/* Preview Card */}
              <div className="flex justify-center flex-col items-center gap-3 bg-zinc-50 dark:bg-zinc-800/20 p-6 md:p-8 rounded-[2.5rem] border border-zinc-100 dark:border-white/5">
                <div 
                  style={currentBgStyle}
                  className={`h-56 w-40 rounded-r-[1.5rem] rounded-l-[0.3rem] ${customHex ? '' : color} shadow-2xl flex flex-col items-center justify-center p-6 text-center relative border-y border-r border-white/20 overflow-hidden group/prev`}
                >
                  {image && (
                    <img src={image} className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-50" referrerPolicy="no-referrer" />
                  )}
                  <div className="relative z-10">
                    <div className="text-5xl mb-6 filter drop-shadow-xl">{emoji}</div>
                    <div className="text-xs font-black text-white uppercase tracking-tighter leading-tight drop-shadow-md">{title || 'Sans titre'}</div>
                  </div>
                  <div className="absolute left-0 inset-y-0 w-3 md:w-4 bg-black/10" />
                </div>
                <p className="text-[8px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest italic">Aperçu Visuel</p>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Titre du Projet</label>
                <input 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-6 py-4 text-sm font-bold dark:text-white focus:ring-2 focus:ring-sage-300 outline-none transition-all"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-6 py-4 text-[11px] font-medium dark:text-white focus:ring-2 focus:ring-sage-300 outline-none resize-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Teinte de Couverture</label>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <Hash className="h-2.5 w-2.5 text-zinc-400" />
                    <input 
                      value={customHex}
                      onChange={(e) => {
                        setCustomHex(e.target.value);
                        if (e.target.value) setColor('');
                      }}
                      placeholder="HEXA"
                      className="w-12 bg-transparent text-[9px] font-mono font-bold dark:text-white outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  {EXTENDED_PALETTES.map(palette => (
                    <div key={palette.name} className="space-y-2">
                      <p className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400">{palette.name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {palette.colors.map(c => (
                          <button
                            key={c}
                            onClick={() => { setCustomHex(c); setColor(''); }}
                            style={{ backgroundColor: c }}
                            className={`h-5 w-5 md:h-6 md:w-6 rounded-md border transition-all ${customHex === c ? 'border-zinc-900 dark:border-white scale-125 shadow-lg' : 'border-black/5 hover:scale-110'}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Emblème (Emoji)</label>
                  <input 
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    className="w-10 h-7 bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg text-center text-sm focus:ring-1 focus:ring-sage-300 outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJIS_PRESET.map(e => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={`h-9 w-9 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-white/5 flex items-center justify-center text-lg hover:scale-110 transition-transform ${emoji === e ? 'bg-white shadow-md border-sage-200 ring-1 ring-sage-200' : ''}`}
                    >
                      {e}
                    </button>
                  ))}
                  {showAllEmojis && EMOJIS_EXTRA.map(e => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={`h-9 w-9 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-white/5 flex items-center justify-center text-lg hover:scale-110 transition-transform ${emoji === e ? 'bg-white shadow-md border-sage-200 ring-1 ring-sage-200' : ''}`}
                    >
                      {e}
                    </button>
                  ))}
                  <button 
                    onClick={() => setShowAllEmojis(!showAllEmojis)}
                    className="h-9 w-9 rounded-xl border border-dashed border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showAllEmojis ? <ChevronUp className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Illustration (URL Image)</label>
                <div className="flex flex-col gap-2">
                  <input 
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-6 py-3 text-[11px] font-bold dark:text-white focus:ring-2 focus:ring-sage-300 outline-none"
                    placeholder="URL de l'image..."
                  />
                  <div className="flex gap-2">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept="image/*" 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Importer du téléphone
                    </button>
                    {image && (
                      <button 
                        onClick={() => setImage('')}
                        className="px-5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl text-[9px] font-black uppercase transition-all"
                      >
                        Effacer
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Sécurité (CODE PIN)</label>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <Lock className={`h-2.5 w-2.5 ${pin ? 'text-red-500' : 'text-zinc-300'}`} />
                    <span className="text-[8px] font-black uppercase tracking-tighter text-zinc-500">{pin ? 'Privé' : 'Accès libre'}</span>
                  </div>
                </div>
                <input 
                  value={pin}
                  maxLength={4}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="CODE SECRET (4 CHIFFRES)"
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-6 py-4 text-xs font-black dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none tracking-[0.4em]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-8 md:px-10 md:py-8 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-white/5 flex flex-wrap items-center justify-center gap-4 sm:justify-between">
          <button 
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-red-500 px-5 py-3 rounded-2xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-all border border-red-100 dark:border-red-900/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>SUPPRIMER</span>
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { onDuplicate(novel); onClose(); }}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>DUPLIQUER</span>
            </button>
            <button 
              disabled={saving}
              onClick={handleSave}
              className="px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? 'CHARGEMENT...' : 'SAUVEGARDER'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
