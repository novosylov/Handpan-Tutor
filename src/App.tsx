import React, { useState, useEffect, useRef } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import { Handpan } from './components/Handpan';
import { AudioUnlockOverlay } from './components/AudioUnlockOverlay';
import { LibraryModal } from './components/LibraryModal';
import { MandalaSequencer } from './components/MandalaSequencer';
import { sequencer } from './services/sequencer';
import { generateSequence, PhraseStructure, GENERATOR_STYLES } from './services/generativeEngine';
import { saveGroove, importGrooveFromFile } from './services/storageService';
import { DensityLevel, TempoMode, GrooveProject, Step } from './types';
import { Play, Square, RefreshCw, Save, FolderOpen, Eye, EyeOff, Minus, Plus, Sparkles, ChevronDown, Check, Activity, ListOrdered } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- CONSTANTS ---
const MIN_BPM = 40;
const MAX_BPM = 180;

const TEMPO_MARKS = [
  {name: 'Grave', bpm: 40},
  {name: 'Lento', bpm: 45},
  {name: 'Largo', bpm: 50},
  {name: 'Adagio', bpm: 60},
  {name: 'Andante', bpm: 73},
  {name: 'Moderato', bpm: 86},
  {name: 'Allegretto', bpm: 98},
  {name: 'Allegro', bpm: 109},
  {name: 'Vivace', bpm: 132},
  {name: 'Presto', bpm: 168}
];

const getPhraseStructure = (bars: number): PhraseStructure => {
  if (bars === 1) return ['A'];
  if (bars === 2) return ['A', 'B'];
  if (bars === 4) return ['A', 'A', 'A', 'B'];
  if (bars === 8) return ['A', 'A', 'A', 'B', 'C', 'C', 'C', 'D'];
  return Array.from({ length: bars }, (_, i) => String.fromCharCode(65 + (i % 4))) as PhraseStructure;
};

