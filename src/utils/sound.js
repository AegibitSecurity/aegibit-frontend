/**
 * Sound utility — professional notification sounds using Web Audio API
 * 
 * No external files needed — generates sounds programmatically
 */

class SoundManager {
  constructor() {
    this.enabled = localStorage.getItem('aegibit_sound_enabled') !== 'false';
    this.audioContext = null;
    this.masterGain = null;
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3; // 30% volume — subtle but audible
      this.masterGain.connect(this.audioContext.destination);
    }
    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Professional notification sound — pleasant "ding"
   * Two-tone chime: E5 + A5 (pleasant major third interval)
   */
  playNotification() {
    if (!this.enabled) return;
    this.init();

    const now = this.audioContext.currentTime;
    
    // First tone (E5 - 659.25 Hz)
    this.playTone(659.25, now, 0.08, 0.15);
    
    // Second tone (A5 - 880 Hz) — slightly delayed, softer
    this.playTone(880, now + 0.12, 0.05, 0.25);
  }

  /**
   * Success sound — ascending chime for approvals
   * G5 + C6 + E6 (major triad — uplifting)
   */
  playSuccess() {
    if (!this.enabled) return;
    this.init();

    const now = this.audioContext.currentTime;
    
    // Arpeggiated major triad
    this.playTone(784, now, 0.06, 0.2);      // G5
    this.playTone(1046.5, now + 0.1, 0.05, 0.25);  // C6
    this.playTone(1318.5, now + 0.2, 0.08, 0.3);   // E6
  }

  /**
   * Error/warning sound — descending tone
   */
  playError() {
    if (!this.enabled) return;
    this.init();

    const now = this.audioContext.currentTime;
    
    // Descending minor third
    this.playTone(440, now, 0.08, 0.15);     // A4
    this.playTone(349.23, now + 0.15, 0.06, 0.2);  // F4
  }

  /**
   * Play a single tone with envelope
   */
  playTone(frequency, startTime, attack, decay) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = frequency;
    
    // Envelope: quick attack, smooth decay
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(1, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + attack + decay);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(startTime);
    osc.stop(startTime + attack + decay + 0.1);
  }

  enable() {
    this.enabled = true;
    localStorage.setItem('aegibit_sound_enabled', 'true');
  }

  disable() {
    this.enabled = false;
    localStorage.setItem('aegibit_sound_enabled', 'false');
  }

  toggle() {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
      this.playNotification(); // Preview sound
    }
    return this.enabled;
  }
}

// Singleton instance
export const soundManager = new SoundManager();

// Convenience exports
export const playNotification = () => soundManager.playNotification();
export const playSuccess = () => soundManager.playSuccess();
export const playError = () => soundManager.playError();
export const toggleSound = () => soundManager.toggle();
export const isSoundEnabled = () => soundManager.enabled;
