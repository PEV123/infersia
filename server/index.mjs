// Infersia server — serves the built SPA plus a first-party API:
//   POST /api/track              anonymous usage events from the quote page
//   POST /api/quote-lead         lead capture ("Lock this quote")
//   GET  /api/booking/slots      public: available call slots
//   POST /api/booking            public: book a call (creates/links a lead)
//   GET/PATCH/POST /api/admin/*  CRM: leads, bookings, calendar settings (x-admin-key)
// Storage lives on DATA_DIR (a Render persistent disk in prod):
//   events.ndjson (append-only analytics) · leads.json · bookings.json · settings.json

import crypto from 'node:crypto'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CHANNEL_LABELS, classifyReferrer, classifyUA } from './classify.mjs'
import { createGoogle } from './google.mjs'
import { renderHead, routeMeta, sitemapXml } from './seo.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', 'dist')
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data-local')
const EVENTS_FILE = path.join(DATA_DIR, 'events.ndjson')
const PORT = process.env.PORT || 8790
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''

fs.mkdirSync(DATA_DIR, { recursive: true })

// ---------- tiny JSON document store ----------

function docPath(name) {
  return path.join(DATA_DIR, name + '.json')
}

function loadDoc(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(docPath(name), 'utf8'))
  } catch {
    return fallback
  }
}

function saveDoc(name, value) {
  const tmp = docPath(name) + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2))
  fs.renameSync(tmp, docPath(name))
}

const DEFAULT_SETTINGS = {
  timezone: 'Australia/Sydney',
  slotMinutes: 20,
  bufferMinutes: 10,
  leadTimeHours: 12,
  horizonDays: 21,
  week: {
    mon: ['09:00-12:00', '13:00-17:00'],
    tue: ['09:00-12:00', '13:00-17:00'],
    wed: ['09:00-12:00', '13:00-17:00'],
    thu: ['09:00-12:00', '13:00-17:00'],
    fri: ['09:00-12:00', '13:00-16:00'],
    sat: [],
    sun: [],
  },
  blackouts: [],
  // "look busier": deterministically hide this % of otherwise-open public
  // slots so early-stage availability reads as in-demand. Admin always sees
  // and can book the real availability. 0 = show everything.
  hideSlotsPercent: 0,
}

// stable string hash so a given slot is consistently shown or hidden
function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

let leads = loadDoc('leads', null)
let bookings = loadDoc('bookings', [])
let blocks = loadDoc('blocks', []) // admin availability blocks: {id, ts, start, end, reason}
let settings = { ...DEFAULT_SETTINGS, ...loadDoc('settings', {}) }

const CAL_FEED_KEY = process.env.CALENDAR_FEED_KEY || ''
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'sales@infersia.com.au'
const google = createGoogle({ loadDoc, saveDoc, site: 'https://www.infersia.com.au' })

const fmtWhen = (iso) =>
  new Intl.DateTimeFormat('en-AU', {
    timeZone: settings.timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))

// one-time migration from the original append-only lead log
if (leads === null) {
  leads = []
  const legacy = path.join(DATA_DIR, 'leads.ndjson')
  if (fs.existsSync(legacy)) {
    for (const line of fs.readFileSync(legacy, 'utf8').split('\n').filter(Boolean)) {
      try {
        const l = JSON.parse(line)
        leads.push({
          id: crypto.randomUUID(),
          ts: l.ts,
          updatedAt: l.ts,
          name: l.name,
          org: l.org || '',
          email: l.email,
          phone: l.phone || '',
          source: 'quote',
          status: 'new',
          context: l.context || {},
          notes: [],
        })
      } catch {
        /* skip bad lines */
      }
    }
  }
  saveDoc('leads', leads)
}

// ---------- analytics ----------

const ALLOWED_EVENTS = new Set([
  'page_view',
  'quote_page_viewed',
  'model_selected',
  'usage_changed',
  'comparator_changed',
  'quote_viewed',
  'quote_submitted',
  'call_booked',
])

const clip = (v, n = 300) => (typeof v === 'string' ? v.slice(0, n) : v)

function appendEvent(obj) {
  fs.appendFile(EVENTS_FILE, JSON.stringify(obj) + '\n', (err) => {
    if (err) console.error('append failed', err.message)
  })
}

