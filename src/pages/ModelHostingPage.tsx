import { Link, Navigate, useParams } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { usePageMeta } from '../lib/usePageMeta'
import { MODELS, modelById, tierById } from '../quote/engine'
import { modelDescription, modelFaq, modelTitle } from '../seo/shared.mjs'

export function ModelHostingPage() {
  const { modelId } = useParams()
  const model = modelById(modelId ?? null)
  const tier = model ? tierById(model.tierId) : null

  usePageMeta(
    model ? modelTitle(model) : 'Australian Hosted LLM | Infersia',
    model && tier ? modelDescription(model, tier) : ''
  )

  if (!model || !tier) return <Navigate to="/hosting" replace />

  const faq = modelFaq(model, tier) as { q: string; a: string }[]
  const siblings = MODELS.filter((m) => m.id !== model.id).slice(0, 6)
  const priceLabel = model.quotable
    ? `${tier.from ? 'from ' : ''}AU$${tier.price.toLocaleString('en-AU')}`
    : null

  return (
    <>
      <main id="main" className="page model-page">
        <div className="container">
          <header className="page-rise">
            <p className="eyebrow">
              <Link className="eyebrow-link" to="/hosting">Australian Hosted LLMs</Link>
              <span className="eyebrow-sep" aria-hidden="true">/</span>
              {model.developer}
            </p>
            <h1 className="page-title">
              {model.name}, hosted in <em>Australia.</em>
            </h1>
            <p className="page-standfirst">
              A dedicated, private {model.name} deployment on Australian GPUs — your endpoint, your data, your
              jurisdiction. {model.strengths[0]}. Processed entirely onshore, with{' '}
              {model.quotable ? 'fixed monthly pricing and unlimited tokens' : 'capacity reserved ahead of release'}.
            </p>
            <ul className="sov-strip" aria-label="Sovereignty guarantees">
              <li>Hosted on Australian soil</li>
              <li>Zero offshore processing</li>
              <li>Never trains anyone's model</li>
              <li>{model.quotable ? 'Fixed monthly cost' : 'Reserve ahead of release'}</li>
            </ul>
          </header>

          <div className="model-cols page-rise">
            <section className="est-card est-inf model-main">
              <p className="est-kicker mono">The deployment</p>
              <p className="est-model">{model.name}</p>
              <p className="est-hw mono">
                {model.paramsTotal}
                {model.paramsActive !== 'dense' ? ` (${model.paramsActive})` : ''} · {model.licence} · {model.context}{' '}
                context · {model.vramGb ? `~${model.vramGb}GB @4-bit` : 'footprint TBC'}
              </p>
              {priceLabel ? (
                <>
                  <p className="est-big">
                    {tier.from && <span className="est-from">from </span>}
                    {priceLabel}
                    <span className="est-per">/mo</span>
                  </p>
                  <p className="est-small">
                    Fixed price, unlimited tokens, ex GST · {tier.name} — {tier.hardware}
                    {tier.poa ? ' · POA, final quote on enquiry' : tier.from ? ' · final quote on enquiry' : ''}
                  </p>
                </>
              ) : (
                <>
                  <p className="est-big muted">Conditional</p>
                  <p className="est-small">{model.conditionalNote}</p>
                </>
              )}
              <div className="model-strengths">
                {model.strengths.map((s) => (
                  <p key={s} className="mcard-strength">{s}</p>
                ))}
              </div>
              <div className="hosting-links">
                <Link className="btn btn-gold" to={`/quote?model=${model.id}`}>
                  {model.quotable ? `Price ${model.name} at your volume` : `Enquire about ${model.name}`}
                </Link>
                <Link className="btn btn-outline" to="/book">Book a call</Link>
              </div>
            </section>

            <aside className="model-side">
              <section className="admin-panel">
                <h2 className="admin-h mono">Why Australian-hosted</h2>
                <p className="model-side-copy">
                  Frontier APIs process your prompts offshore, under foreign law. A dedicated {model.name} endpoint
                  keeps the computation itself — not just storage — inside Australian jurisdiction. That's the
                  difference the Privacy Act, APRA's operational-risk standards, legal privilege and health-record
                  obligations actually turn on.
                </p>
                <p className="model-side-copy">
                  Ideal for: {model.tags.join(' · ')}.
                </p>
              </section>
              <section className="admin-panel">
                <h2 className="admin-h mono">Also hosted in Australia</h2>
                <div className="model-siblings">
                  {siblings.map((m) => (
                    <Link key={m.id} className="model-sib" to={`/hosting/${m.id}`}>
                      {m.name} →
                    </Link>
                  ))}
                </div>
              </section>
            </aside>
          </div>

          <section className="faq-block" aria-label="Frequently asked questions">
            <p className="tier-kicker mono">Questions</p>
            {faq.map((f) => (
              <details key={f.q} className="faq-item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
