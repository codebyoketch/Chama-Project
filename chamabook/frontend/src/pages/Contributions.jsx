import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import BranchTabs from '../components/BranchTabs'
import api from '../services/api'

const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }
const lbl = { fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 3 }

const today = () => new Date().toISOString().slice(0, 10)
const thisMonth = () => new Date().toISOString().slice(0, 7)

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
        style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, cursor: 'pointer', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: selected ? '#374151' : '#94a3b8' }}>
          {selected ? `${selected.name} (${selected.account_number})` : 'Search member...'}
        </span>
        <span style={{ color: '#94a3b8', fontSize: 12 }}>▼</span>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 200, maxHeight: 250, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <input autoFocus placeholder="Search by name, account or phone..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px', border: 'none', borderBottom: '1px solid #f1f5f9', outline: 'none', fontSize: 14 }} />
          <div style={{ overflowY: 'auto', maxHeight: 200 }}>
            {filtered.map(m => (
              <div key={m.ID} onClick={() => { onChange(m.ID); setOpen(false); setSearch('') }}
                style={{ padding: '10px 12px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #f8fafc', background: Number(value) === m.ID ? '#f0fdf4' : 'white' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = Number(value) === m.ID ? '#f0fdf4' : 'white'}>
                <div style={{ fontWeight: 500 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{m.account_number} · {m.phone}</div>
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: 16, color: '#94a3b8', fontSize: 14, textAlign: 'center' }}>No members found</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function ContributionTable({ contributions, loading, accentColor = '#1a6b3c' }) {
  if (loading) return <p style={{ padding: 20 }}>Loading...</p>
  if (contributions.length === 0) return <p style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No records found for this period.</p>
  return (
    <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            {['Member', 'Branch', 'Amount', 'Fines Deducted', 'Net', 'Period', 'Date Paid', 'Recorded By'].map(h => (
              <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {contributions.map(c => (
            <tr key={c.ID} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '12px 16px', fontSize: 14 }}>
                <div style={{ fontWeight: 500 }}>{c.user?.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{c.user?.account_number}</div>
              </td>
              <td style={{ padding: '12px 16px', fontSize: 13 }}>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12,
                  background: c.type === 'sacco_savings' ? '#f0fdf4' : '#eff6ff',
                  color: c.type === 'sacco_savings' ? '#16a34a' : '#1d4ed8' }}>
                  {c.branch_name || 'General'}
                </span>
              </td>
              <td style={{ padding: '12px 16px', fontWeight: 700, color: accentColor }}>KES {c.amount?.toLocaleString()}</td>
              <td style={{ padding: '12px 16px', fontSize: 13, color: '#dc2626' }}>
                {c.fines_deducted > 0 ? `-KES ${c.fines_deducted?.toLocaleString()}` : '—'}
              </td>
              <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: accentColor }}>
                KES {c.net_amount?.toLocaleString()}
              </td>
              <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{c.period}</td>
              <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
                {c.paid_at ? new Date(c.paid_at).toLocaleDateString('en-KE') : '—'}
              </td>
              <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{c.recorded_by_name || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Contributions() {
  const { isTreasurerOrAbove, branches } = useAuth()
  const [tab, setTab] = useState('sacco')
  const [contributions, setContributions] = useState([])
  const [typeTotals, setTypeTotals] = useState([])
  const [payouts, setPayouts] = useState({ payouts: [], total_in: 0, sacco_in: 0, tb_in: 0, total_out: 0, balance: 0 })
  const [members, setMembers] = useState([])
  const [branchFilter, setBranchFilter] = useState(0)
  const [period, setPeriod] = useState(thisMonth())
  const [showAdd, setShowAdd] = useState(false)
  const [showPayout, setShowPayout] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ user_id: '', branch_id: '', amount: '', period: thisMonth(), date: today(), notes: '' })
  const [pForm, setPForm] = useState({ user_id: '', branch_id: '', amount: '', reason: '', period: thisMonth(), date: today(), notes: '' })

  useEffect(() => {
    api.get('/members').then(r => setMembers(r.data.members || []))
  }, [])

  useEffect(() => {
    if (tab !== 'payouts') fetchContributions()
    else fetchPayouts()
  }, [tab, branchFilter, period])

  const fetchContributions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (period) params.append('period', period)
      if (branchFilter && tab === 'tb') params.append('branch_id', branchFilter)
      if (tab === 'sacco') params.append('type', 'sacco_savings')
      if (tab === 'tb') params.append('type', 'tb_contribution')
      const res = await api.get(`/contributions?${params}`)
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
    if (!form.user_id) return setError('Please select a member')
    if (tab === 'tb' && !form.branch_id) return setError('Please select a branch')
    if (!form.amount) return setError('Please enter an amount')
    try {
      await api.post('/contributions', {
        user_id: Number(form.user_id),
        branch_id: Number(form.branch_id),
        amount: Number(form.amount),
        period: form.period,
        paid_at: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        notes: form.notes
      })
      setShowAdd(false)
      setForm({ user_id: '', branch_id: '', amount: '', period: thisMonth(), date: today(), notes: '' })
      fetchContributions()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const handlePayout = async () => {
    setError('')
    if (!pForm.user_id) return setError('Please select a member')
    if (!pForm.branch_id) return setError('Please select a branch')
    if (!pForm.amount) return setError('Please enter an amount')
    try {
      await api.post('/contributions/payout', {
        user_id: Number(pForm.user_id),
        branch_id: Number(pForm.branch_id),
        amount: Number(pForm.amount),
        reason: pForm.reason,
        period: pForm.period,
        disbursed_at: pForm.date ? new Date(pForm.date).toISOString() : new Date().toISOString(),
        notes: pForm.notes
      })
      setShowPayout(false)
      setPForm({ user_id: '', branch_id: '', amount: '', reason: '', period: thisMonth(), date: today(), notes: '' })
      fetchPayouts()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const getSummary = (type) => typeTotals.find(t => t.type === type) || { total_amount: 0, total_net: 0, count: 0 }
  const saccoSummary = getSummary('sacco_savings')
  const tbSummary = getSummary('tb_contribution')
  const total = contributions.reduce((s, c) => s + c.amount, 0)
  const netTotal = contributions.reduce((s, c) => s + (c.net_amount || 0), 0)
  const finesTotal = contributions.reduce((s, c) => s + (c.fines_deducted || 0), 0)

  const tbMembers = members.filter(m => m.membership_type === 'both')
  const tbBranches = branches.filter(b => b.type === 'table_banking')

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>💰 Contributions</h2>
        {isTreasurerOrAbove && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setError(''); setShowPayout(true) }}
              style={{ padding: '9px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              💸 Payout
            </button>
            <button onClick={() => { setError(''); setShowAdd(true) }}
              style={{ padding: '9px 20px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              + Record
            </button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase' }}>🏦 SACCO Savings</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#1a6b3c' }}>KES {Number(saccoSummary.total_amount || 0).toLocaleString()}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{saccoSummary.count || 0} records</div>
        </div>
        <div style={{ background: '#eff6ff', borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase' }}>💼 Table Banking</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#1d4ed8' }}>KES {Number(tbSummary.total_amount || 0).toLocaleString()}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{tbSummary.count || 0} records · {tbMembers.length} members</div>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase' }}>💰 Combined</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#374151' }}>
            KES {(Number(saccoSummary.total_amount || 0) + Number(tbSummary.total_amount || 0)).toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{(saccoSummary.count || 0) + (tbSummary.count || 0)} total</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['sacco', '🏦 SACCO Savings', '#1a6b3c'], ['tb', '💼 Table Banking', '#1d4ed8'], ['payouts', '📤 Payouts', '#dc2626']].map(([t, l, color]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '7px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: tab === t ? 600 : 400, background: tab === t ? color : '#f1f5f9',
              color: tab === t ? 'white' : '#374151' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── SACCO Savings ── */}
      {tab === 'sacco' && (
        <>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#166534' }}>
            🏦 <strong>SACCO Savings</strong> — Monthly savings deposited by all SACCO members. These form the savings pool used for loans.
          </div>
          {/* No branch filter for SACCO — all SACCO members contribute to one pool */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="month" value={period} onChange={e => setPeriod(e.target.value)} style={{ ...inp, width: 'auto' }} />
            {contributions.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#1a6b3c' }}>
                  Gross: KES {total.toLocaleString()}
                </div>
                {finesTotal > 0 && (
                  <div style={{ background: '#fef2f2', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#dc2626' }}>
                    Fines: -KES {finesTotal.toLocaleString()}
                  </div>
                )}
                <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#166534' }}>
                  Net: KES {netTotal.toLocaleString()}
                </div>
              </div>
            )}
          </div>
          <ContributionTable contributions={contributions} loading={loading} accentColor="#1a6b3c" />
        </>
      )}

      {/* ── Table Banking ── */}
      {tab === 'tb' && (
        <>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#1e40af' }}>
            💼 <strong>Table Banking Contributions</strong> — Monthly contributions by members enrolled in Table Banking
            (<strong>SACCO + TB</strong> membership). {tbMembers.length > 0
              ? <span>Currently <strong>{tbMembers.length} eligible members</strong>.</span>
              : <span style={{ color: '#dc2626' }}>No TB members yet — set membership type to <strong>SACCO + TB</strong> in Members.</span>}
          </div>
          {/* Branch filter only for TB */}
          <BranchTabs selected={branchFilter} onChange={setBranchFilter} />
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="month" value={period} onChange={e => setPeriod(e.target.value)} style={{ ...inp, width: 'auto' }} />
            {contributions.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ background: '#eff6ff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>
                  Total: KES {total.toLocaleString()}
                </div>
                {finesTotal > 0 && (
                  <div style={{ background: '#fef2f2', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#dc2626' }}>
                    Fines: -KES {finesTotal.toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
          <ContributionTable contributions={contributions} loading={loading} accentColor="#1d4ed8" />
        </>
      )}

      {/* ── Payouts ── */}
      {tab === 'payouts' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              ['Pool Balance', payouts.balance, '#f0fdf4', '#16a34a'],
              ['SACCO Savings In', payouts.sacco_in, '#f0fdf4', '#1a6b3c'],
              ['TB Contributions In', payouts.tb_in, '#eff6ff', '#1d4ed8'],
              ['Total Paid Out', payouts.total_out, '#fef2f2', '#dc2626'],
            ].map(([l, v, bg, c]) => (
              <div key={l} style={{ background: bg, borderRadius: 12, padding: '14px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: c }}>KES {Number(v || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {loading ? <p style={{ padding: 20 }}>Loading...</p> : (payouts.payouts || []).length === 0
              ? <p style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No payouts recorded yet.</p>
              : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      {['Beneficiary', 'Branch', 'Amount', 'Reason', 'Period', 'Date', 'Approved By'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(payouts.payouts || []).map(p => (
                      <tr key={p.ID} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontSize: 14 }}>
                          <div style={{ fontWeight: 500 }}>{p.user?.name}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>{p.user?.account_number}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13 }}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12,
                            background: p.branch_name?.toLowerCase().includes('sacco') ? '#f0fdf4' : '#eff6ff',
                            color: p.branch_name?.toLowerCase().includes('sacco') ? '#16a34a' : '#1d4ed8' }}>
                            {p.branch_name || 'General'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#dc2626' }}>KES {p.amount?.toLocaleString()}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{p.reason || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{p.period || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
                          {p.disbursed_at ? new Date(p.disbursed_at).toLocaleDateString('en-KE') : new Date(p.CreatedAt).toLocaleDateString('en-KE')}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{p.approved_by_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </>
      )}

      {/* ── Add Contribution Modal ── */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowAdd(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0 }}>{tab === 'tb' ? '💼 Record TB Contribution' : '🏦 Record SACCO Savings'}</h3>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                  {tab === 'tb' ? 'Table Banking monthly contribution' : 'SACCO monthly savings deposit'}
                </div>
              </div>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: tab === 'tb' ? '#eff6ff' : '#f0fdf4', border: `1px solid ${tab === 'tb' ? '#bfdbfe' : '#bbf7d0'}`, borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: tab === 'tb' ? '#1e40af' : '#166534', fontWeight: 600 }}>
              {tab === 'tb' ? '💼 Will be recorded as a Table Banking Contribution' : '🏦 Will be recorded as SACCO Monthly Savings'}
            </div>

            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 14, marginBottom: 16 }}>{error}</div>}

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={lbl}>Member *</label>
                {tab === 'tb' && tbMembers.length === 0 && (
                  <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400e', marginBottom: 8 }}>
                    ⚠️ No Table Banking members found. Go to <strong>Members</strong> and set membership type to <strong>SACCO + TB</strong>.
                  </div>
                )}
                <MemberSearch
                  members={tab === 'tb' ? tbMembers : members}
                  value={form.user_id}
                  onChange={v => setForm(f => ({ ...f, user_id: v }))}
                />
                {tab === 'tb' && tbMembers.length > 0 && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    Showing {tbMembers.length} Table Banking members only
                  </div>
                )}
              </div>

              {/* Branch only shown for TB */}
              {tab === 'tb' && (
                <div>
                  <label style={lbl}>Branch *</label>
                  <select style={{ ...inp, borderColor: !form.branch_id ? '#fca5a5' : '#e2e8f0' }}
                    value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
                    <option value="">Select branch...</option>
                    {tbBranches.map(b => <option key={b.ID} value={b.ID}>{b.name}</option>)}
                  </select>
                  {tbBranches.length === 0 && (
                    <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>No Table Banking branches found.</div>
                  )}
                </div>
              )}

              <div>
                <label style={lbl}>Amount (KES) *</label>
                <input style={inp} type="number" placeholder="e.g. 1000" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>Period *</label>
                  <input style={inp} type="month" value={form.period}
                    onChange={e => setForm(f => ({ ...f, period: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Date Paid</label>
                  <input style={inp} type="date" value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <input style={inp} placeholder="Optional" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <button onClick={handleAdd}
                style={{ padding: '11px', background: tab === 'tb' ? '#1d4ed8' : '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
                {tab === 'tb' ? 'Record TB Contribution' : 'Record SACCO Savings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payout Modal ── */}
      {showPayout && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowPayout(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>💸 Record Payout</h3>
              <button onClick={() => setShowPayout(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 14, marginBottom: 16 }}>{error}</div>}
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={lbl}>Beneficiary *</label>
                <MemberSearch members={members} value={pForm.user_id} onChange={v => setPForm(f => ({ ...f, user_id: v }))} />
              </div>
              <div>
                <label style={lbl}>Branch *</label>
                <select style={{ ...inp, borderColor: !pForm.branch_id ? '#fca5a5' : '#e2e8f0' }}
                  value={pForm.branch_id} onChange={e => setPForm(f => ({ ...f, branch_id: e.target.value }))}>
                  <option value="">Select branch...</option>
                  {branches.map(b => <option key={b.ID} value={b.ID}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Amount (KES) *</label>
                <input style={inp} type="number" placeholder="e.g. 5000" value={pForm.amount}
                  onChange={e => setPForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Reason</label>
                <input style={inp} placeholder="e.g. Monthly merry-go-round" value={pForm.reason}
                  onChange={e => setPForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>Period</label>
                  <input style={inp} type="month" value={pForm.period}
                    onChange={e => setPForm(f => ({ ...f, period: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Date Paid</label>
                  <input style={inp} type="date" value={pForm.date}
                    onChange={e => setPForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <input style={inp} placeholder="Optional" value={pForm.notes}
                  onChange={e => setPForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <button onClick={handlePayout}
                style={{ padding: '11px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
                Record Payout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}