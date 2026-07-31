/* Domain types for the Elite Wealth Guide.
   Kept free of React so the scoring engine can be unit-tested in isolation. */

export type CareerStageId =
  | 'starting'
  | 'building'
  | 'peak'
  | 'preparing'
  | 'retired'
  | 'established'

export type PriorityId =
  | 'freedom'
  | 'protect'
  | 'grow'
  | 'family'
  | 'retirement'
  | 'property'
  | 'business'
  | 'passive'
  | 'tax'
  | 'legacy'
  | 'philanthropy'

export type ConcernId =
  | 'running-out'
  | 'bad-investments'
  | 'tax'
  | 'volatility'
  | 'injury'
  | 'lifestyle'
  | 'family'
  | 'advisers'
  | 'inflation'
  | 'retirement'

export type RiskProfileId = 'conservative' | 'balanced' | 'growth' | 'adventurous'

export type ScenarioId =
  | 'career-ends'
  | 'income-halved'
  | 'injury'
  | 'downturn'
  | 'property'
  | 'business'
  | 'children'
  | 'early-retirement'
  | 'relocate'

export type Discipline =
  | 'football'
  | 'rugby'
  | 'tennis'
  | 'golf'
  | 'motorsport'
  | 'boxing'
  | 'cricket'
  | 'athletics'
  | 'acting'
  | 'music'
  | 'tv'
  | 'creator'
  | 'other'

export interface Lifestyle {
  /** Gross annual income from all sources, GBP. */
  annualIncome: number
  /** Total monthly outgoings, GBP. */
  monthlySpend: number
  /** Liquid savings + invested assets (excl. pension), GBP. */
  investableAssets: number
  /** Pension / retirement savings, GBP. */
  pensionPot: number
  /** Gross value of property owned, GBP. */
  propertyValue: number
  /** Mortgages and other debt, GBP. */
  debt: number
  /** People financially dependent on the user. */
  dependants: number
  /** 0–3: how much of the spend is discretionary luxury. */
  luxuryIndex: number
  /** Owns or invests in operating businesses. */
  hasBusiness: boolean
  /** Income streams beyond the primary contract (0–5). */
  incomeStreams: number
  /** Has income protection / critical illness / life cover. */
  hasProtection: boolean
  /** Months of spending held in accessible cash. */
  emergencyMonths: number
  age: number
  /** Years the user expects to keep earning at this level. */
  yearsOfEarning: number
  discipline: Discipline
}

export interface PersonalityAnswer {
  questionId: string
  optionIndex: number
  /** −2 … +2 contribution to the risk score. */
  weight: number
}

export interface GuideState {
  step: number
  visited: number[]
  careerStage: CareerStageId | null
  priorities: PriorityId[]
  concerns: ConcernId[]
  lifestyle: Lifestyle
  personality: PersonalityAnswer[]
  riskOverride: RiskProfileId | null
  activeScenarios: ScenarioId[]
  name: string
  savedAt: string | null
}

export interface ScoreSet {
  retirementReadiness: number
  investmentReadiness: number
  diversification: number
  resilience: number
  wealthProtection: number
  longTermPlanning: number
  /** Weighted headline score. */
  peakScore: number
}

export interface ProjectionPoint {
  age: number
  year: number
  /** Total wealth in today's money, GBP. */
  wealth: number
  /** Wealth under the baseline (no scenarios) — used for comparison. */
  baseline?: number
  phase: 'earning' | 'after'
}

export interface Projection {
  points: ProjectionPoint[]
  /** Age at which wealth is exhausted, or null if it never is. */
  depletionAge: number | null
  /** Years of funded lifestyle after earnings stop. */
  fundedYears: number
  peakWealth: number
  /** Net annual surplus during the earning phase, today's money. */
  annualSurplus: number
  sustainableSpend: number
}

export interface RoadmapAction {
  id: string
  title: string
  detail: string
  /** Why this landed in the plan — always traceable to an input. */
  because: string
  weight: number
  tag: 'pension' | 'invest' | 'protect' | 'tax' | 'cash' | 'plan' | 'legacy' | 'business'
}

export interface Roadmap {
  sixMonths: RoadmapAction[]
  threeYears: RoadmapAction[]
  tenYears: RoadmapAction[]
  retirement: RoadmapAction[]
}