function readEvents(max = 100_000) {
  if (!fs.existsSync(EVENTS_FILE)) return []
  const lines = fs.readFileSync(EVENTS_FILE, 'utf8').split('\n').filter(Boolean)
  return lines.slice(-max).flatMap((l) => {
    try {
      return [JSON.parse(l)]
    } catch {
      return []
    }
  })
}

// ---------- timezone-correct slot engine (no deps) ----------

function tzOffsetMs(date, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]))
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, p.hour === '24' ? 0 : +p.hour, +p.minute, +p.second)
  return asUtc - date.getTime()
}

function zonedToUtc(dateStr, timeStr, tz) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)
  let utc = Date.UTC(y, m - 1, d, hh, mm)
  for (let i = 0; i < 2; i++) {
    utc = Date.UTC(y, m - 1, d, hh, mm) - tzOffsetMs(new Date(utc), tz)
  }
  return new Date(utc)
}

function dateStrInTz(date, tz) {
  const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
  return dtf.format(date)
}

function weekdayKeyInTz(dateStr, tz) {
  const probe = zonedToUtc(dateStr, '12:00', tz)
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(probe).toLowerCase()
  return wd.slice(0, 3)
}

const RANGE_RE = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/

// public=true applies the "look busier" decoy; the admin path passes false.
function computeSlots(public_ = true) {
  const { timezone, slotMinutes, bufferMinutes, leadTimeHours, horizonDays, week, blackouts } = settings
  const hidePct = public_ ? Math.min(Math.max(Number(settings.hideSlotsPercent) || 0, 0), 90) : 0
  const now = Date.now()
  const earliest = now + leadTimeHours * 3600_000
  const blocked = bookings
    .filter((b) => b.status === 'confirmed')
    .map((b) => [new Date(b.start).getTime(), new Date(b.end).getTime() + bufferMinutes * 60_000])
  // availability blocks: exact intervals, no buffer padding
  const availBlocks = blocks.map((b) => [new Date(b.start).getTime(), new Date(b.end).getTime()])

  const days = []
  for (let i = 0; i < horizonDays; i++) {
    const dayDate = new Date(now + i * 86_400_000)
    const dateStr = dateStrInTz(dayDate, timezone)
    if (blackouts.includes(dateStr)) continue
    const ranges = week[weekdayKeyInTz(dateStr, timezone)] || []
    const slots = []
    for (const range of ranges) {
      if (!RANGE_RE.test(range)) continue
      const [startT, endT] = range.split('-')
      const rangeStart = zonedToUtc(dateStr, startT, timezone).getTime()
      const rangeEnd = zonedToUtc(dateStr, endT, timezone).getTime()
      const step = (slotMinutes + bufferMinutes) * 60_000
      for (let s = rangeStart; s + slotMinutes * 60_000 <= rangeEnd; s += step) {
        const e = s + slotMinutes * 60_000
        if (s < earliest) continue
        const clash = blocked.some(([bs, be]) => s < be && bs < e + bufferMinutes * 60_000)
        if (clash) continue
        if (availBlocks.some(([bs, be]) => s < be && bs < e)) continue
        slots.push({ start: new Date(s).toISOString(), end: new Date(e).toISOString() })
      }
    }
    // "look busier": drop the lowest-hashed slots, but always leave at least 2
    let shown = slots
    if (hidePct > 0 && slots.length > 2) {
      const target = Math.floor((slots.length * hidePct) / 100)
      const hideCount = Math.min(target, slots.length - 2)
      if (hideCount > 0) {
        const ranked = slots
          .map((sl) => ({ sl, h: hashStr(sl.start) }))
          .sort((a, b) => a.h - b.h)
        const hidden = new Set(ranked.slice(0, hideCount).map((x) => x.sl.start))
        shown = slots.filter((sl) => !hidden.has(sl.start))
      }
    }
    if (shown.length) days.push({ date: dateStr, slots: shown })
  }
  return { timezone, slotMinutes, days }
}

// ---------- helpers ----------

