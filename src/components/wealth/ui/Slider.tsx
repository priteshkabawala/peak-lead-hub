'use client'

import type { ReactNode } from 'react'
import { AnimatedNumber } from './Primitives'

/** Range input with a live value read-out and an optional benchmark marker.
 *  Non-linear scales are supported through `toDisplay` / `fromDisplay` so a
 *  money slider can give fine control at the low end and reach into millions. */
export default function Slider({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = (n) => Math.round(n).toLocaleString('en-GB'),
  suffix,
  marks,
  benchmark,
}: {
  label: string
  hint?: ReactNode
  value: number
  onChange: (n: number) => void
  min: number
  max: number
  step?: number
  format?: (n: number) => string
  suffix?: string
  marks?: { at: number; label: string }[]
  benchmark?: { at: number; label: string }
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="pk-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <label className="text-[14.5px] font-semibold">{label}</label>
        <span className="pk-num text-[22px] sm:text-[24px]" style={{ color: 'var(--pk-gold)' }}>
          <AnimatedNumber value={value} format={format} />
          {suffix ? <span className="ml-1 text-[14px] font-medium" style={{ color: 'var(--pk-muted)' }}>{suffix}</span> : null}
        </span>
      </div>
      {hint ? (
        <p className="mt-1 text-[13px] leading-snug" style={{ color: 'var(--pk-muted)' }}>
          {hint}
        </p>
      ) : null}

      <div className="relative mt-3">
        <input
          type="range"
          className="pk-slider relative z-10"
          style={{ ['--pk-fill' as string]: `${pct}%` }}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          aria-valuetext={`${format(value)}${suffix ? ` ${suffix}` : ''}`}
        />
        {benchmark && benchmark.at > min && benchmark.at < max ? (
          <span
            className="pointer-events-none absolute top-[9px] z-0 h-3 w-px"
            style={{
              left: `${((benchmark.at - min) / (max - min)) * 100}%`,
              background: 'var(--pk-line-strong)',
            }}
            title={benchmark.label}
          />
        ) : null}
      </div>

      {marks?.length ? (
        <div className="flex justify-between text-[11.5px]" style={{ color: 'var(--pk-muted)' }}>
          {marks.map((m) => (
            <span key={m.label}>{m.label}</span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** Discrete choice rendered as a segmented control — used for small integers
 *  and yes/no answers where a slider would be overkill. */
export function Segmented<T extends string | number | boolean>({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label: string
  hint?: ReactNode
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="pk-card p-4 sm:p-5">
      <label className="text-[14.5px] font-semibold">{label}</label>
      {hint ? (
        <p className="mt-1 text-[13px] leading-snug" style={{ color: 'var(--pk-muted)' }}>
          {hint}
        </p>
      ) : null}
      <div className="pk-scroll-x mt-3 flex gap-2">
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={String(o.value)}
              onClick={() => onChange(o.value)}
              aria-pressed={active}
              className="shrink-0 rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors"
              style={{
                border: `1px solid ${active ? 'color-mix(in srgb, var(--pk-gold) 55%, transparent)' : 'var(--pk-line)'}`,
                background: active ? 'color-mix(in srgb, var(--pk-gold) 14%, transparent)' : 'transparent',
                color: active ? 'var(--pk-gold)' : 'var(--pk-text-2)',
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
