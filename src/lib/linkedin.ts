import { createClient } from '@supabase/supabase-js'

// LinkedIn Marketing API — Lead Sync integration.
// Docs: https://learn.microsoft.com/en-us/linkedin/marketing/lead-sync/leadsync
//
// One company-wide connection is stored in `linkedin_connection` (singleton
// row, id=1). Tokens: access token ~60 days, refresh token ~1 year — both
// refreshed automatically via LINKEDIN_CLIENT_ID/SECRET.

const LI_VERSION = process.env.LINKEDIN_API_VERSION || '202601' // YYYYMM
const REST_BASE = 'https://api.linkedin.com/rest'
const AUTH_BASE = 'https://www.linkedin.com/oauth/v2'

// Space-separated scopes as granted in the LinkedIn Developer Portal (Auth tab).
// NOTE: as of the last check, this app has Advertising API scopes only —
// r_ads_leadgen_automation (or equivalent Lead Sync scope) is NOT yet granted.
// Lead Sync is approved separately from the Advertising API; leadFormResponses
// calls will 403 until that scope appears in the Auth tab. Update this default
// (or set LINKEDIN_SCOPES in Vercel) once it does.
export const LINKEDIN_SCOPES =
  process.env.LINKEDIN_SCOPES || 'r_ads rw_ads r_ads_reporting r_organization_social r_organization_admin rw_organization_admin r_basicprofile'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function liHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Linkedin-Version': LI_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
    'Content-Type': 'application/json',
  }
}

export function getAuthorizeUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: redirectUri,
    state,
    scope: LINKEDIN_SCOPES,
  })
  return `${AUTH_BASE}/authorization?${params.toString()}`
}

export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
  })
  const res = await fetch(`${AUTH_BASE}/accessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error_description || json.error || `LinkedIn token exchange failed (${res.status})`)
  return json as {
    access_token: string; expires_in: number
    refresh_token?: string; refresh_token_expires_in?: number
  }
}

async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
  })
  const res = await fetch(`${AUTH_BASE}/accessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error_description || json.error || `LinkedIn token refresh failed (${res.status})`)
  return json as { access_token: string; expires_in: number; refresh_token?: string; refresh_token_expires_in?: number }
}

// Returns a valid access token, refreshing + persisting it first if it's due to expire.
export async function getValidAccessToken(): Promise<string> {
  const supa = admin()
  const { data: conn } = await supa.from('linkedin_connection').select('*').eq('id', 1).single()
  if (!conn?.access_token) throw new Error('LinkedIn is not connected')

  const expiresAt = conn.expires_at ? new Date(conn.expires_at).getTime() : 0
  const dueSoon = expiresAt - Date.now() < 5 * 60 * 1000 // refresh 5 min before expiry

  if (!dueSoon) return conn.access_token

  if (!conn.refresh_token) throw new Error('LinkedIn access token expired and no refresh token is stored — reconnect required')

  const refreshed = await refreshAccessToken(conn.refresh_token)
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
  const newRefreshExpiresAt = refreshed.refresh_token_expires_in
    ? new Date(Date.now() + refreshed.refresh_token_expires_in * 1000).toISOString()
    : conn.refresh_expires_at

  await supa.from('linkedin_connection').update({
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || conn.refresh_token,
    expires_at: newExpiresAt,
    refresh_expires_at: newRefreshExpiresAt,
    updated_at: new Date().toISOString(),
  }).eq('id', 1)

  return refreshed.access_token
}

