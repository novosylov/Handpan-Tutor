import { Step, NoteType } from '../types';
import { HANDPAN_NOTES } from '../constants';

export type PhraseStructure = ('A' | 'B' | 'C' | 'D')[];

export const GENERATOR_STYLES = [
  { id: 'standard', name: 'Standard Flow' },
  { id: 'malte', name: 'Malte Marten' },
  { id: 'kabecao', name: 'Kabecao' }
];

export interface GeneratorConfig {
  styles: string[];
  phraseStructure: PhraseStructure; // e.g., ['A', 'A', 'A', 'B']
  densityBase: number; // 1 to 5
}

// D-Kurd Harmonic Relationships (Approximate for generative logic)
// D3 (Ding) -> D4, A4, D5 (Octaves/Fifths)
// A3 -> E4, A4 (Fifth/Octave)
// Bb3 -> F4, Bb4 (Fifth/Octave) - Note: Bb is not in our specific D-Kurd subset but logic holds
// C4 -> G4, C5
// D4 -> A4, D5
// E4 -> A4 (Fourth), B4 (Fifth - if present)
// F4 -> C5 (Fifth)
// G4 -> D5 (Fifth)
// A4 -> D5 (Fourth), E5 (Fifth - if present)

const CONSONANT_PAIRS: Record<string, string[]> = {
  'ding': ['d4', 'a3', 'a4', 'd5'],
  'd4': ['a3', 'a4', 'd5', 'g4'],
  'a3': ['e4', 'a4', 'd4'],
  'c4': ['g4', 'c5', 'f4'],
  'e4': ['a3', 'a4', 'g4'], // Avoid F4 (minor second)
  'f4': ['c4', 'c5', 'bb3'], // Avoid E4
  'g4': ['c4', 'd4', 'd5'],
  'a4': ['d4', 'e4', 'd5'],
  'c5': ['f4', 'g4'],
  'd5': ['g4', 'a4', 'd4']
};

const DISSONANT_PAIRS: Record<string, string[]> = {
  'e4': ['f4'],
  'f4': ['e4']
};

// Smart Note Selector with Physics & Harmonic Filtering
const getSmartNoteId = (prevNoteId: string | null, type: 'accent' | 'ghost'): string => {
  const radialNotes = HANDPAN_NOTES.filter(n => n.id !== 'ding').map(n => n.id);
  
  // 1. Anti-Collision Rule (Physics)
  // If previous note was E4, avoid F4 (Minor Second Clash)
  const forbiddenNotes = prevNoteId && DISSONANT_PAIRS[prevNoteId] ? DISSONANT_PAIRS[prevNoteId] : [];

  // 2. Consonance Bias (Harmonics)
  // 40% chance to pick a harmonically related note
  if (prevNoteId && Math.random() < 0.4) {
    const consonantOptions = CONSONANT_PAIRS[prevNoteId];
    if (consonantOptions) {
      // Filter out forbidden notes and ensure options exist in our scale
      const validConsonants = consonantOptions.filter(id => radialNotes.includes(id) && !forbiddenNotes.includes(id));
      if (validConsonants.length > 0) {
        return validConsonants[Math.floor(Math.random() * validConsonants.length)];
      }
    }
  }

  // 3. Random Fallback (with filtering)
  const validOptions = radialNotes.filter(id => !forbiddenNotes.includes(id));
  return validOptions[Math.floor(Math.random() * validOptions.length)];
};

// Helper to determine articulation modifier
const getModifier = (type: NoteType): 'harmonic' | 'choke' | 'none' => {
  if (type === 'accent') {
    // 10% chance for Harmonic (Crystal Ping)
    return Math.random() < 0.1 ? 'harmonic' : 'none';
  } else if (type === 'ghost') {
    // 15% chance for Choke (Muted Click)
    return Math.random() < 0.15 ? 'choke' : 'none';
  }
  return 'none';
};

