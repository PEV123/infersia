import { useMemo, useState, type FormEvent } from 'react'
import { fmtTime, type AvailBlock, type Booking } from './api'

const pad = (n: number) => String(n).padStart(2, '0')
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function CalendarTab({
  bookings,
  blocks,
  onBookingStatus,
  onAddBooking,
  onAddBlock,
  onDeleteBlock,
  busy,
}: {
  bookings: Booking[]
  blocks: AvailBlock[]
  onBookingStatus: (id: string, status: Booking['status']) => void
  onAddBooking: (b: { start: string; durationMin: number; name: string; email: string; note: string }) => Promise<boolean>
  onAddBlock: (b: { start: string; end: string; reason: string }) => Promise<boolean>
  onDeleteBlock: (id: string) => void
  busy: boolean
}) {
  const today = new Date()
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [selected, setSelected] = useState<string>(dateKey(today))
  const [mode, setMode] = useState<'none' | 'booking' | 'block'>('none')
  const [draft, setDraft] = useState({ time: '10:00', durationMin: 20, name: '', email: '', note: '' })
  const [blockDraft, setBlockDraft] = useState({ from: '13:00', to: '15:00', reason: '' })
  const [blockError, setBlockError] = useState<string | null>(null)

  const byDay = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const b of bookings) {
      const k = dateKey(new Date(b.start))
      map.set(k, [...(map.get(k) ?? []), b])
    }
    return map
  }, [bookings])

  const blocksByDay = useMemo(() => {
    const map = new Map<string, AvailBlock[]>()
    for (const b of blocks) {
      // a block can span days; mark every local day it touches
      const cur = new Date(b.start)
      const endT = new Date(b.end).getTime()
      while (cur.getTime() < endT) {
        const k = dateKey(cur)
        map.set(k, [...(map.get(k) ?? []), b])
        cur.setDate(cur.getDate() + 1)
        cur.setHours(0, 0, 0, 0)
      }
    }
    return map
  }, [blocks])

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
  const dayBlocks = (blocksByDay.get(selected) ?? []).slice().sort((a, b) => (a.start < b.start ? -1 : 1))
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
      setMode('none')
    }
  }

  const addBlock = async (fromT: string, toT: string, reason: string) => {
    setBlockError(null)
    const start = new Date(`${selected}T${fromT}:00`)
    const end = new Date(`${selected}T${toT}:00`)
    if (end.getTime() <= start.getTime()) {
      setBlockError('End must be after start.')
      return
    }
    const ok = await onAddBlock({ start: start.toISOString(), end: end.toISOString(), reason })
    if (ok) {
      setBlockDraft({ from: '13:00', to: '15:00', reason: '' })
      setMode('none')
    } else {
      setBlockError('Could not save the block.')
    }
  }

  const submitBlock = (e: FormEvent) => {
    e.preventDefault()
    void addBlock(blockDraft.from, blockDraft.to, blockDraft.reason)
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
            const confirmed = (byDay.get(k) ?? []).filter((b) => b.status === 'confirmed').length
            const hasBlock = (blocksByDay.get(k) ?? []).length > 0
            const isToday = k === dateKey(today)
            return (
              <button
                key={k}
                type="button"
                className={
                  'cal-cell' +
                  (inMonth ? '' : ' dim') +
                  (k === selected ? ' selected' : '') +
                  (isToday ? ' today' : '') +
                  (hasBlock ? ' has-block' : '')
                }
                onClick={() => {
                  setSelected(k)
                  setMode('none')
                }}
                aria-pressed={k === selected}
              >
                <span className="cal-daynum">{d.getDate()}</span>
                {hasBlock && <span className="cal-blockmark" aria-label="has availability block" />}
                {confirmed > 0 && <span className="cal-count mono">{confirmed}</span>}
              </button>
            )
          })}
        </div>
        <p className="cal-legend mono">
          <span className="legend-count">1</span> calls booked · <span className="legend-block" /> availability blocked
        </p>
      </section>

      <div className="cal-side">
        <section className="admin-panel">
          <div className="cal-day-head">
            <h2 className="admin-h mono">
              {new Date(selected + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            <span className="cal-day-actions">
              <button type="button" className="filter-pill add-pill" onClick={() => setMode(mode === 'booking' ? 'none' : 'booking')}>
                {mode === 'booking' ? '× Close' : '+ Booking'}
              </button>
              <button type="button" className="filter-pill block-pill" onClick={() => { setMode(mode === 'block' ? 'none' : 'block'); setBlockError(null) }}>
                {mode === 'block' ? '× Close' : '⊘ Block time'}
              </button>
            </span>
          </div>

          {mode === 'booking' && (
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

          {mode === 'block' && (
            <form className="enquiry-form admin-add-form" onSubmit={submitBlock}>
              <div className="form-row">
                <div className="field">
                  <label className="mono" htmlFor="bl-from">Block from</label>
                  <input id="bl-from" type="time" required value={blockDraft.from} onChange={(e) => setBlockDraft({ ...blockDraft, from: e.target.value })} />
                </div>
                <div className="field">
                  <label className="mono" htmlFor="bl-to">Until</label>
                  <input id="bl-to" type="time" required value={blockDraft.to} onChange={(e) => setBlockDraft({ ...blockDraft, to: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label className="mono" htmlFor="bl-reason">Reason (only you see this)</label>
                <input id="bl-reason" placeholder="Site visit, travel, deep work…" value={blockDraft.reason} onChange={(e) => setBlockDraft({ ...blockDraft, reason: e.target.value })} />
              </div>
              <div className="form-foot">
                <button type="submit" className="btn btn-gold btn-sm" disabled={busy}>Block this time</button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={busy}
                  onClick={() => void addBlock('00:00', '23:59', blockDraft.reason || 'Blocked all day')}
                >
                  Block whole day
                </button>
              </div>
              {blockError && <p className="form-error">{blockError}</p>}
            </form>
          )}

          {dayBlocks.length > 0 && (
            <div className="cal-blocks">
              {dayBlocks.map((b) => (
                <div key={b.id} className="cal-block-row">
                  <div>
                    <p className="cal-block-time mono">
                      ⊘ {fmtTime(b.start)}–{fmtTime(b.end)} blocked
                    </p>
                    {b.reason && <p className="cal-block-reason">{b.reason}</p>}
                  </div>
                  <button type="button" className="filter-pill" onClick={() => onDeleteBlock(b.id)} disabled={busy}>
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}

          {dayBookings.length === 0 && dayBlocks.length === 0 && mode === 'none' && (
            <p className="admin-empty">Nothing booked or blocked this day.</p>
          )}
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
