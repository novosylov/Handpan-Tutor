# Handpan Rhythm Forge 🎵

> A state-of-the-art interactive digital Handpan (D-Kurd 9) instrument and algorithmic rhythm generation engine built for browser Web Audio. Features acoustic harmonic filtering, microtiming groove humanization, multi-style generative strategies, dynamic phrase building, and a circular Mandala visual sequencer.

---

## 📑 Table of Contents
1. [Project Overview](#project-overview)
2. [Repository & File Structure](#repository--file-structure)
3. [Architecture & Data Flow](#architecture--data-flow)
4. [Acoustic Physics & Music Theory](#acoustic-physics--music-theory)
5. [The Generative Engine (Strategy Pattern)](#the-generative-engine-strategy-pattern)
6. [Tempo Modes & Dynamic Rhythms](#tempo-modes--dynamic-rhythms)
7. [Web Audio Synthesis Architecture](#web-audio-synthesis-architecture)
8. [Persistence & Data Contracts](#persistence--data-contracts)
9. [Project Audit & Code Health Report](#project-audit--code-health-report)
10. [Roadmap & Next Steps](#roadmap--next-steps)

---

## 1. Project Overview

**Handpan Rhythm Forge** simulates an authentic **D-Kurd 9** handpan experience in the browser while providing an advanced generative engine capable of creating nuanced, humanized rhythms ranging from meditative ambient patterns to high-density percussion grooves.

### Core Highlights:
- **Acoustic Physics & Harmonic Filtering**: Intelligent note selection preventing dissonant collisions (minor seconds), biasing toward consonant fifths and octaves.
- **Articulation Modifiers**: Supports acoustic handpan techniques — crystal harmonics (octave overtones), muted chokes, and percussive body slaps.
- **Microtiming & Groove Humanization**: Per-step micro-offsets to recreate "lazy snares" (DnB), syncopated shuffles (Bossa), and organic swing.
- **17 Distinct Algorithmic Styles**: 9 Artist DNA models (inspired by Malte Marten, Kabeção, Daniel Waples, Hang Massive, etc.) and 8 Educational modules (Paradiddles, Claves, Gamelan, etc.).
- **Dynamic Phrase Building**: Compose grooves across 1, 2, 4, or 8 bars with adaptive phrase structures (`A`, `AB`, `AAAB`, `AAABCCCD`) and theme mutations.
- **Dual Visual Stage**: Realistic 3D glassmorphic Handpan interface coupled with an expandable multi-ring **Mandala Sequencer**.
- **Adaptive Speed Trainer (Tempo Engine)**: Static tempo, Organic breathing wave, Staircase progressive speed trainer, and Pyramid endurance mode.

---

## 2. Repository & File Structure

```
├── .env.example              # Environment variables template
├── index.html                # Application HTML entry point (SEO & viewport metadata)
├── metadata.json             # Applet identity and permission descriptors
├── package.json              # Dependencies and build/lint scripts
├── tsconfig.json             # TypeScript compiler configuration (strict mode)
├── vite.config.ts            # Vite bundler configuration (Tailwind v4 & React plugin)
├── README.md                 # AI-Native project architecture & documentation
└── src/
    ├── main.tsx              # React DOM mounting & StrictMode wrapper
    ├── App.tsx               # Root application coordinator, HUD controls & state
    ├── index.css             # Tailwind v4 theme, fonts, and dark theme global styles
    ├── types.ts              # Canonical TypeScript contracts, models & enums
    ├── constants.ts          # Physical Handpan tuning definition (D-Kurd frequencies & angles)
    ├── context/
    │   └── ToastContext.tsx  # Global non-blocking notification system
    ├── components/
    │   ├── AudioUnlockOverlay.tsx # Web Audio activation gate (browser autoplay policy)
    │   ├── Handpan.tsx       # Interactive instrument component (SVG orbits & glass tonefields)
    │   ├── MandalaSequencer.tsx   # Radial multi-bar visual sequencer with dynamic rings
    │   └── LibraryModal.tsx  # Saved grooves browser, JSON import/export, and deletion
    └── services/
        ├── audioEngine.ts    # Web Audio API engine (ADSR, synthesis, noise slaps)
        ├── sequencer.ts      # Lookahead Web Audio scheduler with microtiming offset
        ├── generativeEngine.ts # Strategy-pattern generative engine, music theory math, styles
        ├── grooveGenerator.ts # [Legacy] Simple 16-step generator (superseded)
        └── storageService.ts # LocalStorage groove repository with ID deduplication
```

---

## 3. Architecture & Data Flow

```
                      [User Gesture / Interaction]
                                   │
                                   ▼
                       [AudioUnlockOverlay]
                                   │
                      (Unlocks Web Audio Context)
                                   │
  ┌────────────────────────────────┼────────────────────────────────┐
  │                                │                                │
  ▼                                ▼                                ▼
[App.tsx State] ────────► [generativeEngine.ts] ────────► [sequencer.ts]
  - density (1-5)            - 17 Strategy Styles          - Lookahead timer
  - selectedStyles[]         - MusicMath & intervals       - Density filter
  - barsCount (1,2,4,8)      - Anti-collision rules        - Microtiming
  - tempoMode & BPM          - Microtiming offsets         - Metronome tick
  │                                                         │ (Audio Time)
  │ (Visual State Updates)                                  ▼
  │◄────────────────────── [onStep Callback] ───── [audioEngine.ts]
  │                                                    - Sine tone + ADSR
  ├────────────────────────────────┐                   - Bandpass noise slap
  ▼                                ▼                   - Auto-GC node disposal
[Handpan.tsx]              [MandalaSequencer.tsx]
  - Radial SVG Orbits        - Concentric bar rings
  - Glow active notes        - Step velocity indicators
  - Center Ding              - Focused bar isolation
```

---

## 4. Acoustic Physics & Music Theory

### 4.1 Tuning: D-Kurd 9 Scale
The instrument is modeled after the world's most popular handpan scale: **D-Minor Kurd (D-Kurd 9)**.

| Note ID | Label | Frequency (Hz) | Position / Angle | Role |
| :--- | :--- | :--- | :--- | :--- |
| `ding` | D3 | 146.83 Hz | Center (0°) | Fundamental Root / Bass Anchor |
| `d4` | D4 | 293.66 Hz | Radial (30°) | Root Octave |
| `a3` | A3 | 220.00 Hz | Radial (70°) | Perfect 5th Lower |
| `c4` | C4 | 261.63 Hz | Radial (110°) | Minor 7th |
| `e4` | E4 | 329.63 Hz | Radial (150°) | Major 2nd (Dissonance border) |
| `f4` | F4 | 349.23 Hz | Radial (-10°) | Minor 3rd (Dissonance border) |
| `g4` | G4 | 392.00 Hz | Radial (190°) | Perfect 4th |
| `a4` | A4 | 440.00 Hz | Radial (-50°) | Perfect 5th Higher |
| `c5` | C5 | 523.25 Hz | Radial (230°) | Minor 7th Upper |
| `d5` | D5 | 587.33 Hz | Radial (-90° / 12 o'clock) | 2nd Octave Apex |

### 4.2 Harmonic Filtering & Anti-Collision
- **Anti-Collision**: In handpan acoustics, playing minor-second intervals consecutively on accented beats (`E4` immediately followed by `F4`, or vice-versa) causes phase interference and unpleasant clangorous dissonance. The `NoteSelector.getSmartRadial` calculates MIDI interval distances to prevent semi-tone collisions on accents.
- **Consonance Jumps**: The `NoteSelector.getJumpPair()` algorithm identifies musical pairs separated by perfect 4ths, 5ths, or octaves (`+5`, `+7`, `+12` semitones) to construct melodic ostinatos.

### 4.3 Articulation Modifiers
- `'none'`: Standard resonant tone field strike.
- `'harmonic'`: Crystal ping / overtone flag. Multiplies frequency by 2 (octave transposition), reduces attack velocity slightly (0.8x), and extends decay time (3.0s ring).
- `'choke'`: Damped slap/touch. Instantly curtails tone decay to 50ms (0.05s) with 0.7x velocity to simulate palm muting.
- `'slap'`: Gu / shoulder hit. Triggers a filtered percussive noise burst simulating a slap against the metallic steel shell.

### 4.4 Microtiming & Humanization
Each generated `Step` can contain a `microOffset` (expressed as a fraction of a 16th note, e.g., `+0.15`):
- **Lazy Snares**: Backbeat slaps on steps 4 and 12 can be pushed slightly late (+15% of a 16th note) to create relaxed, head-nodding groove swing.
- **Bossa Shuffle**: Alternating weak-beat chords receive slight forward push (`+0.05`) for Latin swing.

---

## 5. The Generative Engine (Strategy Pattern)

The generator in `src/services/generativeEngine.ts` is architected using the **Strategy Pattern**:

```ts
export interface IStyleStrategy {
  id: string;
  name: string;
  category: 'artist' | 'educational';
  probabilities: { harmonicOnAccent: number; chokeOnGhost: number; };
  generate: (density: number) => EngineStep[];
  mutate: (bar: EngineStep[], density: number) => EngineStep[];
}
```

### Complete Style Registry (17 Styles)

#### Artist DNA (9 Styles)
1. **Standard Flow (`standard`)**: Balanced foundational handpan groove with Ding on 1, backbeat slaps on 2 and 4, and progressive ghost fills.
2. **Hang Massive (`hang_massive`)**: Trance-inducing double-ding groove (beats 1 and 3) with octave radial harmonies and minimal backbeats.
3. **Malte Marten (`malte`)**: Poly-rhythmic *Tresillo* grouping (3-3-2 accent structure on steps 0, 3, and 6) with gentle off-beat ghost fills.
4. **Kabeção (`kabecao`)**: High-technique ping-pong ghost notes dancing around accents, 80% ghost fill density with rhythmic displacement.
5. **Daniel Waples (`waples`)**: Continuous 100% density perpetual-motion stream, leaving zero empty steps.
6. **Yuki Koshimoto (`yuki`)**: Minimalist *wabi-sabi* style, maximum spatial breathing room, high rate of harmonic crystal pings (60% on accents), and zero slaps.
7. **Manu Delago (`manu`)**: Asymmetric odd meter grouping within a 16-step grid (7 + 7 + 2 pattern on steps 0, 7, and 14).
8. **David Kuckhermann (`kuckhermann`)**: Middle-Eastern riq/darbuka inspired rollercoasters with dense 32nd/16th rolls resolving on the bar boundary (steps 13, 14, 15).
9. **Nadishana (`nadishana`)**: Choke-heavy progressive acoustic playing with up to 80% muted ghost articulation.

#### Educational Modules (8 Styles)
10. **[EDU] Paradiddle Flow (`edu_paradiddle`)**: Classic drum rudiment adapted for handpan: `R L R R  L R L L` expressed as alternating accents and ghosts.
11. **[EDU] Gamelan Interlock (`edu_gamelan`)**: Kotekan-style interlocking gong pulse on quarter beats with syncopated high tones.
12. **[EDU] Cascade Arpeggios (`edu_cascade`)**: Ascending or descending directional sweeps across the physical circumference of the instrument.
13. **[EDU] Consonance Jumps (`edu_jumps`)**: Exercises octave and fifth leaps across the handpan tonefield to build spatial muscle memory.
14. **[EDU] Liquid DnB (`edu_dnb`)**: Breakbeat drum-and-bass rhythm with kick Ding on 0 & 10, lazy late-shifted slaps on 4 & 12 (+0.15 offset).
15. **[EDU] Afro-Cuban Clave (`edu_clave`)**: 3-2 Son Clave pattern (steps 0, 3, 6, 10, 12) translated onto resonant steel.
16. **[EDU] Bossa Nova Pulse (`edu_bossa`)**: Steady quarter-note bass Ding counterpointed by syncopated tone field rim clicks with subtle shuffle swing.
17. **[EDU] Doumbek Articulation (`edu_maqam`)**: Arabic Maqsoum rhythm: Dum (0), Tak (2), Tak (6), Dum (8), Tak (10) with crisp body slaps.

---

## 6. Tempo Modes & Dynamic Rhythms

The sequencer supports 4 dynamic speed algorithms controlled via `sequencer.setTempoMode`:

```
1. Static:
   BPM ────────────────────────────────────────────── (Constant rigid tempo)

2. Organic (Push & Pull):
   BPM  ▲     ▲
       ╱ ╲   ╱ ╲   (Natural breathing fluctuation, ±5% sinusoidal cycle)
      ▼   ▼ ▼   ▼

3. Staircase (Speed Trainer):
   BPM          ┌──── (Plateau at +20 BPM)
            ┌───┘ (+2 BPM every loop)
        ┌───┘
   ─────┘

4. Pyramid (Endurance):
   BPM      ▲ (+20 BPM peak)
           ╱ ╲
          ╱   ╲
   ──────┘     └───── (Ramps up +5 BPM/loop, then ramps back down to base)
```

---

## 7. Web Audio Synthesis Architecture

```
[AudioContext Engine]
  │
  ├──► [Master Gain Node (0.8)] ──► [Destination (Speakers / Headphones)]
  │
  ├── Tone Synthesis Graph:
  │   [OscillatorNode] ──► [GainNode (Linear Attack 5ms -> Exp Decay)] ──► [Master Gain]
  │   - Clean tone generation using native Web Audio scheduling
  │   - Frequency doubling on 'harmonic' modifier
  │   - Truncated exponential decay on 'choke' modifier
  │   - Automatic node disposal via `osc.onended` native garbage collection
  │
  └── Slap Synthesis Graph:
      [AudioBufferSourceNode (Pre-rendered White Noise)] 
          │
          ▼
      [BiquadFilterNode (Bandpass, 1200Hz, Q=1.0)] 
          │
          ▼
      [GainNode (Exp Ramp to 0.01 in 50ms)] ──► [Master Gain]
```

### Zero Memory Leaks (Self-Cleaning Graph)
Whenever an oscillator or noise buffer finishes playing, its `onended` handler explicitly calls `.disconnect()`, and removes the source from the internal `activeSources: Set`. Calling `stopAll()` cancels all active audio schedules cleanly.

---

## 8. Persistence & Data Contracts

### 8.1 Schema: `GrooveProject`
```ts
export interface Step {
  noteId: string | null;           // e.g. 'ding', 'd4', 'a4', null for slap/rest
  type: 'accent' | 'ghost' | 'slap' | 'rest' | 'empty';
  modifier?: 'harmonic' | 'choke' | 'none';
  microOffset?: number;            // -0.5 to +0.5 of a 16th note
}

export interface GrooveProject {
  id: string;                      // RFC 4122 UUID
  name: string;                    // User-facing project title
  createdAt: string;               // ISO 8601 timestamp
  bpm: number;                     // Base tempo (40 - 180)
  matrixVibe: string;              // Compatibility tag
  sequence: Step[];                // Sequence array (multiple of 16 steps)
}
```

### 8.2 Safe LocalStorage Architecture
- Deduplicates on load: `getSavedGrooves()` inspects existing storage, repairs any duplicate or invalid IDs with fresh UUIDs, and writes back sanitized records.
- JSON Portability: Export and import files conforming to `GrooveProject`. Imports are validated to ensure sequence length is a non-empty multiple of 16, and assigned a fresh UUID to prevent key collisions.

---

## 9. Project Audit & Code Health Report

### ✅ Architecture Strengths
1. **Web Audio Timing Accuracy**: Lookahead scheduling (`LOOKAHEAD_MS = 25ms`, `SCHEDULE_AHEAD_SEC = 100ms`) ensures rock-solid audio timing completely decoupled from main thread UI render cycles.
2. **Strategy Pattern Extensibility**: Adding a new musical style requires simply subclassing `BaseStyle` and calling `REGISTRY.set(...)`. No modification of sequencer logic or playback loops is required.
3. **Decoupled State**: Clean separation between audio scheduling time (`playTime`), visual tick callbacks, and React component renders.
4. **Collision-Proof React Keys**: All list and animated modal renders employ strict prefixing and deduplication.

### ⚠️ Technical Debt & Identified Inactive Code
1. **`src/services/grooveGenerator.ts`**: The original 16-step hardcoded generator is now completely unused and superseded by `generativeEngine.ts`. It can be safely removed.
2. **`package.json` Dependencies**:
   - `express`, `@types/express`, `better-sqlite3`, `dotenv`: These packages are currently listed in `package.json` from a previous server setup, but the app operates as a fast, pure Vite client-side SPA without an active Express backend.
3. **Mandala Sequencer Ring Math**: Updated to dynamically adapt to 1, 2, 4, or 8 bars, avoiding hardcoded 4-bar assumptions.

---

## 10. Roadmap & Next Steps

When continuing work on Handpan Rhythm Forge, the recommended next milestones are:

1. **Audio Samples / Soundfont Integration**:
   - Complement the Web Audio oscillator/noise synthesis with optional high-definition acoustic handpan sample packs (multi-velocity sampled ding, tonefields, and shell slap).
2. **Interactive Step Sequencer Grid Editor**:
   - Allow users to tap individual dots on the Mandala or open a linear 16-step matrix to toggle accents, ghosts, and slaps manually.
3. **MIDI Keyboard & Hardware Controller Input**:
   - Support `navigator.requestMIDIAccess()` to trigger handpan notes from external drum pads or keyboards.
4. **WAV / Audio Export**:
   - Render the multi-bar generated sequence to a downloadable `.wav` file using `OfflineAudioContext`.
5. **Scale Selector**:
   - Expand beyond D-Kurd to other popular scales (E-Amara / Celtic Minor, F-Pygmy, C#-Equinox, B-Hijaz).
