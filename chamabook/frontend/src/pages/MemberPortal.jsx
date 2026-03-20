import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const ROLE_STYLE = {
  admin:       ['#fef3c7','#92400e'],
  chairperson: ['#dbeafe','#1e40af'],
  treasurer:   ['#d1fae5','#065f46'],
  secretary:   ['#ede9fe','#4c1d95'],
  member:      ['#f1f5f9','#374151']
}

const STATUS_STYLE = {
  paid:    { bg: '#f0fdf4', color: '#16a34a', label: '✅ Fully Paid' },
  partial: { bg: '#eff6ff', color: '#1d4ed8', label: '⏳ Partial'   },
  pending: { bg: '#fef3c7', color: '#d97706', label: '🕐 Pending'   },
  overdue: { bg: '#fef2f2', color: '#dc2626', label: '⚠️ Overdue'   },
}

export default function MemberPortal() {
  const { user, branches } = useAuth()
  const [data, setData]       = useState(null)
  const [shares, setShares]   = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('overview')
  const [schedules, setSchedules] = useState({})

  useEffect(() => {
    if (!user?.ID) return
    Promise.all([
      api.get(`/members/${user.ID}/summary`),
      api.get('/sharecapital'),
    ]).then(([summaryRes, scRes]) => {
      setData(summaryRes.data)
      // Filter share capital records that belong to this member
      const allRecords = scRes.data.records || []
      setShares(allRecords.filter(r => r.user_id === user.ID))
    }).finally(() => setLoading(false))
  }, [user])

  const loadSchedule = async (loanId) => {
    if (schedules[loanId]) {
      setSchedules(prev => ({ ...prev, [loanId]: prev[loanId] === 'hide' ? null : 'hide' }))
      return
    }
    const res = await api.get(`/loans/${loanId}/schedule`)
    setSchedules(prev => ({ ...prev, [loanId]: res.data.schedule }))
  }

  const [rbg, rc] = ROLE_STYLE[user?.role] || ROLE_STYLE.member

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading your account...</div>
  if (!data) return null

  const activeLoans  = data.loans?.filter(l => l.status === 'active') || []
  const unpaidFines  = data.fines?.filter(f => f.status === 'unpaid') || []
  const totalSharesPaid    = shares.reduce((s, r) => s + Number(r.amount_paid || 0), 0)
  const totalSharesDue     = shares.reduce((s, r) => s + Number(r.amount || 0), 0)
  const totalSharesPending = totalSharesDue - totalSharesPaid
  const hasPendingShares   = shares.some(r => r.payment_status !== 'paid')

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>

      {/* ── Profile Card ── */}
      <div style={{ background: 'linear-gradient(135deg, #1a6b3c, #134d2c)', borderRadius: 16, padding: '24px 28px', color: 'white', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{user?.name}</div>
            <div style={{ opacity: 0.85, marginTop: 4 }}>🏦 {user?.account_number}</div>
            <div style={{ opacity: 0.7, fontSize: 13, marginTop: 2 }}>📱 {user?.phone}</div>
            {user?.id_number && <div style={{ opacity: 0.7, fontSize: 13 }}>🪪 {user.id_number}</div>}
            {user?.email    && <div style={{ opacity: 0.7, fontSize: 13 }}>✉️ {user.email}</div>}
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 10, fontWeight: 600,
                background: user?.membership_type === 'sacco_only' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.2)',
                color: 'white' }}>
                {user?.membership_type === 'sacco_only' ? '🏛 SACCO Only' : '🔄 SACCO + Table Banking'}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: rbg, color: rc, marginBottom: 8 }}>
              {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {branches.map(b => (
                <span key={b.ID} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  {b.type === 'sacco' ? '🏦' : '💼'} {b.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {unpaidFines.length > 0 && (
          <div style={{ marginTop: 14, background: 'rgba(220,38,38,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
            ⚠️ You have {unpaidFines.length} unpaid fine(s) totalling KES {data.total_fines?.toLocaleString()} — will be deducted from your next contribution.
          </div>
        )}
        {activeLoans.length > 0 && (
          <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
            💳 Next loan payment: <strong>KES {activeLoans[0]?.monthly_payment?.toLocaleString()}</strong> due {new Date(activeLoans[0]?.due_at).toLocaleDateString('en-KE')}
          </div>
        )}
        {hasPendingShares && (
          <div style={{ marginTop: 8, background: 'rgba(124,58,237,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
            📈 You have unpaid share installments totalling <strong>KES {totalSharesPending.toLocaleString()}</strong> — contact your treasurer to pay.
          </div>
        )}
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          ['Total Savings',  `KES ${data.total_contributions?.toLocaleString()}`, '#f0fdf4', '#16a34a'],
          ['Loan Balance',   `KES ${data.total_loan_balance?.toLocaleString()}`,  '#fffbeb', '#d97706'],
          ['Unpaid Fines',   `KES ${data.total_fines?.toLocaleString()}`,          '#fef2f2', '#dc2626'],
          ['Welfare Paid',   `KES ${data.total_welfare?.toLocaleString()}`,         '#fdf2f8', '#db2777'],
          ['Shares Paid In', `KES ${totalSharesPaid.toLocaleString()}`,             '#f5f3ff', '#7c3aed'],
        ].map(([l, v, bg, c]) => (
          <div key={l} style={{ background: bg, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          ['overview',      '🏠 Overview'],
          ['contributions', '💰 Savings'],
          ['loans',         '🏦 Loans'],
          ['shares',        '📈 Shares'],
          ['fines',         '⚠️ Fines'],
          ['meetings',      '📅 Meetings'],
        ].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: tab === t ? 600 : 400,
              background: tab === t ? '#1a6b3c' : '#f1f5f9',
              color: tab === t ? 'white' : '#374151' }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <>
            {/* Active loan progress */}
            {activeLoans.map(l => (
              <div key={l.ID} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>🏦 Active Loan · {l.branch_name || 'General'}</span>
                  <span style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>KES {l.balance?.toLocaleString()} remaining</span>
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                  Monthly: <strong style={{ color: '#1a6b3c' }}>KES {l.monthly_payment?.toLocaleString()}</strong> ·
                  Due: {new Date(l.due_at).toLocaleDateString('en-KE')} ·
                  {l.interest_rate}% {l.interest_period === 'annual' ? 'p.a.' : 'p.m.'} {l.interest_type}
                </div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min((l.total_paid / l.total_due) * 100, 100)}%`, background: '#1a6b3c', borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{Math.round((l.total_paid / l.total_due) * 100)}% repaid</div>
              </div>
            ))}

            {/* Share capital snapshot */}
            {shares.length > 0 && (
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>📈 Your Share Capital</div>
                {shares.map(r => {
                  const progress = r.amount > 0 ? Math.min((r.amount_paid / r.amount) * 100, 100) : 0
                  const st = STATUS_STYLE[r.payment_status] || STATUS_STYLE.pending
                  return (
                    <div key={r.ID} style={{ marginBottom: 12, background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{r.shares} share{r.shares !== 1 ? 's' : ''} @ KES {Number(r.share_price).toLocaleString()}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: st.bg, color: st.color, fontWeight: 600 }}>{st.label}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12, marginBottom: 8 }}>
                        <div><span style={{ color: '#94a3b8' }}>Total due</span><br /><strong>KES {Number(r.amount).toLocaleString()}</strong></div>
                        <div><span style={{ color: '#94a3b8' }}>Paid</span><br /><strong style={{ color: '#16a34a' }}>KES {Number(r.amount_paid).toLocaleString()}</strong></div>
                        <div><span style={{ color: '#94a3b8' }}>Balance</span><br /><strong style={{ color: r.amount - r.amount_paid > 0 ? '#d97706' : '#16a34a' }}>KES {Number(r.amount - r.amount_paid).toLocaleString()}</strong></div>
                      </div>
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: r.payment_status === 'overdue' ? '#dc2626' : r.payment_status === 'paid' ? '#16a34a' : '#7c3aed', borderRadius: 3 }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        <span>{Math.round(progress)}% paid</span>
                        {r.payment_status !== 'paid' && (
                          <span style={{ color: r.payment_status === 'overdue' ? '#dc2626' : '#64748b' }}>
                            Deadline: {new Date(r.installment_deadline).toLocaleDateString('en-KE')}
                            {r.payment_status === 'overdue' && ' · OVERDUE'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Recent contributions */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Recent Savings
            </div>
            {data.contributions?.length === 0
              ? <p style={{ padding: '16px 20px', color: '#94a3b8', fontSize: 14 }}>No contributions yet.</p>
              : data.contributions?.slice(0, 5).map(c => (
                <div key={c.ID} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid #f8fafc', fontSize: 14 }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>{c.period}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>{c.branch_name || 'General'}</span>
                    {c.type === 'tb_contribution' && <span style={{ fontSize: 11, marginLeft: 6, padding: '1px 6px', borderRadius: 8, background: '#eff6ff', color: '#1d4ed8' }}>TB</span>}
                    {c.type === 'sacco_savings' && <span style={{ fontSize: 11, marginLeft: 6, padding: '1px 6px', borderRadius: 8, background: '#f0fdf4', color: '#16a34a' }}>SACCO</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: '#1a6b3c' }}>KES {c.amount?.toLocaleString()}</div>
                    {c.fines_deducted > 0 && <div style={{ fontSize: 11, color: '#dc2626' }}>-KES {c.fines_deducted} fines</div>}
                  </div>
                </div>
              ))
            }
          </>
        )}

        {/* ── Contributions / Savings ── */}
        {tab === 'contributions' && (
          data.contributions?.length === 0
            ? <p style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No savings records yet.</p>
            : <>
              {/* Summary strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                {[
                  ['Total Gross',      data.contributions?.reduce((s, c) => s + c.amount, 0),          '#f0fdf4', '#1a6b3c'],
                  ['Fines Deducted',   data.contributions?.reduce((s, c) => s + (c.fines_deducted || 0), 0), '#fef2f2', '#dc2626'],
                  ['Net Saved',        data.contributions?.reduce((s, c) => s + (c.net_amount || 0), 0),    '#eff6ff', '#1d4ed8'],
                ].map(([l, v, bg, c]) => (
                  <div key={l} style={{ background: bg, borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{l}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: c }}>KES {Number(v || 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              {data.contributions?.map(c => (
                <div key={c.ID} style={{ padding: '12px 20px', borderBottom: '1px solid #f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {c.period}
                        {c.type === 'tb_contribution' && <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 8, background: '#eff6ff', color: '#1d4ed8' }}>Table Banking</span>}
                        {c.type === 'sacco_savings'   && <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 8, background: '#f0fdf4', color: '#16a34a' }}>SACCO Savings</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>
                        {new Date(c.paid_at).toLocaleDateString('en-KE')}
                        {c.branch_name && ` · ${c.branch_name}`}
                        {c.notes && ` · ${c.notes}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#1a6b3c' }}>KES {c.amount?.toLocaleString()}</div>
                      {c.fines_deducted > 0 && <div style={{ fontSize: 11, color: '#dc2626' }}>Fines: -KES {c.fines_deducted?.toLocaleString()}</div>}
                      {c.fines_deducted > 0 && <div style={{ fontSize: 11, color: '#64748b' }}>Net: KES {c.net_amount?.toLocaleString()}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </>
        )}

        {/* ── Loans ── */}
        {tab === 'loans' && (
          data.loans?.length === 0
            ? <p style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No loans.</p>
            : data.loans?.map(l => (
              <div key={l.ID} style={{ padding: '14px 20px', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>KES {l.amount?.toLocaleString()}</span>
                  <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 10, fontWeight: 600,
                    background: l.status === 'cleared' ? '#f0fdf4' : l.status === 'defaulted' ? '#fef2f2' : '#fef3c7',
                    color:      l.status === 'cleared' ? '#16a34a' : l.status === 'defaulted' ? '#dc2626' : '#92400e' }}>
                    {l.status}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 13, color: '#64748b', marginBottom: 10 }}>
                  <span>Monthly: <strong style={{ color: '#374151' }}>KES {l.monthly_payment?.toLocaleString()}</strong></span>
                  <span>Balance: <strong style={{ color: '#d97706' }}>KES {l.balance?.toLocaleString()}</strong></span>
                  <span>Rate: {l.interest_rate}% {l.interest_period === 'annual' ? 'p.a.' : 'p.m.'} {l.interest_type}</span>
                  <span>Due: {new Date(l.due_at).toLocaleDateString('en-KE')}</span>
                  <span>Issued: {new Date(l.issued_at).toLocaleDateString('en-KE')}</span>
                  <span>Branch: {l.branch_name || 'General'}</span>
                </div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${Math.min((l.total_paid / l.total_due) * 100, 100)}%`, background: '#1a6b3c', borderRadius: 3 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
                  <span>{Math.round((l.total_paid / l.total_due) * 100)}% repaid</span>
                  <span>KES {l.total_paid?.toLocaleString()} of KES {l.total_due?.toLocaleString()}</span>
                </div>
                <button onClick={() => loadSchedule(l.ID)}
                  style={{ padding: '5px 14px', background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  {schedules[l.ID] && schedules[l.ID] !== 'hide' ? '▲ Hide Schedule' : '▼ View Repayment Schedule'}
                </button>

                {schedules[l.ID] && schedules[l.ID] !== 'hide' && (
                  <div style={{ overflowX: 'auto', marginTop: 10 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['#', 'Due Date', 'Payment', 'Principal', 'Interest', 'Balance', 'Status'].map(h => (
                            <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {schedules[l.ID].map(row => (
                          <tr key={row.month} style={{
                            background: row.status === 'paid' ? '#f0fdf4' : row.status === 'missed' ? '#fef2f2' : row.status === 'partial' ? '#fffbeb' : 'white',
                            borderBottom: '1px solid #f1f5f9'
                          }}>
                            <td style={{ padding: '6px 10px' }}>{row.month}</td>
                            <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{new Date(row.due_date).toLocaleDateString('en-KE')}</td>
                            <td style={{ padding: '6px 10px', fontWeight: 600 }}>KES {Number(row.payment).toLocaleString()}</td>
                            <td style={{ padding: '6px 10px' }}>KES {Number(row.principal).toLocaleString()}</td>
                            <td style={{ padding: '6px 10px' }}>KES {Number(row.interest).toLocaleString()}</td>
                            <td style={{ padding: '6px 10px' }}>KES {Number(row.closing_balance).toLocaleString()}</td>
                            <td style={{ padding: '6px 10px' }}>
                              <span style={{ fontWeight: 600,
                                color: row.status === 'paid' ? '#16a34a' : row.status === 'missed' ? '#dc2626' : row.status === 'partial' ? '#d97706' : '#94a3b8' }}>
                                {row.status}
                                {row.amount_paid > 0 && row.status !== 'paid' && ` (KES ${Number(row.amount_paid).toLocaleString()} paid)`}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
        )}

        {/* ── Share Capital ── */}
        {tab === 'shares' && (
          shares.length === 0
            ? <p style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No share capital records yet. Contact your treasurer.</p>
            : <>
              {/* Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                {[
                  ['Total Committed', totalSharesDue,     '#f5f3ff', '#7c3aed'],
                  ['Total Paid In',   totalSharesPaid,    '#f0fdf4', '#16a34a'],
                  ['Balance Due',     totalSharesPending, '#fef3c7', '#d97706'],
                ].map(([l, v, bg, c]) => (
                  <div key={l} style={{ background: bg, borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{l}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: c }}>KES {Number(v).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              {shares.map(r => {
                const progress = r.amount > 0 ? Math.min((r.amount_paid / r.amount) * 100, 100) : 0
                const st = STATUS_STYLE[r.payment_status] || STATUS_STYLE.pending
                const deadline = new Date(r.installment_deadline)
                const daysLeft = Math.max(0, Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24)))
                return (
                  <div key={r.ID} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {r.shares} share{r.shares !== 1 ? 's' : ''} @ KES {Number(r.share_price).toLocaleString()} each
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                          Purchased {new Date(r.CreatedAt).toLocaleDateString('en-KE')}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color, fontWeight: 600 }}>
                        {st.label}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                      <div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 10px' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Total Due</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>KES {Number(r.amount).toLocaleString()}</div>
                      </div>
                      <div style={{ background: '#f0fdf4', borderRadius: 6, padding: '8px 10px' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Paid</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>KES {Number(r.amount_paid).toLocaleString()}</div>
                      </div>
                      <div style={{ background: r.amount - r.amount_paid > 0 ? '#fef3c7' : '#f0fdf4', borderRadius: 6, padding: '8px 10px' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Balance</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: r.amount - r.amount_paid > 0 ? '#d97706' : '#16a34a' }}>
                          {r.amount - r.amount_paid > 0 ? `KES ${Number(r.amount - r.amount_paid).toLocaleString()}` : '✅ Cleared'}
                        </div>
                      </div>
                    </div>

                    <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${progress}%`, borderRadius: 4,
                        background: r.payment_status === 'overdue' ? '#dc2626' : r.payment_status === 'paid' ? '#16a34a' : '#7c3aed' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                      <span>{Math.round(progress)}% paid</span>
                      {r.payment_status !== 'paid' && (
                        <span style={{ color: r.payment_status === 'overdue' ? '#dc2626' : '#64748b' }}>
                          Deadline: {deadline.toLocaleDateString('en-KE')}
                          {r.payment_status !== 'overdue' && daysLeft > 0 && ` · ${daysLeft} days left`}
                          {r.payment_status === 'overdue' && ' · OVERDUE — contact treasurer'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
        )}

        {/* ── Fines ── */}
        {tab === 'fines' && (
          data.fines?.length === 0
            ? <p style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No fines. Keep it up! 🎉</p>
            : <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                {[
                  ['Unpaid', data.fines?.filter(f => f.status === 'unpaid').reduce((s, f) => s + f.amount, 0), '#fef2f2', '#dc2626'],
                  ['Paid',   data.fines?.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0),   '#f0fdf4', '#16a34a'],
                  ['Waived', data.fines?.filter(f => f.status === 'waived').length,                             '#f5f3ff', '#7c3aed'],
                ].map(([l, v, bg, c]) => (
                  <div key={l} style={{ background: bg, borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{l}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: c }}>{l === 'Waived' ? v : `KES ${Number(v || 0).toLocaleString()}`}</div>
                  </div>
                ))}
              </div>
              {data.fines?.map(f => (
                <div key={f.ID} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f8fafc' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{f.reason}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      {f.period && `${f.period} · `}
                      <span style={{ textTransform: 'capitalize' }}>{f.type}</span> fine
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: f.status === 'paid' ? '#16a34a' : f.status === 'waived' ? '#7c3aed' : '#dc2626' }}>
                      KES {f.amount?.toLocaleString()}
                    </div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                      background: f.status === 'paid' ? '#f0fdf4' : f.status === 'waived' ? '#f5f3ff' : '#fef2f2',
                      color: f.status === 'paid' ? '#16a34a' : f.status === 'waived' ? '#7c3aed' : '#dc2626' }}>
                      {f.status}
                    </span>
                  </div>
                </div>
              ))}
            </>
        )}

        {/* ── Meetings ── */}
        {tab === 'meetings' && (
          <>
            {/* Upcoming meetings */}
            {(() => {
              const upcoming = (data.meetings || []).filter(m => m.status === 'scheduled')
              if (upcoming.length > 0) return (
                <>
                  <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    📅 Upcoming Meetings
                  </div>
                  {upcoming.map(m => (
                    <div key={m.ID} style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: '#f0fdf4' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</div>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                        📅 {new Date(m.scheduled_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                        {m.location && ` · 📍 ${m.location}`}
                      </div>
                      {m.agenda && (
                        <div style={{ fontSize: 13, color: '#374151', marginTop: 8, background: 'white', borderRadius: 6, padding: '8px 12px', whiteSpace: 'pre-wrap' }}>
                          <strong>Agenda:</strong> {m.agenda}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        {[
                          [`❌ Absent fine: KES ${m.fine_absent || 0}`, '#fef2f2', '#dc2626'],
                          [`🙏 Apology fine: KES ${m.fine_absent_apology || 0}`, '#fef3c7', '#d97706'],
                          [`⏰ Late fine: KES ${m.fine_late || 0}`, '#fff7ed', '#c2410c'],
                        ].map(([label, bg, color]) => (
                          <span key={label} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: bg, color, fontWeight: 600 }}>{label}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )
            })()}

            {/* Attendance stats */}
            {data.attendance?.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                {[
                  ['Present', data.attendance?.filter(a => a.status === 'present').length,       '#f0fdf4', '#16a34a'],
                  ['Late',    data.attendance?.filter(a => a.status === 'late').length,           '#fff7ed', '#c2410c'],
                  ['Apology', data.attendance?.filter(a => a.status === 'absent_apology').length, '#fffbeb', '#d97706'],
                  ['Absent',  data.attendance?.filter(a => a.status === 'absent').length,         '#fef2f2', '#dc2626'],
                ].map(([l, v, bg, c]) => (
                  <div key={l} style={{ background: bg, borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{l}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: c }}>{v || 0}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Past meetings with minutes + my attendance */}
            {(() => {
              const past = (data.meetings || []).filter(m => m.status === 'completed')
              if (past.length === 0 && data.attendance?.length === 0) {
                return <p style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No meeting records yet.</p>
              }
              return past.map(m => {
                // Find this member's attendance for this meeting
                const myAttendance = data.attendance?.find(a => a.meeting_id === m.ID)

                // Parse minutes
                let minutesItems = []
                if (m.minutes) {
                  try {
                    const parsed = JSON.parse(m.minutes)
                    if (Array.isArray(parsed)) minutesItems = parsed
                  } catch {
                    minutesItems = [{ title: 'Minutes', content: m.minutes }]
                  }
                }

                return (
                  <div key={m.ID} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                            {new Date(m.scheduled_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
                            {m.location && ` · 📍 ${m.location}`}
                          </div>
                        </div>
                        {myAttendance && (
                          <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            background: myAttendance.status === 'present' ? '#f0fdf4' : myAttendance.status === 'late' ? '#fff7ed' : myAttendance.status === 'absent_apology' ? '#fef3c7' : '#fef2f2',
                            color:      myAttendance.status === 'present' ? '#16a34a' : myAttendance.status === 'late' ? '#c2410c' : myAttendance.status === 'absent_apology' ? '#92400e' : '#dc2626' }}>
                            {myAttendance.status === 'present' ? '✅ Present' : myAttendance.status === 'late' ? '⏰ Late' : myAttendance.status === 'absent_apology' ? '🙏 Absent (apology)' : '❌ Absent'}
                            {myAttendance.fine_amount > 0 && ` · KES ${myAttendance.fine_amount?.toLocaleString()} fine`}
                          </span>
                        )}
                      </div>

                      {/* Attendance summary */}
                      {m.attendance?.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                          {[
                            [m.attendance.filter(a => a.status === 'present').length,       '✅ present', '#f0fdf4', '#16a34a'],
                            [m.attendance.filter(a => a.status === 'late').length,           '⏰ late',    '#fff7ed', '#c2410c'],
                            [m.attendance.filter(a => a.status === 'absent_apology').length, '🙏 apology', '#fffbeb', '#d97706'],
                            [m.attendance.filter(a => a.status === 'absent').length,         '❌ absent',  '#fef2f2', '#dc2626'],
                          ].filter(([count]) => count > 0).map(([count, label, bg, color]) => (
                            <span key={label} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: bg, color, fontWeight: 600 }}>
                              {count} {label}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Minutes */}
                      {minutesItems.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>📝 Meeting Minutes</div>
                          {minutesItems.map((item, idx) => (
                            <div key={idx} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 8, border: '1px solid #e2e8f0' }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                                {idx + 1}. {item.title}
                              </div>
                              <div style={{ fontSize: 13, color: '#64748b', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                {item.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            })()}
          </>
        )}
      </div>
    </div>
  )
}