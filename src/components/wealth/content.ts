/* All user-facing copy for the guide lives here so it can be reviewed,
   translated or swapped for a CMS without touching component code. */

import type {
  CareerStageId,
  ConcernId,
  Discipline,
  PriorityId,
  RiskProfileId,
  ScenarioId,
} from './types'

export interface CareerStage {
  id: CareerStageId
  label: string
  blurb: string
  why: string
  icon: string
  /** Typical age used to pre-fill the lifestyle step. */
  typicalAge: number
  typicalYearsOfEarning: number
}

export const CAREER_STAGES: CareerStage[] = [
  {
    id: 'starting',
    label: 'Just starting',
    blurb: 'First professional contract, first real money.',
    why: 'The habits you set in year one compound for forty. Money invested at 21 has to do far less work than money invested at 41 — and the tax reliefs you claim now are the cheapest returns you will ever get.',
    icon: 'sunrise',
    typicalAge: 20,
    typicalYearsOfEarning: 12,
  },
  {
    id: 'building',
    label: 'Building my career',
    blurb: 'Established, earning well, still climbing.',
    why: 'This is where lifestyle inflation quietly decides your outcome. Two people on identical contracts can retire thirty years apart purely on what they did with the surplus.',
    icon: 'trend',
    typicalAge: 25,
    typicalYearsOfEarning: 9,
  },
  {
    id: 'peak',
    label: 'Peak earning years',
    blurb: 'Top of the market — the years that fund everything after.',
    why: 'A short window carries a long life. Most of your lifetime wealth is decided in a handful of tax years, which is exactly when structure, tax efficiency and discipline are worth the most.',
    icon: 'peak',
    typicalAge: 29,
    typicalYearsOfEarning: 5,
  },
  {
    id: 'preparing',
    label: 'Preparing for retirement',
    blurb: 'The final contracts — planning what comes next.',
    why: 'The transition from earning to drawing is the single most dangerous moment in an elite career. Sequencing, income planning and a realistic spending number matter more than performance now.',
    icon: 'bridge',
    typicalAge: 33,
    typicalYearsOfEarning: 2,
  },
  {
    id: 'retired',
    label: 'Recently retired',
    blurb: 'Career complete. Now it has to last.',
    why: 'Your wealth has to cover a longer retirement than almost anyone else — potentially fifty years. Withdrawal strategy, inflation protection and second-act income now do the heavy lifting.',
    icon: 'sunset',
    typicalAge: 36,
    typicalYearsOfEarning: 0,
  },
  {
    id: 'established',
    label: 'Established name or entrepreneur',
    blurb: 'Brand, business and portfolio income.',
    why: 'Multiple entities, currencies and income streams create both opportunity and leakage. Consolidation, clean structure and a single view of everything are usually worth more than any one investment decision.',
    icon: 'crown',
    typicalAge: 40,
    typicalYearsOfEarning: 15,
  },
]

export interface Priority {
  id: PriorityId
  label: string
  hint: string
  icon: string
}

export const PRIORITIES: Priority[] = [
  { id: 'freedom', label: 'Financial freedom', hint: 'Never needing to work for money again', icon: 'wing' },
  { id: 'protect', label: 'Protecting my wealth', hint: 'Keeping what I have already earned', icon: 'shield' },
  { id: 'grow', label: 'Growing investments', hint: 'Making capital work harder', icon: 'chart' },
  { id: 'family', label: 'Supporting family', hint: 'Parents, partner, children', icon: 'people' },
  { id: 'retirement', label: 'Retirement income', hint: 'A salary that arrives without me', icon: 'clock' },
  { id: 'property', label: 'Buying property', hint: 'Homes and portfolio property', icon: 'home' },
  { id: 'business', label: 'Business investments', hint: 'Backing or building companies', icon: 'rocket' },
  { id: 'passive', label: 'Passive income', hint: 'Dividends, rent, royalties', icon: 'stream' },
  { id: 'tax', label: 'Tax efficiency', hint: 'Keeping more of every pound', icon: 'scales' },
  { id: 'legacy', label: 'Leaving a legacy', hint: 'Wealth that outlives me', icon: 'tree' },
  { id: 'philanthropy', label: 'Philanthropy', hint: 'Foundations and giving back', icon: 'heart' },
]

