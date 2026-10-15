import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useApp } from '../store'
import { sectionAt } from '../sections/chapters'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null

/** Smoothly scroll the page to a progress value (0..1); the camera follows. */
export function scrollToProgress(p: number) {
  const max = document.documentElement.scrollHeight - window.innerHeight
  if (lenis) lenis.scrollTo(p * max, { duration: 2.2 })
  else window.scrollTo({ top: p * max })
}

/** Native scroll → Lenis smoothing → single progress value in the store. */
export function useSmoothScroll() {
  useEffect(() => {
    const { reducedMotion, setProgress } = useApp.getState()

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      setProgress(p, sectionAt(p))
    }

    if (!reducedMotion) {
      lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 0.9 })
      lenis.on('scroll', () => {
        ScrollTrigger.update()
        update()
      })
    }
    const tick = (time: number) => lenis?.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    update()

    return () => {
      gsap.ticker.remove(tick)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      lenis?.destroy()
      lenis = null
    }
  }, [])
}
