import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Nav } from './components/Nav'
import { track } from './lib/track'
import { HomePage } from './pages/HomePage'
import { AdminPage } from './pages/AdminPage'
import { ArticlePage } from './pages/ArticlePage'
import { BookPage } from './pages/BookPage'
import { ComputePage } from './pages/ComputePage'
import { HostingIndex } from './pages/HostingIndex'
import { ModelHostingPage } from './pages/ModelHostingPage'
import { NewsIndex } from './pages/NewsIndex'
import { QuotePage } from './pages/QuotePage'

function ScrollRestore() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

const CAMPAIGN_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'gbraid',
  'wbraid',
  'msclkid',
]

// The first page of a visit carries the referrer + campaign params; capture
// them once so SPA navigation within the visit doesn't overwrite the source.
let firstOfSession = true

function TrackPageViews() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    const payload: Record<string, string> = { path: pathname }
    if (firstOfSession) {
      firstOfSession = false
      payload.ref = (document.referrer || '').slice(0, 400)
      try {
        const params = new URLSearchParams(window.location.search)
        for (const p of CAMPAIGN_PARAMS) {
          const v = params.get(p)
          if (v) payload[p] = v.slice(0, 120)
        }
      } catch {
        /* query parsing is best-effort */
      }
    }
    track('page_view', payload)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <ScrollRestore />
      <TrackPageViews />
      <Nav />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/compute" element={<ComputePage />} />
        <Route path="/hosting" element={<HostingIndex />} />
        <Route path="/hosting/:modelId" element={<ModelHostingPage />} />
        <Route path="/quote" element={<QuotePage />} />
        <Route path="/book" element={<BookPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/news" element={<NewsIndex />} />
        <Route path="/news/:slug" element={<ArticlePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <div className="grain" aria-hidden="true" />
    </>
  )
}