function adminAuthed(req) {
  if (!ADMIN_PASSWORD) return false
  const key = String(req.headers['x-admin-key'] || '')
  const a = Buffer.from(key)
  const b = Buffer.from(ADMIN_PASSWORD)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function requireAdmin(req, res, next) {
  if (!adminAuthed(req)) return res.status(401).json({ ok: false })
  next()
}

function findOrCreateLead({ name, email, org, phone, source, context }) {
  const existing = leads.find((l) => l.email.toLowerCase() === String(email).toLowerCase())
  if (existing) {
    existing.updatedAt = new Date().toISOString()
    if (context && Object.keys(context).length) existing.context = { ...existing.context, ...context }
    if (phone && !existing.phone) existing.phone = clip(String(phone), 60)
    if (org && !existing.org) existing.org = clip(String(org))
    saveDoc('leads', leads)
    return existing
  }
  const lead = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: clip(String(name)),
    org: clip(String(org || '')),
    email: clip(String(email)),
    phone: clip(String(phone || ''), 60),
    source,
    status: 'new',
    context: context || {},
    notes: [],
  }
  leads.push(lead)
  saveDoc('leads', leads)
  return lead
}

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'quoted', 'won', 'lost']

// ---------- app ----------

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '16kb' }))

// canonical host: the onrender.com origin must not be indexed alongside the real domain
app.use((req, res, next) => {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
  if (host === 'infersia.onrender.com' || host === 'infersia.com.au') {
    return res.redirect(301, 'https://www.infersia.com.au' + req.originalUrl)
  }
  next()
})

app.post('/api/track', (req, res) => {
  const { event, props, sid } = req.body || {}
  if (!ALLOWED_EVENTS.has(event)) return res.status(400).json({ ok: false })
  const safeProps = {}
  if (props && typeof props === 'object') {
    for (const [k, v] of Object.entries(props).slice(0, 14)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') safeProps[clip(k, 40)] = clip(v, 400)
    }
  }
  // server-side UA classification (more reliable than trusting the client)
  const { bot, name: uaName } = classifyUA(req.headers['user-agent'])
  if (event === 'page_view') {
    safeProps.bot = bot
    safeProps.ua = uaName
    const landing = {}
    for (const p of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'msclkid']) {
      if (safeProps[p]) landing[p] = safeProps[p]
    }
    const c = classifyReferrer(safeProps.ref, landing)
    safeProps.channel = c.channel
    safeProps.source = c.label
    if (c.term) safeProps.term = c.term
  }
  appendEvent({ ts: new Date().toISOString(), sid: clip(String(sid || 'anon'), 64), event, props: safeProps })
  res.json({ ok: true })
})

app.post('/api/quote-lead', (req, res) => {
  const { name, org, email, phone, context } = req.body || {}
  if (!name || !email) return res.status(400).json({ ok: false, error: 'name and email required' })
  const lead = findOrCreateLead({
    name,
    email,
    org,
    phone,
    source: 'quote',
    context: context && typeof context === 'object' ? context : {},
  })
  appendEvent({
    ts: new Date().toISOString(),
    sid: 'server',
    event: 'quote_submitted',
    props: { model: clip(String(lead.context.model || '')), source: 'lead' },
  })
  const ctx = lead.context || {}
  void google.sendMail({
    to: NOTIFY_EMAIL,
    subject: `New quote lead — ${lead.name}${lead.org ? ` (${lead.org})` : ''}${ctx.modelName ? ` — ${ctx.modelName}` : ''}`,
    text: [
      `${lead.name}${lead.org ? ` — ${lead.org}` : ''}`,
      `${lead.email}${lead.phone ? ` · ${lead.phone}` : ''}`,
      '',
      ctx.modelName ? `Model: ${ctx.modelName}${ctx.tier ? ` (${ctx.tier})` : ''}` : null,
      typeof ctx.tokensPerDay === 'number' ? `Usage: ${(ctx.tokensPerDay / 1e6).toLocaleString()}M tokens/day · ${ctx.term ?? '?'} months` : null,
      ctx.comparator ? `Compared against: ${ctx.comparator}` : null,
      typeof ctx.annualSaving === 'number' ? `Saving shown: AU$${Math.round(ctx.annualSaving).toLocaleString()}/yr` : null,
      '',
      'Leads: https://www.infersia.com.au/admin',
    ]
      .filter((l) => l !== null)
      .join('\n'),
  })
  res.json({ ok: true, leadId: lead.id })
})

// ---------- public booking ----------

app.get('/api/booking/slots', (_req, res) => {
  res.json({ ok: true, ...computeSlots() })
})

