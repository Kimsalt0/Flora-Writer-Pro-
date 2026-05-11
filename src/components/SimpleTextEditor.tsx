import { useState, useEffect } from 'react';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Novel } from '../types';

export default function SimpleTextEditor({ novel, field }: { novel: Novel, field: 'universe' | 'notes' }) {
  const [content, setContent] = useState(novel[field] || '');

  useEffect(() => {
    setContent(novel[field] || '');
  }, [novel.id, field, novel[field]]);

  const save = async () => {
    if (content === novel[field]) return;
    try {
      await updateDoc(doc(db, 'novels', novel.id), {
        [field]: content,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `novels/${novel.id}`);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-200px)]">
      <div className="flex items-center justify-between mb-10 border-b border-sage-300/10 pb-6 relative">
        <div className="space-y-0.5">
          <h2 className="text-lg font-black tracking-tighter text-zinc-900 dark:text-white uppercase italic leading-none transition-colors">
            {field === 'universe' ? 'Univers' : 'Notes'}
          </h2>
          <div className="h-0.5 w-6 bg-sage-300 rounded-full" />
        </div>
      </div>
      <textarea 
        className="flex-1 w-full bg-white dark:bg-zinc-900/50 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none resize-none text-xl leading-relaxed placeholder:text-zinc-300 dark:placeholder:text-zinc-800 custom-scrollbar shadow-inner transition-colors"
        placeholder={`Décrivez votre ${field}...`}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={save}
      />
    </div>
  );
}
