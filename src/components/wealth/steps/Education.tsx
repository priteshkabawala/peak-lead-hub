'use client'

import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { EDUCATION } from '../content'
import { useGuide } from '../store'
import Icon, { type IconName } from '../ui/Icon'
import { Chip, Expandable, Stagger, StaggerItem, StepShell } from '../ui/Primitives'
import ConnectPanel from './ConnectPanel'

/* Which topics matter most given what the user told us — the hub reorders
   itself rather than making them hunt. */
const RELEVANCE: Record<string, { concerns: string[]; priorities: string[] }> = {
  investing: { concerns: ['bad-investments', 'volatility'], priorities: ['grow', 'freedom'] },
  pensions: { concerns: ['retirement', 'tax'], priorities: ['retirement', 'tax'] },
  diversification: { concerns: ['bad-investments', 'volatility'], priorities: ['protect', 'grow'] },
  inflation: { concerns: ['inflation', 'running-out'], priorities: ['protect'] },
  tax: { concerns: ['tax'], priorities: ['tax', 'business'] },
  cashflow: { concerns: ['running-out', 'lifestyle'], priorities: ['freedom', 'passive'] },
  retirement: { concerns: ['retirement', 'running-out'], priorities: ['retirement', 'freedom'] },
  estate: { concerns: ['family'], priorities: ['legacy', 'family', 'philanthropy'] },
  insurance: { concerns: ['injury', 'family'], priorities: ['protect', 'family'] },
  preservation: { concerns: ['advisers', 'bad-investments'], priorities: ['protect', 'legacy'] },
}

export default function Education() {
  const { state } = useGuide()
  const [filter, setFilter] = useState<'all' | 'relevant'>('all')

  const topics = useMemo(() => {
    const scored = EDUCATION.map((t) => {
      const r = RELEVANCE[t.id]
      const score =
        (r?.concerns.filter((c) => state.concerns.includes(c as never)).length ?? 0) * 2 +
        (r?.priorities.filter((p) => state.priorities.includes(p as never)).length ?? 0)
      return { topic: t, score }
    })
    const sorted = [...scored].sort((a, b) => b.score - a.score)
    return filter === 'relevant' ? sorted.filter((s) => s.score > 0) : sorted
  }, [state.concerns, state.priorities, filter])

  const relevantCount = topics.filter((t) => t.score > 0).length

  return (
    <StepShell
      eyebrow="Education hub"
      title="The ten things worth understanding"
      intro="Short, plain explanations with an example drawn from careers like yours. Read one, or read them all — nothing here is trying to sell you anything."
      wide
    >
      {relevantCount > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            All ten
          </FilterChip>
          <FilterChip active={filter === 'relevant'} onClick={() => setFilter('relevant')}>
            Matched to your answers ({relevantCount})
          </FilterChip>
        </div>
      ) : null}

      <Stagger className="grid gap-3 lg:grid-cols-2">
        {topics.map(({ topic, score }) => (
          <StaggerItem key={topic.id}>
            <Expandable
              title={topic.title}
              subtitle={topic.tagline}
              icon={topic.icon as IconName}
              meta={
                <span className="hidden shrink-0 sm:block">
                  {score > 0 ? <Chip tone="gold">For you</Chip> : <Chip>{topic.minutes} min</Chip>}
                </span>
              }
            >
              <div className="space-y-3.5 sm:pl-[58px]">
                {topic.body.map((para, i) => (
                  <p key={i} className="text-[14.5px] leading-relaxed" style={{ color: 'var(--pk-text-2)' }}>
                    {para}
                  </p>
                ))}

                <div className="rounded-2xl p-4" style={{ background: 'var(--pk-surface-2)' }}>
                  <p className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: 'var(--pk-gold)' }}>
                    <Icon name="sparkle" size={14} />
                    {topic.example.title}
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--pk-text-2)' }}>
                    {topic.example.text}
                  </p>
                </div>

                <ul className="space-y-2">
                  {topic.keyPoints.map((k) => (
                    <li key={k} className="flex items-start gap-2.5 text-[13.5px]" style={{ color: 'var(--pk-text-2)' }}>
                      <span className="mt-0.5 shrink-0" style={{ color: 'var(--pk-mint)' }}>
                        <Icon name="check" size={15} strokeWidth={2.2} />
                      </span>
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
            </Expandable>
          </StaggerItem>
        ))}
      </Stagger>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-12">
        <ConnectPanel />
      </motion.div>
    </StepShell>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors"
      style={{
        border: `1px solid ${active ? 'color-mix(in srgb, var(--pk-gold) 55%, transparent)' : 'var(--pk-line)'}`,
        background: active ? 'color-mix(in srgb, var(--pk-gold) 14%, transparent)' : 'transparent',
        color: active ? 'var(--pk-gold)' : 'var(--pk-text-2)',
      }}
    >
      {children}
    </button>
  )
}
