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
    void this.loadAmbientFile() // if a licensed /audio/ambient.mp3 exists, swell it in
  }

  // Optional drop-in: place a LICENSED track at public/audio/ambient.mp3 and it becomes
  // the ambient bed (building in over a few seconds; the procedural bed ducks under it).
  private fileLoaded = false
  private async loadAmbientFile() {
    const ctx = this.ctx; if (!ctx || !this.master || !this.ambBus || this.fileLoaded) return
    try {
      const res = await fetch('/audio/ambient.mp3', { cache: 'force-cache' })
      if (!res.ok) return
      const audio = await ctx.decodeAudioData(await res.arrayBuffer())
      const src = ctx.createBufferSource(); src.buffer = audio; src.loop = true
      const g = ctx.createGain(); g.gain.value = 0
      src.connect(g); g.connect(this.master); src.start()
      const t = ctx.currentTime
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.7, t + 6)   // dramatic build
      this.ambBus.gain.linearRampToValueAtTime(0.06, t + 5)                      // duck the procedural bed
      this.fileLoaded = true
    } catch { /* no file / decode error → keep the procedural bed */ }
  }

  setMuted(m: boolean) {
    this._muted = m
    if (this.master && this.ctx) this.master.gain.linearRampToValueAtTime(m ? 0 : 0.55, this.ctx.currentTime + 0.15)
  }
  toggle() { this.setMuted(!this._muted); return this._muted }

  // ── Ambient bed: detuned drones + a swelling pad + filtered noise, that BUILDS UP ──
  private startAmbient() {
    const ctx = this.ctx!, amb = this.ambBus!
    const t0 = ctx.currentTime
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240; lp.Q.value = 0.7; lp.connect(amb)
    // the filter slowly OPENS over the first ~16s → a cinematic build, then drifts
    lp.frequency.setValueAtTime(240, t0)
    lp.frequency.linearRampToValueAtTime(820, t0 + 16)
    const fsweep = ctx.createOscillator(); fsweep.type = 'sine'; fsweep.frequency.value = 0.018
    const fg = ctx.createGain(); fg.gain.value = 220; fsweep.connect(fg); fg.connect(lp.frequency); fsweep.start()

    const freqs = [55, 82.4, 110.3, 164.8] // A1, E2, A2-ish, E3
    for (const f of freqs) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f
      const g = ctx.createGain(); g.gain.value = 0.16
      o.connect(g); g.connect(lp); o.start()
      const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.03 + Math.random() * 0.05
      const lg = ctx.createGain(); lg.gain.value = 0.06
      lfo.connect(lg); lg.connect(g.gain); lfo.start()
    }

    // swelling upper pad (the "build") — two fifths that rise in over ~12s and breathe
    for (const f of [220, 329.6]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 12)
      o.connect(g); g.connect(lp); o.start()
      const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.05 + Math.random() * 0.04
      const lg = ctx.createGain(); lg.gain.value = 0.035; lfo.connect(lg); lg.connect(g.gain); lfo.start()
    }

    // airy noise texture
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) { const wn = Math.random() * 2 - 1; last = (last + 0.02 * wn) / 1.02; data[i] = last * 3 }
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 700; nf.Q.value = 0.7
    const ng = ctx.createGain(); ng.gain.value = 0.045
    noise.connect(nf); nf.connect(ng); ng.connect(amb); noise.start()

    // breathing master LFO on the ambient bus
    const breath = ctx.createOscillator(); breath.type = 'sine'; breath.frequency.value = 0.08
    const bg = ctx.createGain(); bg.gain.value = 0.2
    breath.connect(bg); bg.connect(amb.gain); breath.start()

    // overall level builds in over ~6s (slower, more dramatic than a quick fade)
    amb.gain.cancelScheduledValues(t0)
    amb.gain.setValueAtTime(0, t0)
    amb.gain.linearRampToValueAtTime(0.62, t0 + 6)
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

  // A satisfying, physical click: a sharp noise transient (the "tick") layered with
  // a short pitched body that drops fast (the "tock") — like a real button press.
  private clickHit() {
    const ctx = this.ctx; if (!ctx || !this.uiBus) return
    const t = ctx.currentTime
    // 1) transient: ~7ms of high-passed noise for the crisp attack
    const nb = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.02), ctx.sampleRate)
    const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
    const src = ctx.createBufferSource(); src.buffer = nb
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1600; hp.Q.value = 0.7
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.13, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.024)
    src.connect(hp); hp.connect(ng); ng.connect(this.uiBus); src.start(t); src.stop(t + 0.03)
    // 2) body: a quick low "tock" that snaps down in pitch
    const o = ctx.createOscillator(); o.type = 'triangle'
    o.frequency.setValueAtTime(440, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.055)
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.11, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
    o.connect(g); g.connect(this.uiBus); o.start(t); o.stop(t + 0.1)
    // 3) a touch of low-end thump for weight
    const sub = ctx.createOscillator(); sub.type = 'sine'
    sub.frequency.setValueAtTime(150, t); sub.frequency.exponentialRampToValueAtTime(70, t + 0.06)
    const sg = ctx.createGain(); sg.gain.setValueAtTime(0.07, t); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
    sub.connect(sg); sg.connect(this.uiBus); sub.start(t); sub.stop(t + 0.11)
  }

  play(v: Voice) {
    if (!this.ctx || this._muted) return
    switch (v) {
      case 'hover': { const now = performance.now(); if (now - this.lastHover < 45) return; this.lastHover = now; this.blip(1180, 0.06, 'sine', 0.025); break }
      case 'click': this.clickHit(); break
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
