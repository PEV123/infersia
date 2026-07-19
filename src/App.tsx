import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Nav } from './components/Nav'
import { HomePage } from './pages/HomePage'
import { ArticlePage } from './pages/ArticlePage'
import { ComputePage } from './pages/ComputePage'
import { NewsIndex } from './pages/NewsIndex'

function ScrollRestore() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <ScrollRestore />
      <Nav />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/compute" element={<ComputePage />} />
        <Route path="/news" element={<NewsIndex />} />
        <Route path="/news/:slug" element={<ArticlePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <div className="grain" aria-hidden="true" />
    </>
  )
}
