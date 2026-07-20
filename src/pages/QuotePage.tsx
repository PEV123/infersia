import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { track } from '../lib/track'
import { usePageMeta } from '../lib/usePageMeta'
import { STATIC_META } from '../seo/shared.mjs'
import {
  API_MODELS,
  DEFAULT_INPUT_SHARE,
  MODELS,
  USAGE_PRESETS,
  VERIFIED_DATE,
  apiById,
  aud,
  computeQuote,
  fmtTokens,
  modelById,
  sharedTierBreakevenPerDay,
  sliderToTokens,
  tierById,
  tokensToSlider,
  type QuoteModel,
} from '../quote/engine'

const BADGE_LABEL: Record<QuoteModel['badge'], string> = {
  available: 'Available',
  limited: 'Limited availability',
  enquire: 'Enquire',
  'weights-pending': 'Weights pending',
}

const CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'single-gpu', label: 'Single GPU' },
  { key: 'multi-gpu', label: 'Multi-GPU' },
  { key: 'full-node', label: 'Full Node' },
  { key: 'frontier', label: 'Frontier (Multi-Node)' },
  { key: 'coding', label: 'Coding' },
  { key: 'reasoning', label: 'Reasoning' },
  { key: 'multimodal', label: 'Multimodal' },
] as const

type ChipKey = (typeof CHIPS)[number]['key']

function chipMatch(m: QuoteModel, chip: ChipKey): boolean {
  switch (chip) {
    case 'all':
      return true
    case 'single-gpu':
      return m.tierId === 'shared' || m.tierId === 'gpu1'
    case 'multi-gpu':
      return ['gpu2', 'gpu3', 'gpu4', 'gpu5'].includes(m.tierId)
    case 'full-node':
      return m.tierId === 'node8'
    case 'frontier':
      return m.tierId === 'multi16' || m.tierId === 'multi24'
    default:
      return m.caps.includes(chip)
  }
}

function Tip({ text }: { text: string }) {
  return (
    <span className="tip">
      <button type="button" className="tip-btn" aria-label="More information">
        ?
      </button>
      <span role="tooltip" className="tip-pop">
        {text}
      </span>
    </span>
  )
}

function useCountUp(target: number): number {
  const [val, setVal] = useState(target)
  const fromRef = useRef(target)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      fromRef.current = target
      setVal(target)
      return
    }
    const from = fromRef.current
    if (from === target) return
    const t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const p = Math.min((t - t0) / 600, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setVal(from + (target - from) * e)
      if (p < 1) raf = requestAnimationFrame(step)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return val
}

const prmScroll = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

