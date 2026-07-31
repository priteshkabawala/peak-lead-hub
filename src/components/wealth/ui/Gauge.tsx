'use client'

import { motion } from 'framer-motion'
import { scoreBand } from '../engine'
import Icon, { type IconName } from './Icon'

const TONE_VAR: Record<string, string> = {
  good: 'var(--pk-mint)',
  ok: 'var(--pk-sky)',
  watch: 'var(--pk-amber)',
  risk: 'var(--pk-rose)',
}

/** Semi-circular score gauge. Colour is derived from the score band so a
 *  glance is enough — the number is confirmation, not the message. */
export default function Gauge({
  value,
  label,
  icon,
  size = 148,
  detail,
}: {
  value: number
  label: string
  icon?: IconName
  size?: number
  detail?: string
}) {
  const band = scoreBand(value)
  const colour = TONE_VAR[band.tone]
  const r = size / 2 - 12
  const circumference = Math.PI * r
  const cx = size / 2
  const cy = size / 2 + 4

  return (
    <div className="pk-card flex flex-col items-center p-4 text-center sm:p-5">
      <svg width={size} height={size * 0.62 + 8} viewBox={`0 0 ${size} ${size * 0.62 + 8}`} role="img" aria-label={`${label}: ${value} out of 100`}>
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="var(--pk-surface-2)"
          strokeWidth={10}
          strokeLinecap="round"
        />
        <motion.path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={colour}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - Math.max(0, Math.min(100, value)) / 100) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fill="var(--pk-text)"
          style={{ fontSize: size * 0.26, fontWeight: 600, letterSpacing: '-0.03em' }}
        >
          {Math.round(value)}
        </text>
      </svg>
      <div className="mt-1 flex items-center gap-1.5">
        {icon ? (
          <span style={{ color: 'var(--pk-muted)' }}>
            <Icon name={icon} size={15} />
          </span>
        ) : null}
        <p className="text-[13.5px] font-semibold">{label}</p>
      </div>
      <p className="mt-0.5 text-[12px] font-semibold" style={{ color: colour }}>
        {band.label}
      </p>
      {detail ? (
        <p className="mt-2 text-[12.5px] leading-snug" style={{ color: 'var(--pk-muted)' }}>
          {detail}
        </p>
      ) : null}
    </div>
  )
}

/** Compact horizontal version for dense lists. */
export function ScoreBar({ value, label, hint }: { value: number; label: string; hint?: string }) {
  const band = scoreBand(value)
  const colour = TONE_VAR[band.tone]
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13.5px] font-semibold">{label}</span>
        <span className="pk-num text-[13.5px]" style={{ color: colour }}>
          {Math.round(value)}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--pk-surface-2)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: colour }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {hint ? (
        <p className="mt-1 text-[12px]" style={{ color: 'var(--pk-muted)' }}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
