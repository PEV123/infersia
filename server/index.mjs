// Infersia server — serves the built SPA and a minimal first-party API:
//   POST /api/track        anonymous usage events from the quote page
//   POST /api/quote-lead   lead capture ("Lock this quote")
//   GET  /api/admin/summary aggregated stats + leads (x-admin-key protected)
// Storage is append-only NDJSON on DATA_DIR (a Render persistent disk in prod)
// — no database dependency, nothing to migrate.

import crypto from 'node:crypto'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', 'dist')
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data-local')
const EVENTS_FILE = path.join(DATA_DIR, 'events.ndjson')
const LEADS_FILE = path.join(DATA_DIR, 'leads.ndjson')
const PORT = process.env.PORT || 8790
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''
const GHL_WEBHOOK_URL = process.env.GHL_WEBHOOK_URL || ''

fs.mkdirSync(DATA_DIR, { recursive: true })

const ALLOWED_EVENTS = new Set([
  'quote_page_viewed',
  'model_selected',
  'usage_changed',
  'comparator_changed',
  'quote_viewed',
  'quote_submitted',
])

const clip = (v, n = 300) => (typeof v === 'string' ? v.slice(0, n) : v)

function appendLine(file, obj) {
  fs.appendFile(file, JSON.stringify(obj) + '\n', (err) => {
    if (err) console.error('append failed', file, err.message)
  })
}

function readLines(file, max = 100_000) {
  if (!fs.existsSync(file)) return []
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)
  return lines.slice(-max).flatMap((l) => {
    try {
      return [JSON.parse(l)]
    } catch {
      return []
    }
  })
}

function adminAuthed(req) {
  if (!ADMIN_PASSWORD) return false
  const key = String(req.headers['x-admin-key'] || '')
  const a = Buffer.from(key)
  const b = Buffer.from(ADMIN_PASSWORD)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '16kb' }))

app.post('/api/track', (req, res) => {
  const { event, props, sid } = req.body || {}
  if (!ALLOWED_EVENTS.has(event)) return res.status(400).json({ ok: false })
  const safeProps = {}
  if (props && typeof props === 'object') {
    for (const [k, v] of Object.entries(props).slice(0, 12)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') safeProps[clip(k, 40)] = clip(v)
    }
  }
  appendLine(EVENTS_FILE, { ts: new Date().toISOString(), sid: clip(String(sid || 'anon'), 64), event, props: safeProps })
  res.json({ ok: true })
})

app.post('/api/quote-lead', async (req, res) => {
  const { name, org, email, phone, context } = req.body || {}
  if (!name || !email) return res.status(400).json({ ok: false, error: 'name and email required' })
  const record = {
    ts: new Date().toISOString(),
    name: clip(String(name)),
    org: clip(String(org || '')),
    email: clip(String(email)),
    phone: clip(String(phone || '')),
    context: context && typeof context === 'object' ? context : {},
  }
  appendLine(LEADS_FILE, record)
  appendLine(EVENTS_FILE, {
    ts: record.ts,
    sid: 'server',
    event: 'quote_submitted',
    props: { model: clip(String(record.context.model || '')), source: 'lead' },
  })
  if (GHL_WEBHOOK_URL) {
    try {
      await fetch(GHL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      })
    } catch (err) {
      console.error('GHL webhook failed:', err.message)
    }
  }
  res.json({ ok: true })
})

app.get('/api/admin/summary', (req, res) => {
  if (!adminAuthed(req)) return res.status(401).json({ ok: false })
  const events = readLines(EVENTS_FILE)
  const leads = readLines(LEADS_FILE)

  const count = (pred) => events.filter(pred).length
  const tally = (keyFn) => {
    const out = {}
    for (const e of events) {
      const k = keyFn(e)
      if (k) out[k] = (out[k] || 0) + 1
    }
    return Object.entries(out).sort((a, b) => b[1] - a[1])
  }

  const sessions = new Set(events.map((e) => e.sid).filter((s) => s && s !== 'server')).size
  const savings = events
    .filter((e) => e.event === 'quote_viewed' && typeof e.props?.saving === 'number')
    .map((e) => e.props.saving)

  const usageBucket = (t) => {
    if (typeof t !== 'number') return null
    if (t < 2_000_000) return 'Light (<2M/day)'
    if (t < 10_000_000) return 'Moderate (2–10M)'
    if (t < 35_000_000) return 'Heavy (10–35M)'
    return 'Intensive (35M+)'
  }

  res.json({
    ok: true,
    totals: {
      pageViews: count((e) => e.event === 'quote_page_viewed'),
      sessions,
      quotesViewed: count((e) => e.event === 'quote_viewed'),
      leads: leads.length,
      avgSavingViewed: savings.length ? Math.round(savings.reduce((a, b) => a + b, 0) / savings.length) : null,
    },
    models: tally((e) => (e.event === 'model_selected' ? e.props?.model : null)),
    comparators: tally((e) => (e.event === 'comparator_changed' || e.event === 'quote_viewed' ? e.props?.vs : null)),
    usage: tally((e) => (e.event === 'quote_viewed' ? usageBucket(e.props?.tokensPerDay) : null)),
    terms: tally((e) => (e.event === 'quote_viewed' ? String(e.props?.term ?? '') || null : null)),
    recentEvents: events.slice(-60).reverse(),
    leads: leads.slice(-200).reverse(),
  })
})

// ---- static SPA
app.use(express.static(DIST, { maxAge: '1h', index: false }))
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next()
  res.sendFile(path.join(DIST, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`infersia server on :${PORT} (data: ${DATA_DIR}${ADMIN_PASSWORD ? ', admin enabled' : ', ADMIN DISABLED — set ADMIN_PASSWORD'})`)
})
