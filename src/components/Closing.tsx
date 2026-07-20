import { Footer } from './Footer'
import { Mark } from './Mark'

export function Closing() {
  return (
    <section id="contact" className="closing">
      <div className="container closing-inner">
        <p data-reveal>
          <Mark size={42} className="closing-mark" />
        </p>
        <h2 className="closing-title" data-reveal>
          The infrastructure beneath
          <br />
          Australian <em>AI.</em>
        </h2>
        <p className="closing-line" data-reveal>
          Capacity is allocated, not listed. Tell us what you're building.
        </p>
        <p data-reveal>
          <a className="btn btn-gold btn-lg" href="mailto:sales@infersia.com.au?subject=Access%20enquiry">
            Enquire
          </a>
        </p>
        <p className="closing-mail mono" data-reveal>
          <a href="mailto:sales@infersia.com.au">sales@infersia.com.au</a>
        </p>
      </div>
      <Footer />
    </section>
  )
}
