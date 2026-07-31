/* A small, dependency-free icon set. Stroke-based so everything inherits
   `currentColor` and stays crisp at any size. */

export type IconName =
  | 'sunrise'
  | 'trend'
  | 'peak'
  | 'bridge'
  | 'sunset'
  | 'crown'
  | 'wing'
  | 'shield'
  | 'chart'
  | 'people'
  | 'clock'
  | 'home'
  | 'rocket'
  | 'stream'
  | 'scales'
  | 'tree'
  | 'heart'
  | 'stop'
  | 'half'
  | 'cross'
  | 'down'
  | 'child'
  | 'globe'
  | 'vault'
  | 'grid'
  | 'flame'
  | 'check'
  | 'arrow'
  | 'arrow-left'
  | 'moon'
  | 'sun'
  | 'sparkle'
  | 'lock'
  | 'plus'
  | 'minus'
  | 'info'
  | 'reset'
  | 'drag'

const PATHS: Record<IconName, string> = {
  sunrise: 'M12 3v5M5.6 10.6 4 9m14.4 1.6L20 9M3 17h18M7 17a5 5 0 0 1 10 0',
  trend: 'M3 17l5.5-5.5 3.5 3.5L21 6M21 6h-5m5 0v5',
  peak: 'M3 19l6-11 4 6 2.5-3.5L21 19z',
  bridge: 'M3 16h18M5 16V9m14 7V9M3 9c3.5-3.5 14.5-3.5 18 0M12 16v-4',
  sunset: 'M12 13V4M5.6 9.6 4 8m14.4 1.6L20 8M3 17h18M7 17a5 5 0 0 1 10 0',
  crown: 'M4 18h16M4 18l-1-9 5 3.5L12 5l4 7.5L21 9l-1 9',
  wing: 'M3 12c6-1 10-4 12-8 1 6-1 11-5 13M3 12c4 1 7 3 8 6',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  chart: 'M4 20V10m5 10V5m5 15v-7m5 7V8',
  people: 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-1.5a4 4 0 0 0-3-3.8M16 3.3a3.5 3.5 0 0 1 0 6.6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3.5 2',
  home: 'M4 10.5 12 4l8 6.5V20H4zM10 20v-6h4v6',
  rocket: 'M5 15c-1 2-1 5-1 5s3 0 5-1m-4-4 3.5 3.5M9 18C6.5 15 6 13 7 10 8.5 5.5 13 3 19 3c0 6-2.5 10.5-7 12-3 1-5 .5-8-1M14 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3',
  stream: 'M3 7c4-3 6 3 10 0s5-1 8 0M3 12c4-3 6 3 10 0s5-1 8 0M3 17c4-3 6 3 10 0s5-1 8 0',
  scales: 'M12 4v16M7 20h10M4 8h16M4 8l-2 6a3 3 0 0 0 6 0zM20 8l2 6a3 3 0 0 1-6 0zM12 4a2 2 0 1 0 0 .01',
  tree: 'M12 21v-5M12 16l-4-3M12 13l4-3M12 3a5 5 0 0 0-4 8 4 4 0 0 0 3 6h2a4 4 0 0 0 3-6 5 5 0 0 0-4-8',
  heart: 'M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7-.2c0 4.8-7 12.2-7 12.2',
  stop: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M9 9h6v6H9z',
  half: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 3v18M3 12h9',
  cross: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M9 9l6 6M15 9l-6 6',
  down: 'M3 6l6 6 4-3 8 8M21 17h-5m5 0v-5',
  child: 'M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M12 11v6M9 20l3-3 3 3M8 14h8',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M3 12h18M12 3c2.5 2.4 3.8 5.5 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.5-3.8-9S9.5 5.4 12 3',
  vault: 'M4 5h16v14H4zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8M12 12h.01M12 8V6M12 18v-2',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  flame: 'M12 21c3.9 0 6-2.4 6-5.5 0-4-3.5-5.5-3-10.5-2.5 1-4 3.5-4 6-1-.6-1.5-1.6-1.5-2.8C7.5 10 6 12 6 15.5 6 18.6 8.1 21 12 21',
  check: 'M4.5 12.5 9.5 17.5 19.5 7',
  arrow: 'M4 12h15M13 6l6 6-6 6',
  'arrow-left': 'M20 12H5M11 18l-6-6 6-6',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
  lock: 'M6 11h12v9H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11M12 15v2',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 11v5M12 8h.01',
  reset: 'M20 12a8 8 0 1 1-2.6-5.9M20 4v4h-4',
  drag: 'M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01',
}

export default function Icon({
  name,
  size = 20,
  className = '',
  strokeWidth = 1.6,
}: {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name] ?? PATHS.info} />
    </svg>
  )
}
