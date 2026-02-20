import { Step, NoteType, GrooveType, DensityLevel } from '../types';
import { HANDPAN_NOTES } from '../constants';

// Helper to get random radial note (excluding Ding)
const getRandomNoteId = (): string => {
  const radialNotes = HANDPAN_NOTES.filter(n => n.id !== 'ding');
  const randomNote = radialNotes[Math.floor(Math.random() * radialNotes.length)];
  return randomNote.id;
};

// Helper to generate a bar based on density
const generateBar = (density: DensityLevel, grooveType: GrooveType): Step[] => {
  const bar: Step[] = Array(16).fill(null).map(() => ({ noteId: null, type: 'empty' }));

  // Base Skeleton (Density 1+)
  bar[0] = { noteId: 'ding', type: 'accent' };
  
  if (density >= 1) {
    // Basic pulse
    if (grooveType === 'straight') {
      bar[8] = { noteId: getRandomNoteId(), type: 'accent' };
    } else if (grooveType === 'malfuf') {
      bar[3] = { noteId: getRandomNoteId(), type: 'accent' };
      bar[6] = { noteId: getRandomNoteId(), type: 'accent' };
    } else {
      bar[8] = { noteId: getRandomNoteId(), type: 'accent' };
    }
  }

  // Backbeats (Density 2+)
  if (density >= 2) {
    if (grooveType === 'straight') {
      bar[4] = { noteId: null, type: 'slap' };
      bar[12] = { noteId: null, type: 'slap' };
    } else if (grooveType === 'malfuf') {
      bar[10] = { noteId: null, type: 'slap' };
    } else {
      bar[4] = { noteId: null, type: 'slap' };
    }
  }

  // Flow (Density 3+)
  if (density >= 3) {
    const fillSteps = grooveType === 'malfuf' ? [1, 4, 7, 9, 12, 14] : [2, 6, 10, 14];
    fillSteps.forEach(step => {
      if (Math.random() > 0.4) {
        bar[step] = { noteId: getRandomNoteId(), type: 'ghost' };
      }
    });
  }

  // Syncopation (Density 4+)
  if (density >= 4) {
    const syncSteps = [1, 3, 5, 7, 9, 11, 13, 15];
    syncSteps.forEach(step => {
      if (Math.random() > 0.6 && bar[step].type === 'empty') {
        bar[step] = { noteId: getRandomNoteId(), type: 'ghost' };
      }
    });
  }

  // Full Density (Density 5)
  if (density >= 5) {
    bar.forEach((step, idx) => {
      if (step.type === 'ghost' && Math.random() > 0.5) {
        bar[idx] = { ...step, type: 'accent' };
      }
    });
  }

  return bar;
};

export const generateGroove = (grooveType: GrooveType, density: DensityLevel = 3): Step[] => {
  // Generate 4 bars
  const bar1 = generateBar(density, grooveType);
  const bar2 = generateBar(density, grooveType);
  const bar3 = generateBar(density, grooveType);
  const bar4 = generateBar(density, grooveType);

  return [...bar1, ...bar2, ...bar3, ...bar4];
};
