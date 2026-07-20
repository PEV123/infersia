import { useEffect } from 'react'
import { SITE } from '../seo/shared.mjs'

function setMeta(selector: string, create: () => HTMLElement, value: string) {
  let el = document.head.querySelector(selector) as HTMLElement | null
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  if (el instanceof HTMLMetaElement) el.content = value
  if (el instanceof HTMLLinkElement) el.href = value
}

// Keeps title/description/canonical/OG in sync on client-side navigation.
// (Crawlers get the same values server-injected into the HTML shell.)
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title
    const canonical = SITE + (window.location.pathname === '/' ? '' : window.location.pathname)
    setMeta('meta[name="description"]', () => {
      const m = document.createElement('meta')
      m.name = 'description'
      return m
    }, description)
    setMeta('link[rel="canonical"]', () => {
      const l = document.createElement('link')
      l.rel = 'canonical'
      return l
    }, canonical)
    setMeta('meta[property="og:title"]', () => {
      const m = document.createElement('meta')
      m.setAttribute('property', 'og:title')
      return m
    }, title)
    setMeta('meta[property="og:description"]', () => {
      const m = document.createElement('meta')
      m.setAttribute('property', 'og:description')
      return m
    }, description)
    setMeta('meta[property="og:url"]', () => {
      const m = document.createElement('meta')
      m.setAttribute('property', 'og:url')
      return m
    }, canonical)
  }, [title, description])
}