export interface Concern {
  id: ConcernId
  label: string
  /** Why this is common — shown the moment it is selected. */
  common: string
  /** What can actually be done about it. */
  managed: string
  stat?: string
}

export const CONCERNS: Concern[] = [
  {
    id: 'running-out',
    label: 'Running out of money',
    common:
      'A career that pays for eight years often has to fund sixty. Because the money arrives in a rush, the brain reads it as permanent income rather than a lump sum that must be spread across a lifetime.',
    managed:
      'Translate the pot into a sustainable annual number — the amount you can draw indefinitely — and manage the gap between that and your actual spending. That single figure turns an anxiety into an equation.',
    stat: 'Roughly 40% of Premier League players report serious financial difficulty within five years of retiring.',
  },
  {
    id: 'bad-investments',
    label: 'Poor investment decisions',
    common:
      'High earners with public profiles get shown deals nobody else sees: restaurants, crypto funds, property developments, a friend’s app. The pitch arrives with urgency and a familiar face attached.',
    managed:
      'Separate your core portfolio from your speculative capital. Core is boring, diversified and untouchable; speculative is a fixed percentage you could lose entirely without changing your life.',
  },
  {
    id: 'tax',
    label: 'Paying unnecessary tax',
    common:
      'Income spikes push you into the highest bands, image-rights and overseas earnings add complexity, and allowances that would have saved thousands quietly expire each April.',
    managed:
      'Use the wrappers first — pension contributions, ISAs, carry-forward of unused allowances — then structure. Legitimate planning is about sequencing and timing, not schemes.',
    stat: 'Unused pension carry-forward can allow contributions well beyond the annual allowance in a high-income year.',
  },
  {
    id: 'volatility',
    label: 'Market volatility',
    common:
      'Watching a portfolio fall 20% feels like losing a match you cannot replay. The instinct is to act, and acting at the bottom is what converts a paper fall into a permanent loss.',
    managed:
      'Match money to time. Cash for the next two years, balanced assets for the next decade, growth assets for money you will not touch for fifteen years. Volatility only matters if you are forced to sell.',
  },
  {
    id: 'injury',
    label: 'Career-ending injury',
    common:
      'One tackle, one crash, one scan. In a career already compressed into a decade, an injury does not delay income — it deletes the remainder of it.',
    managed:
      'Insurance that pays out on career-ending injury, income protection, and a financial plan built on the assumption that the career is shorter than you hope. Then every extra year is upside.',
  },
  {
    id: 'lifestyle',
    label: 'Maintaining my lifestyle',
    common:
      'Lifestyle rises with the biggest contract and rarely falls with the last one. Cars, homes, travel and the people around you all reset upwards, and fixed costs are the hardest thing to reverse.',
    managed:
      'Fix a percentage of income to lifestyle rather than a number, and cap the fixed costs — the ones that recur whether you play or not. Discretionary spend can flex; a second mortgage cannot.',
  },
  {
    id: 'family',
    label: 'Supporting family',
    common:
      'Success is rarely solitary. Parents, siblings and friends supported you, and the instinct to repay that is right — but open-ended support scales faster than any portfolio.',
    managed:
      'Turn support into structure: a defined allowance, a property owned by you rather than gifted, a trust for education. Generosity with boundaries lasts far longer than generosity without them.',
  },
  {
    id: 'advisers',
    label: 'Choosing advisers I can trust',
    common:
      'The industry that surrounds elite earners is not uniformly honest. Introductions come through agents, teammates and family friends, and the incentives are often invisible.',
    managed:
      'Check the FCA register, insist on knowing exactly how they are paid, refuse anything you cannot explain to a friend in a sentence, and keep custody of assets with a mainstream platform in your name.',
  },
  {
    id: 'inflation',
    label: 'Inflation',
    common:
      'A pot that looks enormous today buys roughly half as much in twenty-five years at 3% inflation. Cash feels safe precisely because its losses are invisible.',
    managed:
      'Hold only what you need in cash, and own real assets — equities, property, index-linked bonds — for the long money. The goal is preserving purchasing power, not the number on the statement.',
  },
  {
    id: 'retirement',
    label: 'Retirement planning',
    common:
      'Retirement at 34 is not a pension problem, it is a fifty-year income problem — and most conventional advice quietly assumes you will work until 67.',
    managed:
      'Build the plan in two halves: a bridge from the end of your career to 55–57, then pensions and long-term assets after. Each half needs its own pot and its own strategy.',
  },
]

