import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Lead = {
  id: number
  created_at: string
  date: string
  first_name: string
  last_name: string
  email: string | null
  phone: string
  phone_valid: boolean
  campaign: string | null
  job_title: string | null
  seniority: string | null
  age_range: string | null
  pension: string | null
  adviser: string | null
  notes: string | null
  status: string
  score: number
}

export type NewLead = Omit<Lead, 'id' | 'created_at' | 'score'>

// Admin-only fields, stored in a separate RLS-protected table
export type LeadPrivate = {
  lead_id: number
  linkedin_url: string | null
  init_fee_est: number | null
  updated_at: string
}

export type CallAttempt = {
  id: number
  lead_id: number
  caller_id: string | null
  caller_name: string
  outcome: string
  note: string | null
  created_at: string
}

// Preset call outcomes the caller picks from, plus the lead status each maps to.
export const CALL_OUTCOMES: { value: string; label: string; status?: string; tone: 'green' | 'amber' | 'red' | 'blue' }[] = [
  { value: 'no_answer',        label: 'No answer',             status: 'Contacted',      tone: 'amber' },
  { value: 'voicemail',        label: 'Left voicemail',        status: 'Contacted',      tone: 'amber' },
  { value: 'call_back',        label: 'Call back later',       status: 'Contacted',      tone: 'amber' },
  { value: 'connected',        label: 'Connected — interested', status: 'Qualified',     tone: 'green' },
  { value: 'meeting_booked',   label: 'Meeting booked',        status: 'Meeting Booked', tone: 'green' },
  { value: 'not_interested',   label: 'Not interested',        status: 'Cold',           tone: 'red' },
  { value: 'do_not_call',      label: 'Do not call',           status: 'Cold',           tone: 'red' },
  { value: 'wrong_number',     label: 'Wrong / bad number',    status: 'Invalid Phone',  tone: 'red' },
]

export async function logCallAttempt(params: {
  lead_id: number
  caller_id: string
  caller_name: string
  outcome: string
  note?: string
}) {
  return supabase.from('call_attempts').insert([params])
}

export type Profile = {
  id: string
  email: string
  name: string
  role: 'admin' | 'caller'
  active: boolean
  created_at: string
}

export type AuditLog = {
  id: number
  created_at: string
  user_id: string | null
  user_name: string
  user_role: string
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
}

export async function logAudit(params: {
  user_id: string
  user_name: string
  user_role: string
  action: string
  entity_type?: string
  entity_id?: string
  details?: Record<string, unknown>
}) {
  await supabase.from('audit_logs').insert([params])
}
