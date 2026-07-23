import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { runLeadAutomation } from '@/lib/notify-lead'

// Webhook intake for LinkedIn leads relayed via a bridge service (LeadsBridge,
// Make, Zapier, etc.) that holds LinkedIn's own approved Lead Sync access.
// This is a stand-in for the native LinkedIn OAuth sync (src/lib/linkedin.ts)
// until our own Lead Sync API application is approved — same automation
// fires either way (guide email, WhatsApp, admin/caller notifications).
//
// Auth: shared secret via `?secret=` query param or `x-webhook-secret` header
// (configure whichever LeadsBridge's webhook action supports).

export const runtime = 'nodejs'

function validPhone(p: string) {
  const c = (p || '').replace(/[\s\-()]/g, '')
  return /^(07\d{9}|01\d{8,9}|02\d{9}|03\d{9}|0800\d{6,7}|\+447\d{9})$/.test(c)
}

// Normalise an incoming value to a real value or null. LeadsBridge sends
// unmapped fields as empty strings or the literal "{{token}}" placeholder,
// and sometimes the strings "null"/"undefined" — none should reach the CRM.
function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t) return null
  if (/^\{\{.*\}\}$/.test(t)) return null            // unmapped merge token
  if (/^(null|undefined|n\/a|na|-)$/i.test(t)) return null
  return t
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

// Best-effort keyword match for custom LinkedIn form questions.
// NOTE: "When did you last review your pension(s)?" is a RECENCY question, not
// a pot-size one — it must not be mistaken for the pension band, so anything
// mentioning "review" is deliberately left for the notes field.
function classifyCustomField(label: string): 'pension' | 'seniority' | 'age_range' | 'adviser' | null {
  const t = label.toLowerCase()
  if (t.includes('review')) return null
  if (
    t.includes('investable assets') ||
    t.includes('value of your investment') ||
    (t.includes('pension') && /(value|size|pot|estimate|worth|how much)/.test(t))
  ) return 'pension'
  if (t.includes('role') || t.includes('seniority') || t.includes('job level')) return 'seniority'
  if (t.includes('age')) return 'age_range'
  if (t.includes('adviser') || t.includes('advisor')) return 'adviser'
  return null
}

type Payload = {
  // Standard fields — declare these as Custom Fields in LeadsBridge and map them.
  name?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  job_title?: string
  campaign_name?: string
  lead_id?: string // LinkedIn's lead response ID, for dedup — map if the bridge exposes it

  // Custom Lead Gen Form questions, declared as flat LeadsBridge fields with
  // exactly these names (map your LinkedIn questions onto them):
  pension?: string
  seniority?: string
  age_range?: string
  adviser?: string

  // Fallback: some bridges can send a nested object of { "question": "answer" };
  // anything here (or any unrecognised value above) is classified/kept in notes.
  custom_questions?: Record<string, string>
}

