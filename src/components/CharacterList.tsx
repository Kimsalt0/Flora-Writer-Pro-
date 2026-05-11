import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Novel, Character } from '../types';
import { Plus, UserCircle, Users, ChevronDown, ChevronUp, Trash2, Image as ImageIcon, Sparkles, X, Flower2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CharacterList({ novel, role }: { novel: Novel, role: 'Main' | 'Secondary' }) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'novels', novel.id, 'characters'),
      where('role', '==', role)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCharacters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Character)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `novels/${novel.id}/characters`);
    });

    return unsubscribe;
  }, [novel.id, role]);

  const addCharacter = async () => {
    try {
      const docRef = await addDoc(collection(db, 'novels', novel.id, 'characters'), {
        name: 'Nouveau Personnage',
        description: '',
        role,
        createdAt: serverTimestamp()
      });
      setExpandedId(docRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `novels/${novel.id}/characters`);
    }
  };

  const updateCharacter = async (id: string, data: Partial<Character>) => {
    try {
      await updateDoc(doc(db, 'novels', novel.id, 'characters', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `novels/${novel.id}/characters`);
    }
  };

  const deleteCharacter = async (id: string) => {
    if (!confirm('Supprimer ce personnage ?')) return;
    try {
      await deleteDoc(doc(db, 'novels', novel.id, 'characters', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `novels/${novel.id}/characters`);
    }
  };

  return (
    <div className="space-y-8 bg-zinc-50/50 dark:bg-transparent lg:p-12 rounded-[4rem] transition-colors">
      <div className="flex items-center justify-between mb-10 border-b border-orange-300/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-orange-300 flex items-center justify-center text-white shadow-lg">
             <Flower2 className="h-6 w-6 animate-spin-slow" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase italic leading-none transition-colors">
              {role === 'Main' ? 'Personnages Principaux' : 'Personnages Secondaires'}
            </h2>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Gérer le casting de ton œuvre</p>
          </div>
        </div>
        <button 
          onClick={addCharacter}
          className="h-10 px-8 bg-orange-300 hover:bg-orange-400 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 active:scale-95 shadow-lg"
        >
          <Plus className="h-4 w-4" /> Nouveau
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {characters.map((char) => (
          <CharacterCard 
            key={char.id} 
            char={char} 
            isExpanded={expandedId === char.id}
            onToggle={() => setExpandedId(expandedId === char.id ? null : char.id)}
            onUpdate={(data) => updateCharacter(char.id, data)}
            onDelete={() => deleteCharacter(char.id)}
          />
        ))}

        <button 
          onClick={addCharacter}
          className="aspect-square rounded-[2rem] border-2 border-dashed border-zinc-200 dark:border-zinc-900 flex flex-col items-center justify-center gap-2 group hover:border-orange-300 transition-all text-zinc-400 dark:text-zinc-700 hover:text-orange-300"
        >
          <Plus className="h-6 w-6 group-hover:scale-110 transition-transform" />
          <span className="text-[8px] font-black uppercase tracking-widest">Ajouter</span>
        </button>
      </div>
    </div>
  );
}

function CharacterCard({ char, isExpanded, onToggle, onUpdate, onDelete }: { 
  char: Character, 
  isExpanded: boolean, 
  onToggle: () => void,
  onUpdate: (data: Partial<Character>) => void,
  onDelete: () => void
}) {
  const [localData, setLocalData] = useState(char);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalData(char);
  }, [char]);

  const handleChange = (field: keyof Character, value: any) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = () => {
    onUpdate(localData);
  };

  const startPress = () => {
    setIsLongPressing(false);
    pressTimer.current = setTimeout(() => {
      setShowImageOptions(true);
      setIsLongPressing(true);
    }, 600);
  };

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressing) {
      e.stopPropagation();
      setIsLongPressing(false);
      return;
    }
    onToggle();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800000) { // ~800KB limit for base64 in Firestore
      alert("L'image est trop lourde. Veuillez choisir une image de moins de 800 Ko.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      onUpdate({ profileImageUrl: base64String });
      handleChange('profileImageUrl', base64String);
      setShowImageOptions(false);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlInput = () => {
    const url = prompt("Entrez l'URL de l'image :");
    if (url) {
      onUpdate({ profileImageUrl: url });
      handleChange('profileImageUrl', url);
    }
    setShowImageOptions(false);
  };

  return (
    <motion.div
      layout
      className={`relative group ${isExpanded ? 'col-span-full z-20' : 'col-span-1'}`}
    >
      <div 
        onClick={handleClick}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        className={`flex flex-col items-center p-4 rounded-[2rem] cursor-pointer transition-all duration-500 relative touch-none border ${
          isExpanded 
            ? 'bg-zinc-100 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700 shadow-2xl' 
            : 'bg-white border-zinc-100 dark:bg-zinc-900/40 dark:border-zinc-900 hover:border-sage-200 dark:hover:border-sage-300'
        }`}
      >
        <div className={`relative aspect-square w-full max-w-[120px] rounded-2xl flex items-center justify-center transition-all overflow-hidden border-2 mb-3 shadow-inner group/portrait ${
          isExpanded 
          ? 'bg-zinc-800 border-orange-300 text-white' 
          : 'bg-zinc-50 border-zinc-100 dark:bg-zinc-800 dark:border-zinc-900 text-zinc-700'
        }`}>
          {char.profileImageUrl ? (
            <img src={char.profileImageUrl} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            char.role === 'Main' ? <UserCircle className="h-8 w-8" /> : <Users className="h-8 w-8" />
          )}

          {!showImageOptions && (
            <div className="absolute inset-0 bg-black/0 group-hover/portrait:bg-black/40 flex items-center justify-center opacity-0 group-hover/portrait:opacity-100 transition-all pointer-events-none">
              <p className="text-[6px] font-black uppercase tracking-[0.2em] text-white text-center px-1">Hold to change</p>
            </div>
          )}

          <AnimatePresence>
            {showImageOptions && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-2 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={handleUrlInput}
                  className="w-full py-2 bg-white/10 hover:bg-white/20 text-[8px] font-black uppercase tracking-widest text-white rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <ImageIcon className="h-3 w-3" /> URL
                </button>
                <label className="w-full py-2 bg-orange-300 hover:bg-orange-400 text-[8px] font-black uppercase tracking-widest text-white rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer text-center">
                  <ImageIcon className="h-3 w-3" /> Galerie
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
                <button 
                  onClick={() => setShowImageOptions(false)}
                  className="mt-1 text-[7px] font-bold text-white/40 uppercase hover:text-white"
                >
                  Annuler
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <h4 className={`text-xs font-black text-center uppercase tracking-tighter italic truncate w-full ${
          isExpanded ? 'text-white' : 'text-zinc-900 dark:text-zinc-500'
        }`}>
          {(char.firstName || char.lastName) ? `${char.firstName || ''} ${char.lastName || ''}`.trim() : char.name || 'Sans nom'}
        </h4>

        {isExpanded && (
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className="p-2 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 transition-all shadow-lg"
              title="Réduire la fiche"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-lg"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-6 bg-white dark:bg-zinc-900 rounded-[2.5rem] border-2 border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xl"
          >
            <div className="p-8 grid gap-8 lg:grid-cols-2">
              <section className="space-y-6">
                <div>
                  <h5 className="text-xs font-black text-orange-300 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span className="h-1 w-4 bg-orange-300/30 rounded-full" />
                    Informations Basiques
                  </h5>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Nom" value={localData.lastName || ''} onChange={v => handleChange('lastName', v)} onBlur={handleBlur} />
                    <Field label="Prénom" value={localData.firstName || ''} onChange={v => handleChange('firstName', v)} onBlur={handleBlur} />
                    <Field label="Surnom" value={localData.nickname || ''} onChange={v => handleChange('nickname', v)} onBlur={handleBlur} />
                    <Field label="Âge" value={localData.age || ''} onChange={v => handleChange('age', v)} onBlur={handleBlur} />
                    <Field label="Niveau Scolaire" value={localData.educationLevel || ''} onChange={v => handleChange('educationLevel', v)} onBlur={handleBlur} />
                    <Field label="Métier" value={localData.profession || ''} onChange={v => handleChange('profession', v)} onBlur={handleBlur} />
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-black text-pink-300 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span className="h-1 w-4 bg-pink-300/30 rounded-full" />
                    Visualisation & Images
                  </h5>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Field 
                        label="URL Image de Profil" 
                        value={localData.profileImageUrl || ''} 
                        onChange={v => handleChange('profileImageUrl', v)} 
                        onBlur={handleBlur} 
                      />
                      <div className="flex gap-2">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <ImageIcon className="h-4 w-4" />
                          Importer du téléphone
                        </button>
                        {localData.profileImageUrl && (
                          <button 
                            onClick={() => {
                              onUpdate({ profileImageUrl: '' });
                              handleChange('profileImageUrl', '');
                            }}
                            className="px-5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-[9px] font-black uppercase transition-all"
                          >
                            Effacer
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <Gallery 
                      label="Galerie Générale" 
                      images={localData.galleryImageUrls || []} 
                      onAdd={(url) => {
                        const newImages = [...(localData.galleryImageUrls || []), url];
                        handleChange('galleryImageUrls', newImages as any);
                        onUpdate({ galleryImageUrls: newImages });
                      }}
                      onRemove={(idx) => {
                        const newImages = localData.galleryImageUrls?.filter((_, i) => i !== idx);
                        handleChange('galleryImageUrls', newImages as any);
                        onUpdate({ galleryImageUrls: newImages });
                      }}
                    />

                    <Gallery 
                      label="Style Vestimentaire" 
                      images={localData.styleImageUrls || []} 
                      onAdd={(url) => {
                        const newImages = [...(localData.styleImageUrls || []), url];
                        handleChange('styleImageUrls', newImages as any);
                        onUpdate({ styleImageUrls: newImages });
                      }}
                      onRemove={(idx) => {
                        const newImages = localData.styleImageUrls?.filter((_, i) => i !== idx);
                        handleChange('styleImageUrls', newImages as any);
                        onUpdate({ styleImageUrls: newImages });
                      }}
                    />

                    <Gallery 
                      label="Physique & Détails" 
                      images={localData.physicalImageUrls || []} 
                      onAdd={(url) => {
                        const newImages = [...(localData.physicalImageUrls || []), url];
                        handleChange('physicalImageUrls', newImages as any);
                        onUpdate({ physicalImageUrls: newImages });
                      }}
                      onRemove={(idx) => {
                        const newImages = localData.physicalImageUrls?.filter((_, i) => i !== idx);
                        handleChange('physicalImageUrls', newImages as any);
                        onUpdate({ physicalImageUrls: newImages });
                      }}
                    />
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-black text-orange-300 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span className="h-1 w-4 bg-orange-300/30 rounded-full" />
                    Narratif
                  </h5>
                  <div className="grid gap-4">
                    <Field label="Première Apparition" value={localData.firstAppearance || ''} onChange={v => handleChange('firstAppearance', v)} onBlur={handleBlur} />
                    <Textbox label="Situation Actuelle" value={localData.situation || ''} onChange={v => handleChange('situation', v)} onBlur={handleBlur} />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div>
                  <h5 className="text-xs font-black text-pink-300 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span className="h-1 w-4 bg-pink-300/30 rounded-full" />
                    Détails Personnels
                  </h5>
                  <div className="space-y-4">
                    <Textbox label="Loisirs & Hobbies" value={localData.hobbies || ''} onChange={v => handleChange('hobbies', v)} onBlur={handleBlur} />
                    <Textbox label="Personnalité" value={localData.personality || ''} onChange={v => handleChange('personality', v)} onBlur={handleBlur} />
                    <Textbox label="Description Physique" value={localData.physical || ''} onChange={v => handleChange('physical', v)} onBlur={handleBlur} />
                    <Textbox label="Description Générale" value={localData.description || ''} onChange={v => handleChange('description', v)} onBlur={handleBlur} />
                    <Textbox label="Autres Caractéristiques" value={localData.otherFeatures || ''} onChange={v => handleChange('otherFeatures', v)} onBlur={handleBlur} />
                  </div>
                </div>
              </section>
            </div>
            <div className="px-8 pb-8 flex justify-end gap-4 items-center">
               <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest italic flex items-center gap-2">
                 <Sparkles className="h-3 w-3 text-orange-300" />
                 Fiche enregistrée automatiquement
               </p>
               <button 
                onClick={onToggle}
                className="text-[10px] font-black text-white px-6 py-2 bg-zinc-800 rounded-full uppercase tracking-widest hover:bg-zinc-700 transition-colors shadow-lg"
               >
                 Réduire
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Field({ label, value, onChange, onBlur }: { label: string, value: string, onChange: (v: string) => void, onBlur: () => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">{label}</label>
      <input 
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all outline-none"
        placeholder="..."
      />
    </div>
  );
}

function Textbox({ label, value, onChange, onBlur }: { label: string, value: string, onChange: (v: string) => void, onBlur: () => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">{label}</label>
      <textarea 
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        rows={3}
        className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-950/5 dark:focus:ring-white/5 transition-all resize-none outline-none"
        placeholder="Décrivez ici..."
      />
    </div>
  );
}

function Gallery({ label, images, onAdd, onRemove }: { label: string, images: string[], onAdd: (url: string) => void, onRemove: (idx: number) => void }) {
  const [showInput, setShowInput] = useState(false);
  const [url, setUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800000) {
      alert("L'image est trop lourde (>800Ko).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onAdd(reader.result as string);
      setShowInput(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">{label}</label>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-orange-400 rounded-lg transition-all"
            title="Upload from device"
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={() => setShowInput(!showInput)}
            className={`p-1.5 transition-all rounded-lg ${showInput ? 'bg-orange-300 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-orange-400'}`}
          >
            {showInput ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileUpload} 
          />
        </div>
      </div>

      <AnimatePresence>
        {showInput && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 overflow-hidden"
          >
            <input 
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Coller l'URL de l'image..."
              className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && url) {
                  onAdd(url);
                  setUrl('');
                  setShowInput(false);
                }
              }}
            />
            <button 
              onClick={() => {
                if (url) {
                  onAdd(url);
                  setUrl('');
                  setShowInput(false);
                }
              }}
              className="px-4 bg-orange-300 text-white rounded-xl text-[10px] font-bold"
            >
              Ajouter
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6 gap-2">
        {images.map((img, i) => (
          <motion.div 
            layout
            key={i} 
            className="relative aspect-square rounded-xl border-2 border-zinc-200 dark:border-zinc-800 overflow-hidden group shadow-sm hover:shadow-md transition-shadow"
          >
            <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button 
                onClick={() => onRemove(i)}
                className="p-1.5 bg-red-500 text-white rounded-lg hover:scale-110 transition-transform shadow-lg"
                title="Supprimer"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              <button 
                onClick={() => {
                  const newUrl = prompt("Nouveau URL pour l'image :", img);
                  if (newUrl && newUrl !== img) {
                    onRemove(i);
                    onAdd(newUrl);
                  }
                }}
                className="p-1.5 bg-blue-500 text-white rounded-lg hover:scale-110 transition-transform shadow-lg"
                title="Modifier URL"
              >
                <ImageIcon className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        ))}
        {images.length === 0 && !showInput && (
          <div className="col-span-full py-6 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-2">
            <ImageIcon className="h-5 w-5 text-zinc-300" />
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Aucun visuel</p>
          </div>
        )}
      </div>
    </div>
  );
}


