import { audioEngine } from './audioEngine';
import { Step, DensityLevel, TempoMode } from '../types';
import { HANDPAN_NOTES } from '../constants';

export const SEQ_CONFIG = {
  STEPS_PER_BAR: 16,
  TOTAL_STEPS: 64,
  START_DELAY_SEC: 0.05,
  LOOKAHEAD_MS: 25.0,
  SCHEDULE_AHEAD_SEC: 0.1,
};

export class Sequencer {
  private audioCtxEngine: typeof audioEngine;
  private isPlaying: boolean = false;
  private baseBPM: number = 100;
  private currentBPM: number = 100;
  private tempoMode: TempoMode = 'static';
  private loopCount: number = 0;
  
  private nextNoteTime: number = 0.0;
  private current16thNote: number = 0;
  
  // Timer Management
  private mainTimerID: number | null = null;
  private uiTimers: Set<number> = new Set();
  
  private sequence: Step[] = [];
  private density: DensityLevel = 3;
  
  private onStepCallback: ((stepIndex: number, noteId: string | null, type: string, modifier?: string) => void) | null = null;
  private onBPMChangeCallback: ((bpm: number) => void) | null = null;
  private onMetronomeCallback: ((beatNumber: number) => void) | null = null;

  private focusedBar: number | null = null; 

  // Dependency Injection allows mocking in tests
  constructor(engine: typeof audioEngine = audioEngine) {
    this.audioCtxEngine = engine;
    this.scheduler = this.scheduler.bind(this);
    
    // Initialize sequence safely
    this.setSequence([]);
  }

  public setSequence(seq: Step[]) {
    // Safety padding: ensure sequence is always strictly TOTAL_STEPS long
    const safeSeq = [...seq];
    while (safeSeq.length < SEQ_CONFIG.TOTAL_STEPS) {
      safeSeq.push({ type: 'empty', noteId: null });
    }
    this.sequence = safeSeq.slice(0, SEQ_CONFIG.TOTAL_STEPS);
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
       const currentBeatInBar = this.current16thNote % SEQ_CONFIG.STEPS_PER_BAR;
       this.current16thNote = (barIndex * SEQ_CONFIG.STEPS_PER_BAR) + currentBeatInBar;
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
    this.current16thNote = 0; // Hard reset on start
    this.resume();
  }

  public resume() {
    if (this.isPlaying) return;
    if (this.audioCtxEngine.getContextState() !== 'running') {
      console.warn('AudioContext is not running. Requires user gesture.');
      // Optional: attempt to resume context here if allowed
    }

    this.isPlaying = true;
    this.loopCount = 0;
    this.updateBPM();
    this.nextNoteTime = this.audioCtxEngine.currentTime + SEQ_CONFIG.START_DELAY_SEC;
    this.scheduler();
  }

  public pause() {
    this.isPlaying = false;
    if (this.mainTimerID !== null) {
      window.clearTimeout(this.mainTimerID);
      this.mainTimerID = null;
    }
    // Clear all pending UI flashes to prevent ghosting
    this.uiTimers.forEach(id => window.clearTimeout(id));
    this.uiTimers.clear();
  }

  public stop() {
    this.pause();
    this.current16thNote = 0;
  }

  public toggle() {
    if (this.isPlaying) this.pause();
    else this.resume(); // Use resume instead of start to not lose place when toggling
  }

  public get isRunning() {
    return this.isPlaying;
  }

private updateBPM() {
    let newBPM = this.baseBPM;

    // В sequencer.ts должно быть так:
    switch (this.tempoMode as any) {
      case 'static':
        // Фундамент. Жесткая привязка к сетке.
        newBPM = this.baseBPM;
        break;

      case 'organic':
        // "Дыхание" (Push & Pull). Идеально для развития чувства грува.
        // Плавная волна на 4 цикла (лупа): База -> +5% -> База -> -5% -> База
        const organicShift = Math.sin((this.loopCount * Math.PI) / 2) * (this.baseBPM * 0.05);
        newBPM = this.baseBPM + organicShift;
        break;

      case 'staircase':
        // "Speed Trainer" (Прогрессивная перегрузка). Идеально для заучивания паттернов.
        // Незаметно ускоряет на +2 BPM каждый цикл. Доходит до +20 BPM и держит плато. 
        // Никаких резких сбросов вниз!
        const staircaseIncrease = Math.min(this.loopCount * 2, 20);
        newBPM = this.baseBPM + staircaseIncrease;
        break;

      case 'pyramid':
        // "Пирамида". Ультимативный контроль выносливости.
        // Разгоняется по +5 BPM (до +20), затем так же плавно замедляется обратно к Базе.
        const cyclePos = this.loopCount % 8;
        const pyramidStep = cyclePos <= 4 ? cyclePos : 8 - cyclePos;
        newBPM = this.baseBPM + (pyramidStep * 5);
        break;
    }

    // Округляем, чтобы цифры в UI не скакали десятыми долями (100.123 -> 100)
    this.currentBPM = Math.round(newBPM);
    
    if (this.onBPMChangeCallback) {
      this.onBPMChangeCallback(this.currentBPM);
    }
  }

