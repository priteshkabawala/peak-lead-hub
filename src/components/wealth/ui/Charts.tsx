'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { gbp, gbpExact } from '../engine'
import type { ProjectionPoint, ScoreSet } from '../types'

function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[]
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2 text-[12.5px]"
      style={{
        background: 'var(--pk-surface-solid)',
        border: '1px solid var(--pk-line)',
        boxShadow: 'var(--pk-shadow)',
        color: 'var(--pk-text)',
      }}
    >
      <p className="mb-1 font-semibold">Age {label}</p>
      {payload
        .filter((p) => typeof p.value === 'number')
        .map((p) => (
          <p key={p.dataKey} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span style={{ color: 'var(--pk-muted)' }}>{p.name}</span>
            <span className="pk-num ml-auto">{gbpExact(p.value as number)}</span>
          </p>
        ))}
    </div>
  )
}

/** Wealth over time, in today's money. Optionally overlays a baseline so the
 *  cost of a scenario is visible rather than described. */
export function WealthChart({
  points,
  height = 280,
  showBaseline = false,
  retireAge,
}: {
  points: ProjectionPoint[]
  height?: number
  showBaseline?: boolean
  retireAge?: number | null
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="pkWealth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--pk-c1)" stopOpacity={0.55} />
              <stop offset="100%" stopColor="var(--pk-c1)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--pk-line)" strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="age"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
            tickFormatter={(v: number) => `${v}`}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v: number) => gbp(v)}
          />
          <Tooltip content={<MoneyTooltip />} cursor={{ stroke: 'var(--pk-line-strong)' }} />
          {retireAge ? (
            <ReferenceLine
              x={retireAge}
              stroke="var(--pk-line-strong)"
              strokeDasharray="4 4"
              label={{
                value: 'earnings stop',
                position: 'insideTopRight',
                fill: 'var(--pk-muted)',
                fontSize: 11,
              }}
            />
          ) : null}
          {showBaseline ? (
            <Area
              type="monotone"
              dataKey="baseline"
              name="Current plan"
              stroke="var(--pk-muted)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              fill="none"
              isAnimationActive={false}
              dot={false}
            />
          ) : null}
          <Area
            type="monotone"
            dataKey="wealth"
            name={showBaseline ? 'With scenarios' : 'Projected wealth'}
            stroke="var(--pk-c1)"
            strokeWidth={2.2}
            fill="url(#pkWealth)"
            dot={false}
            animationDuration={700}
          />
          {showBaseline ? (
            <Legend
              verticalAlign="top"
              align="right"
              height={28}
              iconType="plainline"
              wrapperStyle={{ fontSize: 12, color: 'var(--pk-muted)' }}
            />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

const RADAR_KEYS: { key: keyof ScoreSet; label: string }[] = [
  { key: 'retirementReadiness', label: 'Retirement' },
  { key: 'investmentReadiness', label: 'Investing' },
  { key: 'diversification', label: 'Diversification' },
  { key: 'resilience', label: 'Resilience' },
  { key: 'wealthProtection', label: 'Protection' },
  { key: 'longTermPlanning', label: 'Planning' },
]

export function ScoreRadar({ scores, height = 280 }: { scores: ScoreSet; height?: number }) {
  const data = RADAR_KEYS.map((k) => ({ axis: k.label, value: scores[k.key] }))
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--pk-line)" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: 'var(--pk-muted)', fontSize: 11.5 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="var(--pk-c1)"
            fill="var(--pk-c1)"
            fillOpacity={0.26}
            strokeWidth={2}
            animationDuration={800}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
