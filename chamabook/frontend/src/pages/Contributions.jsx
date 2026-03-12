import { useState, useEffect } from 'react'
import api from '../services/api'
import { db, addToSyncQueue, setCache, getCache } from '../db/localDB'
import { isOnline } from '../services/sync'

export default function Contributions() {
  const [contributions, setContributions] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ userId: '', amount: '', period: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7)) // "2024-01"

  useEffect(() => {
    loadData()
  }, [period])

  const loadData = async () => {
    setLoading(true)
    try {
      if (isOnline()) {
        const [contribRes, membersRes] = await Promise.all([
          api.get(`/contributions?period=${period}`),
          api.get('/members'),
        ])
        setContributions(contribRes.data.contributions || [])
        setMembers(membersRes.data.members || [])
        // Cache for offline use
        await setCache(`contributions:${period}`, contribRes.data.contributions)
        await setCache('members', membersRes.data.members)
      } else {
        // Load from local cache
        const cached = await getCache(`contributions:${period}`)
        const cachedMembers = await getCache('members')
        if (cached) setContributions(cached)
        if (cachedMembers) setMembers(cachedMembers)
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!form.userId || !form.amount || !form.period) return alert('Fill all required fields')
    setSaving(true)

    const payload = {
      user_id: parseInt(form.userId),
      amount: parseFloat(form.amount),
      period: form.period,
      notes: form.notes,
      client_temp_id: `temp_${Date.now()}`,
    }

    try {
      if (isOnline()) {
        // Online: send directly to backend
        await api.post('/contributions', payload)
      } else {
        // Offline: save to local IndexedDB queue
        await db.contributions.add({ ...payload, synced: false, createdAt: new Date() })
        await addToSyncQueue('contribution', 'CREATE', payload)
        alert('Saved offline. Will sync when internet returns.')
      }
      setShowForm(false)
      setForm({ userId: '', amount: '', period: '', notes: '' })
      loadData()
    } catch (err) {
      alert('Error saving contribution')
    }
    setSaving(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>💰 Contributions</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            type="month"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}
          />
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ padding: '8px 20px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            + Record Contribution
          </button>
        </div>
      </div>

      {/* Add Contribution Form */}
      {showForm && (
        <div style={{ background: 'white', padding: 24, borderRadius: 8, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px' }}>Record Contribution</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Member *</label>
              <select
                value={form.userId}
                onChange={e => setForm({ ...form, userId: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}
              >
                <option value="">Select member...</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Amount (KES) *</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="e.g. 2000"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Period *</label>
              <input
                type="month"
                value={form.period}
                onChange={e => setForm({ ...form, period: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Notes</label>
              <input
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{ padding: '8px 24px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            >
              {saving ? 'Saving...' : isOnline() ? 'Save' : '💾 Save Offline'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{ padding: '8px 24px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Contributions Table */}
      <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
        ) : contributions.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            No contributions for this period yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Member', 'Amount (KES)', 'Period', 'Date', 'Notes'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#475569' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contributions.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{c.user?.name || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#1a6b3c' }}>
                    KES {Number(c.amount).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{c.period}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748b' }}>
                    {c.paid_at ? new Date(c.paid_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748b' }}>{c.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
