import { MODELS } from '../quote/engine'
import { fmtDateTime, type Summary } from './api'

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

export function DashboardTab({ data }: { data: Summary }) {
  const t = data.totals
  return (
    <>
      <div className="admin-stats">
        <div className="stat-tile"><span className="stat-n">{t.pageViews}</span><span className="stat-k mono">Page views</span></div>
        <div className="stat-tile"><span className="stat-n">{t.sessions}</span><span className="stat-k mono">Sessions</span></div>
        <div className="stat-tile"><span className="stat-n">{t.quotesViewed}</span><span className="stat-k mono">Quotes viewed</span></div>
        <div className="stat-tile"><span className="stat-n">{t.leads}</span><span className="stat-k mono">Leads</span></div>
        <div className="stat-tile"><span className="stat-n">{t.bookings}</span><span className="stat-k mono">Calls booked</span></div>
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
        <h2 className="admin-h mono">Recent events</h2>
        <div className="admin-events">
          {data.recentEvents.map((e, i) => (
            <p key={i} className="admin-event mono">
              <span className="admin-event-ts">{fmtDateTime(e.ts)}</span>
              <span className="admin-event-name">{e.event}</span>
              <span className="admin-event-props">{JSON.stringify(e.props)}</span>
            </p>
          ))}
        </div>
      </section>
    </>
  )
}
