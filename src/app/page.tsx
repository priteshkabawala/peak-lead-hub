'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, logAudit, type Lead, type Profile } from '@/lib/supabase'
import CallerManagement from '@/components/CallerManagement'
import AuditLogView from '@/components/AuditLog'

// ── helpers ──────────────────────────────────────────────────────────────────

const PEN_LABEL: Record<string, string> = {
  '500k+': '£500k+', '250-500k': '£250k–500k',
  '100-250k': '£100k–250k', '50-100k': '£50k–100k', '<50k': '<£50k',
}
const PEN_MID: Record<string, number> = {
  '500k+': 600000, '250-500k': 375000, '100-250k': 175000, '50-100k': 75000, '<50k': 30000,
}

function clientScore(p?: string | null, s?: string | null, a?: string | null, adv?: string | null) {
  let n = 0
  if (p === '500k+') n += 40; else if (p === '250-500k') n += 30; else if (p === '100-250k') n += 10
  if (s === 'CEO/MD') n += 30; else if (s === 'VP') n += 25; else if (s === 'Director') n += 22; else if (s === 'Manager') n += 10
  if (a === '45-55') n += 20; else if (a === '55-65') n += 18; else if (a === '35-45') n += 10; else n += 3
  if (adv === 'No') n += 10; else if (adv === 'Unsure') n += 5
  return n
}

function scClass(s: number) { return s >= 70 ? 'sc sc-h' : s >= 40 ? 'sc sc-m' : 'sc sc-l' }
function scColor(s: number) { return s >= 70 ? 'var(--green)' : s >= 40 ? 'var(--amber)' : 'var(--red)' }
function scLabel(s: number) { return s >= 70 ? '✅ Quality Lead' : s >= 40 ? '⚠️ Moderate Lead' : '❌ Below Criteria' }

function pillClass(status: string) {
  const m: Record<string, string> = {
    'New': 'pill p-new', 'Contacted': 'pill p-contacted', 'Qualified': 'pill p-qualified',
    'Meeting Booked': 'pill p-booked', 'Cold': 'pill p-cold', 'Invalid Phone': 'pill p-invalid',
  }
  return m[status] ?? 'pill p-new'
}

function ticket(pen?: string | null) {
  const mid = PEN_MID[pen ?? '']
  if (!mid) return null
  return { initial: mid * 0.04, ongoing: mid * 0.008, five: mid * 0.04 + mid * 0.008 * 5, ten: mid * 0.04 + mid * 0.008 * 10 }
}

function fmt(n: number) { return '£' + Math.round(n).toLocaleString('en-GB') }

function validPhone(p: string) {
  const c = p.replace(/[\s\-()]/g, '')
  return /^(07\d{9}|01\d{8,9}|02\d{9}|03\d{9}|0800\d{6,7}|\+447\d{9})$/.test(c)
}

function shortCamp(c?: string | null) {
  if (!c) return '—'
  return c.replace('Combine Your Pension Pots', 'Combine Pensions').replace('Your 12-Minute Guide', '12-Min Guide')
}

function senTag(sen?: string | null) {
  if (sen === 'CEO/MD') return <span className="tag tag-ceo">{sen}</span>
  if (sen === 'VP') return <span className="tag tag-vp">{sen}</span>
  if (sen === 'Director') return <span className="tag tag-dir">{sen}</span>
  return <span className="tag tag-mgr">{sen ?? '—'}</span>
}

// ── types ─────────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'leads' | 'caller' | 'add' | 'strategy' | 'callers_admin' | 'audit_admin'

interface FormState {
  first_name: string; last_name: string; email: string; phone: string
  campaign: string; job_title: string; seniority: string; age_range: string
  pension: string; adviser: string; notes: string
}

const EMPTY_FORM: FormState = {
  first_name: '', last_name: '', email: '', phone: '',
  campaign: '', job_title: '', seniority: '', age_range: '',
  pension: '', adviser: '', notes: '',
}

