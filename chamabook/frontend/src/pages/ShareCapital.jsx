import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const C = {
  sacco:'#166534', saccoLt:'#f0fdf4', saccoBd:'#bbf7d0',
  shares:'#6d28d9', sharesLt:'#f5f3ff', sharesBd:'#ede9fe',
  fines:'#b91c1c', finesLt:'#fef2f2',
  loans:'#b45309', loansLt:'#fffbeb',
  text:'#0f172a', muted:'#64748b', faint:'#94a3b8',
  border:'#e2e8f0', surface:'#f8fafc',
}
const mono = { fontFamily:"'DM Mono','Courier New',monospace" }
const sans = { fontFamily:"'Outfit','Segoe UI',sans-serif" }
const inp  = { width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:14, boxSizing:'border-box', color:C.text, background:'white' }
const lbl  = { fontSize:12, fontWeight:600, color:C.muted, display:'block', marginBottom:4 }

const STATUS = {
  paid:    { bg:C.saccoLt,  color:'#16a34a', label:'Fully Paid'   },
  partial: { bg:'#eff6ff',  color:'#1d4ed8', label:'Partial'      },
  pending: { bg:'#fef3c7',  color:'#d97706', label:'Pending'      },
  overdue: { bg:C.finesLt,  color:C.fines,   label:'Overdue'      },
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const Ic = {
  trend:<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  search:<svg width="14" height="14" fill="none" stroke={C.faint} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
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
const Modal = ({ onClose, title, subtitle, children, maxWidth=440 }) => (
  <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(2px)' }}
    onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:18, padding:28, width:'100%', maxWidth, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.25)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h3 style={{ margin:0, fontSize:17, fontWeight:700, color:C.text }}>{title}</h3>
          {subtitle && <p style={{ margin:'3px 0 0', fontSize:12, color:C.muted }}>{subtitle}</p>}
        </div>
        <button onClick={onClose} style={{ background:C.surface, border:`1px solid ${C.border}`, width:32, height:32, borderRadius:8, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', color:C.muted, flexShrink:0 }}>✕</button>
      </div>
      {children}
    </div>
  </div>
)

export default function ShareCapital() {
  const { isTreasurerOrAbove } = useAuth()
  const [data, setData]       = useState({ records:[], summaries:[], withdrawals:[], grand_total:0, total_paid_in:0, total_withdrawn:0, net_total:0, pending_amount:0 })
  const [members, setMembers] = useState([])
  const [tab, setTab]         = useState('summary')
  const [showAdd, setShowAdd]           = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showPay, setShowPay]           = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [form, setForm]   = useState({ user_id:'', shares:'', share_price:'', initial_payment:'', type:'purchase', notes:'' })
  const [wForm, setWForm] = useState({ user_id:'', shares:'', amount_per_share:'', reason:'', notes:'' })

  useEffect(() => {
    fetchData()
    api.get('/members').then(r => setMembers(r.data.members || []))
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try { const res = await api.get('/sharecapital'); setData(res.data) }
    finally { setLoading(false) }
  }

  const handleAdd = async () => {
    setError('')
    if (!form.user_id || !form.shares || !form.share_price) return setError('Member, shares and share price are required')
    try {
      await api.post('/sharecapital', { user_id:Number(form.user_id), shares:Number(form.shares), share_price:Number(form.share_price), initial_payment:Number(form.initial_payment)||0, type:form.type, notes:form.notes })
      setShowAdd(false); setForm({ user_id:'', shares:'', share_price:'', initial_payment:'', type:'purchase', notes:'' }); fetchData()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const handlePayInstallment = async () => {
    setError('')
    if (!payAmount || Number(payAmount)<=0) return setError('Please enter a valid amount')
    try {
      await api.post(`/sharecapital/${showPay.ID}/pay`, { amount:Number(payAmount) })
      setShowPay(null); setPayAmount(''); fetchData()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const handleWithdraw = async () => {
    setError('')
    if (!wForm.user_id || !wForm.shares || !wForm.amount_per_share) return setError('Member, shares and amount per share are required')
    try {
      await api.post('/sharecapital/withdraw', { user_id:Number(wForm.user_id), shares:Number(wForm.shares), amount_per_share:Number(wForm.amount_per_share), reason:wForm.reason, notes:wForm.notes })
      setShowWithdraw(false); setWForm({ user_id:'', shares:'', amount_per_share:'', reason:'', notes:'' }); fetchData()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const totalAmount    = Number(form.shares||0) * Number(form.share_price||0)
  const initialPayment = Number(form.initial_payment||0)
  const balanceDue     = totalAmount - initialPayment

  return (
    <div style={{ ...sans }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:C.shares, display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>{Ic.trend}</div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:700, color:C.text }}>Share Capital</h2>
        </div>
        {isTreasurerOrAbove && (
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => { setError(''); setShowWithdraw(true) }}
              style={{ padding:'9px 16px', background:'white', color:C.fines, border:`1px solid ${C.border}`, borderRadius:10, fontWeight:600, cursor:'pointer', fontSize:13 }}>
              Withdraw
            </button>
            <button onClick={() => { setError(''); setShowAdd(true) }}
              style={{ padding:'9px 20px', background:C.shares, color:'white', border:'none', borderRadius:10, fontWeight:600, cursor:'pointer', fontSize:14, boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}>
              + Add Shares
            </button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px,1fr))', gap:14, marginBottom:24 }}>
        {[
          ['Total Committed', data.grand_total,    C.shares, C.sharesBd],
          ['Total Paid In',   data.total_paid_in,  '#16a34a', C.saccoBd],
          ['Pending Payment', data.pending_amount,  '#d97706', '#fde68a'],
          ['Net Capital',     data.net_total,       '#1e40af', '#bfdbfe'],
        ].map(([l,v,c,bd]) => (
          <div key={l} style={{ background:'white', borderRadius:12, padding:18, textAlign:'center', border:`1px solid ${bd}` }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:4, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{l}</div>
            <div style={{ fontSize:18, fontWeight:700, color:c, ...mono }}>KES {Number(v||0).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:C.surface, padding:4, borderRadius:12, border:`1px solid ${C.border}`, width:'fit-content' }}>
        {[['summary','Per Member'],['records','All Records'],['withdrawals','Withdrawals']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'7px 18px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13,
              fontWeight:tab===t?600:400, background:tab===t?'white':'transparent',
              color:tab===t?C.text:C.muted,
              boxShadow:tab===t?'0 1px 3px rgba(0,0,0,0.1)':'none', transition:'all 0.15s' }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color:C.faint, padding:32, textAlign:'center' }}>Loading…</p> : (
        <div style={{ background:'white', borderRadius:14, overflow:'hidden', border:`1px solid ${C.border}`, boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>

          {/* Per Member Summary */}
          {tab==='summary' && (
            !(data.summaries||[]).length
              ? <p style={{ padding:48, textAlign:'center', color:C.faint }}>No share capital records yet.</p>
              : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:C.surface, borderBottom:`2px solid ${C.border}` }}>
                      {['Member','Shares','Net Shares','Net Value','Payment Status'].map(h => (
                        <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.summaries||[]).map(s => (
                      <tr key={s.user_id} style={{ borderBottom:`1px solid ${C.border}`, transition:'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background=C.surface}
                        onMouseLeave={e => e.currentTarget.style.background='white'}>
                        <td style={{ padding:'12px 16px', fontWeight:500, fontSize:14, color:C.text }}>{s.user_name}</td>
                        <td style={{ padding:'12px 16px', fontSize:14, ...mono }}>{s.total_shares}</td>
                        <td style={{ padding:'12px 16px' }}>
                          <span style={{ background:s.net_shares>0?C.sharesLt:C.surface, color:s.net_shares>0?C.shares:C.faint, padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>
                            {s.net_shares} shares
                          </span>
                        </td>
                        <td style={{ padding:'12px 16px', fontWeight:700, color:C.shares, ...mono }}>KES {Number(s.net_amount||0).toLocaleString()}</td>
                        <td style={{ padding:'12px 16px' }}>
                          {s.has_pending
                            ? <span style={{ fontSize:12, padding:'3px 10px', borderRadius:20, background:'#fef3c7', color:'#d97706', fontWeight:600 }}>Has pending payments</span>
                            : <span style={{ fontSize:12, padding:'3px 10px', borderRadius:20, background:C.saccoLt, color:'#16a34a', fontWeight:600 }}>All paid</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          )}

          {/* All Records */}
          {tab==='records' && (
            !(data.records||[]).length
              ? <p style={{ padding:48, textAlign:'center', color:C.faint }}>No records yet.</p>
              : (data.records||[]).map(r => {
                const progress  = r.amount>0 ? Math.min((r.amount_paid/r.amount)*100,100) : 0
                const balance   = r.amount - r.amount_paid
                const st        = STATUS[r.payment_status] || STATUS.pending
                const deadline  = new Date(r.installment_deadline)
                const daysLeft  = Math.max(0, Math.ceil((deadline-Date.now())/(1000*60*60*24)))
                return (
                  <div key={r.ID} style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:12 }}>
                      <div>
                        <div style={{ fontWeight:600, fontSize:14, color:C.text }}>{r.user?.name}</div>
                        <div style={{ fontSize:12, color:C.faint, marginTop:2, ...mono }}>
                          {r.user?.account_number} · {r.shares} shares @ KES {Number(r.share_price).toLocaleString()} · {new Date(r.CreatedAt).toLocaleDateString('en-KE')}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:st.bg, color:st.color, fontWeight:600 }}>{st.label}</span>
                        {isTreasurerOrAbove && r.payment_status!=='paid' && (
                          <button onClick={() => { setError(''); setPayAmount(''); setShowPay(r) }}
                            style={{ padding:'5px 12px', background:C.sharesLt, color:C.shares, border:`1px solid ${C.sharesBd}`, borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600 }}>
                            + Pay Installment
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:10 }}>
                      {[
                        ['Total Due',  `KES ${Number(r.amount).toLocaleString()}`,       C.text,    C.surface],
                        ['Paid',       `KES ${Number(r.amount_paid).toLocaleString()}`,   '#16a34a', C.saccoLt],
                        ['Balance',    balance>0?`KES ${Number(balance).toLocaleString()}`:'Cleared', balance>0?'#d97706':'#16a34a', balance>0?'#fef3c7':C.saccoLt],
                      ].map(([label,val,c,bg]) => (
                        <div key={label} style={{ background:bg, borderRadius:8, padding:'8px 12px', border:`1px solid ${C.border}` }}>
                          <div style={{ fontSize:11, color:C.faint }}>{label}</div>
                          <div style={{ fontSize:13, fontWeight:700, color:c, ...mono }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ height:6, background:C.border, borderRadius:3, overflow:'hidden', marginBottom:5 }}>
                      <div style={{ height:'100%', width:`${progress}%`, borderRadius:3, transition:'width 0.5s',
                        background:r.payment_status==='overdue'?C.fines:r.payment_status==='paid'?'#16a34a':C.shares }} />
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:C.faint }}>
                      <span>{Math.round(progress)}% paid</span>
                      {r.payment_status!=='paid' && (
                        <span style={{ color:r.payment_status==='overdue'?C.fines:C.muted }}>
                          Deadline: {deadline.toLocaleDateString('en-KE')}
                          {r.payment_status!=='overdue' && daysLeft>0 && ` · ${daysLeft} days left`}
                          {r.payment_status==='overdue' && ' · OVERDUE'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
          )}

          {/* Withdrawals */}
          {tab==='withdrawals' && (
            !(data.withdrawals||[]).length
              ? <p style={{ padding:48, textAlign:'center', color:C.faint }}>No withdrawals recorded.</p>
              : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:C.surface, borderBottom:`2px solid ${C.border}` }}>
                      {['Member','Shares','Per Share','Total Paid Out','Reason','Approved By','Date'].map(h => (
                        <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.withdrawals||[]).map(w => (
                      <tr key={w.ID} style={{ borderBottom:`1px solid ${C.border}`, transition:'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background=C.surface}
                        onMouseLeave={e => e.currentTarget.style.background='white'}>
                        <td style={{ padding:'12px 16px' }}>
                          <div style={{ fontWeight:500, fontSize:14, color:C.text }}>{w.user?.name}</div>
                          <div style={{ fontSize:12, color:C.faint, ...mono }}>{w.user?.account_number}</div>
                        </td>
                        <td style={{ padding:'12px 16px', fontSize:14, ...mono }}>{w.shares}</td>
                        <td style={{ padding:'12px 16px', fontSize:13, color:C.muted, ...mono }}>KES {Number(w.amount_per_share).toLocaleString()}</td>
                        <td style={{ padding:'12px 16px', fontWeight:700, color:C.fines, ...mono }}>KES {Number(w.total_amount).toLocaleString()}</td>
                        <td style={{ padding:'12px 16px', fontSize:13, color:C.muted }}>{w.reason||'—'}</td>
                        <td style={{ padding:'12px 16px', fontSize:13, color:C.muted }}>{w.approved_by_name||'—'}</td>
                        <td style={{ padding:'12px 16px', fontSize:12, color:C.faint }}>{new Date(w.CreatedAt).toLocaleDateString('en-KE')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          )}
        </div>
      )}

      {/* Add Shares Modal */}
      {showAdd && (
        <Modal onClose={() => setShowAdd(false)} title="Add Share Capital" subtitle="Record a new share purchase or top-up">
          {error && <div style={{ background:C.finesLt, border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', color:C.fines, fontSize:14, marginBottom:16 }}>{error}</div>}
          <div style={{ display:'grid', gap:14 }}>
            <div>
              <label style={lbl}>Member *</label>
              <MemberSearch members={members} value={form.user_id} onChange={v => setForm(f => ({ ...f, user_id:v }))} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><label style={lbl}>Number of Shares *</label><input style={inp} type="number" placeholder="e.g. 10" value={form.shares} onChange={e => setForm(f => ({ ...f, shares:e.target.value }))} /></div>
              <div><label style={lbl}>Price per Share (KES) *</label><input style={inp} type="number" placeholder="e.g. 500" value={form.share_price} onChange={e => setForm(f => ({ ...f, share_price:e.target.value }))} /></div>
            </div>

            {totalAmount > 0 && (
              <>
                <div style={{ background:C.sharesLt, borderRadius:8, padding:'10px 14px', fontSize:14, fontWeight:700, color:C.shares, border:`1px solid ${C.sharesBd}`, ...mono }}>
                  Total: KES {totalAmount.toLocaleString()}
                </div>
                <div>
                  <label style={lbl}>Initial Payment (KES)</label>
                  <input style={inp} type="number" placeholder={`Up to KES ${totalAmount.toLocaleString()} — leave blank to pay later`}
                    value={form.initial_payment} onChange={e => setForm(f => ({ ...f, initial_payment:e.target.value }))} />
                  <div style={{ fontSize:11, color:C.faint, marginTop:4 }}>Leave blank or partial — balance payable in installments within 3 months.</div>
                </div>
                {totalAmount > 0 && (
                  <div style={{ background:balanceDue>0?'#fef3c7':C.saccoLt, border:`1px solid ${balanceDue>0?'#fbbf24':C.saccoBd}`, borderRadius:10, padding:'12px 14px', fontSize:13 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                      {[
                        ['Paying now',   `KES ${initialPayment.toLocaleString()}`,  '#16a34a'],
                        ['Balance due',  `KES ${balanceDue.toLocaleString()}`,       balanceDue>0?'#d97706':'#16a34a'],
                        ['Deadline',     new Date(Date.now()+90*24*60*60*1000).toLocaleDateString('en-KE'), C.text],
                      ].map(([label,val,c]) => (
                        <div key={label}>
                          <div style={{ color:C.muted, marginBottom:2, fontSize:11 }}>{label}</div>
                          <div style={{ fontWeight:700, color:c, ...mono }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label style={lbl}>Type</label>
              <select style={inp} value={form.type} onChange={e => setForm(f => ({ ...f, type:e.target.value }))}>
                <option value="purchase">Purchase (new shares)</option>
                <option value="topup">Top-up (additional shares)</option>
              </select>
            </div>
            <div><label style={lbl}>Notes</label><input style={inp} placeholder="Optional" value={form.notes} onChange={e => setForm(f => ({ ...f, notes:e.target.value }))} /></div>
            <button onClick={handleAdd} style={{ padding:11, background:C.shares, color:'white', border:'none', borderRadius:10, fontWeight:600, cursor:'pointer', fontSize:15 }}>
              Record Share Capital
            </button>
          </div>
        </Modal>
      )}

      {/* Pay Installment Modal */}
      {showPay && (
        <Modal onClose={() => setShowPay(null)} title="Pay Share Installment" subtitle={showPay.user?.name} maxWidth={400}>
          <div style={{ background:C.surface, borderRadius:10, padding:'12px 14px', marginBottom:16, fontSize:13, border:`1px solid ${C.border}` }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, color:C.muted }}>
              <span>Shares: <strong style={{ color:C.text, ...mono }}>{showPay.shares} × KES {Number(showPay.share_price).toLocaleString()}</strong></span>
              <span>Total: <strong style={{ color:C.text, ...mono }}>KES {Number(showPay.amount).toLocaleString()}</strong></span>
              <span>Paid: <strong style={{ color:'#16a34a', ...mono }}>KES {Number(showPay.amount_paid).toLocaleString()}</strong></span>
              <span>Balance: <strong style={{ color:'#d97706', ...mono }}>KES {Number(showPay.amount-showPay.amount_paid).toLocaleString()}</strong></span>
            </div>
            <div style={{ height:5, background:C.border, borderRadius:3, overflow:'hidden', marginTop:10 }}>
              <div style={{ height:'100%', width:`${(showPay.amount_paid/showPay.amount)*100}%`, background:C.shares, borderRadius:3 }} />
            </div>
            <div style={{ fontSize:11, color:C.faint, marginTop:3, ...mono }}>
              {Math.round((showPay.amount_paid/showPay.amount)*100)}% paid · Deadline: {new Date(showPay.installment_deadline).toLocaleDateString('en-KE')}
            </div>
          </div>
          {error && <div style={{ background:C.finesLt, border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', color:C.fines, fontSize:14, marginBottom:16 }}>{error}</div>}
          <div style={{ display:'grid', gap:14 }}>
            <div>
              <label style={lbl}>Amount to Pay (KES) *</label>
              <input style={inp} type="number" placeholder={`Up to KES ${Number(showPay.amount-showPay.amount_paid).toLocaleString()}`}
                value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              {payAmount && Number(payAmount)>0 && (
                <div style={{ fontSize:12, color:C.muted, marginTop:4, ...mono }}>
                  Remaining after payment: KES {Math.max(0, showPay.amount-showPay.amount_paid-Number(payAmount)).toLocaleString()}
                </div>
              )}
            </div>
            <button onClick={handlePayInstallment} style={{ padding:11, background:C.shares, color:'white', border:'none', borderRadius:10, fontWeight:600, cursor:'pointer', fontSize:15 }}>Record Payment</button>
          </div>
        </Modal>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <Modal onClose={() => setShowWithdraw(false)} title="Share Withdrawal" subtitle="Only fully paid shares can be withdrawn">
          <div style={{ background:'#fef3c7', border:'1px solid #fbbf24', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#92400e', marginBottom:14 }}>
            Only fully paid shares are eligible for withdrawal.
          </div>
          {error && <div style={{ background:C.finesLt, border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', color:C.fines, fontSize:14, marginBottom:16 }}>{error}</div>}
          <div style={{ display:'grid', gap:14 }}>
            <div><label style={lbl}>Member *</label><MemberSearch members={members} value={wForm.user_id} onChange={v => setWForm(f => ({ ...f, user_id:v }))} placeholder="Search member to withdraw…" /></div>
            <div><label style={lbl}>Shares to Withdraw *</label><input style={inp} type="number" placeholder="e.g. 5" value={wForm.shares} onChange={e => setWForm(f => ({ ...f, shares:e.target.value }))} /></div>
            <div><label style={lbl}>Payout per Share (KES) *</label><input style={inp} type="number" placeholder="e.g. 500" value={wForm.amount_per_share} onChange={e => setWForm(f => ({ ...f, amount_per_share:e.target.value }))} /></div>
            {wForm.shares && wForm.amount_per_share && (
              <div style={{ background:C.finesLt, borderRadius:8, padding:'10px 14px', fontSize:14, fontWeight:700, color:C.fines, border:'1px solid #fecaca', ...mono }}>
                Total Payout: KES {(Number(wForm.shares)*Number(wForm.amount_per_share)).toLocaleString()}
              </div>
            )}
            {wForm.user_id && (
              <div style={{ background:C.surface, borderRadius:8, padding:'10px 14px', fontSize:13, color:C.muted, border:`1px solid ${C.border}` }}>
                Fully paid shares available: <strong style={{ color:C.shares }}>
                  {(() => { const s=(data.summaries||[]).find(x=>x.user_id===Number(wForm.user_id)); return s?`${s.net_shares} shares`:'—' })()}
                </strong>
              </div>
            )}
            <div><label style={lbl}>Reason</label><input style={inp} placeholder="e.g. Member exiting group" value={wForm.reason} onChange={e => setWForm(f => ({ ...f, reason:e.target.value }))} /></div>
            <div><label style={lbl}>Notes</label><input style={inp} placeholder="Optional" value={wForm.notes} onChange={e => setWForm(f => ({ ...f, notes:e.target.value }))} /></div>
            <button onClick={handleWithdraw} style={{ padding:11, background:C.fines, color:'white', border:'none', borderRadius:10, fontWeight:600, cursor:'pointer', fontSize:15 }}>Record Withdrawal</button>
          </div>
        </Modal>
      )}
    </div>
  )
}