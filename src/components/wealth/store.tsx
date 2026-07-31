'use client'

/* Single source of truth for the guide. A reducer plus a context, persisted to
   localStorage so a session survives a refresh. When a real backend arrives,
   `persist` is the only function that needs to change. */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react'
import { CAREER_STAGES } from './content'
import { buildRoadmap, project, riskProfileFrom, scores } from './engine'
import type {
  CareerStageId,
  ConcernId,
  GuideState,
  Lifestyle,
  PriorityId,
  RiskProfileId,
  ScenarioId,
} from './types'

const STORAGE_KEY = 'peak.elite-guide.v1'

export const STEPS = [
  { id: 'welcome', label: 'Start', short: 'Start' },
  { id: 'career', label: 'Career stage', short: 'Career' },
  { id: 'priorities', label: 'Priorities', short: 'Priorities' },
  { id: 'concerns', label: 'Concerns', short: 'Concerns' },
  { id: 'lifestyle', label: 'Lifestyle', short: 'Lifestyle' },
  { id: 'personality', label: 'Investor profile', short: 'Profile' },
  { id: 'dashboard', label: 'Financial health', short: 'Health' },
  { id: 'scenarios', label: 'What if?', short: 'What if' },
  { id: 'roadmap', label: 'Your roadmap', short: 'Roadmap' },
  { id: 'education', label: 'Learn', short: 'Learn' },
] as const

export type StepId = (typeof STEPS)[number]['id']

export const DEFAULT_LIFESTYLE: Lifestyle = {
  annualIncome: 1_200_000,
  monthlySpend: 18_000,
  investableAssets: 750_000,
  pensionPot: 180_000,
  propertyValue: 1_400_000,
  debt: 600_000,
  dependants: 0,
  luxuryIndex: 1,
  hasBusiness: false,
  incomeStreams: 2,
  hasProtection: false,
  emergencyMonths: 3,
  age: 27,
  yearsOfEarning: 8,
  discipline: 'football',
}

export const initialState: GuideState = {
  step: 0,
  visited: [0],
  careerStage: null,
  priorities: [],
  concerns: [],
  lifestyle: DEFAULT_LIFESTYLE,
  personality: [],
  riskOverride: null,
  activeScenarios: [],
  name: '',
  savedAt: null,
}

export type Action =
  | { type: 'goto'; step: number }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'career'; value: CareerStageId }
  | { type: 'priorities'; value: PriorityId[] }
  | { type: 'toggleConcern'; value: ConcernId }
  | { type: 'lifestyle'; value: Partial<Lifestyle> }
  | { type: 'answer'; questionId: string; optionIndex: number; weight: number }
  | { type: 'riskOverride'; value: RiskProfileId | null }
  | { type: 'toggleScenario'; value: ScenarioId }
  | { type: 'clearScenarios' }
  | { type: 'name'; value: string }
  | { type: 'hydrate'; value: GuideState }
  | { type: 'reset' }

function reducer(state: GuideState, action: Action): GuideState {
  switch (action.type) {
    case 'goto': {
      const step = Math.max(0, Math.min(STEPS.length - 1, action.step))
      return { ...state, step, visited: [...new Set([...state.visited, step])] }
    }
    case 'next':
      return reducer(state, { type: 'goto', step: state.step + 1 })
    case 'back':
      return reducer(state, { type: 'goto', step: state.step - 1 })
    case 'career': {
      const stage = CAREER_STAGES.find((s) => s.id === action.value)
      // Seed plausible defaults from the stage so the sliders start somewhere
      // sensible — but never overwrite figures the user has already moved.
      const touched = state.visited.includes(4)
      return {
        ...state,
        careerStage: action.value,
        lifestyle:
          stage && !touched
            ? {
                ...state.lifestyle,
                age: stage.typicalAge,
                yearsOfEarning: stage.typicalYearsOfEarning,
              }
            : state.lifestyle,
      }
    }
    case 'priorities':
      return { ...state, priorities: action.value }
    case 'toggleConcern':
      return {
        ...state,
        concerns: state.concerns.includes(action.value)
          ? state.concerns.filter((c) => c !== action.value)
          : [...state.concerns, action.value],
      }
    case 'lifestyle':
      return { ...state, lifestyle: { ...state.lifestyle, ...action.value } }
    case 'answer':
      return {
        ...state,
        riskOverride: null,
        personality: [
          ...state.personality.filter((a) => a.questionId !== action.questionId),
          { questionId: action.questionId, optionIndex: action.optionIndex, weight: action.weight },
        ],
      }
    case 'riskOverride':
      return { ...state, riskOverride: action.value }
    case 'toggleScenario':
      return {
        ...state,
        activeScenarios: state.activeScenarios.includes(action.value)
          ? state.activeScenarios.filter((s) => s !== action.value)
          : [...state.activeScenarios, action.value],
      }
    case 'clearScenarios':
      return { ...state, activeScenarios: [] }
    case 'name':
      return { ...state, name: action.value }
    case 'hydrate':
      return { ...action.value, savedAt: action.value.savedAt ?? null }
    case 'reset':
      return { ...initialState, savedAt: null }
    default:
      return state
  }
}

interface GuideContextValue {
  state: GuideState
  dispatch: Dispatch<Action>
  scores: ReturnType<typeof scores>
  projection: ReturnType<typeof project>
  scenarioProjection: ReturnType<typeof project>
  roadmap: ReturnType<typeof buildRoadmap>
  riskProfile: RiskProfileId
  completion: number
}

const GuideContext = createContext<GuideContextValue | null>(null)

export function GuideProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Restore any saved session once, on the client only.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as GuideState
      dispatch({
        type: 'hydrate',
        value: { ...initialState, ...parsed, lifestyle: { ...DEFAULT_LIFESTYLE, ...parsed.lifestyle } },
      })
    } catch {
      /* A corrupt or unreadable session should never block the guide. */
    }
  }, [])

  useEffect(() => {
    if (state === initialState) return
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...state, savedAt: new Date().toISOString() }),
      )
    } catch {
      /* Private browsing / quota — the guide still works in memory. */
    }
  }, [state])

  const value = useMemo<GuideContextValue>(() => {
    const projection = project(state)
    return {
      state,
      dispatch,
      scores: scores(state),
      projection,
      scenarioProjection: project(state, {
        scenarios: state.activeScenarios,
        baseline: projection.points,
      }),
      roadmap: buildRoadmap(state),
      riskProfile: riskProfileFrom(state),
      completion: Math.round((state.visited.length / STEPS.length) * 100),
    }
  }, [state])

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>
}

export function useGuide(): GuideContextValue {
  const ctx = useContext(GuideContext)
  if (!ctx) throw new Error('useGuide must be used inside <GuideProvider>')
  return ctx
}

export function clearSavedSession() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* nothing to clear */
  }
}
