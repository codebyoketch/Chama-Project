import { useState, useEffect } from 'react'
import api from '../services/api'

const printReport = (title, htmlContent) => {
  const win = window.open('', '_blank')
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>body{font-family:Arial,sans-serif;max-width:800px;margin:30px auto;color:#1e293b;font-size:13px}
    h1{color:#1a6b3c;font-size:20px;border-bottom:2px solid #1a6b3c;padding-bottom:8px}
    h2{font-size:15px;margin-top:24px;color:#374151}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th{background:#f0fdf4;color:#166534;padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase}
    td{padding:8px 10px;border-bottom:1px solid #f1f5f9}
    .box{display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 20px;margin:4px;text-align:center}
    .box .val{font-size:20px;font-weight:700;color:#166534}.box .lbl{font-size:11px;color:#64748b}
    .meta{color:#64748b;font-size:12px;margin-bottom:16px}
    @media print{body{margin:10px}}</style>
    </head><body>${htmlContent}</body></html>`)
  win.document.close(); win.focus()
  setTimeout(() => { win.print(); win.close() }, 600)
}

const exportCSV = (filename, headers, rows) => {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = filename; a.click()
}

export default function Reports() {
  const [stats, setStats] = useState(null)
  const [members, setMembers] = useState([])
  const [contributions, setContributions] = useState([])
  const [loans, setLoans] = useState([])
  const [welfare, setWelfare] = useState({ contributions: [], disbursements: [] })
  const [shareCapital, setShareCapital] = useState({ records: [], summaries: [] })
  const [loading, setLoading] = useState(true)
  const [activeReport, setActiveReport] = useState('overview')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [rRes, mRes, cRes, lRes, wRes, sRes] = await Promise.all([
        api.get('/reports'),
        api.get('/members'),
        api.get('/contributions'),
        api.get('/loans'),
        api.get('/welfare'),
        api.get('/sharecapital'),
      ])
      setStats(rRes.data)
      setMembers(mRes.data.members || [])
      setContributions(cRes.data.contributions || [])
      setLoans(lRes.data.loans || [])
      setWelfare(wRes.data)
      setShareCapital(sRes.data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const cardStyle = active => ({
    padding: '10px 18px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
    background: active ? '#1a6b3c' : 'white', color: active ? 'white' : '#475569',
    boxShadow: active ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
  })
  const btnStyle = (color = '#1a6b3c') => ({
    padding: '8px 16px', background: color + '15', color, border: `1px solid ${color}40`,
    borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  })

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading reports...</div>

  const s = stats || {}
  const activeLoans = loans.filter(l => l.status === 'active')
  const overdueLoans = activeLoans.filter(l => new Date(l.due_at) < new Date())
  const memberStatement = members.map(m => {
    const mc = contributions.filter(c => c.user_id === m.ID)
    const ml = loans.filter(l => l.user_id === m.ID)
    const ws = (welfare.contributions || []).filter(c => c.user_id === m.ID)
    const sc = (shareCapital.summaries || []).find(x => x.user_id === m.ID)
    return {
      ...m,
      totalContributed: mc.reduce((sum, c) => sum + Number(c.amount), 0),
      contributions: mc.length,
      loanBalance: ml.filter(l => l.status === 'active').reduce((sum, l) => sum + Number(l.balance || 0), 0),
      loans: ml.length,
      welfare: ws.reduce((sum, c) => sum + Number(c.amount), 0),
      shares: sc?.total_shares || 0,
      shareAmount: sc?.total_amount || 0,
    }
  })

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>📊 Reports & Statements</h2>
        <p style={{ margin: '4px 0 0', color: '#64748b' }}>Generate and export financial reports</p>
      </div>

      {/* Summary Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Contributions Balance', value: `KES ${Number(s.contributions?.balance || 0).toLocaleString()}`, color: '#166534', bg: '#f0fdf4' },
          { label: 'Loan Outstanding', value: `KES ${Number(s.loans?.total_balance || 0).toLocaleString()}`, color: '#1d4ed8', bg: '#eff6ff' },
          { label: 'Welfare Balance', value: `KES ${Number(s.welfare?.balance || 0).toLocaleString()}`, color: '#db2777', bg: '#fdf2f8' },
          { label: 'Share Capital', value: `KES ${Number(s.share_capital?.total || 0).toLocaleString()}`, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Unpaid Fines', value: `KES ${Number(s.fines?.total_unpaid || 0).toLocaleString()}`, color: '#dc2626', bg: '#fef2f2' },
          { label: 'Overdue Loans', value: overdueLoans.length, color: overdueLoans.length > 0 ? '#dc2626' : '#166534', bg: overdueLoans.length > 0 ? '#fef2f2' : '#f0fdf4' },
        ].map(item => (
          <div key={item.label} style={{ background: item.bg, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: item.color, marginTop: 4 }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Report Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'overview', label: '📋 Overview' },
          { key: 'contributions', label: '💰 Contributions' },
          { key: 'loans', label: '🏦 Loans' },
          { key: 'welfare', label: '❤️ Welfare' },
          { key: 'sharecapital', label: '📈 Share Capital' },
          { key: 'members', label: '👥 Members' },
        ].map(t => (
          <button key={t.key} style={cardStyle(activeReport === t.key)} onClick={() => setActiveReport(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* Overview */}
      {activeReport === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            { title: '💰 Contributions', color: '#16a34a', items: [
              ['Gross Collected', `KES ${Number(s.contributions?.total_gross || 0).toLocaleString()}`],
              ['Fines Deducted', `KES ${Number(s.contributions?.fines_deducted || 0).toLocaleString()}`],
              ['Net Amount', `KES ${Number(s.contributions?.total_net || 0).toLocaleString()}`],
              ['Paid Out', `KES ${Number(s.contributions?.total_payouts || 0).toLocaleString()}`],
              ['Balance', `KES ${Number(s.contributions?.balance || 0).toLocaleString()}`],
            ]},
            { title: '🏦 Loans', color: '#1d4ed8', items: [
              ['Total Issued', `KES ${Number(s.loans?.total_issued || 0).toLocaleString()}`],
              ['Total Repaid', `KES ${Number(s.loans?.total_repaid || 0).toLocaleString()}`],
              ['Outstanding', `KES ${Number(s.loans?.total_balance || 0).toLocaleString()}`],
            ]},
            { title: '❤️ Welfare', color: '#db2777', items: [
              ['Total In', `KES ${Number(s.welfare?.total_in || 0).toLocaleString()}`],
              ['Total Out', `KES ${Number(s.welfare?.total_out || 0).toLocaleString()}`],
              ['Balance', `KES ${Number(s.welfare?.balance || 0).toLocaleString()}`],
            ]},
            { title: '📈 Share Capital', color: '#7c3aed', items: [
              ['Total Capital', `KES ${Number(s.share_capital?.total || 0).toLocaleString()}`],
            ]},
            { title: '⚠️ Fines', color: '#dc2626', items: [
              ['Total Issued', `KES ${Number(s.fines?.total_issued || 0).toLocaleString()}`],
              ['Paid', `KES ${Number(s.fines?.total_paid || 0).toLocaleString()}`],
              ['Unpaid', `KES ${Number(s.fines?.total_unpaid || 0).toLocaleString()}`],
            ]},
            { title: '👥 Members', color: '#374151', items: [
              ['Total Active', s.members?.total || 0],
              ['SACCO + Welfare', s.members?.both || 0],
              ['SACCO Only', s.members?.sacco_only || 0],
            ]},
          ].map(card => (
            <div key={card.title} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: card.color }}>{card.title}</div>
              {card.items.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8fafc', fontSize: 14 }}>
                  <span style={{ color: '#64748b' }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Contributions */}
      {activeReport === 'contributions' && (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>All Contributions</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnStyle('#1a6b3c')} onClick={() => printReport('Contributions', `
                <h1>Contributions Report</h1>
                <p class="meta">Generated: ${new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <table><thead><tr><th>Member</th><th>Period</th><th>Amount</th><th>Fines Deducted</th><th>Net</th><th>Branch</th></tr></thead>
                <tbody>${contributions.map(c => `<tr><td>${c.user?.name || ''}</td><td>${c.period}</td><td>KES ${Number(c.amount).toLocaleString()}</td><td>KES ${Number(c.fines_deducted || 0).toLocaleString()}</td><td>KES ${Number(c.net_amount || 0).toLocaleString()}</td><td>${c.branch_name || 'General'}</td></tr>`).join('')}</tbody></table>
              `)}>🖨️ Print</button>
              <button style={btnStyle('#0369a1')} onClick={() => exportCSV('contributions.csv',
                ['Member', 'Period', 'Amount', 'Fines Deducted', 'Net', 'Branch', 'Date'],
                contributions.map(c => [c.user?.name || '', c.period, c.amount, c.fines_deducted || 0, c.net_amount || 0, c.branch_name || 'General', new Date(c.created_at).toLocaleDateString()])
              )}>📥 CSV</button>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f8fafc' }}>
              {['Member', 'Period', 'Amount', 'Fines Deducted', 'Net', 'Branch', 'Date'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {contributions.length === 0
                ? <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No contributions found.</td></tr>
                : contributions.map(c => (
                  <tr key={c.ID} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '11px 16px', fontSize: 14, fontWeight: 500 }}>{c.user?.name}</td>
                    <td style={{ padding: '11px 16px', fontSize: 14 }}>{c.period}</td>
                    <td style={{ padding: '11px 16px', fontSize: 14, fontWeight: 600, color: '#166534' }}>KES {Number(c.amount).toLocaleString()}</td>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: '#dc2626' }}>{c.fines_deducted > 0 ? `KES ${Number(c.fines_deducted).toLocaleString()}` : '—'}</td>
                    <td style={{ padding: '11px 16px', fontSize: 14, color: '#166534' }}>KES {Number(c.net_amount || 0).toLocaleString()}</td>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: '#64748b' }}>{c.branch_name || 'General'}</td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: '#94a3b8' }}>{new Date(c.created_at).toLocaleDateString('en-KE')}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Loans */}
      {activeReport === 'loans' && (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Loan Book</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnStyle('#1a6b3c')} onClick={() => exportCSV('loans.csv',
                ['Member', 'Principal', 'Interest Rate', 'Total Due', 'Paid', 'Balance', 'Status', 'Due Date'],
                loans.map(l => [l.user?.name || '', l.amount, `${l.interest_rate}%`, l.total_due, l.total_paid || 0, l.balance || 0, l.status, new Date(l.due_at).toLocaleDateString()])
              )}>📥 CSV</button>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f8fafc' }}>
              {['Member', 'Principal', 'Interest', 'Total Due', 'Paid', 'Balance', 'Due Date', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loans.length === 0
                ? <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No loans found.</td></tr>
                : loans.map(l => (
                  <tr key={l.ID} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '11px 16px', fontSize: 14, fontWeight: 500 }}>{l.user?.name}</td>
                    <td style={{ padding: '11px 16px', fontSize: 14 }}>KES {Number(l.amount).toLocaleString()}</td>
                    <td style={{ padding: '11px 16px', fontSize: 13 }}>{l.interest_rate}% {l.interest_type}</td>
                    <td style={{ padding: '11px 16px', fontSize: 14 }}>KES {Number(l.total_due).toLocaleString()}</td>
                    <td style={{ padding: '11px 16px', fontSize: 14, color: '#166534' }}>KES {Number(l.total_paid || 0).toLocaleString()}</td>
                    <td style={{ padding: '11px 16px', fontSize: 14, fontWeight: 700, color: Number(l.balance) > 0 ? '#dc2626' : '#166534' }}>KES {Number(l.balance || 0).toLocaleString()}</td>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: new Date(l.due_at) < new Date() && l.status === 'active' ? '#dc2626' : '#64748b' }}>{new Date(l.due_at).toLocaleDateString('en-KE')}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: l.status === 'active' ? '#eff6ff' : l.status === 'completed' ? '#f0fdf4' : '#fef2f2',
                        color: l.status === 'active' ? '#1d4ed8' : l.status === 'completed' ? '#166534' : '#dc2626' }}>{l.status}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Welfare */}
      {activeReport === 'welfare' && (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Welfare Fund Report</h3>
          </div>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, fontSize: 14, color: '#64748b' }}>Contributions</div>
          {(welfare.contributions || []).map(c => (
            <div key={c.ID} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 20px', borderBottom: '1px solid #f8fafc', fontSize: 14 }}>
              <div><div style={{ fontWeight: 500 }}>{c.user?.name}</div><div style={{ fontSize: 12, color: '#94a3b8' }}>{c.period}</div></div>
              <span style={{ fontWeight: 700, color: '#16a34a' }}>+KES {c.amount?.toLocaleString()}</span>
            </div>
          ))}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', borderTop: '2px solid #f1f5f9', fontWeight: 600, fontSize: 14, color: '#64748b', marginTop: 8 }}>Disbursements</div>
          {(welfare.disbursements || []).map(d => (
            <div key={d.ID} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 20px', borderBottom: '1px solid #f8fafc', fontSize: 14 }}>
              <div><div style={{ fontWeight: 500 }}>{d.user?.name}</div><div style={{ fontSize: 12, color: '#94a3b8' }}>{d.reason}</div></div>
              <span style={{ fontWeight: 700, color: '#dc2626' }}>-KES {d.amount?.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Share Capital */}
      {activeReport === 'sharecapital' && (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Share Capital Summary</h3>
            <button style={btnStyle('#7c3aed')} onClick={() => exportCSV('sharecapital.csv',
              ['Member', 'Total Shares', 'Total Amount'],
              (shareCapital.summaries || []).map(s => [s.user_name, s.total_shares, s.total_amount])
            )}>📥 CSV</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f8fafc' }}>
              {['Member', 'Total Shares', 'Total Amount'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(shareCapital.summaries || []).length === 0
                ? <tr><td colSpan={3} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No share capital records.</td></tr>
                : (shareCapital.summaries || []).map(s => (
                  <tr key={s.user_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '11px 16px', fontWeight: 500, fontSize: 14 }}>{s.user_name}</td>
                    <td style={{ padding: '11px 16px', fontSize: 14 }}>{s.total_shares}</td>
                    <td style={{ padding: '11px 16px', fontWeight: 700, color: '#7c3aed' }}>KES {Number(s.total_amount).toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Members */}
      {activeReport === 'members' && (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Member Statements</h3>
            <button style={btnStyle('#1a6b3c')} onClick={() => exportCSV('members.csv',
              ['Name', 'Phone', 'Role', 'Membership', 'Contributions', 'Welfare', 'Shares', 'Share Amount', 'Loan Balance'],
              memberStatement.map(m => [m.name, m.phone, m.role, m.membership_type || 'both', m.totalContributed, m.welfare, m.shares, m.shareAmount, m.loanBalance])
            )}>📥 CSV</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f8fafc' }}>
              {['Name', 'Role', 'Membership', 'Contributions', 'Welfare', 'Shares', 'Loan Balance'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {memberStatement.map(m => (
                <tr key={m.ID} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>
                    <div>{m.name}</div><div style={{ fontSize: 12, color: '#94a3b8' }}>{m.phone}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 12, background: '#f0fdf4', color: '#166534', textTransform: 'capitalize' }}>{m.role}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 12,
                      background: m.membership_type === 'sacco_only' ? '#eff6ff' : '#f5f3ff',
                      color: m.membership_type === 'sacco_only' ? '#1d4ed8' : '#7c3aed' }}>
                      {m.membership_type === 'sacco_only' ? 'SACCO only' : 'SACCO + Welfare'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#166534', fontSize: 14 }}>KES {Number(m.totalContributed).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#db2777' }}>KES {Number(m.welfare).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#7c3aed' }}>{m.shares > 0 ? `${m.shares} (KES ${Number(m.shareAmount).toLocaleString()})` : '—'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: m.loanBalance > 0 ? '#dc2626' : '#94a3b8' }}>
                    {m.loanBalance > 0 ? `KES ${Number(m.loanBalance).toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}