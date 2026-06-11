// Blog content for the marketing site. Titles are taken from the original
// My Pension Advisor blog; the body copy is original summary text written for
// this rebuild.

export type Post = {
  slug: string
  title: string
  date: string // ISO
  category: string
  excerpt: string
  body: string[]
}

export const POSTS: Post[] = [
  {
    slug: 'a-guide-to-achieving-your-retirement-goals',
    title: 'A guide to successfully achieving your retirement goals',
    date: '2024-08-12',
    category: 'Pension Planning',
    excerpt:
      'Setting a clear retirement goal is the first step to reaching it. Here’s how to turn “one day” into a plan you can actually follow.',
    body: [
      'Most of us know we should be saving for retirement, but far fewer have a concrete idea of what we’re saving towards. Putting a number on the lifestyle you want makes everything that follows easier.',
      'Start by estimating your target annual income in retirement, then work backwards: what do your current pensions project to, and is there a gap? A regular review keeps that projection honest as your circumstances change.',
      'Small adjustments made early — a slightly higher contribution, consolidating forgotten pots, or making sure your money is invested appropriately for your timeframe — can make a surprisingly large difference by the time you retire.',
      'If you’re not sure where you stand, a free review with a regulated adviser is a simple way to get a clear picture and a practical plan.',
    ],
  },
  {
    slug: 'what-is-the-triple-lock-on-state-pensions',
    title: 'What is the triple lock on State Pensions?',
    date: '2024-06-20',
    category: 'State Pension',
    excerpt:
      'The “triple lock” decides how the State Pension rises each year. Here’s what it means and why it matters for your retirement income.',
    body: [
      'The triple lock is the policy that determines how much the State Pension increases each year. Under it, the State Pension rises by the highest of three measures: inflation, average earnings growth, or 2.5%.',
      'The aim is to make sure the State Pension keeps pace with the cost of living and with wages, so its real value doesn’t erode over time.',
      'While the State Pension provides a valuable foundation, for most people it won’t be enough to fund the retirement they want on its own. That’s why a private or workplace pension remains so important.',
      'Understanding how the State Pension fits alongside your other savings is part of building a complete retirement plan.',
    ],
  },
  {
    slug: 'the-retirement-countdown-has-begun',
    title: 'The retirement countdown has begun — are you prepared?',
    date: '2024-05-02',
    category: 'Pension Planning',
    excerpt:
      'If retirement is on the horizon, the years just before it are some of the most important for getting your finances in shape.',
    body: [
      'The decade before retirement is when the decisions you make have the biggest impact. It’s the time to check your projected income, consolidate any scattered pensions, and make sure your investments match your shorter timeframe.',
      'It’s also worth thinking about how you’ll actually take your money — whether through an annuity, flexible drawdown, or a combination of the two — as each has different implications for tax and security of income.',
      'A regulated adviser can help you build a clear, tax-efficient plan for the transition from working life to retirement, so you can step into it with confidence.',
    ],
  },
  {
    slug: 'pensions-are-not-that-difficult-to-understand',
    title: 'Pensions may seem complicated, but they’re really not that difficult to understand',
    date: '2024-03-18',
    category: 'Pension Planning',
    excerpt:
      'Pension jargon puts a lot of people off. Strip it back, though, and the basics are refreshingly simple.',
    body: [
      'At its heart, a pension is just a tax-efficient pot of money you build up during your working life to spend in retirement. The government adds tax relief to your contributions, which is one of the biggest reasons pensions are such an effective way to save.',
      'The complexity people worry about usually comes from the jargon — annuities, drawdown, lifetime allowance — rather than the underlying ideas, which are straightforward once they’re explained clearly.',
      'You don’t need to become an expert. The right adviser will translate the jargon, show you your options in plain English, and help you make a confident decision.',
    ],
  },
  {
    slug: 'sustainable-investing-and-your-pension',
    title: 'Sustainable investing is a great way to make a positive impact with your pension',
    date: '2024-01-30',
    category: 'Investment Strategies',
    excerpt:
      'Your pension is one of the most powerful tools you have to invest in line with your values — without sacrificing your returns.',
    body: [
      'Sustainable or “ESG” investing means choosing funds that consider environmental, social and governance factors alongside financial performance. For many savers, it’s a way to make sure their money is doing good as well as growing.',
      'Far from being a compromise, a well-constructed sustainable portfolio can perform competitively over the long term while reducing exposure to companies with poor practices.',
      'If you’d like your pension invested in line with your values, a regulated adviser can help you find options that match both your principles and your goals.',
    ],
  },
  {
    slug: 'pension-scams-receiving-more-attention',
    title: 'As scams become more prevalent, they’re receiving more attention from parliamentarians',
    date: '2023-11-14',
    category: 'Finance',
    excerpt:
      'Pension scams are on the rise. Knowing the warning signs is the best protection for your hard-earned savings.',
    body: [
      'Pension scams have become more sophisticated, and they’re increasingly in the spotlight as policymakers look to strengthen protections for savers.',
      'Common red flags include unsolicited contact, promises of guaranteed high returns, pressure to act quickly, and offers to “unlock” your pension before age 55. If something sounds too good to be true, it almost always is.',
      'Always check that anyone advising you is authorised by the Financial Conduct Authority, and never feel rushed. A regulated adviser will give you the time and transparency you deserve.',
    ],
  },
  {
    slug: 'increased-life-expectancy-rates',
    title: 'Increased life expectancy and what it means for your pension',
    date: '2023-09-08',
    category: 'Pension Planning',
    excerpt:
      'We’re living longer than ever — great news, but it makes planning for a longer retirement more important than ever.',
    body: [
      'Rising life expectancy means many of us will spend 25 years or more in retirement. That’s a long time for your savings to last, which makes how you plan and invest crucial.',
      'A longer retirement increases the risk of running out of money, so it’s worth making sure your income strategy balances security with the potential for continued growth.',
      'A regulated adviser can help you stress-test your plan against a long retirement, so you can enjoy it without worrying about the years ahead.',
    ],
  },
  {
    slug: 'jargon-buster-for-financial-terms',
    title: 'Jargon buster for financial terms',
    date: '2023-07-21',
    category: 'Finance',
    excerpt:
      'Annuity, drawdown, ISA, SIPP… here’s a plain-English guide to the financial terms you’ll come across.',
    body: [
      'Financial language can be intimidating, but most of the terms are simpler than they sound. Here are a few of the most common.',
      'Annuity: an insurance product that pays you a guaranteed income for life in exchange for some or all of your pension pot. Drawdown: keeping your pension invested and taking an income from it flexibly.',
      'SIPP: a self-invested personal pension that gives you a wider choice of investments. ISA: a tax-efficient savings or investment account with annual contribution limits.',
      'Don’t let the vocabulary put you off — a good adviser will always explain things clearly and check you understand before you make any decisions.',
    ],
  },
]

export function getPost(slug: string) {
  return POSTS.find((p) => p.slug === slug)
}
