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

function TrackPageViews() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    let ref = ''
    try {
      ref = document.referrer ? new URL(document.referrer).hostname : ''
    } catch {
      ref = ''
    }
    track('page_view', { path: pathname, ref })
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
