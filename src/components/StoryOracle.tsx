import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Novel, Character, Chapter, Part, Plot } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Search, 
  BrainCircuit,
  MessageSquare,
  ArrowRight,
  Loader2,
  Trash2
} from 'lucide-react';

interface StoryOracleProps {
  novel: Novel;
  characters: Character[];
  chapters: Chapter[];
  parts: Part[];
  plots: Plot[];
  accentColor?: string;
}

interface AnalysisResult {
  inconsistencies: {
    type: 'character' | 'plot' | 'timeline' | 'logic';
    description: string;
    suggestion: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  questions: string[];
  tips: string[];
}

export default function StoryOracle({ novel, characters, chapters, parts, plots, accentColor }: StoryOracleProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeStory = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: (process.env as any).GEMINI_API_KEY });
      
      const storyContext = {
        title: novel.title,
        universe: novel.universe,
        description: novel.description,
        characters: characters.map(c => ({
          name: c.name,
          role: c.role,
          personality: c.personality,
          description: c.description,
          age: c.age,
          profession: c.profession
        })),
        chapters: chapters.map(c => ({
          title: c.title,
          content: c.content.substring(0, 500) + '...' // Summary for context
        })),
        plots: plots.map(p => p.content)
      };

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyse cette histoire et ses composants : ${JSON.stringify(storyContext)}.
          Identifie les incohérences potentielles, pose des questions pertinentes pour approfondir l'écriture et donne des conseils spécifiques.`,
        config: {
          systemInstruction: `Tu es un expert en narration, en dramaturgie et en cohérence narrative nommé "L'Oracle du Studio Matcha". 
          Ton rôle est d'analyser les données d'une histoire pour détecter des incohérences, des trous dans l'intrigue (plot holes) ou des comportements de personnages illogiques.
          Sois constructif, mystérieux mais surtout extrêmement précis.
          Réponds obligatoirement en format JSON correspondant à l'interface AnalysisResult.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              inconsistencies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ['character', 'plot', 'timeline', 'logic'] },
                    description: { type: Type.STRING },
                    suggestion: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ['low', 'medium', 'high'] }
                  },
                  required: ['type', 'description', 'suggestion', 'severity']
                }
              },
              questions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              tips: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['inconsistencies', 'questions', 'tips']
          }
        }
      });

      const data = JSON.parse(response.text);
      setResult(data);
    } catch (e) {
      console.error(e);
      setError("Désolé, l'Oracle n'a pas pu se connecter aux astres littéraires.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearResult = () => {
    setResult(null);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div 
            className="h-12 w-12 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg overflow-hidden relative"
            style={{ backgroundColor: accentColor || '#9CAD8F' }}
          >
            <BrainCircuit className="h-6 w-6 relative z-10" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
          </div>
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-600 font-sans mb-1">Intelligence Créative</h2>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase leading-none">L'Oracle du Studio</h1>
          </div>
        </div>
        
        {result && (
          <button 
            onClick={clearResult}
            className="p-2 text-zinc-500 hover:text-white transition-colors"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
        {!result && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-12">
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="h-32 w-32 rounded-full border-2 border-dashed border-zinc-800 flex items-center justify-center"
              />
              <Sparkles className="h-12 w-12 text-sage-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            
            <div className="space-y-4 max-w-sm">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white uppercase italic tracking-tight">Prêt pour l'analyse ?</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                L'Oracle va scanner vos personnages, vos chapitres et votre univers pour détecter les failles logiques et vous aider à solidifier votre récit.
              </p>
            </div>

            <button 
              onClick={analyzeStory}
              disabled={isAnalyzing}
              className="flex items-center gap-3 px-8 py-4 bg-sage-300 hover:bg-sage-400 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              <Search className="h-4 w-4" />
              Consulter l'Oracle
            </button>
          </div>
        )}

        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-full space-y-6 py-12">
            <div className="relative h-20 w-20">
               <motion.div 
                 animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                 transition={{ duration: 2, repeat: Infinity }}
                 className="absolute inset-0 rounded-full bg-sage-300/20 blur-xl"
                 style={{ backgroundColor: accentColor }}
               />
               <Loader2 className="h-20 w-20 text-sage-300 animate-spin" style={{ color: accentColor }} />
            </div>
            <div className="text-center space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-sage-300 animate-pulse">L'Oracle réfléchit</p>
              <p className="text-sm text-zinc-500 italic font-serif">Examen des fils de votre destinée littéraire...</p>
            </div>
          </div>
        )}

        {error && (
            <div className="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 flex flex-col items-center gap-4 text-center">
                <AlertCircle className="h-8 w-8" />
                <p className="text-sm font-medium">{error}</p>
                <button onClick={analyzeStory} className="text-[10px] font-black uppercase tracking-widest bg-red-500 text-white px-4 py-2 rounded-lg">Réessayer</button>
            </div>
        )}

        {result && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Inconsistencies */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Incohérences & Alertes</h3>
              </div>
              <div className="grid gap-4">
                {result.inconsistencies.map((inc, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={idx} 
                    className="p-6 rounded-3xl bg-zinc-900 border border-white/5 space-y-3 group hover:border-amber-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full bg-zinc-800 text-[8px] font-black uppercase tracking-widest text-zinc-400">
                        {inc.type === 'character' ? 'Personnage' : inc.type === 'plot' ? 'Intrigue' : inc.type === 'timeline' ? 'Chronologie' : 'Logique'}
                      </span>
                      <div className={`h-2 w-2 rounded-full ${inc.severity === 'high' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : inc.severity === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} title={`Gravité: ${inc.severity}`} />
                    </div>
                    <p className="text-sm text-white font-medium leading-relaxed">{inc.description}</p>
                    <div className="pt-2 flex flex-col gap-2">
                         <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Conseil de l'Oracle</p>
                         <p className="text-sm text-sage-300 italic font-serif leading-relaxed" style={{ color: accentColor }}>"{inc.suggestion}"</p>
                    </div>
                  </motion.div>
                ))}
                {result.inconsistencies.length === 0 && (
                   <div className="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col items-center text-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500/50" />
                      <p className="text-sm text-emerald-500 font-bold">Aucune incohérence majeure détectée !</p>
                   </div>
                )}
              </div>
            </section>

            {/* Questions to deepen */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="h-4 w-4 text-sage-300" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Pistes de réflexion</h3>
              </div>
              <div className="grid gap-3">
                {result.questions.map((q, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + (idx * 0.1) }}
                    key={idx} 
                    className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-start gap-4 hover:border-sage-300/30 transition-colors"
                  >
                    <MessageSquare className="h-4 w-4 text-zinc-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-zinc-400 font-medium leading-relaxed italic">"{q}"</p>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Writing Tips */}
            <section className="space-y-4 pb-12">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-sage-300" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Conseils d'expert</h3>
              </div>
              <div className="space-y-6">
                {result.tips.map((tip, idx) => (
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     transition={{ delay: 0.6 + (idx * 0.1) }}
                     key={idx} 
                     className="relative pl-6 border-l border-sage-300/20"
                   >
                     <p className="text-sm text-zinc-400 leading-relaxed">
                        {tip}
                     </p>
                     <div className="absolute top-2 left-0 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-sage-300" style={{ backgroundColor: accentColor }} />
                   </motion.div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
