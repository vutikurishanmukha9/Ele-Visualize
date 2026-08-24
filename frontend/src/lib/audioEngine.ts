/**
 * Procedural Web Audio API Sound Engine
 * Zero-dependency, lightweight quantum acoustic synthesizer.
 * Generates subtle, non-intrusive sci-fi auditory feedback for 3D interactions.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private masterGain: GainNode | null = null;
  private thermalOsc: OscillatorNode | null = null;
  private thermalGain: GainNode | null = null;

  constructor() {
    // Check saved mute state from localStorage
    try {
      const saved = localStorage.getItem('ele_audio_muted');
      if (saved !== null) {
        this.muted = JSON.parse(saved);
      }
    } catch {
      this.muted = false;
    }
  }

  private initContext(): boolean {
    if (this.muted) return false;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return false;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return true;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem('ele_audio_muted', JSON.stringify(muted));
    } catch {
      // Ignore storage errors
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.3, this.ctx.currentTime);
    }
    if (muted && this.thermalGain && this.ctx) {
      this.thermalGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Harmonic resonant chime tuned to element atomic number Z
   * Frequency scales scientifically: f0 = 220 + Z * 7.5 Hz with golden ratio harmonics
   */
  public playElementChime(atomicNumber: number = 1) {
    if (!this.initContext() || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const baseFreq = 220 + (atomicNumber % 60) * 7.5;
    const harmonics = [1, 1.5, 2.0];

    harmonics.forEach((h, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(baseFreq * h, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12 / (idx + 1), now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6 + idx * 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 0.9);
    });
  }

  /**
   * Resonant Major Triad chord on molecule formation/selection
   */
  public playBondingChord() {
    if (!this.initContext() || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const baseFreq = 330; // E4
    const intervals = [1.0, 1.25, 1.5]; // Root, Major 3rd, Perfect 5th

    intervals.forEach((ratio, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * ratio, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8 + idx * 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 1.1);
    });
  }

  /**
   * Crisp mechanical click on camera preset / mode button click
   */
  public playClick(freq: number = 880) {
    if (!this.initContext() || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + 0.04);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Dynamic thermal frequency-modulated hum responding to Kelvin temperature
   */
  public updateThermalHum(tempK: number) {
    if (!this.initContext() || !this.ctx || !this.masterGain || this.muted) return;

    const normalized = Math.max(0, Math.min(1, tempK / 5000));
    const targetFreq = 90 + normalized * 360;

    if (!this.thermalOsc) {
      const now = this.ctx.currentTime;
      this.thermalOsc = this.ctx.createOscillator();
      this.thermalGain = this.ctx.createGain();

      this.thermalOsc.type = 'sine';
      this.thermalOsc.frequency.setValueAtTime(targetFreq, now);

      this.thermalGain.gain.setValueAtTime(0, now);
      this.thermalGain.gain.linearRampToValueAtTime(0.04, now + 0.1);

      this.thermalOsc.connect(this.thermalGain);
      this.thermalGain.connect(this.masterGain);
      this.thermalOsc.start();
    } else if (this.thermalGain) {
      const now = this.ctx.currentTime;
      this.thermalOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
      this.thermalGain.gain.setTargetAtTime(0.04, now, 0.05);
    }
  }

  public stopThermalHum() {
    if (this.thermalGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.thermalGain.gain.linearRampToValueAtTime(0, now + 0.2);
    }
  }
}

export const audioEngine = new AudioEngine();
