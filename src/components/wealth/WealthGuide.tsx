'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { AuthProvider } from './auth/AuthGate'
import CareerStage from './steps/CareerStage'
import Concerns from './steps/Concerns'
import Dashboard from './steps/Dashboard'
import Education from './steps/Education'
import LifestyleStep from './steps/LifestyleStep'
import Personality from './steps/Personality'
import Priorities from './steps/Priorities'
import RoadmapStep from './steps/RoadmapStep'
import Scenarios from './steps/Scenarios'
import Welcome from './steps/Welcome'
import { GuideProvider, STEPS, useGuide } from './store'
import Icon from './ui/Icon'
import { Btn } from './ui/Primitives'
import { ThemeProvider, ThemeToggle, useTheme } from './ui/theme'

const SCREENS = [
  Welcome,
  CareerStage,
  Priorities,
  Concerns,
  LifestyleStep,
  Personality,
  Dashboard,
  Scenarios,
  RoadmapStep,
  Education,
]

export default function WealthGuide() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GuideProvider>
          <Frame />
        </GuideProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

function Frame() {
  const { theme } = useTheme()
  return (
    <div className="pk-root relative" data-theme={theme}>
      <div className="pk-aurora" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <TopBar />
        <main className="flex-1">
          <Screens />
        </main>
        <BottomBar />
      </div>
    </div>
  )
}

function TopBar() {
  const { state, dispatch, completion } = useGuide()

  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur-xl"
      style={{ borderColor: 'var(--pk-line)', background: 'color-mix(in srgb, var(--pk-bg) 78%, transparent)' }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3 sm:px-6">
        <button
          onClick={() => dispatch({ type: 'goto', step: 0 })}
          className="flex shrink-0 items-center gap-2.5"
          aria-label="Back to the start"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg, var(--pk-gold-soft), var(--pk-gold))', color: '#1a1206' }}
          >
            <Icon name="peak" size={17} strokeWidth={2} />
          </span>
          <span className="hidden text-[14.5px] font-semibold tracking-[-0.01em] sm:block">Peak Private</span>
        </button>

        {/* Step rail — scrollable on mobile, full on desktop */}
        <nav className="pk-scroll-x flex min-w-0 flex-1 items-center gap-1" aria-label="Guide steps">
          {STEPS.map((s, i) => {
            const active = state.step === i
            const seen = state.visited.includes(i)
            return (
              <button
                key={s.id}
                onClick={() => dispatch({ type: 'goto', step: i })}
                aria-current={active ? 'step' : undefined}
                className="shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
                style={{
                  color: active ? 'var(--pk-gold)' : seen ? 'var(--pk-text-2)' : 'var(--pk-muted)',
                  background: active ? 'color-mix(in srgb, var(--pk-gold) 13%, transparent)' : 'transparent',
                }}
              >
                <span className="xl:hidden">{s.short}</span>
                <span className="hidden xl:inline">{s.label}</span>
              </button>
            )
          })}
        </nav>

        <span className="hidden shrink-0 items-center gap-2 md:flex">
          <span className="text-[11.5px] font-semibold" style={{ color: 'var(--pk-muted)' }}>
            {completion}%
          </span>
          <span className="h-1.5 w-16 overflow-hidden rounded-full" style={{ background: 'var(--pk-surface-2)' }}>
            <motion.span
              className="block h-full rounded-full"
              style={{ background: 'var(--pk-gold)' }}
              animate={{ width: `${completion}%` }}
              transition={{ duration: 0.5 }}
            />
          </span>
        </span>

        <ThemeToggle />
      </div>

      {/* Thin progress line on mobile, where the percentage is hidden */}
      <motion.div
        className="h-0.5 sm:hidden"
        style={{ background: 'var(--pk-gold)', transformOrigin: 'left' }}
        animate={{ scaleX: completion / 100 }}
        transition={{ duration: 0.5 }}
      />
    </header>
  )
}

function Screens() {
  const { state } = useGuide()
  const Screen = SCREENS[state.step] ?? Welcome

  // Every step change starts at the top — otherwise a long step leaves the
  // next one scrolled halfway down.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [state.step])

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state.step}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <Screen />
      </motion.div>
    </AnimatePresence>
  )
}

/** Requirements to move on. Deliberately light — the guide should never feel
 *  like a form that refuses to let you through. */
function blocker(step: number, state: ReturnType<typeof useGuide>['state']): string | null {
  if (step === 1 && !state.careerStage) return 'Choose the stage that fits best'
  if (step === 2 && state.priorities.length === 0) return 'Pick at least one priority'
  return null
}

function BottomBar() {
  const { state, dispatch } = useGuide()
  const last = state.step === STEPS.length - 1
  const stop = blocker(state.step, state)

  if (state.step === 0) return null

  return (
    <div
      className="sticky bottom-0 z-30 border-t backdrop-blur-xl"
      style={{ borderColor: 'var(--pk-line)', background: 'color-mix(in srgb, var(--pk-bg) 82%, transparent)' }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3 sm:px-6">
        <Btn variant="ghost" icon="arrow-left" iconSide="left" onClick={() => dispatch({ type: 'back' })}>
          <span className="hidden sm:inline">Back</span>
        </Btn>

        <div className="min-w-0 flex-1 text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={stop ?? STEPS[state.step].label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="truncate text-[12.5px]"
              style={{ color: stop ? 'var(--pk-amber)' : 'var(--pk-muted)' }}
            >
              {stop ?? `Step ${state.step} of ${STEPS.length - 2} · ${STEPS[state.step].label}`}
            </motion.p>
          </AnimatePresence>
        </div>

        {last ? (
          <Btn variant="ghost" icon="peak" iconSide="left" onClick={() => dispatch({ type: 'goto', step: 8 })}>
            <span className="hidden sm:inline">Back to roadmap</span>
            <span className="sm:hidden">Roadmap</span>
          </Btn>
        ) : (
          <Btn icon="arrow" disabled={!!stop} onClick={() => dispatch({ type: 'next' })}>
            {state.step === 8 ? 'Learn more' : 'Continue'}
          </Btn>
        )}
      </div>
    </div>
  )
}
