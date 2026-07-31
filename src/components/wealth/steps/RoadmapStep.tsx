'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { PRIORITIES } from '../content'
import { LIFE_EXPECTANCY, PENSION_ACCESS_AGE } from '../engine'
import { useGuide } from '../store'
import type { Roadmap, RoadmapAction } from '../types'
import Icon, { type IconName } from '../ui/Icon'
import { Chip, Reveal, StepShell } from '../ui/Primitives'
import ConnectPanel from './ConnectPanel'

const TAG_META: Record<RoadmapAction['tag'], { label: string; icon: IconName; tone: string }> = {
  pension: { label: 'Pension', icon: 'vault', tone: 'gold' },
  invest: { label: 'Investing', icon: 'chart', tone: 'sky' },
  protect: { label: 'Protection', icon: 'shield', tone: 'rose' },
  tax: { label: 'Tax', icon: 'scales', tone: 'mint' },
  cash: { label: 'Cash', icon: 'stream', tone: 'sky' },
  plan: { label: 'Planning', icon: 'peak', tone: 'gold' },
  legacy: { label: 'Legacy', icon: 'tree', tone: 'mint' },
  business: { label: 'Business', icon: 'rocket', tone: 'sky' },
}

const PHASES: { key: keyof Roadmap; title: string; window: string; blurb: string }[] = [
  {
    key: 'sixMonths',
    title: 'Next 6 months',
    window: 'Do these first',
    blurb: 'Foundations. Nothing further along the roadmap works reliably until these are in place.',
  },
  {
    key: 'threeYears',
    title: 'Next 3 years',
    window: 'While you are earning',
    blurb: 'Structure. This is the window where decisions have the largest effect on the rest of your life.',
  },
  {
    key: 'tenYears',
    title: 'Next 10 years',
    window: 'The long game',
    blurb: 'Compounding and discipline. Mostly about not interrupting what you have already set up.',
  },
  {
    key: 'retirement',
    title: 'Retirement',
    window: 'Turning wealth into income',
    blurb: 'The switch from building to drawing — where sequencing and tax do most of the work.',
  },
]

export default function RoadmapStep() {
  const { state, roadmap, scores } = useGuide()
  const [openId, setOpenId] = useState<string | null>(roadmap.sixMonths[0]?.id ?? null)
  const total = PHASES.reduce((n, p) => n + roadmap[p.key].length, 0)
  const top = state.priorities[0] ? PRIORITIES.find((p) => p.id === state.priorities[0]) : null

  return (
    <StepShell
      eyebrow="Step 8 of 8"
      title="Your roadmap"
      intro={`${total} actions, ordered by what they are worth to you rather than what is easiest. Every one traces back to something you told us — expand any action to see why it is there.`}
      wide
    >
      <div className="pk-card-solid mb-8 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-3">
          <Summary label="Peak score" value={String(scores.peakScore)} sub="out of 100 today" />
          <Summary
            label="Top priority"
            value={top?.label ?? 'Not set'}
            sub={top?.hint ?? 'Rank your priorities to sharpen this'}
          />
          <Summary
            label="Planning horizon"
            value={`${LIFE_EXPECTANCY - state.lifestyle.age} years`}
            sub={`Pension access at ${PENSION_ACCESS_AGE}`}
          />
        </div>
      </div>

      <div className="relative">
        {/* Timeline spine */}
        <div
          className="absolute left-[15px] top-2 hidden h-[calc(100%-16px)] w-px sm:block"
          style={{ background: 'linear-gradient(to bottom, var(--pk-gold), var(--pk-line), transparent)' }}
        />

        <div className="space-y-10">
          {PHASES.map((phase, pi) => (
            <Reveal key={phase.key} delay={pi * 0.05}>
              <div className="sm:pl-12">
                <div className="relative">
                  <span
                    className="absolute -left-12 top-1 hidden h-8 w-8 items-center justify-center rounded-full sm:flex"
                    style={{
                      background: 'var(--pk-bg)',
                      border: `1px solid ${pi === 0 ? 'var(--pk-gold)' : 'var(--pk-line-strong)'}`,
                      color: pi === 0 ? 'var(--pk-gold)' : 'var(--pk-muted)',
                    }}
                  >
                    <span className="pk-num text-[13px]">{pi + 1}</span>
                  </span>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-[22px] sm:text-[26px]">{phase.title}</h2>
                    <Chip tone={pi === 0 ? 'gold' : 'default'}>{phase.window}</Chip>
                  </div>
                  <p className="mt-1.5 max-w-2xl text-[14px]" style={{ color: 'var(--pk-muted)' }}>
                    {phase.blurb}
                  </p>
                </div>

                <div className="mt-4 space-y-2.5">
                  {roadmap[phase.key].map((a) => (
                    <ActionCard
                      key={a.id}
                      action={a}
                      open={openId === a.id}
                      onToggle={() => setOpenId((o) => (o === a.id ? null : a.id))}
                    />
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <ConnectPanel />
      </div>
    </StepShell>
  )
}

function ActionCard({
  action,
  open,
  onToggle,
}: {
  action: RoadmapAction
  open: boolean
  onToggle: () => void
}) {
  const meta = TAG_META[action.tag]
  const urgent = action.weight >= 90
  return (
    <div className="pk-card overflow-hidden">
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3.5 p-4 text-left sm:p-5">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            color: `var(--pk-${meta.tone})`,
            background: `color-mix(in srgb, var(--pk-${meta.tone}) 13%, transparent)`,
            border: `1px solid color-mix(in srgb, var(--pk-${meta.tone}) 26%, transparent)`,
          }}
        >
          <Icon name={meta.icon} size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[15.5px] font-semibold leading-snug">{action.title}</span>
            {urgent ? <Chip tone="risk">Priority</Chip> : null}
          </span>
          <span className="mt-1 block text-[12.5px]" style={{ color: 'var(--pk-muted)' }}>
            {meta.label}
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.25 }}
          style={{ color: 'var(--pk-muted)' }}
          className="mt-1 shrink-0"
        >
          <Icon name="plus" size={17} />
        </motion.span>
      </button>

      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        style={{ overflow: 'hidden' }}
      >
        <div className="space-y-3 px-4 pb-5 sm:px-5 sm:pl-[70px]">
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--pk-text-2)' }}>
            {action.detail}
          </p>
          <p
            className="border-l-2 pl-3 text-[13px] leading-relaxed"
            style={{ borderColor: 'var(--pk-gold)', color: 'var(--pk-muted)' }}
          >
            <strong style={{ color: 'var(--pk-gold)' }}>Why you: </strong>
            {action.because}
          </p>
        </div>
      </motion.div>
    </div>
  )
}

function Summary({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.13em]" style={{ color: 'var(--pk-muted)' }}>
        {label}
      </p>
      <p className="pk-num mt-1.5 text-[22px] leading-tight">{value}</p>
      <p className="mt-1 text-[12.5px]" style={{ color: 'var(--pk-muted)' }}>
        {sub}
      </p>
    </div>
  )
}
