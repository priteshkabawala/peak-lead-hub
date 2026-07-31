'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CAREER_STAGES, DISCIPLINES } from '../content'
import { useGuide } from '../store'
import type { IconName } from '../ui/Icon'
import { Callout, IconBadge, OptionCard, Stagger, StaggerItem, StepShell } from '../ui/Primitives'
import { Segmented } from '../ui/Slider'

export default function CareerStage() {
  const { state, dispatch } = useGuide()
  const selected = CAREER_STAGES.find((s) => s.id === state.careerStage)

  return (
    <StepShell
      eyebrow="Step 1 of 8"
      title="Where are you in your career?"
      intro="This single answer changes almost everything that follows — how long your money has to last, how much risk is sensible, and which decisions are urgent rather than merely important."
    >
      <Stagger className="grid gap-3 sm:grid-cols-2">
        {CAREER_STAGES.map((stage) => (
          <StaggerItem key={stage.id}>
            <OptionCard
              selected={state.careerStage === stage.id}
              onClick={() => dispatch({ type: 'career', value: stage.id })}
              className="h-full"
            >
              <div className="flex items-start gap-4">
                <IconBadge name={stage.icon as IconName} />
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold tracking-[-0.01em]">{stage.label}</p>
                  <p className="mt-1 text-[13.5px] leading-snug" style={{ color: 'var(--pk-muted)' }}>
                    {stage.blurb}
                  </p>
                </div>
              </div>
            </OptionCard>
          </StaggerItem>
        ))}
      </Stagger>

      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 space-y-4"
          >
            <Callout icon="info" title={`Why "${selected.label}" changes the plan`}>
              {selected.why}
            </Callout>

            <Segmented
              label="What is your field?"
              hint="It sets the typical length of a career in your discipline — you can override every figure in a moment."
              value={state.lifestyle.discipline}
              onChange={(v) => dispatch({ type: 'lifestyle', value: { discipline: v } })}
              options={DISCIPLINES.map((d) => ({ value: d.id, label: d.label }))}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </StepShell>
  )
}