app.post('/api/booking', async (req, res) => {
  const { start, name, email, org, phone, note } = req.body || {}
  if (!start || !name || !email) return res.status(400).json({ ok: false, error: 'missing fields' })
  const { days, slotMinutes } = computeSlots()
  const slot = days.flatMap((d) => d.slots).find((s) => s.start === start)
  if (!slot) return res.status(409).json({ ok: false, error: 'slot unavailable' })

  const lead = findOrCreateLead({ name, email, org, phone, source: 'booking', context: {} })
  const booking = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    leadId: lead.id,
    name: clip(String(name)),
    email: clip(String(email)),
    org: clip(String(org || '')),
    phone: clip(String(phone || ''), 60),
    note: clip(String(note || ''), 600),
    start: slot.start,
    end: slot.end,
    durationMin: slotMinutes,
    status: 'confirmed',
  }
  bookings.push(booking)
  saveDoc('bookings', bookings)
  lead.notes.push({ ts: booking.ts, text: `Booked a ${slotMinutes}-minute call for ${slot.start}` })
  lead.updatedAt = booking.ts
  saveDoc('leads', leads)
  appendEvent({ ts: booking.ts, sid: 'server', event: 'call_booked', props: { bookingId: booking.id } })

  const gcal = await google.createEvent(booking)
  if (gcal) {
    booking.gcalEventId = gcal.id
    booking.meetLink = gcal.meetLink
    saveDoc('bookings', bookings)
  }

  void google.sendMail({
    to: NOTIFY_EMAIL,
    subject: `New call booked — ${booking.name}${booking.org ? ` (${booking.org})` : ''} — ${fmtWhen(booking.start)}`,
    text: [
      `${booking.name}${booking.org ? ` — ${booking.org}` : ''}`,
      `${booking.email}${booking.phone ? ` · ${booking.phone}` : ''}`,
      '',
      `When: ${fmtWhen(booking.start)} (${slotMinutes} min, ${settings.timezone})`,
      booking.meetLink ? `Meet: ${booking.meetLink}` : null,
      booking.note ? `Note: ${booking.note}` : null,
      '',
      'Calendar: https://www.infersia.com.au/admin',
    ]
      .filter((l) => l !== null)
      .join('\n'),
  })

  res.json({
    ok: true,
    booking: {
      id: booking.id,
      start: booking.start,
      end: booking.end,
      durationMin: slotMinutes,
      meetLink: booking.meetLink || null,
    },
  })
})

// ---------- admin: summary ----------

app.get('/api/admin/summary', requireAdmin, (_req, res) => {
  const events = readEvents()
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

  // ---- site traffic, split human vs bot ----
  // page_view fires from the browser (JS) — flagged bot if the UA is a JS-capable bot.
  // page_request is logged server-side only for non-JS crawlers.
  const allViews = events.filter((e) => e.event === 'page_view')
  const human = allViews.filter((e) => !e.props?.bot)
  const botViews = allViews.filter((e) => e.props?.bot)
  const crawlerReqs = events.filter((e) => e.event === 'page_request')
  const botAll = [...botViews, ...crawlerReqs]

  const days = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)
    days.push([
      d.slice(5),
      human.filter((e) => (e.ts || '').startsWith(d)).length,
      botAll.filter((e) => (e.ts || '').startsWith(d)).length,
    ])
  }

  const tallyOf = (list, keyFn) => {
    const out = {}
    for (const e of list) {
      const k = keyFn(e)
      if (k) out[k] = (out[k] || 0) + 1
    }
    return Object.entries(out).sort((a, b) => b[1] - a[1])
  }

  res.json({
    ok: true,
    totals: {
      siteViews: human.length,
      siteSessions: new Set(human.map((e) => e.sid)).size,
      botHits: botAll.length,
      pageViews: events.filter((e) => e.event === 'quote_page_viewed').length,
      sessions,
      quotesViewed: events.filter((e) => e.event === 'quote_viewed').length,
      leads: leads.length,
      bookings: bookings.filter((b) => b.status === 'confirmed').length,
      avgSavingViewed: savings.length ? Math.round(savings.reduce((a, b) => a + b, 0) / savings.length) : null,
    },
    traffic: {
      daily: days,
      pages: tallyOf(human, (e) => e.props?.path).slice(0, 20),
      channels: tallyOf(human, (e) => CHANNEL_LABELS[e.props?.channel] || 'Direct / none').slice(0, 8),
      referrers: tallyOf(human, (e) => (e.props?.channel && e.props.channel !== 'direct' ? e.props?.source : null)).slice(0, 14),
      searchTerms: tallyOf(human, (e) => (e.props?.term ? e.props.term : null)).slice(0, 20),
      campaigns: tallyOf(human, (e) =>
        e.props?.channel === 'paid' || e.props?.channel === 'campaign' || e.props?.channel === 'email'
          ? `${e.props?.source}${e.props?.term ? ` — ${e.props.term}` : ''}`
          : null
      ).slice(0, 12),
      bots: tallyOf(botAll, (e) => e.props?.ua || 'Other bot').slice(0, 16),
      botPages: tallyOf(botAll, (e) => e.props?.path).slice(0, 12),
    },
    models: tally((e) => (e.event === 'model_selected' ? e.props?.model : null)),
    comparators: tally((e) => (e.event === 'comparator_changed' || e.event === 'quote_viewed' ? e.props?.vs : null)),
    usage: tally((e) => (e.event === 'quote_viewed' ? usageBucket(e.props?.tokensPerDay) : null)),
    terms: tally((e) => (e.event === 'quote_viewed' ? String(e.props?.term ?? '') || null : null)),
    recentEvents: events.slice(-60).reverse(),
  })
})

