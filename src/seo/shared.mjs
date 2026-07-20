// Shared SEO content — imported by BOTH the client pages and the Express
// server (for crawler-served meta + JSON-LD). Pure functions only: no node
// or browser APIs in here.

export const SITE = 'https://www.infersia.com.au'
export const SITE_NAME = 'Infersia'

export function modelTitle(model) {
  return `Australia Hosted ${model.name} — Dedicated & Private | Infersia`
}

export function modelDescription(model, tier) {
  const price =
    model.quotable && tier
      ? `Fixed monthly pricing from AU$${tier.price.toLocaleString('en-AU')}${tier.from ? '+' : ''}, unlimited tokens.`
      : 'Conditional pricing — reserve capacity on enquiry.'
  const base = `Run ${model.name} on dedicated GPUs in Australia — private endpoint, zero offshore processing, Australian jurisdiction end to end. ${price}`
  return base.length > 158 ? base.slice(0, 155) + '…' : base
}

export function modelFaq(model, tier) {
  const faq = [
    {
      q: `Is our data used to train ${model.name}?`,
      a: `No. ${model.name} runs as a dedicated deployment on hardware reserved for you. Nothing you send is retained, shared, or used to train anyone's model — yours or anybody else's.`,
    },
    {
      q: `Where is ${model.name} hosted?`,
      a: `On GPU infrastructure located on Australian soil, under Australian jurisdiction. Prompts and outputs are processed onshore — your data never crosses a border, and there is no offshore fallback when demand spikes.`,
    },
    {
      q: `What hardware does ${model.name} run on?`,
      a: tier
        ? `${model.name} is served from our ${tier.name} tier — ${tier.hardware}. The model's ~${model.vramGb ?? 'TBC'}GB serving footprint (4-bit, including context overhead) is dedicated to your workload alone.`
        : `Configuration is scoped on enquiry.`,
    },
    {
      q: `What does it cost to host ${model.name} in Australia?`,
      a:
        model.quotable && tier
          ? `${tier.from ? 'From ' : ''}AU$${tier.price.toLocaleString('en-AU')} per month ex GST — a fixed price with unlimited tokens on your dedicated hardware, not per-token or per-GPU-hour billing. Use the calculator to compare against frontier API pricing at your volume.`
          : `${model.conditionalNote ?? 'Pricing is confirmed on enquiry.'} We can scope the configuration and reserve capacity ahead of time.`,
    },
    {
      q: `What licence does ${model.name} use?`,
      a: `${model.name} is distributed under: ${model.licence}. We'll confirm licence fit for your commercial use case as part of scoping — most open-weight licences permit exactly this kind of private, dedicated deployment.`,
    },
  ]
  return faq
}

export const PILLAR_FAQ = [
  {
    q: 'What is an Australian hosted LLM?',
    a: 'A large language model running on GPU infrastructure physically located in Australia, under Australian jurisdiction — so prompts and outputs are processed onshore, not just stored here. That distinction (processing residency, not just data residency) is what regulated Australian organisations actually need.',
  },
  {
    q: 'Which models can be hosted in Australia with Infersia?',
    a: 'Current open-weight leaders including Llama 3.3 70B, gpt-oss-120b, the Qwen3 family, Llama 4 Maverick, GLM-5.2, Kimi K2.6, DeepSeek V4 Pro and more — from single-GPU workhorses to multi-node frontier models. New releases are added as weights ship.',
  },
  {
    q: 'How is this different from using the OpenAI or Claude API?',
    a: "Frontier APIs process your data offshore under foreign law, on shared infrastructure, priced per token. A dedicated Australian-hosted model is private capacity: fixed monthly cost, unlimited tokens, nothing retained, nothing trained on, and every byte processed inside Australian jurisdiction.",
  },
  {
    q: 'Is a hosted private LLM compliant for regulated industries?',
    a: 'Dedicated onshore hosting is designed for the obligations regulated Australian sectors face — Privacy Act obligations, APRA CPS 230/234 operational-risk and security expectations, legal professional privilege, and health-record residency requirements. We help you document the data-flow story your auditors ask for.',
  },
]

