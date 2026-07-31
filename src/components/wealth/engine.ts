/* Pure scoring / projection engine. No React, no side effects — every export
   is a deterministic function of the guide state so it can be unit-tested and,
   later, moved server-side behind an API without changing a component. */

import { RISK_PROFILES, SCENARIOS } from './content'
import type {
  ConcernId,
  GuideState,
  Lifestyle,
  PriorityId,
  Projection,
  ProjectionPoint,
  RiskProfileId,
  Roadmap,
  RoadmapAction,
  ScenarioId,
  ScoreSet,
} from './types'

export const INFLATION = 0.03
/** Age we model wealth having to last until. */
export const LIFE_EXPECTANCY = 90
/** UK pension access age from 2028. */
export const PENSION_ACCESS_AGE = 57

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n))

/* ── Tax ───────────────────────────────────────────────────────────────────
   Deliberately simplified England & Wales income tax + NI for illustration.
   Enough to make the projections honest; explicitly not advice. */

export function netAnnualIncome(gross: number): number {
  if (gross <= 0) return 0
  // Personal allowance tapers away entirely above £125,140.
  const pa = gross > 125140 ? 0 : Math.max(0, 12570 - Math.max(0, (gross - 100000) / 2))
  let tax = 0
  const bandBasic = Math.max(0, Math.min(gross, 50270) - pa)
  const bandHigher = Math.max(0, Math.min(gross, 125140) - Math.max(pa, 50270))
  const bandAdditional = Math.max(0, gross - 125140)
  tax += bandBasic * 0.2 + bandHigher * 0.4 + bandAdditional * 0.45
  // National insurance: 8% to the upper earnings limit, 2% above.
  const ni = Math.min(gross, 50270) > 12570 ? (Math.min(gross, 50270) - 12570) * 0.08 : 0
  const niUpper = Math.max(0, gross - 50270) * 0.02
  return Math.max(0, gross - tax - ni - niUpper)
}

export function effectiveTaxRate(gross: number): number {
  if (gross <= 0) return 0
  return 1 - netAnnualIncome(gross) / gross
}

/* ── Risk profile ──────────────────────────────────────────────────────── */

export function riskProfileFrom(state: GuideState): RiskProfileId {
  if (state.riskOverride) return state.riskOverride
  const answered = state.personality.length
  if (!answered) return 'balanced'
  const raw = state.personality.reduce((sum, a) => sum + a.weight, 0)
  // Normalise to −1…1 regardless of how many questions were answered.
  const normalised = raw / (answered * 2)
  // Nudge younger, longer-horizon users up a touch; near-retirees down.
  const horizonAdj =
    state.lifestyle.age < 28 ? 0.08 : state.lifestyle.age > 45 ? -0.08 : 0
  const score = normalised + horizonAdj
  if (score < -0.45) return 'conservative'
  if (score < 0.1) return 'balanced'
  if (score < 0.55) return 'growth'
  return 'adventurous'
}

/* ── Scenario application ──────────────────────────────────────────────── */

export interface ScenarioEffects {
  incomeMultiplier: number
  yearsOfEarningDelta: number
  spendMultiplier: number
  /** One-off hit to liquid assets, GBP. */
  capitalShock: number
  /** Multiplier applied to investable assets (market falls). */
  assetMultiplier: number
  returnDelta: number
  extraAnnualCost: number
}

