import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { Footer } from '../components/Footer'

type BadgeKind = 'available' | 'limited' | 'enquire' | 'mto'
type UseCase = 'inference' | 'training' | 'finetuning' | 'bulk'
type EnquiryType = 'Dedicated compute' | 'Procurement' | 'Bulk hardware' | 'Not sure'

type Platform = {
  name: string
  variant?: string
  badge: BadgeKind
  descriptor: string
  specs: string[]
  ideal: string
  tier: 1 | 2
  tags: UseCase[]
  enquiryType: EnquiryType
}

const BADGE_LABEL: Record<BadgeKind, string> = {
  available: 'Available',
  limited: 'Limited availability',
  enquire: 'Enquire',
  mto: 'Made to order',
}

const PLATFORMS: Platform[] = [
  {
    name: 'NVIDIA RTX PRO 6000',
    variant: 'Blackwell Server Edition',
    badge: 'available',
    descriptor: 'Our flagship sovereign inference node. Optimised for private model endpoints and regulated workloads.',
    specs: ['8× RTX PRO 6000', '96GB GDDR7 per GPU', '768GB total VRAM', 'Dual EPYC', 'CUDA', 'Australian-hosted'],
    ideal: 'Private LLM endpoints, RAG, document processing, dedicated inference — up to 70B-class models.',
    tier: 1,
    tags: ['inference'],
    enquiryType: 'Dedicated compute',
  },
  {
    name: 'NVIDIA H100',
    variant: 'SXM',
    badge: 'enquire',
    descriptor: 'Proven high-performance training and inference. Available for dedicated deployment or procurement.',
    specs: ['8× H100', '80GB HBM3 per GPU', '640GB total VRAM', 'NVLink', 'InfiniBand-ready'],
    ideal: 'Model training, high-throughput inference, fine-tuning at scale.',
    tier: 1,
    tags: ['training', 'inference', 'finetuning'],
    enquiryType: 'Dedicated compute',
  },
  {
    name: 'NVIDIA H200',
    badge: 'limited',
    descriptor: 'Expanded memory for the largest single-node workloads.',
    specs: ['8× H200', '141GB HBM3e per GPU', '1,128GB total VRAM', 'NVLink'],
    ideal: 'Large-context inference, bigger models on a single node, memory-bound workloads.',
    tier: 1,
    tags: ['inference', 'finetuning'],
    enquiryType: 'Dedicated compute',
  },
  {
    name: 'AMD Instinct MI300X',
    badge: 'enquire',
    descriptor: 'Massive memory capacity for large-model inference. An open alternative to CUDA.',
    specs: ['8× MI300X', '192GB HBM3 per GPU', '1,536GB total VRAM', 'ROCm'],
    ideal: 'Very large open-weight models on a single node, memory-intensive inference.',
    tier: 1,
    tags: ['inference'],
    enquiryType: 'Dedicated compute',
  },
  {
    name: 'NVIDIA RTX PRO 6000',
    variant: 'Blackwell — New Units',
    badge: 'enquire',
    descriptor:
      'The new-generation Blackwell workhorse, in stock now as new units — supplied as individual GPUs or configured systems.',
    specs: ['96GB GDDR7 (ECC) per GPU', 'Blackwell architecture', 'PCIe Gen 5', 'Workstation & Server Editions', 'New stock'],
    ideal: 'Buyers building their own inference nodes, AI workstations, and departmental systems.',
    tier: 2,
    tags: ['inference', 'bulk'],
    enquiryType: 'Procurement',
  },
  {
    name: 'NVIDIA B200',
    variant: 'Blackwell',
    badge: 'mto',
    descriptor: 'Current-generation flagship for frontier training and inference. Sourced to order for large deployments.',
    specs: ['8× B200', '192GB HBM3e per GPU', '1,536GB total VRAM', 'NVLink', 'Liquid-ready'],
    ideal: 'Frontier training, hyperscale inference, new build-outs.',
    tier: 2,
    tags: ['training', 'inference', 'bulk'],
    enquiryType: 'Procurement',
  },
  {
    name: 'NVIDIA GB200 NVL',
    variant: 'Grace Blackwell',
    badge: 'mto',
    descriptor: 'Rack-scale Grace-Blackwell systems for the most demanding deployments.',
    specs: ['Rack-scale', 'Grace CPU + Blackwell GPU', 'NVLink fabric', 'Configured per requirement'],
    ideal: 'Large training clusters, rack-scale sovereign build-outs.',
    tier: 2,
    tags: ['training', 'bulk'],
    enquiryType: 'Procurement',
  },
  {
    name: 'NVIDIA A100',
    variant: 'Decommissioned / Refurbished · SXM4',
    badge: 'limited',
    descriptor:
      'Cost-effective proven silicon, sourced by the rack. Ideal for marketplace-yield operators and price-sensitive inference at scale.',
    specs: [
      'By the server (8× A100) or full rack (32× A100)',
      '40GB or 80GB HBM2e',
      'SXM4',
      'Sourced from enterprise decommissions',
    ],
    ideal: 'Bulk inference capacity, marketplace hosting, cost-optimised deployments — full-rack quotes available.',
    tier: 2,
    tags: ['inference', 'bulk'],
    enquiryType: 'Bulk hardware',
  },
  {
    name: 'Custom & Bulk',
    variant: 'Configurations',
    badge: 'enquire',
    descriptor:
      'Building your own sovereign compute? We source complete systems, full racks, networking, and colocation — and can manage freight, integration, and deployment end to end.',
    specs: ['Any platform, any scale', 'Single node to multi-rack', 'Networking + storage + colocation optional'],
    ideal: 'Operators, enterprises, and institutions building dedicated AI infrastructure.',
    tier: 2,
    tags: ['bulk'],
    enquiryType: 'Bulk hardware',
  },
]