// Generate a single 16-step bar based on style and density
const generateBar = (style: string, density: number): Step[] => {
  // Initialize empty bar
  const bar: Step[] = Array(16).fill(null).map(() => ({ noteId: null, type: 'empty', modifier: 'none' }));
  let lastNoteId: string | null = null;

  // 1. Absolute Anchors (Density 1+)
  // Ding on the 1 (Step 0)
  bar[0] = { noteId: 'ding', type: 'accent', modifier: 'none' };
  lastNoteId = 'ding';
  
  // Anchor on the 3 (Step 8) - usually a strong radial note
  if (density >= 1) {
    const noteId = getSmartNoteId(lastNoteId, 'accent');
    bar[8] = { noteId, type: 'accent', modifier: getModifier('accent') };
    lastNoteId = noteId;
  }

  // 2. Backbeats / Slaps (Density 2+)
  if (density >= 2) {
    // Standard backbeat on 2 and 4 (Steps 4 and 12)
    bar[4] = { noteId: null, type: 'slap', modifier: 'none' };
    bar[12] = { noteId: null, type: 'slap', modifier: 'none' };
  }

  // 3. 8th Note Flow (Density 3+)
  if (density >= 3) {
    // Fill 2, 6, 10, 14 with Ghosts
    [2, 6, 10, 14].forEach(stepIdx => {
      // 50% chance to play a ghost note
      if (Math.random() > 0.3) {
        const noteId = getSmartNoteId(lastNoteId, 'ghost');
        bar[stepIdx] = { noteId, type: 'ghost', modifier: getModifier('ghost') };
        lastNoteId = noteId;
      }
    });
  }

  // 4. 16th Note Syncopation (Density 4+)
  if (density >= 4) {
    // Fill odd steps (1, 3, 5...)
    [1, 3, 5, 7, 9, 11, 13, 15].forEach(stepIdx => {
      if (Math.random() > 0.6) {
        const noteId = getSmartNoteId(lastNoteId, 'ghost');
        bar[stepIdx] = { noteId, type: 'ghost', modifier: getModifier('ghost') };
        lastNoteId = noteId; // Update last note for flow
      }
    });
  }

  // 5. Full Density / Melodic Embellishment (Density 5)
  if (density >= 5) {
    // Upgrade some ghosts to accents
    bar.forEach((step, idx) => {
      if (step.type === 'ghost' && Math.random() > 0.5) {
        bar[idx] = { ...step, type: 'accent', modifier: getModifier('accent') };
      }
    });
  }

  return bar;
};

// Mutate an existing bar to create variation
const mutateBar = (originalBar: Step[]): Step[] => {
  const newBar = [...originalBar]; // Shallow copy of array
  
  // Pick 1-2 random steps to mutate (avoiding step 0 - The One)
  const mutationsCount = Math.floor(Math.random() * 2) + 1;

  for (let i = 0; i < mutationsCount; i++) {
    const stepIdx = Math.floor(Math.random() * 15) + 1; // 1 to 15
    const currentStep = newBar[stepIdx];
    
    // Find previous note for context (simple lookback)
    let prevNoteId = null;
    for (let j = stepIdx - 1; j >= 0; j--) {
      if (newBar[j].noteId) {
        prevNoteId = newBar[j].noteId;
        break;
      }
    }

    if (currentStep.type === 'empty') {
      // Add a ghost note
      const noteId = getSmartNoteId(prevNoteId, 'ghost');
      newBar[stepIdx] = { noteId, type: 'ghost', modifier: getModifier('ghost') };
    } else if (currentStep.type === 'ghost') {
      // Remove or Accent
      if (Math.random() > 0.5) {
        newBar[stepIdx] = { noteId: null, type: 'empty', modifier: 'none' };
      } else {
        newBar[stepIdx] = { ...currentStep, type: 'accent', modifier: getModifier('accent') };
      }
    } else if (currentStep.type === 'accent') {
      // Demote to ghost
      newBar[stepIdx] = { ...currentStep, type: 'ghost', modifier: getModifier('ghost') };
    }
    // Leave slaps alone mostly
  }

  return newBar;
};

export const generateSequence = (config: GeneratorConfig): Step[] => {
  const { styles, phraseStructure, densityBase } = config;
  const barMemory: Record<string, Step[]> = {};
  let fullSequence: Step[] = [];

  phraseStructure.forEach((letter) => {
    // Pick a random style for this bar from the selected styles
    const randomStyle = styles.length > 0 
      ? styles[Math.floor(Math.random() * styles.length)] 
      : 'standard';

    if (!barMemory[letter]) {
      // Generate new bar
      barMemory[letter] = generateBar(randomStyle, densityBase);
      fullSequence = [...fullSequence, ...barMemory[letter]];
    } else {
      // Retrieve and Mutate
      const original = barMemory[letter];
      const mutated = mutateBar(original);
      fullSequence = [...fullSequence, ...mutated];
    }
  });

  return fullSequence;
};
