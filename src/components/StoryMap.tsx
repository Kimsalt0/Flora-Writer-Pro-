import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  Panel,
  MarkerType,
  MiniMap,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Novel, Plot, Character, ViewType } from '../types';
import { 
  Plus, 
  Trash2, 
  Maximize2, 
  MousePointer2, 
  Copy, 
  X, 
  Users, 
  MessageSquare,
  Type,
  BrainCircuit,
  Brain,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CustomNode = ({ data, id }: { data: any, id: string }) => {
  const [showMenu, setShowMenu] = useState(false);
  
  const getColors = () => {
    switch (data.type) {
      case 'character': return 'bg-orange-600 border-white border-2 text-white shadow-2xl backdrop-blur-xl ring-4 ring-orange-500/20';
      case 'event': return 'bg-rose-600 border-rose-400 border-dashed border-2 text-white shadow-2xl backdrop-blur-xl';
      case 'note': return 'bg-sage-600 border-sage-200 border-dotted border-2 text-white shadow-2xl backdrop-blur-xl';
      case 'location': return 'bg-indigo-600 border-indigo-400 border-double border-4 text-white shadow-2xl backdrop-blur-xl';
      default: return 'bg-zinc-900 border-zinc-700 text-white shadow-2xl backdrop-blur-xl';
    }
  };

  const getShape = () => {
    switch (data.type) {
      case 'character': return 'rounded-tr-[3.5rem] rounded-bl-[3.5rem] rounded-tl-xl rounded-br-xl'; // Leaf shape
      case 'location': return 'rounded-[4rem] px-10'; // Bubble shape
      case 'note': return 'rounded-[2rem]'; // Round Rectangle
      case 'default': return 'rounded-l-lg rounded-r-[3rem]'; // Bullet shape
      default: return 'rounded-[2.5rem]';
    }
  };

  const updateNodeType = (nodeId: string, newType: string) => {
    data.onTypeChange(nodeId, newType);
    setShowMenu(false);
  };

  return (
    <div 
      onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
      className={`p-6 border shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all min-w-[240px] group relative ${getColors()} ${getShape()} hover:shadow-[0_30px_70px_rgba(0,0,0,0.5)] hover:-translate-y-1.5 select-none`}
    >
      {/* Dynamic Handles for Web-like connections */}
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-white !border !border-current !-top-1.5 !shadow-md" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-white !border !border-current !-bottom-1.5 !shadow-md" />
      <Handle type="source" position={Position.Left} style={{ top: '50%' }} className="!w-2 !h-2 !bg-white !border !border-current !-left-1 !shadow-md" />
      <Handle type="source" position={Position.Right} style={{ top: '50%' }} className="!w-2 !h-2 !bg-white !border !border-current !-right-1 !shadow-md" />
      
      {/* Context Menu Overlay */}
      <AnimatePresence>
        {showMenu && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-3xl rounded-[2.5rem] flex flex-col items-center justify-center gap-4 border border-white/10 p-6"
          >
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); data.onDuplicate(id); setShowMenu(false); }}
                className="flex flex-col items-center gap-1.5 p-3 hover:bg-white/10 rounded-xl transition-colors"
              >
                <Copy className="h-5 w-5 text-indigo-400" />
                <span className="text-[7px] font-black uppercase tracking-widest text-white">Dupliquer</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); data.onDelete(id); setShowMenu(false); }}
                className="flex flex-col items-center gap-1.5 p-3 hover:bg-red-500/20 rounded-xl transition-colors"
              >
                <Trash2 className="h-5 w-5 text-red-400" />
                <span className="text-[7px] font-black uppercase tracking-widest text-white">Supprimer</span>
              </button>
            </div>

            <div className="w-full h-px bg-white/5" />

            <div className="grid grid-cols-2 gap-1.5 w-full">
               <button onClick={() => updateNodeType(id, 'default')} className="text-[7px] font-black uppercase tracking-tighter p-1.5 rounded-md bg-white/5 hover:bg-white/20 text-white transition-all">Intrigue</button>
               <button onClick={() => updateNodeType(id, 'character')} className="text-[7px] font-black uppercase tracking-tighter p-1.5 rounded-md bg-orange-500/20 hover:bg-orange-500 text-white transition-all">Perso</button>
               <button onClick={() => updateNodeType(id, 'location')} className="text-[7px] font-black uppercase tracking-tighter p-1.5 rounded-md bg-indigo-500/20 hover:bg-indigo-500 text-white transition-all">Lieu</button>
               <button onClick={() => updateNodeType(id, 'note')} className="text-[7px] font-black uppercase tracking-tighter p-1.5 rounded-md bg-sage-500/20 hover:bg-sage-500 text-white transition-all">Note</button>
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
              className="absolute top-4 right-4 p-1 text-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             {data.type === 'character' && data.profileImageUrl ? (
               <div className="relative">
                 <img src={data.profileImageUrl} alt="" className="w-10 h-10 rounded-2xl border border-white/20 object-cover shadow-lg" referrerPolicy="no-referrer" />
                 <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-400 rounded-full border border-white flex items-center justify-center">
                    <Users className="h-1.5 w-1.5 text-white" />
                 </div>
               </div>
             ) : (
               <div className={`w-3 h-3 rounded-full bg-white shadow-sm ring-4 ring-white/10`} />
             )}
             <div className="flex flex-col">
               <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/90 leading-none mb-0.5">
                {data.type === 'character' && data.characterName ? data.characterName : (data.type === 'location' && data.locationName ? data.locationName : (data.type === 'note' && data.emoji ? `${data.emoji} Note` : (data.type === 'default' ? 'Intrigue' : (data.type || 'Intrigue'))))}
               </span>
               {data.type === 'character' && (
                 <span className="text-[6px] font-bold uppercase tracking-[0.1em] text-white/40 italic">Rôle Narratif</span>
               )}
               {data.type === 'location' && (
                 <span className="text-[6px] font-bold uppercase tracking-[0.1em] text-white/40 italic">Lieu Clé</span>
               )}
               {data.type === 'note' && (
                 <span className="text-[6px] font-bold uppercase tracking-[0.1em] text-white/40 italic">Idée Capturée</span>
               )}
             </div>
          </div>
        </div>

        <textarea
          value={data.label}
          onChange={(e) => data.onChange(id, e.target.value)}
          className="bg-transparent border-none outline-none text-base font-bold resize-none h-24 custom-scrollbar leading-tight placeholder:italic placeholder:font-normal placeholder:text-white/10 text-white selection:bg-white/20"
          placeholder={data.type === 'character' ? "Décrit le rôle de ce personnage..." : "Décrit ton idée ici..."}
        />
      </div>
      
      {/* Refined corner decoration */}
      <div className={`absolute -bottom-2 -right-2 w-10 h-10 opacity-[0.03] border-b-2 border-r-2 border-current rounded-br-[2rem]`} />
    </div>
  );
};

