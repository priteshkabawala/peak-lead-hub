import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { sendWhatsApp } from './whatsapp'
import { verifyPhone } from './phone'
import { openInitialSchedule } from './schedule'

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
  // Live campaign for this guide is named "12m Read"; also match the fuller
  // "12-Minute Retirement Plan" wording in case it's renamed.
  if (c.includes('12-min') || c.includes('12 min') || c.includes('12m') || (c.includes('12') && c.includes('guide'))) {
    return { file: 'your-12-minute-guide.pdf', title: 'Your 12-Minute Pension Guide' }
  }
  return DEFAULT_GUIDE
}

// Phone validation lives in ./phone — libphonenumber plus an optional carrier
// lookup. Do not re-add a regex here: the old one accepted landlines and
// placeholder numbers like 07342000000, which wasted the caller's time.

// Signature block on the guide email. Kept here rather than inline so the
// details can be corrected without touching the template.
const SENDER = {
  name: process.env.LEAD_EMAIL_SENDER_NAME || 'Reece Hogan',
  // The email says "Email me", so this address must be a real inbox someone
  // reads — it is also set as Reply-To, since we send from noreply@.
  email: process.env.LEAD_EMAIL_REPLY_TO || 'info@mypensionadvisor.co.uk',
  landline: process.env.LEAD_EMAIL_LANDLINE || '03302-235-034',
  whatsapp: process.env.LEAD_EMAIL_WHATSAPP || '07877-651-518',
  address: process.env.LEAD_EMAIL_ADDRESS || 'First Floor, 85 Great Portland St, London W1W 7LT',
}

/**
 * The free-guide email sent to the prospect. Copy supplied by Pritesh.
 *
 * Written with inline styles and no flexbox/grid: Outlook and older clients
 * ignore modern layout, so this stays as plain stacked blocks.
 *
 * Exported so it can be previewed and unit-tested without sending anything.
 */
export function guideEmailHtml(opts: { firstName: string | null; bookingUrl: string }): string {
  const greeting = opts.firstName?.trim() ? `Hi ${opts.firstName.trim()},` : 'Hi.'
  const li = 'font-size:14px;line-height:1.55;margin:0 0 7px'
  const p = 'font-size:14px;line-height:1.6;margin:0 0 15px'
  const ask = 'font-size:14px;line-height:1.6;margin:0 0 10px;font-weight:600'

  // Only linked when a scheduling URL is configured; a dead "click here" is
  // worse than plain text.
  const clickHere = opts.bookingUrl
    ? `<a href="${opts.bookingUrl}" style="color:#1d4ed8;font-weight:600">click here</a>`
    : 'click here'

  return `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 28px;background:#fff;color:#0f172a;border:1px solid #e3e8f0;border-radius:12px">
    <h2 style="margin:0 0 4px;font-size:21px">Your free guide is here 📘</h2>
    <p style="color:#64748b;font-size:13px;margin:0 0 22px">Peak Personal Finance</p>

    <p style="${p}">${greeting} Thank you for requesting our Guide!</p>

    <p style="${p}">
      Our representative may contact you shortly to enquire if you have any questions regarding
      the Pension Guide. This call presents an excellent opportunity for you to discover how we
      can assist in addressing your financial needs in:
    </p>

    <ul style="margin:0 0 15px;padding-left:22px;color:#0f172a">
      <li style="${li}">Pension planning, including investing and estate planning.</li>
      <li style="${li}">Finding an adviser who puts you first.</li>
      <li style="${li}">Aligning your investments and retirement goals.</li>
    </ul>

    <p style="${ask}">Are you prepared to discover how we can assist you in achieving a comfortable retirement?</p>

    <p style="${p}">
      <a href="mailto:${SENDER.email}" style="color:#1d4ed8;font-weight:600">Email me</a>
      or ${clickHere} to schedule an in-depth meeting with your qualified professional.
      We&rsquo;ll help you answer important questions such as:
    </p>

    <ul style="margin:0 0 20px;padding-left:22px;color:#0f172a">
      <li style="${li}">Is your portfolio positioned to meet your goals?</li>
      <li style="${li}">Will you have enough throughout retirement?</li>
      <li style="${li}">How can you generate income to maintain your lifestyle?</li>
    </ul>

    ${opts.bookingUrl ? `
    <p style="margin:0 0 24px">
      <a href="${opts.bookingUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:8px">Book your meeting →</a>
    </p>` : ''}

    <p style="${p};margin-bottom:4px">Kind Regards</p>
    <p style="font-size:15px;font-weight:700;margin:0 0 12px">${SENDER.name}</p>

    <p style="font-size:13px;line-height:1.7;color:#334155;margin:0">
      Landline ${SENDER.landline}<br>
      WhatsApp ${SENDER.whatsapp}<br>
      ${SENDER.address}
    </p>

    <p style="font-size:12px;color:#94a3b8;margin:22px 0 0;border-top:1px solid #e3e8f0;padding-top:14px">
      Peak Personal Finance · mypensionadvisor.co.uk
    </p>
  </div>`
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
    phoneReason: null as string | null, firstCallDue: null as string | null,
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
        replyTo: SENDER.email,
        attachments: [{ filename: guide.file, path: `${env.appUrl}/guides/${guide.file}` }],
        html: guideEmailHtml({
          firstName: lead.first_name ?? null,
          bookingUrl: process.env.NEXT_PUBLIC_CALENDLY_URL || '',
        }),
      })
      summary.guideEmailed = true
      await supabaseAdmin.from('leads').update({ guide_sent_at: new Date().toISOString() }).eq('id', lead.id)
    } catch { /* best-effort */ }
  }

  // 2 ─ Phone validation. A good number goes onto the call schedule; a bad one
  //     is parked so it never reaches the caller, and the admin is alerted.
  const verdict = await verifyPhone(lead.phone ?? '')
  summary.phoneValid = verdict.ok
  summary.phoneReason = verdict.reason ?? null

  await supabaseAdmin.from('leads').update({
    phone_e164: verdict.e164,
    phone_type: verdict.type,
    phone_valid: verdict.ok,
    ...(verdict.ok
      ? { parked_at: null, parked_reason: null }
      : { parked_at: new Date().toISOString(), parked_reason: verdict.reason ?? 'Number failed validation' }),
  }).eq('id', lead.id)

  if (verdict.ok) {
    try {
      const row = await openInitialSchedule(lead.id)
      summary.firstCallDue = row?.due_on ?? null
    } catch (e) {
      console.error('[lead-automation] could not open schedule:', (e as Error).message)
    }
  }

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
            <p style="font-size:13px;color:#334155;margin:0 0 4px">Reason: <strong>${summary.phoneReason ?? 'failed validation'}</strong></p>
            <p style="font-size:13px;color:#334155;margin:0 0 20px">This lead is <strong>parked</strong> — it is hidden from the caller and no callback has been scheduled. Add a working number to put it back in the queue, or discard it.</p>
            <a href="${env.appUrl}/crm?tab=parked" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px">Open parked leads →</a>
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
/**
 * Tell the admin a lead has closed, or that a number needs fixing.
 *
 *  final_try – paid lead ended (not interested, or 4 attempts). Worth one more
 *              attempt by the admin before it is written off.
 *  decide    – explicit opt-out ("do not call"). The admin decides what to do,
 *              and this email must NEVER invite another call attempt.
 *  park      – the number is unusable, it goes to the parked queue.
 */