const FILTERS: { key: UseCase | 'all'; label: string }[] = [
  { key: 'all', label: 'All platforms' },
  { key: 'inference', label: 'Inference' },
  { key: 'training', label: 'Training' },
  { key: 'finetuning', label: 'Fine-tuning' },
  { key: 'bulk', label: 'Bulk' },
]

const ENQUIRY_TYPES: EnquiryType[] = ['Dedicated compute', 'Procurement', 'Bulk hardware', 'Not sure']

function sheen(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
}

function Badge({ kind }: { kind: BadgeKind }) {
  return (
    <span className={`badge badge-${kind}`}>
      <i className="badge-dot" aria-hidden="true" />
      {BADGE_LABEL[kind]}
    </span>
  )
}

function PlatformCard({ p, onEnquire }: { p: Platform; onEnquire: (p: Platform) => void }) {
  return (
    <article className="pcard" onMouseMove={sheen}>
      <div className="pcard-top">
        <div>
          <h3 className="pcard-name">{p.name}</h3>
          {p.variant && <p className="pcard-variant mono">{p.variant}</p>}
        </div>
        <Badge kind={p.badge} />
      </div>
      <p className="pcard-desc">{p.descriptor}</p>
      <ul className="pcard-specs mono">
        {p.specs.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <div className="pcard-ideal">
        <span className="pcard-ideal-k mono">Ideal for</span>
        <p>{p.ideal}</p>
      </div>
      <div className="pcard-foot">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => onEnquire(p)}>
          Enquire
        </button>
      </div>
    </article>
  )
}

function Tier({
  kicker,
  title,
  sub,
  platforms,
  onEnquire,
}: {
  kicker: string
  title: string
  sub: string
  platforms: Platform[]
  onEnquire: (p: Platform) => void
}) {
  if (!platforms.length) return null
  return (
    <section className="tier">
      <header className="tier-head">
        <p className="tier-kicker mono">{kicker}</p>
        <h2 className="tier-title">{title}</h2>
        <p className="tier-sub">{sub}</p>
      </header>
      <div className="product-grid">
        {platforms.map((p) => (
          <PlatformCard key={p.name + (p.variant ?? '')} p={p} onEnquire={onEnquire} />
        ))}
      </div>
    </section>
  )
}

