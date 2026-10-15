import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { Vector2 } from 'three'
import { useApp } from '../store'
import { GlitchPulseEffect } from './GlitchPulse'

const caOffset = new Vector2(0.0006, 0.0004)

/** Glitch bursts: chapter changes trigger a strong one, opening a project a lighter one. */
const pulse = { start: -10, strength: 0 }
const DURATION = 0.5

export function triggerGlitch(strength = 1) {
  pulse.start = performance.now() / 1000
  pulse.strength = strength
}
// dev aid: fire a burst from the console
if (import.meta.env.DEV) Object.assign(window, { __glitch: triggerGlitch })

export function Effects() {
  const glitch = useMemo(() => new GlitchPulseEffect(), [])

  useEffect(() => {
    const unsubscribe = useApp.subscribe((s, prev) => {
      if (!s.entered || s.reducedMotion) return
      if (s.section !== prev.section) triggerGlitch(1)
      else if (s.activeProject !== null && prev.activeProject === null) triggerGlitch(0.5)
    })
    return () => {
      unsubscribe()
      glitch.dispose()
    }
  }, [glitch])

  useFrame((s) => {
    const dt = performance.now() / 1000 - pulse.start
    const k = Math.max(0, 1 - dt / DURATION)
    // stuttered decay so it reads as a signal dropping out, not a fade
    glitch.amount = k > 0 ? pulse.strength * k * k * (Math.sin(dt * 60) > -0.3 ? 1 : 0.25) : 0
    glitch.time = s.clock.elapsedTime
  })

  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur intensity={0.95} luminanceThreshold={0.62} luminanceSmoothing={0.25} radius={0.75} />
      <ChromaticAberration offset={caOffset} radialModulation modulationOffset={0.35} />
      <primitive object={glitch} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.25} darkness={0.75} />
      <Noise opacity={0.05} blendFunction={BlendFunction.OVERLAY} />
    </EffectComposer>
  )
}
