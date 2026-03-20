import { useState, useEffect } from 'react'
import api from '../services/api'

const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }
const label = { fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 3 }

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

export default function Welfare() {
  const [data, setData] = useState({ contributions: [], disbursements: [], total_in: 0, total_out: 0, balance: 0 })
  const [members, setMembers] = useState([])
  const [tab, setTab] = useState('overview')
  const [showContrib, setShowContrib] = useState(false)
  const [showDisburse, setShowDisburse] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cForm, setCForm] = useState({ user_id: '', amount: '', period: '', notes: '' })
  const [dForm, setDForm] = useState({ user_id: '', amount: '', reason: '', notes: '' })

  useEffect(() => {
    fetchData()
    api.get('/members').then(r => setMembers(r.data.members || []))
  }, [])

  const fetchData = async () => {
    try {
      const res = await api.get('/welfare')
      setData(res.data)
    } finally { setLoading(false) }
  }

  const handleContrib = async () => {
    setError('')
    if (!cForm.user_id || !cForm.amount) return setError('Member and amount are required')
    try {
      await api.post('/welfare/contribution', { ...cForm, user_id: Number(cForm.user_id), amount: Number(cForm.amount) })
      setShowContrib(false); setCForm({ user_id: '', amount: '', period: '', notes: '' }); fetchData()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const handleDisburse = async () => {
    setError('')
    if (!dForm.user_id || !dForm.amount || !dForm.reason) return setError('Member, amount and reason are required')
    try {
      await api.post('/welfare/disbursement', { ...dForm, user_id: Number(dForm.user_id), amount: Number(dForm.amount) })
      setShowDisburse(false); setDForm({ user_id: '', amount: '', reason: '', notes: '' }); fetchData()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const Modal = ({ show, onClose, title, onSubmit, children }) => !show ? null : (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 14, marginBottom: 16 }}>{error}</div>}
        <div style={{ display: 'grid', gap: 14 }}>
          {children}
          <button onClick={onSubmit} style={{ padding: '11px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>Save</button>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>❤️ Welfare Fund</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setError(''); setShowDisburse(true) }}
            style={{ padding: '9px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            💸 Disburse
          </button>
          <button onClick={() => { setError(''); setShowContrib(true) }}
            style={{ padding: '9px 16px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            + Contribution
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[['Fund Balance', data.balance, '#f0fdf4', '#16a34a'], ['Total In', data.total_in, '#eff6ff', '#1d4ed8'], ['Total Out', data.total_out, '#fef2f2', '#dc2626']].map(([l, v, bg, c]) => (
          <div key={l} style={{ background: bg, borderRadius: 12, padding: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: c }}>KES {Number(v || 0).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['overview', 'Overview'], ['contributions', 'Contributions'], ['disbursements', 'Disbursements']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: tab === t ? 600 : 400, background: tab === t ? '#1a6b3c' : '#f1f5f9',
              color: tab === t ? 'white' : '#374151' }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <p>Loading...</p> : (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {tab === 'overview' && (
            <>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, fontSize: 14, color: '#64748b' }}>Recent Activity</div>
              {[...data.contributions.map(c => ({ ...c, _type: 'in' })), ...data.disbursements.map(d => ({ ...d, _type: 'out' }))]
                .sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt)).slice(0, 15)
                .map(item => (
                  <div key={`${item._type}-${item.ID}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #f8fafc' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{item.user?.name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{item._type === 'out' ? item.reason : item.period || 'Welfare contribution'}</div>
                    </div>
                    <span style={{ fontWeight: 700, color: item._type === 'in' ? '#16a34a' : '#dc2626' }}>
                      {item._type === 'in' ? '+' : '-'}KES {item.amount?.toLocaleString()}
                    </span>
                  </div>
                ))}
            </>
          )}
          {tab === 'contributions' && (data.contributions.length === 0
            ? <p style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>No records yet.</p>
            : data.contributions.map(c => (
              <div key={c.ID} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #f8fafc' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{c.user?.name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{c.period} · Recorded by {c.recorded_by_name}</div>
                </div>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>+KES {c.amount?.toLocaleString()}</span>
              </div>
            )))}
          {tab === 'disbursements' && (data.disbursements.length === 0
            ? <p style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>No records yet.</p>
            : data.disbursements.map(d => (
              <div key={d.ID} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #f8fafc' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{d.user?.name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{d.reason} · Approved by {d.approved_by_name}</div>
                </div>
                <span style={{ fontWeight: 700, color: '#dc2626' }}>-KES {d.amount?.toLocaleString()}</span>
              </div>
            )))}
        </div>
      )}

      <Modal show={showContrib} onClose={() => setShowContrib(false)} title="Record Welfare Contribution" onSubmit={handleContrib}>
        <div>
          <label style={label}>Member *</label>
          <MemberSearch members={members} value={cForm.user_id} onChange={v => setCForm(f => ({ ...f, user_id: v }))} />
        </div>
        <div><label style={label}>Amount (KES) *</label><input style={inp} type="number" placeholder="500" value={cForm.amount} onChange={e => setCForm(f => ({ ...f, amount: e.target.value }))} /></div>
        <div><label style={label}>Period</label><input style={inp} type="month" value={cForm.period} onChange={e => setCForm(f => ({ ...f, period: e.target.value }))} /></div>
        <div><label style={label}>Notes</label><input style={inp} placeholder="Optional" value={cForm.notes} onChange={e => setCForm(f => ({ ...f, notes: e.target.value }))} /></div>
      </Modal>

      <Modal show={showDisburse} onClose={() => setShowDisburse(false)} title="Record Disbursement" onSubmit={handleDisburse}>
        <div>
          <label style={label}>Beneficiary *</label>
          <MemberSearch members={members} value={dForm.user_id} onChange={v => setDForm(f => ({ ...f, user_id: v }))} placeholder="Search beneficiary..." />
        </div>
        <div><label style={label}>Amount (KES) *</label><input style={inp} type="number" placeholder="5000" value={dForm.amount} onChange={e => setDForm(f => ({ ...f, amount: e.target.value }))} /></div>
        <div><label style={label}>Reason *</label><input style={inp} placeholder="e.g. Medical emergency" value={dForm.reason} onChange={e => setDForm(f => ({ ...f, reason: e.target.value }))} /></div>
        <div><label style={label}>Notes</label><input style={inp} placeholder="Optional" value={dForm.notes} onChange={e => setDForm(f => ({ ...f, notes: e.target.value }))} /></div>
      </Modal>
    </div>
  )
}