export function scenarioEffects(ids: ScenarioId[], lifestyle: Lifestyle): ScenarioEffects {
  const fx: ScenarioEffects = {
    incomeMultiplier: 1,
    yearsOfEarningDelta: 0,
    spendMultiplier: 1,
    capitalShock: 0,
    assetMultiplier: 1,
    returnDelta: 0,
    extraAnnualCost: 0,
  }
  for (const id of ids) {
    switch (id) {
      case 'career-ends':
        fx.incomeMultiplier = 0
        fx.yearsOfEarningDelta = -lifestyle.yearsOfEarning
        break
      case 'income-halved':
        fx.incomeMultiplier *= 0.5
        break
      case 'injury':
        fx.incomeMultiplier *= 0.15
        fx.yearsOfEarningDelta -= Math.max(0, lifestyle.yearsOfEarning - 1)
        fx.extraAnnualCost += lifestyle.hasProtection ? 15000 : 45000
        break
      case 'downturn':
        fx.assetMultiplier *= 0.7
        fx.returnDelta -= 0.005
        break
      case 'property':
        fx.capitalShock += 700000 // deposit + costs on a ~£2m purchase
        fx.extraAnnualCost += 90000 // mortgage, upkeep, tax
        break
      case 'business':
        fx.capitalShock += 500000
        fx.extraAnnualCost += 20000
        break
      case 'children':
        fx.extraAnnualCost += 60000
        fx.spendMultiplier *= 1.08
        break
      case 'early-retirement':
        fx.yearsOfEarningDelta -= Math.min(5, lifestyle.yearsOfEarning)
        break
      case 'relocate':
        fx.incomeMultiplier *= 1.1 // lower effective tax in many destinations
        fx.spendMultiplier *= 1.12 // relocation and dual-country costs
        break
    }
  }
  // Income protection replaces part of lost earnings after an injury.
  if (ids.includes('injury') && lifestyle.hasProtection) {
    fx.incomeMultiplier = Math.max(fx.incomeMultiplier, 0.5)
  }
  return fx
}

/* ── Projection ────────────────────────────────────────────────────────── */

interface ProjectionOptions {
  scenarios?: ScenarioId[]
  /** Baseline series to overlay for comparison. */
  baseline?: ProjectionPoint[]
}

export function project(state: GuideState, opts: ProjectionOptions = {}): Projection {
  const l = state.lifestyle
  const profile = RISK_PROFILES[riskProfileFrom(state)]
  const fx = scenarioEffects(opts.scenarios ?? [], l)

  // Real (after-inflation) return, so every figure below is in today's money.
  const realReturn = Math.max(
    -0.02,
    profile.expectedReturn / 100 + fx.returnDelta - INFLATION,
  )

  const grossIncome = l.annualIncome * fx.incomeMultiplier
  const annualSpend = l.monthlySpend * 12 * fx.spendMultiplier + fx.extraAnnualCost
  const earningYears = Math.max(0, l.yearsOfEarning + fx.yearsOfEarningDelta)

  let wealth = Math.max(
    0,
    (l.investableAssets + l.pensionPot) * fx.assetMultiplier - fx.capitalShock,
  )
  const netIncome = netAnnualIncome(grossIncome)
  const annualSurplus = netIncome - annualSpend

  const points: ProjectionPoint[] = []
  const startYear = new Date().getFullYear()
  let depletionAge: number | null = null
  let peakWealth = wealth

  for (let i = 0; i <= LIFE_EXPECTANCY - l.age; i++) {
    const age = l.age + i
    const earning = i < earningYears
    points.push({
      age,
      year: startYear + i,
      wealth: Math.round(wealth),
      phase: earning ? 'earning' : 'after',
      baseline: opts.baseline?.[i]?.wealth,
    })
    if (wealth > peakWealth) peakWealth = wealth
    if (wealth <= 0 && depletionAge === null && i > 0) depletionAge = age

    const flow = earning ? annualSurplus : -annualSpend
    wealth = Math.max(0, wealth * (1 + realReturn) + flow)
  }

  const fundedYears =
    depletionAge === null ? LIFE_EXPECTANCY - l.age : depletionAge - l.age
  // Perpetual sustainable draw, discounted for a long horizon.
  const sustainableSpend =
    (l.investableAssets + l.pensionPot) * Math.max(0.02, Math.min(0.045, realReturn))

  return {
    points,
    depletionAge,
    fundedYears,
    peakWealth: Math.round(peakWealth),
    annualSurplus: Math.round(annualSurplus),
    sustainableSpend: Math.round(sustainableSpend),
  }
}

/* ── Scores ────────────────────────────────────────────────────────────── */

