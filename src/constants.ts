import { Note } from './types';

export const HANDPAN_NOTES: Note[] = [
  { id: 'ding', label: 'D3', frequency: 146.83, angle: 0 }, // Center
  // Radial notes clockwise starting from 12 o'clock (-90 degrees)
  // 9 notes: 360 / 9 = 40 degrees spacing
  { id: 'd5', label: 'D5', frequency: 587.33, angle: -90 },
  { id: 'a4', label: 'A4', frequency: 440.00, angle: -50 },
  { id: 'f4', label: 'F4', frequency: 349.23, angle: -10 },
  { id: 'd4', label: 'D4', frequency: 293.66, angle: 30 },
  { id: 'a3', label: 'A3', frequency: 220.00, angle: 70 },
  { id: 'c4', label: 'C4', frequency: 261.63, angle: 110 },
  { id: 'e4', label: 'E4', frequency: 329.63, angle: 150 },
  { id: 'g4', label: 'G4', frequency: 392.00, angle: 190 },
  { id: 'c5', label: 'C5', frequency: 523.25, angle: 230 },
];