export const DISCIPLINES: { id: Discipline; label: string; retireAge: number }[] = [
  { id: 'football', label: 'Football', retireAge: 34 },
  { id: 'rugby', label: 'Rugby', retireAge: 33 },
  { id: 'tennis', label: 'Tennis', retireAge: 32 },
  { id: 'golf', label: 'Golf', retireAge: 45 },
  { id: 'motorsport', label: 'Motorsport', retireAge: 36 },
  { id: 'boxing', label: 'Boxing / MMA', retireAge: 35 },
  { id: 'cricket', label: 'Cricket', retireAge: 36 },
  { id: 'athletics', label: 'Athletics', retireAge: 33 },
  { id: 'acting', label: 'Acting', retireAge: 60 },
  { id: 'music', label: 'Music', retireAge: 60 },
  { id: 'tv', label: 'TV & media', retireAge: 60 },
  { id: 'creator', label: 'Creator / influencer', retireAge: 45 },
  { id: 'other', label: 'Something else', retireAge: 50 },
]

/* ── Step 5: behavioural risk assessment ───────────────────────────────── */

export interface PersonalityQuestion {
  id: string
  scene: string
  prompt: string
  options: { label: string; sub: string; weight: number }[]
}

export const PERSONALITY_QUESTIONS: PersonalityQuestion[] = [
  {
    id: 'drawdown',
    scene: 'Eighteen months in',
    prompt:
      'You open the app and £1,000,000 of your portfolio has become £780,000. Nothing about your life has changed. What do you actually do?',
    options: [
      { label: 'Sell and sit in cash', sub: 'I need the falling to stop', weight: -2 },
      { label: 'Move some to safety', sub: 'Cut the risk, keep a foot in', weight: -1 },
      { label: 'Do nothing', sub: 'It was money I would not touch for a decade', weight: 1 },
      { label: 'Put more in', sub: 'Same assets, cheaper price', weight: 2 },
    ],
  },
  {
    id: 'windfall',
    scene: 'The bonus lands',
    prompt: 'An unexpected £500,000 arrives. Be honest about the first thing you do with it.',
    options: [
      { label: 'Straight to cash', sub: 'It sits until I decide', weight: -2 },
      { label: 'Clear debt, then decide', sub: 'Reduce what I owe first', weight: -1 },
      { label: 'Invest it on a plan', sub: 'Into the existing strategy', weight: 1 },
      { label: 'Back an opportunity', sub: 'A business or property deal', weight: 2 },
    ],
  },
  {
    id: 'teammate',
    scene: 'The dressing room',
    prompt:
      'A teammate has tripled their money in eight months in something you do not understand. They are offering you in.',
    options: [
      { label: 'Not interested', sub: 'If I cannot explain it, I do not own it', weight: -2 },
      { label: 'Ask my adviser first', sub: 'Nothing moves without a second opinion', weight: 0 },
      { label: 'A small position', sub: 'An amount I can afford to lose entirely', weight: 1 },
      { label: 'A serious position', sub: 'Windows like this do not stay open', weight: 2 },
    ],
  },
  {
    id: 'certainty',
    scene: 'Two envelopes',
    prompt: 'Choose one, once, no negotiating.',
    options: [
      { label: '£400,000 guaranteed', sub: 'Certain, today', weight: -2 },
      { label: '£700,000 at 70% odds', sub: 'Likely, not certain', weight: 0 },
      { label: '£1,200,000 at 45% odds', sub: 'A coin-flip for more', weight: 1 },
      { label: '£3,000,000 at 20% odds', sub: 'Long odds, life-changing', weight: 2 },
    ],
  },
  {
    id: 'horizon',
    scene: 'The long money',
    prompt: 'Think about the portion of your wealth you genuinely will not touch. How long is that?',
    options: [
      { label: 'Under 3 years', sub: 'I want access to most of it', weight: -2 },
      { label: '3–7 years', sub: 'Medium-term plans', weight: -1 },
      { label: '8–15 years', sub: 'This is my second act money', weight: 1 },
      { label: '15 years or more', sub: 'This is generational', weight: 2 },
    ],
  },
  {
    id: 'sleep',
    scene: 'The honest one',
    prompt: 'Which statement would your partner say is most true of you?',
    options: [
      { label: 'I check my balance constantly', sub: 'Money noise gets into my head', weight: -2 },
      { label: 'I worry, but I hold on', sub: 'Uncomfortable, not reactive', weight: 0 },
      { label: 'I barely look', sub: 'I set it and forget it', weight: 1 },
      { label: 'Volatility excites me', sub: 'I see it as opportunity', weight: 2 },
    ],
  },
]

