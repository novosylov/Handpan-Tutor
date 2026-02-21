export type NoteType = 'accent' | 'ghost' | 'slap' | 'rest' | 'empty';

export interface Note {
  id: string;
  label: string;
  frequency: number;
  angle?: number; // Degrees for radial positioning
}

export interface Step {
  noteId: string | null;
  type: StepType;
  modifier?: ModifierType;
  microOffset?: number; // ДОБАВИТЬ ЭТУ СТРОКУ
}

export type DensityLevel = 1 | 2 | 3 | 4 | 5;

export type GrooveType = 'straight' | 'malfuf' | 'halftime';

export type TempoMode = 'static' | 'organic' | 'staircase' | 'pyramid';

export interface GrooveProject {
  id: string;
  name: string;
  createdAt: string;
  bpm: number;
  matrixVibe: GrooveType;
  sequence: Step[]; // Now 64 steps
}
