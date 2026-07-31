'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CONCERNS } from '../content'
import { useGuide } from '../store'
import Icon from '../ui/Icon'
import { Stagger, StaggerItem, StepShell } from '../ui/Primitives'

export default function Concerns() {
  const { state, dispatch } = useGuide()

  return (
    <StepShell
      eyebrow="Step 3 of 8"
      title="What keeps you up at night?"
      intro="Select everything that applies. Each one opens with why it is so common in your position — and what actually reduces it. Your answers shape the roadmap at the end."
    >
      <Stagger className="space-y-3">
        {CONCERNS.map((c) => {
          const on = state.concerns.includes(c.id)
          return (
            <StaggerItem key={c.id}>
              <div className="pk-option overflow-hidden !p-0" data-selected={on}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => dispatch({ type: 'toggleConcern', value: c.id })}
                  className="flex w-full items-center gap-3.5 p-[18px] text-left"
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors"
                    style={{
                      border: `1.5px solid ${on ? 'var(--pk-gold)' : 'var(--pk-line-strong)'}`,
                      background: on ? 'var(--pk-gold)' : 'transparent',
                      color: on ? '#1a1206' : 'transparent',
                    }}
                  >
                    <Icon name="check" size={14} strokeWidth={2.6} />
                  </span>
                  <span className="text-[15.5px] font-semibold">{c.label}</span>
                </button>

                <AnimatePresence initial={false}>
                  {on ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="space-y-3 px-[18px] pb-5">
                        <div className="pk-hairline" />
                        <div>
                          <p className="pk-eyebrow" style={{ color: 'var(--pk-muted)' }}>
                            Why this is so common
                          </p>
                          <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: 'var(--pk-text-2)' }}>
                            {c.common}
                          </p>
                        </div>
                        <div>
                          <p className="pk-eyebrow">How it gets managed</p>
                          <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: 'var(--pk-text-2)' }}>
                            {c.managed}
                          </p>
                        </div>
                        {c.stat ? (
                          <p
                            className="border-l-2 pl-3 text-[13.5px] italic leading-relaxed"
                            style={{ borderColor: 'var(--pk-gold)', color: 'var(--pk-muted)' }}
                          >
                            {c.stat}
                          </p>
                        ) : null}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </StaggerItem>
          )
        })}
      </Stagger>

      <p className="mt-6 text-center text-[13px]" style={{ color: 'var(--pk-muted)' }}>
        {state.concerns.length === 0
          ? 'Nothing selected — that is a valid answer too.'
          : `${state.concerns.length} selected. Every one of these is addressed in your roadmap.`}
      </p>
    </StepShell>
  )
}
