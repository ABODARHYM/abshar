/**
 * ABSHER BI — Sound Library
 */

type SoundType =
  | 'order-new'
  | 'order-ready'
  | 'order-accepted'
  | 'order-delivered'
  | 'order-cancelled'
  | 'notification'
  | 'success'
  | 'error'
  | 'warning'
  | 'click';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setEnabled(value: boolean) {
    this.enabled = value;
    if (typeof window !== 'undefined') localStorage.setItem('absher_sound_enabled', String(value));
  }

  isEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('absher_sound_enabled');
    return stored !== null ? stored === 'true' : this.enabled;
  }

  play(type: SoundType) {
    if (!this.isEnabled()) return;
    try {
      switch (type) {
        case 'order-new':
          this.tone(523.25, 0, 0.15);
          this.tone(659.25, 0.18, 0.15);
          this.tone(783.99, 0.36, 0.3);
          break;
        case 'order-ready':
          this.tone(880, 0, 0.12);
          this.tone(1046.5, 0.15, 0.25);
          break;
        case 'order-accepted':
        case 'success':
          this.tone(523.25, 0, 0.1, 'triangle');
          this.tone(659.25, 0.12, 0.1, 'triangle');
          this.tone(783.99, 0.24, 0.2, 'triangle');
          break;
        case 'order-delivered':
          this.tone(523.25, 0, 0.1);
          this.tone(659.25, 0.12, 0.1);
          this.tone(783.99, 0.24, 0.1);
          this.tone(1046.5, 0.36, 0.4);
          break;
        case 'notification':
          this.tone(800, 0, 0.25);
          break;
        case 'error':
        case 'order-cancelled':
          this.tone(400, 0, 0.15, 'square', 0.2);
          this.tone(300, 0.17, 0.25, 'square', 0.2);
          break;
        case 'warning':
          this.tone(660, 0, 0.15);
          this.tone(660, 0.2, 0.15);
          break;
        case 'click':
          this.tone(1200, 0, 0.05, 'sine', 0.15);
          break;
      }
    } catch (e) {
      console.warn('[Sound] Failed:', e);
    }
  }

  private tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol: number = 0.3) {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(vol, now + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + start + dur);
    osc.start(now + start);
    osc.stop(now + start + dur);
  }
}

export const sound = new SoundEngine();
export type { SoundType };
