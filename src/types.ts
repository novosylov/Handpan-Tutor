export type NoteType = 'accent' | 'ghost' | 'empty';

export interface Note {
  id: string;
  label: string;
  frequency: number;
  angle?: number; // Degrees for radial positioning
}

export interface Step {
  noteId: string | null;
  type: NoteType;
}

export type DensityLevel = 1 | 2 | 3;

export type GrooveType = 'straight' | 'malfuf' | 'halftime';

export type TempoMode = 'static' | 'organic' | 'staircase';

export interface GrooveProject {
  id: string;
  name: string;
  createdAt: string;
  bpm: number;
  matrixVibe: GrooveType;
  sequence: Step[];
}
