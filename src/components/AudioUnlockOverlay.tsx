import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';
import { useToast } from '../context/ToastContext';

interface AudioUnlockOverlayProps {
  onUnlock: () => void;
}

export const AudioUnlockOverlay: React.FC<AudioUnlockOverlayProps> = ({ onUnlock }) => {
  const [isUnlocking, setIsUnlocking] = useState(false);
  const { addToast } = useToast();

  const handleUnlock = async () => {
    setIsUnlocking(true);
    try {
      await audioEngine.initialize();
      onUnlock();
      addToast('Audio Engine Ignited', 'success');
    } catch (error) {
      console.error(error);
      addToast('Failed to initialize audio engine', 'error');
      setIsUnlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-8 max-w-md"
      >
        <h1 className="text-4xl font-bold text-slate-100 mb-2 tracking-tight">
          Handpan Rhythm Forge
        </h1>
        <p className="text-slate-400 mb-8">
          Experience the meditative sounds of the digital handpan.
        </p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleUnlock}
          disabled={isUnlocking}
          className="group relative inline-flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-full font-bold text-lg transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
        >
          {isUnlocking ? (
            <span className="animate-pulse">Igniting...</span>
          ) : (
            <>
              <Play className="w-6 h-6 fill-current" />
              Tap to Ignite
            </>
          )}
        </motion.button>
        
        <p className="mt-6 text-xs text-slate-500 uppercase tracking-widest">
          Headphones Recommended
        </p>
      </motion.div>
    </div>
  );
};