// ── Ad accounts / organizations the connected user can sync from ────────────
export async function listAdAccounts(token: string) {
  const res = await fetch(`${REST_BASE}/adAccounts?q=search&search=(status:(values:List(ACTIVE)))`, {
    headers: liHeaders(token),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message || `Failed to list ad accounts (${res.status})`)
  return (json.elements ?? []) as Array<{ id: number; name: string; test: boolean }>
}

// ── Lead form question schema (cached) ──────────────────────────────────────
type FormQuestion = {
  questionId: number
  predefinedField: string | null // e.g. FIRST_NAME, EMAIL, PHONE_NUMBER, JOB_TITLE
  text: string
}

async function getFormQuestions(token: string, formUrn: string): Promise<FormQuestion[]> {
  const supa = admin()
  const { data: cached } = await supa.from('linkedin_form_cache').select('*').eq('form_urn', formUrn).single()
  if (cached) return cached.questions as FormQuestion[]

  // formUrn looks like urn:li:versionedLeadGenForm:(urn:li:leadGenForm:3162,1) — pull the numeric form id
  const match = formUrn.match(/leadGenForm:(\d+)/)
  const formId = match?.[1]
  if (!formId) return []

  const res = await fetch(`${REST_BASE}/leadForms/${formId}`, { headers: liHeaders(token) })
  const json = await res.json()
  if (!res.ok) return []

  const questions: FormQuestion[] = (json.content?.questions ?? []).map((q: { questionId: number; predefinedField?: string; question?: { localized?: Record<string, string> } }) => ({
    questionId: q.questionId,
    predefinedField: q.predefinedField ?? null,
    text: q.question?.localized ? Object.values(q.question.localized)[0] : '',
  }))

  await supa.from('linkedin_form_cache').upsert({ form_urn: formUrn, questions, fetched_at: new Date().toISOString() })
  return questions
}

// ── Fetch new lead form responses since a timestamp, map to CRM lead shape ──
export type MappedLead = {
  linkedin_lead_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string
  campaign: string | null
  job_title: string | null
  seniority: string | null
  age_range: string | null
  pension: string | null
  adviser: string | null
  notes: string | null
}

function answerText(answer: { answerDetails?: { textQuestionAnswer?: { answer?: string }; multipleChoiceAnswer?: { options?: number[] } } }): string {
  return answer.answerDetails?.textQuestionAnswer?.answer ?? ''
}

// Best-effort keyword match for custom (non-predefined) questions, based on
// the wording suggested in the Strategy tab. Adjust once real forms are live.
function classifyCustomQuestion(text: string): 'pension' | 'seniority' | 'age_range' | 'adviser' | null {
  const t = text.toLowerCase()
  if (t.includes('pension') || t.includes('investable assets')) return 'pension'
  if (t.includes('role') || t.includes('seniority') || t.includes('job level')) return 'seniority'
  if (t.includes('age')) return 'age_range'
  if (t.includes('adviser') || t.includes('advisor')) return 'adviser'
  return null
}

export type SyncResult = { imported: number; skipped: number; failed: number; leadIds: number[]; error?: string }

// Shared by the manual "Sync now" admin action and the Vercel Cron job.
export async function runLinkedInSync(): Promise<SyncResult> {
  const { runLeadAutomation } = await import('./notify-lead')
  const supa = admin()

  const { data: conn } = await supa.from('linkedin_connection').select('*').eq('id', 1).single()
  if (!conn?.access_token) return { imported: 0, skipped: 0, failed: 0, leadIds: [], error: 'LinkedIn not connected' }
  if (!conn.owner_urn) return { imported: 0, skipped: 0, failed: 0, leadIds: [], error: 'LinkedIn ad account not selected' }

  const sinceMs = conn.last_synced_at
    ? new Date(conn.last_synced_at).getTime() - 5 * 60 * 1000
    : Date.now() - 24 * 60 * 60 * 1000

  let leads: MappedLead[]
  try {
    leads = await fetchNewLeads(sinceMs)
  } catch (e) {
    return { imported: 0, skipped: 0, failed: 0, leadIds: [], error: (e as Error).message }
  }

  const results: SyncResult = { imported: 0, skipped: 0, failed: 0, leadIds: [] }

  for (const l of leads) {
    const { data: existing } = await supa.from('leads').select('id').eq('linkedin_lead_id', l.linkedin_lead_id).maybeSingle()
    if (existing) { results.skipped++; continue }

    const { data: inserted, error } = await supa.from('leads').insert([{
      date: new Date().toISOString().split('T')[0],
      first_name: l.first_name || 'Unknown',
      last_name: l.last_name || '',
      email: l.email,
      phone: l.phone || '',
      phone_valid: /^(07\d{9}|01\d{8,9}|02\d{9}|03\d{9}|0800\d{6,7}|\+447\d{9})$/.test((l.phone || '').replace(/[\s\-()]/g, '')),
      campaign: l.campaign,
      job_title: l.job_title,
      seniority: l.seniority,
      age_range: l.age_range,
      pension: l.pension,
      adviser: l.adviser,
      notes: l.notes,
      status: 'New',
      linkedin_lead_id: l.linkedin_lead_id,
    }]).select().single()

    if (error || !inserted) { results.failed++; continue }
    results.imported++
    results.leadIds.push(inserted.id)

    try { await runLeadAutomation(inserted.id) } catch { /* best-effort */ }
  }

  await supa.from('linkedin_connection').update({ last_synced_at: new Date().toISOString() }).eq('id', 1)
  return results
}

export async function fetchNewLeads(sinceMs: number): Promise<MappedLead[]> {
  const supa = admin()
  const { data: conn } = await supa.from('linkedin_connection').select('*').eq('id', 1).single()
  if (!conn?.owner_urn || !conn.owner_type) throw new Error('LinkedIn owner (ad account) not selected')

  const token = await getValidAccessToken()
  const ownerParam = `(${conn.owner_type}:${encodeURIComponent(conn.owner_urn)})`
  const timeRange = `(start:${sinceMs},end:${Date.now()})`

  const url = `${REST_BASE}/leadFormResponses?q=owner&owner=${ownerParam}&leadType=(leadType:SPONSORED)&submittedAtTimeRange=${timeRange}&count=100`
  const res = await fetch(url, { headers: liHeaders(token) })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message || `Failed to fetch lead responses (${res.status})`)

  const elements: Array<{
    id: string; submittedAt: number
    versionedLeadGenFormUrn: string
    leadMetadataInfo?: { sponsoredLeadMetadataInfo?: { campaign?: { name?: string } } }
    formResponse: { answers: Array<{ questionId: number; answerDetails?: { textQuestionAnswer?: { answer?: string } } }> }
  }> = json.elements ?? []

  const mapped: MappedLead[] = []
  for (const el of elements) {
    const questions = await getFormQuestions(token, el.versionedLeadGenFormUrn)
    const byId = new Map(questions.map(q => [q.questionId, q]))

    const lead: MappedLead = {
      linkedin_lead_id: el.id,
      first_name: '', last_name: '', email: null, phone: '',
      campaign: el.leadMetadataInfo?.sponsoredLeadMetadataInfo?.campaign?.name ?? null,
      job_title: null, seniority: null, age_range: null, pension: null, adviser: null,
      notes: null,
    }
    const extraNotes: string[] = []

    for (const ans of el.formResponse.answers) {
      const q = byId.get(ans.questionId)
      const value = answerText(ans)
      if (!q) continue

      switch (q.predefinedField) {
        case 'FIRST_NAME': lead.first_name = value; break
        case 'LAST_NAME': lead.last_name = value; break
        case 'EMAIL': lead.email = value || null; break
        case 'PHONE_NUMBER': lead.phone = value; break
        case 'JOB_TITLE': lead.job_title = value || null; break
        default: {
          const kind = classifyCustomQuestion(q.text)
          if (kind === 'pension') lead.pension = value || null
          else if (kind === 'seniority') lead.seniority = value || null
          else if (kind === 'age_range') lead.age_range = value || null
          else if (kind === 'adviser') lead.adviser = value || null
          else if (value) extraNotes.push(`${q.text}: ${value}`)
        }
      }
    }

    if (extraNotes.length) lead.notes = extraNotes.join(' · ')
    if (lead.first_name || lead.last_name || lead.phone) mapped.push(lead)
  }

  return mapped
}
