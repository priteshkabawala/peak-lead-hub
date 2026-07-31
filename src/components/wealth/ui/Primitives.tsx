'use client'

import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion'
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import Icon, { type IconName } from './Icon'

/* ── Layout ───────────────────────────────────────────────────────────── */

export function StepShell({
  eyebrow,
  title,
  intro,
  children,
  wide = false,
}: {
  eyebrow: string
  title: ReactNode
  intro?: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className={`relative mx-auto w-full ${wide ? 'max-w-6xl' : 'max-w-3xl'} px-5 pb-32 pt-8 sm:px-6 sm:pt-12`}>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="pk-eyebrow">{eyebrow}</p>
        <h1 className="mt-3 text-[30px] leading-[1.08] sm:text-[42px]">{title}</h1>
        {intro ? (
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed sm:text-[17px]" style={{ color: 'var(--pk-text-2)' }}>
            {intro}
          </p>
        ) : null}
      </motion.div>
      <div className="mt-8 sm:mt-10">{children}</div>
    </div>
  )
}

/** Staggered entrance for lists of cards. */
export function Stagger({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045 } } }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  )
}

/** Fades content in the first time it scrolls into view. */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <div ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  )
}

/* ── Controls ─────────────────────────────────────────────────────────── */

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost'
  icon?: IconName
  iconSide?: 'left' | 'right'
}

export function Btn({ variant = 'primary', icon, iconSide = 'right', children, className = '', ...rest }: BtnProps) {
  return (
    <button className={`pk-btn pk-btn-${variant} ${className}`} {...rest}>
      {icon && iconSide === 'left' ? <Icon name={icon} size={17} /> : null}
      {children}
      {icon && iconSide === 'right' ? <Icon name={icon} size={17} /> : null}
    </button>
  )
}

export function OptionCard({
  selected,
  onClick,
  children,
  className = '',
  ...rest
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'>) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      className={`pk-option ${className}`}
      data-selected={selected}
      aria-pressed={selected}
      onClick={onClick}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </motion.button>
  )
}

export function Chip({
  children,
  tone = 'default',
  className = '',
}: {
  children: ReactNode
  tone?: 'default' | 'gold' | 'good' | 'ok' | 'watch' | 'risk'
  className?: string
}) {
  const colour =
    tone === 'gold'
      ? 'var(--pk-gold)'
      : tone === 'good'
        ? 'var(--pk-mint)'
        : tone === 'ok'
          ? 'var(--pk-sky)'
          : tone === 'watch'
            ? 'var(--pk-amber)'
            : tone === 'risk'
              ? 'var(--pk-rose)'
              : undefined
  return (
    <span
      className={`pk-chip ${className}`}
      style={
        colour
          ? {
              color: colour,
              borderColor: `color-mix(in srgb, ${colour} 40%, transparent)`,
              background: `color-mix(in srgb, ${colour} 12%, transparent)`,
            }
          : undefined
      }
    >
      {children}
    </span>
  )
}

export function IconBadge({ name, tone = 'gold', size = 42 }: { name: IconName; tone?: string; size?: number }) {
  const colour = `var(--pk-${tone})`
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-2xl"
      style={{
        width: size,
        height: size,
        color: colour,
        background: `color-mix(in srgb, ${colour} 13%, transparent)`,
        border: `1px solid color-mix(in srgb, ${colour} 26%, transparent)`,
      }}
    >
      <Icon name={name} size={Math.round(size * 0.48)} />
    </span>
  )
}

/* ── Numbers ──────────────────────────────────────────────────────────── */

/** Counts to `value` whenever it changes — used for every headline figure. */
export function AnimatedNumber({
  value,
  format = (n: number) => Math.round(n).toLocaleString('en-GB'),
  className = '',
}: {
  value: number
  format?: (n: number) => string
  className?: string
}) {
  const mv = useMotionValue(value)
  const spring = useSpring(mv, { stiffness: 90, damping: 20, mass: 0.6 })
  const text = useTransform(spring, (n) => format(n))
  const [display, setDisplay] = useState(() => format(value))

  useEffect(() => {
    mv.set(value)
  }, [value, mv])
  useEffect(() => text.on('change', setDisplay), [text])

  return (
    <span className={`pk-num ${className}`}>
      {display}
    </span>
  )
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: string
}) {
  return (
    <div className="pk-card p-4 sm:p-5">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.13em]" style={{ color: 'var(--pk-muted)' }}>
        {label}
      </p>
      <p
        className="pk-num mt-2 text-[26px] sm:text-[30px]"
        style={tone ? { color: `var(--pk-${tone})` } : undefined}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-1 text-[13px] leading-snug" style={{ color: 'var(--pk-text-2)' }}>
          {sub}
        </p>
      ) : null}
    </div>
  )
}

/* ── Disclosure ───────────────────────────────────────────────────────── */

export function Expandable({
  title,
  subtitle,
  icon,
  children,
  defaultOpen = false,
  meta,
}: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: IconName
  children: ReactNode
  defaultOpen?: boolean
  meta?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="pk-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-4 text-left sm:p-5"
      >
        {icon ? <IconBadge name={icon} /> : null}
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold tracking-[-0.01em]">{title}</span>
          {subtitle ? (
            <span className="mt-0.5 block text-[13.5px]" style={{ color: 'var(--pk-muted)' }}>
              {subtitle}
            </span>
          ) : null}
        </span>
        {meta}
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.25 }} style={{ color: 'var(--pk-muted)' }}>
          <Icon name="plus" size={18} />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{ overflow: 'hidden' }}
      >
        <div className="px-4 pb-5 sm:px-5">{children}</div>
      </motion.div>
    </div>
  )
}

export function Callout({
  icon = 'info',
  tone = 'gold',
  title,
  children,
}: {
  icon?: IconName
  tone?: string
  title?: ReactNode
  children: ReactNode
}) {
  const colour = `var(--pk-${tone})`
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: `color-mix(in srgb, ${colour} 28%, transparent)`,
        background: `color-mix(in srgb, ${colour} 8%, transparent)`,
      }}
    >
      <div className="flex gap-3">
        <span style={{ color: colour }} className="mt-0.5 shrink-0">
          <Icon name={icon} size={18} />
        </span>
        <div className="min-w-0 text-[14px] leading-relaxed" style={{ color: 'var(--pk-text-2)' }}>
          {title ? (
            <p className="mb-1 font-semibold" style={{ color: 'var(--pk-text)' }}>
              {title}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  )
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-[19px] sm:text-[22px]">{children}</h2>
      {hint ? (
        <span className="text-[12.5px]" style={{ color: 'var(--pk-muted)' }}>
          {hint}
        </span>
      ) : null}
    </div>
  )
}
