'use client'

import { motion } from 'framer-motion'
import { RISK_PROFILES } from '../content'
import { LIFE_EXPECTANCY, gbp, gbpExact, scoreBand } from '../engine'
import { useGuide } from '../store'
import type { ScoreSet } from '../types'
import { ScoreRadar, WealthChart } from '../ui/Charts'
import Gauge, { ScoreBar } from '../ui/Gauge'
import Icon, { type IconName } from '../ui/Icon'
import { AnimatedNumber, Callout, Chip, SectionTitle, Stat, StepShell } from '../ui/Primitives'

const METRICS: { key: keyof ScoreSet; label: string; icon: IconName; detail: (s: number) => string }[] = [
  {
    key: 'retirementReadiness',
    label: 'Retirement readiness',
    icon: 'clock',
    detail: (s) => (s >= 70 ? 'On track to fund a long retirement' : 'The money runs short of the horizon'),
  },
  {
    key: 'investmentReadiness',
    label: 'Investment readiness',
    icon: 'chart',
    detail: (s) => (s >= 70 ? 'Capital is working' : 'Too much sitting idle or illiquid'),
  },
  {
    key: 'diversification',
    label: 'Diversification',
    icon: 'grid',
    detail: (s) => (s >= 70 ? 'Spread across assets and income' : 'Concentrated in too few places'),
  },
  {
    key: 'resilience',
    label: 'Financial resilience',
    icon: 'shield',
    detail: (s) => (s >= 70 ? 'A shock would not force a sale' : 'A bad month reaches your investments'),
  },
  {
    key: 'wealthProtection',
    label: 'Wealth protection',
    icon: 'vault',
    detail: (s) => (s >= 70 ? 'Cover and structure in place' : 'Gaps in insurance or structure'),
  },
  {
    key: 'longTermPlanning',
    label: 'Long-term planning',
    icon: 'tree',
    detail: (s) => (s >= 70 ? 'Decisions made, not deferred' : 'Key decisions still open'),
  },
]

