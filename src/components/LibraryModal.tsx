import React, { useEffect, useState, useRef, memo } from 'react';
import { GrooveProject } from '../types';
import { getSavedGrooves, deleteGroove, exportGrooveToFile, importGrooveFromFile, saveGroove } from '../services/storageService';
import { Trash2, Download, Play, X, Upload, Music, Clock, AlertTriangle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';

// --- SUB-COMPONENTS ---

const EmptyState = memo(() => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 mb-4 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/5">
      <Music className="w-8 h-8 text-slate-600" />
    </div>
    <h3 className="text-slate-300 font-medium mb-1">Your library is empty</h3>
    <p className="text-slate-500 text-sm max-w-xs">
      Generate and save new grooves, or import existing JSON files to build your collection.
    </p>
  </div>
));

interface GrooveItemProps {
  groove: GrooveProject;
  onLoad: (groove: GrooveProject) => void;
  onExport: (groove: GrooveProject) => void;
  onDelete: (id: string) => void;
}

const GrooveItem = memo(({ groove, onLoad, onExport, onDelete }: GrooveItemProps) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Auto-reset confirmation state if user doesn't click within 3 seconds
  useEffect(() => {
    let timer: number;
    if (isConfirmingDelete) {
      timer = window.setTimeout(() => setIsConfirmingDelete(false), 3000);
    }
    return () => window.clearTimeout(timer);
  }, [isConfirmingDelete]);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/5 rounded-xl transition-all group gap-4">
      <div className="flex flex-col">
        <span className="text-slate-200 font-medium text-base mb-1 group-hover:text-emerald-400 transition-colors">
          {groove.name}
        </span>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
          <span className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-md">
            <span className="uppercase font-sans font-bold text-[9px]">BPM</span> {groove.bpm}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(groove.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity focus-within:opacity-100">
        <button 
          onClick={() => onLoad(groove)}
          className="flex-1 sm:flex-none flex items-center justify-center p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors focus:ring-2 focus:ring-emerald-500/50 outline-none"
          title="Load & Play"
          aria-label={`Load groove ${groove.name}`}
        >
          <Play className="w-4 h-4 fill-current" />
        </button>
        
        <button 
          onClick={() => onExport(groove)}
          className="p-2.5 bg-white/[0.05] text-slate-400 rounded-lg hover:bg-white/[0.1] hover:text-white transition-colors focus:ring-2 focus:ring-white/20 outline-none"
          title="Export JSON"
          aria-label={`Export groove ${groove.name}`}
        >
          <Download className="w-4 h-4" />
        </button>

        {/* INLINE DELETE CONFIRMATION */}
        <div className="relative">
          <AnimatePresence mode="wait">
            {!isConfirmingDelete ? (
              <motion.button 
                key="trash"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setIsConfirmingDelete(true)}
                className="p-2.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors focus:ring-2 focus:ring-red-500/50 outline-none"
                title="Delete"
                aria-label={`Delete groove ${groove.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.div 
                key="confirm"
                initial={{ opacity: 0, scale: 0.8, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 10 }}
                className="flex items-center gap-1 bg-red-500/20 p-1 rounded-lg border border-red-500/30"
              >
                <span className="text-[10px] font-bold uppercase text-red-400 pl-2 pr-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Sure?
                </span>
                <button 
                  onClick={() => onDelete(groove.id)}
                  className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors focus:ring-2 focus:ring-red-400 outline-none"
                  aria-label="Confirm delete"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => setIsConfirmingDelete(false)}
                  className="p-1.5 bg-black/20 text-red-300 rounded-md hover:bg-black/40 transition-colors focus:ring-2 focus:ring-red-400 outline-none"
                  aria-label="Cancel delete"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});

// --- MAIN MODAL ---

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (groove: GrooveProject) => void;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({ isOpen, onClose, onLoad }) => {
  const [grooves, setGrooves] = useState<GrooveProject[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      try {
        setGrooves(getSavedGrooves());
      } catch (err) {
        console.error("Failed to load grooves from storage", err);
        addToast('Failed to load library data.', 'error');
      }
    }
  }, [isOpen, addToast]);

  // SAFE HANDLERS WITH TRY/CATCH & TOASTS
  const handleDelete = (id: string) => {
    try {
      deleteGroove(id);
      setGrooves(prev => prev.filter(g => g.id !== id));
      addToast('Groove deleted', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to delete groove.', 'error');
    }
  };

  const handleExport = (groove: GrooveProject) => {
    try {
      exportGrooveToFile(groove);
      addToast('Groove exported successfully', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to export groove.', 'error');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedGroove = await importGrooveFromFile(file);
      importedGroove.id = crypto.randomUUID();
      saveGroove(importedGroove);
      setGrooves(getSavedGrooves());
      addToast(`Imported "${importedGroove.name}" successfully`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to import groove. Invalid JSON file format.', 'error');
    } finally {
      e.target.value = ''; // Reset input so the same file can be uploaded again
    }
  };

  const handleLoadAndClose = (groove: GrooveProject) => {
    onLoad(groove);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="library-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-950/80 backdrop-blur-md"
        >
          <motion.div
            key="library-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Music className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 id="modal-title" className="text-lg font-bold text-white tracking-wide">Groove Library</h2>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleImportClick}
                  className="flex items-center gap-2 px-3 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white rounded-xl transition-colors text-xs font-medium uppercase tracking-wider focus:ring-2 focus:ring-white/20 outline-none"
                  aria-label="Import JSON file"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Import</span>
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.05] rounded-xl transition-colors focus:ring-2 focus:ring-white/20 outline-none"
                  aria-label="Close library"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
              {grooves.length === 0 ? (
                <EmptyState />
              ) : (
                grooves.map((groove, idx) => (
                  <GrooveItem 
                    key={`groove-${groove.id || idx}-${idx}`} 
                    groove={groove} 
                    onLoad={handleLoadAndClose}
                    onExport={handleExport}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>

          </motion.div>
        </motion.div>
      )}

      {/* Hidden File Input for Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".json"
        aria-hidden="true"
        tabIndex={-1}
      />
    </AnimatePresence>
  );
};