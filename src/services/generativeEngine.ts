import { Step } from '../types';
import { HANDPAN_NOTES } from '../constants';

// ==========================================
// 1. TYPES & CONSTANTS
// ==========================================

export type PhraseStructure = ('A' | 'B' | 'C' | 'D')[];
export type StepType = 'empty' | 'accent' | 'ghost' | 'slap';
export type ModifierType = 'harmonic' | 'choke' | 'none';

// Расширяем локальный интерфейс (в types.ts нужно будет тоже добавить microOffset?: number)
export interface EngineStep extends Step {
  microOffset?: number; // Смещение от -0.5 до 0.5 (в долях 16-й ноты)
}

export interface GeneratorConfig {
  styles: string[];
  phraseStructure: PhraseStructure;
  densityBase: number;
}

export const CONFIG = {
  STEPS_PER_BAR: 16,
  MIN_DENSITY: 1,
  MAX_DENSITY: 5,
};

// ==========================================
// 2. UTILITIES & SERVICES
// ==========================================

export const Random = {
  chance: (probability: number): boolean => Math.random() <= probability,
  int: (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min,
  pick: <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)],
  float: (min: number, max: number): number => Math.random() * (max - min) + min,
};

/**
 * Music Math Service - Для вычисления настоящих музыкальных интервалов
 */