export async function POST(req: Request) {
  const reqUrl = new URL(req.url)
  const secret = process.env.LINKEDIN_WEBHOOK_SECRET
  const provided = reqUrl.searchParams.get('secret') || req.headers.get('x-webhook-secret')
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Read the raw body first so we can accept JSON *or* form-encoded posts
  // (bridges differ), and so a mis-shaped payload can be diagnosed.
  const raw = await req.text()
  let body: Payload = {}
  if (raw.trim()) {
    try {
      body = JSON.parse(raw)
    } catch {
      // Fall back to form-encoded (application/x-www-form-urlencoded)
      try {
        const params = new URLSearchParams(raw)
        const obj: Record<string, string> = {}
        for (const [k, v] of params.entries()) obj[k] = v
        if (Object.keys(obj).length === 0) throw new Error('empty')
        body = obj as Payload
      } catch {
        return NextResponse.json({ error: 'Unparseable body', rawPreview: raw.slice(0, 300) }, { status: 400 })
      }
    }
  }

  // Normalise every incoming key (lowercase, non-alphanumerics -> underscore)
  // so "Job Title", "job_title", "Job-Title" all resolve the same way. The
  // ORIGINAL key label is kept for the keyword classifier / notes.
  const normKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  const fields: Record<string, { label: string; value: string }> = {}
  const ingest = (k: string, v: unknown) => {
    const value = clean(v)
    if (value) fields[normKey(k)] = { label: k, value }
  }
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (k === 'custom_questions') continue
    ingest(k, v)
  }
  for (const [k, v] of Object.entries(body.custom_questions ?? {})) ingest(k, v)

  // LeadsBridge sends LinkedIn's own field labels ("First name", "Phone
  // number", "Email address", "LinkedIn profile URL"...), which normalise to
  // first_name / phone_number / email_address / linkedin_profile_url — so
  // resolve each CRM field from a list of aliases rather than one exact key.
  const pick = (...aliases: string[]) => {
    for (const a of aliases) if (fields[a]) return fields[a].value
    return null
  }

  const cleanName = pick('name', 'full_name')
  const { first, last } = cleanName
    ? splitName(cleanName)
    : {
        first: pick('first_name', 'firstname', 'first') ?? '',
        last: pick('last_name', 'lastname', 'last', 'surname') ?? '',
      }
  const phone = pick('phone', 'phone_number', 'phonenumber', 'mobile', 'mobile_number', 'telephone') ?? ''
  const email = pick('email', 'email_address', 'emailaddress')
  const jobTitle = pick('job_title', 'jobtitle', 'title')
  const campaign = pick('campaign_name', 'campaign')
  const leadId = pick('lead_id', 'leadid')
  const linkedinUrl = pick('linkedin_profile_url', 'linkedin_url', 'linkedin', 'profile_url')
  const city = pick('city', 'location')

  if (!first && !phone) {
    // Log the keys received (not values — this is lead PII) so a mapping
    // mismatch can be diagnosed without another round-trip.
    console.error('[linkedin/webhook] no name/phone. keys received:', Object.keys(fields).join(','), '| raw:', raw.slice(0, 500))
    return NextResponse.json({
      error: 'name or phone required',
      keysReceived: Object.keys(fields),
      rawPreview: raw.slice(0, 300),
    }, { status: 400 })
  }

  let pension = pick('pension')
  let seniority = pick('seniority')
  let ageRange = pick('age_range')
  let adviser = pick('adviser')
  const extraNotes: string[] = []
  if (city) extraNotes.push(`City: ${city}`)

  // Every remaining field (e.g. "When did you last review your pension(s)?")
  // is classified by keyword; anything unrecognised is kept in notes so no
  // answer is ever silently dropped.
  const KNOWN = new Set([
    'name', 'full_name', 'first_name', 'firstname', 'first',
    'last_name', 'lastname', 'last', 'surname',
    'email', 'email_address', 'emailaddress',
    'phone', 'phone_number', 'phonenumber', 'mobile', 'mobile_number', 'telephone',
    'job_title', 'jobtitle', 'title',
    'campaign_name', 'campaign', 'lead_id', 'leadid',
    'linkedin_profile_url', 'linkedin_url', 'linkedin', 'profile_url',
    'city', 'location',
    'pension', 'seniority', 'age_range', 'adviser',
    // LinkedIn/LeadsBridge metadata we don't need in the CRM
    'ad_destination_url', 'ad_form_id', 'ad_form_name', 'campaign_group_id',
    'campaign_group_name', 'campaign_id', 'creative_id', 'creative_name', 'created_on',
  ])
  for (const [nk, { label, value }] of Object.entries(fields)) {
    if (KNOWN.has(nk)) continue
    const kind = classifyCustomField(label)
    if (kind === 'pension' && !pension) pension = value
    else if (kind === 'seniority' && !seniority) seniority = value
    else if (kind === 'age_range' && !ageRange) ageRange = value
    else if (kind === 'adviser' && !adviser) adviser = value
    else extraNotes.push(`${label}: ${value}`)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'not configured' }, { status: 500 })
  }
  const supabaseAdmin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  // Dedup on LinkedIn's lead id when the bridge provides one.
  if (leadId) {
    const { data: existing } = await supabaseAdmin.from('leads').select('id').eq('linkedin_lead_id', leadId).maybeSingle()
    if (existing) return NextResponse.json({ ok: true, duplicate: true, leadId: existing.id })
  }

  const { data: inserted, error } = await supabaseAdmin.from('leads').insert([{
    date: new Date().toISOString().split('T')[0],
    first_name: first || 'Unknown',
    last_name: last || '',
    email,
    phone,
    phone_valid: validPhone(phone),
    campaign: campaign || 'LinkedIn',
    job_title: jobTitle,
    seniority, age_range: ageRange, pension, adviser,
    notes: extraNotes.length ? extraNotes.join(' · ') : null,
    status: 'New',
    linkedin_lead_id: leadId,
  }]).select('id').single()

  if (error || !inserted) {
    console.error('[linkedin/webhook] insert failed:', error?.message)
    return NextResponse.json({ error: 'Could not save lead' }, { status: 500 })
  }

  // LinkedIn profile URL is admin-only — store it in the RLS-protected table
  // so callers never see it (same as manually-entered leads).
  if (linkedinUrl) {
    await supabaseAdmin.from('lead_private')
      .upsert({ lead_id: inserted.id, linkedin_url: linkedinUrl, updated_at: new Date().toISOString() })
  }

  let automation: unknown = null
  try {
    automation = await runLeadAutomation(inserted.id)
    console.log('[linkedin/webhook] automation:', JSON.stringify(automation))
  } catch (e) {
    console.error('[linkedin/webhook] automation failed (lead still saved):', (e as Error).message)
  }

  return NextResponse.json({ ok: true, leadId: inserted.id, automation })
}
