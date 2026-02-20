import React, { useState, useEffect, useRef } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import { Handpan } from './components/Handpan';
import { AudioUnlockOverlay } from './components/AudioUnlockOverlay';
import { LibraryModal } from './components/LibraryModal';
import { MandalaSequencer } from './components/MandalaSequencer';
import { sequencer } from './services/sequencer';
import { generateGroove } from './services/grooveGenerator';
import { generateSequence, PhraseStructure, GENERATOR_STYLES } from './services/generativeEngine';
import { saveGroove, importGrooveFromFile } from './services/storageService';
import { DensityLevel, GrooveType, TempoMode, GrooveProject, Step } from './types';
import { Play, Square, RefreshCw, Layers, Activity, Music, Zap, Save, FolderOpen, Upload, Eye, EyeOff, Minus, Plus, Sparkles, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

function AppContent() {
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [density, setDensity] = useState<DensityLevel>(3);
  const [grooveType, setGrooveType] = useState<GrooveType>('straight');
  const [tempoMode, setTempoMode] = useState<TempoMode>('static');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(GENERATOR_STYLES.map(s => s.id));
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
  const [baseBPM, setBaseBPM] = useState(100);
  const [currentBPM, setCurrentBPM] = useState(100);
  const [activeVisualNote, setActiveVisualNote] = useState<{ id: string; type: string; tick: number; modifier?: string } | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [sequence, setSequence] = useState<Step[]>([]);
  const [focusedBar, setFocusedBar] = useState<number | null>(null);
  
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [showMandala, setShowMandala] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    // Setup sequencer callback for visual sync
    sequencer.setOnStep((stepIndex, noteId, type, modifier) => {
      setCurrentStep(stepIndex);
      if (noteId) {
        setActiveVisualNote({ id: noteId, type, tick: Date.now(), modifier });
      } else if (type === 'slap') {
         setActiveVisualNote({ id: 'ding', type: 'slap', tick: Date.now() });
      }
    });

    // Setup BPM monitor
    sequencer.setOnBPMChange((bpm) => {
      setCurrentBPM(bpm);
    });

    // Setup Metronome
    sequencer.setOnMetronome(() => {
      setIsMetronomeActive(true);
      setTimeout(() => setIsMetronomeActive(false), 100);
    });

    // Initial Groove
    const initialGroove = generateGroove('straight');
    sequencer.setSequence(initialGroove);
    setSequence(initialGroove);

    return () => {
      sequencer.stop();
    };
  }, []);

  const handleTogglePlay = () => {
    if (!isAudioUnlocked) return;
    
    if (isPlaying) {
      sequencer.stop();
      setIsPlaying(false);
    } else {
      sequencer.start();
      setIsPlaying(true);
    }
  };

  const handleGenerateGroove = () => {
    let newGroove: Step[] = [];
    
    // If only 'standard' is selected (or nothing), use legacy generator for pure standard feel
    if (selectedStyles.length === 1 && selectedStyles[0] === 'standard') {
      newGroove = generateGroove(grooveType, density);
    } else {
      // Use new engine with mixed styles
      newGroove = generateSequence({
        styles: selectedStyles,
        phraseStructure: ['A', 'A', 'A', 'B'], // Standard 4-bar educational structure
        densityBase: density
      });
    }

    sequencer.setSequence(newGroove);
    setSequence(newGroove);
    setCurrentStep(0);
    addToast('Generated new groove', 'success');
  };

  const toggleStyle = (styleId: string) => {
    setSelectedStyles(prev => {
      if (prev.includes(styleId)) {
        // Don't allow empty selection
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== styleId);
      } else {
        return [...prev, styleId];
      }
    });
  };

  const handleDensityChange = (val: DensityLevel) => {
    setDensity(val);
    sequencer.setDensity(val);
  };

  const handleGrooveTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGrooveType(e.target.value as GrooveType);
  };

  const handleTempoModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mode = e.target.value as TempoMode;
    setTempoMode(mode);
    sequencer.setTempoMode(mode);
  };

  const handleBaseBPMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setBaseBPM(val);
    sequencer.setBaseBPM(val);
  };

  const jumpTempo = (direction: -1 | 1) => {
    let newBPM = baseBPM;
    if (direction === -1) {
      // Find largest mark strictly less than current
      const target = [...TEMPO_MARKS].reverse().find(m => m.bpm < baseBPM);
      newBPM = target ? target.bpm : Math.max(40, baseBPM - 5);
    } else {
      // Find smallest mark strictly greater than current
      const target = TEMPO_MARKS.find(m => m.bpm > baseBPM);
      newBPM = target ? target.bpm : Math.min(180, baseBPM + 5);
    }
    setBaseBPM(newBPM);
    sequencer.setBaseBPM(newBPM);
  };

  const handleBarClick = (barIndex: number) => {
    if (focusedBar === barIndex) {
      setFocusedBar(null);
      sequencer.setFocusedBar(null);
    } else {
      setFocusedBar(barIndex);
      sequencer.setFocusedBar(barIndex);
    }
  };

  const handleSaveGroove = () => {
    const groove: GrooveProject = {
      id: crypto.randomUUID(),
      name: `Groove ${new Date().toLocaleTimeString()}`,
      createdAt: new Date().toISOString(),
      bpm: baseBPM,
      matrixVibe: grooveType,
      sequence: sequencer.getSequence(),
    };
    saveGroove(groove);
    addToast('Groove saved to library', 'success');
  };

  const handleLoadGroove = (groove: GrooveProject) => {
    sequencer.setSequence(groove.sequence);
    setSequence(groove.sequence);
    setBaseBPM(groove.bpm);
    sequencer.setBaseBPM(groove.bpm);
    setGrooveType(groove.matrixVibe);
    addToast(`Loaded "${groove.name}"`, 'success');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const groove = await importGrooveFromFile(file);
      handleLoadGroove(groove);
      // Reset input
      e.target.value = '';
    } catch (err) {
      console.error(err);
      addToast('Failed to import groove', 'error');
    }
  };

  // Get current tempo mark name
  const currentTempoMark = TEMPO_MARKS.reduce((prev, curr) => {
    return (Math.abs(curr.bpm - baseBPM) < Math.abs(prev.bpm - baseBPM) ? curr : prev);
  });

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-neutral-950 text-white font-sans selection:bg-emerald-500/30">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 -z-10 pointer-events-none" />
      
      {/* Header */}
      <header className="absolute top-4 left-0 right-0 z-10 flex items-center justify-center pointer-events-none">
        <h1 className="text-slate-500 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] pointer-events-auto">
          Phase 4: Mandala Sequencer
        </h1>
        
        {/* Metronome Indicator - Top Right */}
        <div className="absolute top-0 right-4 pointer-events-auto flex items-center gap-4">
           {/* Mandala Toggle */}
           <button 
             onClick={() => setShowMandala(!showMandala)}
             className={`p-2 rounded-full transition-colors ${showMandala ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-600 hover:text-slate-400'}`}
             title={showMandala ? "Hide Sequencer" : "Show Sequencer"}
           >
             {showMandala ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
           </button>

           <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full transition-all duration-75 ${isMetronomeActive ? 'bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.9)] scale-110' : 'bg-slate-800 border border-slate-700'}`} />
        </div>
      </header>

      {/* Instrument Stage (Top) */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center p-2 sm:p-4">
          <div className="relative flex items-center justify-center w-full h-full">
            
            {/* Physical Handpan - Always Centered */}
            <div className={`transition-all duration-500 ${showMandala ? 'xl:translate-x-[-160px]' : ''} w-full h-full flex items-center justify-center`}>
               <Handpan 
                  isAudioUnlocked={isAudioUnlocked} 
                  activeVisualNote={activeVisualNote} 
                  currentStep={currentStep}
                  focusedBar={focusedBar}
                  onBarClick={handleBarClick}
               />
            </div>

            {/* Mandala Sequencer - Conditionally Visible */}
            <AnimatePresence>
              {showMandala && (
                <motion.div 
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

      {/* HUD Panel (Bottom) */}
      <div className="shrink-0 w-full bg-neutral-900 border-t border-neutral-800 p-4 pb-safe z-20">
         <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
            
            {/* Left: Transport & Tempo */}
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
               {/* Play Button */}
               <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleTogglePlay}
                  disabled={!isAudioUnlocked}
                  className={`
                    w-14 h-14 rounded-full flex items-center justify-center shadow-lg flex-shrink-0
                    ${isPlaying ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'}
                    backdrop-blur-sm transition-colors
                  `}
                >
                  {isPlaying ? <Square className="fill-current w-5 h-5" /> : <Play className="fill-current w-5 h-5 ml-1" />}
                </motion.button>

               {/* Musical Tempo Controls */}
               <div className="flex items-center gap-2 bg-neutral-800/50 rounded-2xl p-2 border border-white/5 flex-1 md:flex-none min-w-[220px]">
                  <button 
                    onClick={() => jumpTempo(-1)}
                    disabled={!isAudioUnlocked}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-neutral-700/50 text-slate-300 hover:bg-neutral-600/50 hover:text-white transition-colors flex-shrink-0"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  
                  <div className="flex flex-col items-center flex-1 gap-0.5 px-2">
                     <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold font-mono text-white leading-none">{Math.round(currentBPM)}</span>
                        <span className="text-[10px] text-emerald-400 uppercase font-medium tracking-wide truncate max-w-[80px]">{currentTempoMark.name}</span>
                     </div>
                     <input 
                        type="range" 
                        min="40" 
                        max="180" 
                        step="1" 
                        value={baseBPM}
                        onChange={handleBaseBPMChange}
                        className="w-full h-1 bg-neutral-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full"
                        disabled={!isAudioUnlocked}
                     />
                  </div>

                  <button 
                    onClick={() => jumpTempo(1)}
                    disabled={!isAudioUnlocked}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-neutral-700/50 text-slate-300 hover:bg-neutral-600/50 hover:text-white transition-colors flex-shrink-0"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
               </div>
            </div>

            {/* Right: Density & Generator */}
            <div className="flex flex-col gap-3 w-full md:w-auto flex-1">
               
               {/* Density Slider */}
               <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                     <span>Skeleton</span>
                     <span>Flow</span>
                  </div>
                  <div className="relative h-6 flex items-center">
                     <div className="absolute inset-x-0 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                           className="h-full bg-emerald-500 transition-all duration-300"
                           style={{ width: `${((density - 1) / 4) * 100}%` }}
                        />
                     </div>
                     <input 
                        type="range" 
                        min="1" 
                        max="5" 
                        step="1"
                        value={density}
                        onChange={(e) => handleDensityChange(parseInt(e.target.value) as DensityLevel)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={!isAudioUnlocked}
                      />
                     {/* Ticks */}
                     <div className="absolute inset-x-0 flex justify-between pointer-events-none px-1">
                        {[1,2,3,4,5].map(i => (
                           <div key={i} className={`w-1 h-1 rounded-full ${i <= density ? 'bg-white' : 'bg-neutral-600'}`} />
                        ))}
                     </div>
                  </div>
               </div>

               {/* Secondary Controls Row */}
               <div className="flex items-center justify-between gap-2">
                  {/* Style Multi-Select Dropdown */}
                  <div className="relative flex-1">
                      <button
                        onClick={() => setIsStyleDropdownOpen(!isStyleDropdownOpen)}
                        disabled={!isAudioUnlocked}
                        className="w-full flex items-center justify-between px-3 py-2 bg-neutral-800 border border-white/10 rounded-lg text-xs text-slate-300 hover:text-white hover:border-white/20 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-medium truncate">
                            {selectedStyles.length === GENERATOR_STYLES.length 
                              ? 'All Styles Active' 
                              : `${selectedStyles.length} Style${selectedStyles.length !== 1 ? 's' : ''} Selected`}
                          </span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isStyleDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {isStyleDropdownOpen && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setIsStyleDropdownOpen(false)} 
                            />
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute bottom-full left-0 right-0 mb-2 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden z-50 p-1 min-w-[200px]"
                            >
                              {GENERATOR_STYLES.map((style) => {
                                const isSelected = selectedStyles.includes(style.id);
                                return (
                                  <button
                                    key={style.id}
                                    onClick={() => toggleStyle(style.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                                      isSelected 
                                        ? 'bg-emerald-500/10 text-emerald-400' 
                                        : 'text-slate-400 hover:bg-neutral-800 hover:text-slate-200'
                                    }`}
                                  >
                                    <span>{style.name}</span>
                                    {isSelected && <Check className="w-3 h-3" />}
                                  </button>
                                );
                              })}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                   </div>

                  <div className="flex gap-2">
                     <button
                        onClick={handleGenerateGroove}
                        disabled={!isAudioUnlocked}
                        className="p-2 bg-neutral-800 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-colors group"
                        title="Generate"
                     >
                        <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                     </button>
                     <button
                        onClick={() => setIsLibraryOpen(true)}
                        disabled={!isAudioUnlocked}
                        className="p-2 bg-neutral-800 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="Library"
                     >
                        <FolderOpen className="w-4 h-4" />
                     </button>
                     <button
                        onClick={handleSaveGroove}
                        disabled={!isAudioUnlocked}
                        className="p-2 bg-neutral-800 border border-white/10 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors"
                        title="Save"
                     >
                        <Save className="w-4 h-4" />
                     </button>
                  </div>
               </div>

            </div>

         </div>
      </div>

      {/* Library Modal */}
      <LibraryModal 
        isOpen={isLibraryOpen} 
        onClose={() => setIsLibraryOpen(false)} 
        onLoad={handleLoadGroove} 
      />

      {/* Overlay */}
      {!isAudioUnlocked && (
        <AudioUnlockOverlay onUnlock={() => setIsAudioUnlocked(true)} />
      )}
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".json"
      />
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
