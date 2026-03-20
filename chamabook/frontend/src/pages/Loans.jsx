import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import BranchTabs from '../components/BranchTabs'
import api from '../services/api'

function MemberSearch({ members, value, onChange, placeholder = 'Search member...' }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const selected = members.find(m => m.ID === Number(value))
  const filtered = members.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.account_number?.includes(search) || m.phone?.includes(search)
  )
  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => setOpen(!open)}
        style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, cursor: 'pointer', background: 'white', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: selected ? '#374151' : '#94a3b8' }}>
          {selected ? `${selected.name} (${selected.account_number})` : placeholder}
        </span>
        <span>▼</span>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 50, maxHeight: 250, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <input autoFocus placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px', border: 'none', borderBottom: '1px solid #f1f5f9', outline: 'none', fontSize: 14 }} />
          <div style={{ overflowY: 'auto', maxHeight: 200 }}>
            {filtered.map(m => (
              <div key={m.ID} onClick={() => { onChange(m.ID); setOpen(false); setSearch('') }}
                style={{ padding: '10px 12px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #f8fafc', background: value === m.ID ? '#f0fdf4' : 'white' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = value === m.ID ? '#f0fdf4' : 'white'}>
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

const printLoanSchedule = (loan, schedule) => {
  const win = window.open('', '_blank')
  const interestLabel = `${loan.interest_rate}% ${loan.interest_period === 'annual' ? 'p.a.' : 'p.m.'} ${loan.interest_type}`
  const rows = schedule.map(row => `
    <tr>
      <td>${row.month}</td>
      <td>${new Date(row.due_date).toLocaleDateString('en-KE')}</td>
      <td>KES ${Number(row.opening_balance).toLocaleString()}</td>
      <td>KES ${Number(row.principal).toLocaleString()}</td>
      <td>KES ${Number(row.interest).toLocaleString()}</td>
      <td><strong>KES ${Number(row.payment).toLocaleString()}</strong></td>
      <td>KES ${Number(row.closing_balance).toLocaleString()}</td>
      <td style="color:${row.status==='paid'?'#16a34a':row.status==='missed'?'#dc2626':row.status==='partial'?'#d97706':'#374151'}">
        ${row.status}${row.amount_paid>0&&row.status!=='paid'?` (KES ${Number(row.amount_paid).toLocaleString()} paid)`:''}
      </td>
    </tr>`).join('')
  win.document.write(`<!DOCTYPE html><html><head><title>Loan Schedule — ${loan.user?.name}</title>
    <style>body{font-family:Arial,sans-serif;max-width:900px;margin:30px auto;color:#1e293b;font-size:13px}
    h1{color:#1a6b3c;font-size:18px;border-bottom:2px solid #1a6b3c;padding-bottom:8px}
    .meta{color:#64748b;font-size:12px;margin-bottom:16px}.summary{display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap}
    .box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 20px;text-align:center}
    .box .val{font-size:18px;font-weight:700;color:#166534}.box .lbl{font-size:11px;color:#64748b;margin-top:2px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th{background:#f0fdf4;color:#166534;padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase}
    td{padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:13px}
    tr:nth-child(even) td{background:#fafafa}@media print{body{margin:10px}}</style>
    </head><body>
    <h1>🌱 ChamaBook — Loan Repayment Schedule</h1>
    <p class="meta">Member: <strong>${loan.user?.name}</strong> · Account: <strong>${loan.user?.account_number}</strong> · Branch: <strong>${loan.branch_name||'General'}</strong> · Generated: ${new Date().toLocaleDateString('en-KE',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
    <div class="summary">
      <div class="box"><div class="val">KES ${Number(loan.amount).toLocaleString()}</div><div class="lbl">Principal</div></div>
      <div class="box"><div class="val">${interestLabel}</div><div class="lbl">Interest</div></div>
      <div class="box"><div class="val">${loan.term_months} months</div><div class="lbl">Term</div></div>
      <div class="box"><div class="val">KES ${Number(loan.monthly_payment).toLocaleString()}</div><div class="lbl">Monthly</div></div>
      <div class="box"><div class="val">KES ${Number(loan.total_due).toLocaleString()}</div><div class="lbl">Total Due</div></div>
      <div class="box"><div class="val">KES ${Number(loan.balance).toLocaleString()}</div><div class="lbl">Balance</div></div>
    </div>
    <table><thead><tr><th>#</th><th>Due Date</th><th>Opening</th><th>Principal</th><th>Interest</th><th>Payment</th><th>Closing</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`)
  win.document.close(); win.focus()
  setTimeout(() => { win.print(); win.close() }, 600)
}

const APPROVAL_ROLES = ['secretary', 'chairperson', 'vice_chairperson', 'admin']

// Summary card component — shows loaned/repaid/outstanding with progress bar
const SummaryCard = ({ title, loaned, repaid, outstanding, color, lightColor }) => {
  const p = loaned > 0 ? Math.min(Math.round((repaid / loaned) * 100), 100) : 0
  return (
    <div style={{ background: lightColor, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color }}>
        KES {Number(loaned || 0).toLocaleString()}
      </div>
      <div style={{ marginTop: 8, display: 'grid', gap: 3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: '#64748b' }}>Repaid</span>
          <strong style={{ color: '#16a34a' }}>KES {Number(repaid || 0).toLocaleString()}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: '#64748b' }}>Outstanding</span>
          <strong style={{ color: '#d97706' }}>KES {Number(outstanding || 0).toLocaleString()}</strong>
        </div>
      </div>
      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
        <div style={{ height: '100%', width: `${p}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
        {loaned > 0 ? `${p}% repaid` : 'No active loans'}
      </div>
    </div>
  )
}

export default function Loans() {
  const { user, isTreasurerOrAbove, isChairpersonOrAbove, isAdmin, branches } = useAuth()
  const [loans, setLoans]       = useState([])
  const [summary, setSummary]   = useState({ sacco: {}, table_banking: {} })
  const [members, setMembers]   = useState([])
  const [shareCapitalSummaries, setShareCapitalSummaries] = useState([])
  const [branchFilter, setBranchFilter] = useState(0)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch]     = useState('')
  const [showIssue, setShowIssue]       = useState(false)
  const [showRepay, setShowRepay]       = useState(false)
  const [showSchedule, setShowSchedule] = useState(null)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [showApprove, setShowApprove]   = useState(null)
  const [schedule, setSchedule]         = useState([])
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [eligibility, setEligibility] = useState(null)
  const [approveForm, setApproveForm] = useState({ action: 'approved', notes: '' })
  const [loanForm, setLoanForm] = useState({
    user_id: '', branch_id: '', amount: '',
    interest_rate: '10', interest_type: 'flat',
    interest_period: 'monthly', term_months: '12'
  })
  const [repayForm, setRepayForm] = useState({ amount: '', notes: '' })

  useEffect(() => {
    fetchLoans()
    api.get('/members').then(r => setMembers(r.data.members || []))
    api.get('/sharecapital').then(r => setShareCapitalSummaries(r.data.summaries || []))
  }, [branchFilter])

  const fetchLoans = async () => {
    setLoading(true)
    try {
      const params = branchFilter ? `?branch_id=${branchFilter}` : ''
      const res = await api.get(`/loans${params}`)
      setLoans(res.data.loans || [])
      setSummary(res.data.summary || { sacco: {}, table_banking: {} })
    } finally { setLoading(false) }
  }

  const loadSchedule = async (loan) => {
    setShowSchedule(loan)
    const res = await api.get(`/loans/${loan.ID}/schedule`)
    setSchedule(res.data.schedule || [])
  }

  const checkEligibility = (userId) => {
    if (!userId) { setEligibility(null); return }
    const member = members.find(m => m.ID === Number(userId))
    if (!member) { setEligibility(null); return }
    const sc = shareCapitalSummaries.find(s => s.user_id === Number(userId))
    const netShares = sc?.net_shares || 0
    const joinedDate = new Date(member.CreatedAt)
    const daysAsMember = Math.floor((Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24))
    const meetsTime = daysAsMember >= 90
    const meetsShares = netShares > 0
    setEligibility({
      daysAsMember, netShares, meetsTime, meetsShares,
      eligible: meetsTime && meetsShares,
      memberName: member.name,
      eligibleOn: new Date(joinedDate.getTime() + 90*24*60*60*1000).toLocaleDateString('en-KE'),
    })
  }

  const previewPayment = () => {
    const a = Number(loanForm.amount), r = Number(loanForm.interest_rate), t = Number(loanForm.term_months)
    if (!a || !t) return null
    const effectiveRate = loanForm.interest_period === 'annual' ? r / 12 : r
    let total, monthly
    if (loanForm.interest_type === 'reducing') {
      const mr = effectiveRate / 100
      if (mr === 0) { monthly = a / t; total = a } else {
        monthly = a * mr * Math.pow(1+mr,t) / (Math.pow(1+mr,t)-1)
        total = monthly * t
      }
    } else {
      total = a + a * (effectiveRate/100) * t
      monthly = total / t
    }
    return { total: Math.round(total), monthly: Math.round(monthly) }
  }

  const submitLoan = async () => {
    try {
      await api.post('/loans', {
        user_id: Number(loanForm.user_id), branch_id: Number(loanForm.branch_id),
        amount: Number(loanForm.amount), interest_rate: Number(loanForm.interest_rate),
        interest_type: loanForm.interest_type, interest_period: loanForm.interest_period,
        term_months: Number(loanForm.term_months)
      })
      setShowIssue(false); setShowConfirm(false); setEligibility(null)
      setLoanForm({ user_id:'', branch_id:'', amount:'', interest_rate:'10', interest_type:'flat', interest_period:'monthly', term_months:'12' })
      fetchLoans()
    } catch (e) {
      setShowConfirm(false)
      setError(e.response?.data || { message: 'Failed to issue loan' })
    }
  }

  const handleIssueLoan = async () => {
    setError(null)
    if (!loanForm.user_id) return setError({ message: 'Please select a member' })
    if (!loanForm.branch_id) return setError({ message: 'Please select a branch' })
    if (!loanForm.amount) return setError({ message: 'Please enter a loan amount' })
    if (eligibility && !eligibility.eligible && (isChairpersonOrAbove || isAdmin)) {
      setShowConfirm(true); return
    }
    await submitLoan()
  }

  const handleApprove = async () => {
    setError(null)
    try {
      await api.post(`/loans/${showApprove.ID}/approve`, approveForm)
      setShowApprove(null)
      setApproveForm({ action: 'approved', notes: '' })
      fetchLoans()
    } catch (e) { setError({ message: e.response?.data?.error || 'Failed' }) }
  }

  const handleRepayment = async () => {
    setError(null)
    if (!repayForm.amount) return setError({ message: 'Amount is required' })
    try {
      const res = await api.post('/loans/repayment', {
        loan_id: selectedLoan.ID, amount: Number(repayForm.amount), notes: repayForm.notes
      })
      setShowRepay(false); setRepayForm({ amount:'', notes:'' }); fetchLoans()
      if (showSchedule?.ID === selectedLoan.ID) {
        setSchedule(res.data.schedule || []); setShowSchedule(res.data.loan)
      }
    } catch (e) { setError({ message: e.response?.data?.error || 'Failed' }) }
  }

  const filteredLoans = useMemo(() => {
    let result = loans
    if (statusFilter !== 'all') result = result.filter(l => l.status === statusFilter)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(l =>
        l.user?.name?.toLowerCase().includes(s) ||
        l.user?.account_number?.includes(s) ||
        String(l.amount).includes(s) ||
        l.branch_name?.toLowerCase().includes(s)
      )
    }
    return result
  }, [loans, statusFilter, search])

  const canUserApprove = APPROVAL_ROLES.includes(user?.role)
  const pendingCount   = loans.filter(l => l.status === 'pending').length
  const preview        = previewPayment()

  const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:14, boxSizing:'border-box' }
  const lbl = { fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:3 }

  const statusColors = {
    pending:   ['#f3f4f6', '#374151'],
    active:    ['#fef3c7', '#92400e'],
    cleared:   ['#f0fdf4', '#166534'],
    rejected:  ['#fef2f2', '#dc2626'],
    defaulted: ['#fef2f2', '#dc2626'],
  }
  const scheduleColors = { paid:'#f0fdf4', partial:'#fffbeb', missed:'#fef2f2', upcoming:'white' }
  const scheduleText   = { paid:'#16a34a', partial:'#d97706', missed:'#dc2626', upcoming:'#374151' }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>🏦 Loans</h2>
        {isTreasurerOrAbove && (
          <button onClick={() => { setError(null); setEligibility(null); setShowIssue(true) }}
            style={{ padding:'9px 20px', background:'#1a6b3c', color:'white', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer', fontSize:14 }}>
            + Initiate Loan
          </button>
        )}
      </div>

      {/* Summary cards — active loans only, cleared excluded */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12, marginBottom:20 }}>
        <SummaryCard
          title="🏦 SACCO Active Loans"
          loaned={summary.sacco?.total_loaned || 0}
          repaid={summary.sacco?.total_repaid || 0}
          outstanding={summary.sacco?.total_balance || 0}
          color="#1a6b3c"
          lightColor="#f0fdf4"
        />
        <SummaryCard
          title="💼 Table Banking Active Loans"
          loaned={summary.table_banking?.total_loaned || 0}
          repaid={summary.table_banking?.total_repaid || 0}
          outstanding={summary.table_banking?.total_balance || 0}
          color="#1d4ed8"
          lightColor="#eff6ff"
        />
        <SummaryCard
          title="📊 Total Active Portfolio"
          loaned={summary.total_loaned || 0}
          repaid={summary.total_repaid || 0}
          outstanding={summary.total_balance || 0}
          color="#374151"
          lightColor="#f8fafc"
        />
        <div style={{ background: pendingCount > 0 ? '#fef3c7' : '#f8fafc', borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
          <div style={{ fontSize:11, color:'#64748b', marginBottom:4, fontWeight:600 }}>⏳ Pending Approval</div>
          <div style={{ fontSize:32, fontWeight:700, color: pendingCount > 0 ? '#d97706' : '#94a3b8' }}>
            {pendingCount}
          </div>
          <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
            {pendingCount === 0 ? 'All clear ✅' : `${pendingCount} loan${pendingCount !== 1 ? 's' : ''} awaiting review`}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <input placeholder="🔍 Search by name, account, amount, branch..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inp, maxWidth:320, flex:1 }} />
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[['all','All'], ['pending','⏳ Pending'], ['active','Active'], ['cleared','Cleared'], ['rejected','Rejected']].map(([s,l]) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12,
                fontWeight: statusFilter===s ? 600 : 400,
                background: statusFilter===s ? '#1a6b3c' : '#f1f5f9',
                color: statusFilter===s ? 'white' : '#374151' }}>
              {l} {s !== 'all' && `(${loans.filter(x => x.status === s).length})`}
            </button>
          ))}
        </div>
      </div>

      <BranchTabs selected={branchFilter} onChange={setBranchFilter} />

      {loading ? <p>Loading...</p> : (
        <div style={{ display:'grid', gap:14 }}>
          {filteredLoans.length === 0 && (
            <p style={{ textAlign:'center', color:'#94a3b8', padding:32 }}>No loans found.</p>
          )}
          {filteredLoans.map(loan => {
            const [sbg, sc] = statusColors[loan.status] || statusColors.active
            const progress = loan.total_due > 0 ? Math.min((loan.total_paid/loan.total_due)*100,100) : 0
            const interestLabel = `${loan.interest_rate}% ${loan.interest_period==='annual'?'p.a.':'p.m.'} ${loan.interest_type}`
            const approvedCount = loan.approvals?.filter(a => a.action === 'approved').length || 0
            const alreadyActioned = loan.approvals?.some(a => a.approver_id === user?.ID)
            const canApproveThis = canUserApprove && loan.status === 'pending' && !alreadyActioned && loan.initiated_by !== user?.ID

            return (
              <div key={loan.ID} style={{ background:'white', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
                border: loan.status==='pending' ? '2px solid #fbbf24' : loan.status==='cleared' ? '2px solid #bbf7d0' : '2px solid transparent' }}>

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10, marginBottom:12 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15 }}>{loan.user?.name}</div>
                    <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
                      {loan.user?.account_number}
                      {loan.branch_name && (
                        <span style={{ marginLeft:8, padding:'2px 8px', borderRadius:10, fontSize:11,
                          background: loan.branch_name?.toLowerCase().includes('sacco') ? '#f0fdf4' : '#eff6ff',
                          color: loan.branch_name?.toLowerCase().includes('sacco') ? '#16a34a' : '#1d4ed8' }}>
                          {loan.branch_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, background:sbg, color:sc }}>
                      {loan.status}
                    </span>
                    {loan.status !== 'pending' && (
                      <button onClick={() => loadSchedule(loan)}
                        style={{ padding:'6px 12px', background:'#eff6ff', color:'#1d4ed8', border:'none', borderRadius:6, cursor:'pointer', fontSize:12 }}>
                        📊 Schedule
                      </button>
                    )}
                    {isTreasurerOrAbove && loan.status === 'active' && (
                      <button onClick={() => { setSelectedLoan(loan); setError(null); setShowRepay(true) }}
                        style={{ padding:'6px 14px', background:'#1a6b3c', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:12 }}>
                        + Payment
                      </button>
                    )}
                    {canApproveThis && (
                      <button onClick={() => { setShowApprove(loan); setApproveForm({ action:'approved', notes:'' }) }}
                        style={{ padding:'6px 14px', background:'#7c3aed', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600 }}>
                        ✅ Review
                      </button>
                    )}
                  </div>
                </div>

                {/* Pending approval trail */}
                {loan.status === 'pending' && (
                  <div style={{ background:'#fef3c7', borderRadius:8, padding:'10px 14px', marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#92400e', marginBottom:8 }}>
                      ⏳ Awaiting Approval — {approvedCount}/2 approvals received
                    </div>
                    <div style={{ height:6, background:'#fde68a', borderRadius:3, overflow:'hidden', marginBottom:8 }}>
                      <div style={{ height:'100%', width:`${(approvedCount/2)*100}%`, background:'#d97706', borderRadius:3 }} />
                    </div>
                    <div style={{ fontSize:12, color:'#92400e' }}>
                      <div style={{ marginBottom:4 }}>
                        📋 Initiated by: <strong>{loan.initiated_by_name || '—'}</strong>
                      </div>
                      {(loan.approvals || []).map((a, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                          <span>{a.action==='approved'?'✅':'❌'}</span>
                          <span><strong>{a.approver_name || `Approver ${i+1}`}</strong> ({a.approver_role}) — {a.action}</span>
                          {a.notes && <span style={{ color:'#64748b' }}>· "{a.notes}"</span>}
                        </div>
                      ))}
                      {approvedCount < 2 && (
                        <div style={{ marginTop:4, color:'#64748b', fontSize:11 }}>
                          Needs {2-approvedCount} more approval{2-approvedCount!==1?'s':''} from: secretary, chairperson or vice chairperson
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Approval trail — compact for approved/cleared */}
                {loan.status !== 'pending' && loan.approvals?.length > 0 && (
                  <div style={{ fontSize:11, color:'#94a3b8', marginBottom:10 }}>
                    Initiated by {loan.initiated_by_name} · Approved by {loan.approvals.filter(a=>a.action==='approved').map(a=>a.approver_name).join(', ')}
                  </div>
                )}

                {/* Loan details grid */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(110px, 1fr))', gap:10, marginBottom:12 }}>
                  {[
                    ['Principal', `KES ${Number(loan.amount).toLocaleString()}`,          '#374151'],
                    ['Monthly',   `KES ${Number(loan.monthly_payment).toLocaleString()}`, '#374151'],
                    ['Repaid',    `KES ${Number(loan.total_paid).toLocaleString()}`,       '#16a34a'],
                    ['Balance',   `KES ${Number(loan.balance).toLocaleString()}`,          loan.status==='cleared'?'#16a34a':'#d97706'],
                    ['Due',       new Date(loan.due_at).toLocaleDateString('en-KE'),       '#374151'],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ background:'#f8fafc', borderRadius:8, padding:'8px 12px' }}>
                      <div style={{ fontSize:11, color:'#94a3b8' }}>{label}</div>
                      <div style={{ fontSize:13, fontWeight:600, color }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar — all statuses except pending */}
                {loan.status !== 'pending' && (
                  <>
                    <div style={{ height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${progress}%`,
                        background: loan.status==='cleared' ? '#16a34a' : '#1a6b3c', borderRadius:3 }} />
                    </div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
                      {Math.round(progress)}% repaid · {interestLabel} · {loan.term_months} months
                      {loan.status === 'cleared' && <span style={{ color:'#16a34a', marginLeft:8, fontWeight:600 }}>✅ Fully Cleared</span>}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Schedule Modal */}
      {showSchedule && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setShowSchedule(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:750, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
              <div>
                <h3 style={{ margin:0, fontSize:18 }}>📊 Loan Repayment Schedule</h3>
                <div style={{ fontSize:15, fontWeight:700, color:'#1a6b3c', marginTop:4 }}>{showSchedule.user?.name}</div>
                <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
                  {showSchedule.user?.account_number}
                  {showSchedule.branch_name && ` · ${showSchedule.branch_name}`}
                  {` · ${showSchedule.interest_rate}% ${showSchedule.interest_period==='annual'?'p.a.':'p.m.'} ${showSchedule.interest_type} · ${showSchedule.term_months} months`}
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => printLoanSchedule(showSchedule, schedule)}
                  style={{ padding:'7px 14px', background:'#f0fdf4', color:'#16a34a', border:'1px solid #bbf7d0', borderRadius:7, cursor:'pointer', fontSize:13, fontWeight:600 }}>
                  🖨️ Print
                </button>
                <button onClick={() => setShowSchedule(null)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>✕</button>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:10, marginBottom:20 }}>
              {[
                ['Principal',  `KES ${Number(showSchedule.amount).toLocaleString()}`],
                ['Monthly',    `KES ${Number(showSchedule.monthly_payment).toLocaleString()}`],
                ['Total Due',  `KES ${Number(showSchedule.total_due).toLocaleString()}`],
                ['Total Paid', `KES ${Number(showSchedule.total_paid).toLocaleString()}`],
                ['Balance',    `KES ${Number(showSchedule.balance).toLocaleString()}`],
              ].map(([l,v]) => (
                <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'10px 14px', textAlign:'center' }}>
                  <div style={{ fontSize:11, color:'#94a3b8' }}>{l}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#1a6b3c' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                    {['#','Due Date','Opening','Principal','Interest','Payment','Closing','Status'].map(h => (
                      <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:600, color:'#374151', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedule.map(row => (
                    <tr key={row.month} style={{ background:scheduleColors[row.status]||'white', borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'9px 12px', fontWeight:600 }}>{row.month}</td>
                      <td style={{ padding:'9px 12px', whiteSpace:'nowrap' }}>{new Date(row.due_date).toLocaleDateString('en-KE')}</td>
                      <td style={{ padding:'9px 12px' }}>KES {Number(row.opening_balance).toLocaleString()}</td>
                      <td style={{ padding:'9px 12px' }}>KES {Number(row.principal).toLocaleString()}</td>
                      <td style={{ padding:'9px 12px' }}>KES {Number(row.interest).toLocaleString()}</td>
                      <td style={{ padding:'9px 12px', fontWeight:600 }}>KES {Number(row.payment).toLocaleString()}</td>
                      <td style={{ padding:'9px 12px' }}>KES {Number(row.closing_balance).toLocaleString()}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ padding:'3px 8px', borderRadius:10, fontSize:11, fontWeight:600,
                          color:scheduleText[row.status], background:scheduleColors[row.status]||'#f8fafc' }}>
                          {row.status}{row.amount_paid>0&&row.status!=='paid'&&` (KES ${Number(row.amount_paid).toLocaleString()} paid)`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Approve/Reject Modal */}
      {showApprove && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setShowApprove(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:440 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <h3 style={{ margin:0 }}>🔍 Review Loan Application</h3>
              <button onClick={() => setShowApprove(null)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ background:'#f8fafc', borderRadius:8, padding:'12px 14px', marginBottom:16, fontSize:13 }}>
              <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{showApprove.user?.name}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, color:'#64748b' }}>
                <span>Amount: <strong style={{ color:'#374151' }}>KES {Number(showApprove.amount).toLocaleString()}</strong></span>
                <span>Term: <strong style={{ color:'#374151' }}>{showApprove.term_months} months</strong></span>
                <span>Monthly: <strong style={{ color:'#374151' }}>KES {Number(showApprove.monthly_payment).toLocaleString()}</strong></span>
                <span>Rate: <strong style={{ color:'#374151' }}>{showApprove.interest_rate}% {showApprove.interest_period==='annual'?'p.a.':'p.m.'}</strong></span>
                <span>Branch: <strong style={{ color:'#374151' }}>{showApprove.branch_name||'—'}</strong></span>
                <span>Initiated by: <strong style={{ color:'#374151' }}>{showApprove.initiated_by_name||'—'}</strong></span>
              </div>
            </div>
            {showApprove.approvals?.length > 0 && (
              <div style={{ background:'#f0fdf4', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13 }}>
                <div style={{ fontWeight:600, color:'#166534', marginBottom:6 }}>Previous Actions</div>
                {showApprove.approvals.map((a, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:6, color:'#374151' }}>
                    <span>{a.action==='approved'?'✅':'❌'}</span>
                    <span><strong>{a.approver_name}</strong> ({a.approver_role}) — {a.action}</span>
                    {a.notes && <span style={{ color:'#64748b' }}>· {a.notes}</span>}
                  </div>
                ))}
              </div>
            )}
            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', color:'#dc2626', fontSize:14, marginBottom:16 }}>
                {error.message}
              </div>
            )}
            <div style={{ display:'grid', gap:14 }}>
              <div>
                <label style={lbl}>Your Decision *</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[['approved','✅ Approve'],['rejected','❌ Reject']].map(([val,label]) => (
                    <button key={val} onClick={() => setApproveForm(f => ({ ...f, action: val }))}
                      style={{ padding:'10px', borderRadius:8, border:'none', cursor:'pointer', fontSize:14, fontWeight:600,
                        background: approveForm.action===val ? (val==='approved'?'#1a6b3c':'#dc2626') : '#f1f5f9',
                        color: approveForm.action===val ? 'white' : '#374151' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Notes (optional)</label>
                <textarea style={{ ...inp, minHeight:60, resize:'vertical' }}
                  placeholder="Add a reason or comment..."
                  value={approveForm.notes} onChange={e => setApproveForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <button onClick={handleApprove}
                style={{ padding:'11px', background: approveForm.action==='approved'?'#1a6b3c':'#dc2626',
                  color:'white', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer', fontSize:15 }}>
                {approveForm.action==='approved' ? '✅ Confirm Approval' : '❌ Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Loan Modal */}
      {showIssue && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setShowIssue(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:460, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <h3 style={{ margin:0 }}>Initiate Loan Application</h3>
                <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>Requires 2 approvals before activation</div>
              </div>
              <button onClick={() => setShowIssue(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>✕</button>
            </div>
            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'12px 14px', marginBottom:16 }}>
                <div style={{ color:'#dc2626', fontSize:14, fontWeight:600 }}>⚠️ {error.message || error}</div>
                {error.warnings?.map((w,i) => <div key={i} style={{ color:'#64748b', fontSize:13, marginTop:4 }}>· {w}</div>)}
              </div>
            )}
            <div style={{ background:'#eff6ff', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#1e40af' }}>
              ℹ️ Loan will be <strong>pending</strong> until approved by 2 of: secretary, chairperson, or vice chairperson.
            </div>
            <div style={{ display:'grid', gap:14 }}>
              <div>
                <label style={lbl}>Member *</label>
                <MemberSearch members={members} value={loanForm.user_id}
                  onChange={v => { setLoanForm(f => ({ ...f, user_id: v })); setError(null); checkEligibility(v) }} />
              </div>
              {eligibility && (
                <div style={{ background: eligibility.eligible?'#f0fdf4':'#fef3c7', border:`1px solid ${eligibility.eligible?'#bbf7d0':'#fbbf24'}`, borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontWeight:600, fontSize:13, color: eligibility.eligible?'#166534':'#92400e', marginBottom:10 }}>
                    {eligibility.eligible ? '✅ Member is eligible' : '⚠️ Eligibility requirements not met'}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div style={{ background:'white', borderRadius:6, padding:'8px 10px' }}>
                      <div style={{ display:'flex', gap:6, marginBottom:2 }}>
                        <span>{eligibility.meetsTime?'✅':'❌'}</span>
                        <span style={{ fontSize:12, fontWeight:600 }}>Membership Duration</span>
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:eligibility.meetsTime?'#16a34a':'#dc2626' }}>{eligibility.daysAsMember} days</div>
                      <div style={{ fontSize:11, color:'#64748b' }}>{eligibility.meetsTime?'Meets 90 day requirement':`Eligible from ${eligibility.eligibleOn}`}</div>
                    </div>
                    <div style={{ background:'white', borderRadius:6, padding:'8px 10px' }}>
                      <div style={{ display:'flex', gap:6, marginBottom:2 }}>
                        <span>{eligibility.meetsShares?'✅':'❌'}</span>
                        <span style={{ fontSize:12, fontWeight:600 }}>Share Capital</span>
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:eligibility.meetsShares?'#16a34a':'#dc2626' }}>{eligibility.netShares} share{eligibility.netShares!==1?'s':''}</div>
                      <div style={{ fontSize:11, color:'#64748b' }}>{eligibility.meetsShares?'Meets requirement':'Must own ≥1 share'}</div>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label style={lbl}>Branch *</label>
                <select style={{ ...inp, borderColor:!loanForm.branch_id?'#fca5a5':'#e2e8f0' }}
                  value={loanForm.branch_id} onChange={e => setLoanForm(f => ({ ...f, branch_id: e.target.value }))}>
                  <option value="">Select branch...</option>
                  {branches.map(b => <option key={b.ID} value={b.ID}>{b.name}</option>)}
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={lbl}>Amount (KES) *</label>
                  <input style={inp} type="number" placeholder="10000" value={loanForm.amount}
                    onChange={e => setLoanForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Term (months)</label>
                  <input style={inp} type="number" placeholder="12" value={loanForm.term_months}
                    onChange={e => setLoanForm(f => ({ ...f, term_months: e.target.value }))} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={lbl}>Interest Rate (%)</label>
                  <input style={inp} type="number" placeholder="10" value={loanForm.interest_rate}
                    onChange={e => setLoanForm(f => ({ ...f, interest_rate: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Rate Period</label>
                  <select style={inp} value={loanForm.interest_period}
                    onChange={e => setLoanForm(f => ({ ...f, interest_period: e.target.value }))}>
                    <option value="monthly">Per Month</option>
                    <option value="annual">Per Annum</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>Interest Type</label>
                <select style={inp} value={loanForm.interest_type}
                  onChange={e => setLoanForm(f => ({ ...f, interest_type: e.target.value }))}>
                  <option value="flat">Flat Rate</option>
                  <option value="reducing">Reducing Balance</option>
                </select>
              </div>
              {preview && (
                <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'12px 16px' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#166534', marginBottom:8 }}>📊 Payment Preview</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:13 }}>
                    <div>Monthly: <strong>KES {preview.monthly.toLocaleString()}</strong></div>
                    <div>Total Due: <strong>KES {preview.total.toLocaleString()}</strong></div>
                    <div style={{ color:'#64748b', fontSize:12 }}>Rate: {loanForm.interest_rate}% {loanForm.interest_period==='annual'?'p.a.':'p.m.'} · {loanForm.interest_type}</div>
                    <div style={{ color:'#64748b', fontSize:12 }}>Interest: KES {(preview.total-Number(loanForm.amount)).toLocaleString()}</div>
                  </div>
                </div>
              )}
              <button onClick={handleIssueLoan}
                style={{ padding:'11px', background:'#1a6b3c', color:'white', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer', fontSize:15 }}>
                Submit for Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Override Confirmation */}
      {showConfirm && eligibility && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:420 }}>
            <div style={{ fontSize:40, textAlign:'center', marginBottom:12 }}>⚠️</div>
            <h3 style={{ margin:'0 0 6px', textAlign:'center' }}>Override Eligibility?</h3>
            <p style={{ margin:'0 0 20px', textAlign:'center', fontSize:14, color:'#64748b' }}>
              <strong>{eligibility.memberName}</strong> does not meet requirements.
            </p>
            <div style={{ background:'#fef3c7', borderRadius:8, padding:'12px 14px', marginBottom:20, fontSize:13 }}>
              {!eligibility.meetsTime && <div style={{ color:'#92400e', marginBottom:4 }}>❌ Only <strong>{eligibility.daysAsMember} days</strong> as member · Eligible from <strong>{eligibility.eligibleOn}</strong></div>}
              {!eligibility.meetsShares && <div style={{ color:'#92400e' }}>❌ <strong>No shares owned</strong></div>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <button onClick={() => setShowConfirm(false)}
                style={{ padding:'11px', background:'#f1f5f9', color:'#374151', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={submitLoan}
                style={{ padding:'11px', background:'#dc2626', color:'white', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer' }}>
                Override & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repayment Modal */}
      {showRepay && selectedLoan && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setShowRepay(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:400 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ margin:0 }}>Record Payment</h3>
              <button onClick={() => setShowRepay(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ background:'#f8fafc', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13 }}>
              <strong>{selectedLoan.user?.name}</strong><br />
              Balance: <strong style={{ color:'#d97706' }}>KES {Number(selectedLoan.balance).toLocaleString()}</strong> ·
              Monthly: <strong>KES {Number(selectedLoan.monthly_payment).toLocaleString()}</strong>
            </div>
            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', color:'#dc2626', fontSize:14, marginBottom:16 }}>
                {error.message}
              </div>
            )}
            <div style={{ display:'grid', gap:14 }}>
              <div>
                <label style={lbl}>Amount (KES) *</label>
                <input style={inp} type="number" placeholder={selectedLoan.monthly_payment} value={repayForm.amount}
                  onChange={e => setRepayForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <input style={inp} placeholder="Optional" value={repayForm.notes}
                  onChange={e => setRepayForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <button onClick={handleRepayment}
                style={{ padding:'11px', background:'#1a6b3c', color:'white', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer', fontSize:15 }}>
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}