import { telemetry } from '../camera/telemetry'
import { useApp } from '../store'
import { SECTIONS } from '../sections/chapters'

// Generated ambience, no audio files. Layers:
// - a detuned low drone whose filter opens with altitude,
// - city hum (filtered brown noise), loud in the streets, gone above the clouds,
// - wind that rises with flight speed and altitude,
// - a soft pad that swells in the orbit epilogue,
// - sparse distant chimes while over the city.
// Plus one-shot UI sounds: hover blips and a whoosh + crackle on chapter changes.

// local helpers: this module loads before the three.js chunk, so it must not import three
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const smoothstep = (x: number, a: number, b: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

const orbitStart = SECTIONS.find((s) => s.id === 'orbit')!.start
const PENTATONIC = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33]

function noiseBuffer(ctx: AudioContext, seconds: number, brown: boolean) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    if (brown) {
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    } else data[i] = white
  }
  return buffer
}

/** Decaying stereo noise: a cheap generated reverb impulse. */
function impulse(ctx: AudioContext, seconds: number) {
  const buffer = ctx.createBuffer(2, ctx.sampleRate * seconds, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3
  }
  return buffer
}

class Ambient {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private reverb!: ConvolverNode
  private droneFilter!: BiquadFilterNode
  private hum!: GainNode
  private wind!: GainNode
  private windFilter!: BiquadFilterNode
  private pad!: GainNode
  private whiteNoise!: AudioBuffer
  private raf = 0
  private nextChime = 0

  private build() {
    const ctx = new AudioContext()
    this.ctx = ctx
    const now = ctx.currentTime

    const comp = ctx.createDynamicsCompressor()
    comp.connect(ctx.destination)
    this.master = ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(comp)

    this.reverb = ctx.createConvolver()
    this.reverb.buffer = impulse(ctx, 3.5)
    const wet = ctx.createGain()
    wet.gain.value = 0.5
    this.reverb.connect(wet).connect(this.master)

    // drone
    this.droneFilter = ctx.createBiquadFilter()
    this.droneFilter.type = 'lowpass'
    this.droneFilter.frequency.value = 300
    this.droneFilter.Q.value = 4
    const droneGain = ctx.createGain()
    droneGain.gain.value = 0.05
    this.droneFilter.connect(droneGain).connect(this.master)
    droneGain.connect(this.reverb)
    for (const [f, type] of [[55, 'sawtooth'], [55.4, 'sawtooth'], [82.4, 'triangle'], [110.3, 'sawtooth']] as const) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.value = f
      o.connect(this.droneFilter)
      o.start(now)
    }
    // slow breathing on the drone filter
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 120
    lfo.connect(lfoDepth).connect(this.droneFilter.frequency)
    lfo.start(now)

    // city hum
    const humSrc = ctx.createBufferSource()
    humSrc.buffer = noiseBuffer(ctx, 4, true)
    humSrc.loop = true
    const humFilter = ctx.createBiquadFilter()
    humFilter.type = 'lowpass'
    humFilter.frequency.value = 420
    this.hum = ctx.createGain()
    this.hum.gain.value = 0
    humSrc.connect(humFilter).connect(this.hum).connect(this.master)
    humSrc.start(now)

    // wind
    this.whiteNoise = noiseBuffer(ctx, 3, false)
    const windSrc = ctx.createBufferSource()
    windSrc.buffer = this.whiteNoise
    windSrc.loop = true
    this.windFilter = ctx.createBiquadFilter()
    this.windFilter.type = 'bandpass'
    this.windFilter.frequency.value = 500
    this.windFilter.Q.value = 0.8
    this.wind = ctx.createGain()
    this.wind.gain.value = 0
    windSrc.connect(this.windFilter).connect(this.wind).connect(this.master)
    windSrc.start(now)

