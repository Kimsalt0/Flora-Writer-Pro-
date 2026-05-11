import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, getDocFromServer, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Novel, Part, Chapter, WritingStat } from '../types';
import { Plus, BookOpen, ChevronRight, ChevronDown, Trash2, LayoutList, Type as TypeIcon, List, ListOrdered, CaseSensitive, Bold, Italic, Underline as UnderlineIcon, Maximize2, Minimize2, Save, Feather, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, Quote, Sparkles, Check, AlertCircle, X, Hash, Globe, Strikethrough, Highlighter, Palette, FileCog, Flower2, Settings as SettingsIcon, Info, Image as ImageIcon, Upload, ArrowUp, ArrowDown, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Strike } from '@tiptap/extension-strike';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import { reviewText, Correction } from '../services/geminiService';
import { BASE_COLORS, EXTENDED_PALETTES, FONTS } from '../constants';

export default function ManuscriptEditor({ novel, theme }: { novel: Novel, theme: 'dark' | 'light' }) {
  const [parts, setParts] = useState<Part[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set());
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const [showChaptersNav, setShowChaptersNav] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<Chapter | null>(null);

  const [showVisualSettings, setShowVisualSettings] = useState(false);
  const [showCorrections, setShowCorrections] = useState(false);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [fontFamily, setFontFamily] = useState(novel.settings?.fontFamily || 'serif');
  const [fontSize, setFontSize] = useState(novel.settings?.fontSize || 14);
  const [lineSpacing, setLineSpacing] = useState(novel.settings?.lineSpacing || 1.6);
  const [backgroundType, setBackgroundType] = useState<'color' | 'image'>(novel.settings?.backgroundType || 'color');
  const [backgroundColor, setBackgroundColor] = useState(novel.settings?.backgroundColor || '#ffffff');
  const [bgImage, setBgImage] = useState(novel.settings?.backgroundImageUrl || '');
  const [lineStyle, setLineStyle] = useState<string>(novel.settings?.lineStyle || 'none');

  // Sync settings with database changes
  useEffect(() => {
    if (novel.settings) {
      if (novel.settings.fontFamily) setFontFamily(novel.settings.fontFamily);
      if (novel.settings.fontSize) setFontSize(novel.settings.fontSize);
      if (novel.settings.lineSpacing) setLineSpacing(novel.settings.lineSpacing);
      if (novel.settings.backgroundType) setBackgroundType(novel.settings.backgroundType);
      if (novel.settings.backgroundColor) setBackgroundColor(novel.settings.backgroundColor);
      if (novel.settings.backgroundImageUrl !== undefined) setBgImage(novel.settings.backgroundImageUrl || '');
      if (novel.settings.lineStyle) setLineStyle(novel.settings.lineStyle);
    }
  }, [novel.id, novel.settings?.updatedAt]); // Use updatedAt if available or just novel.settings

  const lineStyles: { id: string, label: string, icon: React.ReactNode }[] = [
    { id: 'none', label: 'Pur', icon: <div className="w-full h-full border border-zinc-200 rounded" /> },
    { id: 'horizontal', label: 'Lignes', icon: <div className="w-full h-full border-b border-zinc-200" /> },
    { id: 'grid', label: 'Petits Carreaux', icon: <div className="w-full h-full border border-zinc-200 flex flex-wrap"><div className="w-1/2 h-1/2 border" /><div className="w-1/2 h-1/2 border" /></div> },
    { id: 'large-grid', label: 'Grands Carreaux', icon: <div className="w-full h-6 border-2 border-zinc-200" /> },
    { id: 'notebook', label: 'Cahier Rose', icon: <div className="w-full h-full flex"><div className="w-1/5 h-full border-r border-red-200" /><div className="flex-1 border-b border-zinc-200" /></div> },
    { id: 'seyes', label: 'Grands Carreaux', icon: <div className="w-full h-full border-2 border-indigo-100 flex flex-col"><div className="h-1/3 border-b border-indigo-50 shadow-[0_4px_0_rgba(0,0,0,0.02)]" /><div className="h-1/3 border-b border-indigo-50 shadow-[0_4px_0_rgba(0,0,0,0.02)]" /></div> },
    { id: 'dot', label: 'Points', icon: <div className="w-full h-full flex items-center justify-center gap-1"><div className="w-0.5 h-0.5 bg-zinc-300 rounded-full" /><div className="w-0.5 h-0.5 bg-zinc-300 rounded-full" /></div> },
    { id: 'noise', label: 'Grain Épais', icon: <div className="w-full h-full bg-zinc-200" style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/60-lines.png)' }} /> },
    { id: 'paper', label: 'Papier Fibres', icon: <div className="w-full h-full bg-zinc-50" style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/paper-fibers.png)' }} /> },
    { id: 'recycled', label: 'Coton bio', icon: <div className="w-full h-full bg-zinc-100" style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/natural-paper.png)' }} /> },
    { id: 'vintage', label: 'Vieux Livre', icon: <div className="w-full h-full bg-orange-100" style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/old-mathematics.png)' }} /> },
    { id: 'blueprint', label: 'Technique', icon: <div className="w-full h-full bg-blue-50/20" style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/graphy.png)' }} /> },
    { id: 'parchment', label: 'Parchemin', icon: <div className="w-full h-full bg-[#f4ebd0]" style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/parchment.png)' }} /> },
    { id: 'cloth', label: 'Tissu', icon: <div className="w-full h-full bg-zinc-200" style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/cloth-alike.png)' }} /> },
    { id: 'rough', label: 'Papier Rugueux', icon: <div className="w-full h-full bg-zinc-100" style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/rough-paper.png)' }} /> },
    { id: 'leather', label: 'Cuir Grainé', icon: <div className="w-full h-full bg-zinc-300" style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/leather.png)' }} /> },
    { id: 'canvas', label: 'Toile Tissée', icon: <div className="w-full h-full bg-zinc-200" style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/canvas-orange.png)' }} /> },
  ];

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 0);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const bgFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleBgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        alert("L'image est trop lourde (max 800 Ko)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setBgImage(base64);
        saveVisualSettings({ backgroundImageUrl: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const chapterTypes = [
    { id: 'story', label: 'Histoire', icon: <Feather className="h-3 w-3" /> },
    { id: 'preface', label: 'Préface', icon: <Info className="h-3 w-3" /> },
    { id: 'appendix', label: 'Annexe', icon: <Hash className="h-3 w-3" /> },
    { id: 'index', label: 'Index', icon: <Globe className="h-3 w-3" /> },
    { id: 'afterword', label: 'Postface', icon: <Sparkles className="h-3 w-3" /> },
  ];

  const updateChapterType = async (type: string) => {
    if (!selectedChapterId || !selectedChapterId.startsWith('new_')) { // Don't update if it's local only? Wait, selectedChapterId is from Firestore
      try {
        await updateDoc(doc(db, 'novels', novel.id, 'chapters', selectedChapterId!), {
          type: type,
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'chapters');
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      setViewportHeight(vv.height);
      setKeyboardOffset(window.innerHeight - vv.height);
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  const isLight = (color: string) => {
    const hex = color.replace('#', '');
    if (hex.length !== 6) return true;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155;
  };

  const bgColor = backgroundColor;
  // If the user hasn't explicitly picked a color and we are in dark mode, we could default to something darker
  const effectiveBgColor = (bgColor === '#ffffff' && theme === 'dark') ? '#09090b' : bgColor;
  const textColor = '#18181b'; // Force black definitively as requested
  const lightMode = isLight(effectiveBgColor);

  const saveChapter = async (forceContent?: string) => {
    if (!selectedChapterId || !editor) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'novels', novel.id, 'chapters', selectedChapterId), {
        content: forceContent || editor.getHTML(),
        updatedAt: serverTimestamp()
      });
      setLastSaved(new Date());
    } catch (e) { 
      handleFirestoreError(e, OperationType.UPDATE, 'chapters'); 
    } finally {
      setSaving(false);
    }
  };

  const [pressedChapterId, setPressedChapterId] = useState<string | null>(null);
  const [pressStartTime, setPressStartTime] = useState<number>(0);
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });

  const startLongPress = (chapter: Chapter, e: React.PointerEvent) => {
    const startTime = Date.now();
    setPressStartTime(startTime);
    setTouchStartPos({ x: e.clientX, y: e.clientY });
    
    longPressTimer.current = setTimeout(() => {
      setChapterToDelete(chapter);
      setPressedChapterId(null);
    }, 800); // 800ms of holding
    setPressedChapterId(chapter.id);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pressedChapterId) return;
    
    const dist = Math.sqrt(
      Math.pow(e.clientX - touchStartPos.x, 2) + 
      Math.pow(e.clientY - touchStartPos.y, 2)
    );
    
    if (dist > 10) { // If moved more than 10px, cancel long press
      cancelLongPress();
    }
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setPressedChapterId(null);
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Strike,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
    ],
    editable: true,
    content: '',
    onUpdate: ({ editor }) => {
      // Debounced auto-save could be implemented here
    },
    editorProps: {
      attributes: {
        class: `prose prose-zinc ${lightMode ? 'prose-normal' : 'prose-invert'} max-w-none focus:outline-none transition-colors`,
        style: `font-family: ${FONTS.find(f => f.value === fontFamily)?.family || 'serif'}; font-size: ${fontSize}px; line-height: ${lineSpacing}; min-height: 70vh; color: ${textColor};`
      },
    },
  }, [fontFamily, fontSize, lineSpacing, bgColor]);
  
  // Handle auto-save with a timeout
  useEffect(() => {
    if (!editor || !selectedChapterId) return;

    const timeout = setTimeout(() => {
      saveChapter();
    }, 5000); // Auto-save every 5 seconds if changed

    return () => clearTimeout(timeout);
  }, [editor?.getHTML(), selectedChapterId]);

  const togglePart = (id: string) => {
    const next = new Set(expandedParts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedParts(next);
  };

  const deleteChapter = async (chapter: Chapter, e: React.MouseEvent) => {
    e.stopPropagation();
    setChapterToDelete(chapter);
  };

  const moveChapter = async (chapter: Chapter, direction: 'up' | 'down') => {
    const index = chapters.findIndex(c => c.id === chapter.id);
    if (direction === 'up' && index > 0) {
      const prev = chapters[index - 1];
      await updateDoc(doc(db, 'novels', novel.id, 'chapters', chapter.id), { order: prev.order });
      await updateDoc(doc(db, 'novels', novel.id, 'chapters', prev.id), { order: chapter.order });
    } else if (direction === 'down' && index < chapters.length - 1) {
      const next = chapters[index + 1];
      await updateDoc(doc(db, 'novels', novel.id, 'chapters', chapter.id), { order: next.order });
      await updateDoc(doc(db, 'novels', novel.id, 'chapters', next.id), { order: chapter.order });
    }
  };

  const movePart = async (part: Part, direction: 'up' | 'down') => {
    const index = parts.findIndex(p => p.id === part.id);
    if (direction === 'up' && index > 0) {
      const prev = parts[index - 1];
      await updateDoc(doc(db, 'novels', novel.id, 'parts', part.id), { order: prev.order });
      await updateDoc(doc(db, 'novels', novel.id, 'parts', prev.id), { order: part.order });
    } else if (direction === 'down' && index < parts.length - 1) {
      const next = parts[index + 1];
      await updateDoc(doc(db, 'novels', novel.id, 'parts', part.id), { order: next.order });
      await updateDoc(doc(db, 'novels', novel.id, 'parts', next.id), { order: part.order });
    }
  };

  const renamePart = async (partId: string) => {
    const part = parts.find(p => p.id === partId);
    const newTitle = prompt('Nouveau titre de la partie :', part?.title);
    if (newTitle && newTitle !== part?.title) {
      try {
        await updateDoc(doc(db, 'novels', novel.id, 'parts', partId), { title: newTitle });
      } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'parts'); }
    }
  };

  const confirmDelete = async () => {
    if (!chapterToDelete) return;
    try {
      await deleteDoc(doc(db, 'novels', novel.id, 'chapters', chapterToDelete.id));
      
      // Re-order ALL subsequent chapters to fill the gap
      const remaining = chapters
        .filter(c => c.id !== chapterToDelete.id)
        .sort((a, b) => a.order - b.order);
      
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].order !== i + 1) {
          await updateDoc(doc(db, 'novels', novel.id, 'chapters', remaining[i].id), { order: i + 1 });
        }
      }

      if (selectedChapterId === chapterToDelete.id) setSelectedChapterId(null);
      setChapterToDelete(null);
    } catch (e) { 
      handleFirestoreError(e, OperationType.DELETE, 'chapters'); 
    }
  };

  const deletePart = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Supprimer cette partie ? (Les chapitres resteront)')) {
      try {
        await deleteDoc(doc(db, 'novels', novel.id, 'parts', id));
      } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'parts'); }
    }
  };

  const saveVisualSettings = async (updates: any) => {
    try {
      const newSettings = {
        ...novel.settings,
        fontFamily,
        fontSize,
        lineSpacing,
        backgroundType,
        backgroundColor,
        backgroundImageUrl: bgImage,
        lineStyle,
        ...updates,
        updatedAt: Date.now() // Force a change detection
      };
      
      await updateDoc(doc(db, 'novels', novel.id), {
        settings: newSettings,
        updatedAt: serverTimestamp()
      });
    } catch (e) { 
      console.error('Error saving visual settings:', e);
      handleFirestoreError(e, OperationType.UPDATE, 'novels');
    }
  };

  const getTextureStyle = () => {
    const opacity = lightMode ? '0.07' : '0.12';
    switch (lineStyle) {
      case 'horizontal':
        return {
          backgroundImage: `linear-gradient(${lightMode ? 'rgba(0,0,0,'+opacity+')' : 'rgba(255,255,255,'+opacity+')'} 1px, transparent 1px)`,
          backgroundSize: `100% ${lineSpacing}em`
        };
      case 'grid':
        return {
          backgroundImage: `linear-gradient(${lightMode ? 'rgba(0,0,0,'+opacity+')' : 'rgba(255,255,255,'+opacity+')'} 1px, transparent 1px), linear-gradient(90deg, ${lightMode ? 'rgba(0,0,0,'+opacity+')' : 'rgba(255,255,255,'+opacity+')'} 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        };
      case 'notebook':
        return {
          backgroundImage: `linear-gradient(90deg, transparent 79px, #ab47bc 79px, #ab47bc 81px, transparent 81px), linear-gradient(${lightMode ? 'rgba(0,105,192,0.1)' : 'rgba(255,255,255,0.1)'} 1px, transparent 1px)`,
          backgroundSize: `100% 100%, 100% ${lineSpacing}em`
        };
      case 'dot':
        return {
          backgroundImage: `radial-gradient(${lightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'} 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        };
      case 'large-grid':
        return {
          backgroundImage: `linear-gradient(${lightMode ? 'rgba(0,0,0,'+opacity+')' : 'rgba(255,255,255,'+opacity+')'} 2px, transparent 2px), linear-gradient(90deg, ${lightMode ? 'rgba(0,0,0,'+opacity+')' : 'rgba(255,255,255,'+opacity+')'} 2px, transparent 2px)`,
          backgroundSize: '64px 64px'
        };
      case 'noise':
        return {
          backgroundImage: `url(https://www.transparenttextures.com/patterns/60-lines.png)`,
          opacity: lightMode ? 0.05 : 0.2
        };
      case 'paper':
        return {
          backgroundImage: `url(https://www.transparenttextures.com/patterns/paper-fibers.png)`,
          opacity: lightMode ? 0.4 : 0.15
        };
      case 'vintage':
        return {
          backgroundImage: `url(https://www.transparenttextures.com/patterns/old-mathematics.png)`,
          opacity: lightMode ? 0.25 : 0.07
        };
      case 'recycled':
        return {
          backgroundImage: `url(https://www.transparenttextures.com/patterns/natural-paper.png)`,
          opacity: lightMode ? 0.3 : 0.1
        };
      case 'blueprint':
        return {
          backgroundImage: `url(https://www.transparenttextures.com/patterns/graphy.png)`,
          opacity: lightMode ? 0.1 : 0.05
        };
      case 'parchment':
        return {
          backgroundImage: `url(https://www.transparenttextures.com/patterns/parchment.png)`,
          opacity: lightMode ? 0.4 : 0.1
        };
      case 'cloth':
        return {
          backgroundImage: `url(https://www.transparenttextures.com/patterns/cloth-alike.png)`,
          opacity: lightMode ? 0.2 : 0.05
        };
      case 'rough':
        return {
          backgroundImage: `url(https://www.transparenttextures.com/patterns/rough-paper.png)`,
          opacity: lightMode ? 0.3 : 0.1
        };
      case 'seyes':
        return {
          backgroundImage: `linear-gradient(${lightMode ? 'rgba(0,105,192,0.1)' : 'rgba(255,255,255,0.05)'} 1px, transparent 1px)`,
          backgroundSize: `100% ${lineSpacing/3}em`,
          borderLeft: `2px solid ${lightMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'}`,
          marginLeft: '4rem',
          paddingLeft: '2rem'
        };
      case 'leather':
        return {
          backgroundImage: `url(https://www.transparenttextures.com/patterns/leather.png)`,
          opacity: lightMode ? 0.15 : 0.05
        };
      case 'canvas':
        return {
          backgroundImage: `url(https://www.transparenttextures.com/patterns/canvas-orange.png)`,
          opacity: lightMode ? 0.1 : 0.05
        };
      default:
        return {};
    }
  };

  const selectedChapter = chapters.find(c => c.id === selectedChapterId);

  useEffect(() => {
    if (selectedChapter && editor) {
      if (editor.getHTML() !== (selectedChapter.content || '')) {
        editor.commands.setContent(selectedChapter.content || '');
      }
    }
  }, [selectedChapterId, editor, selectedChapter?.content]);

  useEffect(() => {
    const qParts = query(collection(db, 'novels', novel.id, 'parts'), orderBy('order', 'asc'));
    const unsubParts = onSnapshot(qParts, (snap) => {
      setParts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Part)));
    });

    const qChapters = query(collection(db, 'novels', novel.id, 'chapters'), orderBy('order', 'asc'));
    const unsubChapters = onSnapshot(qChapters, (snap) => {
      setChapters(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chapter)));
    });

    return () => {
      unsubParts();
      unsubChapters();
    };
  }, [novel.id]);

  const startReview = async () => {
    if (!editor) return;
    setIsReviewing(true);
    setShowCorrections(true);
    const text = editor.getText();
    const results = await reviewText(text);
    setCorrections(results);
    setIsReviewing(false);
  };

  const simulateErrors = () => {
    if (!editor) return;
    const currentHTML = editor.getHTML();
    
    const replacements = [
      { from: /maison/g, to: 'maizon' },
      { from: /écrire/g, to: 'écrirre' },
      { from: /histoire/g, to: 'hisstoire' },
      { from: /soleil/g, to: 'solleil' },
      { from: /souvent/g, to: 'souveant' },
      { from: /regard/g, to: 'reguard' },
      { from: /penser/g, to: 'pencer' },
      { from: /toujours/g, to: 'toujour' },
      { from: /déjà/g, to: 'dejà' },
      { from: /peut-être/g, to: 'peut-etre' },
      { from: /maintenant/g, to: 'maintennant' },
      { from: /magnifique/g, to: 'magniffique' }
    ];

    let newHTML = currentHTML;
    let found = false;
    
    replacements.forEach(r => {
      const match = newHTML.match(r.from);
      if (match && match.length > 0) {
        // Only replace the first occurrence to avoid messing up everything
        newHTML = newHTML.replace(r.from, r.to);
        found = true;
      }
    });

    if (found) {
      editor.commands.setContent(newHTML);
    } else {
      editor.commands.insertContent('<p>Cessi est une fote simuler pour le tesste.</p>');
    }
  };

  const applyCorrection = (correction: Correction) => {
    if (!editor) return;
    const content = editor.getHTML();
    // Simple search and replace for the correction
    // This is a naive implementation but works for simple text fragments
    const newContent = content.replace(correction.error, correction.suggestion);
    editor.commands.setContent(newContent);
    setCorrections(prev => prev.filter(c => c.error !== correction.error));
  };

  const ignoreCorrection = (correction: Correction) => {
    setCorrections(prev => prev.filter(c => c.error !== correction.error));
  };

  const addPart = async () => {
    const title = prompt('Titre de la nouvelle partie :');
    if (!title) return;
    try {
      await addDoc(collection(db, 'novels', novel.id, 'parts'), {
        title,
        order: parts.length + 1,
        createdAt: serverTimestamp()
      });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'parts'); }
  };

  const addChapter = async (partId?: string) => {
    const title = prompt('Titre du chapitre :');
    if (!title) return;
    try {
      const newChapter = await addDoc(collection(db, 'novels', novel.id, 'chapters'), {
        title,
        content: '',
        order: chapters.length + 1,
        partId: partId || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setSelectedChapterId(newChapter.id);
      setZenMode(true);
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'chapters'); }
  };

  return (
    <div className="h-full relative overflow-hidden transition-colors duration-500" 
      style={{ 
        backgroundColor: backgroundType === 'color' ? effectiveBgColor : 'transparent',
      }}
    >
      {backgroundType === 'image' && bgImage && (
        <div className="absolute inset-0 z-0 opacity-20 bg-cover bg-center pointer-events-none" style={{ backgroundImage: `url(${bgImage})` }} />
      )}

      {/* Texture Overlay */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-50"
        style={getTextureStyle()}
      />

      {/* Visual Settings Overlay */}
      <AnimatePresence>
        {showVisualSettings && (
          <motion.div 
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-8 top-24 bottom-24 w-80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-3xl z-[100] rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.15)] border border-zinc-100 dark:border-white/10 p-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white">Atelier</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Écrin d'écriture</p>
              </div>
              <button 
                onClick={() => setShowVisualSettings(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors font-black text-xs"
              >
                X
              </button>
            </div>

            <div className="space-y-4">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Type de Chapitre</label>
              <div className="flex flex-wrap gap-2">
                {chapterTypes.map(ct => (
                  <button
                    key={ct.id}
                    onClick={() => updateChapterType(ct.id)}
                    className={`px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                      chapters.find(c => c.id === selectedChapterId)?.type === ct.id
                        ? 'bg-sage-300 border-sage-300 text-white shadow-sm'
                        : 'bg-transparent border-zinc-100 dark:border-white/10 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                    }`}
                  >
                    {ct.icon}
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Police</label>
              <div className="grid grid-cols-2 gap-2">
                {FONTS.map(f => (
                  <button 
                    key={f.value}
                    onClick={() => { setFontFamily(f.value); saveVisualSettings({ fontFamily: f.value }); }}
                    className={`p-3 rounded-2xl border-2 transition-all text-sm ${fontFamily === f.value ? 'border-sage-300 bg-sage-50 dark:bg-sage-500/10' : 'border-zinc-100 dark:border-white/5'}`}
                    style={{ fontFamily: f.family }}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Taille</label>
                  <span className="text-[10px] font-black text-sage-500">{fontSize}px</span>
                </div>
                <input type="range" min="12" max="32" value={fontSize} onChange={(e) => { const v = parseInt(e.target.value); setFontSize(v); saveVisualSettings({ fontSize: v }); }} className="w-full accent-sage-300" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Espacement</label>
                  <span className="text-[10px] font-black text-sage-500">{lineSpacing}</span>
                </div>
                <input type="range" min="1" max="2.5" step="0.1" value={lineSpacing} onChange={(e) => { const v = parseFloat(e.target.value); setLineSpacing(v); saveVisualSettings({ lineSpacing: v }); }} className="w-full accent-sage-300" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Ambiance & Texture</label>
              <div className="grid grid-cols-4 gap-2">
                {lineStyles.map(s => (
                  <button key={s.id} onClick={() => { setLineStyle(s.id as any); saveVisualSettings({ lineStyle: s.id }); }} className={`aspect-square p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center ${lineStyle === s.id ? 'border-sage-300 bg-sage-50 dark:bg-zinc-800' : 'border-zinc-100 dark:border-white/5'}`}>
                    <div className="w-full h-4 mb-1">{s.icon}</div>
                    <span className="text-[7px] font-black uppercase">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Fond personnalisé</label>
              <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
                <button 
                  onClick={() => { setBackgroundType('color'); saveVisualSettings({ backgroundType: 'color' }); }} 
                  className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${backgroundType === 'color' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500'}`}
                >
                  Couleur
                </button>
                <button 
                  onClick={() => { setBackgroundType('image'); saveVisualSettings({ backgroundType: 'image' }); }} 
                  className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${backgroundType === 'image' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500'}`}
                >
                  Image
                </button>
              </div>
              {backgroundType === 'color' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-6 gap-3">
                    {[
                      '#ffffff', '#fffcf9', '#f3f4f6', '#fdf2f8', '#f0fdf4', '#fefce8', 
                      '#f4ecd8', '#A3B18A', '#fdba74', '#fda4af', '#a5b4fc', '#09090b'
                    ].map(c => (
                      <button key={c} onClick={() => { setBackgroundColor(c); saveVisualSettings({ backgroundColor: c }); }} className={`w-8 h-8 rounded-full border transition-transform hover:scale-110 ${backgroundColor === c ? 'ring-2 ring-sage-300 ring-offset-2 dark:ring-offset-zinc-900 border-white' : 'border-zinc-100 dark:border-white/10'}`} style={{ backgroundColor: c }} />
                    ))}
                    <label className="w-8 h-8 rounded-full border border-zinc-200 dark:border-white/20 flex items-center justify-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all relative overflow-hidden group/color">
                      <Plus className="h-4 w-4 text-zinc-400 group-hover/color:rotate-90 transition-transform" />
                      <input 
                        type="color" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={(e) => { setBackgroundColor(e.target.value); saveVisualSettings({ backgroundColor: e.target.value }); }} 
                      />
                    </label>
                  </div>

                  {/* Extended Palette from Covers */}
                  <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-white/5">
                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400">Palettes des Couvertures</p>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar no-scrollbar">
                      {EXTENDED_PALETTES.map(palette => (
                        <div key={palette.name} className="flex flex-wrap gap-1.5 leading-none">
                          {palette.colors.slice(0, 5).map(c => (
                            <button
                              key={c}
                              onClick={() => { setBackgroundColor(c); saveVisualSettings({ backgroundColor: c }); }}
                              style={{ backgroundColor: c }}
                              className={`h-5 w-5 rounded-md border transition-all ${backgroundColor === c ? 'ring-1 ring-sage-300 ring-offset-1 dark:ring-offset-zinc-800 scale-110' : 'border-black/5 hover:scale-110'}`}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <input value={bgImage} onChange={(e) => { setBgImage(e.target.value); saveVisualSettings({ backgroundImageUrl: e.target.value }); }} placeholder="Lien direct vers l'image..." className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-3 text-[10px] focus:ring-2 focus:ring-sage-300/20 outline-none" />
                    <div className="flex gap-2">
                       <input type="file" ref={bgFileInputRef} onChange={handleBgFileChange} className="hidden" accept="image/*" />
                       <button 
                         onClick={() => bgFileInputRef.current?.click()}
                         className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                       >
                         <ImageIcon className="h-4 w-4" />
                         Importer
                       </button>
                       {bgImage && (
                        <button 
                          onClick={() => {
                            setBgImage('');
                            saveVisualSettings({ backgroundImageUrl: '' });
                          }}
                          className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-[9px] font-black uppercase transition-all"
                        >
                          Effacer
                        </button>
                       )}
                    </div>
                  </div>
                  <p className="text-[8px] text-zinc-400 uppercase italic">Préférez des images sombres pour le mode nuit ou claires pour le jour.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Corrections Sidebar */}
      <AnimatePresence>
        {showCorrections && (
          <motion.div 
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            className="fixed left-8 top-24 bottom-24 w-80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-3xl z-[100] rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.15)] border border-zinc-100 dark:border-white/10 p-8 flex flex-col gap-6 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-sage-400" />
                  Correcteur
                </h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Génie Orthographique</p>
              </div>
              <button 
                onClick={() => setShowCorrections(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                id="close-corrections"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
              {isReviewing ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <motion.div 
                    animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="h-12 w-12 rounded-full bg-sage-50 dark:bg-sage-500/10 flex items-center justify-center"
                  >
                    <Sparkles className="h-6 w-6 text-sage-400" />
                  </motion.div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 animate-pulse">Analyse du manuscrit...</p>
                </div>
              ) : corrections.length > 0 ? (
                corrections.map((c, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={i} 
                    className="p-4 rounded-2xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-800/30 space-y-3"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-3 w-3 text-red-400 shrink-0 mt-1" />
                      <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 line-through decoration-red-400/50">{c.error}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-3 w-3 text-sage-400 shrink-0 mt-1" />
                      <p className="text-[11px] font-black text-zinc-900 dark:text-white">{c.suggestion}</p>
                    </div>
                    <p className="text-[9px] text-zinc-400 italic">"{c.explanation}"</p>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => applyCorrection(c)}
                        className="flex-1 py-2 bg-sage-300 hover:bg-sage-400 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        Appliquer
                      </button>
                      <button 
                        onClick={() => ignoreCorrection(c)}
                        className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-lg text-[9px] font-black uppercase transition-all"
                      >
                        Ignorer
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <div className="h-12 w-12 rounded-full bg-sage-50 dark:bg-sage-500/10 flex items-center justify-center">
                    <Check className="h-6 w-6 text-sage-400" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Aucune erreur détectée</p>
                  <button 
                    onClick={startReview}
                    className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Réanalyser
                  </button>
                  <button 
                    onClick={simulateErrors}
                    className="px-6 py-2 text-sage-400 text-[8px] font-black uppercase tracking-widest hover:bg-sage-400/10 rounded-lg transition-all"
                  >
                    Simuler des fautes
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!selectedChapterId ? (
          /* Plan View (No chapter selected) */
          <motion.div 
            key="plan-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col p-4 w-full"
          >
          <div className="flex items-center justify-between mb-8 border-b border-sage-300/10 pb-6 relative w-full">
            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase italic leading-none transition-colors">Manuscrit</h2>
              <div className="h-1 w-10 bg-sage-300 rounded-full" />
            </div>
            <button 
              onClick={addPart}
              className="h-9 px-6 bg-sage-300 hover:bg-sage-400 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Nouvelle Partie
            </button>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pb-20">
              {/* Parts & Chapters in a minimalist grid */}
              {parts.map((part, idx) => {
                const accentColors = ['bg-sage-300', 'bg-orange-300', 'bg-pink-300', 'bg-indigo-300', 'bg-rose-300'];
                const accent = accentColors[idx % accentColors.length];
                return (
                  <div key={part.id} className="bg-white dark:bg-zinc-900/40 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-900 p-8 space-y-6 group shadow-xl dark:shadow-none relative overflow-hidden transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                      <div className="flex flex-col gap-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${accent.replace('bg-', 'text-')}`}>Partie {idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => movePart(part, 'up')} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400"><ArrowUp className="h-3 w-3" /></button>
                          <button onClick={() => movePart(part, 'down')} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400"><ArrowDown className="h-3 w-3" /></button>
                          <button onClick={() => renamePart(part.id)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400"><Edit3 className="h-3 w-3" /></button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <button onClick={(e) => deletePart(part.id, e)} className="opacity-0 group-hover:opacity-100 h-8 w-8 rounded-full border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                          <Trash2 className="h-3 w-3" />
                         </button>
                        <button onClick={() => addChapter(part.id)} className={`h-8 w-8 rounded-full ${accent} text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-current/10`}>
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-xl font-black text-zinc-900 dark:text-white italic uppercase tracking-tighter transition-colors leading-tight">{part.title}</h4>
                    <div className="space-y-2 max-h-[32rem] overflow-y-auto custom-scrollbar pr-2 scroll-smooth">
                      {chapters.filter(c => c.partId === part.id).map((chapter, cIdx) => {
                        const typeInfo = chapterTypes.find(t => t.id === chapter.type) || chapterTypes[0];
                        const globalIndex = chapters.findIndex(c => c.id === chapter.id);
                        return (
                          <div key={chapter.id} className="relative group/chap">
                            <div className="absolute right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/chap:opacity-100 transition-all flex flex-col gap-0.5 z-10">
                              <button onClick={() => moveChapter(chapter, 'up')} className="p-1.5 bg-white dark:bg-zinc-800 rounded-lg shadow-lg text-zinc-400 hover:text-sage-400 transition-colors"><ArrowUp className="h-3 w-3" /></button>
                              <button onClick={() => moveChapter(chapter, 'down')} className="p-1.5 bg-white dark:bg-zinc-800 rounded-lg shadow-lg text-zinc-400 hover:text-sage-400 transition-colors"><ArrowDown className="h-3 w-3" /></button>
                            </div>
                            <button 
                              onClick={() => setSelectedChapterId(chapter.id)}
                              onPointerDown={(e) => startLongPress(chapter, e)}
                              onPointerMove={handlePointerMove}
                              onPointerUp={cancelLongPress}
                              onPointerLeave={cancelLongPress}
                              className={`w-full text-left p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-all flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/20 hover:bg-zinc-100 dark:hover:bg-zinc-950/40 relative active:scale-95 ${
                                pressedChapterId === chapter.id ? 'ring-2 ring-red-500/50 scale-[0.98]' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center">
                                  <span className="text-[7px] font-black text-sage-400 mb-1">C.{globalIndex + 1}</span>
                                  <div className={`p-1.5 rounded-lg ${accent.replace('bg-', 'bg-opacity-20 text-').replace('text-', 'text-')}`}>
                                    {typeInfo.icon}
                                  </div>
                                </div>
                                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 group-hover/chap:text-zinc-900 dark:group-hover/chap:text-white transition-colors">{chapter.title}</span>
                              </div>
                              <ChevronRight className={`h-3 w-3 opacity-20 group-hover/chap:opacity-100 transition-opacity ${accent.replace('bg-', 'text-')}`} />
                              {pressedChapterId === chapter.id && (
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: '100%' }}
                                  transition={{ duration: 0.8, ease: "linear" }}
                                  className="absolute bottom-0 left-0 h-1 bg-red-500/30 rounded-full"
                                />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {/* Decorative bottom bar */}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 ${accent} opacity-20`} />
                  </div>
                );
              })}

              {/* List of chapters without a part */}
              {chapters.filter(c => !c.partId).length > 0 && (
                <div className="bg-white dark:bg-zinc-900/40 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-900 p-8 space-y-6 group shadow-xl dark:shadow-none relative overflow-hidden transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                   <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Annexes & Pages Spéciales</span>
                      <button onClick={() => addChapter()} className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center hover:scale-110 transition-transform">
                        <Plus className="h-4 w-4" />
                      </button>
                   </div>
                   <div className="space-y-2 max-h-[32rem] overflow-y-auto custom-scrollbar pr-2">
                       {chapters.filter(c => !c.partId).map(chapter => {
                         const typeInfo = chapterTypes.find(t => t.id === chapter.type) || chapterTypes[0];
                         const globalIndex = chapters.findIndex(c => c.id === chapter.id);
                         return (
                        <div key={chapter.id} className="relative group/chap">
                           <div className="absolute right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/chap:opacity-100 transition-all flex flex-col gap-0.5 z-10">
                              <button onClick={() => moveChapter(chapter, 'up')} className="p-1.5 bg-white dark:bg-zinc-800 rounded-lg shadow-lg text-zinc-400 hover:text-sage-400 transition-colors"><ArrowUp className="h-3 w-3" /></button>
                              <button onClick={() => moveChapter(chapter, 'down')} className="p-1.5 bg-white dark:bg-zinc-800 rounded-lg shadow-lg text-zinc-400 hover:text-sage-400 transition-colors"><ArrowDown className="h-3 w-3" /></button>
                            </div>
                           <button 
                             onClick={() => setSelectedChapterId(chapter.id)}
                             onPointerDown={(e) => startLongPress(chapter, e)}
                             onPointerMove={handlePointerMove}
                             onPointerUp={cancelLongPress}
                             onPointerLeave={cancelLongPress}
                             className={`w-full text-left p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-all flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/20 hover:bg-zinc-100 dark:hover:bg-zinc-950/40 relative active:scale-95 ${
                                pressedChapterId === chapter.id ? 'ring-2 ring-red-500/50 scale-[0.98]' : ''
                             }`}
                           >
                             <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center">
                                  <span className="text-[7px] font-black text-zinc-400 mb-1">C.{globalIndex + 1}</span>
                                  <div className="p-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-500">
                                    {typeInfo.icon}
                                  </div>
                                </div>
                                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 group-hover/chap:text-zinc-900 dark:group-hover/chap:text-white transition-colors">{chapter.title}</span>
                             </div>
                            <ChevronRight className="h-3 w-3 opacity-20 group-hover/chap:opacity-100 transition-opacity text-zinc-400" />
                            {pressedChapterId === chapter.id && (
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 0.8, ease: "linear" }}
                                className="absolute bottom-0 left-0 h-1 bg-red-500/30 rounded-full"
                              />
                            )}
                          </button>
                        </div>
                      );})}
                   </div>
                </div>
              )}

              {/* Add part button if no parts exist or just as an option */}
              {parts.length === 0 && chapters.filter(c => !c.partId).length === 0 && (
                <div className="col-span-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-900 rounded-[3rem] text-zinc-400">
                   <BookOpen className="h-12 w-12 mb-4 opacity-10" />
                   <p className="text-sm font-black uppercase tracking-widest">Commence ton épopée</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* Full Screen Editor View */
          <motion.div 
            key="editor-view"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="h-full flex flex-col"
            style={{ 
              backgroundColor: backgroundType === 'color' ? bgColor : 'transparent',
              color: textColor
            }}
          >
            <motion.header 
              initial={false}
              animate={{ y: zenMode ? -100 : 0, opacity: zenMode ? 0 : 1 }}
              className="px-4 md:px-8 py-3 flex items-center justify-between border-b sticky top-0 z-30 transition-colors"
              style={{ 
                backgroundColor: effectiveBgColor,
                borderColor: lightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
                color: textColor
              }}
            >
              <div className="flex items-center gap-6 flex-1">
                <div className="h-10 w-10 rounded-xl bg-sage-300 flex items-center justify-center text-white shadow-lg shrink-0">
                  <Flower2 className="h-6 w-6 animate-spin-slow" />
                </div>
                <div className="max-w-2xl w-full">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-3">
                      <span className="text-[7px] font-black uppercase tracking-[0.4em] opacity-40 whitespace-nowrap">
                        Manuscrit / {chapters.find(c => c.id === selectedChapterId)?.partId ? parts.find(p => p.id === chapters.find(c => c.id === selectedChapterId)?.partId)?.title : 'Hors Partie'}
                      </span>
                    </div>
                    <input 
                      value={chapters.find(c => c.id === selectedChapterId)?.title || ''}
                      className="bg-transparent border-none outline-none text-xl md:text-2xl font-black w-full uppercase italic tracking-tighter placeholder:opacity-5 focus:placeholder:opacity-20 transition-all"
                      style={{ color: textColor }}
                      onChange={async (e) => {
                         await updateDoc(doc(db, 'novels', novel.id, 'chapters', selectedChapterId!), {
                           title: e.target.value
                         });
                      }}
                      placeholder="Titre du chapitre..."
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                   <button 
                    onClick={() => {
                      const chap = chapters.find(c => c.id === selectedChapterId);
                      if (chap) setChapterToDelete(chap);
                    }}
                    className="mb-2 p-2 hover:bg-red-500/10 text-red-500/40 hover:text-red-500 rounded-lg transition-all group shrink-0"
                    title="Supprimer ce chapitre"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => saveChapter()}
                    disabled={saving}
                    className={`h-8 px-6 border rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${
                      saving 
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-500' 
                        : 'bg-sage-300/10 border-sage-300 text-sage-300 hover:bg-sage-300 hover:text-white'
                    }`}
                  >
                    {saving ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                        <Save className="h-3 w-3" />
                      </motion.div>
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    <span>{saving ? 'CHARGEMENT...' : 'FIXER'}</span>
                  </button>
                  {lastSaved && (
                    <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                      Sauvegardé à {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <button onClick={() => setSelectedChapterId(null)} className="h-6 w-6 rounded-full border border-sage-300/20 flex items-center justify-center text-sage-300 hover:text-white hover:bg-sage-300 transition-all">
                  <ChevronRight className="h-2.5 w-2.5 rotate-180" />
                </button>
              </div>
            </motion.header>

            <div 
              className="flex-1 overflow-y-auto px-4 md:px-8 py-8 custom-scrollbar scroll-smooth transition-colors relative"
            >
              <div className="w-full max-w-none pb-48 relative z-10" style={{ color: textColor }}>
                <EditorContent editor={editor} className="min-h-[90vh]" />
              </div>
              <div className="absolute top-0 right-0 w-96 h-96 bg-sage-300/5 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute bottom-1/2 left-0 w-96 h-96 bg-orange-300/5 rounded-full blur-[100px] pointer-events-none" />
            </div>

            {/* Side Navigation Overlay */}
            <div className="absolute inset-y-0 right-0 z-50 flex pointer-events-none overflow-hidden">
               <motion.div 
                animate={{ x: showChaptersNav ? 0 : 288 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="h-full w-72 bg-zinc-950 light:bg-white border-l border-white/5 light:border-zinc-100 py-10 px-8 shadow-2xl flex flex-col pointer-events-auto relative"
               >
                  {/* Attached Toggle Button */}
                  <button 
                    onClick={() => setShowChaptersNav(!showChaptersNav)}
                    className="absolute top-1/2 -translate-y-1/2 -left-12 h-24 w-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 border-r-0 rounded-l-[2rem] flex items-center justify-center text-zinc-500 hover:text-sage-400 transition-all shadow-[-10px_10px_30px_rgba(0,0,0,0.1)] pointer-events-auto group z-50"
                  >
                    <div className="relative">
                      <BookOpen className={`h-6 w-6 transition-transform duration-500 group-hover:scale-110 ${showChaptersNav ? 'scale-110 text-sage-400' : ''}`} />
                      {!showChaptersNav && <div className="absolute -top-1 -right-1 h-2 w-2 bg-sage-400 rounded-full animate-pulse" />}
                    </div>
                  </button>

                  <div className="text-[10px] font-black text-zinc-600 light:text-zinc-400 uppercase tracking-[0.4em] mb-10">Sommaire</div>
                  <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar pr-2 text-white light:text-zinc-800 pb-20">
                    {parts.map((part, pIdx) => {
                      const partChapters = chapters.filter(c => c.partId === part.id);
                      if (partChapters.length === 0) return null;
                      
                      return (
                        <div key={part.id} className="space-y-3">
                          <div className="flex items-center gap-2">
                             <div className="h-0.5 w-4 bg-sage-300 opacity-50" />
                             <div className="text-[9px] font-black uppercase tracking-[0.2em] text-sage-300">Part {pIdx + 1} : {part.title}</div>
                          </div>
                          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                            {partChapters.map((chap) => {
                              const typeInfo = chapterTypes.find(t => t.id === chap.type) || chapterTypes[0];
                              return (
                              <div key={chap.id} className="relative group/nav-chap">
                                <button
                                  onClick={() => { setSelectedChapterId(chap.id); setShowChaptersNav(false); }}
                                  onPointerDown={(e) => startLongPress(chap, e)}
                                  onPointerMove={handlePointerMove}
                                  onPointerUp={cancelLongPress}
                                  onPointerLeave={cancelLongPress}
                                  className={`w-full text-left p-4 rounded-2xl border transition-all relative active:scale-95 ${
                                    selectedChapterId === chap.id 
                                      ? 'bg-sage-300 border-sage-200 text-white shadow-xl scale-[1.02]' 
                                      : 'bg-black/20 light:bg-zinc-50 border-white/5 light:border-zinc-100 text-zinc-500 hover:border-white/20'
                                  } ${pressedChapterId === chap.id ? 'ring-2 ring-red-500/50' : ''}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="flex flex-col items-center shrink-0">
                                      <span className="text-[6px] font-black opacity-40">C.{chapters.findIndex(c => c.id === chap.id) + 1}</span>
                                      <span className="opacity-50">{typeInfo.icon}</span>
                                    </div>
                                    <div className="text-xs font-bold truncate pr-6">{chap.title}</div>
                                  </div>
                                  {pressedChapterId === chap.id && (
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: '100%' }}
                                      transition={{ duration: 0.8, ease: "linear" }}
                                      className="absolute bottom-0 left-0 h-1 bg-red-500/50 rounded-full"
                                    />
                                  )}
                                </button>
                              </div>
                            );})}
                          </div>
                        </div>
                      );
                    })}

                    {/* Chapters without parts */}
                    {chapters.filter(c => !c.partId).length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                           <div className="h-0.5 w-4 bg-zinc-500 opacity-50" />
                           <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Hors Partie</div>
                        </div>
                        <div className="space-y-2">
                          {chapters.filter(c => !c.partId).map((chap) => {
                            const typeInfo = chapterTypes.find(t => t.id === chap.type) || chapterTypes[0];
                            return (
                             <div key={chap.id} className="relative group/nav-chap">
                               <button
                                 onClick={() => { setSelectedChapterId(chap.id); setShowChaptersNav(false); }}
                                 onPointerDown={(e) => startLongPress(chap, e)}
                                 onPointerMove={handlePointerMove}
                                 onPointerUp={cancelLongPress}
                                 onPointerLeave={cancelLongPress}
                                 className={`w-full text-left p-4 rounded-2xl border transition-all relative active:scale-95 ${
                                   selectedChapterId === chap.id 
                                     ? 'bg-sage-300 border-sage-200 text-white shadow-xl scale-[1.02]' 
                                     : 'bg-black/20 light:bg-zinc-50 border-white/5 light:border-zinc-100 text-zinc-500 hover:border-white/20'
                                 } ${pressedChapterId === chap.id ? 'ring-2 ring-red-500/50' : ''}`}
                               >
                                 <div className="flex items-center gap-2">
                                   <div className="flex flex-col items-center shrink-0">
                                     <span className="text-[6px] font-black opacity-40">C.{chapters.findIndex(c => c.id === chap.id) + 1}</span>
                                     <span className="opacity-50">{typeInfo.icon}</span>
                                   </div>
                                   <div className="text-xs font-bold truncate pr-6">{chap.title}</div>
                                 </div>
                                 {pressedChapterId === chap.id && (
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: '100%' }}
                                      transition={{ duration: 0.8, ease: "linear" }}
                                      className="absolute bottom-0 left-0 h-1 bg-red-500/50 rounded-full"
                                    />
                                  )}
                               </button>
                             </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
               </motion.div>
            </div>

            {/* Optimized Footer Toolbar */}
            <div 
              className="fixed left-1/2 -translate-x-1/2 px-4 z-40 w-full max-w-3xl pointer-events-none flex justify-center transition-all duration-300 ease-out"
              style={{ bottom: `calc(${keyboardOffset > 0 ? keyboardOffset + 12 : 24}px + env(safe-area-inset-bottom))` }}
            >
                <div className="p-1.5 bg-zinc-900/95 light:bg-white/95 backdrop-blur-3xl border border-white/10 light:border-sage-300/30 rounded-[2rem] flex items-center gap-1 shadow-[0_20px_50px_rgba(0,0,0,0.5)] light:shadow-[0_15px_40px_rgba(156,173,143,0.15)] pointer-events-auto overflow-x-auto no-scrollbar scroll-smooth max-w-[95vw]">
                    
                    {/* Visual Settings */}
                    <div className="flex bg-black/40 light:bg-zinc-100/50 p-0.5 rounded-full shrink-0">
                      <ToolbarBtn onClick={() => setZenMode(!zenMode)} active={zenMode}>
                        <Maximize2 className="h-3.5 w-3.5" />
                      </ToolbarBtn>
                      <ToolbarBtn onClick={() => setShowVisualSettings(!showVisualSettings)} active={showVisualSettings}>
                        <FileCog className="h-3.5 w-3.5" />
                      </ToolbarBtn>
                    </div>

                    <div className="h-6 w-[1px] bg-white/5 light:bg-zinc-200 mx-1 shrink-0" />

                    {/* Font Size & Highlight */}
                    <div className="flex items-center gap-2 bg-black/40 light:bg-zinc-100/50 p-1 rounded-full px-3 shrink-0">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { const v = Math.max(12, fontSize - 2); setFontSize(v); saveVisualSettings({ fontSize: v }); }} className="p-1 hover:text-white light:hover:text-sage-500 text-zinc-500 transition-colors"><ChevronRight className="h-3 w-3 rotate-180" /></button>
                        <span className="text-[9px] font-black w-6 text-center text-zinc-400">{fontSize}</span>
                        <button onClick={() => { const v = Math.min(32, fontSize + 2); setFontSize(v); saveVisualSettings({ fontSize: v }); }} className="p-1 hover:text-white light:hover:text-sage-500 text-zinc-500 transition-colors"><ChevronDown className="h-3 w-3 -rotate-90" /></button>
                      </div>
                      <div className="h-4 w-[1px] bg-white/10 mx-1" />
                      <ToolbarBtn onClick={() => editor?.chain().focus().toggleHighlight({ color: '#fcd34d' }).run()} active={editor?.isActive('highlight')}>
                        <Highlighter className="h-3.5 w-3.5" />
                      </ToolbarBtn>
                    </div>

                    <div className="h-6 w-[1px] bg-white/5 light:bg-zinc-200 mx-1 shrink-0" />

                    {/* Basic Styling (Image 2: B I U S) */}
                    <div className="flex bg-black/40 light:bg-zinc-100/50 p-0.5 rounded-full shrink-0">
                      <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}>
                        <Bold className="h-3.5 w-3.5" />
                      </ToolbarBtn>
                      <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}>
                        <Italic className="h-3.5 w-3.5" />
                      </ToolbarBtn>
                      <ToolbarBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')}>
                        <UnderlineIcon className="h-3.5 w-3.5" />
                      </ToolbarBtn>
                      <ToolbarBtn onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')}>
                        <Strikethrough className="h-3.5 w-3.5" />
                      </ToolbarBtn>
                    </div>

                    <div className="h-6 w-[1px] bg-white/5 light:bg-zinc-200 mx-1 shrink-0" />

                    {/* Lists (Image 2: Ordered then Bullet) */}
                    <div className="flex bg-black/40 light:bg-zinc-100/50 p-0.5 rounded-full shrink-0">
                      <ToolbarBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')}>
                        <ListOrdered className="h-3.5 w-3.5" />
                      </ToolbarBtn>
                      <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>
                        <List className="h-3.5 w-3.5" />
                      </ToolbarBtn>
                    </div>

                    <div className="h-6 w-[1px] bg-white/5 light:bg-zinc-200 mx-1 shrink-0" />

                    {/* History */}
                    <div className="flex bg-black/40 light:bg-zinc-100/50 p-0.5 rounded-full shrink-0">
                      <ToolbarBtn onClick={() => editor?.chain().focus().undo().run()}>
                        <Undo2 className="h-3.5 w-3.5" />
                      </ToolbarBtn>
                      <ToolbarBtn onClick={() => editor?.chain().focus().redo().run()}>
                        <Redo2 className="h-3.5 w-3.5" />
                      </ToolbarBtn>
                    </div>

                    <div className="h-6 w-[1px] bg-white/5 light:bg-zinc-200 mx-1 shrink-0" />

                    {/* AI Review */}
                    <div className="flex bg-black/40 light:bg-zinc-100/50 p-0.5 rounded-full shrink-0">
                      <ToolbarBtn onClick={startReview} active={showCorrections}>
                        <Sparkles className={`h-3.5 w-3.5 ${isReviewing ? 'animate-pulse text-sage-400' : ''}`} />
                      </ToolbarBtn>
                    </div>

                    <div className="h-6 w-[1px] bg-white/5 light:bg-zinc-200 mx-1 shrink-0" />

                    <button 
                      onClick={() => saveChapter()} 
                      disabled={saving}
                      className={`h-10 px-4 rounded-full flex items-center justify-center gap-2 active:scale-95 transition-all text-[9px] font-black uppercase tracking-widest shadow-xl shrink-0 ${
                        saving
                          ? 'bg-zinc-800 text-zinc-500 shadow-none'
                          : 'bg-sage-300 text-white hover:bg-sage-400 shadow-sage-300/20'
                      }`}
                    >
                      {saving ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                           <Save className="h-3.5 w-3.5" />
                        </motion.div>
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      <span>{saving ? '...' : 'Fixer'}</span>
                    </button>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapter Delete Confirmation Modal */}
      <AnimatePresence>
        {chapterToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-black/40"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl border border-zinc-100 dark:border-white/10 text-center"
            >
              <div className="h-20 w-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="h-10 w-10 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter mb-2">Supprimer le chapitre ?</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 px-4">
                Êtes-vous sûr de vouloir supprimer <span className="font-bold text-zinc-900 dark:text-white">"{chapterToDelete.title}"</span> ? Cette action est irréversible.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDelete}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-red-500/20 active:scale-95"
                >
                  Oui, supprimer définitivement
                </button>
                <button 
                  onClick={() => setChapterToDelete(null)}
                  className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolbarBtn({ children, onClick, active }: { children: React.ReactNode, onClick: () => void, active?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`p-2 rounded-full transition-all ${active ? 'bg-sage-300 text-white shadow-lg' : 'text-zinc-500 hover:text-white light:text-sage-300 light:hover:text-sage-500'}`}
    >
      {children}
    </button>
  );
}
