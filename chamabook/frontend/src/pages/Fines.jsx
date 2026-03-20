import { useState, useEffect } from 'react'
import api from '../services/api'

export default function Fines() {
  const [fines, setFines] = useState([])
  const [members, setMembers] = useState([])
  const [filter, setFilter] = useState('all')
  const [showIssue, setShowIssue] = useState(false)
  const [showAuto, setShowAuto] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ user_id: '', amount: '', reason: '', period: '', notes: '' })
  const [autoForm, setAutoForm] = useState({ period: '', fine_amount: '' })

  const currentPeriod = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    fetchFines()
    api.get('/members').then(r => setMembers(r.data.members || []))
  }, [])

  const fetchFines = async () => {
    try {
      const res = await api.get('/fines')
      setFines(res.data.fines || [])
    } finally { setLoading(false) }
  }

  const handleIssueFine = async () => {
    setError('')
    if (!form.user_id || !form.amount || !form.reason) return setError('Member, amount and reason are required')
    try {
      await api.post('/fines', { ...form, user_id: Number(form.user_id), amount: Number(form.amount) })
      setShowIssue(false)
      setForm({ user_id: '', amount: '', reason: '', period: '', notes: '' })
      fetchFines()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const handleAutoFines = async () => {
    setError('')
    if (!autoForm.period || !autoForm.fine_amount) return setError('Period and amount are required')
    try {
      const res = await api.post('/fines/auto', { period: autoForm.period, fine_amount: Number(autoForm.fine_amount) })
      alert(`✅ ${res.data.issued} fines issued for ${autoForm.period}`)
      setShowAuto(false)
      fetchFines()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const handlePay = async (id) => {
    await api.put(`/fines/${id}/pay`)
    fetchFines()
  }

  const handleWaive = async (id) => {
    if (!confirm('Waive this fine?')) return
    await api.put(`/fines/${id}/waive`)
    fetchFines()
  }

  const filtered = filter === 'all' ? fines : fines.filter(f => f.status === filter)

  const totals = {
    unpaid: fines.filter(f => f.status === 'unpaid').reduce((s, f) => s + f.amount, 0),
    paid: fines.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0),
  }

  const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }
  const label = { fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 3 }

  const statusColor = { unpaid: { bg: '#fef2f2', color: '#dc2626' }, paid: { bg: '#f0fdf4', color: '#16a34a' }, waived: { bg: '#f1f5f9', color: '#64748b' } }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>⚠️ Fines</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowAuto(true)}
            style={{ padding: '9px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            🤖 Auto-Fine
          </button>
          <button onClick={() => setShowIssue(true)}
            style={{ padding: '9px 16px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            + Issue Fine
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[['Unpaid Fines', `KES ${totals.unpaid.toLocaleString()}`, '#fef2f2', '#dc2626'],
          ['Collected', `KES ${totals.paid.toLocaleString()}`, '#f0fdf4', '#16a34a'],
          ['Total Fines', fines.length, '#f8fafc', '#374151']
        ].map(([lbl, val, bg, color]) => (
          <div key={lbl} style={{ background: bg, borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{lbl}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', 'unpaid', 'paid', 'waived'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: filter === f ? 600 : 400,
              background: filter === f ? '#1a6b3c' : '#f1f5f9', color: filter === f ? 'white' : '#374151' }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Fines list */}
      {loading ? <p>Loading...</p> : (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {filtered.length === 0 ? <p style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>No fines found.</p> : (
            filtered.map(fine => (
              <div key={fine.ID} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{fine.user?.name || '—'}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{fine.reason} {fine.period && `· ${fine.period}`}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {fine.type === 'auto' ? '🤖 Auto' : '✋ Manual'} · Issued by {fine.issued_by_name || '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>KES {fine.amount?.toLocaleString()}</span>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, ...statusColor[fine.status] }}>
                    {fine.status}
                  </span>
                  {fine.status === 'unpaid' && (
                    <>
                      <button onClick={() => handlePay(fine.ID)}
                        style={{ padding: '5px 12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                        Mark Paid
                      </button>
                      <button onClick={() => handleWaive(fine.ID)}
                        style={{ padding: '5px 12px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                        Waive
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Issue Fine Modal */}
      {showIssue && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowIssue(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Issue Fine</h3>
              <button onClick={() => setShowIssue(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 14, marginBottom: 16 }}>{error}</div>}
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={label}>Member *</label>
                <select style={inp} value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}>
                  <option value="">Select member...</option>
                  {members.map(m => <option key={m.ID} value={m.ID}>{m.name} ({m.account_number})</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Amount (KES) *</label>
                <input style={inp} type="number" placeholder="500" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label style={label}>Reason *</label>
                <input style={inp} placeholder="e.g. Late to meeting" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
              <div>
                <label style={label}>Period (optional)</label>
                <input style={inp} type="month" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} />
              </div>
              <button onClick={handleIssueFine}
                style={{ padding: '11px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
                Issue Fine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Fine Modal */}
      {showAuto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowAuto(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>🤖 Auto-Issue Fines</h3>
              <button onClick={() => setShowAuto(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>Automatically fine all members who did not contribute in a given month.</p>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 14, marginBottom: 16 }}>{error}</div>}
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={label}>Month *</label>
                <input style={inp} type="month" defaultValue={currentPeriod} value={autoForm.period} onChange={e => setAutoForm(f => ({ ...f, period: e.target.value }))} />
              </div>
              <div>
                <label style={label}>Fine Amount (KES) *</label>
                <input style={inp} type="number" placeholder="e.g. 200" value={autoForm.fine_amount} onChange={e => setAutoForm(f => ({ ...f, fine_amount: e.target.value }))} />
              </div>
              <button onClick={handleAutoFines}
                style={{ padding: '11px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
                Issue Fines Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
