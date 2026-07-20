import { useEffect, useState, type FormEvent } from 'react'
import { adminFetch, type CalSettings, type GoogleStatus } from './api'

const TIMEZONES = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Adelaide',
  'Australia/Perth',
  'Australia/Hobart',
  'Australia/Darwin',
  'UTC',
]

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

function GoogleSyncPanel({ adminKey }: { adminKey: string }) {
  const [status, setStatus] = useState<GoogleStatus | null>(null)
  const [working, setWorking] = useState(false)

  const load = () =>
    adminFetch<GoogleStatus>(adminKey, '/api/admin/google/status')
      .then(setStatus)
      .catch(() => setStatus(null))

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey])

  const connect = async () => {
    setWorking(true)
    try {
      const r = await adminFetch<{ url: string }>(adminKey, '/api/admin/google/auth-url')
      window.location.href = r.url
    } catch {
      setWorking(false)
    }
  }

  const disconnect = async () => {
    setWorking(true)
    try {
      await adminFetch(adminKey, '/api/admin/google/disconnect', { method: 'POST' })
      await load()
    } finally {
      setWorking(false)
    }
  }

  if (!status) return null
  return (
    <section className="admin-panel">
      <h2 className="admin-h mono">Calendar sync</h2>
      <div className="gsync">
        <div className="gsync-row">
          <p className="ld-k mono">Google Calendar</p>
          {!status.configured && (
            <p className="settings-hint">
              Not configured yet — set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> on the
              Render service (see README for the 8-minute Google Cloud setup), then reload this page and connect.
            </p>
          )}
          {status.configured && !status.connected && (
            <p>
              <button type="button" className="btn btn-gold btn-sm" onClick={() => void connect()} disabled={working}>
                Connect Google Calendar
              </button>
              <span className="settings-hint gsync-note">
                Bookings will appear in your calendar with Google Meet links, and customers receive calendar invites
                automatically.
              </span>
            </p>
          )}
          {status.connected && (
            <>
              <p className="gsync-connected">
                <span className="settings-saved mono">Connected{status.email ? ` as ${status.email}` : ''} ✓</span>
                <button type="button" className="filter-pill" onClick={() => void disconnect()} disabled={working}>
                  Disconnect
                </button>
              </p>
              {status.emailNotifications ? (
                <p className="settings-hint">
                  Email notifications are on — new bookings and quote leads arrive in your Gmail inbox.
                </p>
              ) : (
                <p className="settings-hint gsync-warn">
                  Email notifications need one extra permission: click Disconnect, then Connect again and approve the
                  "Send email on your behalf" scope. Calendar sync keeps working either way.
                </p>
              )}
            </>
          )}
        </div>
        {status.icsUrl && (
          <div className="gsync-row">
            <p className="ld-k mono">Calendar feed (works with any calendar app)</p>
            <input className="gsync-url mono" readOnly value={status.icsUrl} onFocus={(e) => e.currentTarget.select()} />
            <p className="settings-hint">
              Google Calendar → Other calendars → + → From URL → paste. Treat this URL like a password. Google
              refreshes subscribed feeds every few hours; the Connect option above is instant.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export function SettingsTab({
  settings,
  onSave,
  busy,
  adminKey,
}: {
  settings: CalSettings
  onSave: (s: CalSettings) => Promise<boolean>
  busy: boolean
  adminKey: string
}) {
  const [draft, setDraft] = useState<CalSettings>(settings)
  const [weekText, setWeekText] = useState<Record<string, string>>(() =>
    Object.fromEntries(DAYS.map((d) => [d.key, (settings.week[d.key] ?? []).join(', ')]))
  )
  const [blackoutText, setBlackoutText] = useState(settings.blackouts.join(', '))
  const [saved, setSaved] = useState<'idle' | 'saved' | 'error'>('idle')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const week: Record<string, string[]> = {}
    for (const d of DAYS) {
      week[d.key] = weekText[d.key]
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean)
    }
    const blackouts = blackoutText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const ok = await onSave({ ...draft, week, blackouts })
    setSaved(ok ? 'saved' : 'error')
    setTimeout(() => setSaved('idle'), 2500)
  }

  return (
    <>
    <GoogleSyncPanel adminKey={adminKey} />
    <section className="admin-panel">
      <h2 className="admin-h mono">Calendar availability</h2>
      <p className="settings-hint">
        Booking slots are generated from these windows, minus existing bookings. Times are in the calendar timezone;
        visitors see them converted to their own.
      </p>
      <form className="enquiry-form settings-form" onSubmit={submit}>
        <div className="settings-grid">
          <div className="field">
            <label className="mono" htmlFor="s-tz">Timezone</label>
            <select id="s-tz" className="comparator-select" value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="mono" htmlFor="s-slot">Call length (min)</label>
            <input id="s-slot" type="number" min={5} max={120} value={draft.slotMinutes} onChange={(e) => setDraft({ ...draft, slotMinutes: Number(e.target.value) || 20 })} />
          </div>
          <div className="field">
            <label className="mono" htmlFor="s-buffer">Buffer between calls (min)</label>
            <input id="s-buffer" type="number" min={0} max={60} value={draft.bufferMinutes} onChange={(e) => setDraft({ ...draft, bufferMinutes: Number(e.target.value) || 0 })} />
          </div>
          <div className="field">
            <label className="mono" htmlFor="s-lead">Minimum notice (hours)</label>
            <input id="s-lead" type="number" min={0} max={168} value={draft.leadTimeHours} onChange={(e) => setDraft({ ...draft, leadTimeHours: Number(e.target.value) || 0 })} />
          </div>
          <div className="field">
            <label className="mono" htmlFor="s-horizon">Bookable days ahead</label>
            <input id="s-horizon" type="number" min={1} max={90} value={draft.horizonDays} onChange={(e) => setDraft({ ...draft, horizonDays: Number(e.target.value) || 21 })} />
          </div>
          <div className="field">
            <label className="mono" htmlFor="s-hide">Hide open slots (%)</label>
            <input
              id="s-hide"
              type="number"
              min={0}
              max={90}
              step={5}
              value={draft.hideSlotsPercent ?? 0}
              onChange={(e) => setDraft({ ...draft, hideSlotsPercent: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
        <p className="settings-hint">
          <strong>Look busier:</strong> hides this share of otherwise-open slots from the public booking page (at
          least two always remain per day), so early-stage availability reads as in demand. You still see and can book
          every real slot from the calendar. 0% shows everything.
        </p>

        <p className="ld-k mono settings-week-h">Weekly windows — comma-separated ranges, 24h (e.g. 09:00-12:00, 13:00-17:00). Blank = unavailable.</p>
        <div className="settings-week">
          {DAYS.map((d) => (
            <div key={d.key} className="field settings-day">
              <label className="mono" htmlFor={`s-${d.key}`}>{d.label}</label>
              <input
                id={`s-${d.key}`}
                value={weekText[d.key]}
                placeholder="—"
                onChange={(e) => setWeekText({ ...weekText, [d.key]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <div className="field">
          <label className="mono" htmlFor="s-blackouts">Blackout dates (YYYY-MM-DD, comma or space separated)</label>
          <input id="s-blackouts" value={blackoutText} placeholder="2026-12-25, 2026-12-26" onChange={(e) => setBlackoutText(e.target.value)} />
        </div>

        <div className="form-foot">
          <button type="submit" className="btn btn-gold" disabled={busy}>Save availability</button>
          {saved === 'saved' && <p className="settings-saved mono">Saved ✓</p>}
          {saved === 'error' && <p className="form-error">Save failed — check the ranges format.</p>}
        </div>
      </form>
    </section>
    </>
  )
}
