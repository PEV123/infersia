import type { ReactNode } from 'react'

export type Article = {
  slug: string
  kicker: string
  title: ReactNode
  plainTitle: string
  dek: string
  author: string
  role: string
  date: string
  readingTime: string
  body: ReactNode
}

const missingMiddle: Article = {
  slug: 'the-missing-middle',
  kicker: 'Perspective',
  title: (
    <>
      The <em>missing middle</em> in Australia's sovereign AI push
    </>
  ),
  plainTitle: "The missing middle in Australia's sovereign AI push",
  dek: "The national conversation is fixed on frontier data centres and foreign hyperscalers. But the sovereignty that thousands of Australian businesses actually need is being left unbuilt — and it isn't a megaproject. It's the machine down the road.",
  author: 'Scott Logan',
  role: 'Founder & CEO, Infersia',
  date: '19 July 2026',
  readingTime: '7 min read',
  body: (
    <>
      <p>
        When the Prime Minister finally elevated artificial intelligence to a national priority, he framed
        sovereignty in the biggest possible terms: frontier data centres, foreign investment, the training of the
        next Claude or GPT on Australian soil. It was the right ambition, and long overdue. But it answers a
        question most Australian businesses aren't asking.
      </p>
      <p>
        The country's strategic debate has become a debate about size — gigawatts, megaprojects, which hyperscaler
        anchors which campus. That matters. Yet it quietly assumes that sovereignty is something only a handful of
        enormous facilities can provide, brokered between governments and the largest technology companies on
        earth. It leaves out almost everyone.
      </p>
      <p>
        Because here is the reality on the ground in 2026: an Australian bank, a mid-tier law firm, a regional
        health service, a wagering operator, a government agency — all of them are now legally required to keep
        their most sensitive data, and increasingly the AI processing of that data, inside Australia and under
        Australian control. Not stored here. Processed here. And most of them cannot.
      </p>

      <h2>The distinction that breaks everything</h2>
      <p>
        There is a difference the marketing rarely admits, and it is the whole story. Data residency means your
        data is stored in Australia. Data sovereignty means it is processed here too — and that you can prove it.
        The gap between those two sentences is where the risk lives.
      </p>
      <p>
        Many providers advertise “Australian hosting.” Fewer can tell you where the model inference — the actual
        computation on your data — physically happens. When demand spikes, a great deal of “onshore” AI quietly
        routes its processing through Singapore or the United States. The data was stored in Sydney; the thinking
        happened somewhere else, under someone else's laws. For a business bound by the Privacy Act, by APRA's
        outsourcing rules, by legal professional privilege, by the obligations tightening across health and
        finance, that is not a technicality. It is exposure. You bought the postcode, not the model — and for a
        growing list of Australian businesses, the postcode is no longer enough.
      </p>
      <p>
        The frontier-training ambition doesn't fix this. Building a data centre to train a giant model in
        Australia is a national-security and economic-resilience play — a genuinely important one. But it does
        nothing for the accounting firm that needs a private, onshore endpoint to summarise client files without
        those files leaving the country. Training capacity and inference capacity are different problems.
        Australia is debating the first while thousands of businesses quietly fail the second.
      </p>

      <h2>Sovereignty is an inference problem</h2>
      <p>
        The uncomfortable truth is that sovereignty, for the real economy, is not decided in a ministerial speech
        or a 300-megawatt campus. It is decided one workload at a time — every time an Australian business chooses
        where its AI actually runs. Government can subsidise the buildings. It cannot manufacture the demand, and
        it cannot serve the mid-market. The hyperscalers won't either: their commercial machinery simply does not
        operate below enormous contracts. Nobody from a multi-billion-dollar campus is flying to a regional health
        network to stand up a private model for them.
      </p>
      <p>
        That is the gap. Not at the frontier — in the middle. And it is enormous, because the regulation creating
        the demand is not a forecast. It is already law. AML monitoring obligations. Privacy Act reform. APRA's
        position on offshore processing. Professional-duty rules pushing law and accounting off public AI tools.
        Health-data residency requirements that are now contractual, not merely regulatory. Every one of these
        manufactures a workload that must run somewhere sovereign — and the somewhere barely exists.
      </p>
      <p>
        This is the gap Infersia was built to close. Thousands of Australian businesses are now required to keep
        their data sovereign, but the only real options were built for enterprises with enterprise budgets. Our
        aim is to give small and mid-sized businesses that same sovereignty — dedicated, onshore, and without the
        capital investment that used to make it impossible. This was never a problem you solve with a press
        release or a mega-campus. It is real infrastructure, in the country, that businesses can actually get
        their hands on.
      </p>

      <h2>Why foreign scale can't fill it</h2>
      <p>
        It is tempting to assume the global giants will eventually reach down and serve this market. They won't,
        and the reasons are structural rather than temporary. The first is jurisdiction: a US-headquartered
        provider cannot credibly promise that its infrastructure sits beyond the reach of US law — and for a
        growing share of Australian buyers, escaping exactly that reach is the entire point. The recent episodes
        in which access to frontier models was restricted, then abruptly changed, were not anomalies. They were a
        preview. Dependence on someone else, somewhere else, is precisely the vulnerability the sovereignty debate
        claims to be about.
      </p>
      <p>
        The second reason is economic. The financing of hyperscale compute depends on anchor tenants and
        take-or-pay commitments from the very largest customers. That model, by its nature, builds for the top of
        the market and leaves the middle untouched. The gap is not an oversight the giants will correct. It is
        baked into how their capital works.
      </p>
      <p>
        And the third reason is legal, and it runs in Australia's favour. Foreign ownership of the infrastructure
        that processes sensitive Australian data faces real scrutiny — the kind that structurally advantages
        Australian-owned, Australian-operated providers for exactly the workloads that matter most. Sovereignty,
        properly understood, is not only a feature you sell. It is a moat the law helps defend.
      </p>

      <h2>What sovereignty actually requires</h2>
      <p>
        Genuine sovereignty is not a single checkbox. It is layered. The compute must sit on Australian soil, in a
        facility under Australian control. The data must be processed — not merely stored — within the
        jurisdiction, with an auditable answer to the simple question of where is this happening right now. The
        organisation must retain control over which models touch which data, and how. And when a regulator or a
        procurement officer asks for proof, there must be proof — not a marketing claim.
      </p>
      <p>
        None of this needs a new megaproject. The open-weight models available today are extraordinary; the
        historical trade-off — that going sovereign meant giving up model quality — has effectively closed. What
        has been missing is not capability. It is the willingness to build, close to the businesses that need it,
        dedicated infrastructure that is Australian by design rather than Australian by press release.
      </p>
      <p>
        The Prime Minister was right about the lesson of a turbulent world: if we are always dependent on someone
        else, somewhere else, we will always be vulnerable. That lesson does not only apply to frontier models and
        national security. It applies to the credit-risk model at a mutual bank, the discovery tool at a law firm,
        the clinical assistant at a regional hospital. Sovereignty at the top is a strategic imperative.
        Sovereignty in the middle is a commercial and civic one — and it is being left unbuilt.
      </p>
      <p>
        Infersia exists for the middle — to make sovereign compute something an ordinary Australian business can
        actually buy, run, and trust: dedicated, onshore, and accountable. The national ambition is finally on the
        table. The hard part is building the capability the rest of the economy can reach. That is the work in
        front of us.
      </p>
    </>
  ),
}

export const articles: Article[] = [missingMiddle]

export function getArticle(slug: string | undefined): Article | undefined {
  return articles.find((a) => a.slug === slug)
}
