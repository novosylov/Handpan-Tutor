import { audioEngine } from './audioEngine';
import { Step, DensityLevel, TempoMode } from '../types';
import { HANDPAN_NOTES } from '../constants';

export class Sequencer {
  private isPlaying: boolean = false;
  private baseBPM: number = 100;
  private currentBPM: number = 100;
  private tempoMode: TempoMode = 'static';
  private loopCount: number = 0;
  
  private lookahead: number = 25.0; // ms
  private scheduleAheadTime: number = 0.1; // s
  private nextNoteTime: number = 0.0;
  private current16thNote: number = 0;
  private timerID: number | null = null;
  private sequence: Step[] = [];
  private density: DensityLevel = 3;
  
  private onStepCallback: ((stepIndex: number, noteId: string | null, type: string, modifier?: string) => void) | null = null;
  private onBPMChangeCallback: ((bpm: number) => void) | null = null;
  private onMetronomeCallback: ((beatNumber: number) => void) | null = null;

  private focusedBar: number | null = null; // 0-3 (Bar 1-4)

  constructor() {
    // Bind methods
    this.scheduler = this.scheduler.bind(this);
  }

  public setSequence(seq: Step[]) {
    this.sequence = seq;
  }

  public getSequence() {
    return this.sequence;
  }

  public setDensity(d: DensityLevel) {
    this.density = d;
  }

  public setFocusedBar(barIndex: number | null) {
    this.focusedBar = barIndex;
    
    if (barIndex !== null) {
       const currentBeatInBar = this.current16thNote % 16;
       this.current16thNote = (barIndex * 16) + currentBeatInBar;
    }
  }

  public setBaseBPM(bpm: number) {
    this.baseBPM = bpm;
    if (this.tempoMode === 'static') {
      this.currentBPM = bpm;
      if (this.onBPMChangeCallback) this.onBPMChangeCallback(this.currentBPM);
    }
  }

  public setTempoMode(mode: TempoMode) {
    this.tempoMode = mode;
    this.loopCount = 0;
    this.updateBPM();
  }

  public setOnStep(cb: (stepIndex: number, noteId: string | null, type: string, modifier?: string) => void) {
    this.onStepCallback = cb;
  }

  public setOnBPMChange(cb: (bpm: number) => void) {
    this.onBPMChangeCallback = cb;
  }

  public setOnMetronome(cb: (beatNumber: number) => void) {
    this.onMetronomeCallback = cb;
  }

