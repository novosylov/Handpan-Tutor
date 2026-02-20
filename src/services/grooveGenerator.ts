import { HANDPAN_NOTES } from '../constants';
import { Step, NoteType, GrooveType } from '../types';

const RADIAL_NOTES = HANDPAN_NOTES.filter(n => n.id !== 'ding');
const DING = HANDPAN_NOTES.find(n => n.id === 'ding')!;

const getRandomRadialId = () => {
  const note = RADIAL_NOTES[Math.floor(Math.random() * RADIAL_NOTES.length)];
  return note.id;
};

const getRandomNoteId = () => {
  const all = [...RADIAL_NOTES, DING];
  const note = all[Math.floor(Math.random() * all.length)];
  return note.id;
};

export const generateGroove = (grooveType: GrooveType = 'straight'): Step[] => {
  const steps: Step[] = Array(16).fill(null).map(() => ({ noteId: null, type: 'empty' }));

  // Define Accent Patterns (Indices)
  let accentIndices: number[] = [];

  switch (grooveType) {
    case 'straight':
      accentIndices = [0, 4, 8, 12];
      break;
    case 'malfuf':
      // 3+3+2 feel: 0, 3, 6, 8, 11, 14
      accentIndices = [0, 3, 6, 8, 11, 14];
      break;
    case 'halftime':
      // Heavy accents on 0 and 8 only
      accentIndices = [0, 8];
      break;
  }

  // Iterate through 16 steps
  for (let i = 0; i < 16; i++) {
    let type: NoteType = 'empty';
    let noteId: string | null = null;

    // Check if this step is a forced accent
    if (accentIndices.includes(i)) {
      type = 'accent';
      // Beat 1 (Step 0) is always Ding
      if (i === 0) {
        noteId = DING.id;
      } else {
        // For halftime, step 8 is also usually Ding or low note
        if (grooveType === 'halftime' && i === 8) {
           noteId = Math.random() > 0.5 ? DING.id : getRandomRadialId();
        } else {
           noteId = getRandomRadialId();
        }
      }
    } 
    // Fillers / Ghosts logic
    else {
      // Different fill probabilities based on groove?
      // Keep it simple: 40-70% chance of ghost depending on position
      // Avoid cluttering the halftime feel too much
      
      let ghostChance = 0.4;
      if (grooveType === 'halftime') ghostChance = 0.2; // Sparse
      if (grooveType === 'malfuf') ghostChance = 0.5; // Busy

      if (Math.random() < ghostChance) {
        type = 'ghost';
        noteId = getRandomNoteId();
      }
    }

    steps[i] = { noteId, type };
  }

  return steps;
};
