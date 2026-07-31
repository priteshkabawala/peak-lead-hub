'use client'

import { AnimatePresence, Reorder, motion } from 'framer-motion'
import { PRIORITIES } from '../content'
import { useGuide } from '../store'
import Icon, { type IconName } from '../ui/Icon'
import { Callout, StepShell } from '../ui/Primitives'

const MAX = 5

export default function Priorities() {
  const { state, dispatch } = useGuide()
  const chosen = state.priorities
  const pool = PRIORITIES.filter((p) => !chosen.includes(p.id))

  const add = (id: (typeof PRIORITIES)[number]['id']) => {
    if (chosen.length >= MAX) return
    dispatch({ type: 'priorities', value: [...chosen, id] })
  }
  const remove = (id: (typeof PRIORITIES)[number]['id']) =>
    dispatch({ type: 'priorities', value: chosen.filter((c) => c !== id) })

  return (
    <StepShell
      eyebrow="Step 2 of 8"
      title="What matters most?"
      intro={`Choose up to ${MAX}, then drag them into the order that is honestly true for you. Priorities that conflict — growth and protection, generosity and independence — are exactly where planning earns its keep.`}
    >
      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        {/* Ranked list */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Your ranking</h2>
            <span className="text-[12.5px]" style={{ color: 'var(--pk-muted)' }}>
              {chosen.length}/{MAX} chosen
            </span>
          </div>

          {chosen.length === 0 ? (
            <div
              className="flex h-40 items-center justify-center rounded-[18px] border border-dashed p-6 text-center text-[13.5px]"
              style={{ borderColor: 'var(--pk-line-strong)', color: 'var(--pk-muted)' }}
            >
              Pick from the list to start building your ranking.
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={chosen}
              onReorder={(v) => dispatch({ type: 'priorities', value: v })}
              className="space-y-2"
            >
              <AnimatePresence initial={false}>
                {chosen.map((id, i) => {
                  const p = PRIORITIES.find((x) => x.id === id)!
                  return (
                    <Reorder.Item
                      key={id}
                      value={id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      whileDrag={{ scale: 1.03, cursor: 'grabbing', zIndex: 10 }}
                      className="pk-card flex cursor-grab items-center gap-3 p-3.5 active:cursor-grabbing"
                    >
                      <span
                        className="pk-num flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px]"
                        style={{
                          background:
                            i === 0
                              ? 'linear-gradient(135deg, var(--pk-gold-soft), var(--pk-gold))'
                              : 'var(--pk-surface-2)',
                          color: i === 0 ? '#1a1206' : 'var(--pk-text-2)',
                          border: i === 0 ? 'none' : '1px solid var(--pk-line)',
                        }}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14.5px] font-semibold">{p.label}</span>
                        <span className="block text-[12.5px]" style={{ color: 'var(--pk-muted)' }}>
                          {p.hint}
                        </span>
                      </span>
                      <span style={{ color: 'var(--pk-muted)' }} className="shrink-0">
                        <Icon name="drag" size={16} />
                      </span>
                      <button
                        onClick={() => remove(id)}
                        aria-label={`Remove ${p.label}`}
                        className="shrink-0 rounded-full p-1.5"
                        style={{ color: 'var(--pk-muted)' }}
                      >
                        <Icon name="minus" size={16} />
                      </button>
                    </Reorder.Item>
                  )
                })}
              </AnimatePresence>
            </Reorder.Group>
          )}

          {chosen.length > 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
              <Callout icon="sparkle" title={`Number one: ${PRIORITIES.find((p) => p.id === chosen[0])!.label}`}>
                {NUMBER_ONE_NOTE[chosen[0]]}
              </Callout>
            </motion.div>
          ) : null}
        </div>

        {/* Pool */}
        <div>
          <h2 className="mb-3 text-[15px] font-semibold">
            {chosen.length >= MAX ? 'Remove one to swap' : 'Tap to add'}
          </h2>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence initial={false}>
              {pool.map((p) => (
                <motion.button
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.22 }}
                  onClick={() => add(p.id)}
                  disabled={chosen.length >= MAX}
                  className="pk-option flex items-center gap-2.5 disabled:opacity-40"
                  style={{ width: 'auto', padding: '11px 15px', borderRadius: 999 }}
                >
                  <span style={{ color: 'var(--pk-gold)' }}>
                    <Icon name={p.icon as IconName} size={17} />
                  </span>
                  <span className="text-[14px] font-medium">{p.label}</span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </StepShell>
  )
}

const NUMBER_ONE_NOTE: Record<string, string> = {
  freedom:
    'Freedom is an income question, not a capital one. The target is a portfolio that pays your fixed costs without being sold — everything above that is optional.',
  protect:
    'Protecting wealth is mostly about avoiding a small number of large mistakes: concentration, illiquidity, and anything you cannot explain in a sentence.',
  grow:
    'Growth is bought with time and volatility. It belongs to the pot you will not touch for a decade — never to the money that pays next year’s bills.',
  family:
    'Support works far better as structure than as generosity: a defined allowance, an asset you own, a trust for education. It lasts longer and preserves the relationship.',
  retirement:
    'Retiring in your thirties is a fifty-year income problem. It needs two pots — a bridge to pension age, and long money for everything after it.',
  property:
    'Property is a lifestyle asset that behaves like an investment. Judge it on the running cost and the liquidity it removes, not the purchase price.',
  business:
    'Backing businesses is a legitimate strategy with a hard rule attached: cap it as a percentage of net worth you could lose entirely without changing your life.',
  passive:
    'Passive income is engineered, not found. Dividends, index-linked bonds, commercial rent and royalties — arranged so payments arrive whether you work or not.',
  tax: 'Tax efficiency is sequencing and timing, not schemes. Wrappers first, structure second, and never anything whose main purpose is the tax outcome.',
  legacy:
    'Legacy planning is cheapest early. Most gifts leave your estate entirely after seven years, so starting in your thirties removes almost all the timing risk.',
  philanthropy:
    'Structured giving — a donor-advised fund or foundation — makes generosity deliberate and tax-efficient, and gives the family something to run together for decades.',
}
