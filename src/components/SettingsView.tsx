import React, { useState } from 'react';
import { Novel, ViewType } from '../types';
import { 
  Settings, 
  Trash2, 
  Save, 
  FileText, 
  Palette, 
  ShieldAlert, 
  Download,
  AlertCircle,
  Copy,
  Plus,
  ChevronUp,
  ChevronDown,
  Globe,
  Hash
} from 'lucide-react';
import { doc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion } from 'motion/react';
import { BASE_COLORS, EMOJIS_EXTRA, EMOJIS_PRESET, EXTENDED_PALETTES } from '../constants';

export default function SettingsView({ novel }: { novel: Novel }) {
  const [title, setTitle] = useState(novel.title);
  const [type, setType] = useState(novel.type || 'Roman');
  const [emoji, setEmoji] = useState(novel.coverEmoji || '📖');
  const [image, setImage] = useState(novel.coverImageUrl || '');
  const [pin, setPin] = useState(novel.pinCode || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showAllEmojis, setShowAllEmojis] = useState(false);
  const [showExtendedColors, setShowExtendedColors] = useState(true);
  const [customHex, setCustomHex] = useState(novel.coverColor?.startsWith('#') ? novel.coverColor : '');
  const [color, setColor] = useState(novel.coverColor?.startsWith('bg-') ? novel.coverColor : '');

  const saveSettings = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'novels', novel.id), {
        title,
        type,
        coverEmoji: emoji,
        coverColor: customHex || color,
        coverImageUrl: image || null,
        pinCode: pin || null,
        updatedAt: new Date()
      });
      alert('Paramètres sauvegardés !');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'novels');
    } finally {
      setIsSaving(false);
    }
  };

  const duplicateProject = async () => {
    setIsSaving(true);
    try {
      const { id, ...data } = novel;
      await addDoc(collection(db, 'novels'), {
        ...data,
        title: `${novel.title} (COPIE)`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      alert('Projet dupliqué avec succès !');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProject = async () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement ce projet ? Cette action est irréversible.')) {
       try {
         await deleteDoc(doc(db, 'novels', novel.id));
         window.location.reload(); // Quick way to go back to novel list
       } catch (e) {
         handleFirestoreError(e, OperationType.DELETE, 'novels');
       }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 md:space-y-12 pb-20 px-4 md:px-0">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 md:mb-12 border-b border-sage-300/10 pb-8 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-30">
        <div className="space-y-1">
          <h2 className="text-lg md:text-2xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase italic leading-none transition-all truncate max-w-[200px] md:max-w-none">PARAMÈTRES</h2>
          <div className="h-0.5 w-10 bg-sage-300 rounded-full" />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button 
            onClick={duplicateProject}
            disabled={isSaving}
            className="h-9 md:h-10 px-4 md:px-6 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            <Copy className="h-3.5 w-3.5" /> <span className="hidden sm:inline">DUPLIQUER</span>
          </button>
          <button 
            onClick={saveSettings}
            disabled={isSaving}
            className="h-9 md:h-10 px-6 md:px-8 bg-sage-300 hover:bg-sage-400 text-white rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? '...' : <><Save className="h-3.5 w-3.5" /> <span className="hidden sm:inline">SAUVEGARDER</span><span className="sm:hidden">OK</span></>}
          </button>
        </div>
      </header>

      <div className="grid gap-16">
        {/* General section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-sage-300/10 flex items-center justify-center text-sage-300">
              <FileText className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Informations du projet</h3>
          </div>
          
          <div className="grid gap-8 p-8 rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-900 shadow-xl dark:shadow-2xl border border-zinc-100 dark:border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-sage-300/5 blur-[100px] pointer-events-none" />
            <div className="grid sm:grid-cols-2 gap-8 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Titre de l'œuvre</label>
                <input 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-white dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sage-300/20 transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Format</label>
                <select 
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full bg-white dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sage-300/20 transition-all font-bold appearance-none"
                >
                  <option value="Roman">Roman</option>
                  <option value="Comic">Comic / Manga</option>
                  <option value="Scénario">Scénario</option>
                  <option value="Nouvelle">Nouvelle</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Protection (PIN 4 chiffres)</label>
              <div className="relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2">
                  <Hash className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
                </div>
                <input 
                  value={pin}
                  maxLength={4}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="CODE SECRET"
                  className="w-full bg-white dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-14 pr-6 py-4 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-black tracking-[0.5em]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Cover Settings */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
              <Palette className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Identité Visuelle</h3>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Preview */}
            <div className="lg:col-span-1 p-8 rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 flex flex-col items-center justify-center gap-4 group/prev">
              <div 
                style={customHex ? { backgroundColor: customHex } : {}}
                className={`h-64 w-44 rounded-r-2xl rounded-l-sm ${customHex ? '' : color} shadow-[20px_20px_60px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center p-6 text-center relative border-y border-r border-white/10 overflow-hidden transform group-hover/prev:scale-105 transition-transform duration-500`}
              >
                {image && (
                  <img src={image} className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-50 pointer-events-none" referrerPolicy="no-referrer" />
                )}
                <div className="relative z-10 space-y-4">
                  <div className="text-5xl filter drop-shadow-2xl animate-pulse">{emoji}</div>
                  <div className="text-[10px] font-black text-white uppercase tracking-tighter leading-tight drop-shadow-md [text-wrap:balance]">{title}</div>
                  <div className="h-0.5 w-6 bg-white/30 mx-auto rounded-full" />
                </div>
                <div className="absolute left-0 inset-y-0 w-4 bg-black/15" />
              </div>
              <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Aperçu de la reliure</p>
            </div>

            {/* Customization Controls */}
            <div className="lg:col-span-2 space-y-8">
              {/* Color Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Teinte de la couverture</label>
                  <div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-white/5">
                    <span className="text-[9px] font-bold text-zinc-600">HEX</span>
                    <input 
                      value={customHex}
                      onChange={e => { setCustomHex(e.target.value); if(e.target.value) setColor(''); }}
                      className="w-16 bg-transparent text-[9px] font-mono font-bold text-white outline-none"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col gap-6">
                  {EXTENDED_PALETTES.map(palette => (
                    <div key={palette.name} className="space-y-2">
                       <p className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">{palette.name}</p>
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

              {/* Emoji Selection */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Emblème du projet</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS_PRESET.map(e => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={`h-11 w-11 rounded-2xl flex items-center justify-center text-xl transition-all ${emoji === e ? 'bg-sage-300 text-white shadow-xl scale-110' : 'bg-black/40 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                    >
                      {e}
                    </button>
                  ))}
                  <button 
                    onClick={() => setShowAllEmojis(!showAllEmojis)}
                    className="h-11 w-11 rounded-2xl bg-black/20 border border-dashed border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    {showAllEmojis ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
                {showAllEmojis && (
                   <motion.div 
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="flex flex-wrap gap-2 p-4 bg-black/20 rounded-3xl"
                   >
                     {EMOJIS_EXTRA.map(e => (
                        <button
                          key={e}
                          onClick={() => setEmoji(e)}
                          className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg transition-all ${emoji === e ? 'bg-sage-300 text-white' : 'hover:scale-110'}`}
                        >
                          {e}
                        </button>
                     ))}
                   </motion.div>
                )}
              </div>

              {/* Image Input */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Image de couverture (URL)</label>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2">
                    <Globe className="h-4 w-4 text-zinc-600" />
                  </div>
                  <input 
                    value={image}
                    onChange={e => setImage(e.target.value)}
                    className="w-full bg-black/40 border border-zinc-800 rounded-2xl pl-14 pr-6 py-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sage-300/20 transition-all"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Options section */}
        <section className="space-y-6 opacity-50 cursor-not-allowed">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-sage-300/10 flex items-center justify-center text-sage-300">
              <Palette className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Interface (Bientôt)</h3>
          </div>
          <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800">
             <div className="flex items-center justify-between py-2">
                <span className="text-sm font-bold text-zinc-300">Activer le mode zen automatique</span>
                <div className="w-10 h-6 bg-zinc-800 rounded-full" />
             </div>
             <div className="flex items-center justify-between py-2">
                <span className="text-sm font-bold text-zinc-300">Afficher le compteur de mots</span>
                <div className="w-10 h-6 bg-sage-300/50 rounded-full" />
             </div>
          </div>
        </section>

        {/* Export section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-sage-300/10 flex items-center justify-center text-sage-300">
              <Download className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Sauvegarde & Export</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <ExportBtn label="Export PDF" />
            <ExportBtn label="Export DOCX" />
          </div>
        </section>

        {/* Danger zone */}
        <section className="space-y-6 pt-12 border-t border-red-500/10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-black text-red-500 uppercase tracking-widest">Zone de danger</h3>
          </div>
          <div className="p-8 rounded-3xl bg-red-500/5 border border-red-500/10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-sm font-bold text-zinc-900 dark:text-white">Supprimer ce projet</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Toutes les données, manuscrits et personnages seront effacés.</p>
            </div>
            <button 
              onClick={deleteProject}
              className="px-6 py-3 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" /> Supprimer définitivement
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function ExportBtn({ label }: { label: string }) {
  return (
    <button className="flex items-center justify-between p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 transition-all group shadow-sm">
      <span className="text-xs font-black text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white uppercase tracking-widest">{label}</span>
      <Download className="h-4 w-4 text-zinc-300 dark:text-zinc-700 group-hover:text-sage-300 transition-colors" />
    </button>
  );
}