export const MusicMath = {
  // Конвертация 'D4' -> MIDI Number (D4 = 62)
  noteToMidi: (noteId: string): number => {
    if (noteId.toLowerCase() === 'ding') return 50; // Базовый D3 для D-Kurd
    const notes: Record<string, number> = { 'c': 0, 'c#': 1, 'd': 2, 'd#': 3, 'e': 4, 'f': 5, 'f#': 6, 'g': 7, 'g#': 8, 'a': 9, 'a#': 10, 'b': 11 };
    const match = noteId.match(/([a-gA-G]#?)(\d)/);
    if (!match) return 60; // Fallback
    const [, n, oct] = match;
    return notes[n.toLowerCase()] + (parseInt(oct) + 1) * 12;
  },
  // Поиск ноты по точному сдвигу в полутонах
  findNoteByInterval: (rootId: string, semitones: number): string | null => {
    const rootMidi = MusicMath.noteToMidi(rootId);
    const targetMidi = rootMidi + semitones;
    const radials = NoteSelector.getRadialNotes();
    const found = radials.find(n => MusicMath.noteToMidi(n.id) === targetMidi);
    return found ? found.id : null;
  }
};

export const NoteSelector = {
  getRadialNotes: () => HANDPAN_NOTES.filter(n => n.id !== 'ding'),
  
  getRandomRadial: (): string => Random.pick(NoteSelector.getRadialNotes()).id,

  // Умный поиск: избегаем малых секунд (1 полутон)
  getSmartRadial: (prevNoteId: string | null): string => {
    const radials = NoteSelector.getRadialNotes();
    if (!prevNoteId || prevNoteId === 'ding') return Random.pick(radials).id;
    
    const prevMidi = MusicMath.noteToMidi(prevNoteId);
    // Исключаем ноты, которые образуют диссонанс в 1 полутон (малая секунда)
    const consonantNotes = radials.filter(n => Math.abs(MusicMath.noteToMidi(n.id) - prevMidi) !== 1);
    return consonantNotes.length > 0 ? Random.pick(consonantNotes).id : Random.pick(radials).id;
  },

  // Идеальные прыжки: Квинта (+7) или Октава (+12)
  getJumpPair: (): [string, string] => {
    const radials = NoteSelector.getRadialNotes();
    const root = Random.pick(radials).id;
    // Ищем квинту (+7) или октаву (+12), если нет - кварту (+5)
    const target = MusicMath.findNoteByInterval(root, 7) 
                || MusicMath.findNoteByInterval(root, 12) 
                || MusicMath.findNoteByInterval(root, 5) 
                || Random.pick(radials).id; // Fallback
    return [root, target];
  }
};

export const BarUtils = {
  createEmpty: (size: number = CONFIG.STEPS_PER_BAR): EngineStep[] => 
    Array(size).fill(null).map(() => ({ noteId: null, type: 'empty', microOffset: 0 })),

  setStep: (bar: EngineStep[], idx: number, type: StepType, noteId: string | null = null, modifier: ModifierType = 'none', microOffset: number = 0) => {
    if (idx >= 0 && idx < bar.length) bar[idx] = { type, noteId, modifier, microOffset };
  },

  setAccent: (bar: EngineStep[], idx: number, noteId: string, offset = 0) => BarUtils.setStep(bar, idx, 'accent', noteId, 'none', offset),
  setGhost: (bar: EngineStep[], idx: number, noteId: string | null, modifier: ModifierType = 'none', offset = 0) => BarUtils.setStep(bar, idx, 'ghost', noteId, modifier, offset),
  setSlap: (bar: EngineStep[], idx: number, offset = 0) => BarUtils.setStep(bar, idx, 'slap', null, 'none', offset)
};

// ==========================================
// 3. STRATEGY PATTERN (STYLE REGISTRY)
// ==========================================

export interface IStyleStrategy {
  id: string;
  name: string;
  category: 'artist' | 'educational';
  probabilities: { harmonicOnAccent: number; chokeOnGhost: number; };
  generate: (density: number) => EngineStep[];
  mutate: (bar: EngineStep[], density: number) => EngineStep[];
}

abstract class BaseStyle implements IStyleStrategy {
  abstract id: string;
  abstract name: string;
  abstract category: 'artist' | 'educational';
  probabilities = { harmonicOnAccent: 0.1, chokeOnGhost: 0.15 };

  abstract generate(density: number): EngineStep[];

  protected getModifier(type: 'accent' | 'ghost'): ModifierType {
    if (type === 'accent' && Random.chance(this.probabilities.harmonicOnAccent)) return 'harmonic';
    if (type === 'ghost' && Random.chance(this.probabilities.chokeOnGhost)) return 'choke';
    return 'none';
  }

  mutate(bar: EngineStep[], density: number): EngineStep[] {
    const newBar = [...bar];
    const mutationsCount = Random.int(1, 2);
    
    for (let i = 0; i < mutationsCount; i++) {
      const stepIdx = Random.int(1, CONFIG.STEPS_PER_BAR - 1); 
      const current = newBar[stepIdx];
      const prevNote = newBar[stepIdx - 1]?.noteId || null;

      if (current.type === 'empty' && density >= 3) {
        BarUtils.setGhost(newBar, stepIdx, NoteSelector.getSmartRadial(prevNote), this.getModifier('ghost'));
      } else if (current.type === 'ghost') {
        Random.chance(0.5) 
          ? BarUtils.setStep(newBar, stepIdx, 'empty')
          : BarUtils.setStep(newBar, stepIdx, 'accent', current.noteId || NoteSelector.getSmartRadial(null), this.getModifier('accent'));
      } else if (current.type === 'accent') {
        BarUtils.setGhost(newBar, stepIdx, current.noteId, this.getModifier('ghost'));
      }
    }
    return newBar;
  }
}

// --- ARTIST STRATEGIES ---

class StandardStyle extends BaseStyle {
  id = 'standard'; name = 'Standard Flow'; category = 'artist' as const;
  generate(density: number) {
    const bar = BarUtils.createEmpty();
    BarUtils.setAccent(bar, 0, 'ding');
    if (density >= 1) BarUtils.setAccent(bar, 8, NoteSelector.getSmartRadial('ding'));
    if (density >= 2) { BarUtils.setSlap(bar, 4); BarUtils.setSlap(bar, 12); }
    if (density >= 3) {
      [2, 6, 10, 14].forEach(i => {
        if (Random.chance(0.5)) BarUtils.setGhost(bar, i, NoteSelector.getSmartRadial(null), this.getModifier('ghost'));
      });
    }
    return bar;
  }
}

class HangMassiveStyle extends BaseStyle {
  id = 'hang_massive'; name = 'Hang Massive (Trance)'; category = 'artist' as const;
  generate(density: number) {
    const bar = BarUtils.createEmpty();
    BarUtils.setAccent(bar, 0, 'ding'); BarUtils.setAccent(bar, 8, 'ding');
    if (density >= 2) { BarUtils.setAccent(bar, 4, NoteSelector.getSmartRadial('ding')); BarUtils.setAccent(bar, 12, NoteSelector.getSmartRadial('ding')); }
    if (density >= 3) { [2, 6, 10, 14].forEach(i => BarUtils.setGhost(bar, i, NoteSelector.getSmartRadial(null))); }
    return bar;
  }
}

class MalteStyle extends BaseStyle {
  id = 'malte'; name = 'Malte Marten (Tresillo)'; category = 'artist' as const;
  generate(density: number) {
    const bar = BarUtils.createEmpty();
    const anchor2 = NoteSelector.getSmartRadial('ding');
    BarUtils.setAccent(bar, 0, 'ding');
    BarUtils.setAccent(bar, 3, anchor2);
    BarUtils.setAccent(bar, 6, NoteSelector.getSmartRadial(anchor2));
    if (density >= 2) BarUtils.setSlap(bar, 12);
    if (density >= 3) { [2, 5, 8, 10, 14].forEach(i => BarUtils.setGhost(bar, i, NoteSelector.getSmartRadial(null))); }
    return bar;
  }
}

class KabecaoStyle extends BaseStyle {
  id = 'kabecao'; name = 'Kabeção (Ping-Pong Ghosts)'; category = 'artist' as const;
  generate(density: number) {
    const bar = BarUtils.createEmpty();
    BarUtils.setAccent(bar, 0, 'ding');
    BarUtils.setAccent(bar, 7, NoteSelector.getSmartRadial('ding'));
    BarUtils.setSlap(bar, 4); BarUtils.setSlap(bar, 12);
    if (density >= 3) {
      for (let i = 0; i < CONFIG.STEPS_PER_BAR; i++) {
        if (bar[i].type === 'empty' && Random.chance(0.8)) {
          BarUtils.setGhost(bar, i, NoteSelector.getSmartRadial(null), this.getModifier('ghost'));
        }
      }
    }
    return bar;
  }
}

class WaplesStyle extends BaseStyle {
  id = 'waples'; name = 'Daniel Waples (100% Density)'; category = 'artist' as const;
  generate(density: number) {
    const bar = new StandardStyle().generate(density);
    if (density >= 2) {
      let prev = 'ding';
      bar.forEach((step, i) => {
        if (step.type === 'empty') {
          const id = NoteSelector.getSmartRadial(prev);
          BarUtils.setGhost(bar, i, id, this.getModifier('ghost'));
          prev = id;
        }
      });
    }
    return bar;
  }
}

class YukiStyle extends BaseStyle {
  id = 'yuki'; name = 'Yuki Koshimoto (Sparsity)'; category = 'artist' as const;
  probabilities = { harmonicOnAccent: 0.6, chokeOnGhost: 0.0 };
  generate(density: number) {
    const bar = BarUtils.createEmpty();
    BarUtils.setAccent(bar, 0, 'ding');
    BarUtils.setStep(bar, 6, 'accent', NoteSelector.getSmartRadial('ding'), this.getModifier('accent'));
    if (density >= 3) BarUtils.setAccent(bar, 14, NoteSelector.getSmartRadial('ding'));
    return bar;
  }
  mutate(bar: EngineStep[], density: number): EngineStep[] {
    const newBar = [...bar];
    const stepIdx = Random.int(1, CONFIG.STEPS_PER_BAR - 1);
    if (newBar[stepIdx].type === 'accent') newBar[stepIdx].modifier = 'harmonic';
    return newBar;
  }
}

class ManuStyle extends BaseStyle {
  id = 'manu'; name = 'Manu Delago (Odd Groupings)'; category = 'artist' as const;
  generate(density: number) {
    const bar = BarUtils.createEmpty();
    BarUtils.setAccent(bar, 0, 'ding');
    BarUtils.setAccent(bar, 7, NoteSelector.getSmartRadial('ding'));
    BarUtils.setSlap(bar, 14);
    if (density >= 3) { [2, 4, 9, 11].forEach(i => BarUtils.setGhost(bar, i, NoteSelector.getSmartRadial(null))); }
    return bar;
  }
}

class KuckhermannStyle extends BaseStyle {
  id = 'kuckhermann'; name = 'David Kuckhermann (Rolls)'; category = 'artist' as const;
  generate(density: number) {
    const bar = new StandardStyle().generate(density);
    if (density >= 4) {
      [13, 14, 15].forEach(i => {
        i === 15 ? BarUtils.setAccent(bar, i, NoteSelector.getSmartRadial(null)) : BarUtils.setGhost(bar, i, NoteSelector.getSmartRadial(null));
      });
    }
    return bar;
  }
}

class NadishanaStyle extends BaseStyle {
  id = 'nadishana'; name = 'Nadishana (Choke Heavy)'; category = 'artist' as const;
  probabilities = { harmonicOnAccent: 0.1, chokeOnGhost: 0.8 };
  generate(density: number) {
    const bar = new StandardStyle().generate(density);
    bar.forEach((step, i) => {
      if (step.type === 'ghost') bar[i].modifier = this.getModifier('ghost');
    });
    return bar;
  }
}

// --- EDUCATIONAL STRATEGIES ---

class ParadiddleStyle extends BaseStyle {
  id = 'edu_paradiddle'; name = '[EDU] Paradiddle Flow'; category = 'educational' as const;
  generate(density: number) {
    const bar = BarUtils.createEmpty();
    const pattern: StepType[] = ['accent', 'ghost', 'accent', 'accent', 'ghost', 'accent', 'ghost', 'ghost'];
    for (let i = 0; i < CONFIG.STEPS_PER_BAR; i++) {
      const pType = pattern[i % 8];
      if (density < 3 && pType === 'ghost') continue; 
      if (density < 2 && i % 4 !== 0) continue;
      
      if (pType === 'accent') BarUtils.setAccent(bar, i, i === 0 || i === 8 ? 'ding' : NoteSelector.getSmartRadial(null));
      else BarUtils.setGhost(bar, i, NoteSelector.getSmartRadial(null));
    }
    return bar;
  }
}

class GamelanStyle extends BaseStyle {
  id = 'edu_gamelan'; name = '[EDU] Gamelan Interlock'; category = 'educational' as const;
  generate(density: number) {
    const bar = BarUtils.createEmpty();
    [0, 4, 8, 12].forEach(i => BarUtils.setAccent(bar, i, 'ding'));
    if (density >= 2) {
      [2, 3, 6, 9, 14].forEach(i => BarUtils.setAccent(bar, i, NoteSelector.getSmartRadial('ding')));
    }
    return bar;
  }
}

class CascadeStyle extends BaseStyle {
  id = 'edu_cascade'; name = '[EDU] Cascade Arpeggios'; category = 'educational' as const;
  generate(density: number) {
    const bar = BarUtils.createEmpty();
    const radials = NoteSelector.getRadialNotes();
    const isAscending = Random.chance(0.5);
    let noteIdx = isAscending ? 0 : radials.length - 1;

    for (let i = 0; i < CONFIG.STEPS_PER_BAR; i += 2) { 
      if (density < 3 && i % 4 !== 0) continue;
      BarUtils.setAccent(bar, i, radials[noteIdx].id);
      noteIdx = isAscending ? (noteIdx + 1) % radials.length : (noteIdx - 1 + radials.length) % radials.length;
    }
    if (density >= 4) { [3, 7, 11, 15].forEach(i => BarUtils.setGhost(bar, i, NoteSelector.getSmartRadial(null))); }
    return bar;
  }
}

class JumpsStyle extends BaseStyle {
  id = 'edu_jumps'; name = '[EDU] Consonance Jumps'; category = 'educational' as const;
  generate(density: number) {
    const bar = BarUtils.createEmpty();
    const [root, jump] = NoteSelector.getJumpPair();
    
    BarUtils.setAccent(bar, 0, 'ding');
    BarUtils.setAccent(bar, 2, root);
    BarUtils.setAccent(bar, 4, jump); 
    
    if (density >= 2) {
      BarUtils.setAccent(bar, 8, 'ding');
      BarUtils.setAccent(bar, 10, jump);
      BarUtils.setAccent(bar, 12, root); 
    }
    return bar;
  }
}

class LiquidDnBStyle extends BaseStyle {
  id = 'edu_dnb'; name = '[EDU] Liquid DnB (Lazy Snares)'; category = 'educational' as const;
  generate(density: number) {
    const bar = BarUtils.createEmpty();
    BarUtils.setAccent(bar, 0, 'ding'); BarUtils.setAccent(bar, 10, 'ding');
    // Lazy snares! Смещение +0.15 (слэп бьет чуть позже сетки, создавая кач)
    BarUtils.setSlap(bar, 4, 0.15); BarUtils.setSlap(bar, 12, 0.15);
    if (density >= 3) {
      [2, 6, 8, 14, 15].forEach(i => BarUtils.setGhost(bar, i, NoteSelector.getSmartRadial(null)));
    }
    return bar;
  }
}

class ClaveStyle extends BaseStyle {
  id = 'edu_clave'; name = '[EDU] Afro-Cuban Clave'; category = 'educational' as const;
  generate(density: number) {
    const bar = BarUtils.createEmpty();
    [0, 3, 6, 10, 12].forEach(i => BarUtils.setAccent(bar, i, NoteSelector.getSmartRadial(null)));
    if (density >= 3) {
      bar.forEach((step, i) => {
        if (step.type === 'empty' && Random.chance(0.5)) BarUtils.setGhost(bar, i, null);
      });
    }
    return bar;
  }
}

class BossaStyle extends BaseStyle {
  id = 'edu_bossa'; name = '[EDU] Bossa Nova Pulse (Shuffle)'; category = 'educational' as const;
  generate(density: number) {
    const bar = BarUtils.createEmpty();
    [0, 4, 8, 12].forEach(i => BarUtils.setAccent(bar, i, 'ding'));
    // Bossa chords with slight shuffle (+0.05 on weak beats)
    [0, 3, 7, 10, 14].forEach(i => {
      const offset = (i % 2 !== 0) ? 0.05 : 0; 
      BarUtils.setAccent(bar, i, NoteSelector.getSmartRadial('ding'), offset);
    });
    return bar;
  }
}

class MaqamStyle extends BaseStyle {
  id = 'edu_maqam'; name = '[EDU] Doumbek Articulation'; category = 'educational' as const;
  generate(density: number) {
    const bar = BarUtils.createEmpty();
    BarUtils.setAccent(bar, 0, 'ding');
    BarUtils.setAccent(bar, 2, NoteSelector.getSmartRadial(null));
    BarUtils.setAccent(bar, 6, NoteSelector.getSmartRadial(null));
    BarUtils.setAccent(bar, 8, 'ding');
    BarUtils.setAccent(bar, 10, NoteSelector.getSmartRadial(null));
    
    if (density >= 3) { [4, 12, 14].forEach(i => BarUtils.setSlap(bar, i)); }
    return bar;
  }
}

// ==========================================
// 4. REGISTRY INITIALIZATION & EXPORTS
// ==========================================

const REGISTRY = new Map<string, IStyleStrategy>();
[
  new StandardStyle(), new HangMassiveStyle(), new MalteStyle(), new KabecaoStyle(), 
  new WaplesStyle(), new YukiStyle(), new ManuStyle(), new KuckhermannStyle(), new NadishanaStyle(),
  new ParadiddleStyle(), new GamelanStyle(), new CascadeStyle(), new JumpsStyle(), 
  new LiquidDnBStyle(), new ClaveStyle(), new BossaStyle(), new MaqamStyle()
].forEach(strategy => REGISTRY.set(strategy.id, strategy));

export const GENERATOR_STYLES = Array.from(REGISTRY.values()).map(s => ({
  id: s.id,
  name: s.name
}));

// ==========================================
// 5. MAIN ENGINE ENTRY POINT
// ==========================================

export const generateSequence = (config: GeneratorConfig): EngineStep[] => {
  const density = Math.max(CONFIG.MIN_DENSITY, Math.min(CONFIG.MAX_DENSITY, config.densityBase || 3));
  if (!config.phraseStructure || config.phraseStructure.length === 0) {
    throw new Error('phraseStructure cannot be empty');
  }
  const validStyles = config.styles?.length > 0 ? config.styles : ['standard'];

  const barMemory: Record<string, EngineStep[]> = {};
  let fullSequence: EngineStep[] = [];

  config.phraseStructure.forEach((letter) => {
    const selectedStyleId = Random.pick(validStyles);
    const strategy = REGISTRY.get(selectedStyleId) || REGISTRY.get('standard')!;

    if (!barMemory[letter]) {
      barMemory[letter] = strategy.generate(density);
      fullSequence = [...fullSequence, ...barMemory[letter]];
    } else {
      const mutated = strategy.mutate(barMemory[letter], density);
      fullSequence = [...fullSequence, ...mutated];
    }
  });

  return fullSequence;
};