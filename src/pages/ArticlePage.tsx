import { Link, Navigate, useParams } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { usePageMeta } from '../lib/usePageMeta'
import { getArticle } from '../news/articles'

export function ArticlePage() {
  const { slug } = useParams()
  const article = getArticle(slug)

  usePageMeta(
    article ? `${article.plainTitle} | Infersia` : 'News — Infersia',
    article ? article.dek.slice(0, 158) : ''
  )

  if (!article) return <Navigate to="/news" replace />

  return (
    <>
      <main id="main" className="page article-page">
        <article className="container-narrow">
          <header className="article-header page-rise">
            <p className="eyebrow">
              <Link className="eyebrow-link" to="/news">News</Link>
              <span className="eyebrow-sep" aria-hidden="true">/</span>
              {article.kicker}
            </p>
            <h1 className="article-title">{article.title}</h1>
            <p className="article-dek">{article.dek}</p>
            <div className="article-byline">
              <p className="byline-author">
                <span className="mono byline-name">By {article.author}</span>
                <span className="byline-role">{article.role}</span>
              </p>
              <p className="mono byline-meta">
                {article.date} · {article.readingTime}
              </p>
            </div>
          </header>
          <div className="article-body page-rise">{article.body}</div>
          <div className="article-notes">
            <p>
              <em>
                Scott Logan is the Founder and CEO of Infersia, an Australian sovereign AI compute company. He has
                spent more than two decades building and operating technology and online businesses across
                Australia and the United Kingdom.
              </em>
            </p>
            <p>
              <em>
                The views expressed are the author's own. This article is provided for general information and
                does not constitute legal, financial, or regulatory advice.
              </em>
            </p>
          </div>
          <div className="article-end">
            <p className="article-end-line">
              Bound by the same obligations? <em>We build for the middle.</em>
            </p>
            <div className="article-end-actions">
              <a className="btn btn-gold" href="mailto:enquiries@infersia.com.au?subject=Access%20enquiry">
                Enquire
              </a>
              <Link className="btn btn-outline" to="/news">
                All news
              </Link>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}
