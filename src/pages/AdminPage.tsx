import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  AdminAuthError,
  adminFetch,
  type AvailBlock,
  type Booking,
  type CalSettings,
  type Lead,
  type LeadStatus,
  type Summary,
} from '../admin/api'
import { CalendarTab } from '../admin/CalendarTab'
import { DashboardTab } from '../admin/DashboardTab'
import { LeadsTab } from '../admin/LeadsTab'
import { SettingsTab } from '../admin/SettingsTab'

type Tab = 'dashboard' | 'leads' | 'calendar' | 'settings'

export function AdminPage() {
  const [key, setKey] = useState<string>(() => sessionStorage.getItem('infersia_admin_key') ?? '')
  const [input, setInput] = useState('')
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const [summary, setSummary] = useState<Summary | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [blocks, setBlocks] = useState<AvailBlock[]>([])
  const [settings, setSettings] = useState<CalSettings | null>(null)

  useEffect(() => {
    document.title = 'Admin — Infersia'
  }, [])

  const loadAll = useCallback(
    async (k: string) => {
      setLoading(true)
      setError(null)
      try {
        const [s, l, b, bl, st] = await Promise.all([
          adminFetch<Summary>(k, '/api/admin/summary'),
          adminFetch<{ leads: Lead[] }>(k, '/api/admin/leads'),
          adminFetch<{ bookings: Booking[] }>(k, '/api/admin/bookings'),
          adminFetch<{ blocks: AvailBlock[] }>(k, '/api/admin/blocks'),
          adminFetch<{ settings: CalSettings }>(k, '/api/admin/settings'),
        ])
        setSummary(s)
        setLeads(l.leads)
        setBookings(b.bookings)
        setBlocks(bl.blocks)
        setSettings(st.settings)
        setAuthed(true)
        setKey(k)
        sessionStorage.setItem('infersia_admin_key', k)
      } catch (err) {
        if (err instanceof AdminAuthError) {
          setError('Wrong key.')
          sessionStorage.removeItem('infersia_admin_key')
          setAuthed(false)
          setKey('')
        } else {
          setError('Could not load — is the API running?')
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (key) void loadAll(key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const act = useCallback(
    async (fn: () => Promise<unknown>) => {
      setBusy(true)
      try {
        await fn()
        await loadAll(key)
        return true
      } catch {
        return false
      } finally {
        setBusy(false)
      }
    },
    [key, loadAll]
  )

  const onLogin = (e: FormEvent) => {
    e.preventDefault()
    void loadAll(input)
  }

  if (!authed) {
    return (
      <main id="main" className="page admin-page">
        <div className="container-narrow">
          <p className="eyebrow">Admin</p>
          <h1 className="page-title">Quote <em>intelligence.</em></h1>
          <form className="enquiry-form admin-gate" onSubmit={onLogin}>
            <div className="field">
              <label className="mono" htmlFor="admin-key">Admin key</label>
              <input id="admin-key" type="password" value={input} onChange={(e) => setInput(e.target.value)} autoFocus />
            </div>
            <div className="form-foot">
              <button type="submit" className="btn btn-gold" disabled={loading}>
                {loading ? 'Checking…' : 'Enter'}
              </button>
              {error && <p className="form-error">{error}</p>}
            </div>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main id="main" className="page admin-page">
      <div className="container">
        <div className="admin-head">
          <div>
            <p className="eyebrow">Admin</p>
            <h1 className="page-title">Quote <em>intelligence.</em></h1>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void loadAll(key)} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="admin-tabs" role="tablist" aria-label="Admin sections">
          {(
            [
              ['dashboard', 'Dashboard'],
              ['leads', `Leads (${leads.length})`],
              ['calendar', `Calendar (${bookings.filter((b) => b.status === 'confirmed' && new Date(b.end) > new Date()).length})`],
              ['settings', 'Availability'],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? 'admin-tab active' : 'admin-tab'}
              onClick={() => setTab(t)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'dashboard' && summary && <DashboardTab data={summary} />}

        {tab === 'leads' && (
          <LeadsTab
            leads={leads}
            busy={busy}
            onStatus={(id, status: LeadStatus) =>
              void act(() => adminFetch(key, `/api/admin/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }))
            }
            onNote={(id, text) =>
              void act(() => adminFetch(key, `/api/admin/leads/${id}/notes`, { method: 'POST', body: JSON.stringify({ text }) }))
            }
            onAddLead={(lead) =>
              act(() => adminFetch(key, '/api/admin/leads', { method: 'POST', body: JSON.stringify(lead) }))
            }
          />
        )}

        {tab === 'calendar' && (
          <CalendarTab
            bookings={bookings}
            blocks={blocks}
            busy={busy}
            onBookingStatus={(id, status) =>
              void act(() => adminFetch(key, `/api/admin/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }))
            }
            onAddBooking={(b) =>
              act(() => adminFetch(key, '/api/admin/bookings', { method: 'POST', body: JSON.stringify(b) }))
            }
            onAddBlock={(b) =>
              act(() => adminFetch(key, '/api/admin/blocks', { method: 'POST', body: JSON.stringify(b) }))
            }
            onDeleteBlock={(id) =>
              void act(() => adminFetch(key, `/api/admin/blocks/${id}`, { method: 'DELETE' }))
            }
          />
        )}

        {tab === 'settings' && settings && (
          <SettingsTab
            settings={settings}
            busy={busy}
            onSave={(s) => act(() => adminFetch(key, '/api/admin/settings', { method: 'PUT', body: JSON.stringify(s) }))}
          />
        )}
      </div>
    </main>
  )
}
