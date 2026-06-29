// Sound engine — supplied audio samples (with a procedural fallback) + a music bed.
// Audio only starts after a user gesture (autoplay policy). Samples live in /public/audio.

type Voice = 'hover' | 'click' | 'select' | 'tab' | 'transition' | 'back' | 'open'

// Named sample files (supplied assets). BASE_URL handles the /macropolitics/ subpath on GitHub Pages.
const BASE = import.meta.env.BASE_URL
const SAMPLE_URLS: Record<string, string> = {
  click: `${BASE}audio/click.wav`,         // MAIN CLICK
  transition: `${BASE}audio/transition.mp3`, // SCREENSWITCH
  ffft: `${BASE}audio/ffft.mp3`,           // FFFT — soft whoosh
}
// Which sample (and level) each UI voice uses. null → procedural only.
const VOICE_MAP: Record<Voice, { s: string; g: number } | null> = {
  click: { s: 'click', g: 0.9 },
  select: { s: 'click', g: 0.6 },
  transition: { s: 'transition', g: 0.85 },
  hover: null,
  tab: { s: 'ffft', g: 0.7 },
  open: { s: 'ffft', g: 0.7 },
  back: { s: 'ffft', g: 0.55 },
}

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private uiBus: GainNode | null = null
  private ambBus: GainNode | null = null
  private started = false
  private _muted = false
  private lastHover = 0
  private buffers: Record<string, AudioBuffer> = {}
  private samplesLoading = false

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

  // Resume the audio context (for UI sounds). The procedural ambient bed is OFF by default —
  // it read as annoying. A licensed track dropped at /audio/ambient.mp3 still loads if present.
  start() {
    const ctx = this.ensure(); if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume()
    if (this.started) return
    this.started = true
    void this.loadSamples()
    void this.loadAmbientFile()
  }

  // Preload the supplied UI samples into buffers (decoded once).
  private async loadSamples() {
    const ctx = this.ctx; if (!ctx || this.samplesLoading) return
    this.samplesLoading = true
    await Promise.all(Object.entries(SAMPLE_URLS).map(async ([name, url]) => {
      try {
        const res = await fetch(url, { cache: 'force-cache' }); if (!res.ok) return
        this.buffers[name] = await ctx.decodeAudioData(await res.arrayBuffer())
      } catch { /* missing/decoded-fail → procedural fallback covers this voice */ }
    }))
  }

  private playSample(name: string, gain: number) {
    const ctx = this.ctx, buf = this.buffers[name]; if (!ctx || !this.uiBus || !buf) return false
    const src = ctx.createBufferSource(); src.buffer = buf
    const g = ctx.createGain(); g.gain.value = gain
    src.connect(g); g.connect(this.uiBus); src.start()
    return true
  }

  // Optional drop-in: place a LICENSED track at public/audio/ambient.mp3 and it becomes
  // the ambient bed (building in over a few seconds; the procedural bed ducks under it).
  private fileLoaded = false
  private async loadAmbientFile() {
    const ctx = this.ctx; if (!ctx || !this.master || !this.ambBus || this.fileLoaded) return
    try {
      const res = await fetch(`${BASE}audio/ambient.mp3`, { cache: 'force-cache' })
      if (!res.ok) return
      const audio = await ctx.decodeAudioData(await res.arrayBuffer())
      const src = ctx.createBufferSource(); src.buffer = audio; src.loop = true
      const g = ctx.createGain(); g.gain.value = 0
      src.connect(g); g.connect(this.master); src.start()
      const t = ctx.currentTime
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 6)   // dramatic build, sits under UI
      this.ambBus.gain.linearRampToValueAtTime(0.06, t + 5)                      // duck the procedural bed
      this.fileLoaded = true
    } catch { /* no file / decode error → keep the procedural bed */ }
  }

  setMuted(m: boolean) {
    this._muted = m
    if (this.master && this.ctx) this.master.gain.linearRampToValueAtTime(m ? 0 : 0.55, this.ctx.currentTime + 0.15)
  }
  toggle() { this.setMuted(!this._muted); return this._muted }

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

  // A crisp, modern UI click — a bright filtered-noise tick + a fast resonant "pock".
  // Tight and snappy (~55ms), clearly audible without an ambient bed under it.
  private clickHit() {
    const ctx = this.ctx; if (!ctx || !this.uiBus) return
    const t = ctx.currentTime
    // 1) bright tick: ~5ms of band-passed noise around 3.2kHz (the "snap")
    const nb = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.012), ctx.sampleRate)
    const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2)
    const src = ctx.createBufferSource(); src.buffer = nb
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 1.1
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.16, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.018)
    src.connect(bp); bp.connect(ng); ng.connect(this.uiBus); src.start(t); src.stop(t + 0.02)
    // 2) resonant pock: a fast sine snapping 900→320Hz, plucky envelope
    const o = ctx.createOscillator(); o.type = 'sine'
    o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(320, t + 0.045)
    const g = ctx.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
    o.connect(g); g.connect(this.uiBus); o.start(t); o.stop(t + 0.08)
  }

  play(v: Voice) {
    if (!this.ctx || this._muted) return
    if (v === 'hover') { const now = performance.now(); if (now - this.lastHover < 60) return; this.lastHover = now }
    // supplied sample first; procedural fallback if it hasn't loaded
    const m = VOICE_MAP[v]
    if (m && this.playSample(m.s, m.g)) return
    switch (v) {
      case 'hover': this.blip(2100, 0.035, 'triangle', 0.05); break
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
    'button, a, input, .fnode, .rnode, .home__lens, .tab, .hdr__logo, .panel__close, .panel__rel, .forcestools, [data-interactive]'
  )
