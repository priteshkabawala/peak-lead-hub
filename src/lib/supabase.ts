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
