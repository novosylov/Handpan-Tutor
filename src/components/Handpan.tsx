import React, { useState, useEffect } from 'react';
import { HANDPAN_NOTES } from '../constants';
import { Note } from '../types';
import { audioEngine } from '../services/audioEngine';
import { useToast } from '../context/ToastContext';
import { motion } from 'motion/react';

interface HandpanProps {
  isAudioUnlocked: boolean;
  activeVisualNote?: { id: string; type: string } | null;
}

export const Handpan: React.FC<HandpanProps> = ({ isAudioUnlocked, activeVisualNote }) => {
  const { addToast } = useToast();
  const [localActiveNote, setLocalActiveNote] = useState<string | null>(null);

  // Handle external visual triggers (from sequencer)
  useEffect(() => {
    if (activeVisualNote) {
      setLocalActiveNote(activeVisualNote.id);
      const timer = setTimeout(() => setLocalActiveNote(null), 150);
      return () => clearTimeout(timer);
    }
  }, [activeVisualNote]);

  const handleNoteClick = (note: Note) => {
    if (!isAudioUnlocked) {
      addToast('Tap "Ignite" to unlock audio first!', 'error');
      return;
    }

    try {
      // Trigger Audio (Manual play is always Accent velocity)
      audioEngine.playTone(note.frequency, 'sine', 2.0, 0.9);
      
      // Trigger Visual Feedback
      setLocalActiveNote(note.id);
      setTimeout(() => setLocalActiveNote(null), 200);
    } catch (err) {
      addToast('Failed to play note', 'error');
      console.error(err);
    }
  };

  // Separate Ding from Radial notes
  const ding = HANDPAN_NOTES.find(n => n.id === 'ding');
  const radialNotes = HANDPAN_NOTES.filter(n => n.id !== 'ding');

  return (
    <div className="relative w-[320px] h-[320px] md:w-[600px] md:h-[600px] mx-auto mt-8" style={{ containerType: 'inline-size' }}>
      {/* Main Body Background */}
      <div className="absolute inset-0 rounded-full bg-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-700/50" />
      
      {/* Decorative Inner Ring */}
      <div className="absolute inset-12 rounded-full border border-slate-700/30 pointer-events-none" />

      {/* Center Ding */}
      {ding && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <NoteButton 
            note={ding} 
            isActive={localActiveNote === ding.id} 
            isGhost={activeVisualNote?.id === ding.id && activeVisualNote?.type === 'ghost'}
            onClick={() => handleNoteClick(ding)}
            size="large"
          />
        </div>
      )}

      {/* Radial Notes */}
      {radialNotes.map((note) => {
        // Strict Radial Geometry
        // 1. Center the element (top: 50%, left: 50%)
        // 2. Rotate to the correct angle
        // 3. Translate OUTWARD (negative Y) by a percentage of the container width (cqw)
        // 4. Rotate BACK so the element/text stays upright
        return (
          <div
            key={note.id}
            className="absolute top-1/2 left-1/2"
            style={{
              transform: `translate(-50%, -50%) rotate(${note.angle}deg) translateY(-40cqw) rotate(${-note.angle!}deg)`
            }}
          >
            <NoteButton 
              note={note} 
              isActive={localActiveNote === note.id} 
              isGhost={activeVisualNote?.id === note.id && activeVisualNote?.type === 'ghost'}
              onClick={() => handleNoteClick(note)}
              size="medium"
            />
          </div>
        );
      })}
    </div>
  );
};

interface NoteButtonProps {
  note: Note;
  isActive: boolean;
  isGhost?: boolean;
  onClick: () => void;
  size: 'large' | 'medium';
}

const NoteButton: React.FC<NoteButtonProps> = ({ note, isActive, isGhost, onClick, size }) => {
  const sizeClasses = size === 'large' 
    ? 'w-24 h-24 md:w-36 md:h-36' 
    : 'w-14 h-14 md:w-20 md:h-20';

  // Visual state logic
  let scale = 1;
  let boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
  let bg = "rgb(30, 41, 59)"; // slate-800

  if (isActive) {
    scale = 0.95;
    if (isGhost) {
       // Ghost visual: Subtle flash
       boxShadow = "0 0 15px rgba(94, 234, 212, 0.2)";
       bg = "rgb(40, 50, 70)";
    } else {
       // Accent visual: Strong flash
       boxShadow = "0 0 30px rgba(94, 234, 212, 0.5)";
       bg = "rgb(51, 65, 85)";
    }
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={{ 
        scale,
        boxShadow,
        backgroundColor: bg
      }}
      transition={{ duration: 0.1 }}
      onClick={onClick}
      className={`
        ${sizeClasses}
        rounded-full
        flex items-center justify-center
        border border-slate-600/50
        text-slate-400 font-mono text-xs md:text-sm font-medium
        select-none
        outline-none
        relative
        overflow-hidden
        z-20
      `}
      aria-label={`Play note ${note.label}`}
    >
      {/* Inner dimple effect */}
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-700/20 to-slate-900/50 pointer-events-none" />
      
      <span className="relative z-10 pointer-events-none">{note.label}</span>
    </motion.button>
  );
};

