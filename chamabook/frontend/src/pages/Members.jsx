import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const ROLES = ['chairperson', 'vice_chairperson', 'treasurer', 'secretary', 'member']
// Note: 'admin' excluded from AddMember — cannot be assigned when adding a member

const ROLE_STYLE = {
  admin:            ['#fef3c7', '#92400e'],
  chairperson:      ['#dbeafe', '#1e40af'],
  vice_chairperson: ['#e0e7ff', '#4338ca'], // 👈 new — indigo
  treasurer:        ['#d1fae5', '#065f46'],
  secretary:        ['#ede9fe', '#4c1d95'],
  member:           ['#f1f5f9', '#374151'],
}

const ROLE_LABEL = {
  admin:            '🔧 Admin',
  chairperson:      '👑 Chairperson',
  vice_chairperson: '🎖️ Vice Chairperson',
  treasurer:        '💰 Treasurer',
  secretary:        '📋 Secretary',
  member:           '👤 Member',
}

export default function Members() {
  const { isAdmin, isChairpersonOrAbove, isSecretaryOrAbove } = useAuth()
  const [members, setMembers]       = useState([])
  const [search, setSearch]         = useState('')
  const [showAdd, setShowAdd]       = useState(false)
  const [selected, setSelected]     = useState(null)
  const [summary, setSummary]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [resetMember, setResetMember] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [form, setForm] = useState({
    name: '', phone: '', id_number: '', email: '',
    role: 'member', password: '', membership_type: 'both'
  })
  const [error, setError]     = useState('')
  const [tab, setTab]         = useState('contributions')
  const [viewMode, setViewMode] = useState('tiles')

  useEffect(() => { fetchMembers() }, [])

  const fetchMembers = async () => {
    try { const res = await api.get('/members'); setMembers(res.data.members || []) }
    finally { setLoading(false) }
  }

  const loadSummary = async (m) => {
    setSelected(m); setSummary(null); setTab('contributions')
    const res = await api.get(`/members/${m.ID}/summary`)
    setSummary(res.data)
  }

  const handleAdd = async () => {
    setError('')
    if (!form.name || !form.phone || !form.password) return setError('Name, phone and password are required')
    try {
      await api.post('/members', form)
      setShowAdd(false)
      setForm({ name: '', phone: '', id_number: '', email: '', role: 'member', password: '', membership_type: 'both' })
      fetchMembers()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await api.put(`/members/${memberId}/role`, { role: newRole })
      setSelected(prev => prev ? { ...prev, role: newRole } : prev)
      fetchMembers()
    } catch (e) { alert(e.response?.data?.error || 'Failed') }
  }

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this member?')) return
    try {
      await api.delete(`/members/${id}`)
      fetchMembers()
      if (selected?.ID === id) setSelected(null)
    } catch (e) { alert(e.response?.data?.error || 'Cannot deactivate this member') }
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) return alert('Password must be at least 6 characters')
    try {
      await api.put(`/members/${resetMember.ID}/password`, { password: newPassword })
      alert(`✅ Password reset for ${resetMember.name}`)
      setResetMember(null); setNewPassword('')
    } catch (e) { alert(e.response?.data?.error || 'Failed') }
  }

  const handleMembershipType = async (memberId, type) => {
    try {
      await api.put(`/members/${memberId}/membership`, { membership_type: type })
      setSelected(prev => prev ? { ...prev, membership_type: type } : prev)
      fetchMembers()
    } catch (e) { alert(e.response?.data?.error || 'Failed') }
  }

  const filtered = members.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.phone?.includes(search) ||
    m.account_number?.includes(search) ||
    m.id_number?.includes(search)
  )

  const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }
  const lbl = { fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 3 }

  const RoleBadge = ({ role }) => {
    const [bg, color] = ROLE_STYLE[role] || ROLE_STYLE.member
    return (
      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: bg, color, fontWeight: 600, whiteSpace: 'nowrap' }}>
        {ROLE_LABEL[role] || role}
      </span>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>👥 Members ({members.length})</h2>
        {isSecretaryOrAbove && (
          <button onClick={() => setShowAdd(true)}
            style={{ padding: '9px 20px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            + Add Member
          </button>
        )}
      </div>

      {/* Search + View Toggle */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <input placeholder="Search by name, phone, account no. or ID..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inp, maxWidth: 400, flex: 1 }} />
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3, gap: 2, flexShrink: 0 }}>
          {[['tiles', '⊞ Tiles'], ['list', '☰ List']].map(([mode, label]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
                fontWeight: viewMode === mode ? 600 : 400,
                background: viewMode === mode ? 'white' : 'transparent',
                color: viewMode === mode ? '#1a6b3c' : '#64748b',
                boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p>Loading...</p> : (
        <>
          {/* ── Tiles View ── */}
          {viewMode === 'tiles' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {filtered.map(m => (
                <div key={m.ID} onClick={() => loadSummary(m)}
                  style={{ background: 'white', borderRadius: 12, padding: 18, cursor: 'pointer',
                    border: `2px solid ${selected?.ID === m.ID ? '#1a6b3c' : '#f1f5f9'}`,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>📱 {m.phone}</div>
                      {m.id_number && <div style={{ fontSize: 12, color: '#64748b' }}>🪪 {m.id_number}</div>}
                      <div style={{ fontSize: 12, color: '#1a6b3c', fontWeight: 600, marginTop: 2 }}>🏦 {m.account_number}</div>
                      <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 2 }}>
                        {m.membership_type === 'sacco_only' ? '🏛 SACCO only' : '🔄 SACCO + Table Banking'}
                      </div>
                    </div>
                    <RoleBadge role={m.role} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {isAdmin && (
                      <button onClick={e => { e.stopPropagation(); setResetMember(m) }}
                        style={{ flex: 1, padding: '6px', fontSize: 11, background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                        🔑 Reset Password
                      </button>
                    )}
                    {isChairpersonOrAbove && m.role !== 'admin' && (
                      <button onClick={e => { e.stopPropagation(); handleDeactivate(m.ID) }}
                        style={{ flex: 1, padding: '6px', fontSize: 11, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer' }}>
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p style={{ color: '#94a3b8' }}>No members found.</p>}
            </div>
          )}

          {/* ── List View ── */}
          {viewMode === 'list' && (
            <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              {filtered.length === 0
                ? <p style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No members found.</p>
                : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        {['Name', 'Phone', 'Account No.', 'Role', 'Membership', 'Status', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(m => (
                        <tr key={m.ID} onClick={() => loadSummary(m)}
                          style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: selected?.ID === m.ID ? '#f0fdf4' : 'white' }}
                          onMouseEnter={e => { if (selected?.ID !== m.ID) e.currentTarget.style.background = '#f8fafc' }}
                          onMouseLeave={e => { if (selected?.ID !== m.ID) e.currentTarget.style.background = 'white' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                            {m.id_number && <div style={{ fontSize: 11, color: '#94a3b8' }}>🪪 {m.id_number}</div>}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{m.phone}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#1a6b3c', fontWeight: 600 }}>{m.account_number}</td>
                          <td style={{ padding: '12px 16px' }}><RoleBadge role={m.role} /></td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
                              background: m.membership_type === 'sacco_only' ? '#eff6ff' : '#f5f3ff',
                              color: m.membership_type === 'sacco_only' ? '#1d4ed8' : '#7c3aed' }}>
                              {m.membership_type === 'sacco_only' ? '🏛 SACCO only' : '🔄 SACCO + TB'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
                              background: m.is_active ? '#f0fdf4' : '#fef2f2',
                              color: m.is_active ? '#16a34a' : '#dc2626' }}>
                              {m.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {isAdmin && (
                                <button onClick={() => setResetMember(m)}
                                  style={{ padding: '4px 10px', fontSize: 11, background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                                  🔑
                                </button>
                              )}
                              {isChairpersonOrAbove && m.role !== 'admin' && (
                                <button onClick={() => handleDeactivate(m.ID)}
                                  style={{ padding: '4px 10px', fontSize: 11, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer' }}>
                                  Deactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          )}
        </>
      )}

      {/* ── Member Summary Modal ── */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 640, maxHeight: '88vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{selected.name}</h3>
                  <RoleBadge role={selected.role} />
                </div>
                <div style={{ fontSize: 13, color: '#1a6b3c', fontWeight: 600 }}>{selected.account_number}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {selected.phone}
                  {selected.id_number && ` · 🪪 ${selected.id_number}`}
                  {selected.email && ` · ✉️ ${selected.email}`}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Membership Type */}
            {isSecretaryOrAbove && (
              <div style={{ background: '#faf5ff', border: '1px solid #ede9fe', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', marginBottom: 8 }}>Membership Type</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['both', '🔄 SACCO + Table Banking'], ['sacco_only', '🏛 SACCO only']].map(([val, label]) => (
                    <button key={val} onClick={() => handleMembershipType(selected.ID, val)}
                      style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        background: selected.membership_type === val ? '#7c3aed' : '#f1f5f9',
                        color: selected.membership_type === val ? 'white' : '#374151' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Role assignment — admin only, cannot change own role or other admins */}
            {isAdmin && selected.role !== 'admin' && (
              <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 8 }}>Role / Position</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ROLES.map(r => (
                    <button key={r} onClick={() => handleRoleChange(selected.ID, r)}
                      style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        background: selected.role === r ? '#d97706' : '#f1f5f9',
                        color: selected.role === r ? 'white' : '#374151' }}>
                      {ROLE_LABEL[r] || r}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#92400e', marginTop: 8, opacity: 0.8 }}>
                  ⚠️ Admin role cannot be assigned here. To promote to admin, use the Admin Portal.
                </div>
              </div>
            )}

            {/* Admin badge — read only, cannot be changed from here */}
            {selected.role === 'admin' && isAdmin && (
              <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
                🔧 This member is an <strong>Admin</strong>. Admin roles cannot be changed from here.
              </div>
            )}

            {!summary ? <p>Loading...</p> : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
                  {[
                    ['Contributions', summary.total_contributions, '#f0fdf4', '#16a34a'],
                    ['Loan Balance',  summary.total_loan_balance,  '#fffbeb', '#d97706'],
                    ['Unpaid Fines',  summary.total_fines,          '#fef2f2', '#dc2626'],
                    ['Welfare',       summary.total_welfare,         '#fdf2f8', '#db2777'],
                  ].map(([l, v, bg, c]) => (
                    <div key={l} style={{ background: bg, borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>{l}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: c }}>KES {Number(v || 0).toLocaleString()}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                  {[['contributions','💰 Contributions'],['loans','🏦 Loans'],['fines','⚠️ Fines'],['attendance','📅 Meetings']].map(([t, l]) => (
                    <button key={t} onClick={() => setTab(t)}
                      style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12,
                        fontWeight: tab === t ? 600 : 400, background: tab === t ? '#1a6b3c' : '#f1f5f9',
                        color: tab === t ? 'white' : '#374151' }}>
                      {l}
                    </button>
                  ))}
                </div>

                {tab === 'contributions' && (
                  summary.contributions?.length === 0
                    ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>No contributions.</p>
                    : summary.contributions?.map(c => (
                      <div key={c.ID} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                        <div>
                          <span style={{ fontWeight: 500 }}>{c.period}</span>
                          <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>{c.branch_name || 'General'}</span>
                          {c.fines_deducted > 0 && <span style={{ fontSize: 12, color: '#dc2626', marginLeft: 8 }}>(-KES {c.fines_deducted} fines)</span>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: '#1a6b3c' }}>KES {c.amount?.toLocaleString()}</div>
                          {c.fines_deducted > 0 && <div style={{ fontSize: 11, color: '#94a3b8' }}>Net: KES {c.net_amount?.toLocaleString()}</div>}
                        </div>
                      </div>
                    ))
                )}

                {tab === 'loans' && (
                  summary.loans?.length === 0
                    ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>No loans.</p>
                    : summary.loans?.map(l => (
                      <div key={l.ID} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontWeight: 600 }}>KES {l.amount?.toLocaleString()} · {l.branch_name || 'General'}</span>
                          <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10,
                            background: l.status === 'cleared' ? '#f0fdf4' : l.status === 'pending' ? '#f3f4f6' : l.status === 'rejected' ? '#fef2f2' : '#fef3c7',
                            color: l.status === 'cleared' ? '#16a34a' : l.status === 'pending' ? '#374151' : l.status === 'rejected' ? '#dc2626' : '#92400e' }}>
                            {l.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#64748b', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                          <span>Monthly: KES {l.monthly_payment?.toLocaleString()}</span>
                          <span>Balance: KES {l.balance?.toLocaleString()}</span>
                          <span>{l.interest_rate}% {l.interest_period === 'annual' ? 'p.a.' : 'p.m.'} {l.interest_type}</span>
                          <span>Due: {new Date(l.due_at).toLocaleDateString('en-KE')}</span>
                        </div>
                        {l.initiated_by_name && (
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                            Initiated by {l.initiated_by_name}
                            {l.approvals?.filter(a => a.action === 'approved').length > 0 && ` · Approved by ${l.approvals.filter(a => a.action === 'approved').map(a => a.approver_name).join(', ')}`}
                          </div>
                        )}
                        {l.status !== 'pending' && (
                          <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
                            <div style={{ height: '100%', width: `${Math.min((l.total_paid/l.total_due)*100,100)}%`, background: '#1a6b3c', borderRadius: 2 }} />
                          </div>
                        )}
                      </div>
                    ))
                )}

                {tab === 'fines' && (
                  summary.fines?.length === 0
                    ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>No fines. 🎉</p>
                    : summary.fines?.map(f => (
                      <div key={f.ID} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                        <div>
                          <div style={{ fontWeight: 500 }}>{f.reason}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>{f.period} · {f.type}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: f.status === 'paid' ? '#16a34a' : '#dc2626' }}>KES {f.amount?.toLocaleString()}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>{f.status}</div>
                        </div>
                      </div>
                    ))
                )}

                {tab === 'attendance' && (
                  summary.attendance?.length === 0
                    ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>No attendance records.</p>
                    : summary.attendance?.map(a => (
                      <div key={a.ID} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                        <div>
                          <div style={{ fontWeight: 500 }}>Meeting #{a.meeting_id}</div>
                          {a.meeting?.title && <div style={{ fontSize: 12, color: '#64748b' }}>{a.meeting.title}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {a.fine_amount > 0 && <span style={{ fontSize: 12, color: '#dc2626' }}>KES {a.fine_amount} fine</span>}
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            background: a.status === 'present' ? '#f0fdf4' : a.status === 'late' ? '#fff7ed' : a.status === 'absent_apology' ? '#fef3c7' : '#fef2f2',
                            color: a.status === 'present' ? '#16a34a' : a.status === 'late' ? '#c2410c' : a.status === 'absent_apology' ? '#92400e' : '#dc2626' }}>
                            {a.status === 'absent_apology' ? '🙏 Apology' : a.status === 'late' ? '⏰ Late' : a.status === 'present' ? '✅ Present' : '❌ Absent'}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setResetMember(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 360 }}>
            <h3 style={{ margin: '0 0 8px' }}>Reset Password</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>
              Setting new password for <strong>{resetMember.name}</strong>
              <span style={{ marginLeft: 8 }}><RoleBadge role={resetMember.role} /></span>
            </p>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={lbl}>New Password</label>
                <input style={inp} type="password" placeholder="Min 6 characters"
                  value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <button onClick={handleResetPassword}
                style={{ padding: '11px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add member modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowAdd(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Add New Member</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 14, marginBottom: 16 }}>
                {error}
              </div>
            )}
            <div style={{ display: 'grid', gap: 14 }}>
              {[
                ['Full Name *',  'name',      'text',     'e.g. Jane Doe'],
                ['Phone *',      'phone',     'text',     '07XXXXXXXX'],
                ['ID Number',    'id_number', 'text',     'National ID'],
                ['Email',        'email',     'email',    'optional'],
                ['Password *',   'password',  'password', 'Min 6 chars'],
              ].map(([label, key, type, ph]) => (
                <div key={key}>
                  <label style={lbl}>{label}</label>
                  <input style={inp} type={type} placeholder={ph} value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}

              <div>
                <label style={lbl}>Role</label>
                <select style={inp} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => (
                    <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  Admin role can only be assigned via the Admin Portal.
                </div>
              </div>

              <div>
                <label style={lbl}>Membership Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['both', '🔄 SACCO + Table Banking'], ['sacco_only', '🏛 SACCO only']].map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => setForm(f => ({ ...f, membership_type: val }))}
                      style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        background: form.membership_type === val ? '#7c3aed' : '#f5f3ff',
                        color: form.membership_type === val ? 'white' : '#7c3aed' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleAdd}
                style={{ padding: '11px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}