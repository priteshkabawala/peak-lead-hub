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
