import { lazy, Suspense } from 'react'
import { Sections } from './sections/Sections'
import { Hud } from './ui/hud/Hud'
import { Loader } from './ui/Loader'
import { Cursor } from './ui/Cursor'
import { ProjectPanel } from './ui/ProjectPanel'
import { useSmoothScroll } from './scroll/useSmoothScroll'
import { useSound } from './audio/useSound'

// three.js and the whole scene live in their own chunk: the loader, HUD and the semantic
// document render first while it downloads.
const Scene = lazy(() => import('./Scene'))

export default function App() {
  useSmoothScroll()
  useSound()

  return (
    <>
      <div className="fixed inset-0 z-0" aria-hidden>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </div>
      <Sections />
      <Hud />
      <ProjectPanel />
      <Loader />
      <Cursor />
    </>
  )
}