export function scores(state: GuideState): ScoreSet {
  const l = state.lifestyle
  const baseline = project(state)
  const annualSpend = Math.max(1, l.monthlySpend * 12)
  const totalAssets = l.investableAssets + l.pensionPot + Math.max(0, l.propertyValue - l.debt)

  /* Retirement readiness — does the money last to 90? */
  const yearsNeeded = LIFE_EXPECTANCY - l.age
  const retirementReadiness = clamp(
    (baseline.depletionAge === null ? 1 : baseline.fundedYears / yearsNeeded) * 88 +
      (l.pensionPot > 0 ? 12 : 0),
  )

  /* Investment readiness — is capital actually working? */
  const investedRatio = totalAssets > 0 ? (l.investableAssets + l.pensionPot) / totalAssets : 0
  const investmentReadiness = clamp(
    investedRatio * 55 +
      (l.pensionPot > 0 ? 15 : 0) +
      (state.personality.length ? 15 : 0) +
      (l.investableAssets > annualSpend ? 15 : 0),
  )

  /* Diversification — asset classes, income streams, and career concentration. */
  const classes = [
    l.investableAssets > 0,
    l.pensionPot > 0,
    l.propertyValue > 0,
    l.hasBusiness,
    l.emergencyMonths > 0,
  ].filter(Boolean).length
  const propertyHeavy =
    totalAssets > 0 && Math.max(0, l.propertyValue - l.debt) / totalAssets > 0.6
  const diversification = clamp(
    classes * 15 + Math.min(l.incomeStreams, 4) * 7 - (propertyHeavy ? 22 : 0) + 5,
  )

  /* Resilience — could you absorb a shock without selling anything? */
  const resilience = clamp(
    Math.min(l.emergencyMonths, 12) * 5 +
      (l.hasProtection ? 25 : 0) +
      (l.debt < totalAssets * 0.35 ? 12 : 0) +
      (baseline.annualSurplus > 0 ? 13 : 0),
  )

  /* Wealth protection — insurance, debt, structure, dependants covered. */
  const wealthProtection = clamp(
    (l.hasProtection ? 40 : 0) +
      (l.dependants === 0 || l.hasProtection ? 15 : 0) +
      (l.debt === 0 ? 15 : l.debt < totalAssets * 0.4 ? 8 : 0) +
      Math.min(l.emergencyMonths, 6) * 3 +
      (state.concerns.includes('advisers') ? 0 : 12),
  )

  /* Long-term planning — has the user actually made decisions? */
  const longTermPlanning = clamp(
    (state.careerStage ? 12 : 0) +
      (state.priorities.length >= 3 ? 18 : state.priorities.length * 5) +
      (l.pensionPot > 0 ? 22 : 0) +
      (l.yearsOfEarning > 0 && baseline.annualSurplus > 0 ? 20 : 0) +
      (state.personality.length >= 4 ? 16 : 0) +
      (l.hasProtection ? 12 : 0),
  )

  const peakScore = Math.round(
    retirementReadiness * 0.28 +
      investmentReadiness * 0.16 +
      diversification * 0.14 +
      resilience * 0.16 +
      wealthProtection * 0.14 +
      longTermPlanning * 0.12,
  )

  return {
    retirementReadiness: Math.round(retirementReadiness),
    investmentReadiness: Math.round(investmentReadiness),
    diversification: Math.round(diversification),
    resilience: Math.round(resilience),
    wealthProtection: Math.round(wealthProtection),
    longTermPlanning: Math.round(longTermPlanning),
    peakScore,
  }
}

export function scoreBand(n: number): { label: string; tone: 'good' | 'ok' | 'watch' | 'risk' } {
  if (n >= 78) return { label: 'Strong', tone: 'good' }
  if (n >= 58) return { label: 'Solid', tone: 'ok' }
  if (n >= 38) return { label: 'Needs attention', tone: 'watch' }
  return { label: 'Priority', tone: 'risk' }
}

/* ── Roadmap generation ───────────────────────────────────────────────── */

