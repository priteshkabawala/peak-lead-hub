'use client'

import { motion } from 'framer-motion'
import { useGuide } from '../store'
import Icon from '../ui/Icon'
import { Btn, IconBadge, Stagger, StaggerItem } from '../ui/Primitives'

const PILLARS = [
  {
    icon: 'clock' as const,
    title: 'Built for a short career',
    body: 'Most planning assumes forty years of earning. Yours assumes eight — and sixty years of living afterwards.',
  },
  {
    icon: 'shield' as const,
    title: 'Private by design',
    body: 'Nothing you enter leaves your device unless you choose to speak to someone. No account, no email required.',
  },
  {
    icon: 'chart' as const,
    title: 'Numbers, not brochures',
    body: 'Every answer feeds a live model. You will see how long your wealth lasts before anyone mentions a product.',
  },
]

export default function Welcome() {
  const { state, dispatch } = useGuide()
  const resumable = state.savedAt && state.visited.length > 1

  return (
    <div className="relative mx-auto w-full max-w-4xl px-5 pb-32 pt-10 sm:px-6 sm:pt-16">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="pk-chip" style={{ color: 'var(--pk-gold)', borderColor: 'color-mix(in srgb, var(--pk-gold) 35%, transparent)' }}>
          <Icon name="sparkle" size={14} />
          Private wealth guide
        </span>

        <h1 className="mt-6 text-[38px] leading-[1.03] sm:text-[62px]">
          You earn in a decade
          <br />
          what most earn in
          <span style={{ color: 'var(--pk-gold)' }}> forty</span>.
        </h1>

        <p className="mt-6 max-w-2xl text-[16px] leading-relaxed sm:text-[19px]" style={{ color: 'var(--pk-text-2)' }}>
          That is an extraordinary advantage and an unusual problem. This guide takes about eight minutes.
          It builds a live picture of your finances, stress-tests it against the things that actually end careers,
          and gives you a roadmap you can act on — or hand to an adviser.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Btn onClick={() => dispatch({ type: 'goto', step: 1 })} icon="arrow">
            {resumable ? 'Continue where I left off' : 'Begin'}
          </Btn>
          {resumable ? (
            <Btn variant="ghost" icon="reset" iconSide="left" onClick={() => dispatch({ type: 'reset' })}>
              Start again
            </Btn>
          ) : (
            <span className="text-[13.5px]" style={{ color: 'var(--pk-muted)' }}>
              No sign-up. Nothing saved to a server.
            </span>
          )}
        </div>
      </motion.div>

      <Stagger className="mt-14 grid gap-4 sm:grid-cols-3">
        {PILLARS.map((p) => (
          <StaggerItem key={p.title}>
            <div className="pk-card h-full p-5">
              <IconBadge name={p.icon} />
              <h3 className="mt-4 text-[16px]">{p.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--pk-text-2)' }}>
                {p.body}
              </p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px]"
        style={{ color: 'var(--pk-muted)' }}
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="lock" size={14} /> Data stays in your browser
        </span>
        <span className="inline-flex items-center gap-2">
          <Icon name="check" size={14} /> FCA-regulated advisers on request
        </span>
        <span className="inline-flex items-center gap-2">
          <Icon name="clock" size={14} /> About 8 minutes
        </span>
      </motion.div>
    </div>
  )
}