export interface RiskProfile {
  id: RiskProfileId
  label: string
  headline: string
  description: string
  equity: number
  bonds: number
  alternatives: number
  cash: number
  expectedReturn: number
  volatility: number
  worstYear: number
}

export const RISK_PROFILES: Record<RiskProfileId, RiskProfile> = {
  conservative: {
    id: 'conservative',
    label: 'Conservative',
    headline: 'Capital preservation first',
    description:
      'You would rather protect what you have than chase what you might have. That is a legitimate strategy — but over a fifty-year retirement your real enemy is inflation, not volatility, so even a defensive portfolio needs genuine growth assets inside it.',
    equity: 30,
    bonds: 45,
    alternatives: 5,
    cash: 20,
    expectedReturn: 4.0,
    volatility: 6,
    worstYear: -10,
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced',
    headline: 'Growth with guardrails',
    description:
      'You accept that markets fall and you can live through it, provided the plan is clear. This is the profile most elite earners end up in once their income has stopped: enough growth to beat inflation, enough ballast to sleep.',
    equity: 55,
    bonds: 30,
    alternatives: 8,
    cash: 7,
    expectedReturn: 5.3,
    volatility: 10,
    worstYear: -20,
  },
  growth: {
    id: 'growth',
    label: 'Growth',
    headline: 'Long horizon, real risk tolerance',
    description:
      'You are investing for a version of yourself decades away and you treat drawdowns as weather rather than emergencies. This works — as long as your short-term money is held somewhere entirely separate.',
    equity: 75,
    bonds: 13,
    alternatives: 8,
    cash: 4,
    expectedReturn: 6.4,
    volatility: 14,
    worstYear: -32,
  },
  adventurous: {
    id: 'adventurous',
    label: 'Adventurous',
    headline: 'High conviction, high tolerance',
    description:
      'You are comfortable with concentrated positions and large swings, and you are drawn to businesses and private deals. The discipline that matters for you is not courage — it is ring-fencing enough safe capital that a bad year can never touch your security.',
    equity: 85,
    bonds: 4,
    alternatives: 9,
    cash: 2,
    expectedReturn: 7.2,
    volatility: 19,
    worstYear: -45,
  },
}

/* ── Step 7: scenarios ─────────────────────────────────────────────────── */