export function ComputePage() {
  const [filter, setFilter] = useState<UseCase | 'all'>('all')
  const [interest, setInterest] = useState<string | null>(null)
  const [enquiryType, setEnquiryType] = useState<EnquiryType>('Dedicated compute')
  const [name, setName] = useState('')
  const [org, setOrg] = useState('')
  const [email, setEmail] = useState('')
  const [capacity, setCapacity] = useState('')
  const [building, setBuilding] = useState('')
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = 'Compute — Infersia'
  }, [])

  const visible = PLATFORMS.filter((p) => filter === 'all' || p.tags.includes(filter))

  const onEnquire = (p: Platform) => {
    setInterest(p.variant ? `${p.name} — ${p.variant}` : p.name)
    setEnquiryType(p.enquiryType)
    const prm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    formRef.current?.scrollIntoView({ behavior: prm ? 'auto' : 'smooth', block: 'start' })
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const subject = `Compute enquiry — ${enquiryType}${interest ? ` — ${interest}` : ''}`
    const lines = [
      `Name: ${name}`,
      `Organisation: ${org}`,
      `Email: ${email}`,
      `Enquiry type: ${enquiryType}`,
      interest ? `Platform: ${interest}` : null,
      `Capacity needed: ${capacity}`,
      '',
      'What we’re building:',
      building,
    ].filter((l): l is string => l !== null)
    window.location.href = `mailto:enquiries@infersia.au?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
  }

  return (
    <>
      <main id="main" className="page compute-page">
        <div className="container">
          <header className="page-rise">
            <p className="eyebrow">Compute Platforms</p>
            <h1 className="page-title">
              Compute, <em>built to order.</em>
            </h1>
            <p className="page-standfirst">
              From a single dedicated node to a full rack, Infersia provisions and operates onshore AI compute — and
              sources the world's leading GPU platforms for larger deployments. Every configuration is available for
              enquiry, whether you need capacity on our infrastructure or hardware for your own.
            </p>
          </header>

          <div className="filter-row page-rise" role="group" aria-label="Filter platforms by workload">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={filter === f.key ? 'filter-pill active' : 'filter-pill'}
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Tier
            kicker="Tier 01"
            title="Infersia Sovereign Nodes"
            sub="Compute we operate onshore — dedicated capacity and private endpoints."
            platforms={visible.filter((p) => p.tier === 1)}
            onEnquire={onEnquire}
          />
          <Tier
            kicker="Tier 02"
            title="Procurement & Bulk"
            sub="Systems and bulk hardware we source for buyers building their own."
            platforms={visible.filter((p) => p.tier === 2)}
            onEnquire={onEnquire}
          />

          <section className="compute-band" ref={formRef} id="enquire" aria-label="Enquire">
            <div className="band-copy">
              <p className="eyebrow">Enquire</p>
              <h2 className="band-title">
                One partner, <em>either path.</em>
              </h2>
              <p className="band-text">
                Whether you need dedicated sovereign compute on Infersia's infrastructure, or you're sourcing hardware
                for your own deployment, we can help. Infersia operates onshore AI compute and procures the world's
                leading GPU platforms — from a single node to a full rack. Tell us what you're building.
              </p>
            </div>
            <form className="enquiry-form" onSubmit={onSubmit}>
              {interest && (
                <p className="enquiry-interest">
                  <span className="mono">Re: {interest}</span>
                  <button type="button" aria-label="Clear platform" onClick={() => setInterest(null)}>
                    ×
                  </button>
                </p>
              )}
              <div className="form-row">
                <div className="field">
                  <label className="mono" htmlFor="f-name">Name</label>
                  <input id="f-name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </div>
                <div className="field">
                  <label className="mono" htmlFor="f-org">Organisation</label>
                  <input id="f-org" value={org} onChange={(e) => setOrg(e.target.value)} autoComplete="organization" />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label className="mono" htmlFor="f-email">Email</label>
                  <input id="f-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </div>
                <div className="field">
                  <label className="mono" htmlFor="f-capacity">Capacity needed</label>
                  <input id="f-capacity" placeholder="A node · a rack" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label className="mono" htmlFor="f-type">Enquiry type</label>
                <select id="f-type" value={enquiryType} onChange={(e) => setEnquiryType(e.target.value as EnquiryType)}>
                  {ENQUIRY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="mono" htmlFor="f-building">What you're building</label>
                <textarea id="f-building" rows={4} required value={building} onChange={(e) => setBuilding(e.target.value)} />
              </div>
              <div className="form-foot">
                <button type="submit" className="btn btn-gold">Enquire</button>
                <p className="form-note">
                  Opens your mail client — or write to <a href="mailto:enquiries@infersia.au">enquiries@infersia.au</a>
                </p>
              </div>
            </form>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