  public start() {
    if (this.isPlaying) return;
    if (audioEngine.getContextState() !== 'running') {
      console.warn('AudioContext is not running');
      return;
    }

    this.isPlaying = true;
    this.current16thNote = 0;
    this.loopCount = 0;
    this.updateBPM();
    this.nextNoteTime = audioEngine.currentTime + 0.05; // Start slightly in future
    this.scheduler();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerID !== null) {
      window.clearTimeout(this.timerID);
      this.timerID = null;
    }
  }

  public toggle() {
    if (this.isPlaying) this.stop();
    else this.start();
  }

  public get isRunning() {
    return this.isPlaying;
  }

  private updateBPM() {
    let newBPM = this.baseBPM;

    switch (this.tempoMode) {
      case 'static':
        newBPM = this.baseBPM;
        break;
      case 'organic':
        // Fluctuate +/- 5% based on sine wave of loop count
        // Use a slow oscillation
        newBPM = this.baseBPM + Math.sin(this.loopCount * 0.5) * (this.baseBPM * 0.05);
        break;
      case 'staircase':
        // Every 4 loops, increase by 5. Cap at +20.
        const cycle = Math.floor(this.loopCount / 4);
        const increase = (cycle * 5) % 25; // 0, 5, 10, 15, 20, 0...
        newBPM = this.baseBPM + increase;
        break;
    }

    this.currentBPM = newBPM;
    if (this.onBPMChangeCallback) {
      this.onBPMChangeCallback(this.currentBPM);
    }
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.currentBPM;
    const secondsPer16th = secondsPerBeat / 4; // 16th notes
    this.nextNoteTime += secondsPer16th;
    
    this.current16thNote++;

    // Focused Bar Logic
    if (this.focusedBar !== null) {
       const startStep = this.focusedBar * 16;
       const endStep = startStep + 16;
       
       if (this.current16thNote >= endStep) {
          this.current16thNote = startStep;
       }
    } else {
       // Full 64-step loop
       if (this.current16thNote === 64) {
         this.current16thNote = 0;
         this.loopCount++;
         this.updateBPM();
       }
    }
  }

  private scheduleNote(beatNumber: number, time: number) {
    // Metronome Logic (Visual only, syncs with audio time)
    if (beatNumber % 4 === 0) {
        const timeUntilBeat = (time - audioEngine.currentTime) * 1000;
        setTimeout(() => {
            if (this.isPlaying && this.onMetronomeCallback) {
                this.onMetronomeCallback(beatNumber % 16); // Keep metronome visual 0-15
            }
        }, Math.max(0, timeUntilBeat));
    }

    if (!this.sequence[beatNumber]) return;

    const step = this.sequence[beatNumber];
    
    // Density Logic
    let shouldPlay = false;

    if (step.type === 'empty' || step.type === 'rest') return;

    if (this.density === 1) {
      // Level 1: Absolute Anchors (Accents on Beat 0 and 8 of any bar)
      const barStep = beatNumber % 16;
      if (step.type === 'accent' && (barStep === 0 || barStep === 8)) {
        shouldPlay = true;
      }
    } else if (this.density === 2) {
      // Level 2: All Accents. Mute ghosts and slaps.
      if (step.type === 'accent') {
        shouldPlay = true;
      }
    } else if (this.density === 3) {
      // Level 3: All Accents + Slaps. Mute ghosts.
      if (step.type === 'accent' || step.type === 'slap') {
        shouldPlay = true;
      }
    } else if (this.density === 4) {
      // Level 4: Accents + Slaps + 50% Ghosts
      if (step.type === 'accent' || step.type === 'slap') {
        shouldPlay = true;
      } else if (step.type === 'ghost') {
         // Deterministic 50% (e.g., even steps only) to avoid jitter
         if (beatNumber % 2 === 0) {
            shouldPlay = true;
         }
      }
    } else {
      // Level 5: Full Flow (Everything)
      shouldPlay = true;
    }

    if (shouldPlay) {
      if (step.type === 'slap') {
         // Slap has no noteId usually, or we ignore it
         audioEngine.playTone(0, 'sine', 0.1, 1.2, time); // 1.2 velocity triggers slap
         
         // Visual for slap? Maybe flash center red?
         const timeUntilNote = (time - audioEngine.currentTime) * 1000;
         setTimeout(() => {
             if (this.isPlaying && this.onStepCallback) {
                 this.onStepCallback(beatNumber, 'slap', 'slap', step.modifier);
             }
         }, Math.max(0, timeUntilNote));

      } else if (step.noteId) {
        const note = HANDPAN_NOTES.find(n => n.id === step.noteId);
        if (note) {
          let velocity = step.type === 'accent' ? 0.9 : 0.2;
          let duration = step.type === 'accent' ? 2.0 : 0.2;
          let frequency = note.frequency;

          // Apply Modifiers
          if (step.modifier === 'harmonic') {
            frequency *= 2; // Octave up
            velocity *= 0.8; // Slightly softer
            duration = 3.0; // Longer ring
          } else if (step.modifier === 'choke') {
            duration = 0.05; // Very short
            velocity *= 0.7;
          }
          
          audioEngine.playTone(frequency, 'sine', duration, velocity, time);

          // Visual Sync
          const timeUntilNote = (time - audioEngine.currentTime) * 1000;
          setTimeout(() => {
              if (this.isPlaying && this.onStepCallback) {
                  this.onStepCallback(beatNumber, step.noteId!, step.type, step.modifier);
              }
          }, Math.max(0, timeUntilNote));
        }
      }
    }
  }

  private scheduler() {
    // While there are notes that will need to play before the next interval,
    // schedule them and advance the pointer.
    while (this.nextNoteTime < audioEngine.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.current16thNote, this.nextNoteTime);
      this.nextNote();
    }
    
    if (this.isPlaying) {
      this.timerID = window.setTimeout(this.scheduler, this.lookahead);
    }
  }
}

export const sequencer = new Sequencer();