    // orbit pad: A minor add9, slightly detuned sines, mostly reverb
    this.pad = ctx.createGain()
    this.pad.gain.value = 0
    this.pad.connect(this.reverb)
    const padDry = ctx.createGain()
    padDry.gain.value = 0.4
    this.pad.connect(padDry).connect(this.master)
    for (const f of [220, 261.63, 329.63, 493.88, 220.6]) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      const g = ctx.createGain()
      g.gain.value = 0.03
      o.connect(g).connect(this.pad)
      o.start(now)
    }
  }

  start() {
    if (!this.ctx) this.build()
    const ctx = this.ctx!
    void ctx.resume()
    this.master.gain.cancelScheduledValues(ctx.currentTime)
    this.master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.6)
    cancelAnimationFrame(this.raf)
    const loop = () => {
      this.update()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    if (!this.ctx) return
    const ctx = this.ctx
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.25)
    cancelAnimationFrame(this.raf)
    setTimeout(() => !useApp.getState().soundOn && void ctx.suspend(), 1200)
  }

  /** Browsers only start audio after a gesture; call from one if start() was too early. */
  resume() {
    if (this.ctx?.state === 'suspended' && useApp.getState().soundOn) void this.ctx.resume()
  }

  private update() {
    const ctx = this.ctx!
    const t = ctx.currentTime
    const alt = telemetry.position.y
    const speed = telemetry.speed
    const { progress } = useApp.getState()
    const street = 1 - smoothstep(alt, 60, 700)
    const orbit = smoothstep(progress, orbitStart, orbitStart + 0.07)
    const moving = clamp(speed / 120, 0, 1)

    this.droneFilter.frequency.setTargetAtTime(260 + smoothstep(alt, 0, 900) * 700, t, 0.5)
    this.hum.gain.setTargetAtTime(0.16 * street * (1 - orbit), t, 0.4)
    this.wind.gain.setTargetAtTime((0.02 + moving * 0.09) * (0.4 + (1 - street) * 0.6) * (1 - orbit * 0.6), t, 0.3)
    this.windFilter.frequency.setTargetAtTime(350 + moving * 900, t, 0.3)
    this.pad.gain.setTargetAtTime(orbit, t, 1.2)

    // sparse chimes drifting over the city
    if (t > this.nextChime) {
      this.nextChime = t + 4 + Math.random() * 6
      if (orbit < 0.5) this.chime(PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)], 0.025)
    }
  }

  private chime(freq: number, level: number) {
    const ctx = this.ctx!
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(level, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5)
    o.connect(g)
    g.connect(this.reverb)
    g.connect(this.master)
    o.start(t)
    o.stop(t + 2.6)
  }

  /** Short HUD blip for hovers and clicks. */
  blip(freq = 1320) {
    if (!this.live()) return
    const ctx = this.ctx!
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = 'square'
    o.frequency.setValueAtTime(freq, t)
    o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.05)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.025, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + 0.1)
  }

  /** Chapter change: a filtered noise whoosh with a little digital crackle on top. */
  whoosh() {
    if (!this.live()) return
    const ctx = this.ctx!
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.whiteNoise
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 1.5
    f.frequency.setValueAtTime(300, t)
    f.frequency.exponentialRampToValueAtTime(2800, t + 0.35)
    f.frequency.exponentialRampToValueAtTime(600, t + 0.7)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.12, t + 0.2)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8)
    src.connect(f).connect(g).connect(this.master)
    g.connect(this.reverb)
    src.start(t, Math.random() * 2)
    src.stop(t + 0.85)
    // crackle: a few tiny square clicks matching the visual glitch
    for (let i = 0; i < 5; i++) {
      const at = t + Math.random() * 0.4
      const o = ctx.createOscillator()
      o.type = 'square'
      o.frequency.value = 200 + Math.random() * 3000
      const cg = ctx.createGain()
      cg.gain.setValueAtTime(0.02, at)
      cg.gain.setValueAtTime(0, at + 0.015)
      o.connect(cg).connect(this.master)
      o.start(at)
      o.stop(at + 0.02)
    }
  }

  private live() {
    return !!this.ctx && this.ctx.state === 'running' && useApp.getState().soundOn
  }
}

export const ambient = new Ambient()
