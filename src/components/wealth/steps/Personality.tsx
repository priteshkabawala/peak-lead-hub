'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { PERSONALITY_QUESTIONS, RISK_PROFILES } from '../content'
import { useGuide } from '../store'
import type { RiskProfileId } from '../types'
import Icon from '../ui/Icon'
import { Btn, Callout, Chip, StepShell } from '../ui/Primitives'

export default function Personality() {
  const { state, riskProfile } = useGuide()
  const answered = state.personality
  const firstUnanswered = PERSONALITY_QUESTIONS.findIndex(
    (q) => !answered.some((a) => a.questionId === q.id),
  )
  const [index, setIndex] = useState(firstUnanswered === -1 ? PERSONALITY_QUESTIONS.length : firstUnanswered)
  const done = index >= PERSONALITY_QUESTIONS.length

  return (
    <StepShell
      eyebrow="Step 5 of 8"
      title={done ? 'Your investor profile' : 'Six situations'}
      intro={
        done
          ? 'Built from how you said you would behave, not from a form asking how much risk you can tolerate in theory. You can override it — but be honest about the version of you that exists during a bad month.'
          : 'No sliders marked "low to high risk". Just six situations. Answer with what you would actually do, not what sounds disciplined.'
      }
    >
      {done ? (
        <Result profile={riskProfile} onRedo={() => setIndex(0)} />
      ) : (
        <Question index={index} onAnswer={() => setIndex((i) => i + 1)} onBack={() => setIndex((i) => Math.max(0, i - 1))} />
      )}
      {!done && answered.length > 0 ? (
        <button
          onClick={() => setIndex(PERSONALITY_QUESTIONS.length)}
          className="mx-auto mt-6 block text-[13px] underline underline-offset-4"
          style={{ color: 'var(--pk-muted)' }}
        >
          Skip to my profile
        </button>
      ) : null}

      {/* Progress pips */}
      {!done ? (
        <div className="mt-8 flex items-center justify-center gap-2">
          {PERSONALITY_QUESTIONS.map((q, i) => (
            <span
              key={q.id}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === index ? 26 : 8,
                background:
                  i === index
                    ? 'var(--pk-gold)'
                    : answered.some((a) => a.questionId === q.id)
                      ? 'color-mix(in srgb, var(--pk-gold) 45%, transparent)'
                      : 'var(--pk-surface-2)',
              }}
            />
          ))}
        </div>
      ) : null}
    </StepShell>
  )
}

