const ROWS = [
  { n: '01', name: 'Finance', line: 'Where every ledger is confidential.' },
  { n: '02', name: 'Legal', line: 'Where privilege is absolute.' },
  { n: '03', name: 'Health', line: 'Where every record is sacred.' },
  { n: '04', name: 'Government', line: 'Where sovereignty is statute.' },
  { n: '05', name: 'Gaming', line: 'Where integrity is the licence.' },
  { n: '06', name: 'Privacy', line: 'Where nothing leaves the room.' },
]

export function Sectors() {
  return (
    <section id="sectors" className="section">
      <div className="container">
        <p className="eyebrow" data-reveal>
          Who we serve
        </p>
        <h2 className="section-title" data-reveal>
          For those who cannot
          <br />
          send it <em>offshore.</em>
        </h2>
        <ul className="rows" data-reveal-group>
          {ROWS.map((r) => (
            <li className="row" key={r.n}>
              <span className="row-n mono">{r.n}</span>
              <span className="row-name">{r.name}</span>
              <span className="row-line">{r.line}</span>
            </li>
          ))}
        </ul>
        <p className="rows-coda" data-reveal>
          — and any institution with something worth <em>protecting.</em>
        </p>
      </div>
    </section>
  )
}
