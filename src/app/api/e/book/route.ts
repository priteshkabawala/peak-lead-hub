import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * Booking link in the guide email. Records the click against the lead, then
 * forwards to Calendly.
 *
 * This exists so a booking can be attributed to the email rather than to the
 * caller's phone call — without it, the A/B test cannot tell which variant
 * actually earned the meeting.
 *
 * Deliberately forgiving: any failure still redirects. A prospect who wants to
 * book must never see an error because our logging broke.
 */
export async function GET(req: Request) {
  const calendly = process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://mypensionadvisor.co.uk'
  const url = new URL(req.url)
  const leadId = Number(url.searchParams.get('l'))

  // No personal data in the outbound URL — Calendly collects name and email
  // itself. Only our own opaque lead id is ever passed in.
  const target = calendly

  if (Number.isFinite(leadId) && leadId > 0) {
    try {
      const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (supaUrl && key) {
        const supa = createClient(supaUrl, key, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
        const { data: lead } = await supa
          .from('leads').select('email_click_at,email_click_count')
          .eq('id', leadId).maybeSingle()
        if (lead) {
          await supa.from('leads').update({
            // Keep the first click; that is the one the rate is measured on.
            email_click_at: lead.email_click_at ?? new Date().toISOString(),
            email_click_count: (lead.email_click_count ?? 0) + 1,
          }).eq('id', leadId)
        }
      }
    } catch (e) {
      console.error('[e/book] click not recorded:', (e as Error).message)
    }
  }

  return NextResponse.redirect(target, 302)
}
