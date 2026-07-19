import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { scrollState, sampleTrack, type TrackKey } from './scrollState'

gsap.registerPlugin(ScrollTrigger)

const SCRIM_TRACK: TrackKey[] = [
  { p: 0.0, v: [0.0] },
  { p: 0.09, v: [0.1] },
  { p: 0.16, v: [0.52] },
  { p: 0.3, v: [0.52] },
  { p: 0.37, v: [0.58] },
  { p: 0.5, v: [0.52] },
  { p: 0.58, v: [0.2] },
  { p: 0.66, v: [0.08] },
  { p: 0.84, v: [0.08] },
  { p: 0.94, v: [0.38] },
  { p: 1.0, v: [0.42] },
]

const SECTIONS: { id: string; key: keyof typeof scrollState; start: string; end: string }[] = [
  { id: 'hero', key: 'hero', start: 'top top', end: 'bottom top' },
  { id: 'position-wrap', key: 'position', start: 'top 70%', end: 'bottom 80%' },
  { id: 'capabilities', key: 'capabilities', start: 'top 80%', end: 'bottom 30%' },
  { id: 'sectors', key: 'sectors', start: 'top 80%', end: 'bottom 40%' },
  { id: 'sovereignty-wrap', key: 'sovereignty', start: 'top 65%', end: 'bottom bottom' },
  { id: 'contact', key: 'contact', start: 'top 85%', end: 'bottom bottom' },
]

let introPlayed = false

export function useSiteMotion() {
  useEffect(() => {
    const prm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    scrollState.reducedMotion = prm

    let lenis: Lenis | null = null
    const tickers: ((time: number) => void)[] = []
    const ctx = gsap.context(() => {
      if (!prm) {
        lenis = new Lenis({ duration: 1.15, smoothWheel: true })
        lenis.on('scroll', ScrollTrigger.update)
        const lenisTick = (time: number) => lenis!.raf(time * 1000)
        gsap.ticker.add(lenisTick)
        tickers.push(lenisTick)
        gsap.ticker.lagSmoothing(0)
        // exposed for anchor handling elsewhere
        ;(window as unknown as { __lenis?: Lenis }).__lenis = lenis
      }

      // ---- global page progress
      ScrollTrigger.create({
        trigger: '#main',
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          scrollState.p = self.progress
        },
      })

      // ---- named section progresses
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id)
        if (!el) continue
        ScrollTrigger.create({
          trigger: el,
          start: s.start,
          end: s.end,
          onUpdate: (self) => {
            ;(scrollState[s.key] as number) = self.progress
          },
        })
      }

      // ---- scrim (contrast layer between canvas and DOM)
      const scrim = document.getElementById('scrim')
      const scrimOut = [0]
      if (scrim) {
        const scrimTick = () => {
          sampleTrack(SCRIM_TRACK, scrollState.p, scrimOut)
          scrim.style.opacity = String(scrimOut[0])
        }
        gsap.ticker.add(scrimTick)
        tickers.push(scrimTick)
      }

      // ---- hero content drifts up and fades as you leave it
      if (!prm) {
        gsap.to('.hero-inner', {
          y: -90,
          autoAlpha: 0,
          ease: 'none',
          scrollTrigger: { trigger: '#hero', start: 'top top', end: '80% top', scrub: true },
        })
      }

      // ---- generic reveals
      const reveals = gsap.utils.toArray<HTMLElement>('[data-reveal]')
      if (prm) {
        gsap.set(reveals, { autoAlpha: 1 })
      } else {
        for (const el of reveals) {
          const delay = parseFloat(el.dataset.revealDelay ?? '0')
          gsap.fromTo(
            el,
            { y: 36, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 1.15,
              delay,
              ease: 'power3.out',
              scrollTrigger: { trigger: el, start: 'top 88%' },
            }
          )
        }
      }

      // ---- staggered groups (cards, rows)
      const groups = gsap.utils.toArray<HTMLElement>('[data-reveal-group]')
      for (const group of groups) {
        const items = Array.from(group.children)
        if (prm) {
          gsap.set(items, { autoAlpha: 1 })
        } else {
          gsap.fromTo(
            items,
            { y: 44, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 1.1,
              ease: 'power3.out',
              stagger: 0.09,
              scrollTrigger: { trigger: group, start: 'top 85%' },
            }
          )
        }
      }

      // ---- manifesto word scrub
      const words = gsap.utils.toArray<HTMLElement>('.manifesto .w')
      if (words.length) {
        if (prm) {
          words.forEach((w) => w.classList.add('on'))
        } else {
          let prevCount = -1
          ScrollTrigger.create({
            trigger: '#position-wrap',
            start: 'top 45%',
            end: 'bottom 95%',
            scrub: true,
            onUpdate: (self) => {
              const active = Math.floor(self.progress * 1.12 * words.length)
              if (active === prevCount) return
              prevCount = active
              words.forEach((w, i) => w.classList.toggle('on', i < active))
            },
          })
        }
      }

      // ---- nav glass state
      const nav = document.getElementById('site-nav')
      if (nav) {
        ScrollTrigger.create({
          start: 60,
          end: 'max',
          onToggle: (self) => nav.classList.toggle('scrolled', self.isActive),
        })
      }

      // ---- intro choreography (full ceremony only on the first arrival)
      const overlay = document.getElementById('intro-overlay')
      const first = !introPlayed
      introPlayed = true
      scrollState.intro = 0
      if (prm) {
        scrollState.intro = 1
        if (overlay) gsap.to(overlay, { autoAlpha: 0, duration: 0.4, delay: 0.1 })
        gsap.set('.hero-rise', { autoAlpha: 1 })
      } else {
        gsap.set('.hero-rise', { autoAlpha: 0, y: 28 })
        const tl = gsap.timeline({ delay: first ? 0.12 : 0.02 })
        if (overlay) tl.to(overlay, { autoAlpha: 0, duration: first ? 0.7 : 0.3, ease: 'power2.inOut' }, 0)
        tl.to(scrollState, { intro: 1, duration: first ? 2.6 : 1.1, ease: 'power2.out' }, 0.05)
        tl.to(
          '.hero-rise',
          { autoAlpha: 1, y: 0, duration: first ? 1.3 : 0.8, ease: 'power3.out', stagger: first ? 0.1 : 0.05 },
          first ? 0.55 : 0.1
        )
      }

      // ---- pointer parallax
      const onPointer = (e: PointerEvent) => {
        scrollState.pointerX = (e.clientX / window.innerWidth) * 2 - 1
        scrollState.pointerY = (e.clientY / window.innerHeight) * 2 - 1
      }
      if (!prm) window.addEventListener('pointermove', onPointer, { passive: true })

      document.fonts?.ready.then(() => ScrollTrigger.refresh())

      return () => {
        window.removeEventListener('pointermove', onPointer)
      }
    })

    return () => {
      ctx.revert()
      for (const t of tickers) gsap.ticker.remove(t)
      lenis?.destroy()
      ;(window as unknown as { __lenis?: Lenis }).__lenis = undefined
    }
  }, [])
}

export function scrollToId(id: string) {
  const lenis = (window as unknown as { __lenis?: Lenis }).__lenis
  const el = document.getElementById(id)
  if (!el) return
  if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.6 })
  else el.scrollIntoView({ behavior: 'auto' })
}
