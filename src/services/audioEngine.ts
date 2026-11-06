export const AUDIO_CONFIG = {
  MASTER_VOL: 0.8,
  TONE_ATTACK: 0.005,
  SLAP_DURATION: 0.05,
  SLAP_FILTER_FREQ: 1200,
  SLAP_FILTER_Q: 1,
};

class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private isInitialized: boolean = false;
  private activeSources: Set<AudioScheduledSourceNode> = new Set();

  constructor() {
    // We do not initialize AudioContext in constructor to avoid autoplay policy issues
  }

  public get isReady(): boolean {
    return this.context !== null && this.context.state === 'running';
  }

  public get currentTime(): number {
    return this.context ? this.context.currentTime : 0;
  }

  public getContextState(): string {
    return this.context ? this.context.state : 'uninitialized';
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
      this.masterGain.gain.value = AUDIO_CONFIG.MASTER_VOL;
      this.masterGain.connect(this.context.destination);
      
      this.createNoiseBuffer(); // Cache slap noise once

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

  private createNoiseBuffer() {
    if (!this.context) return;
    const bufferSize = this.context.sampleRate * AUDIO_CONFIG.SLAP_DURATION;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  public playTone(frequency: number, type: OscillatorType = 'sine', duration: number = 2.0, velocity: number = 1.0, startTime?: number) {
    if (!this.isReady || !this.context || !this.masterGain) return;

    const time = startTime !== undefined ? startTime : this.context.currentTime;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);

    // ADSR Envelope
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(velocity, time + AUDIO_CONFIG.TONE_ATTACK);
    gain.gain.exponentialRampToValueAtTime(0.001, time + AUDIO_CONFIG.TONE_ATTACK + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + AUDIO_CONFIG.TONE_ATTACK + duration + 0.1);

    // Native Garbage Collection
    this.activeSources.add(osc);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      this.activeSources.delete(osc);
    };
  }

  public playSlap(startTime?: number, velocity: number = 0.8) {
    if (!this.isReady || !this.context || !this.masterGain || !this.noiseBuffer) return;

    const time = startTime !== undefined ? startTime : this.context.currentTime;

    const noise = this.context.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(AUDIO_CONFIG.SLAP_FILTER_FREQ, time);
    filter.Q.setValueAtTime(AUDIO_CONFIG.SLAP_FILTER_Q, time);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + AUDIO_CONFIG.SLAP_DURATION);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + AUDIO_CONFIG.SLAP_DURATION + 0.05);

    // Native Garbage Collection
    this.activeSources.add(noise);
    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
      gain.disconnect();
      this.activeSources.delete(noise);
    };
  }

  public stopAll() {
    this.activeSources.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore already stopped nodes */ }
    });
    this.activeSources.clear();
  }
}

export const audioEngine = new AudioEngine();