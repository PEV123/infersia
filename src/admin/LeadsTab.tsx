import { useState, type FormEvent } from 'react'
import { LEAD_STATUSES, fmtDateTime, type Lead, type LeadStatus } from './api'

const STATUS_TINT: Record<LeadStatus, string> = {
  new: 'st-new',
  contacted: 'st-contacted',
  qualified: 'st-qualified',
  quoted: 'st-quoted',
  won: 'st-won',
  lost: 'st-lost',
}

export function LeadsTab({
  leads,
  onStatus,
  onNote,
  onAddLead,
  busy,
}: {
  leads: Lead[]
  onStatus: (id: string, status: LeadStatus) => void
  onNote: (id: string, text: string) => void
  onAddLead: (lead: { name: string; email: string; org: string; phone: string; note: string }) => Promise<boolean>
  busy: boolean
}) {
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', email: '', org: '', phone: '', note: '' })

  const counts = LEAD_STATUSES.map((s) => [s, leads.filter((l) => l.status === s).length] as const)
  const visible = leads.filter((l) => filter === 'all' || l.status === filter)

  const submitAdd = async (e: FormEvent) => {
    e.preventDefault()
    if (await onAddLead(draft)) {
      setDraft({ name: '', email: '', org: '', phone: '', note: '' })
      setAdding(false)
    }
  }

  return (
    <>
      <div className="pipeline-row">
        <button
          type="button"
          className={filter === 'all' ? 'filter-pill active' : 'filter-pill'}
          onClick={() => setFilter('all')}
        >
          All ({leads.length})
        </button>
        {counts.map(([s, n]) => (
          <button
            key={s}
            type="button"
            className={filter === s ? 'filter-pill active' : 'filter-pill'}
            onClick={() => setFilter(s)}
          >
            {s} ({n})
          </button>
        ))}
        <button type="button" className="filter-pill add-pill" onClick={() => setAdding(!adding)}>
          {adding ? '× Close' : '+ Add lead'}
        </button>
      </div>

      {adding && (
        <form className="enquiry-form admin-add-form" onSubmit={submitAdd}>
          <div className="form-row">
            <div className="field">
              <label className="mono" htmlFor="al-name">Name</label>
              <input id="al-name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="field">
              <label className="mono" htmlFor="al-email">Email</label>
              <input id="al-email" type="email" required value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label className="mono" htmlFor="al-org">Organisation</label>
              <input id="al-org" value={draft.org} onChange={(e) => setDraft({ ...draft, org: e.target.value })} />
            </div>
            <div className="field">
              <label className="mono" htmlFor="al-phone">Phone</label>
              <input id="al-phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label className="mono" htmlFor="al-note">First note (optional)</label>
            <input id="al-note" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          </div>
          <div className="form-foot">
            <button type="submit" className="btn btn-gold btn-sm" disabled={busy}>Add lead</button>
          </div>
        </form>
      )}

      {visible.length === 0 && <p className="admin-empty">No leads{filter !== 'all' ? ` in "${filter}"` : ' yet'}.</p>}

      <div className="lead-list">
        {visible.map((l) => {
          const open = openId === l.id
          const ctx = l.context ?? {}
          return (
            <div key={l.id} className={open ? 'lead-row open' : 'lead-row'}>
              <button type="button" className="lead-row-main" onClick={() => { setOpenId(open ? null : l.id); setNoteDraft('') }} aria-expanded={open}>
                <span className="lead-name">
                  {l.name}
                  {l.org && <span className="lead-org"> · {l.org}</span>}
                </span>
                <span className="lead-meta mono">
                  {l.source} · {fmtDateTime(l.updatedAt)}
                  {l.bookings && l.bookings.filter((b) => b.status === 'confirmed').length > 0 && ' · 📞 call booked'}
                </span>
                <span className={`lead-status mono ${STATUS_TINT[l.status]}`}>{l.status}</span>
              </button>
              {open && (
                <div className="lead-detail">
                  <div className="lead-detail-grid">
                    <div>
                      <p className="ld-k mono">Contact</p>
                      <p className="ld-v">
                        <a href={`mailto:${l.email}`}>{l.email}</a>
                        {l.phone && <> · {l.phone}</>}
                      </p>
                      <p className="ld-k mono">Status</p>
                      <select
                        className="comparator-select ld-status-select"
                        value={l.status}
                        onChange={(e) => onStatus(l.id, e.target.value as LeadStatus)}
                        disabled={busy}
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {Object.keys(ctx).length > 0 && (
                        <>
                          <p className="ld-k mono">Quote context</p>
                          <p className="ld-v mono ld-ctx">
                            {String(ctx.modelName ?? ctx.model ?? '—')}
                            {typeof ctx.tokensPerDay === 'number' ? ` · ${(Number(ctx.tokensPerDay) / 1e6).toLocaleString()}M tok/day` : ''}
                            {ctx.term ? ` · ${String(ctx.term)} mo` : ''}
                            {ctx.comparator ? ` · vs ${String(ctx.comparator)}` : ''}
                            {typeof ctx.annualSaving === 'number'
                              ? ` · saving AU$${Math.round(Number(ctx.annualSaving)).toLocaleString()}/yr`
                              : ''}
                          </p>
                        </>
                      )}
                      {l.bookings && l.bookings.length > 0 && (
                        <>
                          <p className="ld-k mono">Calls</p>
                          {l.bookings.map((b) => (
                            <p key={b.id} className="ld-v mono">
                              {fmtDateTime(b.start)} · {b.durationMin} min · {b.status}
                            </p>
                          ))}
                        </>
                      )}
                    </div>
                    <div>
                      <p className="ld-k mono">Notes ({l.notes.length})</p>
                      <div className="ld-notes">
                        {l.notes.length === 0 && <p className="admin-empty">No notes.</p>}
                        {l.notes
                          .slice()
                          .reverse()
                          .map((n, i) => (
                            <p key={i} className="ld-note">
                              <span className="mono ld-note-ts">{fmtDateTime(n.ts)}</span>
                              {n.text}
                            </p>
                          ))}
                      </div>
                      <form
                        className="ld-note-form"
                        onSubmit={(e) => {
                          e.preventDefault()
                          if (noteDraft.trim()) {
                            onNote(l.id, noteDraft.trim())
                            setNoteDraft('')
                          }
                        }}
                      >
                        <input
                          placeholder="Add a note…"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          aria-label="Add a note"
                        />
                        <button type="submit" className="btn btn-outline btn-sm" disabled={busy || !noteDraft.trim()}>
                          Add
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