export default function StoryMap({ novel, onNavigate }: { novel: Novel, onNavigate?: (view: ViewType) => void }) {
  const novelId = novel.id;
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [showCharSelector, setShowCharSelector] = useState(false);
  const [showLocSelector, setShowLocSelector] = useState(false);
  const [showIdeaSelector, setShowIdeaSelector] = useState(false);
  const [selectorPos, setSelectorPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const q = query(collection(db, 'novels', novelId, 'characters'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCharacters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Character)));
    });
    return () => unsubscribe();
  }, [novelId]);

  useEffect(() => {
    const q = query(collection(db, 'novels', novelId, 'ideas'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIdeas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [novelId]);

  useEffect(() => {
    const q = query(collection(db, 'novels', novelId, 'locations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [novelId]);

  const themes = [
    { id: 'none', label: 'Pur', color: '#ffffff' },
    { id: 'parchment', label: 'Parchemin', color: '#f4ecd8' },
    { id: 'royal', label: 'Royal', color: '#fff5f5', pattern: 'https://www.transparenttextures.com/patterns/floral-paper.png' },
    { id: 'night', label: 'Nuit', color: '#1a1a1a' },
    { id: 'forest', label: 'Forêt', color: '#f0fdf4', pattern: 'https://www.transparenttextures.com/patterns/leaves.png' },
  ];

  const currentTheme = themes.find(t => t.id === novel.settings?.themeId) || themes[0];
  const bgType = novel.settings?.backgroundType || 'color';

  const nodeTypes = useMemo(() => ({
    custom: CustomNode,
  }), []);

  const onEdgesDelete = useCallback(async (deletedEdges: Edge[]) => {
    for (const edge of deletedEdges) {
      const sourceId = edge.source;
      const targetId = edge.target;
      try {
        const sourceDoc = doc(db, 'novels', novelId, 'plots', sourceId);
        const currentPlot = nodes.find(n => n.id === sourceId);
        const existingConns = (currentPlot as any)?.data?.connectedTo || [];
        const newConns = existingConns.filter((id: string) => id !== targetId);
        await updateDoc(sourceDoc, {
          connectedTo: newConns
        });
      } catch (err) {
        console.error(err);
      }
    }
  }, [novelId, nodes]);

  const duplicateNode = useCallback(async (id: string) => {
    const nodeToDup = nodes.find(n => n.id === id);
    if (!nodeToDup) return;
    try {
      await addDoc(collection(db, 'novels', novelId, 'plots'), {
        content: nodeToDup.data.label,
        type: nodeToDup.data.type,
        position: { x: nodeToDup.position.x + 50, y: nodeToDup.position.y + 50 },
        connectedTo: [],
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  }, [novelId, nodes]);

  const deleteNode = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'novels', novelId, 'plots', id));
    } catch (err) {
      console.error(err);
    }
  }, [novelId]);

  const updateNodeType = useCallback(async (id: string, type: string) => {
    try {
      await updateDoc(doc(db, 'novels', novelId, 'plots', id), {
        type
      });
    } catch (err) {
      console.error(err);
    }
  }, [novelId]);

  const updateNodeLabel = useCallback(async (id: string, label: string) => {
    try {
      await updateDoc(doc(db, 'novels', novelId, 'plots', id), {
        content: label
      });
    } catch (err) {
      console.error(err);
    }
  }, [novelId]);

  useEffect(() => {
    const q = query(collection(db, 'novels', novelId, 'plots'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const plotNodes: Node[] = [];
      const plotEdges: Edge[] = [];

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const linkedChar = characters.find(c => c.id === data.characterId);
        const charFullName = linkedChar ? ((linkedChar.firstName || linkedChar.lastName) ? `${linkedChar.firstName || ''} ${linkedChar.lastName || ''}`.trim() : linkedChar.name) : null;
        const linkedIdea = ideas.find(i => i.id === data.ideaId);
        const linkedLoc = locations.find(l => l.id === data.locationId);

        plotNodes.push({
          id: doc.id,
          type: 'custom',
          position: data.position || { x: Math.random() * 400, y: Math.random() * 400 },
          data: { 
            label: data.content || '',
            type: data.type || 'default',
            shape: data.shape,
            bracketType: data.bracketType,
            characterName: charFullName || data.characterName,
            locationName: linkedLoc?.name || data.locationName,
            profileImageUrl: linkedChar?.profileImageUrl || data.profileImageUrl,
            emoji: linkedIdea?.emoji || data.emoji,
            connectedTo: data.connectedTo || [], // Store connections in data for easy access
            onDelete: deleteNode,
            onChange: updateNodeLabel,
            onDuplicate: duplicateNode,
            onTypeChange: updateNodeType
          },
        });

        if (data.connectedTo) {
          data.connectedTo.forEach((targetId: string) => {
            plotEdges.push({
              id: `e-${doc.id}-${targetId}`,
              source: doc.id,
              target: targetId,
              animated: false,
              type: 'smoothstep', // Smoother branching
              style: { stroke: '#9CADA3', strokeWidth: 2, strokeOpacity: 0.6 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#9CADA3',
              },
            });
          });
        }
      });

      setNodes(plotNodes);
      setEdges(plotEdges);
    });

    return () => unsubscribe();
  }, [novelId, deleteNode, updateNodeLabel, setNodes, setEdges, characters, ideas, locations]);

  const onConnect = useCallback(
    async (params: Connection) => {
      if (params.source && params.target) {
        const sourceDoc = doc(db, 'novels', novelId, 'plots', params.source);
        const currentNode = nodes.find(n => n.id === params.source);
        const existingConns = currentNode?.data?.connectedTo || [];
        
        await updateDoc(sourceDoc, {
          connectedTo: Array.from(new Set([...existingConns, params.target]))
        });
      }
    },
    [novelId, nodes]
  );

  const onNodeDragStop = useCallback(
    async (_: any, node: Node) => {
      try {
        await updateDoc(doc(db, 'novels', novelId, 'plots', node.id), {
          position: node.position
        });
      } catch (err) {
        console.error(err);
      }
    },
    [novelId]
  );

  const onNodeClick = useCallback(async (_: any, node: Node) => {
    if (selectedNodeId && selectedNodeId !== node.id) {
      // Connect both ways
      const sourceDoc = doc(db, 'novels', novelId, 'plots', selectedNodeId);
      const targetDoc = doc(db, 'novels', novelId, 'plots', node.id);
      
      const sourceNode = nodes.find(n => n.id === selectedNodeId);
      const targetNode = nodes.find(n => n.id === node.id);
      
      const sourceConns = sourceNode?.data?.connectedTo || [];
      const targetConns = targetNode?.data?.connectedTo || [];

      try {
        await Promise.all([
          updateDoc(sourceDoc, { connectedTo: Array.from(new Set([...sourceConns, node.id])) }),
          updateDoc(targetDoc, { connectedTo: Array.from(new Set([...targetConns, selectedNodeId])) })
        ]);
        setSelectedNodeId(null);
      } catch (err) { console.error(err); }
    } else {
      setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
    }
  }, [novelId, selectedNodeId, nodes]);

  const addPlotNode = async (type: string = 'default', content: string = '', charId?: string, extraData: any = {}) => {
    try {
      await addDoc(collection(db, 'novels', novelId, 'plots'), {
        content: content,
        type,
        characterId: charId || null,
        position: { x: 400 + Math.random() * 100, y: 300 + Math.random() * 100 },
        connectedTo: [],
        createdAt: serverTimestamp(),
        ...extraData
      });
      setShowCharSelector(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full w-full bg-zinc-950/20 light:bg-zinc-50/50 rounded-[3rem] overflow-hidden border border-white/5 light:border-zinc-200 shadow-inner relative"
      style={{ 
        backgroundColor: bgType === 'color' ? (novel.settings?.themeId ? currentTheme.color : (novel.settings?.backgroundColor || 'transparent')) : 'transparent',
      }}
    >
      {bgType === 'image' && novel.settings?.backgroundImageUrl && (
        <div className="absolute inset-0 z-0 opacity-10 bg-cover bg-center pointer-events-none" style={{ backgroundImage: `url(${novel.settings?.backgroundImageUrl})` }} />
      )}
      {currentTheme.pattern && (
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none mix-blend-multiply" style={{ backgroundImage: `url(${currentTheme.pattern})` }} />
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background gap={25} size={2} color={document.documentElement.classList.contains('light') ? '#9CADA320' : '#ffffff05'} variant={BackgroundVariant.Dots} />
        
        <Panel position="top-right" className="m-6 flex flex-col gap-2 scale-75 origin-top-right">
           <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-2">
              <MiniMap 
                zoomable 
                pannable 
                nodeColor={node => {
                   switch (node.data.type) {
                     case 'character': return '#f97316';
                     case 'event': return '#e11d48';
                     case 'note': return '#db2777';
                     case 'bubble': return '#4f46e5';
                     default: return '#ffffff';
                   }
                }}
                maskColor="rgba(0,0,0,0.5)"
                className="!bg-zinc-800 !h-32 !w-48 !m-0 rounded-lg"
              />
           </div>
        </Panel>

        <Panel position="top-left" className="m-6 flex flex-col gap-4 pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-zinc-900/95 backdrop-blur-3xl p-2 rounded-[1rem] border border-white/10 shadow-2xl flex flex-col gap-1 min-w-[120px] pointer-events-auto"
          >
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-1 px-1">
               <Plus className="h-2 w-2 text-white/30" />
               <h4 className="text-[6.5px] font-black uppercase tracking-[0.1em] text-white/30">Studio</h4>
            </div>
            
            <div className="flex flex-col gap-1 px-1">
              <NodeSelectorBtn onClick={() => addPlotNode('default')} color="bg-white text-zinc-900" label="Intrigue (Bullet)" icon={<Type className="h-3 w-3" />} />
              <NodeSelectorBtn onClick={() => setShowCharSelector(true)} color="bg-orange-500" label="Perso (Leaf)" icon={<Users className="h-3 w-3" />} />
              <NodeSelectorBtn onClick={() => setShowLocSelector(true)} color="bg-indigo-500" label="Lieu (Bubble)" icon={<MapPin className="h-3 w-3" />} />
              <NodeSelectorBtn onClick={() => setShowIdeaSelector(true)} color="bg-sage-600" label="Note (Round)" icon={<Brain className="h-3 w-3" />} />
              
              <div className="h-px bg-white/5 my-1" />

              {onNavigate && (
                 <NodeSelectorBtn 
                   onClick={() => onNavigate('oracle')} 
                   color="bg-sage-300" 
                   label="L'Oracle" 
                   icon={<BrainCircuit className="h-3 w-3" />} 
                 />
              )}
            </div>
          </motion.div>
        </Panel>

        <Panel position="top-right" className="m-6 flex flex-col gap-4 items-end pointer-events-none">
           <div className="flex items-center gap-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl px-3 py-1.5 rounded-full border border-zinc-200 dark:border-white/10 shadow-lg pointer-events-auto">
              <div className="w-1 h-1 rounded-full bg-sage-400 animate-pulse" />
              <span className="text-[7px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.1em]">Connecté</span>
           </div>

           <div className="relative group pointer-events-auto">
              <div className="absolute -inset-1 bg-gradient-to-tr from-sage-500/10 to-transparent rounded-[1.5rem] blur opacity-50 transition-opacity" />
              <div className="p-1.5 bg-white/90 dark:bg-zinc-900/90 rounded-[1.5rem] border border-zinc-200 dark:border-white/10 shadow-xl backdrop-blur-2xl">
                <MiniMap 
                  style={{ height: 120, width: 180 }}
                  nodeStrokeColor={(n) => {
                    if (n.data?.type === 'character') return '#f97316';
                    if (n.data?.type === 'event') return '#f43f5e';
                    if (n.data?.type === 'note') return '#ec4899';
                    if (n.data?.type === 'bubble') return '#6366f1';
                    return '#9CADA3';
                  }}
                  nodeColor={(n) => {
                    if (n.data?.type === 'character') return '#fb923c';
                    if (n.data?.type === 'event') return '#fb7185';
                    if (n.data?.type === 'note') return '#f472b6';
                    if (n.data?.type === 'bubble') return '#818cf8';
                    return '#9CADA3';
                  }}
                  className="!bg-zinc-50/50 dark:!bg-black/20 !border-none !rounded-[1rem] !relative !m-0 overflow-hidden"
                />
              </div>
           </div>
        </Panel>

        <AnimatePresence>
          {showCharSelector && (
            <Panel position="bottom-center" className="mb-24">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white/98 dark:bg-zinc-950/98 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-2xl min-w-[360px] max-w-sm"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex flex-col">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Choisir un Personnage</h4>
                    <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">Connecte un rôle au récit</span>
                  </div>
                  <button onClick={() => setShowCharSelector(false)} className="text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-6 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                  {/* Main Characters */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-white/5 pb-1">
                      <div className="h-1 w-1 rounded-full bg-orange-400" />
                      <h5 className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Principaux</h5>
                    </div>
                    <div className="grid gap-2">
                      {characters.filter(c => c.role === 'Main').map(char => (
                        <CharSelectItem 
                          key={char.id} 
                          char={char} 
                          onClick={() => {
                            const fullName = (char.firstName || char.lastName) ? `${char.firstName || ''} ${char.lastName || ''}`.trim() : char.name;
                            addPlotNode('character', fullName, char.id);
                          }} 
                        />
                      ))}
                      {characters.filter(c => c.role === 'Main').length === 0 && (
                        <p className="text-[8px] italic text-zinc-400 text-center py-2">Aucun personnage principal</p>
                      )}
                    </div>
                  </div>

                  {/* Secondary Characters */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-white/5 pb-1">
                      <div className="h-1 w-1 rounded-full bg-orange-300/40" />
                      <h5 className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Secondaires</h5>
                    </div>
                    <div className="grid gap-2">
                      {characters.filter(c => c.role === 'Secondary').map(char => (
                        <CharSelectItem 
                          key={char.id} 
                          char={char} 
                          onClick={() => {
                            const fullName = (char.firstName || char.lastName) ? `${char.firstName || ''} ${char.lastName || ''}`.trim() : char.name;
                            addPlotNode('character', fullName, char.id);
                          }} 
                        />
                      ))}
                      {characters.filter(c => c.role === 'Secondary').length === 0 && (
                        <p className="text-[8px] italic text-zinc-400 text-center py-2">Aucun personnage secondaire</p>
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => addPlotNode('character', 'Nouveau Personnage')}
                  className="mt-6 w-full py-3 rounded-xl border border-dashed border-zinc-200 dark:border-white/10 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-orange-400 hover:border-orange-400 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="h-3 w-3" /> Manuellement
                </button>
              </motion.div>
            </Panel>
          )}

          {showIdeaSelector && (
            <Panel position="bottom-center" className="mb-24">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white/98 dark:bg-zinc-950/98 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-2xl min-w-[360px] max-w-sm"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex flex-col">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Choisir une Idée</h4>
                    <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">Intègre tes éclairs créatifs</span>
                  </div>
                  <button onClick={() => setShowIdeaSelector(false)} className="text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                  {ideas.map(idea => (
                    <button 
                      key={idea.id}
                      onClick={() => {
                        addPlotNode('note', idea.content, undefined, { ideaId: idea.id, emoji: idea.emoji });
                        setShowIdeaSelector(false);
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10 hover:border-sage-400/50 transition-all text-left"
                    >
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-sage-300/20 text-xl shrink-0">
                        {idea.emoji || '✨'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-wider line-clamp-2 leading-tight">
                          {idea.content || 'Note vide'}
                        </p>
                      </div>
                    </button>
                  ))}
                  {ideas.length === 0 && (
                    <div className="py-8 text-center space-y-2">
                      <p className="text-[8px] italic text-zinc-400">Aucune idée capturée</p>
                      <button 
                        onClick={() => onNavigate?.('notes_idees')}
                        className="text-[7px] font-black uppercase tracking-widest text-sage-400 hover:underline"
                      >
                        Aller aux idées
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </Panel>
          )}

          {showLocSelector && (
            <Panel position="bottom-center" className="mb-24">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white/98 dark:bg-zinc-950/98 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-2xl min-w-[360px] max-w-sm"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex flex-col">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Choisir un Lieu</h4>
                    <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">Situe ton action</span>
                  </div>
                  <button onClick={() => setShowLocSelector(false)} className="text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                  {locations.map(loc => (
                    <button 
                      key={loc.id}
                      onClick={() => {
                        addPlotNode('location', loc.name, undefined, { locationId: loc.id });
                        setShowLocSelector(false);
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10 hover:border-indigo-400/50 transition-all text-left"
                    >
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-300/20 text-indigo-400 shrink-0">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-wider truncate leading-tight">
                          {loc.name || 'Lieu sans nom'}
                        </p>
                        <p className="text-[7px] text-zinc-500 truncate uppercase mt-0.5">{loc.description || 'Pas de description'}</p>
                      </div>
                    </button>
                  ))}
                  {locations.length === 0 && (
                    <div className="py-8 text-center space-y-2">
                      <p className="text-[8px] italic text-zinc-400">Aucun lieu enregistré</p>
                      <button 
                        onClick={() => onNavigate?.('lieux')}
                        className="text-[7px] font-black uppercase tracking-widest text-indigo-400 hover:underline"
                      >
                        Aller aux lieux
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </Panel>
          )}
        </AnimatePresence>
      </ReactFlow>
    </div>
  );
}

function CharSelectItem({ char, onClick }: { char: Character, onClick: () => void }) {
  const fullName = (char.firstName || char.lastName) ? `${char.firstName || ''} ${char.lastName || ''}`.trim() : char.name;
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-white/5 hover:bg-orange-50 dark:hover:bg-orange-950/20 border border-zinc-100 dark:border-white/5 hover:border-orange-200/50 transition-all text-left group"
    >
      <div className="h-10 w-10 rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-sm shrink-0">
        {char.profileImageUrl ? (
          <img src={char.profileImageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400">
            <Users className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-wider truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
          {fullName}
        </p>
        <p className="text-[7px] font-medium text-zinc-500 uppercase tracking-widest truncate">{char.profession || 'Sans profession'}</p>
      </div>
    </button>
  );
}

function NodeSelectorBtn({ color, label, onClick, icon }: { color: string, label: string, onClick: () => void, icon?: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`px-2 py-1.5 w-full text-left ${color} text-white rounded transition-all text-[7px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] shadow-sm flex items-center justify-between border border-white/5`}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span>{label}</span>
      </div>
      <Plus className="h-1.5 w-1.5 opacity-40" />
    </button>
  );
}