export function QuotePage() {
  const [params, setParams] = useSearchParams()

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const m = modelById(params.get('model'))
    return m ? m.id : null
  })
  const [tokensPerDay, setTokensPerDay] = useState<number>(() => {
    const u = Number(params.get('usage'))
    return u >= 100_000 && u <= 500_000_000 ? u : 5_000_000
  })
  const [inputShare, setInputShare] = useState<number>(() => {
    const r = Number(params.get('ratio'))
    return r >= 50 && r <= 95 ? r / 100 : DEFAULT_INPUT_SHARE
  })
  const [term, setTerm] = useState<number>(() => {
    const t = Number(params.get('term'))
    return [12, 24, 36].includes(t) ? t : 12
  })
  const [comparatorId, setComparatorId] = useState<string>(() => apiById(params.get('vs') ?? 'fable-5').id)

  const [chip, setChip] = useState<ChipKey>('all')
  const [advanced, setAdvanced] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [lead, setLead] = useState({ name: '', org: '', email: '', phone: '' })

  const model = modelById(selectedId)
  const comparator = apiById(comparatorId)
  const tier = model ? tierById(model.tierId) : null

  const quote = useMemo(
    () =>
      model && tier && model.quotable
        ? computeQuote({ tokensPerDay, inputShare, term, tier, api: comparator })
        : null,
    [model, tier, tokensPerDay, inputShare, term, comparator]
  )

  // ---- URL sync (shareable quotes)
  useEffect(() => {
    const next = new URLSearchParams()
    if (selectedId) next.set('model', selectedId)
    next.set('usage', String(tokensPerDay))
    next.set('term', String(term))
    next.set('vs', comparatorId)
    if (Math.round(inputShare * 100) !== 80) next.set('ratio', String(Math.round(inputShare * 100)))
    setParams(next, { replace: true })
  }, [selectedId, tokensPerDay, term, comparatorId, inputShare, setParams])

  usePageMeta(STATIC_META['/quote'].title, STATIC_META['/quote'].description)
  useEffect(() => {
    track('quote_page_viewed')
  }, [])

  // ---- debounced analytics
  const usageTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    clearTimeout(usageTimer.current)
    usageTimer.current = setTimeout(() => track('usage_changed', { tokensPerDay }), 800)
    return () => clearTimeout(usageTimer.current)
  }, [tokensPerDay])

  const viewTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    if (!model || !quote) return
    clearTimeout(viewTimer.current)
    viewTimer.current = setTimeout(
      () =>
        track('quote_viewed', {
          model: model.id,
          tokensPerDay,
          term,
          vs: comparatorId,
          saving: Math.round(quote.annualSaving),
        }),
      1400
    )
    return () => clearTimeout(viewTimer.current)
  }, [model, quote, tokensPerDay, term, comparatorId])

  const selectModel = useCallback((m: QuoteModel) => {
    setSelectedId(m.id)
    setFormOpen(false)
    setSubmitState('idle')
    track('model_selected', { model: m.id })
    document.getElementById('step-usage')?.scrollIntoView({ behavior: prmScroll(), block: 'start' })
  }, [])

  const activePreset = USAGE_PRESETS.find((p) => p.tokens === tokensPerDay)?.id ?? null

  const submitLead = async (e: FormEvent) => {
    e.preventDefault()
    if (!model) return
    setSubmitState('sending')
    try {
      const res = await fetch('/api/quote-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lead,
          context: {
            model: model.id,
            modelName: model.name,
            tier: tier?.name ?? null,
            tokensPerDay,
            inputShare,
            term,
            comparator: comparator.name,
            quotable: model.quotable,
            infersiaMonthly: quote ? Math.round(quote.infersiaMonthly) : null,
            apiMonthlyAud: quote ? Math.round(quote.apiMonthlyAud) : null,
            annualSaving: quote ? Math.round(quote.annualSaving) : null,
          },
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setSubmitState('done')
      try {
        sessionStorage.setItem('infersia_lead_prefill', JSON.stringify(lead))
      } catch {
        /* prefill is a nicety only */
      }
      track('quote_submitted', { model: model.id, tokensPerDay, term, vs: comparatorId })
    } catch {
      setSubmitState('error')
    }
  }

  // count-up values (safe fallbacks when no quote)
  const cuInfMonthly = useCountUp(quote ? quote.infersiaMonthly : 0)
  const cuApiMonthly = useCountUp(quote ? quote.apiMonthlyAud : 0)

  const visibleModels = MODELS.filter((m) => chipMatch(m, chip))

  return (
    <>
      <main id="main" className="page quote-page">
        <div className="container">
          <header className="page-rise">
            <p className="eyebrow">Sovereign Compute · Instant Estimate</p>
            <h1 className="page-title">
              Run frontier-class AI. Keep it in Australia. <em>Pay less doing it.</em>
            </h1>
            <p className="page-standfirst">
              Pick an open-weight model, tell us your usage, and see in ten seconds what dedicated sovereign hosting
              costs — next to what the same volume costs on an offshore frontier API. The models below deliver 90–95%
              of frontier capability, on hardware you control, under Australian law.
            </p>
            <ul className="sov-strip" aria-label="Sovereignty guarantees">
              <li>Hosted on Australian soil</li>
              <li>Australian jurisdiction, end to end</li>
              <li>Zero offshore processing</li>
              <li>Private by architecture</li>
            </ul>
          </header>

          {/* ---------- STEP 1 ---------- */}
          <section className="qstep" aria-labelledby="step-models-h">
            <header className="qstep-head">
              <p className="tier-kicker mono">Step 1</p>
              <h2 id="step-models-h" className="tier-title">Choose your model</h2>
            </header>
            <div className="filter-row" role="group" aria-label="Filter models">
              {CHIPS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={chip === c.key ? 'filter-pill active' : 'filter-pill'}
                  aria-pressed={chip === c.key}
                  onClick={() => setChip(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="model-grid">
              {visibleModels.map((m) => {
                const selected = m.id === selectedId
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={
                      'mcard' +
                      (selected ? ' selected' : '') +
                      (m.badge === 'weights-pending' ? ' pending' : '')
                    }
                    aria-pressed={selected}
                    onClick={() => selectModel(m)}
                  >
                    <span className="mcard-top">
                      <span className="dev-chip mono">{m.developer}</span>
                      <span className={`badge badge-${m.badge === 'weights-pending' ? 'pending' : m.badge}`}>
                        <i className="badge-dot" aria-hidden="true" />
                        {BADGE_LABEL[m.badge]}
                      </span>
                    </span>
                    <span className="mcard-name">{m.name}</span>
                    <span className="mcard-specs mono">
                      {m.paramsTotal} {m.paramsActive !== 'dense' ? `(${m.paramsActive})` : ''} · {m.licence} ·{' '}
                      {m.context} ctx · {m.vramGb ? `~${m.vramGb}GB @4-bit` : 'VRAM TBC'}
                    </span>
                    <span className="mcard-strengths">
                      {m.strengths.map((s) => (
                        <span key={s} className="mcard-strength">{s}</span>
                      ))}
                    </span>
                    <span className="mcard-foot">
                      <span className="mcard-tags">{m.tags.join(' · ')}</span>
                      <span className={'mcard-price' + (m.quotable ? '' : ' conditional')}>{m.priceLine}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* ---------- STEP 2 ---------- */}
          <section className="qstep" id="step-usage" aria-labelledby="step-usage-h">
            <header className="qstep-head">
              <p className="tier-kicker mono">Step 2</p>
              <h2 id="step-usage-h" className="tier-title">
                Your usage{' '}
                <Tip text="A token is ~¾ of a word; 1M tokens ≈ 750,000 words. We assume 80% input / 20% output — editable under Advanced." />
              </h2>
            </header>
            <div className="usage-grid">
              <div className="usage-presets" role="group" aria-label="Usage level">
                {USAGE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={activePreset === p.id ? 'usage-btn active' : 'usage-btn'}
                    aria-pressed={activePreset === p.id}
                    onClick={() => setTokensPerDay(p.tokens)}
                  >
                    <span className="usage-label">{p.label}</span>
                    <span className="usage-tokens mono">~{fmtTokens(p.tokens)} tokens/day</span>
                    <span className="usage-blurb">{p.blurb}</span>
                  </button>
                ))}
              </div>

              <button type="button" className="advanced-toggle mono" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}>
                {advanced ? '− Hide advanced' : '+ Advanced (custom volume & ratio)'}
              </button>
              {advanced && (
                <div className="advanced-panel">
                  <label className="adv-label mono" htmlFor="usage-slider">
                    Custom volume — <strong>{fmtTokens(tokensPerDay)} tokens/day</strong>
                  </label>
                  <input
                    id="usage-slider"
                    type="range"
                    min={0}
                    max={1000}
                    value={Math.round(tokensToSlider(tokensPerDay) * 1000)}
                    onChange={(e) => setTokensPerDay(sliderToTokens(Number(e.target.value) / 1000))}
                    aria-valuetext={`${fmtTokens(tokensPerDay)} tokens per day`}
                  />
                  <div className="adv-ratio">
                    <label className="adv-label mono" htmlFor="ratio-input">
                      Input share{' '}
                      <Tip text="Most workloads read far more than they write. Default 80% input / 20% output; adjust if your pipeline differs." />
                    </label>
                    <div className="ratio-controls">
                      <input
                        id="ratio-input"
                        type="number"
                        min={50}
                        max={95}
                        step={5}
                        value={Math.round(inputShare * 100)}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          if (v >= 50 && v <= 95) setInputShare(v / 100)
                        }}
                      />
                      <span className="mono ratio-note">
                        % in / {100 - Math.round(inputShare * 100)}% out
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="usage-row">
                <div className="usage-col">
                  <p className="adv-label mono">Term</p>
                  <div className="term-row" role="group" aria-label="Contract term">
                    {[12, 24, 36].map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={term === t ? 'filter-pill active' : 'filter-pill'}
                        aria-pressed={term === t}
                        onClick={() => setTerm(t)}
                      >
                        {t} months{t === 24 ? ' (−5%)' : t === 36 ? ' (−10%)' : ''}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="usage-col">
                  <p className="adv-label mono">
                    Compare against{' '}
                    <Tip text="Claude Fable 5 is the default because it's the most capable generally available model — the honest benchmark for what you'd otherwise pay." />
                  </p>
                  <select
                    className="comparator-select"
                    aria-label="Comparison API model"
                    value={comparatorId}
                    onChange={(e) => {
                      setComparatorId(e.target.value)
                      track('comparator_changed', { vs: e.target.value })
                    }}
                  >
                    {API_MODELS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- STEP 3 ---------- */}
          <section className="qstep" id="step-estimate" aria-labelledby="step-est-h">
            <header className="qstep-head">
              <p className="tier-kicker mono">Step 3</p>
              <h2 id="step-est-h" className="tier-title">Your estimate</h2>
            </header>

            {!model && (
              <p className="est-empty">Choose a model above to see your estimate.</p>
            )}

            {model && !model.quotable && (
              <div className="est-conditional">
                <p className="est-cond-title">
                  {model.name} — <em>conditional pricing</em>
                </p>
                <p className="est-cond-body">
                  {model.conditionalNote} We'll scope the exact configuration and give you a firm sovereign quote on
                  enquiry{model.badge === 'weights-pending' ? ' — and we can reserve capacity ahead of release.' : '.'}
                </p>
                <button type="button" className="btn btn-gold" onClick={() => { setFormOpen(true); setTimeout(() => document.getElementById('lead-form')?.scrollIntoView({ behavior: prmScroll() }), 40) }}>
                  Enquire about {model.name}
                </button>
              </div>
            )}

            {model && quote && tier && (
              <>
                <div className="est-grid">
                  <div className="est-card est-inf">
                    <p className="est-kicker mono">Infersia Sovereign Dedicated</p>
                    <p className="est-model">{model.name}</p>
                    <p className="est-hw mono">
                      {tier.id === 'shared'
                        ? 'Shared sovereign endpoint · fair-use pool · hosted in Australia'
                        : `${tier.gpus}× dedicated GPUs · ${tier.vramGb}GB VRAM · hosted in Australia`}
                    </p>
                    <p className="est-big">
                      {tier.from && <span className="est-from">from </span>}
                      {aud(cuInfMonthly)}<span className="est-per">/mo</span>
                    </p>
                    <p className="est-small">
                      {aud(quote.infersiaAnnual)} first year incl. setup{tier.poa ? ' · POA — final quote on enquiry' : tier.from ? ' · final quote on enquiry' : ''}
                    </p>
                    <p className="est-note">Fixed price — unlimited tokens on your dedicated hardware.</p>
                    <p className="est-chips">
                      <span>Onshore processing</span>
                      <span>Zero data retention</span>
                      <span>No rate limits</span>
                      <span>Fixed cost</span>
                    </p>
                  </div>
                  <div className="est-card est-api">
                    <p className="est-kicker mono">
                      Frontier API at your volume{' '}
                      <Tip
                        text={`Against ${comparator.name}, this configuration pays for itself above ~${fmtTokens(quote.breakevenTokensPerDay)} tokens/day. FX: indicative AUD/USD 0.70.`}
                      />
                    </p>
                    <p className="est-model">{comparator.name}</p>
                    <p className="est-hw mono">
                      {fmtTokens(tokensPerDay)} tokens/day · {Math.round(inputShare * 100)}/
                      {100 - Math.round(inputShare * 100)} in-out · converted to AUD
                    </p>
                    <p className="est-big muted">
                      ~{aud(cuApiMonthly)}<span className="est-per">/mo</span>
                    </p>
                    <p className="est-small">~{aud(quote.apiAnnualAud)} per year</p>
                    <p className="est-lines mono">
                      Input {fmtTokens(quote.inTokens)}/mo — {aud(quote.apiInMonthlyAud)} · Output{' '}
                      {fmtTokens(quote.outTokens)}/mo — {aud(quote.apiOutMonthlyAud)}
                    </p>
                    <p className="est-caveat">
                      Estimate at published API list prices; prompt-caching and batch discounts can reduce API costs
                      for some workloads.
                    </p>
                  </div>
                </div>

                {quote.annualSaving > 0 ? (
                  <div className="verdict verdict-pos" role="status">
                    Estimated saving: <strong>{aud(quote.annualSaving)}/yr ({Math.round(quote.savingPct * 100)}%)</strong>{' '}
                    — with your data never leaving Australia.
                  </div>
                ) : (
                  <div className="verdict verdict-neutral" role="status">
                    At this volume, the API is cheaper on paper — but it can't process your data onshore. If
                    sovereignty is a requirement, it isn't optional at any price.
                    {tier.id !== 'shared' && (
                      <span className="verdict-tip">
                        {' '}Tip: the Shared Sovereign Endpoint at AU$990/mo (models up to ~35B) beats this API cost
                        above ~{fmtTokens(sharedTierBreakevenPerDay(comparator, inputShare))} tokens/day.
                      </span>
                    )}
                  </div>
                )}
              </>
            )}

            {model && (
              <>
                {!formOpen && submitState !== 'done' && (
                  <div className="lock-row">
                    <button type="button" className="btn btn-gold btn-lg" onClick={() => setFormOpen(true)}>
                      Lock this quote — Enquire
                    </button>
                    <Link className="lock-alt" to="/book">Or book a 20-minute call</Link>
                  </div>
                )}

                {formOpen && submitState !== 'done' && (
                  <form id="lead-form" className="enquiry-form lead-form" onSubmit={submitLead}>
                    <p className="enquiry-interest">
                      <span className="mono">
                        {model.name}
                        {quote ? ` · ${fmtTokens(tokensPerDay)}/day · ${term} mo · vs ${comparator.name}` : ' · conditional'}
                      </span>
                    </p>
                    <div className="form-row">
                      <div className="field">
                        <label className="mono" htmlFor="q-name">Name</label>
                        <input id="q-name" required value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} autoComplete="name" />
                      </div>
                      <div className="field">
                        <label className="mono" htmlFor="q-org">Organisation</label>
                        <input id="q-org" value={lead.org} onChange={(e) => setLead({ ...lead, org: e.target.value })} autoComplete="organization" />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="field">
                        <label className="mono" htmlFor="q-email">Email</label>
                        <input id="q-email" type="email" required value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} autoComplete="email" />
                      </div>
                      <div className="field">
                        <label className="mono" htmlFor="q-phone">Phone (optional)</label>
                        <input id="q-phone" type="tel" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} autoComplete="tel" />
                      </div>
                    </div>
                    <div className="form-foot">
                      <button type="submit" className="btn btn-gold" disabled={submitState === 'sending'}>
                        {submitState === 'sending' ? 'Sending…' : 'Lock this quote'}
                      </button>
                      <Link className="lock-alt" to="/book">Or book a 20-minute call</Link>
                    </div>
                    {submitState === 'error' && (
                      <p className="form-error">
                        Something went wrong — please email <a href="mailto:enquiries@infersia.com.au">enquiries@infersia.com.au</a>
                      </p>
                    )}
                  </form>
                )}

                {submitState === 'done' && (
                  <div className="lead-done" role="status">
                    <p className="lead-done-title">Quote locked.</p>
                    <p>We'll come back to you within one business day with a firm sovereign quote for {model.name}.</p>
                    <p className="lead-done-book">
                      <Link className="btn btn-outline btn-sm" to="/book">Book your intro call now →</Link>
                    </p>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="sov-diff" aria-labelledby="sov-diff-h">
            <p className="tier-kicker mono">The sovereign difference</p>
            <h2 id="sov-diff-h" className="tier-title">
              The saving is the bonus. <em>Sovereignty is the point.</em>
            </h2>
            <p className="sov-diff-lead">
              Frontier APIs process your prompts offshore, under foreign law, on shared infrastructure you can't
              inspect. For obligations under the Privacy Act, APRA's outsourcing and security standards, legal
              professional privilege, and health-record residency, that is disqualifying — at any price. Dedicated
              sovereign hosting removes the question entirely:
            </p>
            <div className="sovd-grid">
              {[
                {
                  t: 'Processed in Australia — provably',
                  b: 'Every token is computed on hardware on Australian soil, under Australian jurisdiction. Auditable, not asserted.',
                },
                {
                  t: "Your data never trains anyone's model",
                  b: 'Dedicated weights on dedicated GPUs. Nothing you send is retained, shared, or learned from.',
                },
                {
                  t: 'Privacy & security by architecture',
                  b: "Your data never crosses a border — encrypted in transit and at rest, zero retention, no third parties in the path. Sovereignty isn't a policy here; it's the wiring.",
                },
                {
                  t: 'Your model, your control',
                  b: 'Pin versions, fine-tune, customise. No silent model swaps, no deprecation emails, no surprises.',
                },
                {
                  t: 'Fixed cost, no rate limits',
                  b: 'One monthly number, unlimited tokens on your hardware. No bill shock, no queues, no capacity roulette.',
                },
                {
                  t: 'A human in Australia who answers the phone',
                  b: 'Engineering and support onshore, in your timezone — accountable under the same law you are.',
                },
              ].map((x) => (
                <div key={x.t} className="sovd-tile">
                  <h3>{x.t}</h3>
                  <p>{x.b}</p>
                </div>
              ))}
            </div>
            <div className="sov-diff-cta">
              <Link className="btn btn-gold" to="/book">Book a 20-minute sovereignty call</Link>
            </div>
          </section>

          <div className="quote-disclaimers">
            <p>
              Estimates only; final pricing confirmed on enquiry. Prices AUD ex GST. API comparison uses published
              list prices as at July 2026 (verified {VERIFIED_DATE}), converted at an indicative exchange rate
              (AUD/USD 0.70); caching/batch discounts may reduce API costs. Model availability subject to official
              weight releases and licence terms; "Weights Pending" models are quoted conditionally. Performance
              varies by workload — we'll help you benchmark before you commit. Not financial advice.
            </p>
            <p>
              All model and company names are trademarks of their respective owners; Infersia is an independent
              Australian infrastructure provider and is not affiliated with or endorsed by these organisations.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
