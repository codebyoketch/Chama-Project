import { useState, useEffect } from 'react'
import api from '../services/api'
import { getCache } from '../db/localDB'
import { isOnline } from '../services/sync'

const printStatement = (member, contributions, loans, welfare, shareCapital) => {
  const totalContributed = contributions.reduce((s, c) => s + Number(c.amount), 0)
  const totalLoaned = loans.reduce((s, l) => s + Number(l.amount), 0)
  const totalOwed = loans.filter(l => l.status === 'active').reduce((s, l) => s + Number(l.balance || 0), 0)
  const totalWelfare = welfare.reduce((s, w) => s + Number(w.amount), 0)
  const totalShares = shareCapital.reduce((s, sc) => s + Number(sc.shares), 0)
  const totalShareAmount = shareCapital.reduce((s, sc) => s + Number(sc.amount), 0)

  const contribRows = contributions.map(c => `
    <tr>
      <td>${c.period}</td>
      <td>KES ${Number(c.amount).toLocaleString()}</td>
      <td style="color:#dc2626">${c.fines_deducted > 0 ? `KES ${Number(c.fines_deducted).toLocaleString()}` : '—'}</td>
      <td>KES ${Number(c.net_amount || c.amount).toLocaleString()}</td>
      <td>${c.branch_name || 'General'}</td>
      <td>${new Date(c.paid_at || c.created_at).toLocaleDateString('en-KE')}</td>
    </tr>`).join('')

  const loanRows = loans.map(l => `
    <tr>
      <td>${new Date(l.issued_at).toLocaleDateString('en-KE')}</td>
      <td>KES ${Number(l.amount).toLocaleString()}</td>
      <td>${l.interest_rate}% ${l.interest_type}</td>
      <td>KES ${Number(l.total_due).toLocaleString()}</td>
      <td>KES ${Number(l.total_paid || 0).toLocaleString()}</td>
      <td style="color:${Number(l.balance) > 0 ? '#dc2626' : '#166534'};font-weight:700">KES ${Number(l.balance || 0).toLocaleString()}</td>
      <td>${new Date(l.due_at).toLocaleDateString('en-KE')}</td>
      <td style="text-transform:capitalize">${l.status}</td>
    </tr>`).join('')

  const welfareRows = welfare.map(w => `
    <tr>
      <td>${w.period || '—'}</td>
      <td>KES ${Number(w.amount).toLocaleString()}</td>
      <td>${new Date(w.paid_at || w.created_at).toLocaleDateString('en-KE')}</td>
      <td>${w.notes || '—'}</td>
    </tr>`).join('')

  const shareRows = shareCapital.map(sc => `
    <tr>
      <td>${sc.shares}</td>
      <td>KES ${Number(sc.share_price).toLocaleString()}</td>
      <td>KES ${Number(sc.amount).toLocaleString()}</td>
      <td style="text-transform:capitalize">${sc.type}</td>
      <td>${new Date(sc.paid_at || sc.created_at).toLocaleDateString('en-KE')}</td>
    </tr>`).join('')

  const win = window.open('', '_blank')
  win.document.write(`<!DOCTYPE html><html><head>
    <title>Statement — ${member.name}</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 820px; margin: 30px auto; color: #1e293b; font-size: 13px; }
      h1 { color: #1a6b3c; font-size: 20px; border-bottom: 2px solid #1a6b3c; padding-bottom: 8px; margin-bottom: 4px; }
      .meta { color: #64748b; font-size: 12px; margin-bottom: 16px; }
      h2 { font-size: 13px; color: #374151; margin: 22px 0 8px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th { background: #f0fdf4; color: #166534; padding: 7px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
      td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
      tr:nth-child(even) td { background: #fafafa; }
      .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 20px; }
      .sbox { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px; text-align: center; }
      .sbox .val { font-size: 17px; font-weight: 700; color: #166534; }
      .sbox .lbl { font-size: 10px; color: #64748b; margin-top: 2px; text-transform: uppercase; }
      .member-info { background: #f8fafc; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; }
      .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
      @media print { body { margin: 10px; } }
    </style>
    </head><body>
    <h1>🌱 ChamaBook — Member Statement</h1>
    <p class="meta">Generated: ${new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

    <div class="member-info">
      <strong style="font-size:15px">${member.name}</strong>
      &nbsp;·&nbsp; ${member.phone}
      ${member.email ? `&nbsp;·&nbsp; ${member.email}` : ''}
      ${member.id_number ? `&nbsp;·&nbsp; ID: ${member.id_number}` : ''}
      &nbsp;·&nbsp; Acc: ${member.account_number}
      &nbsp;·&nbsp;
      <span class="badge" style="background:#f0fdf4;color:#166534;text-transform:capitalize">${member.role}</span>
      &nbsp;
      <span class="badge" style="background:#f5f3ff;color:#7c3aed">${member.membership_type === 'sacco_only' ? 'SACCO only' : 'SACCO + Table Banking'}</span>
    </div>

    <div class="summary">
      <div class="sbox"><div class="val">KES ${totalContributed.toLocaleString()}</div><div class="lbl">Total Contributed</div></div>
      <div class="sbox"><div class="val">${contributions.length}</div><div class="lbl">Contributions</div></div>
      <div class="sbox"><div class="val">KES ${totalWelfare.toLocaleString()}</div><div class="lbl">Welfare Paid</div></div>
      <div class="sbox"><div class="val">${totalShares} shares</div><div class="lbl">Share Capital</div></div>
      <div class="sbox"><div class="val">KES ${totalShareAmount.toLocaleString()}</div><div class="lbl">Share Value</div></div>
      <div class="sbox" style="${totalOwed > 0 ? 'background:#fef2f2;border-color:#fecaca' : ''}">
        <div class="val" style="color:${totalOwed > 0 ? '#dc2626' : '#166534'}">KES ${totalOwed.toLocaleString()}</div>
        <div class="lbl">Loan Balance</div>
      </div>
    </div>

    <h2>Contribution History</h2>
    ${contributions.length === 0 ? '<p style="color:#94a3b8">No contributions recorded.</p>' : `
    <table><thead><tr><th>Period</th><th>Amount</th><th>Fines Deducted</th><th>Net</th><th>Branch</th><th>Date</th></tr></thead>
    <tbody>${contribRows}</tbody>
    <tfoot><tr style="background:#f0fdf4;font-weight:700">
      <td>TOTAL</td><td>KES ${totalContributed.toLocaleString()}</td><td colspan="4"></td>
    </tr></tfoot></table>`}

    <h2>Welfare Contributions</h2>
    ${welfare.length === 0 ? '<p style="color:#94a3b8">No welfare contributions.</p>' : `
    <table><thead><tr><th>Period</th><th>Amount</th><th>Date</th><th>Notes</th></tr></thead>
    <tbody>${welfareRows}</tbody>
    <tfoot><tr style="background:#fdf2f8;font-weight:700">
      <td>TOTAL</td><td>KES ${totalWelfare.toLocaleString()}</td><td colspan="2"></td>
    </tr></tfoot></table>`}

    <h2>Share Capital</h2>
    ${shareCapital.length === 0 ? '<p style="color:#94a3b8">No share capital records.</p>' : `
    <table><thead><tr><th>Shares</th><th>Price/Share</th><th>Amount</th><th>Type</th><th>Date</th></tr></thead>
    <tbody>${shareRows}</tbody>
    <tfoot><tr style="background:#f5f3ff;font-weight:700">
      <td>${totalShares} shares</td><td></td><td>KES ${totalShareAmount.toLocaleString()}</td><td colspan="2"></td>
    </tr></tfoot></table>`}

    <h2>Loan History</h2>
    ${loans.length === 0 ? '<p style="color:#94a3b8">No loans recorded.</p>' : `
    <table><thead><tr><th>Issued</th><th>Principal</th><th>Interest</th><th>Total Due</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th></tr></thead>
    <tbody>${loanRows}</tbody></table>`}
    </body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 600)
}

export default function MemberStatement() {
  const [members, setMembers] = useState([])
  const [selected, setSelected] = useState(null)
  const [contributions, setContributions] = useState([])
  const [loans, setLoans] = useState([])
  const [welfare, setWelfare] = useState([])
  const [shareCapital, setShareCapital] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadMembers() }, [])

  const loadMembers = async () => {
    setLoadingList(true)
    try {
      if (isOnline()) {
        const res = await api.get('/members')
        setMembers(res.data.members || [])
      } else {
        const c = await getCache('members')
        if (c) setMembers(c)
      }
    } catch (e) { console.error(e) }
    setLoadingList(false)
  }

  const loadMemberData = async (member) => {
    setSelected(member)
    setLoading(true)
    setContributions([]); setLoans([]); setWelfare([]); setShareCapital([])
    try {
      const [cRes, lRes, wRes, scRes] = await Promise.all([
        api.get('/contributions'),
        api.get('/loans'),
        api.get('/welfare'),
        api.get('/sharecapital'),
      ])
      setContributions((cRes.data.contributions || []).filter(c => c.user_id === member.ID))
      setLoans((lRes.data.loans || []).filter(l => l.user_id === member.ID))
      setWelfare((wRes.data.contributions || []).filter(w => w.user_id === member.ID))
      setShareCapital((scRes.data.records || []).filter(s => s.user_id === member.ID))
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const totalContributed = contributions.reduce((s, c) => s + Number(c.amount), 0)
  const activeLoans = loans.filter(l => l.status === 'active')
  const totalOwed = activeLoans.reduce((s, l) => s + Number(l.balance || 0), 0)
  const totalWelfare = welfare.reduce((s, w) => s + Number(w.amount), 0)
  const totalShares = shareCapital.reduce((s, sc) => s + Number(sc.shares), 0)
  const totalShareAmount = shareCapital.reduce((s, sc) => s + Number(sc.amount), 0)

  const avatarColor = (name) => {
    const colors = ['#166534', '#1d4ed8', '#7c3aed', '#c2410c', '#0369a1']
    return colors[(name?.charCodeAt(0) || 0) % colors.length]
  }

  const filtered = members.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.phone?.includes(search) || m.account_number?.includes(search)
  )

  const inp = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
      {/* Member List */}
      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700 }}>👥 Select Member</h3>
          <input style={inp} placeholder="Search by name, phone, account..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loadingList ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
          ) : filtered.map(m => (
            <div key={m.ID} onClick={() => loadMemberData(m)}
              style={{ padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: '1px solid #f8fafc',
                background: selected?.ID === m.ID ? '#f0fdf4' : 'white',
                borderLeft: selected?.ID === m.ID ? '3px solid #1a6b3c' : '3px solid transparent' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: avatarColor(m.name) + '22', color: avatarColor(m.name),
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                {m.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: selected?.ID === m.ID ? 700 : 500 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>
                  {m.role} · {m.membership_type === 'sacco_only' ? 'SACCO only' : 'SACCO + TB'}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No members found.</div>}
        </div>
      </div>

      {/* Statement View */}
      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👈</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>Select a member to view their statement</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%',
                  background: avatarColor(selected.name) + '22', color: avatarColor(selected.name),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
                  {selected.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {selected.phone}
                    {selected.account_number && ` · 🏦 ${selected.account_number}`}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#f0fdf4', color: '#166534', fontWeight: 600, textTransform: 'capitalize' }}>{selected.role}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#f5f3ff', color: '#7c3aed', fontWeight: 600 }}>
                      {selected.membership_type === 'sacco_only' ? '🏛 SACCO only' : '🔄 SACCO + TB'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => printStatement(selected, contributions, loans, welfare, shareCapital)}
                style={{ padding: '9px 20px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                🖨️ Print Statement
              </button>
            </div>

            {loading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: 60 }}>Loading...</div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1, padding: 24 }}>

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 28 }}>
                  {[
                    { label: 'Contributions', value: `KES ${totalContributed.toLocaleString()}`, color: '#166534', bg: '#f0fdf4' },
                    { label: 'No. of Contribs', value: contributions.length, color: '#1d4ed8', bg: '#eff6ff' },
                    { label: 'Welfare Paid', value: `KES ${totalWelfare.toLocaleString()}`, color: '#db2777', bg: '#fdf2f8' },
                    { label: 'Shares Held', value: `${totalShares} shares`, color: '#7c3aed', bg: '#f5f3ff' },
                    { label: 'Share Value', value: `KES ${totalShareAmount.toLocaleString()}`, color: '#7c3aed', bg: '#f5f3ff' },
                    { label: 'Loan Balance', value: `KES ${totalOwed.toLocaleString()}`, color: totalOwed > 0 ? '#dc2626' : '#166534', bg: totalOwed > 0 ? '#fef2f2' : '#f0fdf4' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Contributions */}
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>💰 Contribution History</h3>
                {contributions.length === 0
                  ? <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>No contributions yet.</div>
                  : <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28 }}>
                    <thead><tr style={{ background: '#f8fafc' }}>
                      {['Period', 'Amount', 'Fines', 'Net', 'Branch', 'Date'].map(h => (
                        <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {contributions.map(c => (
                        <tr key={c.ID} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontSize: 14 }}>{c.period}</td>
                          <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 600, color: '#166634' }}>KES {Number(c.amount).toLocaleString()}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: '#dc2626' }}>{c.fines_deducted > 0 ? `-KES ${Number(c.fines_deducted).toLocaleString()}` : '—'}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: '#166534' }}>KES {Number(c.net_amount || c.amount).toLocaleString()}</td>
                          <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>{c.branch_name || 'General'}</td>
                          <td style={{ padding: '10px 12px', fontSize: 12, color: '#94a3b8' }}>{new Date(c.paid_at || c.created_at).toLocaleDateString('en-KE')}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f0fdf4', fontWeight: 700 }}>
                        <td style={{ padding: '10px 12px', fontSize: 14 }}>TOTAL</td>
                        <td style={{ padding: '10px 12px', fontSize: 14, color: '#166534' }}>KES {totalContributed.toLocaleString()}</td>
                        <td colSpan={4} />
                      </tr>
                    </tfoot>
                  </table>
                }

                {/* Welfare */}
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>❤️ Welfare Contributions</h3>
                {welfare.length === 0
                  ? <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>No welfare contributions.</div>
                  : <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28 }}>
                    <thead><tr style={{ background: '#f8fafc' }}>
                      {['Period', 'Amount', 'Date', 'Notes'].map(h => (
                        <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {welfare.map(w => (
                        <tr key={w.ID} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontSize: 14 }}>{w.period || '—'}</td>
                          <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 600, color: '#db2777' }}>KES {Number(w.amount).toLocaleString()}</td>
                          <td style={{ padding: '10px 12px', fontSize: 12, color: '#94a3b8' }}>{new Date(w.paid_at || w.created_at).toLocaleDateString('en-KE')}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: '#64748b' }}>{w.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#fdf2f8', fontWeight: 700 }}>
                        <td style={{ padding: '10px 12px', fontSize: 14 }}>TOTAL</td>
                        <td style={{ padding: '10px 12px', fontSize: 14, color: '#db2777' }}>KES {totalWelfare.toLocaleString()}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                }

                {/* Share Capital */}
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>📈 Share Capital</h3>
                {shareCapital.length === 0
                  ? <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>No share capital records.</div>
                  : <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28 }}>
                    <thead><tr style={{ background: '#f8fafc' }}>
                      {['Shares', 'Price/Share', 'Amount', 'Type', 'Date'].map(h => (
                        <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {shareCapital.map(sc => (
                        <tr key={sc.ID} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontSize: 14 }}>{sc.shares}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: '#64748b' }}>KES {Number(sc.share_price).toLocaleString()}</td>
                          <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 600, color: '#7c3aed' }}>KES {Number(sc.amount).toLocaleString()}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                              background: sc.type === 'purchase' ? '#f5f3ff' : '#eff6ff',
                              color: sc.type === 'purchase' ? '#7c3aed' : '#1d4ed8' }}>{sc.type}</span>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 12, color: '#94a3b8' }}>{new Date(sc.paid_at || sc.created_at).toLocaleDateString('en-KE')}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f5f3ff', fontWeight: 700 }}>
                        <td style={{ padding: '10px 12px', fontSize: 14 }}>{totalShares} shares</td>
                        <td />
                        <td style={{ padding: '10px 12px', fontSize: 14, color: '#7c3aed' }}>KES {totalShareAmount.toLocaleString()}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                }

                {/* Loans */}
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>🏦 Loan History</h3>
                {loans.length === 0
                  ? <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, color: '#94a3b8', fontSize: 14 }}>No loans yet.</div>
                  : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f8fafc' }}>
                      {['Issued', 'Principal', 'Interest', 'Total Due', 'Paid', 'Balance', 'Due Date', 'Status'].map(h => (
                        <th key={h} style={{ padding: '9px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {loans.map(l => (
                        <tr key={l.ID} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 10px', fontSize: 12 }}>{new Date(l.issued_at).toLocaleDateString('en-KE')}</td>
                          <td style={{ padding: '10px 10px', fontSize: 13 }}>KES {Number(l.amount).toLocaleString()}</td>
                          <td style={{ padding: '10px 10px', fontSize: 12 }}>{l.interest_rate}% {l.interest_type}</td>
                          <td style={{ padding: '10px 10px', fontSize: 13 }}>KES {Number(l.total_due).toLocaleString()}</td>
                          <td style={{ padding: '10px 10px', fontSize: 13, color: '#166534' }}>KES {Number(l.total_paid || 0).toLocaleString()}</td>
                          <td style={{ padding: '10px 10px', fontSize: 13, fontWeight: 700, color: Number(l.balance) > 0 ? '#dc2626' : '#166534' }}>
                            KES {Number(l.balance || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '10px 10px', fontSize: 12, color: new Date(l.due_at) < new Date() && l.status === 'active' ? '#dc2626' : '#64748b' }}>
                            {new Date(l.due_at).toLocaleDateString('en-KE')}
                          </td>
                          <td style={{ padding: '10px 10px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                              background: l.status === 'active' ? '#eff6ff' : l.status === 'completed' ? '#f0fdf4' : '#fef2f2',
                              color: l.status === 'active' ? '#1d4ed8' : l.status === 'completed' ? '#166534' : '#dc2626' }}>{l.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                }
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}