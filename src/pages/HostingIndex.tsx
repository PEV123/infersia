import { Link } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { usePageMeta } from '../lib/usePageMeta'
import { MODELS, tierById } from '../quote/engine'
import { PILLAR_FAQ, STATIC_META } from '../seo/shared.mjs'

const BADGE_LABEL: Record<string, string> = {
  available: 'Available',
  limited: 'Limited availability',
  enquire: 'Enquire',
  'weights-pending': 'Weights pending',
}

export function HostingIndex() {
  usePageMeta(STATIC_META['/hosting'].title, STATIC_META['/hosting'].description)

  return (
    <>
      <main id="main" className="page hosting-page">
        <div className="container">
          <header className="page-rise">
            <p className="eyebrow">Australian Hosted LLMs</p>
            <h1 className="page-title">
              Every model below, hosted in <em>Australia.</em>
            </h1>
            <p className="page-standfirst">
              Dedicated, private deployments of the world's leading open-weight models — Llama, Qwen, GLM, Kimi,
              DeepSeek and more — running on GPUs on Australian soil, under Australian jurisdiction. Fixed monthly
              pricing, unlimited tokens, and nothing you send ever trains anyone's model. This is Australian-hosted
              AI in the strict sense: processed onshore, not just stored here.
            </p>
          </header>

          <div className="hosting-grid page-rise">
            {MODELS.map((m) => {
              const tier = tierById(m.tierId)
              return (
                <Link key={m.id} className={'hcard' + (m.badge === 'weights-pending' ? ' pending' : '')} to={`/hosting/${m.id}`}>
                  <span className="mcard-top">
                    <span className="dev-chip mono">
                      {m.logo && <img src={m.logo} alt="" width={15} height={15} loading="lazy" />}
                      {m.developer}
                    </span>
                    <span className={`badge badge-${m.badge === 'weights-pending' ? 'pending' : m.badge}`}>
                      <i className="badge-dot" aria-hidden="true" />
                      {BADGE_LABEL[m.badge]}
                    </span>
                  </span>
                  <span className="mcard-name">{m.name}, hosted in Australia</span>
                  <span className="mcard-specs mono">
                    {m.paramsTotal} · {m.licence} · {m.context} ctx
                  </span>
                  <span className="hcard-line">{m.strengths[0]}</span>
                  <span className="mcard-foot">
                    <span className={'mcard-price' + (m.quotable ? '' : ' conditional')}>
                      {m.quotable && tier
                        ? `${tier.from ? 'from ' : ''}AU$${tier.price.toLocaleString('en-AU')}/mo fixed`
                        : 'Conditional — enquire'}
                    </span>
                    <span className="hcard-more">View hosting →</span>
                  </span>
                </Link>
              )
            })}
          </div>

          <section className="hosting-why page-rise">
            <p className="tier-kicker mono">Why hosted here</p>
            <h2 className="tier-title">
              Hosted LLM, without the <em>asterisk.</em>
            </h2>
            <p className="sov-diff-lead">
              Plenty of AI products claim an Australian home. Usually it means storage in a Sydney region while the
              inference — the actual computation on your data — happens offshore, or on shared multi-tenant
              infrastructure under foreign law. An Infersia deployment is different by construction: your model runs
              on dedicated Australian GPUs reserved for you alone, your prompts and outputs never cross a border,
              and the bill is a fixed monthly number rather than a per-token meter.
            </p>
            <div className="hosting-links">
              <Link className="btn btn-gold" to="/quote">
                Compare cost vs frontier APIs
              </Link>
              <Link className="btn btn-outline" to="/compute">
                See the hardware
              </Link>
              <Link className="btn btn-outline" to="/book">
                Book a 20-minute call
              </Link>
            </div>
          </section>

          <section className="faq-block" aria-label="Frequently asked questions">
            <p className="tier-kicker mono">Questions</p>
            {PILLAR_FAQ.map((f: { q: string; a: string }) => (
              <details key={f.q} className="faq-item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </section>

          <div className="quote-disclaimers">
            <p>
              All model and company names and logos are trademarks of their respective owners (including NVIDIA and
              AMD); Infersia is an independent Australian infrastructure provider and is not affiliated with or
              endorsed by these organisations.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