export async function notifyAdminOfClosure(p: {
  leadId: number | string
  leadName: string
  phone: string
  kind: 'final_try' | 'decide' | 'park'
  detail?: string
}) {
  const env = envOrNull()
  if (!env) return { sent: 0, note: 'not configured' }

  const supabaseAdmin = createClient(env.url, env.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: admins } = await supabaseAdmin
    .from('profiles').select('email').eq('role', 'admin').eq('active', true)
  const to = (admins ?? []).map(a => a.email).filter(Boolean)
  if (!to.length) return { sent: 0, note: 'no admins' }

  const leadLink = `${env.appUrl}/crm?lead=${p.leadId}`
  const copy = {
    final_try: {
      subject: `Worth one last try: ${p.leadName}`,
      colour: '#b26b00', bg: '#fff8ed', border: '#ffe2b8',
      head: 'This lead has gone cold',
      body: `The caller finished with <b>${p.leadName}</b> (${p.detail ?? 'closed'}). You paid for this lead, so it may be worth one final call or email from you before writing it off.`,
      cta: 'Open the lead',
    },
    decide: {
      subject: `Opt-out to review: ${p.leadName}`,
      colour: '#c0304a', bg: '#fff5f6', border: '#ffd0d8',
      head: 'Lead asked not to be called',
      body: `<b>${p.leadName}</b> asked not to be contacted again. They have been removed from the call schedule. Review and discard when you are ready.`,
      cta: 'Review the lead',
    },
    park: {
      subject: `Number needs fixing: ${p.leadName}`,
      colour: '#0060c2', bg: '#f0f7ff', border: '#cfe4ff',
      head: 'Parked, number unusable',
      body: `The caller could not reach <b>${p.leadName}</b> on <code>${p.phone}</code>. The lead is parked and hidden from the caller. Update the number to put it back in the queue, or email them to ask for a better one.`,
      cta: 'Fix the number',
    },
  }[p.kind]

  const resend = new Resend(env.resendKey)
  await resend.emails.send({
    from: FROM_BRAND,
    to,
    subject: copy.subject,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:28px 24px;background:#fff;border:1px solid #e6e9ef;border-radius:12px">
        <div style="background:${copy.bg};border:1px solid ${copy.border};border-radius:9px;padding:13px 16px;margin-bottom:18px">
          <div style="font-weight:800;font-size:15px;color:${copy.colour}">${copy.head}</div>
        </div>
        <p style="font-size:14px;line-height:1.6;margin:0 0 20px;color:#323338">${copy.body}</p>
        <a href="${leadLink}" style="display:inline-block;background:#0073ea;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 22px;border-radius:8px">${copy.cta} →</a>
        <p style="font-size:12px;color:#9699a6;margin:22px 0 0">PeaK Lead Hub</p>
      </div>`,
  })
  return { sent: to.length }
}

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
