class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isInitialized: boolean = false;

  constructor() {
    // We do not initialize AudioContext in constructor to avoid autoplay policy issues
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized && this.context) {
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      return;
    }

    try {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.8; // Master volume
      this.masterGain.connect(this.context.destination);
      
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      
      this.isInitialized = true;
      console.log('Audio Engine Initialized');
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      throw new Error('Could not initialize audio engine. Your browser may not support Web Audio API.');
    }
  }

  public playTone(frequency: number, type: OscillatorType = 'sine', duration: number = 2.0, velocity: number = 1.0, startTime?: number) {
    if (!this.context || !this.masterGain) {
      console.warn('AudioContext not initialized. Call initialize() first.');
      return;
    }

    const t = startTime || this.context.currentTime;
    
    // Slap Logic
    // If velocity is very high (e.g. 1.2 for slap), we treat it as a percussive hit
    const isSlap = velocity > 1.1;

    if (isSlap) {
       this.playSlap(t);
       return;
    }

    // Oscillator
    const osc = this.context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);

    // Envelope (Gain)
    const gain = this.context.createGain();
    
    // Dynamics
    // Ghost notes (low velocity) have shorter decay
    const isGhost = velocity < 0.3;
    const attackTime = 0.005;
    const decayTime = isGhost ? 0.1 : duration; 
    const peakGain = velocity;

    // Attack
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peakGain, t + attackTime);
    
    // Decay (Exponential)
    gain.gain.exponentialRampToValueAtTime(0.001, t + attackTime + decayTime);

    // Connect graph
    osc.connect(gain);
    gain.connect(this.masterGain);

    // Start and Stop
    osc.start(t);
    osc.stop(t + attackTime + decayTime + 0.1);

    // Cleanup
    setTimeout(() => {
      osc.disconnect();
      gain.disconnect();
    }, (attackTime + decayTime + 0.2) * 1000);
  }

  private playSlap(time: number) {
     if (!this.context || !this.masterGain) return;
     
     // Create a buffer of noise
     const bufferSize = this.context.sampleRate * 0.05; // 50ms
     const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
     const data = buffer.getChannelData(0);
     for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
     }

     const noise = this.context.createBufferSource();
     noise.buffer = buffer;

     // Filter to make it sound like a shell hit (Bandpass)
     const filter = this.context.createBiquadFilter();
     filter.type = 'bandpass';
     filter.frequency.value = 1200;
     filter.Q.value = 1;

     const gain = this.context.createGain();
     gain.gain.setValueAtTime(0.8, time);
     gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

     noise.connect(filter);
     filter.connect(gain);
     gain.connect(this.masterGain);

     noise.start(time);
     noise.stop(time + 0.06);

     setTimeout(() => {
        noise.disconnect();
        filter.disconnect();
        gain.disconnect();
     }, 100);
  }

  public get currentTime() {
    return this.context ? this.context.currentTime : 0;
  }


  public getContextState(): AudioContextState | 'uninitialized' {
    return this.context ? this.context.state : 'uninitialized';
  }
}

export const audioEngine = new AudioEngine();
