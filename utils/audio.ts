
type SoundMode = 'off' | 'thock' | 'typewriter' | 'laptop';

export class KeyboardAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private demoAudio: HTMLAudioElement | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8; 
      this.masterGain.connect(this.ctx.destination);

      const bufferSize = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  play(mode: SoundMode) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || mode === 'off') {
        this.init(); 
        if(!this.ctx) return;
    }

    const t = this.ctx!.currentTime;
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noiseBuffer;
    
    const filter = this.ctx!.createBiquadFilter();
    const env = this.ctx!.createGain();

    if (mode === 'thock') {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.exponentialRampToValueAtTime(150, t + 0.08);
        filter.Q.value = 2;
        env.gain.setValueAtTime(0.9, t);
        env.gain.exponentialRampToValueAtTime(0.01, t + 0.1); 
    } 
    else if (mode === 'typewriter') {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2500, t);
        filter.frequency.exponentialRampToValueAtTime(800, t + 0.15);
        filter.Q.value = 8; 
        env.gain.setValueAtTime(0.7, t);
        env.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    } 
    else if (mode === 'laptop') {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, t);
        env.gain.setValueAtTime(0.4, t); 
        env.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    }

    src.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain!);
    
    src.playbackRate.value = 0.95 + Math.random() * 0.1;
    src.start(t);
    src.stop(t + 0.2); 
  }

  // UPDATED: Play pre-recorded MP3 instead of TTS
  playDemoTrack(url: string) {
      if (this.demoAudio) {
          this.demoAudio.pause();
          this.demoAudio.currentTime = 0;
      }
      this.demoAudio = new Audio(url);
      this.demoAudio.volume = 1.0;
      this.demoAudio.play().catch(e => console.error("Audio Play Error:", e));
  }

  stopDemoTrack() {
      if (this.demoAudio) {
          this.demoAudio.pause();
          this.demoAudio.currentTime = 0;
      }
  }

  // Deprecated but kept for compatibility or fallback
  speak(text: string) {
    // Disabled in favor of MP3
  }
}

export const globalAudio = new KeyboardAudioEngine();