export interface Scenario {
  id: ScenarioId
  label: string
  icon: string
  short: string
  detail: string
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'career-ends',
    label: 'Career ends tomorrow',
    icon: 'stop',
    short: 'All earned income stops now',
    detail:
      'The hardest test of any plan. Everything you own has to carry everything you spend, starting immediately. If the plan survives this, most other shocks are manageable.',
  },
  {
    id: 'income-halved',
    label: 'Income drops 50%',
    icon: 'half',
    short: 'A step down, a shorter contract',
    detail:
      'Far more common than a clean ending: a move down a division, fewer bookings, a smaller deal. Fixed costs stay; income does not.',
  },
  {
    id: 'injury',
    label: 'Major injury',
    icon: 'cross',
    short: 'Career cut short, with costs',
    detail:
      'Earnings stop early and medical, rehabilitation and adaptation costs arrive at the same time. Insurance is what separates a setback from a catastrophe.',
  },
  {
    id: 'downturn',
    label: 'Market downturn',
    icon: 'down',
    short: 'A 30% fall, then a slow recovery',
    detail:
      'Markets fall hard roughly once a decade. The damage depends almost entirely on whether you are forced to sell into it.',
  },
  {
    id: 'property',
    label: 'Major property purchase',
    icon: 'home',
    short: 'A £2m home, part-financed',
    detail:
      'Converts liquid, working capital into an illiquid asset with running costs. Beautiful, and quietly one of the biggest decisions on this page.',
  },
  {
    id: 'business',
    label: 'Starting a business',
    icon: 'rocket',
    short: '£500k invested, uncertain return',
    detail:
      'The most common second act. Model it as capital that may not come back, and it becomes a decision rather than a gamble.',
  },
  {
    id: 'children',
    label: 'Having children',
    icon: 'child',
    short: 'Two children, privately educated',
    detail:
      'Adds decades of committed spending and makes protection, wills and trusts non-negotiable rather than optional.',
  },
  {
    id: 'early-retirement',
    label: 'Retiring five years early',
    icon: 'clock',
    short: 'Stop sooner than planned',
    detail:
      'A double hit: five years of contributions lost and five extra years of drawing added. This is the scenario most people underestimate.',
  },
  {
    id: 'relocate',
    label: 'Relocating internationally',
    icon: 'globe',
    short: 'New tax residence, new rules',
    detail:
      'Can improve your net position substantially — or create double taxation and orphaned pensions. Never a decision to take without cross-border advice.',
  },
]

/* ── Education hub ─────────────────────────────────────────────────────── */

export interface EducationTopic {
  id: string
  title: string
  tagline: string
  icon: string
  minutes: number
  body: string[]
  example: { title: string; text: string }
  keyPoints: string[]
}

