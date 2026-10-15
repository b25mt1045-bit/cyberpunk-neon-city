import { Canvas } from '@react-three/fiber'
import { CameraRig } from './camera/CameraRig'
import { World } from './world/World'
import { Preloader } from './world/Preloader'
import { Effects } from './fx/Effects'
import { Sections } from './sections/Sections'
import { Hud } from './ui/hud/Hud'
import { Loader } from './ui/Loader'
import { Cursor } from './ui/Cursor'
import { ProjectPanel } from './ui/ProjectPanel'
import { useSmoothScroll } from './scroll/useSmoothScroll'

// dev aid: ?nofx disables post-processing to isolate scene vs effect issues
const noFx = import.meta.env.DEV && new URLSearchParams(location.search).has('nofx')

export default function App() {
  useSmoothScroll()

  return (
    <>
      <div className="fixed inset-0 z-0" aria-hidden>
        <Canvas
          flat
          dpr={[1, 1.5]}
          camera={{ fov: 55, near: 1, far: 6000, position: [0, 620, 45] }}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            // dev aid: lets tooling read draw calls / triangles
            if (import.meta.env.DEV) Object.assign(window, { __gl: gl })
          }}
        >
          <World />
          {!noFx && <Effects />}
          <CameraRig />
          <Preloader />
        </Canvas>
      </div>
      <Sections />
      <Hud />
      <ProjectPanel />
      <Loader />
      <Cursor />
    </>
  )
}
