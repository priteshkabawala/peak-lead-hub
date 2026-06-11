import { PageHero, CtaBand } from '@/components/site/PageBits'
import LeadForm from '@/components/site/LeadForm'
import type { Service } from '@/lib/services'

export default function ServicePage({ service }: { service: Service }) {
  return (
    <>
      <PageHero title={service.title} crumb={`Services / ${service.title}`} />
      <section className="mpa-section">
        <div className="mpa-wrap" style={{ display: 'grid', gridTemplateColumns: '1.6fr .9fr', gap: 48 }}>
          <div className="mpa-prose">
            <p className="mpa-lead" style={{ marginBottom: 24 }}>{service.intro}</p>
            {service.blocks.map((b, i) => (
              <div key={i}>
                {b.heading && <h2>{b.heading}</h2>}
                {b.paras?.map((p, j) => <p key={j}>{p}</p>)}
                {b.bullets && (
                  <ul>
                    {b.bullets.map((li, j) => (
                      <li key={j}>{li}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <div style={{ position: 'sticky', top: 96, alignSelf: 'start' }}>
            <LeadForm
              variant="callback"
              source={`Service — ${service.title}`}
              title="Request a callback"
              subtitle="Speak to a regulated adviser, free of charge."
            />
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  )
}
