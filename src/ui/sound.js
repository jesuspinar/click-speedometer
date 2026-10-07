/**
 * Synthesised sound effects. Audio is muted until the player asks for it, and
 * any failure silently disables sound rather than interrupting a flight.
 */

import { el } from './dom.js';

const PEAK_GAIN = 0.04;
const SILENT_GAIN = 0.001;

const button = el('sound');

let enabled = false;
let context;

/** A short descending sine blip. No-op while sound is muted. */
export function beep(frequency = 300, duration = 0.045) {
  if (!enabled) return;

  try {
    context ??= new (window.AudioContext || window.webkitAudioContext)();
    context.resume();

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.5, start + duration);

    gain.gain.setValueAtTime(PEAK_GAIN, start);
    gain.gain.exponentialRampToValueAtTime(SILENT_GAIN, start + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(start + duration);
  } catch {
    enabled = false;
  }
}

/**
 * The game's sound palette. Thrust and stage cues rise with the stage, so the
 * ship audibly climbs in pitch the further it gets.
 */
export const cue = {
  launch: () => beep(600, 0.16),
  thrust: (stage) => beep(180 + stage * 80),
  stage: (stage) => beep(650 + stage * 100, 0.22),
  complete: () => beep(750, 0.3),
  equip: () => beep(500, 0.12),
};

export function initSoundToggle() {
  button.addEventListener('click', () => {
    enabled = !enabled;
    button.setAttribute('aria-label', enabled ? 'Mute sound' : 'Enable sound');
    button.querySelector('span').hidden = enabled;
    beep(450, 0.1);
  });
}
