import { Link } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { usePageMeta } from '../lib/usePageMeta'
import { articles } from '../news/articles'
import { STATIC_META } from '../seo/shared.mjs'

export function NewsIndex() {
  usePageMeta(STATIC_META['/news'].title, STATIC_META['/news'].description)

  return (
    <>
      <main id="main" className="page news-page">
        <div className="container">
          <p className="eyebrow page-rise">News</p>
          <h1 className="page-title page-rise">
            Notes from <em>sovereign ground.</em>
          </h1>
          <ul className="news-list page-rise">
            {articles.map((a, i) => (
              <li key={a.slug}>
                <Link className="news-item" to={`/news/${a.slug}`}>
                  <p className="news-item-meta mono">
                    {String(i + 1).padStart(2, '0')} — {a.kicker} · {a.date} · {a.readingTime}
                  </p>
                  <h2 className="news-item-title">{a.title}</h2>
                  <p className="news-item-dek">{a.dek}</p>
                  <span className="news-item-more">
                    Read article <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  )
}
