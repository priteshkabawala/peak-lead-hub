// Shared content + config for the public My Pension Advisor marketing site.
// Reconstructed faithfully from the original WordPress site.

export const SITE = {
  name: 'My Pension Advisor',
  email: 'info@mypensionadvisor.co.uk',
  phone: '03302 235 034',
  phoneHref: 'tel:03302235034',
  mobile: '+44 (0)7877 651 518',
  mobileHref: 'tel:+447877651518',
  hours: 'Mon–Fri: 8:00AM – 8:00PM',
  address: 'United Kingdom',
}

export type NavItem = { label: string; href: string; children?: NavItem[] }

export const NAV: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about-us' },
  {
    label: 'Services',
    href: '/services',
    children: [
      { label: 'Pensions', href: '/service/pensions' },
      { label: 'Pension Consolidation', href: '/pension-consolidation' },
      { label: 'Pension Review', href: '/pension-review' },
      { label: 'Pension Tracing', href: '/pension-tracing' },
      { label: 'Defined Benefit Schemes', href: '/defined-benefit-schemes' },
      { label: 'Set Up Pension', href: '/set-up-pension' },
    ],
  },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact Us', href: '/contact-us' },
]

// Options for the "Type of advice needed" dropdown on the callback form.
export const ADVICE_OPTIONS = [
  'General Pension Review',
  'Final Salary Pension',
  'Lifetime Allowance',
  'Transfer Out Pension',
  'SIPP Review',
  'Set up a new Scheme',
  'Pension Consolidation',
  'Pension Tracing',
  'Other',
]

export const WHY_US = [
  {
    title: "It's FREE to use",
    body:
      'There are no hidden fees and you will obtain a free consultation from our advisors. Your initial consultation is free of charge, and any advice or recommendation provided is clearly explained before you make an informed decision.',
  },
  {
    title: 'Dedicated regulated adviser',
    body:
      'We’ll put you in touch with an advisor specialising in the type of advice you need. We are also registered with the ICO, ensuring that your data is held securely every step of the way.',
  },
  {
    title: 'No obligation call',
    body:
      'Discuss your requirements with our regulated advisors with no obligation to proceed. Based on your advice requirements, we ensure that you are put in touch with the right adviser to help you. We are here to help.',
  },
]

export const EXPERTISE = [
  {
    title: 'Pensions',
    href: '/service/pensions',
    body:
      'The pension landscape has diversified a lot over the years. If you’ve previously enrolled in a plan with a specific funding pattern and investment approach in mind, we can help you check everything is still on track.',
  },
  {
    title: 'Investments',
    href: '/services',
    body:
      'Making sure your money is safe, secure and growing at the best possible rate is the key to financial planning. The advisors we work with are experts in ISAs, bonds, unit trusts, stocks & shares and more.',
  },
  {
    title: 'Tax & Estate Planning',
    href: '/services',
    body:
      'Protect your wealth and pass on more to the people who matter. Our advisors help with inheritance tax planning, trusts, and structuring your estate in the most tax-efficient way.',
  },
  {
    title: 'Mortgages',
    href: '/services',
    body:
      'Whether you’re a first-time buyer, moving home or remortgaging, we connect you with advisors who can find the right mortgage for your circumstances.',
  },
  {
    title: 'Family Protection',
    href: '/services',
    body:
      'Family protection can be set up to pay a lump sum or a regular income on death or diagnosis of an illness, helping your loved ones stay financially secure.',
  },
  {
    title: 'General Advice',
    href: '/services',
    body:
      'Not sure where to start? Speak to us and we’ll point you towards a regulated adviser who can review your wider financial picture.',
  },
]

export const FEATURED_IN = ['BBC', 'The Guardian', 'The Independent', 'The Telegraph', 'Mail Online']

export type Testimonial = { quote: string; author: string; meta?: string }

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'I would highly recommend getting a free consultation with My Pension Advisor. I received quick, efficient service and unbiased advice that helped me make an informed decision about my savings options.',
    author: 'M Patel',
  },
  {
    quote:
      'The person I spoke to was very helpful and knew what they were talking about. They explained everything so I could understand and answered all of my questions. I would definitely use this service again.',
    author: 'Mukesh Bhudia',
  },
  {
    quote:
      'Brilliant site! I simply told them what I wanted and they put me in touch with a qualified financial adviser. Highly recommend.',
    author: 'Vasoulla Nathanael',
  },
  {
    quote:
      'I needed clear and uncomplicated advice. My circumstances and needs were considered and I was provided with options and solutions that were appropriate for me. I would highly recommend!',
    author: 'Hema Bye-A-Jee',
  },
  {
    quote:
      'Excellent service from start to finish. They found me an excellent financial advisor who has been a great help and has clarified all my options. Many thanks.',
    author: 'Azer Brown',
  },
  {
    quote:
      'Got my pension transferred without any hassle. Everything is now in place. Thanks for your help — I will use them again.',
    author: 'Jason Kapadia',
  },
]
