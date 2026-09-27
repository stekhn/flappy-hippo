/**
 * Sound effects, synthesized on the fly. Nothing is downloaded: every cue is a couple of
 * oscillators and a noise burst shaped by a gain envelope, which keeps the bundle tiny and the
 * game playable offline. Browsers only allow audio after a gesture, so the context is created
 * lazily on the first tap or key press (`unlock`).
 */

export type Cue =
  | 'flap'
  | 'score'
  | 'melon'
  | 'shield'
  | 'pop'
  | 'crash'
  | 'milestone'
  | 'record'
  | 'achievement'
  | 'ui'

export interface Sfx {
  unlock(): void
  setMuted(muted: boolean): void
  play(cue: Cue): void
  dispose(): void
}

type Ctor = typeof AudioContext

function audioContextCtor(): Ctor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

export function createSfx(initiallyMuted = false): Sfx {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let noise: AudioBuffer | null = null
  let muted = initiallyMuted

  function ensure(): AudioContext | null {
    if (muted) return null
    const Ctor = audioContextCtor()
    if (!Ctor) return null
    if (!ctx) {
      ctx = new Ctor()
      master = ctx.createGain()
      master.gain.value = 0.32
      master.connect(ctx.destination)
    }
    // iOS suspends the context whenever the app goes to the background.
    // The promise rejects if the context is closed before the resume lands (a dev remount).
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx
  }

  /** One second of white noise, reused for every percussive cue. */
  function noiseBuffer(context: AudioContext): AudioBuffer {
    if (noise) return noise
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    noise = buffer
    return buffer
  }

  function tone(
    context: AudioContext,
    opts: {
      type: OscillatorType
      from: number
      to?: number
      at?: number
      duration: number
      gain: number
    },
  ): void {
    const start = context.currentTime + (opts.at ?? 0)
    const osc = context.createOscillator()
    const gain = context.createGain()
    osc.type = opts.type
    osc.frequency.setValueAtTime(opts.from, start)
    if (opts.to !== undefined) osc.frequency.exponentialRampToValueAtTime(opts.to, start + opts.duration)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(opts.gain, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration)
    osc.connect(gain).connect(master!)
    osc.start(start)
    osc.stop(start + opts.duration + 0.02)
  }

  function hit(
    context: AudioContext,
    opts: { duration: number; gain: number; cutoff: number; at?: number; type?: BiquadFilterType; q?: number },
  ): void {
    const start = context.currentTime + (opts.at ?? 0)
    const source = context.createBufferSource()
    source.buffer = noiseBuffer(context)
    const filter = context.createBiquadFilter()
    filter.type = opts.type ?? 'lowpass'
    if (opts.q !== undefined) filter.Q.value = opts.q
    filter.frequency.setValueAtTime(opts.cutoff, start)
    filter.frequency.exponentialRampToValueAtTime(Math.max(opts.cutoff * 0.2, 120), start + opts.duration)
    const gain = context.createGain()
    gain.gain.setValueAtTime(opts.gain, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration)
    source.connect(filter).connect(gain).connect(master!)
    source.start(start)
    source.stop(start + opts.duration)
  }

  return {
    unlock() {
      ensure()
    },
    setMuted(next: boolean) {
      muted = next
      // Unmuting never creates a context: that waits for the first tap or key (`unlock`).
      if (muted && ctx) void ctx.suspend()
      else if (!muted && ctx) ensure()
    },
    play(cue: Cue) {
      const context = ensure()
      if (!context || !master) return
      switch (cue) {
        case 'flap':
          tone(context, { type: 'triangle', from: 520, to: 260, duration: 0.11, gain: 0.22 })
          hit(context, { duration: 0.07, gain: 0.05, cutoff: 1800 })
          return
        case 'score':
          tone(context, { type: 'square', from: 660, duration: 0.07, gain: 0.12 })
          tone(context, { type: 'square', from: 990, duration: 0.09, gain: 0.1, at: 0.06 })
          return
        case 'melon':
          tone(context, { type: 'sine', from: 880, to: 1480, duration: 0.16, gain: 0.18 })
          return
        case 'shield':
          // A little rising arpeggio: something good just happened.
          ;[523, 659, 784, 1047].forEach((f, i) =>
            tone(context, { type: 'triangle', from: f, duration: 0.14, gain: 0.14, at: i * 0.055 }),
          )
          return
        case 'pop':
          tone(context, { type: 'sine', from: 1200, to: 320, duration: 0.14, gain: 0.16 })
          hit(context, { duration: 0.12, gain: 0.08, cutoff: 3200 })
          return
        case 'crash':
          // Glass going: a thud, a bright burst of noise, and shards ringing off at random
          // pitches, a few of them landing late.
          tone(context, { type: 'sine', from: 150, to: 45, duration: 0.2, gain: 0.3 })
          hit(context, { duration: 0.12, gain: 0.12, cutoff: 900 })
          hit(context, { duration: 0.38, gain: 0.3, cutoff: 5200, type: 'bandpass', q: 0.8 })
          for (let i = 0; i < 9; i++) {
            const late = i >= 6
            const from = 2200 + Math.random() * 6800
            tone(context, {
              type: 'sine',
              from,
              to: from * 0.96,
              duration: 0.05 + Math.random() * 0.1,
              gain: late ? 0.035 : 0.07,
              at: late ? 0.26 + Math.random() * 0.2 : Math.random() * 0.14,
            })
          }
          return
        case 'milestone':
          ;[784, 988, 1175, 1568].forEach((f, i) =>
            tone(context, { type: 'triangle', from: f, duration: 0.2, gain: 0.12, at: i * 0.07 }),
          )
          return
        case 'record':
          // Two quick fifths and a held top note: brighter than a milestone, shorter than a crash.
          ;[
            [659, 0, 0.1],
            [988, 0.08, 0.1],
            [1319, 0.16, 0.32],
          ].forEach(([f, at, duration]) =>
            tone(context, { type: 'triangle', from: f, duration, gain: 0.14, at }),
          )
          return
        case 'achievement':
          // The console two-note: a soft bell, then a brighter one a fifth up, ringing out.
          tone(context, { type: 'sine', from: 784, duration: 0.22, gain: 0.16 })
          tone(context, { type: 'triangle', from: 1568, duration: 0.12, gain: 0.05 })
          tone(context, { type: 'sine', from: 1175, duration: 0.5, gain: 0.16, at: 0.13 })
          tone(context, { type: 'triangle', from: 2350, duration: 0.25, gain: 0.04, at: 0.13 })
          return
        case 'ui':
          tone(context, { type: 'sine', from: 420, to: 560, duration: 0.07, gain: 0.1 })
          return
      }
    },
    dispose() {
      if (ctx) ctx.close().catch(() => {})
      ctx = null
      master = null
      noise = null
    },
  }
}
