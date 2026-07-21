import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { sendWhatsApp } from './whatsapp'

const FROM_BRAND = 'PeaK Lead Hub <noreply@mypensionadvisor.co.uk>'
const FROM_CLIENT = 'Peak Personal Finance <noreply@mypensionadvisor.co.uk>'

// Campaign → free-guide PDF (files live in /public/guides — see that README).
// Matched by KEYWORD against the LinkedIn campaign name (not exact-match), so
// real campaign names like "Pension Pots" or "Retire at 57 - UK" still route.
const DEFAULT_GUIDE = { file: 'your-12-minute-guide.pdf', title: 'Your Free Pension Guide' }

function guideForCampaign(campaign: string | null): { file: string; title: string } {
  const c = (campaign || '').toLowerCase()
  if (c.includes('retire at 57') || /\b57\b/.test(c)) {
    return { file: 'retire-at-57.pdf', title: 'How to Retire at 57' }
  }
  if (c.includes('combine') || c.includes('pension pot') || c.includes('consolidat')) {
    return { file: 'combine-your-pensions.pdf', title: 'Combining Your Pension Pots' }
  }
  if (c.includes('12-min') || c.includes('12 min') || (c.includes('12') && c.includes('guide'))) {
    return { file: 'your-12-minute-guide.pdf', title: 'Your 12-Minute Pension Guide' }
  }
  return DEFAULT_GUIDE
}

function validUkPhone(p: string) {
  const c = (p || '').replace(/[\s\-()]/g, '')
  return /^(07\d{9}|01\d{8,9}|02\d{9}|03\d{9}|0800\d{6,7}|\+447\d{9})$/.test(c)
}

function envOrNull() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY
  if (!url || !serviceKey || !resendKey) return null
  return { url, serviceKey, resendKey, appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://peak-lead-hub.vercel.app' }
}

/**
 * Full new-lead automation, fired whenever a lead is created (manual add today,
 * LinkedIn import later). Every step is best-effort so one failure can't block
 * the others. Returns a summary of what happened.
 *
 *  1. Email the lead their campaign-matched free guide (PDF attachment).
 *  2. Validate the phone. If invalid, email admins an alert with a deep link
 *     to the lead. (WhatsApp confirmation for valid numbers is added later.)
 *  3. Notify admins (full detail) and active callers (name/email/phone only).
 */
