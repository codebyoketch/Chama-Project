import { useState, useEffect } from 'react'
import api from '../services/api'

const C = {
  sacco:'#166534', saccoLt:'#f0fdf4', saccoBd:'#bbf7d0',
  tb:'#1e40af', tbLt:'#eff6ff', tbBd:'#bfdbfe',
  welfare:'#be185d', welfareLt:'#fdf2f8', welfareBd:'#fbcfe8',
  fines:'#b91c1c', finesLt:'#fef2f2',
  text:'#0f172a', muted:'#64748b', faint:'#94a3b8',
  border:'#e2e8f0', surface:'#f8fafc',
}
const mono = { fontFamily:"'DM Mono','Courier New',monospace" }
const sans = { fontFamily:"'Outfit','Segoe UI',sans-serif" }
const inp  = { width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:14, boxSizing:'border-box', color:C.text, background:'white' }
const lbl  = { fontSize:12, fontWeight:600, color:C.muted, display:'block', marginBottom:4 }

// ── Icons ─────────────────────────────────────────────────────────────────────
const Ic = {
  heart:<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  arrowUp:<svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
  arrowDown:<svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
}

// ── Member search ─────────────────────────────────────────────────────────────
function MemberSearch({ members, value, onChange, placeholder='Search member…' }) {
  const [search, setSearch] = useState('')
  const [open, setOpen]     = useState(false)
  const selected = members.find(m => m.ID === Number(value))
  const filtered = members.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.account_number?.includes(search) || m.phone?.includes(search)
  )
  return (
    <div style={{ position:'relative' }}>
      <div onClick={() => setOpen(!open)}
        style={{ padding:'9px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:14, cursor:'pointer', background:'white', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ color:selected?C.text:C.faint }}>{selected?`${selected.name} (${selected.account_number})`:placeholder}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.faint} strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:`1px solid ${C.border}`, borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:200, maxHeight:260, overflow:'hidden', display:'flex', flexDirection:'column', marginTop:4 }}>
          <input autoFocus placeholder="Search by name, account or phone…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding:'9px 12px', border:'none', borderBottom:`1px solid ${C.border}`, outline:'none', fontSize:13 }} />
          <div style={{ overflowY:'auto', maxHeight:200 }}>
            {filtered.map(m => (
              <div key={m.ID} onClick={() => { onChange(m.ID); setOpen(false); setSearch('') }}
                style={{ padding:'10px 12px', cursor:'pointer', fontSize:14, borderBottom:`1px solid ${C.surface}`, background:Number(value)===m.ID?C.saccoLt:'white' }}
                onMouseEnter={e => e.currentTarget.style.background=C.surface}
                onMouseLeave={e => e.currentTarget.style.background=Number(value)===m.ID?C.saccoLt:'white'}>
                <div style={{ fontWeight:500 }}>{m.name}</div>
                <div style={{ fontSize:12, color:C.faint, ...mono }}>{m.account_number} · {m.phone}</div>
              </div>
            ))}
            {filtered.length===0 && <div style={{ padding:16, color:C.faint, fontSize:14, textAlign:'center' }}>No members found</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function Modal({ show, onClose, title, subtitle, onSubmit, submitLabel='Save', submitColor, children, error }) {
  if (!show) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(2px)' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:18, padding:28, width:'100%', maxWidth:420, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h3 style={{ margin:0, fontSize:17, fontWeight:700, color:C.text }}>{title}</h3>
            {subtitle && <p style={{ margin:'3px 0 0', fontSize:12, color:C.muted }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background:C.surface, border:`1px solid ${C.border}`, width:32, height:32, borderRadius:8, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', color:C.muted, flexShrink:0 }}>✕</button>
        </div>
        {error && <div style={{ background:C.finesLt, border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', color:C.fines, fontSize:14, marginBottom:16 }}>{error}</div>}
        <div style={{ display:'grid', gap:14 }}>
          {children}
          <button onClick={onSubmit}
            style={{ padding:11, background:submitColor||C.sacco, color:'white', border:'none', borderRadius:10, fontWeight:600, cursor:'pointer', fontSize:15 }}>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Welfare() {
  const [data, setData]     = useState({ contributions:[], disbursements:[], total_in:0, total_out:0, balance:0 })
  const [members, setMembers] = useState([])
  const [tab, setTab]       = useState('overview')
  const [showContrib, setShowContrib]   = useState(false)
  const [showDisburse, setShowDisburse] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const [cForm, setCForm] = useState({ user_id:'', amount:'', period:'', notes:'' })
  const [dForm, setDForm] = useState({ user_id:'', amount:'', reason:'', notes:'' })

  useEffect(() => {
    fetchData()
    api.get('/members').then(r => setMembers(r.data.members || []))
  }, [])

  const fetchData = async () => {
    try { const res = await api.get('/welfare'); setData(res.data) }
    finally { setLoading(false) }
  }

  const handleContrib = async () => {
    setError('')
    if (!cForm.user_id || !cForm.amount) return setError('Member and amount are required')
    try {
      await api.post('/welfare/contribution', { ...cForm, user_id:Number(cForm.user_id), amount:Number(cForm.amount) })
      setShowContrib(false); setCForm({ user_id:'', amount:'', period:'', notes:'' }); fetchData()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const handleDisburse = async () => {
    setError('')
    if (!dForm.user_id || !dForm.amount || !dForm.reason) return setError('Member, amount and reason are required')
    try {
      await api.post('/welfare/disbursement', { ...dForm, user_id:Number(dForm.user_id), amount:Number(dForm.amount) })
      setShowDisburse(false); setDForm({ user_id:'', amount:'', reason:'', notes:'' }); fetchData()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const allActivity = [...data.contributions.map(c => ({ ...c, _t:'in' })), ...data.disbursements.map(d => ({ ...d, _t:'out' }))]
    .sort((a,b) => new Date(b.CreatedAt) - new Date(a.CreatedAt))

  return (
    <div style={{ ...sans }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:C.welfare, display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>{Ic.heart}</div>
          <div>
            <h2 style={{ margin:0, fontSize:22, fontWeight:700, color:C.text }}>Welfare Fund</h2>
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => { setError(''); setShowDisburse(true) }}
            style={{ padding:'9px 16px', background:'white', color:C.fines, border:`1px solid ${C.border}`, borderRadius:10, fontWeight:600, cursor:'pointer', fontSize:13, boxShadow:'0 1px 2px rgba(0,0,0,0.05)' }}>
            Disburse
          </button>
          <button onClick={() => { setError(''); setShowContrib(true) }}
            style={{ padding:'9px 16px', background:C.welfare, color:'white', border:'none', borderRadius:10, fontWeight:600, cursor:'pointer', fontSize:13, boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}>
            + Contribution
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:14, marginBottom:24 }}>
        {[
          ['Fund Balance', data.balance,   '#16a34a', C.saccoLt, C.saccoBd],
          ['Total In',     data.total_in,  C.tb,      C.tbLt,    C.tbBd   ],
          ['Total Out',    data.total_out, C.fines,   C.finesLt, '#fecaca'],
        ].map(([l,v,c,bg,bd]) => (
          <div key={l} style={{ background:'white', borderRadius:12, padding:18, textAlign:'center', border:`1px solid ${bd}` }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:4, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{l}</div>
            <div style={{ fontSize:20, fontWeight:700, color:c, ...mono }}>KES {Number(v||0).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:C.surface, padding:4, borderRadius:12, border:`1px solid ${C.border}`, width:'fit-content' }}>
        {[['overview','Overview'],['contributions','Contributions'],['disbursements','Disbursements']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'7px 18px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13,
              fontWeight:tab===t?600:400, background:tab===t?'white':'transparent',
              color:tab===t?C.text:C.muted,
              boxShadow:tab===t?'0 1px 3px rgba(0,0,0,0.1)':'none', transition:'all 0.15s' }}>
            {l}
            {t==='contributions' && <span style={{ marginLeft:5, fontSize:11, ...mono, color:C.faint }}>({data.contributions.length})</span>}
            {t==='disbursements' && <span style={{ marginLeft:5, fontSize:11, ...mono, color:C.faint }}>({data.disbursements.length})</span>}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color:C.faint, padding:32, textAlign:'center' }}>Loading…</p> : (
        <div style={{ background:'white', borderRadius:14, overflow:'hidden', border:`1px solid ${C.border}`, boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>

          {/* Overview */}
          {tab==='overview' && (
            <>
              <div style={{ padding:'12px 20px', borderBottom:`1px solid ${C.border}`, fontSize:12, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                Recent Activity
              </div>
              {allActivity.slice(0,15).length===0
                ? <p style={{ padding:48, textAlign:'center', color:C.faint }}>No activity yet.</p>
                : allActivity.slice(0,15).map(item => (
                  <div key={`${item._t}-${item.ID}`} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 20px', borderBottom:`1px solid ${C.surface}`, transition:'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background=C.surface}
                    onMouseLeave={e => e.currentTarget.style.background='white'}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:30, height:30, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
                        background:item._t==='in'?C.saccoLt:C.finesLt,
                        color:item._t==='in'?'#16a34a':C.fines }}>
                        {item._t==='in' ? Ic.arrowUp : Ic.arrowDown}
                      </div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:500, color:C.text }}>{item.user?.name}</div>
                        <div style={{ fontSize:12, color:C.faint }}>{item._t==='out' ? item.reason : item.period||'Welfare contribution'}</div>
                      </div>
                    </div>
                    <span style={{ fontWeight:700, color:item._t==='in'?'#16a34a':C.fines, ...mono, fontSize:14 }}>
                      {item._t==='in'?'+':'−'}KES {item.amount?.toLocaleString()}
                    </span>
                  </div>
                ))}
            </>
          )}

          {/* Contributions */}
          {tab==='contributions' && (
            data.contributions.length===0
              ? <p style={{ textAlign:'center', padding:48, color:C.faint }}>No contributions yet.</p>
              : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:C.surface, borderBottom:`2px solid ${C.border}` }}>
                      {['Member','Period','Amount','Recorded By'].map(h => (
                        <th key={h} style={{ padding:'12px 20px', textAlign:'left', fontSize:11, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.contributions.map(c => (
                      <tr key={c.ID} style={{ borderBottom:`1px solid ${C.border}`, transition:'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background=C.surface}
                        onMouseLeave={e => e.currentTarget.style.background='white'}>
                        <td style={{ padding:'12px 20px' }}>
                          <div style={{ fontWeight:500, fontSize:14, color:C.text }}>{c.user?.name}</div>
                          <div style={{ fontSize:12, color:C.faint, ...mono }}>{c.user?.account_number}</div>
                        </td>
                        <td style={{ padding:'12px 20px', fontSize:13, color:C.muted }}>{c.period||'—'}</td>
                        <td style={{ padding:'12px 20px', fontWeight:700, color:'#16a34a', ...mono }}>+KES {c.amount?.toLocaleString()}</td>
                        <td style={{ padding:'12px 20px', fontSize:13, color:C.muted }}>{c.recorded_by_name||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          )}

          {/* Disbursements */}
          {tab==='disbursements' && (
            data.disbursements.length===0
              ? <p style={{ textAlign:'center', padding:48, color:C.faint }}>No disbursements yet.</p>
              : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:C.surface, borderBottom:`2px solid ${C.border}` }}>
                      {['Beneficiary','Amount','Reason','Approved By'].map(h => (
                        <th key={h} style={{ padding:'12px 20px', textAlign:'left', fontSize:11, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.disbursements.map(d => (
                      <tr key={d.ID} style={{ borderBottom:`1px solid ${C.border}`, transition:'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background=C.surface}
                        onMouseLeave={e => e.currentTarget.style.background='white'}>
                        <td style={{ padding:'12px 20px' }}>
                          <div style={{ fontWeight:500, fontSize:14, color:C.text }}>{d.user?.name}</div>
                          <div style={{ fontSize:12, color:C.faint, ...mono }}>{d.user?.account_number}</div>
                        </td>
                        <td style={{ padding:'12px 20px', fontWeight:700, color:C.fines, ...mono }}>−KES {d.amount?.toLocaleString()}</td>
                        <td style={{ padding:'12px 20px', fontSize:13, color:C.muted }}>{d.reason||'—'}</td>
                        <td style={{ padding:'12px 20px', fontSize:13, color:C.muted }}>{d.approved_by_name||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          )}
        </div>
      )}

      {/* Contribution Modal */}
      <Modal show={showContrib} onClose={() => setShowContrib(false)}
        title="Record Welfare Contribution" subtitle="Add a member's welfare payment"
        onSubmit={handleContrib} submitLabel="Record Contribution" submitColor={C.welfare} error={error}>
        <div>
          <label style={lbl}>Member *</label>
          <MemberSearch members={members} value={cForm.user_id} onChange={v => setCForm(f => ({ ...f, user_id:v }))} />
        </div>
        <div>
          <label style={lbl}>Amount (KES) *</label>
          <input style={inp} type="number" placeholder="500" value={cForm.amount} onChange={e => setCForm(f => ({ ...f, amount:e.target.value }))} />
        </div>
        <div>
          <label style={lbl}>Period</label>
          <input style={inp} type="month" value={cForm.period} onChange={e => setCForm(f => ({ ...f, period:e.target.value }))} />
        </div>
        <div>
          <label style={lbl}>Notes</label>
          <input style={inp} placeholder="Optional" value={cForm.notes} onChange={e => setCForm(f => ({ ...f, notes:e.target.value }))} />
        </div>
      </Modal>

      {/* Disbursement Modal */}
      <Modal show={showDisburse} onClose={() => setShowDisburse(false)}
        title="Record Disbursement" subtitle="Disburse welfare funds to a beneficiary"
        onSubmit={handleDisburse} submitLabel="Record Disbursement" submitColor={C.fines} error={error}>
        <div>
          <label style={lbl}>Beneficiary *</label>
          <MemberSearch members={members} value={dForm.user_id} onChange={v => setDForm(f => ({ ...f, user_id:v }))} placeholder="Search beneficiary…" />
        </div>
        <div>
          <label style={lbl}>Amount (KES) *</label>
          <input style={inp} type="number" placeholder="5000" value={dForm.amount} onChange={e => setDForm(f => ({ ...f, amount:e.target.value }))} />
        </div>
        <div>
          <label style={lbl}>Reason *</label>
          <input style={inp} placeholder="e.g. Medical emergency" value={dForm.reason} onChange={e => setDForm(f => ({ ...f, reason:e.target.value }))} />
        </div>
        <div>
          <label style={lbl}>Notes</label>
          <input style={inp} placeholder="Optional" value={dForm.notes} onChange={e => setDForm(f => ({ ...f, notes:e.target.value }))} />
        </div>
      </Modal>
    </div>
  )
}