import { useMemo, useState, type FormEvent } from 'react'
import { fmtTime, type Booking } from './api'

const pad = (n: number) => String(n).padStart(2, '0')
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function CalendarTab({
  bookings,
  onBookingStatus,
  onAddBooking,
  busy,
}: {
  bookings: Booking[]
  onBookingStatus: (id: string, status: Booking['status']) => void
  onAddBooking: (b: { start: string; durationMin: number; name: string; email: string; note: string }) => Promise<boolean>
  busy: boolean
}) {
  const today = new Date()
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [selected, setSelected] = useState<string>(dateKey(today))
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ time: '10:00', durationMin: 20, name: '', email: '', note: '' })

  const byDay = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const b of bookings) {
      const k = dateKey(new Date(b.start))
      map.set(k, [...(map.get(k) ?? []), b])
    }
    return map
  }, [bookings])

  const weeks = useMemo(() => {
    const first = new Date(view.y, view.m, 1)
    const start = new Date(first)
    start.setDate(1 - ((first.getDay() + 6) % 7)) // Monday-start grid
    const out: Date[][] = []
    const cur = new Date(start)
    for (let w = 0; w < 6; w++) {
      const row: Date[] = []
      for (let d = 0; d < 7; d++) {
        row.push(new Date(cur))
        cur.setDate(cur.getDate() + 1)
      }
      out.push(row)
    }
    return out
  }, [view])

  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
  const dayBookings = (byDay.get(selected) ?? []).slice().sort((a, b) => (a.start < b.start ? -1 : 1))
  const upcoming = bookings
    .filter((b) => b.status === 'confirmed' && new Date(b.end).getTime() > Date.now())
    .slice(0, 8)

  const submitAdd = async (e: FormEvent) => {
    e.preventDefault()
    const start = new Date(`${selected}T${draft.time}:00`)
    const ok = await onAddBooking({
      start: start.toISOString(),
      durationMin: draft.durationMin,
      name: draft.name,
      email: draft.email,
      note: draft.note,
    })
    if (ok) {
      setDraft({ ...draft, name: '', email: '', note: '' })
      setAdding(false)
    }
  }

  return (
    <div className="cal-layout">
      <section className="admin-panel cal-month">
        <div className="cal-head">
          <button type="button" className="filter-pill" onClick={() => setView(view.m === 0 ? { y: view.y - 1, m: 11 } : { y: view.y, m: view.m - 1 })} aria-label="Previous month">←</button>
          <h2 className="admin-h cal-title mono">{monthLabel}</h2>
          <button type="button" className="filter-pill" onClick={() => setView(view.m === 11 ? { y: view.y + 1, m: 0 } : { y: view.y, m: view.m + 1 })} aria-label="Next month">→</button>
        </div>
        <div className="cal-grid" role="grid" aria-label={monthLabel}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <span key={d} className="cal-dow mono">{d}</span>
          ))}
          {weeks.flat().map((d) => {
            const k = dateKey(d)
            const inMonth = d.getMonth() === view.m
            const dayList = byDay.get(k) ?? []
            const confirmed = dayList.filter((b) => b.status === 'confirmed').length
            const isToday = k === dateKey(today)
            return (
              <button
                key={k}
                type="button"
                className={
                  'cal-cell' +
                  (inMonth ? '' : ' dim') +
                  (k === selected ? ' selected' : '') +
                  (isToday ? ' today' : '')
                }
                onClick={() => setSelected(k)}
                aria-pressed={k === selected}
              >
                <span className="cal-daynum">{d.getDate()}</span>
                {confirmed > 0 && <span className="cal-count mono">{confirmed}</span>}
              </button>
            )
          })}
        </div>
      </section>

      <div className="cal-side">
        <section className="admin-panel">
          <div className="cal-day-head">
            <h2 className="admin-h mono">
              {new Date(selected + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            <button type="button" className="filter-pill add-pill" onClick={() => setAdding(!adding)}>
              {adding ? '× Close' : '+ Add booking'}
            </button>
          </div>

          {adding && (
            <form className="enquiry-form admin-add-form" onSubmit={submitAdd}>
              <div className="form-row">
                <div className="field">
                  <label className="mono" htmlFor="ab-time">Start time</label>
                  <input id="ab-time" type="time" required value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
                </div>
                <div className="field">
                  <label className="mono" htmlFor="ab-dur">Minutes</label>
                  <input id="ab-dur" type="number" min={5} max={240} value={draft.durationMin} onChange={(e) => setDraft({ ...draft, durationMin: Number(e.target.value) || 20 })} />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label className="mono" htmlFor="ab-name">Name</label>
                  <input id="ab-name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </div>
                <div className="field">
                  <label className="mono" htmlFor="ab-email">Email (links a lead)</label>
                  <input id="ab-email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label className="mono" htmlFor="ab-note">Note</label>
                <input id="ab-note" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
              </div>
              <div className="form-foot">
                <button type="submit" className="btn btn-gold btn-sm" disabled={busy}>Add to calendar</button>
              </div>
            </form>
          )}

          {dayBookings.length === 0 && !adding && <p className="admin-empty">Nothing booked this day.</p>}
          {dayBookings.map((b) => (
            <div key={b.id} className={`cal-booking ${b.status}`}>
              <p className="cal-booking-time mono">
                {fmtTime(b.start)}–{fmtTime(b.end)} · {b.durationMin} min
                {b.status !== 'confirmed' && ` · ${b.status}`}
              </p>
              <p className="cal-booking-who">
                {b.name}
                {b.org && ` · ${b.org}`}
              </p>
              <p className="cal-booking-contact mono">
                {b.email && <a href={`mailto:${b.email}`}>{b.email}</a>}
                {b.phone && ` · ${b.phone}`}
              </p>
              {b.note && <p className="cal-booking-note">{b.note}</p>}
              {b.status === 'confirmed' && (
                <p className="cal-booking-actions">
                  <button type="button" className="filter-pill" onClick={() => onBookingStatus(b.id, 'completed')} disabled={busy}>Mark completed</button>
                  <button type="button" className="filter-pill" onClick={() => onBookingStatus(b.id, 'cancelled')} disabled={busy}>Cancel</button>
                </p>
              )}
            </div>
          ))}
        </section>

        <section className="admin-panel">
          <h2 className="admin-h mono">Next up</h2>
          {upcoming.length === 0 && <p className="admin-empty">No upcoming calls.</p>}
          {upcoming.map((b) => (
            <button
              key={b.id}
              type="button"
              className="cal-upcoming"
              onClick={() => {
                const d = new Date(b.start)
                setView({ y: d.getFullYear(), m: d.getMonth() })
                setSelected(dateKey(d))
              }}
            >
              <span className="mono">{new Date(b.start).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} · {fmtTime(b.start)}</span>
              <span>{b.name}{b.org ? ` · ${b.org}` : ''}</span>
            </button>
          ))}
        </section>
      </div>
    </div>
  )
}
