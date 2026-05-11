import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Novel } from '../types';
import { Plus, Trash2, ChevronDown, ChevronUp, MapPin, Camera, Image as ImageIcon, Flower2, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function SubcollectionList({ novel, collectionName }: { novel: Novel, collectionName: 'locations' | 'plots' | 'ideas' }) {
  const [items, setItems] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        alert("L'image est trop lourde (max 800 Ko)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateItem(id, { imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, 'novels', novel.id, collectionName),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `novels/${novel.id}/${collectionName}`);
    });

    return unsubscribe;
  }, [novel.id, collectionName]);

  const addItem = async () => {
    try {
      const docRef = await addDoc(collection(db, 'novels', novel.id, collectionName), {
        name: collectionName === 'locations' ? 'Nouveau Lieu' : 'Nouveau point',
        description: '',
        imageUrl: '',
        createdAt: serverTimestamp()
      });
      setExpandedId(docRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `novels/${novel.id}/${collectionName}`);
    }
  };

  const updateItem = async (id: string, updates: any) => {
    try {
      await updateDoc(doc(db, 'novels', novel.id, collectionName, id), updates);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, collectionName); }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Supprimer cet élément ?')) return;
    try {
      await deleteDoc(doc(db, 'novels', novel.id, collectionName, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `novels/${novel.id}/${collectionName}/${id}`);
    }
  };

  return (
    <div className="space-y-6 bg-zinc-50/50 dark:bg-transparent lg:p-12 rounded-[4rem] transition-colors">
      <div className="flex items-center justify-between mb-10 border-b border-pink-300/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-pink-300 flex items-center justify-center text-white shadow-lg">
             <Flower2 className="h-6 w-6 animate-spin-slow" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase italic leading-none transition-colors">
              {collectionName === 'locations' ? 'Lieux & Monde' : 'Intrigues & Sous-trame'}
            </h2>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Gérer l'univers et le scénario</p>
          </div>
        </div>
        <button 
          onClick={addItem}
          className="h-10 px-8 bg-pink-300 hover:bg-pink-400 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 active:scale-95 shadow-lg"
        >
          <Plus className="h-4 w-4" /> Nouveau
        </button>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <motion.div
            layout
            key={item.id}
            className={`rounded-[2rem] border-2 transition-all duration-300 overflow-hidden ${
              expandedId === item.id 
                ? 'bg-white dark:bg-zinc-900 border-pink-300 shadow-xl' 
                : 'bg-white/40 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-900 hover:border-pink-300/30 shadow-sm'
            }`}
          >
            <div 
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              className="p-6 cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors overflow-hidden border border-zinc-100 dark:border-zinc-800 ${expandedId === item.id ? 'bg-pink-300 text-white' : 'bg-zinc-100 dark:bg-zinc-900 text-pink-300/40'}`}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <MapPin className="h-6 w-6" />
                  )}
                </div>
                <h4 className="text-lg font-black text-zinc-900 dark:text-white italic uppercase tracking-tighter transition-colors group-hover:text-pink-400">{item.name || 'Sans titre'}</h4>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                  className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="text-zinc-400">
                  {expandedId === item.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {expandedId === item.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t-2 border-zinc-800/50 p-8"
                >
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-sage-300 dark:text-sage-500 uppercase tracking-widest ml-1">Nom</label>
                        <input 
                          value={item.name || ''}
                          onChange={e => updateItem(item.id, { name: e.target.value })}
                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-950 dark:text-white focus:outline-none transition-all"
                          placeholder="Nom..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-sage-300 uppercase tracking-widest ml-1">Image de Visualisation</label>
                        <div className="flex flex-col gap-2">
                           <div className="flex-1 relative">
                             <input 
                               value={item.imageUrl || ''}
                               onChange={e => updateItem(item.id, { imageUrl: e.target.value })}
                               className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all pl-10"
                               placeholder="https://..."
                             />
                             <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                           </div>
                           <div className="flex gap-2">
                             <input 
                               type="file"
                               ref={fileInputRef}
                               onChange={(e) => handleFileChange(e, item.id)}
                               accept="image/*"
                               className="hidden"
                             />
                             <button 
                               onClick={() => fileInputRef.current?.click()}
                               className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-zinc-600 dark:text-zinc-300"
                             >
                               <Upload className="h-3.5 w-3.5" />
                               Importer du téléphone
                             </button>
                             {item.imageUrl && (
                               <button 
                                 onClick={() => updateItem(item.id, { imageUrl: '' })}
                                 className="px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-[9px] font-black uppercase transition-all"
                               >
                                 Effacer
                               </button>
                             )}
                           </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-sage-300 dark:text-sage-400 uppercase tracking-widest ml-1">Description & Détails</label>
                      <textarea 
                        value={item.description || ''}
                        onChange={e => updateItem(item.id, { description: e.target.value })}
                        rows={6}
                        className="w-full h-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all resize-none custom-scrollbar min-h-[150px]"
                        placeholder="Ambiance, odeurs, bruits, importance narrative..."
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {items.length === 0 && (
          <button 
            onClick={addItem}
            className="flex flex-col items-center justify-center p-20 rounded-[2.5rem] border-2 border-dashed border-zinc-200 dark:border-zinc-900 group cursor-pointer hover:border-pink-300 transition-all space-y-4 shadow-sm"
          >
            <MapPin className="h-10 w-10 text-zinc-400 dark:text-zinc-700 group-hover:text-pink-300 transition-colors" />
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-600 uppercase tracking-widest">Répertorier un premier lieu</span>
          </button>
        )}
      </div>
    </div>
  );
}
