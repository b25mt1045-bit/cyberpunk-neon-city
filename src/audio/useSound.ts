import { useEffect } from 'react'
import { useApp } from '../store'
import { ambient } from './ambient'

/** Connects the ambient engine to the app: toggle, chapter whooshes, hover and open blips. */
export function useSound() {
  useEffect(() => {
    // a remembered "on" can only actually start after the visitor's first gesture
    const wake = () => {
      const { soundOn, entered } = useApp.getState()
      if (soundOn && entered) ambient.start()
    }
    window.addEventListener('pointerdown', wake, { once: true })
    window.addEventListener('keydown', wake, { once: true })

    const unsubscribe = useApp.subscribe((s, prev) => {
      if (s.soundOn !== prev.soundOn || (s.entered && !prev.entered)) {
        if (s.soundOn && s.entered) ambient.start()
        else if (!s.soundOn) ambient.stop()
      }
      if (!s.soundOn) return
      if (s.section !== prev.section) ambient.whoosh()
      if (s.pointerHint && !prev.pointerHint) ambient.blip()
      if (s.activeProject !== null && prev.activeProject === null) ambient.blip(660)
    })
    return () => {
      unsubscribe()
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', wake)
    }
  }, [])
}
