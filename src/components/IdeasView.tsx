import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Novel } from '../types';
import { Plus, Trash2, Palette, Brain, Flower2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const COLORS = [
  { name: 'Sauge', class: 'bg-sage-100 border-sage-200 text-sage-800', accent: 'bg-sage-400' },
  { name: 'Rose', class: 'bg-rose-100 border-rose-200 text-rose-800', accent: 'bg-rose-400' },
  { name: 'Orange', class: 'bg-orange-100 border-orange-200 text-orange-800', accent: 'bg-orange-400' },
  { name: 'Ciel', class: 'bg-blue-100 border-blue-200 text-blue-800', accent: 'bg-blue-400' },
  { name: 'Mauve', class: 'bg-purple-100 border-purple-200 text-purple-800', accent: 'bg-purple-400' },
];

const EMOJIS = ['📜', '🕓', '💭', '💡', '✨', '🌹'];

export default function IdeasView({ novel }: { novel: Novel }) {
  const [ideas, setIdeas] = useState<any[]>([]);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [zoomIdea, setZoomIdea] = useState<any | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'novels', novel.id, 'ideas'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIdeas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `novels/${novel.id}/ideas`);
    });

    return unsubscribe;
  }, [novel.id]);

  const addIdea = async () => {
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    try {
      await addDoc(collection(db, 'novels', novel.id, 'ideas'), {
        content: '',
        colorIndex: COLORS.indexOf(randomColor),
        emoji: randomEmoji,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `novels/${novel.id}/ideas`);
    }
  };

  const updateIdea = async (id: string, updates: any) => {
    try {
      await updateDoc(doc(db, 'novels', novel.id, 'ideas', id), updates);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'ideas'); }
  };

  const deleteIdea = async (id: string) => {
    if (!confirm('Supprimer cette idée ?')) return;
    try {
      await deleteDoc(doc(db, 'novels', novel.id, 'ideas', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `novels/${novel.id}/ideas/${id}`);
    }
  };

  const filteredIdeas = selectedEmoji 
    ? ideas.filter(idea => idea.emoji === selectedEmoji)
    : ideas;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-zinc-900 dark:border-white/10 pb-6 gap-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-sage-300 flex items-center justify-center text-white shadow-lg">
            <Flower2 
              // @ts-ignore
              className="h-6 w-6 animate-spin-slow" 
            />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase italic leading-none transition-colors">Idées</h2>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Capture d'éclairs créatifs</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-zinc-100 dark:bg-white/5 p-1 rounded-full gap-1 max-w-[280px] overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setSelectedEmoji(null)}
              className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all shrink-0 ${!selectedEmoji ? 'bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              Tous
            </button>
            {EMOJIS.map(e => (
              <button 
                key={e}
                onClick={() => setSelectedEmoji(selectedEmoji === e ? null : e)}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all text-xs ${selectedEmoji === e ? 'bg-zinc-900 dark:bg-white shadow-md scale-110' : 'text-zinc-400 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 uppercase'}`}
              >
                {e}
              </button>
            ))}
          </div>

          <button 
            onClick={addIdea}
            className="h-10 px-8 bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 active:scale-95 shadow-xl shrink-0"
          >
            <Plus className="h-4 w-4" /> Capturer
          </button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        <AnimatePresence mode="popLayout">
          {filteredIdeas.map((idea, index) => {
            const color = COLORS[idea.colorIndex || 0];
            return (
              <motion.div
                layout
                key={idea.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: { 
                    delay: Math.min(index * 0.2, 2.0), // Increased stagger to 0.2s, cap at 2s
                    duration: 0.5,
                    ease: "easeOut"
                  }
                }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className={`group relative flex flex-col p-4 rounded-[1.5rem] border h-[180px] transition-all shadow-md hover:shadow-lg ${color.class}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-8 w-8 rounded-lg ${color.accent} flex items-center justify-center text-lg shadow-inner text-white`}>
                    {idea.emoji || '✨'}
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => deleteIdea(idea.id)}
                      className="p-1.5 text-zinc-900/40 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <textarea 
                  readOnly
                  onClick={() => setZoomIdea(idea)}
                  className="flex-1 bg-transparent border-none outline-none resize-none font-bold placeholder:text-black/10 custom-scrollbar text-xs leading-snug tracking-tight cursor-pointer"
                  placeholder="Écris ton idée ici..."
                  value={idea.content}
                />
                
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5">
                   <div className="flex items-center gap-1">
                     {COLORS.map((c, i) => (
                       <button 
                         key={c.name}
                         onClick={() => updateIdea(idea.id, { colorIndex: i })}
                         className={`w-3 h-3 rounded-full border border-black/10 shadow-sm ${c.accent} transition-all hover:scale-125 ${idea.colorIndex === i ? 'ring-2 ring-current scale-110' : ''}`}
                       />
                     ))}
                   </div>
                   <div className="flex items-center gap-1">
                      {EMOJIS.map(e => (
                        <button 
                          key={e}
                          onClick={() => updateIdea(idea.id, { emoji: e })}
                          className={`text-[10px] filter grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all ${idea.emoji === e ? 'grayscale-0 opacity-100 scale-125' : ''}`}
                        >
                          {e}
                        </button>
                      ))}
                   </div>
                </div>

                {/* Notebook spine decoration */}
                <div className="absolute left-3.5 top-8 bottom-8 w-[1px] bg-black/5" />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredIdeas.length === 0 && (
        <div className="py-24 flex flex-col items-center justify-center text-center opacity-20">
          <Brain className="h-16 w-16 mb-6" />
          <p className="text-sm font-black uppercase tracking-[0.2em]">Aucune idée trouvée</p>
        </div>
      )}

      {/* Zoom Modal */}
      <AnimatePresence>
        {zoomIdea && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`w-full max-w-2xl h-[80vh] flex flex-col rounded-[3rem] border-4 p-10 relative shadow-2xl ${COLORS[zoomIdea.colorIndex || 0].class}`}
            >
              <div className="flex items-center justify-between mb-8">
                <div className={`h-16 w-16 rounded-2xl ${COLORS[zoomIdea.colorIndex || 0].accent} flex items-center justify-center text-4xl shadow-inner text-white`}>
                  {zoomIdea.emoji || '✨'}
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2 bg-white/20 p-2 rounded-full backdrop-blur-md">
                      {COLORS.map((c, i) => (
                        <button 
                          key={c.name}
                          onClick={() => {
                            updateIdea(zoomIdea.id, { colorIndex: i });
                            setZoomIdea({ ...zoomIdea, colorIndex: i });
                          }}
                          className={`w-5 h-5 rounded-full border border-black/10 shadow-sm ${c.accent} transition-all hover:scale-125 ${zoomIdea.colorIndex === i ? 'ring-2 ring-current ring-offset-2 ring-offset-transparent scale-110' : ''}`}
                        />
                      ))}
                   </div>
                  <button 
                    onClick={() => setZoomIdea(null)}
                    className="p-3 bg-black/5 hover:bg-black/10 rounded-full transition-colors text-zinc-900"
                  >
                    <Plus className="h-6 w-6 rotate-45" />
                  </button>
                </div>
              </div>

              <textarea 
                autoFocus
                className="flex-1 bg-transparent border-none outline-none resize-none font-black text-2xl md:text-3xl placeholder:text-black/5 custom-scrollbar leading-relaxed tracking-tight"
                placeholder="Exprime ta pensée en grand..."
                value={zoomIdea.content}
                onChange={(e) => {
                  const newContent = e.target.value;
                  setZoomIdea({ ...zoomIdea, content: newContent });
                  updateIdea(zoomIdea.id, { content: newContent });
                }}
              />

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-black/10">
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map(e => (
                    <button 
                      key={e}
                      onClick={() => {
                        updateIdea(zoomIdea.id, { emoji: e });
                        setZoomIdea({ ...zoomIdea, emoji: e });
                      }}
                      className={`text-2xl filter grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all ${zoomIdea.emoji === e ? 'grayscale-0 opacity-100 scale-125' : ''}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-black/40">
                  Idée en expansion
                </div>
              </div>

              {/* Notebook spine decoration */}
              <div className="absolute left-6 top-16 bottom-16 w-px bg-black/5 shadow-sm" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
