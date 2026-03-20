import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }
const lbl = { fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 3 }

const STATUS_STYLE = {
  paid:    { bg: '#f0fdf4', color: '#16a34a', label: '✅ Fully Paid' },
  partial: { bg: '#eff6ff', color: '#1d4ed8', label: '⏳ Partial' },
  pending: { bg: '#fef3c7', color: '#d97706', label: '🕐 Pending' },
  overdue: { bg: '#fef2f2', color: '#dc2626', label: '⚠️ Overdue' },
}

function MemberSearch({ members, value, onChange, placeholder = 'Search member...' }) {
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
          {selected ? `${selected.name} (${selected.account_number})` : placeholder}
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
                style={{ padding: '10px 12px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #f8fafc',
                  background: Number(value) === m.ID ? '#f0fdf4' : 'white' }}
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

export default function ShareCapital() {
  const { isTreasurerOrAbove } = useAuth()
  const [data, setData] = useState({ records: [], summaries: [], withdrawals: [], grand_total: 0, total_paid_in: 0, total_withdrawn: 0, net_total: 0, pending_amount: 0 })
  const [members, setMembers] = useState([])
  const [tab, setTab] = useState('summary')
  const [showAdd, setShowAdd] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showPay, setShowPay] = useState(null) // record to pay installment on
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [form, setForm] = useState({ user_id: '', shares: '', share_price: '', initial_payment: '', type: 'purchase', notes: '' })
  const [wForm, setWForm] = useState({ user_id: '', shares: '', amount_per_share: '', reason: '', notes: '' })

  useEffect(() => {
    fetchData()
    api.get('/members').then(r => setMembers(r.data.members || []))
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api.get('/sharecapital')
      setData(res.data)
    } finally { setLoading(false) }
  }

  const handleAdd = async () => {
    setError('')
    if (!form.user_id || !form.shares || !form.share_price) return setError('Member, shares and share price are required')
    try {
      await api.post('/sharecapital', {
        user_id: Number(form.user_id), shares: Number(form.shares),
        share_price: Number(form.share_price),
        initial_payment: Number(form.initial_payment) || 0,
        type: form.type, notes: form.notes
      })
      setShowAdd(false)
      setForm({ user_id: '', shares: '', share_price: '', initial_payment: '', type: 'purchase', notes: '' })
      fetchData()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const handlePayInstallment = async () => {
    setError('')
    if (!payAmount || Number(payAmount) <= 0) return setError('Please enter a valid amount')
    try {
      await api.post(`/sharecapital/${showPay.ID}/pay`, { amount: Number(payAmount) })
      setShowPay(null)
      setPayAmount('')
      fetchData()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const handleWithdraw = async () => {
    setError('')
    if (!wForm.user_id || !wForm.shares || !wForm.amount_per_share)
      return setError('Member, shares and amount per share are required')
    try {
      await api.post('/sharecapital/withdraw', {
        user_id: Number(wForm.user_id), shares: Number(wForm.shares),
        amount_per_share: Number(wForm.amount_per_share),
        reason: wForm.reason, notes: wForm.notes
      })
      setShowWithdraw(false)
      setWForm({ user_id: '', shares: '', amount_per_share: '', reason: '', notes: '' })
      fetchData()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const totalAmount = Number(form.shares || 0) * Number(form.share_price || 0)
  const initialPayment = Number(form.initial_payment || 0)
  const balanceDue = totalAmount - initialPayment

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📈 Share Capital</h2>
        {isTreasurerOrAbove && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setError(''); setShowWithdraw(true) }}
              style={{ padding: '9px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              📤 Withdraw
            </button>
            <button onClick={() => { setError(''); setShowAdd(true) }}
              style={{ padding: '9px 20px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              + Add Shares
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          ['Total Committed', data.grand_total, '#f5f3ff', '#7c3aed'],
          ['Total Paid In', data.total_paid_in, '#f0fdf4', '#16a34a'],
          ['Pending Payment', data.pending_amount, '#fef3c7', '#d97706'],
          ['Net Capital', data.net_total, '#eff6ff', '#1d4ed8'],
        ].map(([l, v, bg, c]) => (
          <div key={l} style={{ background: bg, borderRadius: 12, padding: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: c }}>KES {Number(v || 0).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['summary', '👥 Per Member'], ['records', '📋 All Records'], ['withdrawals', '📤 Withdrawals']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '7px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: tab === t ? 600 : 400, background: tab === t ? '#7c3aed' : '#f1f5f9',
              color: tab === t ? 'white' : '#374151' }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <p>Loading...</p> : (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

          {/* Per Member Summary */}
          {tab === 'summary' && (
            (data.summaries || []).length === 0
              ? <p style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No share capital records yet.</p>
              : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['Member', 'Shares', 'Net Shares', 'Net Value', 'Payment Status'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.summaries || []).map(s => (
                    <tr key={s.user_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500, fontSize: 14 }}>{s.user_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14 }}>{s.total_shares}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: s.net_shares > 0 ? '#f5f3ff' : '#f1f5f9', color: s.net_shares > 0 ? '#7c3aed' : '#94a3b8',
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                          {s.net_shares} shares
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#7c3aed' }}>
                        KES {Number(s.net_amount || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {s.has_pending
                          ? <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#fef3c7', color: '#d97706', fontWeight: 600 }}>⚠️ Has pending payments</span>
                          : <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a', fontWeight: 600 }}>✅ All paid</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          )}

          {/* All Records with installment progress */}
          {tab === 'records' && (
            (data.records || []).length === 0
              ? <p style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No records yet.</p>
              : <div>
                {(data.records || []).map(r => {
                  const progress = r.amount > 0 ? Math.min((r.amount_paid / r.amount) * 100, 100) : 0
                  const balanceDue = r.amount - r.amount_paid
                  const st = STATUS_STYLE[r.payment_status] || STATUS_STYLE.pending
                  const deadline = new Date(r.installment_deadline)
                  const daysLeft = Math.max(0, Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24)))
                  return (
                    <div key={r.ID} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{r.user?.name}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.user?.account_number} · {r.shares} shares @ KES {Number(r.share_price).toLocaleString()} · {new Date(r.CreatedAt).toLocaleDateString('en-KE')}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color, fontWeight: 600 }}>
                            {st.label}
                          </span>
                          {isTreasurerOrAbove && r.payment_status !== 'paid' && (
                            <button onClick={() => { setError(''); setPayAmount(''); setShowPay(r) }}
                              style={{ padding: '5px 12px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                              + Pay Installment
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Payment progress */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
                        <div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 12px' }}>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>Total Due</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>KES {Number(r.amount).toLocaleString()}</div>
                        </div>
                        <div style={{ background: '#f0fdf4', borderRadius: 6, padding: '8px 12px' }}>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>Paid</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>KES {Number(r.amount_paid).toLocaleString()}</div>
                        </div>
                        <div style={{ background: balanceDue > 0 ? '#fef3c7' : '#f0fdf4', borderRadius: 6, padding: '8px 12px' }}>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>Balance</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: balanceDue > 0 ? '#d97706' : '#16a34a' }}>
                            {balanceDue > 0 ? `KES ${Number(balanceDue).toLocaleString()}` : 'Cleared ✅'}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ height: '100%', width: `${progress}%`, borderRadius: 4, transition: 'width 0.5s',
                          background: r.payment_status === 'overdue' ? '#dc2626' : r.payment_status === 'paid' ? '#16a34a' : '#7c3aed' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                        <span>{Math.round(progress)}% paid</span>
                        {r.payment_status !== 'paid' && (
                          <span style={{ color: r.payment_status === 'overdue' ? '#dc2626' : '#64748b' }}>
                            Deadline: {deadline.toLocaleDateString('en-KE')}
                            {r.payment_status !== 'overdue' && daysLeft > 0 && ` · ${daysLeft} days left`}
                            {r.payment_status === 'overdue' && ' · OVERDUE'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
          )}

          {/* Withdrawals */}
          {tab === 'withdrawals' && (
            (data.withdrawals || []).length === 0
              ? <p style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No withdrawals recorded.</p>
              : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['Member', 'Shares', 'Per Share', 'Total Paid Out', 'Reason', 'Approved By', 'Date'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.withdrawals || []).map(w => (
                    <tr key={w.ID} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500, fontSize: 14 }}>
                        <div>{w.user?.name}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{w.user?.account_number}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14 }}>{w.shares}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>KES {Number(w.amount_per_share).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#dc2626' }}>KES {Number(w.total_amount).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{w.reason || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{w.approved_by_name || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{new Date(w.CreatedAt).toLocaleDateString('en-KE')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          )}
        </div>
      )}

      {/* Add Shares Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowAdd(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Add Share Capital</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 14, marginBottom: 16 }}>{error}</div>}
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={lbl}>Member *</label>
                <MemberSearch members={members} value={form.user_id} onChange={v => setForm(f => ({ ...f, user_id: v }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>Number of Shares *</label>
                  <input style={inp} type="number" placeholder="e.g. 10" value={form.shares}
                    onChange={e => setForm(f => ({ ...f, shares: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Price per Share (KES) *</label>
                  <input style={inp} type="number" placeholder="e.g. 500" value={form.share_price}
                    onChange={e => setForm(f => ({ ...f, share_price: e.target.value }))} />
                </div>
              </div>

              {/* Total + installment section */}
              {totalAmount > 0 && (
                <>
                  <div style={{ background: '#f5f3ff', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontWeight: 600, color: '#7c3aed' }}>
                    Total: KES {totalAmount.toLocaleString()}
                  </div>
                  <div>
                    <label style={lbl}>Initial Payment (KES)</label>
                    <input style={inp} type="number" placeholder={`Up to KES ${totalAmount.toLocaleString()} — leave blank to pay later`}
                      value={form.initial_payment}
                      onChange={e => setForm(f => ({ ...f, initial_payment: e.target.value }))} />
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      Leave blank or enter partial amount — balance can be paid in installments within 3 months.
                    </div>
                  </div>
                  {initialPayment >= 0 && totalAmount > 0 && (
                    <div style={{ background: balanceDue > 0 ? '#fef3c7' : '#f0fdf4', border: `1px solid ${balanceDue > 0 ? '#fbbf24' : '#bbf7d0'}`, borderRadius: 8, padding: '12px 14px', fontSize: 13 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <div>
                          <div style={{ color: '#64748b', marginBottom: 2 }}>Paying now</div>
                          <div style={{ fontWeight: 700, color: '#16a34a' }}>KES {initialPayment.toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', marginBottom: 2 }}>Balance due</div>
                          <div style={{ fontWeight: 700, color: balanceDue > 0 ? '#d97706' : '#16a34a' }}>KES {balanceDue.toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', marginBottom: 2 }}>Deadline</div>
                          <div style={{ fontWeight: 700, color: '#374151' }}>{new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('en-KE')}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label style={lbl}>Type</label>
                <select style={inp} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="purchase">Purchase (new shares)</option>
                  <option value="topup">Top-up (additional shares)</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <input style={inp} placeholder="Optional notes" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <button onClick={handleAdd}
                style={{ padding: '11px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
                Record Share Capital
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Installment Modal */}
      {showPay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowPay(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>💳 Pay Share Installment</h3>
              <button onClick={() => setShowPay(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Record summary */}
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{showPay.user?.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, color: '#64748b' }}>
                <span>Shares: {showPay.shares} × KES {Number(showPay.share_price).toLocaleString()}</span>
                <span>Total: KES {Number(showPay.amount).toLocaleString()}</span>
                <span style={{ color: '#16a34a' }}>Paid: KES {Number(showPay.amount_paid).toLocaleString()}</span>
                <span style={{ color: '#d97706', fontWeight: 600 }}>Balance: KES {Number(showPay.amount - showPay.amount_paid).toLocaleString()}</span>
              </div>
              {/* Mini progress bar */}
              <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginTop: 10 }}>
                <div style={{ height: '100%', width: `${(showPay.amount_paid / showPay.amount) * 100}%`, background: '#7c3aed', borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                {Math.round((showPay.amount_paid / showPay.amount) * 100)}% paid · Deadline: {new Date(showPay.installment_deadline).toLocaleDateString('en-KE')}
              </div>
            </div>

            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 14, marginBottom: 16 }}>{error}</div>}

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={lbl}>Amount to Pay (KES) *</label>
                <input style={inp} type="number"
                  placeholder={`Up to KES ${Number(showPay.amount - showPay.amount_paid).toLocaleString()}`}
                  value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                {payAmount && Number(payAmount) > 0 && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Remaining after payment: KES {Math.max(0, showPay.amount - showPay.amount_paid - Number(payAmount)).toLocaleString()}
                  </div>
                )}
              </div>
              <button onClick={handlePayInstallment}
                style={{ padding: '11px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowWithdraw(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>📤 Share Withdrawal</h3>
              <button onClick={() => setShowWithdraw(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 14 }}>
              ℹ️ Only fully paid shares can be withdrawn.
            </div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 14, marginBottom: 16 }}>{error}</div>}
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={lbl}>Member *</label>
                <MemberSearch members={members} value={wForm.user_id} onChange={v => setWForm(f => ({ ...f, user_id: v }))} placeholder="Search member to withdraw..." />
              </div>
              <div><label style={lbl}>Shares to Withdraw *</label><input style={inp} type="number" placeholder="e.g. 5" value={wForm.shares} onChange={e => setWForm(f => ({ ...f, shares: e.target.value }))} /></div>
              <div><label style={lbl}>Payout per Share (KES) *</label><input style={inp} type="number" placeholder="e.g. 500" value={wForm.amount_per_share} onChange={e => setWForm(f => ({ ...f, amount_per_share: e.target.value }))} /></div>
              {wForm.shares && wForm.amount_per_share && (
                <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontWeight: 600, color: '#dc2626' }}>
                  Total Payout: KES {(Number(wForm.shares) * Number(wForm.amount_per_share)).toLocaleString()}
                </div>
              )}
              {wForm.user_id && (
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#64748b' }}>
                  Fully paid shares available: <strong style={{ color: '#7c3aed' }}>
                    {(() => {
                      const s = (data.summaries || []).find(x => x.user_id === Number(wForm.user_id))
                      return s ? `${s.net_shares} shares` : '—'
                    })()}
                  </strong>
                </div>
              )}
              <div><label style={lbl}>Reason</label><input style={inp} placeholder="e.g. Member exiting group" value={wForm.reason} onChange={e => setWForm(f => ({ ...f, reason: e.target.value }))} /></div>
              <div><label style={lbl}>Notes</label><input style={inp} placeholder="Optional notes" value={wForm.notes} onChange={e => setWForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <button onClick={handleWithdraw}
                style={{ padding: '11px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
                Record Withdrawal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}