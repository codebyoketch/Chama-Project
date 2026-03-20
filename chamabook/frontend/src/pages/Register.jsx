import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    group_name: '', admin_name: '', phone: '', id_number: '', email: '', password: '', confirm_password: ''
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setError('')
    if (!form.group_name || !form.admin_name || !form.phone || !form.password)
      return setError('Group name, your name, phone and password are required')
    if (form.password !== form.confirm_password) return setError('Passwords do not match')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')

    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_name: form.group_name, admin_name: form.admin_name,
          phone: form.phone, id_number: form.id_number,
          email: form.email, password: form.password,
        })
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Registration failed')
      login(data.token, data.user, data.group, data.branches || [])
      navigate('/')
    } catch (e) {
      setError('Network error — is the backend running?')
    } finally { setLoading(false) }
  }

  const inp = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 15, outline: 'none', boxSizing: 'border-box' }
  const label = { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a6b3c 0%, #134d2c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 36, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40 }}>🌱</div>
          <h1 style={{ margin: '8px 0 4px', fontSize: 24, fontWeight: 700, color: '#1a6b3c' }}>Create your Chama</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Both SACCO and Table Banking branches are created automatically</p>
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 14, marginBottom: 20 }}>{error}</div>}

        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={label}>Group Name *</label>
            <input style={inp} placeholder="e.g. Umoja Savings Group" value={form.group_name} onChange={e => set('group_name', e.target.value)} />
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#166534' }}>
            ✅ Your group will have both a <strong>SACCO</strong> and <strong>Table Banking</strong> branch — same members, separate tracking.
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>YOUR ADMIN ACCOUNT</p>
          </div>

          <div>
            <label style={label}>Full Name *</label>
            <input style={inp} placeholder="e.g. Dishon Oketch" value={form.admin_name} onChange={e => set('admin_name', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={label}>Phone Number *</label>
              <input style={inp} placeholder="07XXXXXXXX" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label style={label}>ID Number</label>
              <input style={inp} placeholder="National ID" value={form.id_number} onChange={e => set('id_number', e.target.value)} />
            </div>
          </div>

          <div>
            <label style={label}>Email (optional)</label>
            <input style={inp} type="email" placeholder="admin@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={label}>Password *</label>
              <input style={inp} type="password" placeholder="Min 6 characters" value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
            <div>
              <label style={label}>Confirm Password *</label>
              <input style={inp} type="password" placeholder="Repeat password" value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} />
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            style={{ width: '100%', padding: '12px', background: loading ? '#94a3b8' : '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4 }}>
            {loading ? 'Creating...' : '🚀 Create Group'}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' }}>
          Already have an account? <Link to="/login" style={{ color: '#1a6b3c', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
