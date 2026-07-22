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

function DailyBars({ rows }: { rows: [string, number, number][] }) {
  const max = Math.max(1, ...rows.map(([, h, b]) => h + b))
  return (
    <>
      <div className="daily-bars" role="img" aria-label="Daily human vs bot views, last 14 days">
        {rows.map(([d, h, b]) => (
          <div key={d} className="daily-col" title={`${d}: ${h} human · ${b} bot`}>
            <span className="daily-stack">
              <span className="daily-fill daily-bot" style={{ height: `${(b / max) * 100}%` }} />
              <span className="daily-fill daily-human" style={{ height: `${(h / max) * 100}%` }} />
            </span>
            <span className="daily-label mono">{d.slice(3)}</span>
          </div>
        ))}
      </div>
      <p className="daily-legend mono">
        <span className="legend-human" /> Human <span className="legend-bot" /> Bot / crawler
      </p>
    </>
  )
}

export function DashboardTab({ data }: { data: Summary }) {
  const t = data.totals
  return (
    <>
      <div className="admin-stats">
        <div className="stat-tile"><span className="stat-n">{t.siteViews}</span><span className="stat-k mono">Human views</span></div>
        <div className="stat-tile"><span className="stat-n">{t.siteSessions}</span><span className="stat-k mono">Visitors (sessions)</span></div>
        <div className="stat-tile"><span className="stat-n">{t.botHits}</span><span className="stat-k mono">Bot / crawler hits</span></div>
        <div className="stat-tile"><span className="stat-n">{t.leads}</span><span className="stat-k mono">Leads</span></div>
        <div className="stat-tile"><span className="stat-n">{t.bookings}</span><span className="stat-k mono">Calls booked</span></div>
        <div className="stat-tile">
          <span className="stat-n">{t.avgSavingViewed === null ? '—' : `AU$${Math.round(t.avgSavingViewed / 1000)}k`}</span>
          <span className="stat-k mono">Avg saving shown /yr</span>
        </div>
      </div>

      <section className="admin-panel">
        <h2 className="admin-h mono">Traffic — last 14 days (human vs bot)</h2>
        <DailyBars rows={data.traffic.daily} />
      </section>

      <div className="admin-cols">
        <section className="admin-panel">
          <h2 className="admin-h mono">Channels (human)</h2>
          <Bars rows={data.traffic.channels} />
        </section>
        <section className="admin-panel">
          <h2 className="admin-h mono">Referrers (human)</h2>
          <Bars rows={data.traffic.referrers} />
        </section>
      </div>

      <div className="admin-cols">
        <section className="admin-panel">
          <h2 className="admin-h mono">Search terms in referrer URLs</h2>
          {data.traffic.searchTerms.length ? (
            <Bars rows={data.traffic.searchTerms} />
          ) : (
            <p className="admin-empty">
              None captured. Google strips the query from search referrers — actual organic search terms live in
              Search Console. Terms appear here only when a referrer URL carries one (some engines, internal search)
              or from <span className="mono">utm_term</span> on tagged links.
            </p>
          )}
        </section>
        <section className="admin-panel">
          <h2 className="admin-h mono">Campaigns & paid (UTM / gclid)</h2>
          <Bars rows={data.traffic.campaigns} />
        </section>
      </div>

      <div className="admin-cols">
        <section className="admin-panel">
          <h2 className="admin-h mono">Pages viewed (human)</h2>
          <Bars rows={data.traffic.pages} />
        </section>
        <section className="admin-panel">
          <h2 className="admin-h mono">Bots & crawlers</h2>
          <Bars rows={data.traffic.bots} />
        </section>
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