// ---------- admin: leads (CRM) ----------

app.get('/api/admin/leads', requireAdmin, (_req, res) => {
  const withBookings = leads
    .slice()
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .map((l) => ({ ...l, bookings: bookings.filter((b) => b.leadId === l.id) }))
  res.json({ ok: true, leads: withBookings, statuses: LEAD_STATUSES })
})

app.post('/api/admin/leads', requireAdmin, (req, res) => {
  const { name, email, org, phone, note } = req.body || {}
  if (!name || !email) return res.status(400).json({ ok: false, error: 'name and email required' })
  const lead = findOrCreateLead({ name, email, org, phone, source: 'manual', context: {} })
  if (note) {
    lead.notes.push({ ts: new Date().toISOString(), text: clip(String(note), 1000) })
    saveDoc('leads', leads)
  }
  res.json({ ok: true, lead })
})

app.patch('/api/admin/leads/:id', requireAdmin, (req, res) => {
  const lead = leads.find((l) => l.id === req.params.id)
  if (!lead) return res.status(404).json({ ok: false })
  const { status } = req.body || {}
  if (status && LEAD_STATUSES.includes(status)) lead.status = status
  lead.updatedAt = new Date().toISOString()
  saveDoc('leads', leads)
  res.json({ ok: true, lead })
})

app.post('/api/admin/leads/:id/notes', requireAdmin, (req, res) => {
  const lead = leads.find((l) => l.id === req.params.id)
  if (!lead) return res.status(404).json({ ok: false })
  const text = clip(String(req.body?.text || ''), 1000)
  if (!text) return res.status(400).json({ ok: false })
  lead.notes.push({ ts: new Date().toISOString(), text })
  lead.updatedAt = new Date().toISOString()
  saveDoc('leads', leads)
  res.json({ ok: true, lead })
})

// ---------- admin: bookings / calendar ----------

app.get('/api/admin/bookings', requireAdmin, (_req, res) => {
  const sorted = bookings.slice().sort((a, b) => (a.start < b.start ? -1 : 1))
  res.json({ ok: true, bookings: sorted })
})

app.post('/api/admin/bookings', requireAdmin, async (req, res) => {
  const { start, durationMin, name, email, org, phone, note } = req.body || {}
  const startDate = new Date(String(start))
  if (Number.isNaN(startDate.getTime()) || !name) return res.status(400).json({ ok: false, error: 'valid start and name required' })
  const dur = Math.min(Math.max(Number(durationMin) || settings.slotMinutes, 5), 240)
  let leadId = null
  if (email) leadId = findOrCreateLead({ name, email, org, phone, source: 'manual', context: {} }).id
  const booking = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    leadId,
    name: clip(String(name)),
    email: clip(String(email || '')),
    org: clip(String(org || '')),
    phone: clip(String(phone || ''), 60),
    note: clip(String(note || ''), 600),
    start: startDate.toISOString(),
    end: new Date(startDate.getTime() + dur * 60_000).toISOString(),
    durationMin: dur,
    status: 'confirmed',
  }
  bookings.push(booking)
  saveDoc('bookings', bookings)
  const gcal = await google.createEvent(booking)
  if (gcal) {
    booking.gcalEventId = gcal.id
    booking.meetLink = gcal.meetLink
    saveDoc('bookings', bookings)
  }
  res.json({ ok: true, booking })
})

