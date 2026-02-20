import React, { useState, useEffect, useRef } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import { Handpan } from './components/Handpan';
import { AudioUnlockOverlay } from './components/AudioUnlockOverlay';
import { LibraryModal } from './components/LibraryModal';
import { sequencer } from './services/sequencer';
import { generateGroove } from './services/grooveGenerator';
import { saveGroove, importGrooveFromFile } from './services/storageService';
import { DensityLevel, GrooveType, TempoMode, GrooveProject } from './types';
import { Play, Square, RefreshCw, Layers, Activity, Music, Zap, Save, FolderOpen, Upload } from 'lucide-react';
import { motion } from 'motion/react';

function AppContent() {
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [density, setDensity] = useState<DensityLevel>(3);
  const [grooveType, setGrooveType] = useState<GrooveType>('straight');
  const [tempoMode, setTempoMode] = useState<TempoMode>('static');
  const [baseBPM, setBaseBPM] = useState(100);
  const [currentBPM, setCurrentBPM] = useState(100);
  const [activeVisualNote, setActiveVisualNote] = useState<{ id: string; type: string } | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    // Setup sequencer callback for visual sync
    sequencer.setOnStep((_, noteId, type) => {
      if (noteId) {
        setActiveVisualNote({ id: noteId, type });
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
    const newGroove = generateGroove(grooveType);
    sequencer.setSequence(newGroove);
    addToast(`Generated ${grooveType} groove`, 'success');
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 overflow-hidden relative selection:bg-emerald-500/30">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 -z-10" />
      
      {/* Header */}
      <header className="absolute top-6 left-0 right-0 text-center z-10 flex items-center justify-center gap-4">
        <h1 className="text-slate-500 text-xs font-mono uppercase tracking-[0.2em]">
          Phase 2.5: Library & Polish
        </h1>
        {/* Metronome Indicator */}
        <div className={`w-2 h-2 rounded-full transition-all duration-75 ${isMetronomeActive ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] scale-125' : 'bg-slate-800'}`} />
      </header>

      {/* Main Instrument */}
      <main className="relative z-0 flex-1 flex flex-col items-center justify-center w-full">
        <Handpan isAudioUnlocked={isAudioUnlocked} activeVisualNote={activeVisualNote} />
        
        {/* Controls */}
        <div className="mt-8 w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-6 z-20">
          
          {/* Left Column: Transport & Generation */}
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-6">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleTogglePlay}
                disabled={!isAudioUnlocked}
                className={`
                  w-16 h-16 rounded-full flex items-center justify-center
                  ${isPlaying ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'}
                  border-2 transition-colors backdrop-blur-sm
                `}
              >
                {isPlaying ? <Square className="fill-current w-6 h-6" /> : <Play className="fill-current w-6 h-6 ml-1" />}
              </motion.button>

              <div className="flex flex-col gap-2">
                 <select 
                    value={grooveType}
                    onChange={handleGrooveTypeChange}
                    className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 outline-none focus:border-emerald-500"
                    disabled={!isAudioUnlocked}
                  >
                    <option value="straight">Straight 4/4</option>
                    <option value="malfuf">Malfuf (3+3+2)</option>
                    <option value="halftime">Half-Time Chill</option>
                 </select>

                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGenerateGroove}
                    disabled={!isAudioUnlocked}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-500 transition-colors text-xs font-medium"
                    title="Generate New Groove"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSaveGroove}
                    disabled={!isAudioUnlocked}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors text-xs font-medium"
                    title="Save to Library"
                  >
                    <Save className="w-3 h-3" />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Density Slider */}
            <div className="bg-slate-900/50 backdrop-blur-md rounded-xl p-4 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <Layers className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Density</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded">
                  {density === 1 ? 'SKELETON' : density === 2 ? 'ACCENTS' : 'FULL'}
                </span>
              </div>
              
              <div className="relative h-1.5 bg-slate-800 rounded-full mb-2">
                <div 
                  className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${((density - 1) / 2) * 100}%` }}
                />
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="1"
                  value={density}
                  onChange={(e) => handleDensityChange(parseInt(e.target.value) as DensityLevel)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={!isAudioUnlocked}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Temporal Engine & Library */}
          <div className="space-y-4">
            <div className="bg-slate-900/50 backdrop-blur-md rounded-xl p-4 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Temporal Engine</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className={`w-3 h-3 ${tempoMode !== 'static' && isPlaying ? 'text-yellow-400 animate-pulse' : 'text-slate-600'}`} />
                    <span className="font-mono text-xl font-bold text-slate-100">{currentBPM.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-500">BPM</span>
                  </div>
              </div>

              <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Mode</span>
                    <select 
                        value={tempoMode}
                        onChange={handleTempoModeChange}
                        className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 outline-none focus:border-emerald-500"
                        disabled={!isAudioUnlocked}
                      >
                        <option value="static">Static</option>
                        <option value="organic">Organic Drift</option>
                        <option value="staircase">Staircase</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 uppercase">
                        <span>Base Tempo</span>
                        <span>{baseBPM}</span>
                    </div>
                    <input 
                        type="range" 
                        min="60" 
                        max="140" 
                        value={baseBPM}
                        onChange={handleBaseBPMChange}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full"
                        disabled={!isAudioUnlocked}
                      />
                  </div>
              </div>
            </div>

            {/* Library Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setIsLibraryOpen(true)}
                disabled={!isAudioUnlocked}
                className="flex items-center justify-center gap-2 p-3 bg-slate-900/50 border border-slate-800 rounded-xl hover:bg-slate-800 hover:border-slate-600 transition-colors text-xs text-slate-400 hover:text-white"
              >
                <FolderOpen className="w-4 h-4" />
                Library
              </button>
              <button 
                onClick={handleImportClick}
                disabled={!isAudioUnlocked}
                className="flex items-center justify-center gap-2 p-3 bg-slate-900/50 border border-slate-800 rounded-xl hover:bg-slate-800 hover:border-slate-600 transition-colors text-xs text-slate-400 hover:text-white"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".json"
              />
            </div>
          </div>

        </div>
      </main>

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

      {/* Footer */}
      <footer className="absolute bottom-6 text-center text-slate-600 text-xs pointer-events-none">
        <p>Web Audio API • React • Tailwind</p>
      </footer>
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
