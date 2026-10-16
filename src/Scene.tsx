import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { CameraRig } from './camera/CameraRig'
import { World } from './world/World'
import { Preloader } from './world/Preloader'
import { SceneClock } from './world/sceneTime'
import { Effects } from './fx/Effects'
import { useApp } from './store'
import { SETTINGS, overrideTier, stepTier } from './quality'

// dev aid: ?nofx disables post-processing to isolate scene vs effect issues
const noFx = import.meta.env.DEV && new URLSearchParams(location.search).has('nofx')
// ?quality=low|medium|high pins the tier and turns the automatic adjustment off
const pinned = overrideTier() !== null

const step = (dir: 1 | -1) => {
  const { tier, setTier } = useApp.getState()
  setTier(stepTier(tier, dir))
}

/** The whole WebGL scene, loaded as its own chunk so the boot loader appears immediately. */
export default function Scene() {
  const tier = useApp((s) => s.tier)
  const entered = useApp((s) => s.entered)

  return (
    <Canvas
      flat
      dpr={SETTINGS[tier].dpr}
      camera={{ fov: 55, near: 1, far: 6000, position: [0, 620, 45] }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        // dev aid: lets tooling read draw calls / triangles
        if (import.meta.env.DEV) Object.assign(window, { __gl: gl })
      }}
    >
      <SceneClock />
      <World />
      {!noFx && <Effects />}
      <CameraRig />
      <Preloader />
      {/* only judge frame rate once the visitor is in the city (not during shader compiles) */}
      {entered && !pinned && (
        <PerformanceMonitor flipflops={3} onDecline={() => step(-1)} onIncline={() => step(1)} onFallback={() => step(-1)} />
      )}
    </Canvas>
  )
}