// Route-level meta shared by client + server. Model routes are added dynamically.
export const STATIC_META = {
  '/': {
    title: 'Infersia — Sovereign AI Compute, Hosted in Australia',
    description:
      'Sovereign AI compute on Australian soil. Dedicated GPU hosting for open-weight models — private endpoints for regulated business. Owned, operated and answerable in Australia.',
  },
  '/compute': {
    title: 'GPU Cloud Australia — Sovereign, Dedicated GPU Hosting | Infersia',
    description:
      'A sovereign Australian GPU cloud — dedicated RTX PRO 6000, H100, H200 and MI300X nodes hosted onshore, plus B200/GB200 procurement. Fixed allocations, zero offshore processing.',
  },
  '/hosting': {
    title: 'Australian Hosted LLM — Private, Dedicated & Sovereign | Infersia',
    description:
      'Host open-weight LLMs — Llama, Qwen, GLM, Kimi, DeepSeek — on dedicated GPUs in Australia. Private endpoints, fixed monthly pricing, zero offshore processing.',
  },
  '/quote': {
    title: 'AI Hosting Cost Calculator — Dedicated vs Frontier API (AUD) | Infersia',
    description:
      'Pick an open-weight model, set your usage, and compare dedicated sovereign hosting in Australia against frontier API pricing — live, in AUD, with honest maths.',
  },
  '/book': {
    title: 'Book a Call — Sovereign AI Hosting | Infersia',
    description:
      'Twenty minutes with someone technical, in Australia — your models, your data obligations, and what dedicated sovereign hosting would look like for you.',
  },
  '/news': {
    title: 'News & Perspectives — Sovereign AI in Australia | Infersia',
    description:
      "Analysis and perspectives on sovereign AI, data residency and Australia's AI infrastructure — from the team building it.",
  },
  '/admin': {
    title: 'Admin — Infersia',
    description: '',
    robots: 'noindex, nofollow',
  },
}

export const COMPUTE_FAQ = [
  {
    q: 'What is a sovereign GPU cloud?',
    a: 'A GPU cloud whose hardware sits on Australian soil, operated by an Australian company, under Australian jurisdiction — so the computation on your data happens onshore, not just the storage. Infersia allocates dedicated GPU nodes rather than shared slices, which is what makes the sovereignty provable.',
  },
  {
    q: 'How does Infersia compare to other GPU cloud providers in Australia?',
    a: 'Most GPU cloud providers sell shared capacity by the GPU-hour. Infersia allocates dedicated nodes at a fixed monthly price — your hardware, reserved for you, with unlimited usage and no per-hour meter. Sovereignty is the default, not an add-on: every node is Australian-hosted with zero offshore processing.',
  },
  {
    q: 'Can I get raw GPU access, or only managed model hosting?',
    a: 'Both. Take a dedicated node as raw GPU capacity for your own workloads, or have us run a managed private endpoint for an open-weight model on it. Many clients start managed and take the keys later.',
  },
  {
    q: 'Do you offer H100, H200 or B200 GPU capacity in Australia?',
    a: 'H100, H200 and MI300X are available for dedicated onshore deployment, alongside our RTX PRO 6000 flagship nodes. Current-generation B200 and rack-scale GB200 systems are sourced to order for larger build-outs — including full procurement, freight and integration if you are building your own.',
  },
]

export const ARTICLE_META = {
  'the-missing-middle': {
    title: "The Missing Middle in Australia's Sovereign AI Push | Infersia",
    description:
      'The national conversation is fixed on frontier data centres. But the sovereignty thousands of Australian businesses need is being left unbuilt — and it isn\'t a megaproject.',
    datePublished: '2026-07-19',
    author: 'Scott Logan',
  },
}
