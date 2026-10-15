import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useApp } from '../store'
import { sectionAt } from '../sections/chapters'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null

const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight

/** Smoothly scroll the page to a progress value (0..1); the camera flies along with it. */
export function scrollToProgress(p: number, onComplete?: () => void) {
  const target = p * maxScroll()
  const distance = Math.abs(target - window.scrollY) / Math.max(1, maxScroll())
  if (lenis) {
    // longer jumps take longer, so the flight stays readable
    lenis.scrollTo(target, { duration: 1.2 + distance * 3.5, onComplete: () => onComplete?.() })
  } else {
    window.scrollTo({ top: target })
    onComplete?.()
  }
}

/** Freeze scrolling (used while the loader is up). */
export function lockScroll(locked: boolean) {
  document.documentElement.style.overflow = locked ? 'hidden' : ''
  if (locked) lenis?.stop()
  else lenis?.start()
}

/** Native scroll → Lenis smoothing → single progress value in the store. */
export function useSmoothScroll() {
  useEffect(() => {
    const { reducedMotion, setProgress } = useApp.getState()

    const update = () => {
      const max = maxScroll()
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      setProgress(p, sectionAt(p))
    }

    if (!reducedMotion) {
      lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 0.9 })
      lenis.on('scroll', ScrollTrigger.update)
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
