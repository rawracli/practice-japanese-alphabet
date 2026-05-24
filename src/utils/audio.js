let audioCtx = null;
const MUTE_STORAGE_KEY = "kana_practice_muted";

/**
 * Returns whether the app is currently muted.
 */
export function isMuted() {
  try {
    const val = localStorage.getItem(MUTE_STORAGE_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

/**
 * Sets the muted state and saves it to localStorage.
 */
export function setMuted(muted) {
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, muted ? "true" : "false");
  } catch (e) {
    console.error("Failed to save mute state:", e);
  }
}

/**
 * Returns a running AudioContext.
 */
function getAudioContext() {
  if (!audioCtx) {
    // Lazy initialize to bypass browser autoplay policies
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a sweet dual-oscillator chime on correct answers.
 */
export function playCorrectSound() {
  if (isMuted()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";

    // Play a delightful C5 -> E5 arpeggio
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.setValueAtTime(659.25, now + 0.08); // E5

    // Layer with double frequency (C6 -> E6) for a crystal-clear chime
    osc2.frequency.setValueAtTime(1046.50, now);
    osc2.frequency.setValueAtTime(1318.51, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  } catch (e) {
    console.warn("Failed to play sound: Web Audio API not fully ready or blocked.", e);
  }
}

/**
 * Plays a quick buzzing drop for incorrect answers.
 */
export function playWrongSound() {
  if (isMuted()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Retro sawtooth buzz
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.15);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {
    console.warn("Failed to play sound:", e);
  }
}

/**
 * Plays a triumphant ascending major arpeggio upon quiz completion.
 */
export function playFinishSound() {
  if (isMuted()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Ascending arpeggio notes: C5, E5, G5, C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const stepDuration = 0.09;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + index * stepDuration);

      gain.gain.setValueAtTime(0.08, now + index * stepDuration);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * stepDuration + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * stepDuration);
      osc.stop(now + index * stepDuration + 0.3);
    });
  } catch (e) {
    console.warn("Failed to play sound:", e);
  }
}
