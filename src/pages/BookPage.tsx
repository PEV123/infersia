import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Footer } from '../components/Footer'
import { usePageMeta } from '../lib/usePageMeta'
import { STATIC_META } from '../seo/shared.mjs'

type Slot = { start: string; end: string }
type SlotDay = { date: string; slots: Slot[] }
type SlotsPayload = { ok: boolean; timezone: string; slotMinutes: number; days: SlotDay[] }

type Prefill = { name?: string; org?: string; email?: string; phone?: string }

function readPrefill(): Prefill {
  try {
    return JSON.parse(sessionStorage.getItem('infersia_lead_prefill') ?? '{}') as Prefill
  } catch {
    return {}
  }
}

const dayLabel = (dateStr: string): { top: string; big: string } => {
  const d = new Date(dateStr + 'T12:00:00')
  return {
    top: d.toLocaleDateString('en-AU', { weekday: 'short' }),
    big: d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
  }
}

const timeLabel = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export function BookPage() {
  const [data, setData] = useState<SlotsPayload | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [dayIdx, setDayIdx] = useState(0)
  const [slot, setSlot] = useState<Slot | null>(null)
  const prefill = useMemo(readPrefill, [])
  const [form, setForm] = useState({
    name: prefill.name ?? '',
    org: prefill.org ?? '',
    email: prefill.email ?? '',
    phone: prefill.phone ?? '',
    note: '',
  })
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'clash' | 'error'>('idle')
  const [confirmed, setConfirmed] = useState<{
    start: string
    end: string
    durationMin: number
    meetLink?: string | null
  } | null>(null)

  usePageMeta(STATIC_META['/book'].title, STATIC_META['/book'].description)
  useEffect(() => {
    fetch('/api/booking/slots')
      .then((r) => r.json())
      .then((d: SlotsPayload) => setData(d))
      .catch(() => setLoadError(true))
  }, [])

  const localTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
  const day = data?.days[dayIdx] ?? null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!slot) return
    setState('sending')
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: slot.start, ...form }),
      })
      if (res.status === 409) {
        setState('clash')
        const fresh = (await fetch('/api/booking/slots').then((r) => r.json())) as SlotsPayload
        setData(fresh)
        setSlot(null)
        return
      }
      if (!res.ok) throw new Error(String(res.status))
      const json = (await res.json()) as {
        booking: { start: string; end: string; durationMin: number; meetLink?: string | null }
      }
      setConfirmed(json.booking)
      setState('done')
    } catch {
      setState('error')
    }
  }

  return (
    <>
      <main id="main" className="page book-page">
        <div className="container-narrow">
          <header className="page-rise">
            <p className="eyebrow">Book a call</p>
            <h1 className="page-title">
              Twenty minutes, <em>well spent.</em>
            </h1>
            <p className="page-standfirst">
              A short call with someone technical, in Australia — about your models, your data obligations, and what
              dedicated sovereign hosting would look like for you. No deck, no pressure.
            </p>
          </header>

          {state === 'done' && confirmed ? (
            <div className="lead-done book-done" role="status">
              <p className="lead-done-title">Call booked.</p>
              <p>
                {new Date(confirmed.start).toLocaleDateString('en-AU', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}{' '}
                at {timeLabel(confirmed.start)} ({confirmed.durationMin} minutes, your local time). We'll call you on
                the details you provided.
              </p>
              {confirmed.meetLink && (
                <p className="book-done-meet">
                  Google Meet: <a href={confirmed.meetLink}>{confirmed.meetLink}</a>
                  <br />
                  <span className="book-done-alt">A calendar invite has been sent to your email.</span>
                </p>
              )}
              <p className="book-done-alt">
                Need to change it? Email <a href="mailto:sales@infersia.com.au">sales@infersia.com.au</a>
              </p>
            </div>
          ) : (
            <div className="page-rise">
              {loadError && (
                <p className="est-empty">
                  Couldn't load availability — email <a href="mailto:sales@infersia.com.au">sales@infersia.com.au</a>{' '}
                  and we'll set a time.
                </p>
              )}
              {data && data.days.length === 0 && (
                <p className="est-empty">
                  No open slots right now — email <a href="mailto:sales@infersia.com.au">sales@infersia.com.au</a> and
                  we'll find a time.
                </p>
              )}
              {data && data.days.length > 0 && (
                <>
                  <p className="adv-label mono">1 — Pick a day</p>
                  <div className="day-strip" role="group" aria-label="Available days">
                    {data.days.map((d, i) => {
                      const l = dayLabel(d.date)
                      return (
                        <button
                          key={d.date}
                          type="button"
                          className={i === dayIdx ? 'day-chip active' : 'day-chip'}
                          aria-pressed={i === dayIdx}
                          onClick={() => {
                            setDayIdx(i)
                            setSlot(null)
                          }}
                        >
                          <span className="day-chip-top mono">{l.top}</span>
                          <span className="day-chip-big">{l.big}</span>
                          <span className="day-chip-n mono">{d.slots.length} slots</span>
                        </button>
                      )
                    })}
                  </div>

                  <p className="adv-label mono book-step2">
                    2 — Pick a time <span className="tz-note">times shown in your timezone ({localTz})</span>
                  </p>
                  <div className="slot-grid" role="group" aria-label="Available times">
                    {day?.slots.map((s) => (
                      <button
                        key={s.start}
                        type="button"
                        className={slot?.start === s.start ? 'slot-pill active' : 'slot-pill'}
                        aria-pressed={slot?.start === s.start}
                        onClick={() => setSlot(s)}
                      >
                        {timeLabel(s.start)}
                      </button>
                    ))}
                  </div>

                  {slot && (
                    <form className="enquiry-form book-form" onSubmit={submit}>
                      <p className="adv-label mono">3 — Your details</p>
                      <p className="enquiry-interest">
                        <span className="mono">
                          {new Date(slot.start).toLocaleDateString('en-AU', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}{' '}
                          · {timeLabel(slot.start)} · {data.slotMinutes} min
                        </span>
                      </p>
                      <div className="form-row">
                        <div className="field">
                          <label className="mono" htmlFor="b-name">Name</label>
                          <input id="b-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
                        </div>
                        <div className="field">
                          <label className="mono" htmlFor="b-org">Organisation</label>
                          <input id="b-org" value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} autoComplete="organization" />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="field">
                          <label className="mono" htmlFor="b-email">Email</label>
                          <input id="b-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
                        </div>
                        <div className="field">
                          <label className="mono" htmlFor="b-phone">Phone (we'll call this)</label>
                          <input id="b-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
                        </div>
                      </div>
                      <div className="field">
                        <label className="mono" htmlFor="b-note">What are you working on?</label>
                        <textarea id="b-note" rows={3} required value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                      </div>
                      <div className="form-foot">
                        <button type="submit" className="btn btn-gold" disabled={state === 'sending'}>
                          {state === 'sending' ? 'Booking…' : 'Confirm booking'}
                        </button>
                        {state === 'clash' && <p className="form-error">That slot was just taken — pick another.</p>}
                        {state === 'error' && (
                          <p className="form-error">
                            Something went wrong — email <a href="mailto:sales@infersia.com.au">sales@infersia.com.au</a>
                          </p>
                        )}
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
