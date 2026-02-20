import React, { useEffect, useState } from 'react';
import { GrooveProject } from '../types';
import { getSavedGrooves, deleteGroove, exportGrooveToFile } from '../services/storageService';
import { Trash2, Download, Play, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (groove: GrooveProject) => void;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({ isOpen, onClose, onLoad }) => {
  const [grooves, setGrooves] = useState<GrooveProject[]>([]);

  useEffect(() => {
    if (isOpen) {
      setGrooves(getSavedGrooves());
    }
  }, [isOpen]);

  const handleDelete = (id: string) => {
    deleteGroove(id);
    setGrooves(prev => prev.filter(g => g.id !== id));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-xl font-mono text-slate-100">Groove Library</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {grooves.length === 0 ? (
                <div className="text-center text-slate-500 py-12">
                  <p>No saved grooves yet.</p>
                </div>
              ) : (
                grooves.map((groove) => (
                  <div key={groove.id} className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors group">
                    <div>
                      <h3 className="text-slate-200 font-medium">{groove.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="uppercase">{groove.matrixVibe}</span>
                        <span>•</span>
                        <span>{groove.bpm} BPM</span>
                        <span>•</span>
                        <span>{new Date(groove.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { onLoad(groove); onClose(); }}
                        className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20"
                        title="Load Groove"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => exportGrooveToFile(groove)}
                        className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
                        title="Export JSON"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(groove.id)}
                        className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
