import { useEffect, useState, type FormEvent } from 'react'
import { MODELS } from '../quote/engine'

type Summary = {
  ok: boolean
  totals: {
    pageViews: number
    sessions: number
    quotesViewed: number
    leads: number
    avgSavingViewed: number | null
  }
  models: [string, number][]
  comparators: [string, number][]
  usage: [string, number][]
  terms: [string, number][]
  recentEvents: { ts: string; sid: string; event: string; props: Record<string, unknown> }[]
  leads: {
    ts: string
    name: string
    org: string
    email: string
    phone: string
    context: Record<string, unknown>
  }[]
}

const modelName = (id: string) => MODELS.find((m) => m.id === id)?.name ?? id

function Bars({ rows, labelFn }: { rows: [string, number][]; labelFn?: (k: string) => string }) {
  if (!rows.length) return <p className="admin-empty">No data yet.</p>
  const max = rows[0][1]
  return (
    <div className="admin-bars">
      {rows.map(([k, n]) => (
        <div key={k} className="admin-bar-row">
          <span className="admin-bar-label">{labelFn ? labelFn(k) : k}</span>
          <span className="admin-bar-track">
            <span className="admin-bar-fill" style={{ width: `${Math.max(4, (n / max) * 100)}%` }} />
          </span>
          <span className="admin-bar-n mono">{n}</span>
        </div>
      ))}
    </div>
  )
}

export function AdminPage() {
  const [key, setKey] = useState<string>(() => sessionStorage.getItem('infersia_admin_key') ?? '')
  const [input, setInput] = useState('')
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.title = 'Admin — Infersia'
  }, [])

  const load = async (k: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/summary', { headers: { 'x-admin-key': k } })
      if (res.status === 401) {
        setError('Wrong key.')
        sessionStorage.removeItem('infersia_admin_key')
        setKey('')
        return
      }
      if (!res.ok) throw new Error(String(res.status))
      const json = (await res.json()) as Summary
      setData(json)
      sessionStorage.setItem('infersia_admin_key', k)
      setKey(k)
    } catch {
      setError('Could not load — is the API running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (key) void load(key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onLogin = (e: FormEvent) => {
    e.preventDefault()
    void load(input)
  }

  if (!data) {
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

  const t = data.totals
  return (
    <main id="main" className="page admin-page">
      <div className="container">
        <div className="admin-head">
          <div>
            <p className="eyebrow">Admin · Quote page</p>
            <h1 className="page-title">Quote <em>intelligence.</em></h1>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void load(key)} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="admin-stats">
          <div className="stat-tile"><span className="stat-n">{t.pageViews}</span><span className="stat-k mono">Page views</span></div>
          <div className="stat-tile"><span className="stat-n">{t.sessions}</span><span className="stat-k mono">Sessions</span></div>
          <div className="stat-tile"><span className="stat-n">{t.quotesViewed}</span><span className="stat-k mono">Quotes viewed</span></div>
          <div className="stat-tile"><span className="stat-n">{t.leads}</span><span className="stat-k mono">Leads</span></div>
          <div className="stat-tile">
            <span className="stat-n">{t.avgSavingViewed === null ? '—' : `AU$${Math.round(t.avgSavingViewed / 1000)}k`}</span>
            <span className="stat-k mono">Avg saving shown /yr</span>
          </div>
        </div>

        <div className="admin-cols">
          <section className="admin-panel">
            <h2 className="admin-h mono">Models people pick</h2>
            <Bars rows={data.models} labelFn={modelName} />
          </section>
          <section className="admin-panel">
            <h2 className="admin-h mono">Compared against</h2>
            <Bars rows={data.comparators} />
          </section>
          <section className="admin-panel">
            <h2 className="admin-h mono">Usage levels quoted</h2>
            <Bars rows={data.usage} />
          </section>
          <section className="admin-panel">
            <h2 className="admin-h mono">Terms quoted (months)</h2>
            <Bars rows={data.terms} />
          </section>
        </div>

        <section className="admin-panel">
          <h2 className="admin-h mono">Leads ({data.leads.length})</h2>
          {data.leads.length === 0 ? (
            <p className="admin-empty">No leads yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>When</th><th>Name</th><th>Org</th><th>Email</th><th>Phone</th><th>Model</th><th>Usage/day</th><th>Term</th><th>Saving/yr</th></tr>
                </thead>
                <tbody>
                  {data.leads.map((l, i) => (
                    <tr key={i}>
                      <td className="mono">{new Date(l.ts).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td>{l.name}</td>
                      <td>{l.org}</td>
                      <td><a href={`mailto:${l.email}`}>{l.email}</a></td>
                      <td>{l.phone || '—'}</td>
                      <td>{String(l.context.modelName ?? l.context.model ?? '—')}</td>
                      <td className="mono">{l.context.tokensPerDay ? `${(Number(l.context.tokensPerDay) / 1e6).toLocaleString()}M` : '—'}</td>
                      <td className="mono">{String(l.context.term ?? '—')}</td>
                      <td className="mono">{typeof l.context.annualSaving === 'number' ? `AU$${Math.round(Number(l.context.annualSaving)).toLocaleString()}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-panel">
          <h2 className="admin-h mono">Recent events</h2>
          <div className="admin-events">
            {data.recentEvents.map((e, i) => (
              <p key={i} className="admin-event mono">
                <span className="admin-event-ts">{new Date(e.ts).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'medium' })}</span>
                <span className="admin-event-name">{e.event}</span>
                <span className="admin-event-props">{JSON.stringify(e.props)}</span>
              </p>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