export default function Dashboard() {
  const { state, scores, projection, riskProfile, dispatch } = useGuide()
  const l = state.lifestyle
  const band = scoreBand(scores.peakScore)
  const profile = RISK_PROFILES[riskProfile]

  const strengths = METRICS.filter((m) => scores[m.key] >= 68).sort((a, b) => scores[b.key] - scores[a.key])
  const attention = METRICS.filter((m) => scores[m.key] < 68).sort((a, b) => scores[a.key] - scores[b.key])
  const retireAge = l.yearsOfEarning > 0 ? l.age + l.yearsOfEarning : null

  return (
    <StepShell
      eyebrow="Step 6 of 8"
      title="Your financial health"
      intro="Six measures built from your answers, plus a projection of your wealth in today's money. It is a model, not a promise — but it is honest about the assumptions underneath it."
      wide
    >
      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="pk-card-solid overflow-hidden"
      >
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="pk-eyebrow">Peak score</p>
            <div className="mt-2 flex items-end gap-4">
              <span
                className="pk-num text-[64px] leading-none sm:text-[86px]"
                style={{ color: `var(--pk-${band.tone === 'good' ? 'mint' : band.tone === 'ok' ? 'sky' : band.tone === 'watch' ? 'amber' : 'rose'})` }}
              >
                <AnimatedNumber value={scores.peakScore} format={(n) => String(Math.round(n))} />
              </span>
              <span className="pb-3 text-[16px]" style={{ color: 'var(--pk-muted)' }}>
                / 100
              </span>
              <span className="pb-3">
                <Chip tone={band.tone}>{band.label}</Chip>
              </span>
            </div>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed" style={{ color: 'var(--pk-text-2)' }}>
              {headline(scores, projection.depletionAge, l.age)}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Chip tone="gold">
                <Icon name="sparkle" size={13} /> {profile.label} investor
              </Chip>
              <Chip>
                {retireAge ? `Earnings stop around ${retireAge}` : 'Earnings have stopped'}
              </Chip>
              <Chip>{state.concerns.length} concerns flagged</Chip>
            </div>
          </div>
          <ScoreRadar scores={scores} height={260} />
        </div>
      </motion.div>

      {/* Key numbers */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Wealth lasts until"
          value={projection.depletionAge ? `Age ${projection.depletionAge}` : `Age ${LIFE_EXPECTANCY}+`}
          sub={
            projection.depletionAge
              ? `${LIFE_EXPECTANCY - projection.depletionAge} years short of ${LIFE_EXPECTANCY}`
              : 'Funded across the whole horizon'
          }
          tone={projection.depletionAge && projection.depletionAge < LIFE_EXPECTANCY ? 'rose' : 'mint'}
        />
        <Stat
          label="Peak wealth"
          value={gbp(projection.peakWealth)}
          sub="in today's money, before it starts being drawn"
        />
        <Stat
          label="Sustainable spending"
          value={`${gbp(projection.sustainableSpend)}/yr`}
          sub={`You currently spend ${gbp(l.monthlySpend * 12)} a year`}
          tone={projection.sustainableSpend >= l.monthlySpend * 12 ? 'mint' : 'amber'}
        />
        <Stat
          label={projection.annualSurplus >= 0 ? 'Saved each year' : 'Shortfall each year'}
          value={gbp(Math.abs(projection.annualSurplus))}
          sub="while you are still earning"
          tone={projection.annualSurplus >= 0 ? 'mint' : 'rose'}
        />
      </div>

      {/* Projection */}
      <div className="mt-8">
        <SectionTitle hint="Today's money, after inflation">Wealth over your lifetime</SectionTitle>
        <div className="pk-card p-4 sm:p-5">
          <WealthChart points={projection.points} retireAge={retireAge} height={300} />
          <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: 'var(--pk-muted)' }}>
            Assumes {profile.expectedReturn}% growth, 3% inflation, spending of {gbpExact(l.monthlySpend)} a month and{' '}
            {l.yearsOfEarning} more {l.yearsOfEarning === 1 ? 'year' : 'years'} of earnings. Every figure is shown in
            today&apos;s purchasing power.
          </p>
        </div>
      </div>

      {/* Gauges */}
      <div className="mt-8">
        <SectionTitle hint="Tap through to see what moves each one">The six measures</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {METRICS.map((m) => (
            <Gauge
              key={m.key}
              value={scores[m.key]}
              label={m.label}
              icon={m.icon}
              detail={m.detail(scores[m.key])}
            />
          ))}
        </div>
      </div>

      {/* Strengths & attention */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="pk-card p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span style={{ color: 'var(--pk-mint)' }}>
              <Icon name="check" size={18} />
            </span>
            <h3 className="text-[16px]">Working in your favour</h3>
          </div>
          {strengths.length ? (
            <div className="space-y-4">
              {strengths.map((m) => (
                <ScoreBar key={m.key} value={scores[m.key]} label={m.label} hint={m.detail(scores[m.key])} />
              ))}
            </div>
          ) : (
            <p className="text-[14px]" style={{ color: 'var(--pk-muted)' }}>
              Nothing is scoring strongly yet — which is exactly what a roadmap is for. Most of these move quickly once
              the first two or three actions are done.
            </p>
          )}
        </div>

        <div className="pk-card p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span style={{ color: 'var(--pk-amber)' }}>
              <Icon name="info" size={18} />
            </span>
            <h3 className="text-[16px]">Needs attention</h3>
          </div>
          {attention.length ? (
            <div className="space-y-4">
              {attention.map((m) => (
                <ScoreBar key={m.key} value={scores[m.key]} label={m.label} hint={m.detail(scores[m.key])} />
              ))}
            </div>
          ) : (
            <p className="text-[14px]" style={{ color: 'var(--pk-muted)' }}>
              Every measure is scoring well. The work now is maintenance, tax efficiency and making sure the plan keeps
              up as your career changes.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Callout icon="info" title="How to read this">
          These scores are directional, not a regulated assessment. They are built from figures you estimated, a
          simplified UK tax calculation and long-run market assumptions. Their job is to show you where to look — a
          regulated adviser turns that into advice.
        </Callout>
      </div>

      <button
        onClick={() => dispatch({ type: 'goto', step: 4 })}
        className="mx-auto mt-6 block text-[13.5px] underline underline-offset-4"
        style={{ color: 'var(--pk-muted)' }}
      >
        Adjust my figures
      </button>
    </StepShell>
  )
}

function headline(s: ScoreSet, depletionAge: number | null, age: number): string {
  if (depletionAge && depletionAge < 70) {
    return `On your current figures your wealth is exhausted around age ${depletionAge} — roughly ${
      depletionAge - age
    } years from now. That is the single most important number on this page, and it is the one most within your control.`
  }
  if (depletionAge) {
    return `Your wealth lasts until around age ${depletionAge}. That is a reasonable position, but it leaves little margin for a market fall, a shorter career or a change in spending.`
  }
  if (s.peakScore >= 78) {
    return 'Your wealth is projected to outlast you on these assumptions. The work now shifts from accumulation to protection, tax efficiency and deciding what the money is actually for.'
  }
  return 'Your wealth is projected to last the full horizon, but the supporting measures are uneven. Protection and diversification are usually what turn a good projection into a durable one.'
}
