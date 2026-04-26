import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import BranchTabs from '../components/BranchTabs'
import api from '../services/api'

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  sacco: '#166534', saccoLt: '#f0fdf4', saccoBd: '#bbf7d0',
  tb: '#1e40af', tbLt: '#eff6ff', tbBd: '#bfdbfe',
  fines: '#b91c1c', finesLt: '#fef2f2',
  text: '#0f172a', muted: '#64748b', faint: '#94a3b8',
  border: '#e2e8f0', surface: '#f8fafc',
}
const mono = { fontFamily: "'DM Mono', 'Courier New', monospace" }
const sans = { fontFamily: "'Outfit', 'Segoe UI', sans-serif" }

const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, boxSizing: 'border-box', color: C.text, background: 'white' }
const lbl = { fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 4 }

const today     = () => new Date().toISOString().slice(0, 10)
const thisMonth = () => new Date().toISOString().slice(0, 7)

// ── Member search dropdown ────────────────────────────────────────────────────
function MemberSearch({ members, value, onChange }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const selected = members.find(m => m.ID === Number(value))
  const filtered = members.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.account_number?.includes(search) ||
    m.phone?.includes(search)
  )
  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => setOpen(!open)}
        style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, cursor: 'pointer', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: selected ? C.text : C.faint }}>
          {selected ? `${selected.name} (${selected.account_number})` : 'Search member…'}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.faint} strokeWidth="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200, maxHeight: 260, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginTop: 4 }}>
          <input autoFocus placeholder="Name, account or phone…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 12px', border: 'none', borderBottom: `1px solid ${C.border}`, outline: 'none', fontSize: 13, color: C.text }} />
          <div style={{ overflowY: 'auto', maxHeight: 200 }}>
            {filtered.map(m => (
              <div key={m.ID} onClick={() => { onChange(m.ID); setOpen(false); setSearch('') }}
                style={{ padding: '10px 12px', cursor: 'pointer', fontSize: 14, borderBottom: `1px solid ${C.surface}`, background: Number(value) === m.ID ? C.saccoLt : 'white', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = C.surface}
                onMouseLeave={e => e.currentTarget.style.background = Number(value) === m.ID ? C.saccoLt : 'white'}>
                <div style={{ fontWeight: 500 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: C.faint, ...mono }}>{m.account_number} · {m.phone}</div>
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: 16, color: C.faint, fontSize: 14, textAlign: 'center' }}>No members found</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Contribution table ────────────────────────────────────────────────────────
function ContributionTable({ contributions, loading, accentColor = C.sacco }) {
  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: C.faint }}>Loading…</div>
  )
  if (contributions.length === 0) return (
    <div style={{ padding: 48, textAlign: 'center', color: C.faint, fontSize: 14 }}>No records found for this period.</div>
  )
  const headers = ['Member','Branch','Amount','Fines Deducted','Net','Period','Date Paid','Recorded By']
  return (
    <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: C.surface, borderBottom: `2px solid ${C.border}` }}>
            {headers.map(h => (
              <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {contributions.map(c => (
            <tr key={c.ID} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = C.surface}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: C.text }}>{c.user?.name}</div>
                <div style={{ fontSize: 12, color: C.faint, ...mono }}>{c.user?.account_number}</div>
              </td>
              <td style={{ padding: '12px 16px' }}>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  background: c.type === 'sacco_savings' ? C.saccoLt : C.tbLt,
                  color: c.type === 'sacco_savings' ? C.sacco : C.tb }}>
                  {c.branch_name || 'General'}
                </span>
              </td>
              <td style={{ padding: '12px 16px', fontWeight: 700, color: accentColor, ...mono, whiteSpace: 'nowrap' }}>
                KES {c.amount?.toLocaleString()}
              </td>
              <td style={{ padding: '12px 16px', fontSize: 13, color: C.fines, ...mono, whiteSpace: 'nowrap' }}>
                {c.fines_deducted > 0 ? `−KES ${c.fines_deducted?.toLocaleString()}` : <span style={{ color: C.faint }}>—</span>}
              </td>
              <td style={{ padding: '12px 16px', fontWeight: 600, color: accentColor, ...mono, whiteSpace: 'nowrap' }}>
                KES {c.net_amount?.toLocaleString()}
              </td>
              <td style={{ padding: '12px 16px', fontSize: 13, color: C.muted }}>{c.period}</td>
              <td style={{ padding: '12px 16px', fontSize: 13, color: C.muted }}>
                {c.paid_at ? new Date(c.paid_at).toLocaleDateString('en-KE') : <span style={{ color: C.faint }}>—</span>}
              </td>
              <td style={{ padding: '12px 16px', fontSize: 13, color: C.muted }}>{c.recorded_by_name || <span style={{ color: C.faint }}>—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Summary chip ──────────────────────────────────────────────────────────────
const Chip = ({ label, value, bg, color }) => (
  <div style={{ background: bg, borderRadius: 8, padding: '7px 14px', border: `1px solid ${C.border}` }}>
    <span style={{ fontSize: 12, color: C.muted, marginRight: 6 }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 700, color, ...mono }}>{value}</span>
  </div>
)

// ── Main component ────────────────────────────────────────────────────────────
export default function Contributions() {
  const { isTreasurerOrAbove, branches } = useAuth()
  const [tab, setTab]           = useState('sacco')
  const [contributions, setContributions] = useState([])
  const [typeTotals, setTypeTotals]       = useState([])
  const [payouts, setPayouts]   = useState({ payouts: [], total_in: 0, sacco_in: 0, tb_in: 0, total_out: 0, balance: 0 })
  const [members, setMembers]   = useState([])
  const [branchFilter, setBranchFilter] = useState(0)
  const [period, setPeriod]     = useState(thisMonth())
  const [showAdd, setShowAdd]   = useState(false)
  const [showPayout, setShowPayout] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const [form, setForm]   = useState({ user_id:'', branch_id:'', amount:'', period:thisMonth(), date:today(), notes:'' })
  const [pForm, setPForm] = useState({ user_id:'', branch_id:'', amount:'', reason:'', period:thisMonth(), date:today(), notes:'' })

  useEffect(() => {
    api.get('/members').then(r => setMembers(r.data.members || []))
  }, [])

  useEffect(() => {
    tab !== 'payouts' ? fetchContributions() : fetchPayouts()
  }, [tab, branchFilter, period])

  const fetchContributions = async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (period)       p.append('period', period)
      if (branchFilter && tab === 'tb') p.append('branch_id', branchFilter)
      if (tab === 'sacco') p.append('type', 'sacco_savings')
      if (tab === 'tb')    p.append('type', 'tb_contribution')
      const res = await api.get(`/contributions?${p}`)
      setContributions(res.data.contributions || [])
      setTypeTotals(res.data.type_totals || [])
    } finally { setLoading(false) }
  }

  const fetchPayouts = async () => {
    setLoading(true)
    try {
      const res = await api.get('/contributions/payouts')
      setPayouts(res.data)
    } finally { setLoading(false) }
  }

  const handleAdd = async () => {
    setError('')
    if (!form.user_id)                        return setError('Please select a member')
    if (tab === 'tb' && !form.branch_id)      return setError('Please select a branch')
    if (!form.amount)                         return setError('Please enter an amount')
    try {
      await api.post('/contributions', {
        user_id:   Number(form.user_id),
        branch_id: Number(form.branch_id),
        amount:    Number(form.amount),
        period:    form.period,
        paid_at:   form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        notes:     form.notes,
      })
      setShowAdd(false)
      setForm({ user_id:'', branch_id:'', amount:'', period:thisMonth(), date:today(), notes:'' })
      fetchContributions()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const handlePayout = async () => {
    setError('')
    if (!pForm.user_id)   return setError('Please select a member')
    if (!pForm.branch_id) return setError('Please select a branch')
    if (!pForm.amount)    return setError('Please enter an amount')
    try {
      await api.post('/contributions/payout', {
        user_id:     Number(pForm.user_id),
        branch_id:   Number(pForm.branch_id),
        amount:      Number(pForm.amount),
        reason:      pForm.reason,
        period:      pForm.period,
        disbursed_at: pForm.date ? new Date(pForm.date).toISOString() : new Date().toISOString(),
        notes:       pForm.notes,
      })
      setShowPayout(false)
      setPForm({ user_id:'', branch_id:'', amount:'', reason:'', period:thisMonth(), date:today(), notes:'' })
      fetchPayouts()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const getSummary = (type) => typeTotals.find(t => t.type === type) || { total_amount: 0, count: 0 }
  const saccoSummary = getSummary('sacco_savings')
  const tbSummary    = getSummary('tb_contribution')
  const total        = contributions.reduce((s, c) => s + c.amount, 0)
  const netTotal     = contributions.reduce((s, c) => s + (c.net_amount || 0), 0)
  const finesTotal   = contributions.reduce((s, c) => s + (c.fines_deducted || 0), 0)
  const tbMembers    = members.filter(m => m.membership_type === 'both')
  const tbBranches   = branches.filter(b => b.type === 'table_banking')

  // ── Shared modal shell ──────────────────────────────────────────────────────
  const Modal = ({ title, subtitle, onClose, children }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 18, padding: 28, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>{title}</h3>
            {subtitle && <p style={{ margin: '3px 0 0', fontSize: 12, color: C.muted }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background: C.surface, border: `1px solid ${C.border}`, width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, flexShrink: 0 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )

  return (
    <div style={{ ...sans }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Contributions</h2>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: C.muted }}>SACCO savings and Table Banking contributions</p>
        </div>
        {isTreasurerOrAbove && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setError(''); setShowPayout(true) }}
              style={{ padding: '9px 18px', background: 'white', color: C.fines, border: `1px solid ${C.border}`, borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              Record Payout
            </button>
            <button onClick={() => { setError(''); setShowAdd(true) }}
              style={{ padding: '9px 20px', background: C.sacco, color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
              + Record
            </button>
          </div>
        )}
      </div>

      {/* ── Summary cards ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: '14px 18px', border: `1px solid ${C.saccoBd}` }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>SACCO Savings</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.sacco, ...mono }}>KES {Number(saccoSummary.total_amount||0).toLocaleString()}</div>
          <div style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>{saccoSummary.count||0} records</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: '14px 18px', border: `1px solid ${C.tbBd}` }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Table Banking</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.tb, ...mono }}>KES {Number(tbSummary.total_amount||0).toLocaleString()}</div>
          <div style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>{tbSummary.count||0} records · {tbMembers.length} members</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: '14px 18px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Combined</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.text, ...mono }}>
            KES {(Number(saccoSummary.total_amount||0) + Number(tbSummary.total_amount||0)).toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>{(saccoSummary.count||0) + (tbSummary.count||0)} total records</div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: C.surface, padding: 4, borderRadius: 12, border: `1px solid ${C.border}`, width: 'fit-content' }}>
        {[
          ['sacco', 'SACCO Savings',    C.sacco],
          ['tb',    'Table Banking',    C.tb],
          ['payouts','Payouts',         C.fines],
        ].map(([t, l, color]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '7px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: tab === t ? 600 : 400,
              background: tab === t ? 'white' : 'transparent',
              color: tab === t ? color : C.muted,
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── SACCO Savings ────────────────────────────────────────────────────── */}
      {tab === 'sacco' && (
        <>
          <div style={{ background: C.saccoLt, border: `1px solid ${C.saccoBd}`, borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: C.sacco, fontWeight: 500 }}>
            <strong>SACCO Savings</strong> — Monthly savings deposited by all SACCO members, forming the loan pool.
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="month" value={period} onChange={e => setPeriod(e.target.value)} style={{ ...inp, width: 'auto' }} />
            {contributions.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Chip label="Gross" value={`KES ${total.toLocaleString()}`} bg={C.saccoLt} color={C.sacco} />
                {finesTotal > 0 && <Chip label="Fines" value={`−KES ${finesTotal.toLocaleString()}`} bg={C.finesLt} color={C.fines} />}
                <Chip label="Net" value={`KES ${netTotal.toLocaleString()}`} bg={C.saccoLt} color="#16a34a" />
              </div>
            )}
          </div>
          <ContributionTable contributions={contributions} loading={loading} accentColor={C.sacco} />
        </>
      )}

      {/* ── Table Banking ─────────────────────────────────────────────────────── */}
      {tab === 'tb' && (
        <>
          <div style={{ background: C.tbLt, border: `1px solid ${C.tbBd}`, borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#1e3a8a', fontWeight: 500 }}>
            <strong>Table Banking</strong> — Monthly contributions by members with <strong>SACCO + TB</strong> membership.
            {tbMembers.length > 0
              ? <> Currently <strong>{tbMembers.length} eligible members</strong>.</>
              : <span style={{ color: C.fines }}> No TB members yet — update membership type to <strong>SACCO + TB</strong>.</span>}
          </div>
          <BranchTabs selected={branchFilter} onChange={setBranchFilter} />
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="month" value={period} onChange={e => setPeriod(e.target.value)} style={{ ...inp, width: 'auto' }} />
            {contributions.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Chip label="Total" value={`KES ${total.toLocaleString()}`} bg={C.tbLt} color={C.tb} />
                {finesTotal > 0 && <Chip label="Fines" value={`−KES ${finesTotal.toLocaleString()}`} bg={C.finesLt} color={C.fines} />}
              </div>
            )}
          </div>
          <ContributionTable contributions={contributions} loading={loading} accentColor={C.tb} />
        </>
      )}

      {/* ── Payouts ──────────────────────────────────────────────────────────── */}
      {tab === 'payouts' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              ['Pool Balance',       payouts.balance,   C.sacco,   C.saccoLt, C.saccoBd],
              ['SACCO Savings In',   payouts.sacco_in,  C.sacco,   C.saccoLt, C.saccoBd],
              ['TB Contributions In',payouts.tb_in,     C.tb,      C.tbLt,    C.tbBd   ],
              ['Total Paid Out',     payouts.total_out, C.fines,   C.finesLt, '#fecaca'],
            ].map(([l,v,c,bg,bd]) => (
              <div key={l} style={{ background: 'white', borderRadius: 12, padding: '14px 18px', border: `1px solid ${bd}` }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: c, ...mono }}>KES {Number(v||0).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {loading ? <p style={{ padding: 20, color: C.faint }}>Loading…</p> :
              (payouts.payouts || []).length === 0
                ? <p style={{ padding: 48, textAlign: 'center', color: C.faint, fontSize: 14 }}>No payouts recorded yet.</p>
                : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: C.surface, borderBottom: `2px solid ${C.border}` }}>
                        {['Beneficiary','Branch','Amount','Reason','Period','Date','Approved By'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(payouts.payouts || []).map(p => (
                        <tr key={p.ID} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.1s' }}
                          onMouseEnter={e => e.currentTarget.style.background = C.surface}
                          onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 500, fontSize: 14, color: C.text }}>{p.user?.name}</div>
                            <div style={{ fontSize: 12, color: C.faint, ...mono }}>{p.user?.account_number}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12,
                              background: p.branch_name?.toLowerCase().includes('sacco') ? C.saccoLt : C.tbLt,
                              color: p.branch_name?.toLowerCase().includes('sacco') ? C.sacco : C.tb }}>
                              {p.branch_name || 'General'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: C.fines, ...mono, whiteSpace: 'nowrap' }}>KES {p.amount?.toLocaleString()}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: C.muted }}>{p.reason || <span style={{ color: C.faint }}>—</span>}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: C.muted }}>{p.period || <span style={{ color: C.faint }}>—</span>}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: C.muted }}>
                            {(p.disbursed_at ? new Date(p.disbursed_at) : new Date(p.CreatedAt)).toLocaleDateString('en-KE')}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: C.muted }}>{p.approved_by_name || <span style={{ color: C.faint }}>—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
          </div>
        </>
      )}

      {/* ── Add Contribution Modal ─────────────────────────────────────────── */}
      {showAdd && (
        <Modal
          title={tab === 'tb' ? 'Record TB Contribution' : 'Record SACCO Savings'}
          subtitle={tab === 'tb' ? 'Table Banking monthly contribution' : 'SACCO monthly savings deposit'}
          onClose={() => setShowAdd(false)}>
          <div style={{ marginBottom: 16, padding: '9px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: tab === 'tb' ? C.tbLt : C.saccoLt,
            color: tab === 'tb' ? '#1e3a8a' : C.sacco,
            border: `1px solid ${tab === 'tb' ? C.tbBd : C.saccoBd}` }}>
            Will be recorded as {tab === 'tb' ? 'Table Banking Contribution' : 'SACCO Monthly Savings'}
          </div>
          {error && <div style={{ background: C.finesLt, border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: C.fines, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={lbl}>Member *</label>
              {tab === 'tb' && tbMembers.length === 0 && (
                <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400e', marginBottom: 8 }}>
                  No Table Banking members found. Update membership type to <strong>SACCO + TB</strong> in Members.
                </div>
              )}
              <MemberSearch members={tab === 'tb' ? tbMembers : members} value={form.user_id} onChange={v => setForm(f => ({ ...f, user_id: v }))} />
              {tab === 'tb' && tbMembers.length > 0 && <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>Showing {tbMembers.length} TB members only</div>}
            </div>
            {tab === 'tb' && (
              <div>
                <label style={lbl}>Branch *</label>
                <select style={{ ...inp, borderColor: !form.branch_id ? '#fca5a5' : C.border }}
                  value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
                  <option value="">Select branch…</option>
                  {tbBranches.map(b => <option key={b.ID} value={b.ID}>{b.name}</option>)}
                </select>
                {tbBranches.length === 0 && <div style={{ fontSize: 11, color: C.fines, marginTop: 4 }}>No Table Banking branches found.</div>}
              </div>
            )}
            <div>
              <label style={lbl}>Amount (KES) *</label>
              <input style={inp} type="number" placeholder="e.g. 1000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={lbl}>Period *</label>
                <input style={inp} type="month" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Date Paid</label>
                <input style={inp} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={lbl}>Notes</label>
              <input style={inp} placeholder="Optional" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button onClick={handleAdd}
              style={{ padding: 11, background: tab === 'tb' ? C.tb : C.sacco, color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
              {tab === 'tb' ? 'Record TB Contribution' : 'Record SACCO Savings'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Payout Modal ─────────────────────────────────────────────────────── */}
      {showPayout && (
        <Modal title="Record Payout" subtitle="Disburse funds to a member" onClose={() => setShowPayout(false)}>
          {error && <div style={{ background: C.finesLt, border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: C.fines, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={lbl}>Beneficiary *</label>
              <MemberSearch members={members} value={pForm.user_id} onChange={v => setPForm(f => ({ ...f, user_id: v }))} />
            </div>
            <div>
              <label style={lbl}>Branch *</label>
              <select style={{ ...inp, borderColor: !pForm.branch_id ? '#fca5a5' : C.border }}
                value={pForm.branch_id} onChange={e => setPForm(f => ({ ...f, branch_id: e.target.value }))}>
                <option value="">Select branch…</option>
                {branches.map(b => <option key={b.ID} value={b.ID}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Amount (KES) *</label>
              <input style={inp} type="number" placeholder="e.g. 5000" value={pForm.amount} onChange={e => setPForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label style={lbl}>Reason</label>
              <input style={inp} placeholder="e.g. Monthly merry-go-round" value={pForm.reason} onChange={e => setPForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={lbl}>Period</label>
                <input style={inp} type="month" value={pForm.period} onChange={e => setPForm(f => ({ ...f, period: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Date Paid</label>
                <input style={inp} type="date" value={pForm.date} onChange={e => setPForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={lbl}>Notes</label>
              <input style={inp} placeholder="Optional" value={pForm.notes} onChange={e => setPForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button onClick={handlePayout}
              style={{ padding: 11, background: C.fines, color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
              Record Payout
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