function AppContent() {
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [showMandala, setShowMandala] = useState(false);
  
  const [density, setDensity] = useState<DensityLevel>(3);
  const [tempoMode, setTempoMode] = useState<TempoMode>('static');
  
  const [barsCount, setBarsCount] = useState<number>(4);
  const [isBarsDropdownOpen, setIsBarsDropdownOpen] = useState(false);
  
  const [selectedStyles, setSelectedStyles] = useState<string[]>(GENERATOR_STYLES.map(s => s.id));
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
  const [isTempoDropdownOpen, setIsTempoDropdownOpen] = useState(false);
  
  const [baseBPM, setBaseBPM] = useState(100);
  const [currentBPM, setCurrentBPM] = useState(100);
  
  const [activeVisualNote, setActiveVisualNote] = useState<{ id: string; type: string; tick: number; modifier?: string } | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [sequence, setSequence] = useState<Step[]>([]);
  const [focusedBar, setFocusedBar] = useState<number | null>(null);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    sequencer.setOnStep((stepIndex, noteId, type, modifier) => {
      setCurrentStep(stepIndex);
      if (noteId) {
        setActiveVisualNote({ id: noteId, type, tick: Date.now(), modifier });
      } else if (type === 'slap') {
         setActiveVisualNote({ id: 'ding', type: 'slap', tick: Date.now() });
      }
    });

    sequencer.setOnBPMChange((bpm) => setCurrentBPM(bpm));

    sequencer.setOnMetronome(() => {
      setIsMetronomeActive(true);
      setTimeout(() => setIsMetronomeActive(false), 100);
    });

    const initialGroove = generateSequence({
      styles: ['standard'],
      phraseStructure: ['A', 'A', 'A', 'B'],
      densityBase: 3
    });
    sequencer.setSequence(initialGroove);
    setSequence(initialGroove);

    return () => {
      sequencer.stop();
      sequencer.setOnStep(() => {});
      sequencer.setOnBPMChange(() => {});
      sequencer.setOnMetronome(() => {});
    };
  }, []);

  const handleTogglePlay = () => {
    if (!isAudioUnlocked) return;
    try {
      if (isPlaying) {
        sequencer.pause();
        setIsPlaying(false);
      } else {
        sequencer.resume();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error(err);
      addToast('Audio engine error. Please refresh.', 'error');
    }
  };

  const handleGenerateGroove = () => {
    try {
      const newGroove = generateSequence({
        styles: selectedStyles.length > 0 ? selectedStyles : ['standard'],
        phraseStructure: getPhraseStructure(barsCount),
        densityBase: density
      });

      setFocusedBar(null);
      sequencer.setFocusedBar(null);
      
      sequencer.setSequence(newGroove);
      setSequence(newGroove);
      setCurrentStep(0);
      addToast(`Generated ${barsCount}-bar groove`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to generate groove', 'error');
    }
  };

  const toggleStyle = (styleId: string) => {
    setSelectedStyles(prev => {
      if (prev.includes(styleId)) {
        if (prev.length === 1) return prev; 
        return prev.filter(id => id !== styleId);
      } else {
        return [...prev, styleId];
      }
    });
  };

  const handleDensityChange = (val: number) => {
    const safeVal = Math.max(1, Math.min(5, val)) as DensityLevel;
    setDensity(safeVal);
    sequencer.setDensity(safeVal);
  };

  const handleBaseBPMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(MIN_BPM, Math.min(MAX_BPM, parseInt(e.target.value) || 100));
    setBaseBPM(val);
    sequencer.setBaseBPM(val);
  };

  const jumpTempo = (direction: -1 | 1) => {
    let newBPM = baseBPM;
    if (direction === -1) {
      const target = [...TEMPO_MARKS].reverse().find(m => m.bpm < baseBPM);
      newBPM = target ? target.bpm : Math.max(MIN_BPM, baseBPM - 5);
    } else {
      const target = TEMPO_MARKS.find(m => m.bpm > baseBPM);
      newBPM = target ? target.bpm : Math.min(MAX_BPM, baseBPM + 5);
    }
    setBaseBPM(newBPM);
    sequencer.setBaseBPM(newBPM);
  };

  const handleBarClick = (barIndex: number) => {
    const newFocus = focusedBar === barIndex ? null : barIndex;
    setFocusedBar(newFocus);
    sequencer.setFocusedBar(newFocus);
  };

  const handleSaveGroove = () => {
    try {
      const groove: GrooveProject = {
        id: crypto.randomUUID(),
        name: `Groove ${new Date().toLocaleTimeString()}`,
        createdAt: new Date().toISOString(),
        bpm: baseBPM,
        matrixVibe: 'straight', 
        sequence: sequencer.getSequence(),
      };
      saveGroove(groove);
      addToast('Groove saved to library', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to save groove', 'error');
    }
  };

  const handleLoadGroove = (groove: GrooveProject) => {
    sequencer.setSequence(groove.sequence);
    setSequence(groove.sequence);
    setBaseBPM(groove.bpm);
    sequencer.setBaseBPM(groove.bpm);
    setFocusedBar(null);
    sequencer.setFocusedBar(null);
    addToast(`Loaded "${groove.name}"`, 'success');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const groove = await importGrooveFromFile(file);
      groove.id = crypto.randomUUID();
      handleLoadGroove(groove);
      e.target.value = '';
    } catch (err) {
      console.error(err);
      addToast('Failed to import groove', 'error');
    }
  };

  const currentTempoMark = TEMPO_MARKS.reduce((prev, curr) => {
    return (Math.abs(curr.bpm - baseBPM) < Math.abs(prev.bpm - baseBPM) ? curr : prev);
  });

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-neutral-950 text-white font-sans selection:bg-emerald-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 -z-10 pointer-events-none" />
      
      <header className="absolute top-4 left-0 right-0 z-10 flex items-center justify-center pointer-events-none">
        <div className="absolute top-0 right-4 pointer-events-auto flex items-center gap-4">
           <button 
             onClick={() => setShowMandala(!showMandala)}
             className={`p-2 rounded-full transition-colors ${showMandala ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-600 hover:text-slate-400'}`}
             title={showMandala ? "Hide Sequencer" : "Show Sequencer"}
             aria-label="Toggle visual sequencer"
           >
             {showMandala ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
           </button>
           <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full transition-all duration-75 ${isMetronomeActive ? 'bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.9)] scale-110' : 'bg-slate-800 border border-slate-700'}`} />
        </div>
      </header>

      <div className="flex-1 min-h-0 relative flex items-center justify-center p-2 sm:p-4">
          <div className="relative flex items-center justify-center w-full h-full">
            <div className={`transition-all duration-500 ${showMandala ? 'xl:translate-x-[-160px]' : ''} w-full h-full flex items-center justify-center`}>
               <Handpan 
                  isAudioUnlocked={isAudioUnlocked} 
                  activeVisualNote={activeVisualNote} 
                  currentStep={currentStep}
                  focusedBar={focusedBar}
                  onBarClick={handleBarClick}
                  sequence={sequence}
               />
            </div>

            <AnimatePresence>
              {showMandala && (
                <motion.div 
                  key="mandala-sequencer"
                  initial={{ opacity: 0, scale: 0.8, x: 0 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 0 }}
                  className="absolute xl:relative xl:translate-x-[160px] pointer-events-auto z-10"
                >
                   <div className="bg-slate-950/80 backdrop-blur-xl rounded-full p-6 md:p-8 border border-slate-800 shadow-2xl">
                     <MandalaSequencer 
                        sequence={sequence} 
                        currentStep={currentStep} 
                        focusedBar={focusedBar}
                        onBarClick={handleBarClick}
                     />
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
      </div>

      <div className="relative shrink-0 w-full bg-neutral-950/95 backdrop-blur-xl border-t border-white/5 pb-safe z-20">
         <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 p-5 md:p-6 pt-6 md:pt-7">
            
            <div className="flex items-center gap-6">
               <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleTogglePlay}
                  disabled={!isAudioUnlocked}
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center shadow-2xl flex-shrink-0
                    ${isPlaying ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}
                    backdrop-blur-md transition-all
                  `}
                >
                  {isPlaying ? <Square className="fill-current w-6 h-6" /> : <Play className="fill-current w-6 h-6 ml-1.5" />}
                </motion.button>

               <div className="flex-1 flex flex-col gap-3">
                  <div className="flex items-end justify-between">
                     <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-light font-mono text-white leading-none tracking-tighter">{Math.round(currentBPM)}</span>
                        <span className="text-xs text-emerald-400 uppercase font-medium tracking-widest">{currentTempoMark.name}</span>
                     </div>
                     
                     <div className="relative">
                        <button 
                           onClick={() => setIsTempoDropdownOpen(!isTempoDropdownOpen)}
                           disabled={!isAudioUnlocked}
                           className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-white/5 transition-colors text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white"
                        >
                           <Activity className="w-3 h-3 text-emerald-400/70" />
                           {tempoMode === 'staircase' ? 'Stair' : tempoMode}
                           <ChevronDown className={`w-3 h-3 transition-transform ${isTempoDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isTempoDropdownOpen && (
                          <div className="fixed inset-0 z-40" onClick={() => setIsTempoDropdownOpen(false)} />
                        )}
                        <AnimatePresence>
                          {isTempoDropdownOpen && (
                            <motion.div
                              key="tempo-dropdown-menu"
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              className="absolute right-0 bottom-full mb-2 bg-neutral-900 border border-white/10 rounded-lg shadow-xl overflow-hidden z-50 p-1 min-w-[120px]"
                            >
                              {(['static', 'organic', 'staircase', 'pyramid'] as TempoMode[]).map(mode => (
                                <button
                                  key={`tempo-mode-${mode}`}
                                  onClick={() => {
                                     setTempoMode(mode);
                                     sequencer.setTempoMode(mode);
                                     setIsTempoDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                    tempoMode === mode ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                  }`}
                                >
                                  {mode}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                     </div>
                  </div>

                  <div className="flex items-center gap-3">
                     <button onClick={() => jumpTempo(-1)} disabled={!isAudioUnlocked} className="text-slate-500 hover:text-white transition-colors p-1"><Minus className="w-4 h-4" /></button>
                     <input 
                        type="range" 
                        min={MIN_BPM} max={MAX_BPM} step="1" 
                        value={baseBPM}
                        onChange={handleBaseBPMChange}
                        disabled={!isAudioUnlocked}
                        className="flex-1 h-1.5 bg-neutral-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full transition-all"
                     />
                     <button onClick={() => jumpTempo(1)} disabled={!isAudioUnlocked} className="text-slate-500 hover:text-white transition-colors p-1"><Plus className="w-4 h-4" /></button>
                  </div>
               </div>
            </div>

            <div className="flex flex-col justify-center gap-5">
               
               <div className="flex items-center gap-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] w-16">Density</span>
                  <div className="flex-1 relative h-4 flex items-center">
                     <div className="absolute inset-x-0 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${((density - 1) / 4) * 100}%` }} />
                     </div>
                     <input 
                        type="range" 
                        min="1" max="5" step="1"
                        value={density}
                        onChange={(e) => handleDensityChange(parseInt(e.target.value))}
                        disabled={!isAudioUnlocked}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                     <div className="absolute inset-x-0 flex justify-between pointer-events-none px-0.5">
                        {[1,2,3,4,5].map(i => (
                           <div key={`density-dot-${i}`} className={`w-1.5 h-1.5 rounded-full ${i <= density ? 'bg-white' : 'bg-neutral-600'}`} />
                        ))}
                     </div>
                  </div>
               </div>

               <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                      <button
                        onClick={() => setIsStyleDropdownOpen(!isStyleDropdownOpen)}
                        disabled={!isAudioUnlocked}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-transparent hover:border-white/10 rounded-xl text-xs text-slate-300 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-400/80" />
                          <span className="font-medium tracking-wide">
                            {selectedStyles.length === GENERATOR_STYLES.length 
                              ? 'ALL STYLES' 
                              : `${selectedStyles.length} STYLE${selectedStyles.length !== 1 ? 'S' : ''}`}
                          </span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isStyleDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isStyleDropdownOpen && (
                        <div className="fixed inset-0 z-40" onClick={() => setIsStyleDropdownOpen(false)} />
                      )}
                      <AnimatePresence>
                        {isStyleDropdownOpen && (
                          <motion.div
                            key="style-dropdown-menu"
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            className="absolute bottom-full left-0 right-0 mb-3 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 p-1.5 min-w-[200px]"
                          >
                            <div className="max-h-[40vh] overflow-y-auto custom-scrollbar">
                              {GENERATOR_STYLES.map((style) => {
                                const isSelected = selectedStyles.includes(style.id);
                                return (
                                  <button
                                    key={`style-item-${style.id}`}
                                    onClick={() => toggleStyle(style.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                                      isSelected 
                                        ? 'bg-emerald-500/15 text-emerald-400' 
                                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                    }`}
                                  >
                                    <span>{style.name}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5" />}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </div>

                  <div className="flex gap-2">
                     <div className="relative">
                       <button
                          onClick={() => setIsBarsDropdownOpen(!isBarsDropdownOpen)}
                          disabled={!isAudioUnlocked}
                          className="flex items-center justify-center gap-1.5 h-full px-3 bg-white/[0.03] hover:bg-white/[0.08] border border-transparent hover:border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all"
                       >
                          <ListOrdered className="w-4 h-4 text-slate-500" />
                          {barsCount} <span className="hidden sm:inline">Bars</span>
                       </button>

                       {isBarsDropdownOpen && (
                         <div className="fixed inset-0 z-40" onClick={() => setIsBarsDropdownOpen(false)} />
                       )}
                       <AnimatePresence>
                          {isBarsDropdownOpen && (
                            <motion.div
                              key="bars-dropdown-menu"
                              initial={{ opacity: 0, y: 10, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.98 }}
                              className="absolute bottom-full right-0 mb-3 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 p-1.5 min-w-[100px]"
                            >
                              {[1, 2, 4, 8].map((num) => (
                                <button
                                  key={`bars-opt-${num}`}
                                  onClick={() => {
                                    setBarsCount(num);
                                    setIsBarsDropdownOpen(false);
                                  }}
                                  className={`w-full text-center px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                                    barsCount === num 
                                      ? 'bg-emerald-500/15 text-emerald-400' 
                                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                  }`}
                                >
                                  {num} Bars
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                     </div>

                     <button onClick={handleGenerateGroove} disabled={!isAudioUnlocked} className="p-2.5 bg-white/[0.03] hover:bg-white/[0.08] rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 border border-transparent hover:border-emerald-400/20 transition-all group" title="Generate New">
                        <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                     </button>
                     <button onClick={() => setIsLibraryOpen(true)} disabled={!isAudioUnlocked} className="p-2.5 bg-white/[0.03] hover:bg-white/[0.08] rounded-xl text-slate-400 hover:text-white transition-all" title="Library">
                        <FolderOpen className="w-4 h-4" />
                     </button>
                     <button onClick={handleSaveGroove} disabled={!isAudioUnlocked} className="p-2.5 bg-white/[0.03] hover:bg-white/[0.08] rounded-xl text-slate-400 hover:text-emerald-400 transition-all" title="Save">
                        <Save className="w-4 h-4" />
                     </button>
                  </div>
               </div>

            </div>

         </div>
      </div>

      <LibraryModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} onLoad={handleLoadGroove} />
      {!isAudioUnlocked && <AudioUnlockOverlay onUnlock={() => setIsAudioUnlocked(true)} />}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}