app.patch('/api/admin/bookings/:id', requireAdmin, async (req, res) => {
  const booking = bookings.find((b) => b.id === req.params.id)
  if (!booking) return res.status(404).json({ ok: false })
  const { status } = req.body || {}
  if (['confirmed', 'cancelled', 'completed'].includes(status)) booking.status = status
  saveDoc('bookings', bookings)
  if (status === 'cancelled' && booking.gcalEventId) {
    await google.deleteEvent(booking.gcalEventId)
    booking.gcalEventId = null
    booking.meetLink = ''
    saveDoc('bookings', bookings)
  }
  res.json({ ok: true, booking })
})

// ---------- admin: availability blocks ----------

app.get('/api/admin/blocks', requireAdmin, (_req, res) => {
  const sorted = blocks.slice().sort((a, b) => (a.start < b.start ? -1 : 1))
  res.json({ ok: true, blocks: sorted })
})

app.post('/api/admin/blocks', requireAdmin, (req, res) => {
  const { start, end, reason } = req.body || {}
  const s = new Date(String(start))
  const e = new Date(String(end))
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    return res.status(400).json({ ok: false, error: 'valid start and end required' })
  }
  if (e.getTime() <= s.getTime()) return res.status(400).json({ ok: false, error: 'end must be after start' })
  if (e.getTime() - s.getTime() > 7 * 86_400_000) {
    return res.status(400).json({ ok: false, error: 'block too long — 7 days max per block' })
  }
  const block = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    start: s.toISOString(),
    end: e.toISOString(),
    reason: clip(String(reason || ''), 200),
  }
  blocks.push(block)
  saveDoc('blocks', blocks)
  res.json({ ok: true, block })
})

app.delete('/api/admin/blocks/:id', requireAdmin, (req, res) => {
  const before = blocks.length
  blocks = blocks.filter((b) => b.id !== req.params.id)
  if (blocks.length === before) return res.status(404).json({ ok: false })
  saveDoc('blocks', blocks)
  res.json({ ok: true })
})

// ---------- calendar feed (ICS) + Google Calendar sync ----------

const icsEsc = (s) =>
  String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const icsDate = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

app.get('/api/calendar.ics', (req, res) => {
  if (!CAL_FEED_KEY || req.query.key !== CAL_FEED_KEY) return res.status(401).send('unauthorised')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Infersia//Bookings//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Infersia bookings',
  ]
  for (const b of bookings) {
    if (b.status === 'cancelled') continue
    lines.push(
      'BEGIN:VEVENT',
      `UID:${b.id}@infersia.com.au`,
      `DTSTAMP:${icsDate(b.ts)}`,
      `DTSTART:${icsDate(b.start)}`,
      `DTEND:${icsDate(b.end)}`,
      `SUMMARY:${icsEsc(`Infersia call — ${b.name}${b.org ? ` (${b.org})` : ''}`)}`,
      `DESCRIPTION:${icsEsc([b.phone && `Phone: ${b.phone}`, b.email && `Email: ${b.email}`, b.note].filter(Boolean).join('\n'))}`,
      ...(b.meetLink ? [`LOCATION:${icsEsc(b.meetLink)}`] : []),
      'END:VEVENT'
    )
  }
  for (const bl of blocks) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:block-${bl.id}@infersia.com.au`,
      `DTSTAMP:${icsDate(bl.ts)}`,
      `DTSTART:${icsDate(bl.start)}`,
      `DTEND:${icsDate(bl.end)}`,
      `SUMMARY:${icsEsc(`Blocked${bl.reason ? ` — ${bl.reason}` : ''}`)}`,
      'END:VEVENT'
    )
  }
  lines.push('END:VCALENDAR')
  res.type('text/calendar').send(lines.join('\r\n'))
})

app.get('/api/admin/google/status', requireAdmin, (_req, res) => {
  res.json({
    ok: true,
    ...google.status(),
    icsUrl: CAL_FEED_KEY ? `https://www.infersia.com.au/api/calendar.ics?key=${CAL_FEED_KEY}` : null,
  })
})