function Question({
  index,
  onAnswer,
  onBack,
}: {
  index: number
  onAnswer: () => void
  onBack: () => void
}) {
  const { state, dispatch } = useGuide()
  const q = PERSONALITY_QUESTIONS[index]
  const current = state.personality.find((a) => a.questionId === q.id)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={q.id}
        initial={{ opacity: 0, x: 26 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -26 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="pk-card-solid p-5 sm:p-7">
          <Chip tone="gold">{q.scene}</Chip>
          <p className="mt-4 text-[19px] leading-snug sm:text-[23px]" style={{ letterSpacing: '-0.02em' }}>
            {q.prompt}
          </p>

          <div className="mt-6 space-y-2.5">
            {q.options.map((o, i) => {
              const selected = current?.optionIndex === i
              return (
                <motion.button
                  key={o.label}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                  className="pk-option flex items-center gap-4"
                  data-selected={selected}
                  onClick={() => {
                    dispatch({ type: 'answer', questionId: q.id, optionIndex: i, weight: o.weight })
                    window.setTimeout(onAnswer, 180)
                  }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
                    style={{
                      background: selected ? 'var(--pk-gold)' : 'var(--pk-surface-2)',
                      color: selected ? '#1a1206' : 'var(--pk-muted)',
                      border: selected ? 'none' : '1px solid var(--pk-line)',
                    }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{o.label}</span>
                    <span className="block text-[13px]" style={{ color: 'var(--pk-muted)' }}>
                      {o.sub}
                    </span>
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>

        {index > 0 ? (
          <button
            onClick={onBack}
            className="mt-4 inline-flex items-center gap-2 text-[13.5px]"
            style={{ color: 'var(--pk-muted)' }}
          >
            <Icon name="arrow-left" size={15} /> Previous situation
          </button>
        ) : null}
      </motion.div>
    </AnimatePresence>
  )
}

function Result({ profile, onRedo }: { profile: RiskProfileId; onRedo: () => void }) {
  const { dispatch, state } = useGuide()
  const p = RISK_PROFILES[profile]

  const allocation = useMemo(
    () => [
      { name: 'Equities', value: p.equity, fill: 'var(--pk-c1)' },
      { name: 'Bonds', value: p.bonds, fill: 'var(--pk-c2)' },
      { name: 'Alternatives', value: p.alternatives, fill: 'var(--pk-c4)' },
      { name: 'Cash', value: p.cash, fill: 'var(--pk-c3)' },
    ],
    [p],
  )

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="pk-card-solid overflow-hidden">
        <div
          className="p-6 sm:p-8"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--pk-gold) 14%, transparent), transparent 70%)',
          }}
        >
          <p className="pk-eyebrow">Your profile</p>
          <h2 className="mt-2 text-[34px] sm:text-[44px]">{p.label}</h2>
          <p className="mt-1 text-[15px]" style={{ color: 'var(--pk-gold)' }}>
            {p.headline}
          </p>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed" style={{ color: 'var(--pk-text-2)' }}>
            {p.description}
          </p>
        </div>

        <div className="pk-hairline" />

        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[240px_1fr]">
          <div className="relative mx-auto h-[200px] w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocation}
                  dataKey="value"
                  innerRadius={62}
                  outerRadius={95}
                  paddingAngle={3}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                  isAnimationActive
                >
                  {allocation.map((a) => (
                    <Cell key={a.name} fill={a.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="pk-num text-[26px]" style={{ color: 'var(--pk-gold)' }}>
                {p.equity}%
              </span>
              <span className="text-[11.5px]" style={{ color: 'var(--pk-muted)' }}>
                in growth assets
              </span>
            </div>
          </div>

          <div>
            <div className="grid grid-cols-2 gap-3">
              {allocation.map((a) => (
                <div key={a.name} className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: a.fill }} />
                  <span className="text-[13.5px]" style={{ color: 'var(--pk-text-2)' }}>
                    {a.name}
                  </span>
                  <span className="pk-num ml-auto text-[13.5px]">{a.value}%</span>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <Metric label="Target return" value={`${p.expectedReturn}%`} sub="a year, before inflation" />
              <Metric label="Typical swing" value={`±${p.volatility}%`} sub="in an average year" />
              <Metric label="Worst year" value={`${p.worstYear}%`} sub="you should expect" tone="rose" />
            </div>

            <div className="mt-5">
              <Callout icon="info" title="What this does not mean">
                A profile describes the long money, not all of it. Your emergency cash and anything you need within two
                years should sit in cash regardless of what this says.
              </Callout>
            </div>
          </div>
        </div>

        <div className="pk-hairline" />

        <div className="p-6 sm:p-8">
          <p className="mb-3 text-[13.5px] font-semibold">Not quite right? Set it yourself.</p>
          <div className="pk-scroll-x flex gap-2">
            {(Object.keys(RISK_PROFILES) as RiskProfileId[]).map((id) => (
              <button
                key={id}
                onClick={() => dispatch({ type: 'riskOverride', value: id })}
                className="shrink-0 rounded-full px-4 py-2 text-[13.5px] font-semibold"
                style={{
                  border: `1px solid ${profile === id ? 'color-mix(in srgb, var(--pk-gold) 55%, transparent)' : 'var(--pk-line)'}`,
                  background: profile === id ? 'color-mix(in srgb, var(--pk-gold) 14%, transparent)' : 'transparent',
                  color: profile === id ? 'var(--pk-gold)' : 'var(--pk-text-2)',
                }}
              >
                {RISK_PROFILES[id].label}
              </button>
            ))}
            {state.riskOverride ? (
              <button
                onClick={() => dispatch({ type: 'riskOverride', value: null })}
                className="shrink-0 rounded-full px-4 py-2 text-[13.5px]"
                style={{ color: 'var(--pk-muted)' }}
              >
                Use my answers
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Btn variant="ghost" icon="reset" iconSide="left" onClick={onRedo}>
          Retake the six situations
        </Btn>
      </div>
    </motion.div>
  )
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: 'var(--pk-surface-2)' }}>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--pk-muted)' }}>
        {label}
      </p>
      <p className="pk-num mt-1 text-[20px]" style={tone ? { color: `var(--pk-${tone})` } : undefined}>
        {value}
      </p>
      <p className="mt-0.5 text-[11.5px] leading-tight" style={{ color: 'var(--pk-muted)' }}>
        {sub}
      </p>
    </div>
  )
}