export const EDUCATION: EducationTopic[] = [
  {
    id: 'investing',
    title: 'Investing',
    tagline: 'Owning productive assets, patiently',
    icon: 'chart',
    minutes: 3,
    body: [
      'Investing is buying a share of things that produce value — companies, property, loans — and letting time do the compounding. It is not trading, and it is not picking winners.',
      'Almost all of the return you will ever earn comes from three decisions: how much you invest, how long you leave it, and how much of it sits in growth assets. Which specific fund you choose matters far less than any of those.',
      'The cost of getting it wrong is rarely a bad fund. It is being out of the market during the handful of days that produce most of the decade’s return.',
    ],
    example: {
      title: 'Two players, same contract',
      text: '£40,000 a month invested for six years at 6% leaves roughly £3.5m. Left untouched for a further twenty-five years it becomes around £15m — without another pound going in. The second player spent theirs. Same career, different life.',
    },
    keyPoints: [
      'Time in the market beats timing the market',
      'Costs compound against you exactly as returns compound for you',
      'If you cannot explain it in one sentence, do not own it',
    ],
  },
  {
    id: 'pensions',
    title: 'Pensions',
    tagline: 'The most tax-efficient pound you will ever save',
    icon: 'vault',
    minutes: 4,
    body: [
      'A pension is a tax wrapper, not an investment. Money goes in before tax, grows free of UK income and capital gains tax, and is taxed only when you draw it — typically at a lower rate than when you earned it.',
      'For a 45% taxpayer, a £10,000 contribution can cost as little as £5,500 net. No investment reliably offers that kind of instant uplift.',
      'The trade is access: you cannot normally touch it until 55, rising to 57 in 2028. For someone retiring from sport at 34, that is a twenty-year gap which has to be bridged with other assets — which is precisely why pensions are one part of the plan and never the whole of it.',
    ],
    example: {
      title: 'Carry-forward in a peak year',
      text: 'Unused annual allowance from the three previous tax years can often be carried forward, allowing a much larger contribution in a single high-income year. In a career where one year can dwarf the rest, this is one of the highest-value moves available.',
    },
    keyPoints: [
      'Tax relief at your marginal rate is an immediate, certain return',
      'Access is normally from 55 (57 from 2028)',
      'Old workplace and club schemes are worth tracing and consolidating',
    ],
  },
  {
    id: 'diversification',
    title: 'Diversification',
    tagline: 'The only free lunch in finance',
    icon: 'grid',
    minutes: 2,
    body: [
      'Diversification means owning assets that do not all fail for the same reason. Ten properties in one city is not diversification. Nor is five businesses that all depend on your name.',
      'For public figures the hidden concentration is usually themselves: income, brand deals, businesses and reputation are one correlated asset. If that asset stops, several income streams stop together.',
      'Spread across asset classes, geographies, currencies and time — and count your own earning power honestly as part of the portfolio.',
    ],
    example: {
      title: 'The correlated portfolio',
      text: 'A driver owned a dealership, a performance brand and a track-day business. Different companies, one dependency: him. A season out ended all three revenue lines at once. The equities portfolio he thought was boring was the only thing that kept paying.',
    },
    keyPoints: [
      'Your career is an asset — and usually your most concentrated one',
      'Correlation matters more than the number of holdings',
      'Rebalancing forces you to sell high and buy low automatically',
    ],
  },
  {
    id: 'inflation',
    title: 'Inflation',
    tagline: 'The quiet tax on cash',
    icon: 'flame',
    minutes: 2,
    body: [
      'Inflation reduces what your money buys. At 3% a year, £1m buys what roughly £478,000 buys today after twenty-five years — with no market crash and no bad decision.',
      'Cash feels safe because the number never falls. That is exactly what makes it dangerous over decades: the loss is real but invisible.',
      'Real assets — equities, property, index-linked bonds — are the defence. Hold cash for the money you need soon, and almost nothing beyond that.',
    ],
    example: {
      title: 'Fifty years of retirement',
      text: 'Retire at 35 and your money may need to last until 90. Spending £250,000 a year today means needing over £1m a year by your eighties at 3% inflation. A plan that ignores this is not a plan.',
    },
    keyPoints: [
      'Judge everything in real (after-inflation) terms',
      'Cash is a short-term tool, not a long-term strategy',
      'Long retirements are inflation problems before they are market problems',
    ],
  },
  {
    id: 'tax',
    title: 'Tax planning',
    tagline: 'Structure and timing, not schemes',
    icon: 'scales',
    minutes: 4,
    body: [
      'Legitimate tax planning is about using the allowances Parliament created, in the right order, at the right time. It is not about aggressive schemes — many of which have been retrospectively unwound, with devastating results for sportspeople in particular.',
      'The order that usually works: pension contributions, ISAs, capital gains allowances, then structure — companies, image rights, trusts — where the commercial substance genuinely supports it.',
      'Timing matters enormously when income is lumpy. Which tax year a payment lands in can be worth six figures.',
    ],
    example: {
      title: 'A cautionary decade',
      text: 'Hundreds of professional athletes entered film and partnership schemes marketed as tax-efficient in the 2000s. Many later faced accelerated payment notices and bills larger than the original tax. If a structure’s main purpose is the tax outcome, treat it as a risk, not a product.',
    },
    keyPoints: [
      'Use the wrappers before you consider structures',
      'Overseas earnings and image rights need specialist advice',
      'If the primary purpose is avoiding tax, expect it to be challenged',
    ],
  },
  {
    id: 'cashflow',
    title: 'Cash flow',
    tagline: 'Knowing your number',
    icon: 'stream',
    minutes: 3,
    body: [
      'Cash flow planning maps every pound in and out across your whole life, then answers one question: does this work?',
      'For irregular earners it is the single most valuable exercise available, because it converts an unknowable future into a set of tested assumptions you can stress.',
      'The output is not a spreadsheet. It is a number: the annual spending your wealth can sustain indefinitely. Everything else is a decision measured against it.',
    ],
    example: {
      title: 'The fixed-cost trap',
      text: 'Two homes, three cars, staff and school fees can commit £400,000 a year before a single discretionary purchase. Discretionary spending can be cut in a week; fixed costs take years to unwind — which is why they deserve most of the scrutiny.',
    },
    keyPoints: [
      'Separate fixed commitments from discretionary spending',
      'Model the short career, not the hoped-for one',
      'Revisit annually — contracts, tax and life all move',
    ],
  },
  {
    id: 'retirement',
    title: 'Retirement',
    tagline: 'A fifty-year income problem',
    icon: 'clock',
    minutes: 3,
    body: [
      'Retiring at 34 is not early retirement in the conventional sense — it is a career change with a very long, self-funded gap in the middle.',
      'Plan it in two halves. The bridge covers from the end of your career to pension access age and must be liquid and accessible. The long half starts at 55–57 and can be far more growth-oriented.',
      'The rule of thumb that a portfolio can sustain 4% a year assumes a thirty-year retirement. Over fifty years, closer to 3% is prudent — a difference that changes the required pot by a third.',
    ],
    example: {
      title: 'The bridge',
      text: 'Retire at 34 with pension access at 57 and you need twenty-three years of income from non-pension assets. ISAs, general investment accounts and property income do that work. Money locked in a pension, however well invested, cannot.',
    },
    keyPoints: [
      'Two pots: the bridge, and the long money',
      'Sustainable withdrawal rates fall as the horizon lengthens',
      'A second act reduces the required pot faster than any investment return',
    ],
  },
  {
    id: 'estate',
    title: 'Estate planning',
    tagline: 'Deciding, rather than defaulting',
    icon: 'tree',
    minutes: 3,
    body: [
      'Without a will, the law decides who receives what — and for unmarried partners the answer is frequently nothing.',
      'UK inheritance tax is charged at 40% above the available thresholds. On an estate of several million, that is a seven-figure decision that gifts, trusts, pensions and life cover written in trust can substantially change.',
      'Pensions sit outside the estate in most cases, which makes them a powerful legacy asset as well as a retirement one.',
    ],
    example: {
      title: 'The seven-year clock',
      text: 'Most outright gifts fall out of your estate entirely if you survive seven years. Starting at 35 rather than 65 removes the timing risk almost completely — the cheapest estate planning available is simply doing it early.',
    },
    keyPoints: [
      'A will and a lasting power of attorney are the baseline',
      'Life cover written in trust pays out free of inheritance tax',
      'Review after marriage, children, divorce or a move abroad',
    ],
  },
  {
    id: 'insurance',
    title: 'Insurance & protection',
    tagline: 'Insuring the asset that pays for everything',
    icon: 'shield',
    minutes: 3,
    body: [
      'Your earning power is your largest asset early in a career, and it is the one most people leave uninsured while insuring a car worth 1% of it.',
      'The core cover is income protection, critical illness, life cover and — for athletes — specific career-ending injury and personal accident policies.',
      'Buy it while you are young and healthy. Premiums are priced on the risk at the point you apply, and cover taken out at 22 is dramatically cheaper than the same cover at 32.',
    ],
    example: {
      title: 'The uninsured decade',
      text: 'A rugby player insured for career-ending injury received a settlement that covered the earnings he lost. A teammate with an identical injury and no policy took a coaching role at a fraction of his former income. Same injury; entirely different decade.',
    },
    keyPoints: [
      'Check what club or federation cover actually pays — it is usually less than assumed',
      'Read the definitions: "own occupation" cover is what matters for a specialist career',
      'Write policies in trust so they pay quickly and outside the estate',
    ],
  },
  {
    id: 'preservation',
    title: 'Wealth preservation',
    tagline: 'Keeping it is harder than making it',
    icon: 'vault',
    minutes: 3,
    body: [
      'Wealth is usually lost through a small number of repeated patterns: concentration, illiquidity, fraud, overspending, and untested advice.',
      'The defences are unglamorous — a written plan, clear governance over who can move money, custody with regulated mainstream institutions, and a ceiling on how much can ever go into any one idea.',
      'Public profiles attract a specific type of approach. A firm "everything goes through my adviser" is not rudeness; it is the policy that protects you.',
    ],
    example: {
      title: 'Never one signature',
      text: 'A significant share of losses among high-profile clients involve someone trusted holding a mandate over accounts. Dual authorisation on transfers above a threshold costs nothing and removes the single most common failure mode.',
    },
    keyPoints: [
      'Cap any single speculative position as a percentage of net worth',
      'Keep custody in your own name with a regulated platform',
      'Require two signatures on large movements — including your own advisers',
    ],
  },
]
