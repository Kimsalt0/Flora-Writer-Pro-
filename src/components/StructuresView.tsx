import React, { useState, useEffect } from 'react';
import { Tldraw, createShapeId, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Novel, Chapter, ViewType } from '../types';
import { Plus, LayoutList, ChevronRight, BookOpen, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function StructuresView({ novel, onNavigate }: { novel: Novel, onNavigate?: (view: ViewType) => void }) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [showChapters, setShowChapters] = useState(false);

  // Load chapters to show them in a sidebar for reference
  useEffect(() => {
    const q = query(collection(db, 'novels', novel.id, 'chapters'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setChapters(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chapter)));
    });
    return unsub;
  }, [novel.id]);

  // Load existing board state from Firestore
  useEffect(() => {
    const loadBoard = async () => {
      try {
        const boardDoc = await getDoc(doc(db, 'novels', novel.id, 'structure_data', 'main_board'));
        if (boardDoc.exists() && editor) {
          const data = boardDoc.data().snapshot;
          if (data) {
            editor.loadSnapshot(data);
          }
        }
      } catch (e) {
        console.error('Error loading board:', e);
      }
    };

    if (editor) {
      loadBoard();
    }
  }, [novel.id, editor]);

  const handleMount = (editor: Editor) => {
    setEditor(editor);
  };

  const saveBoard = async () => {
    if (!editor) return;
    try {
      const snapshot = editor.getSnapshot();
      await setDoc(doc(db, 'novels', novel.id, 'structure_data', 'main_board'), {
        snapshot,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'structure_data');
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 bg-black/20 backdrop-blur-md border-b border-white/5 relative z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400">Atelier</span>
            <div className="h-1 w-1 bg-zinc-700 rounded-full" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">Structure</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onNavigate && (
            <button 
              onClick={() => onNavigate('oracle')}
              className="flex items-center gap-2 h-10 px-6 bg-white/5 hover:bg-white/10 border border-white/5 text-sage-300 rounded-full text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              <BrainCircuit className="h-4 w-4" />
              <span>Oracle</span>
            </button>
          )}
          <button 
            onClick={saveBoard}
            className="flex items-center gap-2 h-10 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>Enregistrer</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0">
          <Tldraw 
            onMount={handleMount} 
            inferDarkMode={true}
          />
        </div>

        <AnimatePresence>
          {showChapters && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="absolute right-16 top-4 bottom-4 z-40 bg-zinc-950/80 light:bg-white/90 backdrop-blur-xl rounded-[2rem] border border-zinc-800 light:border-zinc-200 p-6 flex flex-col gap-4 overflow-hidden shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="h-3 w-3 text-orange-300" />
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Chapitres</h3>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {chapters.map((chap, idx) => (
                  <div 
                    key={chap.id}
                    className="p-2.5 rounded-xl bg-zinc-900/50 light:bg-zinc-50 border border-zinc-800 light:border-zinc-100 flex flex-col gap-0.5 group hover:border-orange-300 transition-all cursor-default"
                  >
                    <span className="text-[7px] font-black text-zinc-700 uppercase tracking-widest leading-none">C{idx + 1}</span>
                    <span className="text-[10px] font-bold text-zinc-500 group-hover:text-white transition-colors truncate">{chap.title}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setShowChapters(!showChapters)}
          className={`absolute bottom-4 right-4 z-50 h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-90 transition-all ${showChapters ? 'bg-orange-400 border-orange-300' : ''}`}
          title="Afficher les chapitres"
        >
          {showChapters ? <ChevronRight className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
