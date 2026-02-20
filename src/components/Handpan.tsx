import React, { useState, useEffect } from 'react';
import { HANDPAN_NOTES } from '../constants';
import { Note } from '../types';
import { audioEngine } from '../services/audioEngine';
import { useToast } from '../context/ToastContext';
import { motion } from 'motion/react';

interface HandpanProps {
  isAudioUnlocked: boolean;
  activeVisualNote?: { id: string; type: string; tick: number } | null;
  currentStep?: number;
  focusedBar?: number | null;
  onBarClick?: (barIndex: number) => void;
}

export const Handpan: React.FC<HandpanProps> = ({ 
  isAudioUnlocked, 
  activeVisualNote, 
  currentStep = 0, 
  focusedBar = null, 
  onBarClick 
}) => {
  const { addToast } = useToast();
  const [localActiveNote, setLocalActiveNote] = useState<string | null>(null);
  const [isMembraneFlashing, setIsMembraneFlashing] = useState(false);
  const [slapSide, setSlapSide] = useState<'left' | 'right'>('left');

  // Handle external visual triggers (from sequencer)
  useEffect(() => {
    if (activeVisualNote) {
      if (activeVisualNote.type === 'slap') {
         // Slap visual: Flash the Membrane
         setSlapSide(prev => prev === 'left' ? 'right' : 'left');
         setIsMembraneFlashing(true);
         const timer = setTimeout(() => setIsMembraneFlashing(false), 80);
         return () => clearTimeout(timer);
      } else {
         setLocalActiveNote(activeVisualNote.id);
         const timer = setTimeout(() => setLocalActiveNote(null), 150);
         return () => clearTimeout(timer);
      }
    }
  }, [activeVisualNote]); 

  const handleNoteClick = (note: Note) => {
    if (!isAudioUnlocked) {
      addToast('Tap "Ignite" to unlock audio first!', 'error');
      return;
    }

    try {
      audioEngine.playTone(note.frequency, 'sine', 2.0, 0.9);
      setLocalActiveNote(note.id);
      setTimeout(() => setLocalActiveNote(null), 200);
    } catch (err) {
      addToast('Failed to play note', 'error');
      console.error(err);
    }
  };

  const ding = HANDPAN_NOTES.find(n => n.id === 'ding');
  const radialNotes = HANDPAN_NOTES.filter(n => n.id !== 'ding');

  // Align D5 to 12 o'clock
  const angleStep = 360 / radialNotes.length;
  const d5Index = radialNotes.findIndex(n => n.label === 'D5');
  const angleOffset = d5Index !== -1 ? 360 - (d5Index * angleStep) : 0;
  const currentBar = Math.floor(currentStep / 16);

  return (
    <div className="relative aspect-square w-full max-w-[min(100%,_70vh)] rounded-full mx-auto" style={{ containerType: 'inline-size' }}>
      
      {/* Progress Arcs */}
      <div className="absolute inset-[-6%] pointer-events-none">
        <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
          {[0, 1, 2, 3].map((barIndex) => {
            const isActive = currentBar === barIndex;
            const isFocused = focusedBar === barIndex;
            const isDimmed = focusedBar !== null && !isFocused;
            
            const radius = 48;
            const circumference = 2 * Math.PI * radius;
            const gap = 4;
            const dashLength = (circumference / 4) - gap;
            const offset = - (barIndex * (circumference / 4));

            return (
              <circle
                key={barIndex}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={isActive || isFocused ? "#34d399" : "#334155"}
                strokeWidth="1"
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={`transition-all duration-300 pointer-events-auto cursor-pointer
                  ${isActive ? 'opacity-100 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'opacity-30'}
                  ${isFocused ? 'opacity-100 stroke-[2px] drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]' : ''}
                  ${isDimmed ? 'opacity-10' : ''}
                  hover:opacity-80 hover:stroke-emerald-400
                `}
                onClick={() => onBarClick && onBarClick(barIndex)}
              />
            );
          })}
        </svg>
      </div>

      {/* Main Body - Centered Soft Glow */}
      <div 
        className="absolute inset-0 rounded-full overflow-hidden transition-all duration-100 border border-white/5"
        style={{
           // Centered radial gradient creates a gorgeous backlight for the transparent notes
           background: 'radial-gradient(circle at 50% 50%, #252c3d 0%, #111520 45%, #05070a 90%)',
           boxShadow: '0 30px 60px -10px rgba(0,0,0,0.9), inset 0 0 100px rgba(0,0,0,0.8)'
        }}
      />

      {/* The True Membrane (Shoulder) - Precision fitted at inset-[25%] */}
      <div className="absolute inset-[25%] rounded-full overflow-hidden pointer-events-none z-0">
         <div className={`absolute left-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(circle_at_right_center,_rgba(255,255,255,0.15)_0%,_transparent_75%)] transition-opacity duration-75 ${isMembraneFlashing && slapSide === 'left' ? 'opacity-100' : 'opacity-0'}`} />
         <div className={`absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(circle_at_left_center,_rgba(255,255,255,0.15)_0%,_transparent_75%)] transition-opacity duration-75 ${isMembraneFlashing && slapSide === 'right' ? 'opacity-100' : 'opacity-0'}`} />
      </div>
      
      {/* Single Subtle Boundary Ring for the Membrane */}
      <div className="absolute inset-[25%] rounded-full border border-white/5 pointer-events-none" />

      {/* Center Ding */}
      {ding && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[24%] h-[24%]">
          <NoteButton 
            note={ding} 
            isActive={localActiveNote === ding.id} 
            isGhost={activeVisualNote?.id === ding.id && activeVisualNote?.type === 'ghost'}
            onClick={() => handleNoteClick(ding)}
            isDing
          />
        </div>
      )}

      {/* Radial Notes - Glassmorphism Style */}
      {radialNotes.map((note, index) => {
        const finalAngle = (index * angleStep) + angleOffset;
        return (
          <div
            key={note.id}
            className="absolute top-1/2 left-1/2 w-[22%] h-[22%]"
            style={{ transform: `translate(-50%, -50%) rotate(${finalAngle}deg) translateY(-165%) rotate(${-finalAngle}deg)` }}
          >
            <NoteButton 
              note={note} 
              isActive={localActiveNote === note.id} 
              isGhost={activeVisualNote?.id === note.id && activeVisualNote?.type === 'ghost'}
              onClick={() => handleNoteClick(note)}
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
  isDing?: boolean;
}

const NoteButton: React.FC<NoteButtonProps> = ({ note, isActive, isGhost, onClick, isDing }) => {
  // GLASSMORPHISM LOGIC
  let scale = 1;
  
  // Base State
  let bg = isDing ? "linear-gradient(145deg, #242a38, #161b24)" : "transparent";
  let border = isDing ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(255,255,255,0.08)";
  let boxShadow = isDing ? "inset 0 1px 2px rgba(255,255,255,0.05), 0 4px 10px rgba(0,0,0,0.3)" : "none";

  if (isActive) {
    scale = 0.96;
    if (isGhost) {
       // Ghost: Emerald border glow, transparent body
       bg = isDing ? "linear-gradient(145deg, #242a38, #161b24)" : "transparent";
       boxShadow = "0 0 15px rgba(52, 211, 153, 0.15), inset 0 0 10px rgba(52, 211, 153, 0.1)";
       border = "1px solid rgba(52, 211, 153, 0.4)";
    } else {
       // Accent: High contrast solid emerald
       bg = "#34d399"; 
       boxShadow = "0 0 30px rgba(52, 211, 153, 0.5)";
       border = "1px solid #34d399";
    }
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{ 
        background: bg,
        boxShadow: boxShadow,
        border: border
      }}
      className={`
        w-full h-full
        rounded-full
        flex items-center justify-center
        text-slate-400 font-sans font-light tracking-widest
        select-none
        outline-none
        relative
        overflow-hidden
        z-20
        group
        transition-all duration-75
        text-[clamp(10px,2.5cqw,20px)]
      `}
      aria-label={`Play note ${note.label}`}
    >
      {/* Dome effect ONLY for the Ding */}
      {isDing && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/5 to-transparent pointer-events-none opacity-30" />
      )}
      
      {/* Soft Active Flash */}
      <motion.div 
        className="absolute inset-0 bg-emerald-400/20 mix-blend-overlay pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isActive ? (isGhost ? 0.3 : 1) : 0 }}
        transition={{ duration: 0.05 }}
      />

      {/* Text Label - Inverts on Accent */}
      <span className={`relative z-10 transition-colors duration-100 ${isActive && !isGhost ? 'text-slate-950 font-semibold' : 'text-slate-400 group-hover:text-slate-200'}`}>
        {note.label}
      </span>
    </motion.button>
  );
};