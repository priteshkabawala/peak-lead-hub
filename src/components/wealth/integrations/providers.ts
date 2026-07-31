/* Integration surface for everything the guide will eventually talk to.
   ---------------------------------------------------------------------------
   Each adapter is a plain async function with a stable signature and a local
   stub. The UI already calls through this module, so switching a stub for a
   real endpoint is a one-file change and needs no component edits.

   Nothing here transmits data today except `submitEnquiry`, which posts to this
   project's existing /api/leads route and only runs when the user submits the
   form themselves. */

import type { GuideState, Projection, ScoreSet } from '../types'

export interface PensionAccount {
  provider: string
  reference: string
  value: number
  type: 'defined-contribution' | 'defined-benefit' | 'sipp' | 'ssas'
  lastValued: string
}

export interface InvestmentAccount {
  provider: string
  wrapper: 'isa' | 'gia' | 'sipp' | 'offshore-bond'
  value: number
  currency: string
}

export interface BankSummary {
  accounts: { name: string; balance: number; currency: string }[]
  monthlyInflow: number
  monthlyOutflow: number
}

export interface Adviser {
  id: string
  name: string
  firm: string
  fcaNumber: string
  specialisms: string[]
}

export interface IntegrationAdapter {
  /** Pension provider APIs / Pensions Dashboard. */
  fetchPensions(userId: string): Promise<PensionAccount[]>
  /** Investment platform holdings. */
  fetchInvestments(userId: string): Promise<InvestmentAccount[]>
  /** Open Banking (AIS) — read-only account information. */
  fetchBanking(userId: string): Promise<BankSummary>
  /** Matching engine for regulated advisers. */
  matchAdvisers(state: GuideState): Promise<Adviser[]>
  /** Persist a plan server-side once accounts exist. */
  savePlan(userId: string, state: GuideState, scores: ScoreSet, projection: Projection): Promise<{ id: string }>
  /** AI coaching — a question plus the user's own context. */
  askCoach(question: string, state: GuideState): Promise<string>
}

const notWired = (name: string) => {
  throw new Error(
    `[elite-guide] ${name} is not connected yet. Implement it in src/components/wealth/integrations/providers.ts.`,
  )
}

/** The default adapter: everything stays local, nothing is transmitted. */
export const localAdapter: IntegrationAdapter = {
  async fetchPensions() {
    return notWired('fetchPensions')
  },
  async fetchInvestments() {
    return notWired('fetchInvestments')
  },
  async fetchBanking() {
    return notWired('fetchBanking')
  },
  async matchAdvisers() {
    return notWired('matchAdvisers')
  },
  async savePlan() {
    return notWired('savePlan')
  },
  async askCoach() {
    return notWired('askCoach')
  },
}

let adapter: IntegrationAdapter = localAdapter

/** Swap in a live adapter at boot (e.g. from a server component or a flag). */
export function setAdapter(next: IntegrationAdapter) {
  adapter = next
}

export function getAdapter(): IntegrationAdapter {
  return adapter
}

/** The one live integration: an enquiry the user explicitly submits. */
export async function submitEnquiry(payload: {
  name: string
  phone: string
  email?: string
  message: string
  company?: string
}): Promise<void> {
  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      advice: 'Elite wealth planning (athletes & public figures)',
      source: 'elite-guide',
    }),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || 'Could not send your details.')
  }
}