// ── component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [notif, setNotif] = useState<{ msg: string; color: string } | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [phoneErr, setPhoneErr] = useState('')
  const [saving, setSaving] = useState(false)
  // filters
  const [search, setSearch] = useState('')
  const [fqual, setFqual] = useState('')
  const [fcamp, setFcamp] = useState('')
  const [fstat, setFstat] = useState('')
  const [callerF, setCallerF] = useState('all')

  const showNotif = (msg: string, color = 'var(--green)') => {
    setNotif({ msg, color })
    setTimeout(() => setNotif(null), 3200)
  }

  // ── auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (!data) { await supabase.auth.signOut(); router.push('/login'); return }
      setProfile(data)
      setAuthLoading(false)
    })
  }, [router])

  const handleLogout = async () => {
    if (profile) {
      await logAudit({ user_id: profile.id, user_name: profile.name, user_role: profile.role, action: 'Signed out' })
    }
    await supabase.auth.signOut()
    router.push('/login')
  }

  const fetchLeads = useCallback(async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) { showNotif('⚠ Failed to load leads', 'var(--red)'); return }
    setLeads(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const updateStatus = async (id: number, status: string) => {
    const lead = leads.find(l => l.id === id)
    const { error } = await supabase.from('leads').update({ status }).eq('id', id)
    if (error) { showNotif('⚠ Update failed', 'var(--red)'); return }
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    if (profile) {
      await logAudit({
        user_id: profile.id, user_name: profile.name, user_role: profile.role,
        action: 'Lead status changed',
        entity_type: 'lead', entity_id: String(id),
        details: { lead: `${lead?.first_name} ${lead?.last_name}`, from: lead?.status, to: status },
      })
    }
  }

  const handleAddLead = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim()) {
      showNotif('⚠ First name, last name and phone are required', 'var(--amber)'); return
    }
    setSaving(true)
    const pv = validPhone(form.phone)
    const { data, error } = await supabase.from('leads').insert([{
      date: new Date().toISOString().split('T')[0],
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email || null,
      phone: form.phone.trim(),
      phone_valid: pv,
      campaign: form.campaign || null,
      job_title: form.job_title || null,
      seniority: form.seniority || null,
      age_range: form.age_range || null,
      pension: form.pension || null,
      adviser: form.adviser || null,
      notes: form.notes || null,
      status: 'New',
    }]).select().single()
    setSaving(false)
    if (error) { showNotif('⚠ Failed to save lead: ' + error.message, 'var(--red)'); return }
    setLeads(prev => [data, ...prev])
    if (profile) {
      await logAudit({
        user_id: profile.id, user_name: profile.name, user_role: profile.role,
        action: 'Lead added',
        entity_type: 'lead', entity_id: String(data.id),
        details: { name: `${form.first_name} ${form.last_name}`, score: clientScore(form.pension, form.seniority, form.age_range, form.adviser) },
      })
    }
    setForm(EMPTY_FORM)
    showNotif(`✅ Lead added: ${form.first_name} ${form.last_name} — Score: ${clientScore(form.pension, form.seniority, form.age_range, form.adviser)}/100`)
    setTab('leads')
  }

  const handlePhoneChange = (v: string) => {
    setForm(f => ({ ...f, phone: v }))
    if (!v) { setPhoneErr(''); return }
    setPhoneErr(validPhone(v) ? 'valid' : 'invalid')
  }

  const exportCSV = () => {
    const h = ['Date','First Name','Last Name','Email','Phone','Phone Valid','Campaign','Job Title','Seniority','Age','Pension','Adviser','Score','Status','Est. Initial Fee','Notes']
    const rows = leads.map(l => {
      const t = ticket(l.pension)
      return [l.date,l.first_name,l.last_name,l.email,l.phone,l.phone_valid?'Valid':'Invalid',l.campaign,l.job_title,l.seniority,l.age_range,PEN_LABEL[l.pension??'']??'',l.adviser,l.score,l.status,t?fmt(t.initial):'',l.notes]
        .map(c => `"${String(c??'').replace(/"/g,'""')}"`).join(',')
    })
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent([h.join(','),...rows].join('\n'))
    a.download = 'PeaK-Leads-' + new Date().toISOString().split('T')[0] + '.csv'
    a.click()
    showNotif('✅ CSV downloaded')
  }

  // ── filtered leads ──────────────────────────────────────────────────────────

  const filtered = leads.filter(l => {
    if (search) {
      const s = `${l.first_name} ${l.last_name} ${l.phone} ${l.email} ${l.job_title}`.toLowerCase()
      if (!s.includes(search.toLowerCase())) return false
    }
    if (fqual === 'high' && l.score < 70) return false
    if (fqual === 'mid' && (l.score < 40 || l.score >= 70)) return false
    if (fqual === 'low' && l.score >= 40) return false
    if (fcamp && l.campaign !== fcamp) return false
    if (fstat && l.status !== fstat) return false
    return true
  })

  const callerLeads = leads.filter(l => {
    if (['Meeting Booked', 'Cold', 'Invalid Phone'].includes(l.status)) return false
    if (callerF === 'priority' && l.score < 70) return false
    if (callerF === 'new' && l.status !== 'New') return false
    return true
  })

  const qualityLeads = leads.filter(l => l.score >= 70)
  const bookedLeads  = leads.filter(l => l.status === 'Meeting Booked')
  const invalidLeads = leads.filter(l => !l.phone_valid)
  const pipelineVal  = qualityLeads.filter(l => l.status !== 'Cold').reduce((a, l) => a + (ticket(l.pension)?.initial ?? 0), 0)

  const liveScore = clientScore(form.pension, form.seniority, form.age_range, form.adviser)
  const hasFormData = !!(form.pension || form.seniority || form.age_range || form.adviser)

  // ── render ──────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</div>
      </div>
    )
  }

  return (
    <>
      {/* Notification */}
      {notif && (
        <div className="notif" style={{ background: notif.color, opacity: 1 }}>
          {notif.msg}
        </div>
      )}

      {/* Nav */}
      <nav className="nav">
        <div className="brand">PeaK <span>Lead Hub</span> <em>Peak Personal Finance</em></div>
        {(['dashboard','leads','caller','add','strategy'] as Tab[]).map((t, i) => {
          const labels = ['📊 Dashboard','👥 All Leads','📞 Caller View','➕ Add Lead','🎯 Strategy']
          return <button key={t} className={`nav-btn${tab===t?' active':''}`} onClick={() => setTab(t)}>{labels[i]}</button>
        })}
        {profile?.role === 'admin' && <>
          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
          <button className={`nav-btn${tab==='callers_admin'?' active':''}`} onClick={() => setTab('callers_admin')}>👤 Callers</button>
          <button className={`nav-btn${tab==='audit_admin'?' active':''}`} onClick={() => setTab('audit_admin')}>📋 Audit Log</button>
        </>}
        <div className="nav-right">
          <span className="live-dot" />
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{profile?.name}</span>
          <span style={{ fontSize: 10.5, color: 'var(--muted)', background: 'var(--surface2)', padding: '2px 7px', borderRadius: 10 }}>{profile?.role}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ fontSize: 11.5 }}>Sign out</button>
        </div>
      </nav>

      {/* ── DASHBOARD ─────────────────────────────────────────────────────── */}
      <div className={`page${tab==='dashboard'?' active':''}`}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:700 }}>Good morning, Pritesh 👋</div>
            <div style={{ fontSize:13, color:'var(--muted)', marginTop:3 }}>
              {new Date().toLocaleDateString('en-GB',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={exportCSV}>⬇ Export All</button>
        </div>

        <div className="kpi-grid">
          <div className="kpi green"><div className="kpi-lbl">Quality Leads (70+)</div><div className="kpi-val">{qualityLeads.length}</div><div className="kpi-sub">Target: 5 per day</div></div>
          <div className="kpi blue"><div className="kpi-lbl">Total Leads</div><div className="kpi-val">{leads.length}</div><div className="kpi-sub">£900/mo · ~£{leads.length?Math.round(900/leads.length):12} CPL</div></div>
          <div className="kpi gold"><div className="kpi-lbl">Appointments Booked</div><div className="kpi-val">{bookedLeads.length}</div><div className="kpi-sub">Booking rate: {qualityLeads.length?Math.round(bookedLeads.length/qualityLeads.length*100):0}% of quality</div></div>
          <div className="kpi red"><div className="kpi-lbl">Invalid Phones</div><div className="kpi-val">{invalidLeads.length}</div><div className="kpi-sub">Flagged for review</div></div>
          <div className="kpi purple"><div className="kpi-lbl">Est. Pipeline Value</div><div className="kpi-val">{fmt(pipelineVal)}</div><div className="kpi-sub">Initial fees · active quality leads</div></div>
        </div>

        <div className="two-col">
          {/* Campaign perf */}
          <div className="card">
            <div className="card-head"><span className="card-title">📈 Campaign Performance</span></div>
            <div className="card-body">
              {[
                { k:'Retire at 57', col:'var(--accent)' },
                { k:'Combine Your Pension Pots', col:'var(--green)' },
                { k:'Your 12-Minute Guide', col:'var(--gold)' },
              ].map(c => {
                const cl = leads.filter(l => l.campaign === c.k)
                const cq = cl.filter(l => l.score >= 70).length
                const pct = cl.length ? Math.round(cq/cl.length*100) : 0
                return (
                  <div key={c.k} style={{ marginBottom:16 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:5 }}>
                      <span>{shortCamp(c.k)}</span>
                      <span style={{ color:'var(--muted)' }}>{cq}/{cl.length} quality <strong style={{ color:c.col }}>{pct}%</strong></span>
                    </div>
                    <div className="prog"><div className="prog-fill" style={{ width:`${pct}%`, background:c.col }} /></div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{cl.length} total leads</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quality breakdown */}
          <div className="card">
            <div className="card-head"><span className="card-title">🎯 Lead Quality Breakdown</span></div>
            <div className="card-body">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginBottom:14 }}>
                {[
                  { label:'Quality (70+)', val:qualityLeads.length, col:'var(--green)', bg:'rgba(16,185,129,.08)', br:'rgba(16,185,129,.22)' },
                  { label:'Moderate (40–69)', val:leads.filter(l=>l.score>=40&&l.score<70).length, col:'var(--amber)', bg:'rgba(245,158,11,.08)', br:'rgba(245,158,11,.22)' },
                  { label:'Below Criteria', val:leads.filter(l=>l.score<40).length, col:'var(--red)', bg:'rgba(239,68,68,.08)', br:'rgba(239,68,68,.22)' },
                  { label:'Invalid Phones', val:invalidLeads.length, col:'var(--muted)', bg:'rgba(148,163,184,.08)', br:'rgba(148,163,184,.18)' },
                ].map(item => (
                  <div key={item.label} style={{ background:item.bg, border:`1px solid ${item.br}`, borderRadius:8, padding:'12px 14px', textAlign:'center' }}>
                    <div style={{ fontSize:25, fontWeight:700, color:item.col }}>{item.val}</div>
                    <div style={{ fontSize:10.5, color:'var(--muted)', marginTop:3 }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>Quality rate: <strong style={{ color:'var(--green)' }}>{leads.length?Math.round(qualityLeads.length/leads.length*100):0}%</strong> of all leads meet criteria</div>
            </div>
          </div>
        </div>

        {/* Priority table */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">🔥 Priority Leads — Call Today</span>
            <button className="btn btn-primary btn-sm" onClick={() => setTab('caller')}>Open Caller View →</button>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Name</th><th>Score</th><th>Phone</th><th>Campaign</th><th>Pension</th><th>Role</th><th>Status</th><th>Est. Value</th><th>Update</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="empty">Loading leads...</td></tr>
                ) : qualityLeads.filter(l=>!['Cold','Meeting Booked','Invalid Phone'].includes(l.status)).slice(0,8).map(l => {
                  const t = ticket(l.pension)
                  return (
                    <tr key={l.id}>
                      <td><div style={{fontWeight:600}}>{l.first_name} {l.last_name}</div><div style={{fontSize:11,color:'var(--muted)'}}>{l.job_title??'—'}</div></td>
                      <td><span className={scClass(l.score)}>{l.score}</span></td>
                      <td><span style={{color:l.phone_valid?'var(--green)':'var(--red)',fontWeight:700,marginRight:4}}>{l.phone_valid?'✓':'⚠'}</span><span style={{fontSize:12}}>{l.phone}</span></td>
                      <td><span className="ctag">{shortCamp(l.campaign)}</span></td>
                      <td style={{fontSize:12}}>{PEN_LABEL[l.pension??'']??'—'}</td>
                      <td>{senTag(l.seniority)}</td>
                      <td><span className={pillClass(l.status)}>{l.status}</span></td>
                      <td style={{color:'var(--gold)',fontWeight:500,fontSize:12.5}}>{t?fmt(t.initial):'—'}</td>
                      <td>
                        <select className="ssel" value={l.status} onChange={e=>updateStatus(l.id,e.target.value)}>
                          {['New','Contacted','Qualified','Meeting Booked','Cold'].map(s=><option key={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  )
                })}
                {!loading && qualityLeads.filter(l=>!['Cold','Meeting Booked','Invalid Phone'].includes(l.status)).length===0 && (
                  <tr><td colSpan={9} className="empty">No priority leads yet — add leads using the Add Lead tab.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── ALL LEADS ─────────────────────────────────────────────────────── */}
      <div className={`page${tab==='leads'?' active':''}`}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{fontSize:20,fontWeight:700}}>All Leads</div>
            <div style={{fontSize:13,color:'var(--muted)',marginTop:3}}>{filtered.length} lead{filtered.length!==1?'s':''} shown</div>
          </div>
          <div style={{display:'flex',gap:9}}>
            <button className="btn btn-ghost btn-sm" onClick={exportCSV}>⬇ Export CSV</button>
            <button className="btn btn-primary btn-sm" onClick={()=>setTab('add')}>+ Add Lead</button>
          </div>
        </div>
        <div className="filter-bar">
          <input placeholder="🔍  Search name, phone, email..." value={search} onChange={e=>setSearch(e.target.value)} />
          <select value={fqual} onChange={e=>setFqual(e.target.value)}>
            <option value="">All Quality</option>
            <option value="high">High (70+)</option>
            <option value="mid">Mid (40–69)</option>
            <option value="low">Low (0–39)</option>
          </select>
          <select value={fcamp} onChange={e=>setFcamp(e.target.value)}>
            <option value="">All Campaigns</option>
            <option value="Retire at 57">Retire at 57</option>
            <option value="Combine Your Pension Pots">Combine Pension Pots</option>
            <option value="Your 12-Minute Guide">12-Minute Guide</option>
          </select>
          <select value={fstat} onChange={e=>setFstat(e.target.value)}>
            <option value="">All Statuses</option>
            {['New','Contacted','Qualified','Meeting Booked','Cold','Invalid Phone'].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="card" style={{padding:0}}>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Date</th><th>Name</th><th>Score</th><th>Phone</th><th>Campaign</th><th>Pension</th><th>Job Title</th><th>Adviser?</th><th>Status</th><th>Est. Init.</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={10} className="empty">Loading...</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={10} className="empty">No leads found. Try adjusting filters.</td></tr>
                : filtered.map(l => {
                  const t = ticket(l.pension)
                  return (
                    <tr key={l.id}>
                      <td style={{fontSize:11,color:'var(--muted)'}}>{l.date}</td>
                      <td><div style={{fontWeight:600}}>{l.first_name} {l.last_name}</div><div style={{fontSize:11,color:'var(--muted)'}}>{l.email??'—'}</div></td>
                      <td><span className={scClass(l.score)}>{l.score}</span></td>
                      <td><span style={{color:l.phone_valid?'var(--green)':'var(--red)',fontWeight:700,marginRight:3}}>{l.phone_valid?'✓':'⚠'}</span><span style={{fontSize:12}}>{l.phone}</span></td>
                      <td><span className="ctag" style={{fontSize:10}}>{shortCamp(l.campaign)}</span></td>
                      <td style={{fontSize:12}}>{PEN_LABEL[l.pension??'']??'—'}</td>
                      <td style={{fontSize:12,maxWidth:170,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{l.job_title??'—'}</td>
                      <td style={{fontSize:12,color:l.adviser==='No'?'var(--green)':l.adviser==='Yes'?'var(--red)':'var(--amber)'}}>{l.adviser??'—'}</td>
                      <td>
                        <select className="ssel" value={l.status} onChange={e=>updateStatus(l.id,e.target.value)}>
                          {['New','Contacted','Qualified','Meeting Booked','Cold','Invalid Phone'].map(s=><option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{color:'var(--gold)',fontSize:12.5,fontWeight:500}}>{t?fmt(t.initial):'—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── CALLER VIEW ───────────────────────────────────────────────────── */}
      <div className={`page${tab==='caller'?' active':''}`}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div>
            <div style={{fontSize:20,fontWeight:700}}>📞 Caller Dashboard</div>
            <div style={{fontSize:13,color:'var(--muted)',marginTop:3}}>Essential info only — highest score first. Call in order.</div>
          </div>
          <select className="ssel" style={{padding:'7px 10px',fontSize:12.5}} value={callerF} onChange={e=>setCallerF(e.target.value)}>
            <option value="all">All Leads to Call</option>
            <option value="priority">Priority Only (70+)</option>
            <option value="new">New Leads Only</option>
          </select>
        </div>
        <div className="caller-grid">
          {loading ? <div className="empty">Loading...</div>
          : callerLeads.length === 0 ? <div className="empty" style={{gridColumn:'1/-1'}}>No leads to call right now. 🎉</div>
          : callerLeads.map(l => {
            const sc = l.score
            const hi = sc >= 70
            const t = ticket(l.pension)
            const senIcon: Record<string,string> = {'CEO/MD':'👑','VP':'⭐','Director':'💼','Manager':'📋','Other':'👤'}
            return (
              <div key={l.id} className={`caller-card${hi?' priority':''}`}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                  <div>
                    <div className="c-name">{l.first_name} {l.last_name}</div>
                    <div className="c-title">{senIcon[l.seniority??'']??'👤'} {l.job_title ?? l.seniority ?? '—'}</div>
                  </div>
                  <span className={scClass(sc)}>{sc}</span>
                </div>
                <div className="c-phone" style={{color:l.phone_valid?'var(--gold)':'var(--red)'}}>
                  📞 {l.phone}
                  <span style={{fontSize:11,fontWeight:400,marginLeft:5,color:l.phone_valid?'var(--green)':'var(--red)'}}>{l.phone_valid?'✓ valid':'⚠ check'}</span>
                </div>
                <div className="c-info">
                  <div className="c-info-item"><div className="c-info-lbl">Pension Pot</div><div className="c-info-val" style={{color:'var(--green)'}}>{PEN_LABEL[l.pension??'']??'—'}</div></div>
                  <div className="c-info-item"><div className="c-info-lbl">Init. Fee Est.</div><div className="c-info-val" style={{color:'var(--gold)'}}>{t?fmt(t.initial):'—'}</div></div>
                  <div className="c-info-item"><div className="c-info-lbl">Age Range</div><div className="c-info-val">{l.age_range??'—'}</div></div>
                  <div className="c-info-item"><div className="c-info-lbl">Had Adviser?</div><div className="c-info-val" style={{color:l.adviser==='No'?'var(--green)':l.adviser==='Yes'?'var(--red)':'var(--amber)'}}>{l.adviser??'—'}</div></div>
                </div>
                <div style={{marginBottom:10}}><span className="ctag">{shortCamp(l.campaign)}</span></div>
                <div className="c-actions">
                  <button className="btn btn-green btn-sm" onClick={()=>updateStatus(l.id,'Contacted')}>✓ Connected</button>
                  <button className="btn btn-amber btn-sm" onClick={()=>updateStatus(l.id,'Contacted')}>📵 No Answer</button>
                  <button className="btn btn-primary btn-sm" onClick={()=>{updateStatus(l.id,'Meeting Booked');showNotif(`🎉 Meeting booked — ${l.first_name} ${l.last_name}!`)}}>📅 Book</button>
                  <button className="btn btn-red btn-sm" onClick={()=>updateStatus(l.id,'Invalid Phone')}>⚠ Bad #</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── ADD LEAD ──────────────────────────────────────────────────────── */}
      <div className={`page${tab==='add'?' active':''}`}>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:20,fontWeight:700}}>➕ Add New Lead</div>
          <div style={{fontSize:13,color:'var(--muted)',marginTop:3}}>Score and ticket value calculate live as you fill in details.</div>
        </div>
        <div className="two-col">
          {/* Form */}
          <div className="card">
            <div className="card-head"><span className="card-title">Lead Details</span></div>
            <div className="card-body">
              <div className="form-grid">
                <div className="fg"><label>First Name *</label><input value={form.first_name} onChange={e=>setForm(f=>({...f,first_name:e.target.value}))} placeholder="e.g. James" /></div>
                <div className="fg"><label>Last Name *</label><input value={form.last_name} onChange={e=>setForm(f=>({...f,last_name:e.target.value}))} placeholder="e.g. Harrison" /></div>
                <div className="fg"><label>Email</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="james.h@company.co.uk" /></div>
                <div className="fg">
                  <label>Phone Number (UK) *</label>
                  <input value={form.phone} onChange={e=>handlePhoneChange(e.target.value)} placeholder="07xxx xxxxxx"
                    style={{borderColor:phoneErr==='valid'?'var(--green)':phoneErr==='invalid'?'var(--red)':''}} />
                  {phoneErr==='valid' && <span className="hint valid-hint">✓ Valid UK number</span>}
                  {phoneErr==='invalid' && <span className="hint invalid-hint">✗ Invalid — check format</span>}
                </div>
                <div className="fg">
                  <label>LinkedIn Campaign</label>
                  <select value={form.campaign} onChange={e=>setForm(f=>({...f,campaign:e.target.value}))}>
                    <option value="">Select campaign...</option>
                    <option>Retire at 57</option><option>Combine Your Pension Pots</option><option>Your 12-Minute Guide</option>
                  </select>
                </div>
                <div className="fg"><label>Job Title</label><input value={form.job_title} onChange={e=>setForm(f=>({...f,job_title:e.target.value}))} placeholder="e.g. Chief Executive Officer" /></div>
                <div className="fg">
                  <label>Seniority Level *</label>
                  <select value={form.seniority} onChange={e=>setForm(f=>({...f,seniority:e.target.value}))}>
                    <option value="">Select...</option>
                    <option value="CEO/MD">CEO / Managing Director</option>
                    <option value="VP">VP / Vice President</option>
                    <option value="Director">Director</option>
                    <option value="Manager">Senior Manager / Head of</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="fg">
                  <label>Age Range *</label>
                  <select value={form.age_range} onChange={e=>setForm(f=>({...f,age_range:e.target.value}))}>
                    <option value="">Select...</option>
                    <option value="45-55">45–55</option><option value="55-65">55–65</option>
                    <option value="35-45">35–44</option><option value="65+">65+</option><option value="<35">Under 35</option>
                  </select>
                </div>
                <div className="fg full">
                  <label>Estimated Pension Pot *</label>
                  <select value={form.pension} onChange={e=>setForm(f=>({...f,pension:e.target.value}))}>
                    <option value="">Select pension size...</option>
                    <option value="500k+">£500,000 or more</option>
                    <option value="250-500k">£250,000 – £500,000</option>
                    <option value="100-250k">£100,000 – £250,000</option>
                    <option value="50-100k">£50,000 – £100,000</option>
                    <option value="<50k">Under £50,000</option>
                  </select>
                </div>
                <div className="fg full">
                  <label>Spoken to a financial adviser in last 12 months?</label>
                  <select value={form.adviser} onChange={e=>setForm(f=>({...f,adviser:e.target.value}))}>
                    <option value="">Select...</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes (⚠ possible SJP conflict)</option>
                    <option value="Unsure">Unsure</option>
                  </select>
                </div>
                <div className="fg full">
                  <label>Notes</label>
                  <textarea rows={3} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any additional context about this lead..." />
                </div>
              </div>
              <div style={{marginTop:18,display:'flex',gap:9}}>
                <button className="btn btn-primary" onClick={handleAddLead} disabled={saving}>{saving?'Saving...':'✓ Save Lead'}</button>
                <button className="btn btn-ghost" onClick={()=>setForm(EMPTY_FORM)}>Clear</button>
              </div>
            </div>
          </div>

          {/* Score + Ticket */}
          <div>
            <div className="card">
              <div className="card-head"><span className="card-title">🎯 Live Lead Score</span></div>
              <div className="card-body">
                <div className="score-panel">
                  <div className="score-big" style={{color:hasFormData?scColor(liveScore):'var(--muted)'}}>
                    {hasFormData ? `${liveScore}/100` : '—'}
                  </div>
                  <div className="score-tag">{hasFormData ? scLabel(liveScore) : 'Fill in details to see score'}</div>
                  <div className="score-track">
                    <div className="score-fill" style={{width:hasFormData?`${liveScore}%`:'0%',background:hasFormData?scColor(liveScore):'var(--muted)'}} />
                  </div>
                  {hasFormData && (
                    <div>
                      {[
                        {label:`Pension ${PEN_LABEL[form.pension]??'—'}`, pts:form.pension==='500k+'?40:form.pension==='250-500k'?30:form.pension==='100-250k'?10:0, max:40},
                        {label:`Seniority: ${form.seniority||'—'}`, pts:form.seniority==='CEO/MD'?30:form.seniority==='VP'?25:form.seniority==='Director'?22:form.seniority==='Manager'?10:0, max:30},
                        {label:`Age: ${form.age_range||'—'}`, pts:form.age_range==='45-55'?20:form.age_range==='55-65'?18:form.age_range==='35-45'?10:3, max:20},
                        {label:`Adviser: ${form.adviser||'—'}`, pts:form.adviser==='No'?10:form.adviser==='Unsure'?5:0, max:10},
                      ].map(row => (
                        <div key={row.label} className="score-row">
                          <span className="score-row-lbl">{row.label}</span>
                          <span style={{color:row.pts>=row.max?'var(--green)':row.pts>0?'var(--amber)':'var(--red)',fontWeight:600}}>{row.pts}/{row.max}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><span className="card-title">💰 Estimated Ticket Value</span></div>
              <div className="card-body">
                {form.pension && ticket(form.pension) ? (() => {
                  const t = ticket(form.pension)!
                  return (
                    <>
                      <div style={{fontSize:12,color:'var(--muted)',marginBottom:11}}>Based on mid-point of {PEN_LABEL[form.pension]} pension</div>
                      <div className="ticket-box">
                        <div className="t-row"><span>Initial advice fee (~4%)</span><span>{fmt(t.initial)}</span></div>
                        <div className="t-row"><span>Annual ongoing (~0.8%/yr)</span><span>{fmt(t.ongoing)}/yr</span></div>
                        <div className="t-row"><span>5-Year total value</span><span>{fmt(t.five)}</span></div>
                        <div className="t-row"><span>10-Year total value</span><span>{fmt(t.ten)}</span></div>
                      </div>
                      <div style={{fontSize:10.5,color:'var(--muted)',marginTop:8}}>* Estimates only. Subject to SJP fee structure and actual AUM.</div>
                    </>
                  )
                })() : <div className="empty" style={{padding:20}}>Select pension pot size to calculate</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STRATEGY ──────────────────────────────────────────────────────── */}
      <div className={`page${tab==='strategy'?' active':''}`}>
        <div style={{marginBottom:22}}>
          <div style={{fontSize:20,fontWeight:700}}>🎯 Strategy: 5 Quality Leads Per Day</div>
          <div style={{fontSize:13,color:'var(--muted)',marginTop:3}}>Your roadmap from ~6–7 quality leads/month to 100+/month</div>
        </div>
        <div className="two-col">
          <div>
            <div className="card">
              <div className="card-head"><span className="card-title">The Honest Gap</span></div>
              <div className="card-body">
                <p className="strat-p">At £900/month and ~£12 CPL you're generating ~75 leads/month. With broad targeting, your quality conversion rate is likely under <strong>8–10%</strong> — that's 6–7 quality leads per month against a target of 100.</p>
                <div className="warn-box"><strong>Current:</strong> ~6–7 quality leads/month<br/><strong>Goal:</strong> 5/day = ~100/month<br/><strong>Gap:</strong> ~15× improvement needed</div>
                <p className="strat-p" style={{marginTop:10}}>Two levers: tighten LinkedIn targeting (push quality rate to 50–60%) and scale budget to generate the right raw volume.</p>
              </div>
            </div>
            <div className="card">
              <div className="card-head"><span className="card-title">📌 LinkedIn Targeting Overhaul</span></div>
              <div className="card-body">
                <div className="strat-h3">🎯 Audience Settings</div>
                <ul style={{paddingLeft:18}}>
                  {[
                    '<strong>Job Seniority:</strong> Director, VP, C-Suite, Partner, Owner — enable all five',
                    '<strong>Job Titles:</strong> CEO, Managing Director, Finance Director, CFO, VP Finance, Commercial Director, Operations Director',
                    '<strong>Geography:</strong> United Kingdom only — exclude Republic of Ireland',
                    '<strong>Age:</strong> 45–60 (use "Member age" under Demographic targeting)',
                    '<strong>Company Size:</strong> 51–200, 201–500, 501–1,000, 1,001–5,000',
                  ].map((item,i) => <li key={i} className="strat-li" dangerouslySetInnerHTML={{__html:item}} />)}
                </ul>
                <div className="callout" style={{marginTop:10}}><strong>Do NOT target:</strong> Students, entry-level, recent graduates, or small company owners under 40.</div>
              </div>
            </div>
            <div className="card">
              <div className="card-head"><span className="card-title">💬 Pre-Qualification on the Lead Form</span></div>
              <div className="card-body">
                <p className="strat-p">Add these two questions to LinkedIn Lead Gen Forms <em>before</em> the guide downloads — they filter bad leads without any manual effort:</p>
                <ul style={{paddingLeft:18}}>
                  <li className="strat-li"><strong>Q1:</strong> "Approximate pension or investable assets?" — Under £50k / £50k–£100k / £100k–£250k / £250k–£500k / £500k+</li>
                  <li className="strat-li"><strong>Q2:</strong> "Current role level?" — Director / VP / CEO/MD / Senior Manager / Other</li>
                </ul>
                <div className="callout">Keep to 5 questions max on the form — Name, Email, Phone, Pension Band, Role Level. More = lower completion rate.</div>
              </div>
            </div>
          </div>
          <div>
            <div className="card">
              <div className="card-head"><span className="card-title">💷 Budget Model</span></div>
              <div className="card-body">
                <div className="ticket-box-strat">
                  {[
                    ['Improved targeting quality rate','~50–60%','var(--green)'],
                    ['Raw leads needed per month','~200',''],
                    ['Expected CPL (tighter targeting)','£18–£25',''],
                    ['Recommended monthly budget','£3,500–£5,000','var(--gold)'],
                  ].map(([l,v,c])=>(
                    <div key={l as string} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(59,130,246,.14)',fontSize:13}}>
                      <span>{l}</span><span style={{color:(c as string)||'var(--text)',fontWeight:600}}>{v}</span>
                    </div>
                  ))}
                </div>
                <div className="callout" style={{marginTop:12}}><strong>ROI check:</strong> A single £500k+ client generates ~£20,000 initial + £4,000/yr. At £4,000/month ad spend, one converted client per quarter breaks even — and 5 quality leads/day means multiple appointments per week.</div>
              </div>
            </div>
            <div className="card">
              <div className="card-head"><span className="card-title">⚡ Follow-Up Speed Fix</span></div>
              <div className="card-body">
                <p className="strat-p">Your 1–2 day follow-up is losing you leads. LinkedIn leads are hot for <strong>under 4 hours</strong>.</p>
                <ul style={{paddingLeft:18}}>
                  <li className="strat-li"><strong>Target:</strong> First call attempt within 2 hours of lead submission</li>
                  <li className="strat-li"><strong>Setup:</strong> Zapier → SMS/Slack alert to admin team the moment a lead lands</li>
                  <li className="strat-li"><strong>Call sequence:</strong> Day 0 (2hrs) → Day 1 (different time) → Day 3 → SMS Day 5 → Cold after Day 7</li>
                </ul>
              </div>
            </div>
            <div className="card">
              <div className="card-head"><span className="card-title">✅ 30-Day Action Plan</span></div>
              <div className="card-body">
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  {[
                    {n:1,col:'var(--accent)',txt:'<strong>Week 1:</strong> Overhaul LinkedIn targeting (seniority + job title + age + UK only). Add pension band and role level to Lead Gen Forms.'},
                    {n:2,col:'var(--green)',txt:'<strong>Week 2:</strong> Increase budget to £2,000 to test new targeting. Implement same-day callback SLA. Set up Zapier lead alert.'},
                    {n:3,col:'var(--amber)',txt:'<strong>Week 3:</strong> Review quality rate. If hitting 40%+ quality, scale to £3,500. Use this CRM to track scores in real-time.'},
                    {n:4,col:'var(--purple)',txt:'<strong>Week 4:</strong> Launch retargeting campaign. Test a 60-second video ad. Review full month — if quality CPL under £60, scale to £5,000/month.'},
                  ].map(step=>(
                    <div key={step.n} style={{display:'flex',gap:11,alignItems:'flex-start'}}>
                      <div style={{background:step.col,color:'#fff',borderRadius:'50%',width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0,marginTop:1}}>{step.n}</div>
                      <div style={{fontSize:13,color:'#c4d4ee',lineHeight:1.65}} dangerouslySetInnerHTML={{__html:step.txt}} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ADMIN: CALLERS ────────────────────────────────────────────────── */}
      {tab === 'callers_admin' && profile?.role === 'admin' && (
        <CallerManagement currentUser={profile} onNotif={showNotif} />
      )}

      {/* ── ADMIN: AUDIT LOG ──────────────────────────────────────────────── */}
      {tab === 'audit_admin' && profile?.role === 'admin' && (
        <AuditLogView />
      )}
    </>
  )
}
