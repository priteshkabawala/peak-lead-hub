// Content for the individual service pages, reconstructed from the original site.

export type ServiceBlock = { heading?: string; paras?: string[]; bullets?: string[] }
export type Service = {
  slug: string
  title: string
  intro: string
  blocks: ServiceBlock[]
}

export const SERVICES: Record<string, Service> = {
  pensions: {
    slug: 'service/pensions',
    title: 'Pensions',
    intro:
      'A pension is a tax-efficient way of saving for your retirement. There are several different types of pension, and you can have more than one kind should you wish to. We’ll connect you with a regulated adviser to help you choose and manage the right options.',
    blocks: [
      {
        heading: 'Pension Review',
        paras: [
          'Regularly reviewing your pension could give you a better outcome at retirement and help you achieve your objectives. An adviser can check your charges, investment performance and whether your plan still suits your goals.',
        ],
      },
      {
        heading: 'Final Salary Scheme',
        paras: [
          'Defined benefit (final salary) pensions are valuable and complex. If you’re considering transferring out, regulated advice is essential — we’ll put you in touch with a specialist who can tell you whether it’s right for you.',
        ],
      },
      {
        heading: 'SIPP (Self-Invested Personal Pension)',
        paras: [
          'A SIPP gives you greater control and a wider choice of investments. An adviser can help you decide whether a SIPP fits your circumstances and how to manage it.',
        ],
      },
      {
        heading: 'Self-employed Pensions',
        paras: [
          'Being self-employed means your pension is entirely in your hands. We’ll help you find advice on setting up and contributing to a pension that works around your income.',
        ],
      },
      {
        heading: 'Pension Transfers & Drawdown',
        paras: [
          'Whether you’re consolidating old pots or moving into flexible drawdown to take an income in retirement, a regulated adviser can guide you through the options and the tax implications.',
        ],
      },
    ],
  },

  'pension-consolidation': {
    slug: 'pension-consolidation',
    title: 'Pension Consolidation',
    intro:
      'We are able to help consolidate your pension plans into one easy-to-access plan. Bringing your pots together can make them simpler to manage, easier to track, and potentially reduce the fees you pay.',
    blocks: [
      {
        heading: 'Why consolidate?',
        bullets: [
          'See all your retirement savings in one place',
          'Potentially lower or simpler charges',
          'Easier to manage your investment strategy',
          'Less paperwork and fewer providers to deal with',
        ],
      },
      {
        heading: 'Is it right for you?',
        paras: [
          'Consolidation isn’t right for everyone — some older pensions carry valuable guarantees or benefits that you could lose by transferring. That’s why we connect you with an FCA-regulated adviser who will review your plans and recommend what’s genuinely in your interest.',
        ],
      },
    ],
  },

  'pension-review': {
    slug: 'pension-review',
    title: 'Pension Review',
    intro:
      'Regularly reviewing your pension could give you a better outcome at retirement and help you achieve your objectives. A free review with a regulated adviser is a simple way to make sure your savings are still working hard for you.',
    blocks: [
      {
        heading: 'What a review covers',
        bullets: [
          'The charges you’re paying and whether they’re competitive',
          'How your investments have performed',
          'Whether your plan matches your attitude to risk and your retirement date',
          'Any valuable guarantees worth keeping',
        ],
      },
      {
        heading: 'No cost, no obligation',
        paras: [
          'Your initial consultation is free of charge, and any advice or recommendation is clearly explained before you make an informed decision. There’s no obligation to proceed.',
        ],
      },
    ],
  },

  'pension-tracing': {
    slug: 'pension-tracing',
    title: 'Pension Tracing',
    intro:
      'Find and track down all your old, frozen pensions and maximise your returns. Many people lose track of workplace pensions when they change jobs — we can help you locate them and decide what to do next.',
    blocks: [
      {
        heading: 'How it works',
        paras: [
          'We help you identify pensions from previous employers, gather up-to-date values, and then connect you with a regulated adviser who can advise whether to leave them where they are or bring them together.',
        ],
      },
      {
        heading: 'Why it matters',
        paras: [
          'Lost or forgotten pots can represent a significant part of your retirement income. Tracing them ensures nothing is left behind and that every pound is working towards your future.',
        ],
      },
    ],
  },

  'defined-benefit-schemes': {
    slug: 'defined-benefit-schemes',
    title: 'Defined Benefit Schemes',
    intro:
      'Is a final salary transfer right for you? Defined benefit (final salary) pensions provide a guaranteed income in retirement and are extremely valuable. We can help provide you with the regulated advice you need before making any decision.',
    blocks: [
      {
        heading: 'A decision that needs expert advice',
        paras: [
          'Transferring out of a defined benefit scheme means giving up a guaranteed, inflation-linked income for life. For most people, staying in the scheme is the right choice — which is why regulated advice is a legal requirement for transfers above £30,000.',
        ],
      },
      {
        heading: 'How we help',
        paras: [
          'We connect you with a pension transfer specialist who will assess your scheme, your wider finances and your objectives, then give you a clear, impartial recommendation.',
        ],
      },
    ],
  },

  'set-up-pension': {
    slug: 'set-up-pension',
    title: 'Set Up a Pension',
    intro:
      'When setting up a pension, you first need to decide which type of pension is right for you. We can help you secure your retirement income by connecting you with an adviser who’ll explain your options clearly.',
    blocks: [
      {
        heading: 'Choosing the right pension',
        paras: [
          'From personal pensions and SIPPs to workplace schemes, the right choice depends on your income, your goals and how hands-on you want to be. An adviser will help you weigh up the options.',
        ],
      },
      {
        heading: 'Getting started',
        bullets: [
          'Understand how much you can contribute tax-efficiently',
          'Pick an appropriate investment approach for your goals',
          'Set up regular or one-off contributions',
          'Review and adjust as your circumstances change',
        ],
      },
    ],
  },
}