  private nextNote() {
    const secondsPer16th = (60.0 / this.currentBPM) / 4;
    this.nextNoteTime += secondsPer16th;
    this.current16thNote++;

    if (this.focusedBar !== null) {
       const startStep = this.focusedBar * SEQ_CONFIG.STEPS_PER_BAR;
       const endStep = startStep + SEQ_CONFIG.STEPS_PER_BAR;
       if (this.current16thNote >= endStep) {
          this.current16thNote = startStep;
       }
    } else {
       if (this.current16thNote >= SEQ_CONFIG.TOTAL_STEPS) {
         this.current16thNote = 0;
         this.loopCount++;
         this.updateBPM();
       }
    }
  }

  // Helper to sync UI perfectly with AudioContext without creating runaway timers
  private scheduleUIUpdate(playTime: number, callback: () => void) {
    const timeUntilEvent = (playTime - this.audioCtxEngine.currentTime) * 1000;
    const timerId = window.setTimeout(() => {
      this.uiTimers.delete(timerId);
      if (this.isPlaying) callback();
    }, Math.max(0, timeUntilEvent));
    this.uiTimers.add(timerId);
  }

  private shouldPlayStep(step: any, beatNumber: number): boolean {
    if (!step || step.type === 'empty' || step.type === 'rest') return false;
    const barStep = beatNumber % SEQ_CONFIG.STEPS_PER_BAR;

    switch (this.density) {
      case 1: return step.type === 'accent' && (barStep === 0 || barStep === 8);
      case 2: return step.type === 'accent';
      case 3: return step.type === 'accent' || step.type === 'slap';
      case 4: return (step.type === 'accent' || step.type === 'slap') || (step.type === 'ghost' && beatNumber % 2 === 0);
      case 5: return true;
      default: return false;
    }
  }

  private scheduleNote(beatNumber: number, time: number) {
    // Rigid metronome click sync
    if (beatNumber % 4 === 0) {
      this.scheduleUIUpdate(time, () => {
        if (this.onMetronomeCallback) this.onMetronomeCallback(beatNumber % SEQ_CONFIG.STEPS_PER_BAR);
      });
    }

    const step = this.sequence[beatNumber] as any;
    if (!this.shouldPlayStep(step, beatNumber)) return;

    // Microtiming offset
    const secondsPer16th = (60.0 / this.currentBPM) / 4;
    const offsetTime = (step.microOffset || 0) * secondsPer16th; 
    const playTime = time + offsetTime;

    if (step.type === 'slap') {
      // Slap fix: No more 0 Hz. Generates a short, percussive click.
      this.audioCtxEngine.playTone(300, 'triangle', 0.05, 0.8, playTime); 
      
      this.scheduleUIUpdate(playTime, () => {
        if (this.onStepCallback) this.onStepCallback(beatNumber, 'slap', 'slap', step.modifier);
      });

    } else if (step.noteId) {
      const note = HANDPAN_NOTES.find(n => n.id === step.noteId);
      if (note) {
        let velocity = step.type === 'accent' ? 0.9 : 0.2;
        let duration = step.type === 'accent' ? 2.0 : 0.2;
        let frequency = note.frequency;

        if (step.modifier === 'harmonic') {
          frequency *= 2; 
          velocity *= 0.8; 
          duration = 3.0; 
        } else if (step.modifier === 'choke') {
          duration = 0.05; 
          velocity *= 0.7;
        }
        
        this.audioCtxEngine.playTone(frequency, 'sine', duration, velocity, playTime);

        this.scheduleUIUpdate(playTime, () => {
          if (this.onStepCallback) this.onStepCallback(beatNumber, step.noteId!, step.type, step.modifier);
        });
      }
    }
  }

  private scheduler() {
    while (this.nextNoteTime < this.audioCtxEngine.currentTime + SEQ_CONFIG.SCHEDULE_AHEAD_SEC) {
      this.scheduleNote(this.current16thNote, this.nextNoteTime);
      this.nextNote();
    }
    
    if (this.isPlaying) {
      this.mainTimerID = window.setTimeout(this.scheduler, SEQ_CONFIG.LOOKAHEAD_MS);
    }
  }
}

// Ensure the export doesn't break external dependencies
export const sequencer = new Sequencer();