app.get('/api/admin/google/auth-url', requireAdmin, (_req, res) => {
  if (!google.configured()) return res.status(400).json({ ok: false, error: 'GOOGLE_CLIENT_ID/SECRET not set' })
  res.json({ ok: true, url: google.authUrl() })
})

app.post('/api/admin/google/disconnect', requireAdmin, async (_req, res) => {
  await google.disconnect()
  res.json({ ok: true })
})

app.get('/api/google/callback', async (req, res) => {
  try {
    await google.handleCallback(req.query.code, req.query.state)
    res.redirect('/admin?google=connected')
  } catch (err) {
    console.error('google callback failed:', err.message)
    res.redirect('/admin?google=error')
  }
})

// ---------- admin: calendar settings ----------

app.get('/api/admin/settings', requireAdmin, (_req, res) => {
  res.json({ ok: true, settings })
})

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const s = req.body || {}
  const next = { ...settings }
  if (typeof s.timezone === 'string') {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: s.timezone })
      next.timezone = s.timezone
    } catch {
      return res.status(400).json({ ok: false, error: 'invalid timezone' })
    }
  }
  const num = (v, min, max, dflt) => {
    const n = Number(v)
    return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), min), max) : dflt
  }
  next.slotMinutes = num(s.slotMinutes, 5, 120, next.slotMinutes)
  next.bufferMinutes = num(s.bufferMinutes, 0, 60, next.bufferMinutes)
  next.leadTimeHours = num(s.leadTimeHours, 0, 168, next.leadTimeHours)
  next.horizonDays = num(s.horizonDays, 1, 90, next.horizonDays)
  next.hideSlotsPercent = num(s.hideSlotsPercent, 0, 90, next.hideSlotsPercent ?? 0)
  if (s.week && typeof s.week === 'object') {
    const week = {}
    for (const day of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
      const ranges = Array.isArray(s.week[day]) ? s.week[day] : []
      week[day] = ranges.filter((r) => typeof r === 'string' && RANGE_RE.test(r.trim())).map((r) => r.trim())
    }
    next.week = week
  }
  if (Array.isArray(s.blackouts)) {
    next.blackouts = s.blackouts
      .filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim()))
      .map((d) => d.trim())
  }
  settings = next
  saveDoc('settings', settings)
  res.json({ ok: true, settings })
})

// ---------- SEO endpoints ----------

app.get('/sitemap.xml', (_req, res) => {
  res.type('application/xml').send(sitemapXml())
})

// ---------- static SPA with per-route meta injection ----------

let indexTemplate = null
function getIndexTemplate() {
  if (indexTemplate === null) {
    try {
      indexTemplate = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
    } catch {
      indexTemplate = false
    }
  }
  return indexTemplate
}

app.use(express.static(DIST, { maxAge: '1h', index: false }))
app.use((req, res, next) => {
  if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api/')) return next()
  const template = getIndexTemplate()
  if (!template) return res.status(503).send('build missing')
  // Log HTML fetches by crawlers that don't run JS (so they never fire the
  // client page_view). Humans are captured client-side and skipped here to
  // avoid double-counting. /admin is excluded.
  const uaClass = classifyUA(req.headers['user-agent'])
  if (uaClass.bot && req.method === 'GET' && !req.path.startsWith('/admin')) {
    appendEvent({
      ts: new Date().toISOString(),
      sid: 'crawler',
      event: 'page_request',
      props: { path: clip(req.path, 120), bot: true, ua: uaClass.name },
    })
  }
  const meta = routeMeta(req.path)
  if (meta.robots && meta.robots.includes('noindex')) res.set('X-Robots-Tag', 'noindex')
  // hashed assets cache long; the shell must always revalidate so deploys show up
  res.set('Cache-Control', 'no-cache')
  const html = template
    .replace(/<title>.*?<\/title>/, '')
    .replace(/<meta\s+name="description"[^>]*>/i, '')
    .replace('<!--%SEO%-->', renderHead(meta))
  res.type('html').send(html)
})

app.listen(PORT, () => {
  console.log(
    `infersia server on :${PORT} (data: ${DATA_DIR}${ADMIN_PASSWORD ? ', admin enabled' : ', ADMIN DISABLED — set ADMIN_PASSWORD'})`
  )
})
