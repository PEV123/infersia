// Server-side SEO: builds per-route <head> tags + JSON-LD injected into the
// SPA shell before it is sent, plus the sitemap. Crawlers get real meta on
// first byte; the client keeps meta in sync on SPA navigation.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ARTICLE_META,
  COMPUTE_FAQ,
  PILLAR_FAQ,
  SITE,
  SITE_NAME,
  STATIC_META,
  modelDescription,
  modelFaq,
  modelTitle,
} from '../src/seo/shared.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const models = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'models.json'), 'utf8'))
const pricing = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'pricing.json'), 'utf8'))

const tierById = (id) => pricing.tiers.find((t) => t.id === id)
const effMonthly = (model, tier) => (pricing.priceOverrides && pricing.priceOverrides[model.id]) ?? tier?.price

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const ORG_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE,
  email: 'sales@infersia.com.au',
  description:
    'Australian sovereign AI compute — dedicated GPU hosting for open-weight AI models, processed entirely within Australian jurisdiction.',
  areaServed: 'AU',
}

function faqLd(faq) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

function serviceLd(model, tier) {
  const price = effMonthly(model, tier)
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${model.name} hosted in Australia`,
    serviceType: 'Private LLM hosting',
    provider: { '@type': 'Organization', name: SITE_NAME, url: SITE },
    areaServed: 'AU',
    description: modelDescription(model, tier, price),
  }
  if (model.quotable && tier && !tier.poa) {
    ld.offers = {
      '@type': 'Offer',
      priceCurrency: 'AUD',
      price,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price,
        priceCurrency: 'AUD',
        unitText: 'MONTH',
      },
    }
  }
  return ld
}

export function routeMeta(pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/'

  // model hosting pages
  const modelMatch = clean.match(/^\/hosting\/([a-z0-9-]+)$/)
  if (modelMatch) {
    const model = models.find((m) => m.id === modelMatch[1])
    if (model) {
      const tier = tierById(model.tierId)
      return {
        title: modelTitle(model),
        description: modelDescription(model, tier, effMonthly(model, tier)),
        canonical: `${SITE}${clean}`,
        ogType: 'website',
        jsonld: [ORG_LD, serviceLd(model, tier), faqLd(modelFaq(model, tier, effMonthly(model, tier)))],
      }
    }
  }

  // news articles
  const articleMatch = clean.match(/^\/news\/([a-z0-9-]+)$/)
  if (articleMatch && ARTICLE_META[articleMatch[1]]) {
    const a = ARTICLE_META[articleMatch[1]]
    return {
      title: a.title,
      description: a.description,
      canonical: `${SITE}${clean}`,
      ogType: 'article',
      jsonld: [
        ORG_LD,
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: a.title.replace(' | Infersia', ''),
          description: a.description,
          datePublished: a.datePublished,
          author: { '@type': 'Person', name: a.author },
          publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE },
          mainEntityOfPage: `${SITE}${clean}`,
        },
      ],
    }
  }

  const staticMeta = STATIC_META[clean]
  if (staticMeta) {
    const jsonld = [ORG_LD]
    if (clean === '/hosting') jsonld.push(faqLd(PILLAR_FAQ))
    if (clean === '/compute') jsonld.push(faqLd(COMPUTE_FAQ))
    if (clean === '/') {
      jsonld.push({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE,
      })
    }
    return {
      title: staticMeta.title,
      description: staticMeta.description,
      canonical: `${SITE}${clean === '/' ? '' : clean}` || SITE,
      robots: staticMeta.robots,
      ogType: 'website',
      jsonld,
    }
  }

  // unknown route: default site meta, noindex not needed (client redirects)
  const home = STATIC_META['/']
  return {
    title: home.title,
    description: home.description,
    canonical: SITE,
    ogType: 'website',
    jsonld: [ORG_LD],
  }
}

export function renderHead(meta) {
  const parts = [
    `<title>${esc(meta.title)}</title>`,
    meta.description ? `<meta name="description" content="${esc(meta.description)}" />` : '',
    meta.robots ? `<meta name="robots" content="${esc(meta.robots)}" />` : '',
    `<link rel="canonical" href="${esc(meta.canonical)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="${meta.ogType || 'website'}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    meta.description ? `<meta property="og:description" content="${esc(meta.description)}" />` : '',
    `<meta property="og:url" content="${esc(meta.canonical)}" />`,
    `<meta property="og:locale" content="en_AU" />`,
    `<meta name="twitter:card" content="summary" />`,
    ...(meta.jsonld || []).map(
      (ld) => `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`
    ),
  ]
  return parts.filter(Boolean).join('\n    ')
}

export function sitemapXml() {
  const now = new Date().toISOString().slice(0, 10)
  const urls = [
    { loc: `${SITE}/`, priority: '1.0' },
    { loc: `${SITE}/hosting`, priority: '0.9' },
    ...models.map((m) => ({ loc: `${SITE}/hosting/${m.id}`, priority: '0.8' })),
    { loc: `${SITE}/compute`, priority: '0.9' },
    { loc: `${SITE}/quote`, priority: '0.9' },
    { loc: `${SITE}/book`, priority: '0.6' },
    { loc: `${SITE}/news`, priority: '0.6' },
    ...Object.keys(ARTICLE_META).map((slug) => ({ loc: `${SITE}/news/${slug}`, priority: '0.7' })),
  ]
  const body = urls
    .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${now}</lastmod><priority>${u.priority}</priority></url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}
