// Procedural sound — ambient bed + UI interaction sounds via Web Audio (no asset files).
// Tasteful + quiet. Audio only starts after a user gesture (autoplay policy).

type Voice = 'hover' | 'click' | 'select' | 'tab' | 'transition' | 'back' | 'open'

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private uiBus: GainNode | null = null
  private ambBus: GainNode | null = null
  private started = false
  private _muted = false
  private lastHover = 0

  get muted() { return this._muted }

  // Lazily create the context (called on first gesture).
  private ensure() {
    if (this.ctx) return this.ctx
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    const ctx = new AC()
    this.ctx = ctx
    this.master = ctx.createGain(); this.master.gain.value = this._muted ? 0 : 0.55; this.master.connect(ctx.destination)
    this.uiBus = ctx.createGain(); this.uiBus.gain.value = 0.9; this.uiBus.connect(this.master)
    this.ambBus = ctx.createGain(); this.ambBus.gain.value = 0.0; this.ambBus.connect(this.master)
    return ctx
  }

  // Resume + start ambient. Safe to call repeatedly.
  start() {
    const ctx = this.ensure(); if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume()
    if (this.started) return
    this.started = true
    this.startAmbient()
  }

  setMuted(m: boolean) {
    this._muted = m
    if (this.master && this.ctx) this.master.gain.linearRampToValueAtTime(m ? 0 : 0.55, this.ctx.currentTime + 0.15)
  }
  toggle() { this.setMuted(!this._muted); return this._muted }

  // ── Ambient bed: detuned low drones + slow filtered noise, breathing LFO ──
  private startAmbient() {
    const ctx = this.ctx!, amb = this.ambBus!
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 480; lp.Q.value = 0.6; lp.connect(amb)
    const freqs = [55, 82.4, 110.3, 164.8] // A1, E2, A2-ish, E3
    for (const f of freqs) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f
      const g = ctx.createGain(); g.gain.value = 0.16
      o.connect(g); g.connect(lp); o.start()
      // slow per-voice shimmer
      const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.03 + Math.random() * 0.05
      const lg = ctx.createGain(); lg.gain.value = 0.06
      lfo.connect(lg); lg.connect(g.gain); lfo.start()
    }
    // airy noise texture
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) { const wn = Math.random() * 2 - 1; last = (last + 0.02 * wn) / 1.02; data[i] = last * 3 }
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 700; nf.Q.value = 0.7
    const ng = ctx.createGain(); ng.gain.value = 0.04
    noise.connect(nf); nf.connect(ng); ng.connect(amb); noise.start()
    // breathing master LFO on the ambient bus
    const breath = ctx.createOscillator(); breath.type = 'sine'; breath.frequency.value = 0.08
    const bg = ctx.createGain(); bg.gain.value = 0.18
    breath.connect(bg); bg.connect(amb.gain); breath.start()
    // fade ambient in
    amb.gain.cancelScheduledValues(ctx.currentTime)
    amb.gain.setValueAtTime(0, ctx.currentTime)
    amb.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 3.5)
  }

  private blip(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number) {
    const ctx = this.ctx; if (!ctx || !this.uiBus) return
    const t = ctx.currentTime
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(this.uiBus); o.start(t); o.stop(t + dur + 0.02)
  }
  private noiseSweep(dur: number, from: number, to: number, gain: number) {
    const ctx = this.ctx; if (!ctx || !this.uiBus) return
    const t = ctx.currentTime
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate)
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource(); src.buffer = buf
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2
    bp.frequency.setValueAtTime(from, t); bp.frequency.exponentialRampToValueAtTime(to, t + dur)
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(bp); bp.connect(g); g.connect(this.uiBus); src.start(t); src.stop(t + dur)
  }

  play(v: Voice) {
    if (!this.ctx || this._muted) return
    switch (v) {
      case 'hover': { const now = performance.now(); if (now - this.lastHover < 45) return; this.lastHover = now; this.blip(1180, 0.06, 'sine', 0.025); break }
      case 'click': this.blip(560, 0.09, 'triangle', 0.05, 780); break
      case 'select': this.blip(440, 0.12, 'sine', 0.05); this.blip(660, 0.16, 'sine', 0.035); break
      case 'open': this.blip(330, 0.18, 'sine', 0.045, 520); break
      case 'tab': this.noiseSweep(0.22, 500, 1800, 0.04); this.blip(700, 0.1, 'sine', 0.03); break
      case 'transition': this.noiseSweep(0.4, 300, 1400, 0.05); break
      case 'back': this.blip(520, 0.14, 'sine', 0.04, 340); break
    }
  }
}

export const sound = new SoundEngine()

// Interactive-element detector for global delegation.
export const isInteractive = (t: EventTarget | null): boolean =>
  !!(t as HTMLElement)?.closest?.(
    'button, a, .fnode, .rnode, .home__lens, .tab, .zoomctl button, .hdr__logo, .panel__close, .panel__rel, [data-interactive]'
  )
