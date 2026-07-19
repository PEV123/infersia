import { useMemo } from 'react'

// *word* marks the gold emphasis words.
const RAW =
  'Intelligence is becoming infrastructure. And infrastructure belongs to *somewhere.* ' +
  'Infersia builds dedicated AI compute on *Australian* *soil* — owned here, operated here, answerable here. ' +
  "Your data never crosses a border. Your models never train anyone else's. " +
  'What is built here *stays* *here.* Not the cloud, somewhere. *Compute,* *here.*'

export function Manifesto() {
  const words = useMemo(
    () =>
      RAW.split(' ').map((raw) => {
        const gold = raw.startsWith('*')
        return { t: raw.replaceAll('*', ''), gold }
      }),
    []
  )
  const plain = useMemo(() => words.map((w) => w.t).join(' '), [words])

  return (
    <section id="position-wrap" className="pin-wrap pin-170" aria-label="Position">
      <div className="pin">
        <div className="container">
          <p className="eyebrow" data-reveal>
            The case for here
          </p>
          <p className="manifesto" aria-label={plain}>
            {words.map((w, i) => (
              <span key={i} className={w.gold ? 'w g' : 'w'} aria-hidden="true">
                {w.t}{' '}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  )
}