export async function runLeadAutomation(leadId: number | string) {
  const env = envOrNull()
  if (!env) return { ok: false, note: 'automation not configured' }

  const supabaseAdmin = createClient(env.url, env.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const resend = new Resend(env.resendKey)

  const { data: lead, error } = await supabaseAdmin.from('leads').select('*').eq('id', leadId).single()
  if (error || !lead) throw new Error(error?.message || 'lead not found')

  const fullName = `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || 'New lead'
  const leadLink = `${env.appUrl}/crm?lead=${lead.id}`
  const guide = guideForCampaign(lead.campaign)
  const summary = {
    ok: true, leadId: lead.id, guideEmailed: false, phoneValid: false,
    whatsapp: 'skipped' as string, adminAlerted: false, callersNotified: 0, adminsNotified: 0,
  }

  // recipients
  const { data: team } = await supabaseAdmin
    .from('profiles').select('email, name, role').eq('active', true).in('role', ['admin', 'caller'])
  const adminEmails = (team ?? []).filter(t => t.role === 'admin').map(t => t.email).filter(Boolean)
  const callerEmails = (team ?? []).filter(t => t.role === 'caller').map(t => t.email).filter(Boolean)

  // 1 ─ Free-guide email to the lead
  if (lead.email) {
    try {
      await resend.emails.send({
        from: FROM_CLIENT,
        to: [lead.email],
        subject: `Your free guide: ${guide.title}`,
        attachments: [{ filename: guide.file, path: `${env.appUrl}/guides/${guide.file}` }],
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 26px;background:#fff;color:#0f172a;border:1px solid #e3e8f0;border-radius:12px">
            <h2 style="margin:0 0 4px;font-size:21px">Your free guide is here 📘</h2>
            <p style="color:#64748b;font-size:13px;margin:0 0 20px">Peak Personal Finance</p>
            <p style="font-size:14px;margin:0 0 16px">Hi ${lead.first_name ?? 'there'},</p>
            <p style="font-size:14px;line-height:1.6;margin:0 0 16px">
              Thanks for requesting <strong>${guide.title}</strong> — it's attached to this email as a PDF.
              We hope you find it genuinely useful.
            </p>
            <p style="font-size:14px;line-height:1.6;margin:0 0 16px">
              One of our advisers may reach out shortly to answer any questions about your pension.
            </p>
            <p style="font-size:12px;color:#94a3b8;margin:22px 0 0">Peak Personal Finance · mypensionadvisor.co.uk</p>
          </div>`,
      })
      summary.guideEmailed = true
    } catch { /* best-effort */ }
  }

  // 2 ─ Phone validation → WhatsApp confirmation if valid, admin alert if not
  summary.phoneValid = validUkPhone(lead.phone)
  if (summary.phoneValid) {
    const wa = await sendWhatsApp({ toPhone: lead.phone, leadName: lead.first_name || 'there', guideTitle: guide.title })
    summary.whatsapp = wa.skipped ? 'not configured' : wa.ok ? 'sent' : `failed: ${wa.error}`
  }
  if (!summary.phoneValid && adminEmails.length) {
    try {
      await resend.emails.send({
        from: FROM_BRAND,
        to: adminEmails,
        subject: `⚠ Invalid phone on new lead: ${fullName}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:30px 24px;background:#fff;color:#0f172a;border:1px solid #fecaca;border-radius:12px">
            <h2 style="margin:0 0 12px;font-size:19px;color:#b91c1c">⚠ Lead has an invalid phone number</h2>
            <p style="font-size:14px;margin:0 0 8px"><strong>${fullName}</strong></p>
            <p style="font-size:13px;color:#334155;margin:0 0 4px">Phone on file: <code>${lead.phone ?? '—'}</code></p>
            <p style="font-size:13px;color:#334155;margin:0 0 20px">No WhatsApp confirmation was sent. Please review and correct the number.</p>
            <a href="${leadLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px">Open this lead in the CRM →</a>
          </div>`,
      })
      summary.adminAlerted = true
    } catch { /* best-effort */ }
  }

  // 3a ─ Notify admins with full detail
  if (adminEmails.length) {
    const row = (l: string, v: unknown) => `<tr><td style="padding:4px 10px 4px 0;color:#64748b;font-size:12px">${l}</td><td style="padding:4px 0;font-size:13px;font-weight:600">${v ?? '—'}</td></tr>`
    try {
      await resend.emails.send({
        from: FROM_BRAND,
        to: adminEmails,
        subject: `🆕 New lead created: ${fullName}${summary.phoneValid ? '' : ' (⚠ invalid phone)'}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:30px 24px;background:#fff;color:#0f172a;border:1px solid #e3e8f0;border-radius:12px">
            <h2 style="margin:0 0 4px;font-size:20px">New lead created</h2>
            <p style="color:#64748b;font-size:13px;margin:0 0 18px">PeaK Lead Hub · admin notification</p>
            <table style="border-collapse:collapse;margin-bottom:20px">
              ${row('Name', fullName)}
              ${row('Email', lead.email)}
              ${row('Phone', `${lead.phone ?? '—'} ${summary.phoneValid ? '✓' : '⚠ invalid'}`)}
              ${row('Campaign', lead.campaign)}
              ${row('Job title', lead.job_title)}
              ${row('Seniority', lead.seniority)}
              ${row('Age range', lead.age_range)}
              ${row('Pension band', lead.pension)}
              ${row('Spoken to adviser?', lead.adviser)}
              ${row('Score', `${lead.score ?? '—'}/100`)}
            </table>
            <a href="${leadLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px">Open this lead →</a>
          </div>`,
      })
      summary.adminsNotified = adminEmails.length
    } catch { /* best-effort */ }
  }

  // 3b ─ Notify callers (name / email / phone only — no financial data)
  if (callerEmails.length) {
    try {
      await resend.emails.send({
        from: FROM_BRAND,
        to: callerEmails,
        subject: `📞 New lead to call: ${fullName}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;color:#0f172a;border:1px solid #e3e8f0;border-radius:12px">
            <h2 style="margin:0 0 6px;font-size:20px">New lead in <span style="color:#2563eb">PeaK Lead Hub</span></h2>
            <p style="color:#64748b;font-size:13px;margin:0 0 20px">Peak Personal Finance</p>
            <p style="font-size:14px;margin:0 0 16px">A new prospect is ready to call:</p>
            <div style="background:#f1f5f9;border-radius:9px;padding:16px 18px;margin-bottom:22px">
              <div style="font-size:17px;font-weight:700;margin-bottom:6px">${fullName}</div>
              <div style="font-size:13px;color:#334155">📱 ${lead.phone ?? '—'}${lead.email ? ` &nbsp;·&nbsp; ✉️ ${lead.email}` : ''}</div>
            </div>
            <a href="${env.appUrl}/crm" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px">Open the calling workspace →</a>
            <p style="font-size:12px;color:#94a3b8;margin:22px 0 0">Call new leads quickly — they convert best within the first few hours.</p>
          </div>`,
      })
      summary.callersNotified = callerEmails.length
    } catch { /* best-effort */ }
  }

  return summary
}

// Emails every active caller that a new lead has landed. Best-effort:
// returns the number of recipients, or throws on a hard configuration error.
export async function notifyCallersOfNewLead(leadName: string, leadId?: number | string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY
  if (!url || !serviceKey || !resendKey) {
    return { sent: 0, note: 'notifications not configured' }
  }

  const supabaseAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: callers, error } = await supabaseAdmin
    .from('profiles')
    .select('email, name')
    .eq('role', 'caller')
    .eq('active', true)

  if (error) throw new Error(error.message)

  const recipients = (callers ?? []).map((c) => c.email).filter(Boolean)
  if (recipients.length === 0) return { sent: 0, note: 'no active callers' }

  const resend = new Resend(resendKey)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://peak-lead-hub.vercel.app'
  const name = (leadName || 'A new lead').toString().slice(0, 80)

  await resend.emails.send({
    from: 'PeaK Lead Hub <noreply@mypensionadvisor.co.uk>',
    to: recipients,
    subject: `📞 New lead to call: ${name}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;color:#0f172a;border:1px solid #e3e8f0;border-radius:12px">
        <h2 style="margin:0 0 6px;font-size:20px">New lead in <span style="color:#2563eb">PeaK Lead Hub</span></h2>
        <p style="color:#64748b;font-size:13px;margin:0 0 22px">Peak Personal Finance</p>
        <p style="font-size:14px;margin:0 0 18px">A new prospect has just been added and is ready to call:</p>
        <div style="background:#f1f5f9;border-radius:9px;padding:16px 18px;margin-bottom:22px">
          <div style="font-size:12px;color:#64748b;margin-bottom:4px">New lead</div>
          <div style="font-size:18px;font-weight:700">${name}</div>
        </div>
        <a href="${appUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px">Open the calling workspace →</a>
        <p style="font-size:12px;color:#94a3b8;margin:22px 0 0">Call new leads quickly — they convert best within the first few hours.</p>
      </div>
    `,
  })

  return { sent: recipients.length, leadId: leadId ?? null }
}
