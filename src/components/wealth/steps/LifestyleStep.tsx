'use client'

import { motion } from 'framer-motion'
import { gbp, gbpExact, netAnnualIncome } from '../engine'
import { useGuide } from '../store'
import { Callout, SectionTitle, StepShell } from '../ui/Primitives'
import Slider, { Segmented } from '../ui/Slider'

const money = (n: number) => gbp(n, { compact: n >= 100000 })

export default function LifestyleStep() {
  const { state, dispatch } = useGuide()
  const l = state.lifestyle
  const set = (value: Partial<typeof l>) => dispatch({ type: 'lifestyle', value })

  const netMonthly = netAnnualIncome(l.annualIncome) / 12
  const surplus = netMonthly - l.monthlySpend
  const spendShare = netMonthly > 0 ? Math.min(100, (l.monthlySpend / netMonthly) * 100) : 100
  const netWorth = l.investableAssets + l.pensionPot + l.propertyValue - l.debt

  return (
    <StepShell
      eyebrow="Step 4 of 8"
      title="The shape of your life"
      intro="Approximations are fine — move the sliders until each one feels roughly right. Everything updates live, and nothing is stored anywhere but this browser."
      wide
    >
      {/* Live read-out */}
      <motion.div layout className="pk-card-solid mb-8 overflow-hidden p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="pk-eyebrow">Money in vs money out</p>
            <div className="mt-4 space-y-3">
              <Bar
                label="Net income"
                sub="after estimated tax and NI"
                value={netMonthly}
                max={Math.max(netMonthly, l.monthlySpend)}
                colour="var(--pk-mint)"
              />
              <Bar
                label="Spending"
                sub={`${Math.round(spendShare)}% of what you take home`}
                value={l.monthlySpend}
                max={Math.max(netMonthly, l.monthlySpend)}
                colour={spendShare > 90 ? 'var(--pk-rose)' : spendShare > 70 ? 'var(--pk-amber)' : 'var(--pk-gold)'}
              />
            </div>
            <p className="mt-4 text-[14px]" style={{ color: 'var(--pk-text-2)' }}>
              {surplus >= 0 ? (
                <>
                  You are converting <strong style={{ color: 'var(--pk-mint)' }}>{gbpExact(Math.round(surplus))}</strong> a
                  month into future security — {gbpExact(Math.round(surplus * 12))} a year.
                </>
              ) : (
                <>
                  You are spending <strong style={{ color: 'var(--pk-rose)' }}>{gbpExact(Math.round(-surplus))}</strong> a
                  month more than you take home. That gap is being funded from capital.
                </>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 self-start">
            <Mini label="Net worth" value={money(netWorth)} />
            <Mini label="Liquid + pension" value={money(l.investableAssets + l.pensionPot)} />
            <Mini label="Cash runway" value={`${l.emergencyMonths} mo`} />
            <Mini
              label="Effective tax"
              value={`${Math.round((1 - netAnnualIncome(l.annualIncome) / Math.max(1, l.annualIncome)) * 100)}%`}
            />
          </div>
        </div>
      </motion.div>

      <SectionTitle hint="Earning and spending">Income & outgoings</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider
          label="Gross annual income"
          hint="Salary, prize money, appearances, sponsorship, royalties — everything, before tax."
          value={l.annualIncome}
          onChange={(annualIncome) => set({ annualIncome })}
          min={0}
          max={10_000_000}
          step={25_000}
          format={money}
          marks={[{ at: 0, label: '£0' }, { at: 5_000_000, label: '£5m' }, { at: 10_000_000, label: '£10m+' }]}
        />
        <Slider
          label="Monthly spending"
          hint="Everything that leaves the account: home, cars, travel, family, staff, tax on the way out."
          value={l.monthlySpend}
          onChange={(monthlySpend) => set({ monthlySpend })}
          min={1_000}
          max={200_000}
          step={1_000}
          format={money}
          marks={[{ at: 1000, label: '£1k' }, { at: 100_000, label: '£100k' }, { at: 200_000, label: '£200k' }]}
        />
        <Slider
          label="Years you expect to keep earning at this level"
          hint="Be conservative. A plan that survives the short version of your career is a plan that survives."
          value={l.yearsOfEarning}
          onChange={(yearsOfEarning) => set({ yearsOfEarning })}
          min={0}
          max={30}
          step={1}
          format={(n) => String(Math.round(n))}
          suffix={l.yearsOfEarning === 1 ? 'year' : 'years'}
          marks={[{ at: 0, label: 'Now' }, { at: 15, label: '15' }, { at: 30, label: '30+' }]}
        />
        <Slider
          label="Your age"
          value={l.age}
          onChange={(age) => set({ age })}
          min={16}
          max={70}
          step={1}
          format={(n) => String(Math.round(n))}
          marks={[{ at: 16, label: '16' }, { at: 43, label: '43' }, { at: 70, label: '70' }]}
        />
      </div>

      <SectionTitle hint="What you already hold">Assets & commitments</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider
          label="Savings & investments"
          hint="Cash, ISAs, shares, funds, crypto — anything you could sell, excluding pensions."
          value={l.investableAssets}
          onChange={(investableAssets) => set({ investableAssets })}
          min={0}
          max={20_000_000}
          step={50_000}
          format={money}
          marks={[{ at: 0, label: '£0' }, { at: 10_000_000, label: '£10m' }, { at: 20_000_000, label: '£20m+' }]}
        />
        <Slider
          label="Pension savings"
          hint="Every scheme, including old club and workplace pensions you may have forgotten."
          value={l.pensionPot}
          onChange={(pensionPot) => set({ pensionPot })}
          min={0}
          max={5_000_000}
          step={25_000}
          format={money}
          marks={[{ at: 0, label: '£0' }, { at: 2_500_000, label: '£2.5m' }, { at: 5_000_000, label: '£5m+' }]}
        />
        <Slider
          label="Property value"
          hint="Homes and investment property, at what they would sell for today."
          value={l.propertyValue}
          onChange={(propertyValue) => set({ propertyValue })}
          min={0}
          max={20_000_000}
          step={100_000}
          format={money}
          marks={[{ at: 0, label: '£0' }, { at: 10_000_000, label: '£10m' }, { at: 20_000_000, label: '£20m+' }]}
        />
        <Slider
          label="Mortgages & other debt"
          value={l.debt}
          onChange={(debt) => set({ debt })}
          min={0}
          max={10_000_000}
          step={50_000}
          format={money}
          marks={[{ at: 0, label: '£0' }, { at: 5_000_000, label: '£5m' }, { at: 10_000_000, label: '£10m+' }]}
        />
        <Slider
          label="Months of spending held in accessible cash"
          hint="The buffer that means a bad month never forces you to sell an investment."
          value={l.emergencyMonths}
          onChange={(emergencyMonths) => set({ emergencyMonths })}
          min={0}
          max={24}
          step={1}
          format={(n) => String(Math.round(n))}
          suffix="months"
          benchmark={{ at: 9, label: 'Recommended' }}
          marks={[{ at: 0, label: 'None' }, { at: 12, label: '12' }, { at: 24, label: '24+' }]}
        />
        <Segmented
          label="Income streams"
          hint="Contract, sponsorship, media, property, business — how many separate sources?"
          value={l.incomeStreams}
          onChange={(incomeStreams) => set({ incomeStreams })}
          options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: n === 5 ? '5+' : String(n) }))}
        />
      </div>

      <SectionTitle hint="Who and what depends on you">Life & commitments</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        <Segmented
          label="People who depend on you financially"
          value={l.dependants}
          onChange={(dependants) => set({ dependants })}
          options={[0, 1, 2, 3, 4, 5].map((n) => ({ value: n, label: n === 5 ? '5+' : String(n) }))}
        />
        <Segmented
          label="How much of your spending is luxury?"
          hint="Cars, watches, travel, hospitality — the spending you could stop tomorrow."
          value={l.luxuryIndex}
          onChange={(luxuryIndex) => set({ luxuryIndex })}
          options={[
            { value: 0, label: 'Barely any' },
            { value: 1, label: 'Some' },
            { value: 2, label: 'A lot' },
            { value: 3, label: 'It is the lifestyle' },
          ]}
        />
        <Segmented
          label="Do you own or invest in businesses?"
          value={l.hasBusiness}
          onChange={(hasBusiness) => set({ hasBusiness })}
          options={[
            { value: false, label: 'Not yet' },
            { value: true, label: 'Yes' },
          ]}
        />
        <Segmented
          label="Income protection or life cover in place?"
          hint="Income protection, critical illness, life cover, career-ending injury."
          value={l.hasProtection}
          onChange={(hasProtection) => set({ hasProtection })}
          options={[
            { value: false, label: 'No / not sure' },
            { value: true, label: 'Yes' },
          ]}
        />
      </div>

      {!l.hasProtection ? (
        <div className="mt-6">
          <Callout icon="shield" tone="rose" title="The asset you have not insured">
            Your future earnings are worth roughly {money(l.annualIncome * l.yearsOfEarning)} on these figures. Most
            people in your position insure a car worth a fraction of one per cent of that and leave the rest uncovered.
          </Callout>
        </div>
      ) : null}
    </StepShell>
  )
}

function Bar({
  label,
  sub,
  value,
  max,
  colour,
}: {
  label: string
  sub: string
  value: number
  max: number
  colour: string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13.5px] font-semibold">{label}</span>
        <span className="pk-num text-[15px]" style={{ color: colour }}>
          {gbpExact(Math.round(value))}
          <span className="ml-1 text-[12px] font-medium" style={{ color: 'var(--pk-muted)' }}>
            /mo
          </span>
        </span>
      </div>
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--pk-surface-2)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: colour }}
          animate={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        />
      </div>
      <p className="mt-1 text-[12px]" style={{ color: 'var(--pk-muted)' }}>
        {sub}
      </p>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: 'var(--pk-surface-2)' }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--pk-muted)' }}>
        {label}
      </p>
      <p className="pk-num mt-1 text-[19px]">{value}</p>
    </div>
  )
}
