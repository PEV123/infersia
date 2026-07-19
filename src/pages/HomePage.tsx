import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Capabilities } from '../components/Capabilities'
import { Closing } from '../components/Closing'
import { Hero } from '../components/Hero'
import { Manifesto } from '../components/Manifesto'
import { Sectors } from '../components/Sectors'
import { Sovereignty } from '../components/Sovereignty'
import { scrollToId, useSiteMotion } from '../lib/useSiteMotion'
import { Scene, type Quality } from '../scene/Scene'

export function HomePage() {
  const quality = useMemo<Quality>(
    () => ({
      mobile: window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820,
      reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    }),
    []
  )

  useSiteMotion()

  const location = useLocation()
  useEffect(() => {
    document.title = 'Infersia — Sovereign AI Infrastructure'
  }, [])
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const t = setTimeout(() => scrollToId(id), 80)
    return () => clearTimeout(t)
  }, [location])

  return (
    <>
      <div className="canvas-holder" aria-hidden="true">
        <Scene quality={quality} />
      </div>
      <div className="scrim" id="scrim" aria-hidden="true" />
      <main id="main">
        <Hero />
        <Manifesto />
        <Capabilities />
        <Sectors />
        <Sovereignty />
        <Closing />
      </main>
      <div className="intro-overlay" id="intro-overlay" aria-hidden="true" />
    </>
  )
}
