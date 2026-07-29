/** Tiny synth SFX via Web Audio API — no audio files needed. */

let ctx = null
let muted = localStorage.getItem('blocks-muted') === '1'

function getCtx() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null
    ctx = new AudioCtx()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function isMuted() {
  return muted
}

export function setMuted(value) {
  muted = value
  localStorage.setItem('blocks-muted', value ? '1' : '0')
}

export function toggleMute() {
  setMuted(!muted)
  return muted
}

function tone({
  freq = 440,
  duration = 0.12,
  type = 'sine',
  gain = 0.12,
  slideTo = null,
  delay = 0,
}) {
  const audio = getCtx()
  if (!audio || muted) return

  const t0 = audio.currentTime + delay
  const osc = audio.createOscillator()
  const amp = audio.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(slideTo, 1),
      t0 + duration,
    )
  }

  amp.gain.setValueAtTime(0.0001, t0)
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.015)
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)

  osc.connect(amp)
  amp.connect(audio.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

/** Soft tap when picking up a shape. */
export function playPickup() {
  tone({ freq: 520, duration: 0.07, type: 'triangle', gain: 0.06 })
}

/** Soft thud when a piece is placed. */
export function playPlace() {
  tone({ freq: 180, duration: 0.08, type: 'triangle', gain: 0.1, slideTo: 90 })
  tone({
    freq: 320,
    duration: 0.06,
    type: 'sine',
    gain: 0.05,
    delay: 0.02,
  })
}

/** Bright arpeggio when lines clear. Bigger clear = higher / longer. */
export function playClear(linesCleared = 1) {
  const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
  const count = Math.min(Math.max(linesCleared, 1) + 1, notes.length)

  for (let i = 0; i < count; i++) {
    tone({
      freq: notes[i],
      duration: 0.14,
      type: 'sine',
      gain: 0.09,
      delay: i * 0.055,
    })
    tone({
      freq: notes[i] * 2,
      duration: 0.1,
      type: 'triangle',
      gain: 0.035,
      delay: i * 0.055,
    })
  }
}

/** Extra punch when a streak combo lands. */
export function playCombo(streak = 2) {
  const base = 660 + Math.min(streak, 6) * 40
  tone({ freq: base, duration: 0.12, type: 'square', gain: 0.05 })
  tone({
    freq: base * 1.5,
    duration: 0.16,
    type: 'sine',
    gain: 0.08,
    delay: 0.04,
  })
  tone({
    freq: base * 2,
    duration: 0.1,
    type: 'triangle',
    gain: 0.04,
    delay: 0.08,
  })
}

/** Descending tone for game over. */
export function playGameOver() {
  tone({ freq: 392, duration: 0.18, type: 'sawtooth', gain: 0.05, slideTo: 196 })
  tone({
    freq: 294,
    duration: 0.28,
    type: 'triangle',
    gain: 0.07,
    slideTo: 110,
    delay: 0.12,
  })
}