export function buildRoadmap(state: GuideState): Roadmap {
  const l = state.lifestyle
  const s = scores(state)
  const p = project(state)
  const profile = RISK_PROFILES[riskProfileFrom(state)]
  const has = (id: ConcernId) => state.concerns.includes(id)
  const wants = (id: PriorityId) => state.priorities.includes(id)
  const topPriority = state.priorities[0]

  const six: RoadmapAction[] = []
  const three: RoadmapAction[] = []
  const ten: RoadmapAction[] = []
  const ret: RoadmapAction[] = []

  /* — Next 6 months — */
  if (l.emergencyMonths < 6) {
    six.push({
      id: 'cash-buffer',
      title: `Build a cash buffer to ${l.dependants > 0 ? 12 : 9} months of spending`,
      detail: `You hold about ${l.emergencyMonths} months. Target roughly ${gbp(
        l.monthlySpend * (l.dependants > 0 ? 12 : 9),
      )} in instant-access accounts, spread across banks so every pound stays inside FSCS protection.`,
      because: `Your reserve currently covers ${l.emergencyMonths} months of outgoings.`,
      weight: 95,
      tag: 'cash',
    })
  }
  if (!l.hasProtection) {
    six.push({
      id: 'protection',
      title: 'Put income protection and life cover in place',
      detail:
        'Income protection, critical illness and — if you compete — career-ending injury cover. Check the definitions carefully: "own occupation" is what matters when your occupation is specialist.',
      because: l.dependants > 0
        ? `You have ${l.dependants} ${l.dependants === 1 ? 'dependant' : 'dependants'} and no protection recorded.`
        : 'No protection is currently in place.',
      weight: 99,
      tag: 'protect',
    })
  }
  if (l.pensionPot === 0 && l.annualIncome > 0) {
    six.push({
      id: 'open-pension',
      title: 'Open a pension and make a first contribution',
      detail: `At your income, tax relief is worth roughly ${Math.round(
        effectiveTaxRate(l.annualIncome) * 100,
      )}p in every pound contributed. Even in a year when cash is tight, starting the wrapper starts the clock on carry-forward.`,
      because: 'No pension savings are recorded against your name.',
      weight: 92,
      tag: 'pension',
    })
  }
  if (l.annualIncome > 100000 && l.pensionPot > 0) {
    six.push({
      id: 'carry-forward',
      title: 'Review pension carry-forward before 5 April',
      detail:
        'Unused annual allowance from the three previous tax years can often be swept up in one contribution. In a peak-earning year this is usually the single highest-value action available to you.',
      because: `Your income of ${gbp(l.annualIncome)} sits in the highest tax bands.`,
      weight: 88,
      tag: 'tax',
    })
  }
  if (has('advisers')) {
    six.push({
      id: 'adviser-check',
      title: 'Verify every adviser on the FCA register',
      detail:
        'Confirm authorisation, ask in writing exactly how each party is paid, and insist that assets are held in your own name with a mainstream custodian. Add dual authorisation to any transfer above a threshold you set.',
      because: 'You told us trusting advisers is one of your concerns.',
      weight: 90,
      tag: 'protect',
    })
  }
  six.push({
    id: 'single-view',
    title: 'Build one view of everything you own',
    detail:
      'Accounts, old club and workplace pensions, investments, property, businesses, policies and debts on a single page. Nothing else on this roadmap can be sized properly until this exists.',
    because: 'Every plan starts from a complete picture.',
    weight: 70,
    tag: 'plan',
  })
  if (l.dependants > 0 || l.propertyValue > 0) {
    six.push({
      id: 'will',
      title: 'Write or refresh your will and power of attorney',
      detail:
        'Without a will the intestacy rules decide, and unmarried partners typically receive nothing. Add a lasting power of attorney at the same time — it costs little and matters enormously after an accident.',
      because: l.dependants > 0
        ? 'You have people who depend on you financially.'
        : 'You own property that needs to pass the way you intend.',
      weight: 84,
      tag: 'legacy',
    })
  }

  /* — Next 3 years — */
  three.push({
    id: 'two-pots',
    title: 'Split your wealth into a bridge pot and a long pot',
    detail: `The bridge funds the years between your last contract and pension access at ${PENSION_ACCESS_AGE}. It stays liquid and defensive. The long pot can carry full ${profile.label.toLowerCase()} risk because you will not touch it for over a decade.`,
    because: `You expect around ${l.yearsOfEarning} more earning ${
      l.yearsOfEarning === 1 ? 'year' : 'years'
    }, ${Math.max(0, PENSION_ACCESS_AGE - (l.age + l.yearsOfEarning))} years before pension access.`,
    weight: 93,
    tag: 'plan',
  })
  if (s.diversification < 60) {
    three.push({
      id: 'diversify',
      title: 'Reduce concentration across assets and income',
      detail:
        'Spread across asset classes, geographies and currencies — and treat your own name as a holding. If several income lines depend on you personally, they are one asset, not three.',
      because: `Your diversification score is ${s.diversification}.`,
      weight: 86,
      tag: 'invest',
    })
  }
  if (wants('property') || l.propertyValue === 0) {
    three.push({
      id: 'property-plan',
      title: 'Plan property purchases around liquidity, not deposits',
      detail:
        'Model the running cost, not just the price: mortgage, maintenance, tax and the working capital the purchase removes from your portfolio. Buy the home you want at the point it no longer changes the plan.',
      because: wants('property')
        ? 'Buying property is one of your stated priorities.'
        : 'You do not currently own property.',
      weight: 72,
      tag: 'plan',
    })
  }
  if (wants('business') || l.hasBusiness) {
    three.push({
      id: 'business-ringfence',
      title: 'Ring-fence business capital from core wealth',
      detail:
        'Set a hard ceiling — commonly 10–15% of net worth — on capital committed to private ventures, and hold it in separate structures. Founders who keep the two apart survive a failed venture with the plan intact.',
      because: l.hasBusiness
        ? 'You already hold business interests.'
        : 'Business investment is one of your priorities.',
      weight: 78,
      tag: 'business',
    })
  }
  if (has('tax') || l.annualIncome > 150000) {
    three.push({
      id: 'tax-structure',
      title: 'Review structure: image rights, overseas income, residence',
      detail:
        'Where income arises, which entity receives it and which tax year it lands in can be worth six figures across a career. Use allowances and wrappers first; only consider structure where the commercial substance genuinely supports it.',
      because: has('tax')
        ? 'Paying unnecessary tax is one of your concerns.'
        : `Your income of ${gbp(l.annualIncome)} makes structure worth reviewing.`,
      weight: 80,
      tag: 'tax',
    })
  }
  three.push({
    id: 'second-act',
    title: 'Start building the second act while you are still earning',
    detail:
      'Coaching badges, media training, a qualification, a stake in a business you understand. Income after the career reduces the pot you need faster than any investment return can.',
    because: `You are in the "${state.careerStage ?? 'building'}" stage of your career.`,
    weight: 74,
    tag: 'plan',
  })

  /* — Next 10 years — */
  ten.push({
    id: 'compound',
    title: 'Let the long pot compound untouched',
    detail: `At a ${profile.expectedReturn}% expected return, money left alone for a decade roughly ${
      profile.expectedReturn >= 6 ? 'doubles' : 'grows by half again'
    } before inflation. The discipline is not selecting investments — it is not interrupting them.`,
    because: `Your ${profile.label.toLowerCase()} profile targets ${profile.expectedReturn}% a year.`,
    weight: 82,
    tag: 'invest',
  })
  ten.push({
    id: 'rebalance',
    title: 'Rebalance annually and de-risk the bridge as it shortens',
    detail:
      'Once a year, sell what has run and top up what has lagged. As the bridge pot approaches the years you will spend it, move it steadily towards cash and short bonds.',
    because: 'Rebalancing enforces selling high and buying low without judgement calls.',
    weight: 68,
    tag: 'invest',
  })
  if (wants('legacy') || wants('philanthropy') || l.dependants > 0) {
    ten.push({
      id: 'estate',
      title: 'Begin estate planning while the seven-year clock is cheap',
      detail:
        'Gifts, trusts for children, and life cover written in trust. Starting in your thirties removes almost all the timing risk that makes estate planning expensive later.',
      because: wants('legacy')
        ? 'Leaving a legacy is one of your priorities.'
        : 'You have dependants to provide for.',
      weight: 70,
      tag: 'legacy',
    })
  }
  if (wants('passive') || wants('freedom')) {
    ten.push({
      id: 'income-engine',
      title: 'Convert capital into an income engine',
      detail:
        'Dividend-paying equities, index-linked bonds, commercial property and royalties, arranged so that a predictable payment lands whether or not you work that year.',
      because: wants('passive')
        ? 'Passive income is one of your priorities.'
        : 'Financial freedom is your priority — that means income, not just capital.',
      weight: 76,
      tag: 'invest',
    })
  }

  /* — Retirement — */
  ret.push({
    id: 'withdrawal',
    title: 'Set a sustainable withdrawal rate for a long retirement',
    detail: `On today's figures your wealth supports roughly ${gbp(
      p.sustainableSpend,
    )} a year indefinitely, against current spending of ${gbp(l.monthlySpend * 12)}. Over a ${
      LIFE_EXPECTANCY - l.age
    }-year horizon, plan closer to 3% than the usual 4%.`,
    because: `You are ${l.age} and may need income for ${LIFE_EXPECTANCY - l.age} years.`,
    weight: 90,
    tag: 'plan',
  })
  ret.push({
    id: 'draw-order',
    title: 'Fix the order you draw from each pot',
    detail:
      'Typically: cash first, then taxable general accounts, then ISAs, with pensions last so they keep growing outside your estate. The order is worth a meaningful share of your lifetime tax bill.',
    because: 'Withdrawal sequencing changes both tax paid and how long the money lasts.',
    weight: 84,
    tag: 'tax',
  })
  ret.push({
    id: 'inflation-hedge',
    title: 'Protect purchasing power for the whole horizon',
    detail: `At 3% inflation, ${gbp(l.monthlySpend * 12)} of spending today costs ${gbp(
      l.monthlySpend * 12 * Math.pow(1 + INFLATION, 25),
    )} in twenty-five years. Real assets have to remain a majority of the portfolio well into retirement.`,
    because: 'Long retirements are inflation problems before they are market problems.',
    weight: 78,
    tag: 'invest',
  })
  if (has('running-out') || s.retirementReadiness < 60) {
    ret.push({
      id: 'guaranteed-floor',
      title: 'Secure a guaranteed income floor',
      detail:
        'Cover your non-negotiable costs — home, food, school fees, insurance — with income that arrives regardless of markets: annuity, index-linked bonds or secured rental income. Everything above the floor can then take real risk.',
      because: has('running-out')
        ? 'Running out of money is one of your concerns.'
        : `Your retirement readiness score is ${s.retirementReadiness}.`,
      weight: 92,
      tag: 'protect',
    })
  }
  if (topPriority === 'philanthropy' || wants('philanthropy')) {
    ret.push({
      id: 'giving',
      title: 'Structure your giving',
      detail:
        'A donor-advised fund or charitable foundation makes giving deliberate, tax-efficient and durable — and gives the family something to run together long after your career.',
      because: 'Philanthropy is one of your stated priorities.',
      weight: 60,
      tag: 'legacy',
    })
  }

  const sortDesc = (a: RoadmapAction, b: RoadmapAction) => b.weight - a.weight
  return {
    sixMonths: six.sort(sortDesc),
    threeYears: three.sort(sortDesc),
    tenYears: ten.sort(sortDesc),
    retirement: ret.sort(sortDesc),
  }
}

/* ── Formatting helpers ───────────────────────────────────────────────── */

export function gbp(n: number, opts: { compact?: boolean } = {}): string {
  const abs = Math.abs(n)
  if (opts.compact !== false && abs >= 1_000_000) return `£${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}m`
  if (opts.compact !== false && abs >= 10_000) return `£${Math.round(n / 1000)}k`
  return `£${Math.round(n).toLocaleString('en-GB')}`
}

export function gbpExact(n: number): string {
  return `£${Math.round(n).toLocaleString('en-GB')}`
}

export function scenarioLabel(id: ScenarioId): string {
  return SCENARIOS.find((s) => s.id === id)?.label ?? id
}
