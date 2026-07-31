'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { SCENARIOS } from '../content'
import { LIFE_EXPECTANCY, gbp } from '../engine'
import { useGuide } from '../store'
import { WealthChart } from '../ui/Charts'
import Icon, { type IconName } from '../ui/Icon'
import { AnimatedNumber, Btn, Callout, IconBadge, SectionTitle, StepShell } from '../ui/Primitives'

export default function Scenarios() {
  const { state, dispatch, projection, scenarioProjection } = useGuide()
  const active = state.activeScenarios
  const l = state.lifestyle

  const yearsDelta = scenarioProjection.fundedYears - projection.fundedYears
  const peakDelta = scenarioProjection.peakWealth - projection.peakWealth
  const retireAge = l.yearsOfEarning > 0 ? l.age + l.yearsOfEarning : null

  return (
    <StepShell
      eyebrow="Step 7 of 8"
      title="What if?"
      intro="Stack any of these on top of your plan and watch the projection respond. This is the part most people skip — and it is the part that decides whether a plan is real."
      wide
    >
      {/* Live result */}
      <div className="pk-card-solid p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="pk-eyebrow">{active.length ? 'With your scenarios applied' : 'Your current plan'}</p>
            <div className="mt-2 flex items-end gap-3">
              <span className="pk-num text-[46px] leading-none sm:text-[58px]">
                {scenarioProjection.depletionAge ? (
                  <>
                    <AnimatedNumber value={scenarioProjection.depletionAge} format={(n) => String(Math.round(n))} />
                  </>
                ) : (
                  `${LIFE_EXPECTANCY}+`
                )}
              </span>
              <span className="pb-2 text-[15px]" style={{ color: 'var(--pk-muted)' }}>
                the age your money runs out
              </span>
            </div>
          </div>

          <AnimatePresence>
            {active.length ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                className="flex flex-wrap gap-3"
              >
                <Delta
                  label="Funded years"
                  value={yearsDelta}
                  format={(n) => `${n > 0 ? '+' : ''}${Math.round(n)} yrs`}
                  goodWhenPositive
                />
                <Delta
                  label="Peak wealth"
                  value={peakDelta}
                  format={(n) => `${n > 0 ? '+' : '−'}${gbp(Math.abs(n))}`}
                  goodWhenPositive
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="mt-5">
          <WealthChart
            points={scenarioProjection.points}
            showBaseline={active.length > 0}
            retireAge={retireAge}
            height={300}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={active.join('|') || 'none'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-[14.5px] leading-relaxed"
            style={{ color: 'var(--pk-text-2)' }}
          >
            {verdict(active.length, yearsDelta, scenarioProjection.depletionAge, l.age, l.hasProtection)}
          </motion.p>
        </AnimatePresence>

        {active.length ? (
          <button
            onClick={() => dispatch({ type: 'clearScenarios' })}
            className="mt-4 inline-flex items-center gap-2 text-[13.5px]"
            style={{ color: 'var(--pk-muted)' }}
          >
            <Icon name="reset" size={15} /> Clear all scenarios
          </button>
        ) : null}
      </div>

      <div className="mt-8">
        <SectionTitle hint={active.length ? `${active.length} active` : 'Tap to apply — they stack'}>
          Stress-test the plan
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIOS.map((s) => {
            const on = active.includes(s.id)
            return (
              <motion.button
                key={s.id}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.985 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="pk-option h-full"
                data-selected={on}
                aria-pressed={on}
                onClick={() => dispatch({ type: 'toggleScenario', value: s.id })}
              >
                <div className="flex items-start gap-3.5">
                  <IconBadge name={s.icon as IconName} tone={on ? 'gold' : 'muted'} size={38} />
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold">{s.label}</p>
                    <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--pk-muted)' }}>
                      {s.short}
                    </p>
                  </div>
                </div>
                <AnimatePresence initial={false}>
                  {on ? (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden text-[13px] leading-relaxed"
                      style={{ color: 'var(--pk-text-2)' }}
                    >
                      <span className="mt-3 block">{s.detail}</span>
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </div>
      </div>

      {active.includes('career-ends') && !l.hasProtection ? (
        <div className="mt-6">
          <Callout icon="shield" tone="rose" title="This is the scenario insurance exists for">
            You told us there is no protection in place. Income protection and career-ending injury cover are what turn
            this chart from a cliff into a step — and they are dramatically cheaper bought young and healthy.
          </Callout>
        </div>
      ) : null}

      <div className="mt-8 flex justify-center">
        <Btn onClick={() => dispatch({ type: 'goto', step: 8 })} icon="arrow">
          Build my roadmap
        </Btn>
      </div>
    </StepShell>
  )
}

function Delta({
  label,
  value,
  format,
  goodWhenPositive,
}: {
  label: string
  value: number
  format: (n: number) => string
  goodWhenPositive: boolean
}) {
  const neutral = Math.abs(value) < 0.5
  const good = goodWhenPositive ? value > 0 : value < 0
  const colour = neutral ? 'var(--pk-muted)' : good ? 'var(--pk-mint)' : 'var(--pk-rose)'
  return (
    <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--pk-surface-2)' }}>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--pk-muted)' }}>
        {label}
      </p>
      <p className="pk-num mt-1 text-[20px]" style={{ color: colour }}>
        {neutral ? 'No change' : format(value)}
      </p>
    </div>
  )
}

function verdict(
  count: number,
  yearsDelta: number,
  depletionAge: number | null,
  age: number,
  hasProtection: boolean,
): string {
  if (count === 0) {
    return 'Nothing applied yet. Start with the one you fear most — for most people that is "career ends tomorrow", and it is the fastest way to find out whether the plan is genuinely resilient.'
  }
  if (depletionAge === null) {
    return 'Your plan absorbs this. Wealth still lasts the full horizon, which means these events would be difficult but not financially destabilising — a genuinely strong position.'
  }
  if (depletionAge < age + 12) {
    return `Under these conditions the money is gone by ${depletionAge} — within ${
      depletionAge - age
    } years. ${hasProtection ? 'Even with cover in place, this needs a plan, not a hope.' : 'With no protection in place, there is nothing to absorb the shock.'} This is exactly the conversation worth having with an adviser.`
  }
  return `This costs you roughly ${Math.abs(Math.round(yearsDelta))} funded ${
    Math.abs(Math.round(yearsDelta)) === 1 ? 'year' : 'years'
  }, with the money running out around ${depletionAge}. Survivable — but it changes what you can commit to now.`
}
