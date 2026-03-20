import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginType, setLoginType] = useState('phone')
  const [form, setForm] = useState({ identifier: '', password: '' })

  const handleSubmit = async () => {
    setError('')
    if (!form.identifier || !form.password) return setError('All fields are required')
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: form.identifier, password: form.password })
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Login failed')
      login(data.token, data.user, data.group, data.branches || [])
      navigate('/')
    } catch (e) {
      setError('Network error — is the backend running?')
    } finally { setLoading(false) }
  }

  const inp = { width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 15, outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a6b3c 0%, #134d2c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 36, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44 }}>🌱</div>
          <h1 style={{ margin: '8px 0 4px', fontSize: 26, fontWeight: 700, color: '#1a6b3c' }}>ChamaBook</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Sign in to your account</p>
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 14, marginBottom: 20 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {[['phone', '📱 Phone'], ['id', '🪪 ID Number']].map(([type, lbl]) => (
            <button key={type} onClick={() => { setLoginType(type); setForm(f => ({ ...f, identifier: '' })) }}
              style={{ padding: '9px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                background: loginType === type ? '#1a6b3c' : '#f8fafc',
                color: loginType === type ? 'white' : '#374151',
                border: loginType === type ? '2px solid #1a6b3c' : '2px solid #e2e8f0' }}>
              {lbl}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>
              {loginType === 'phone' ? 'Phone Number' : 'ID Number'}
            </label>
            <input style={inp} placeholder={loginType === 'phone' ? '07XXXXXXXX' : 'National ID'}
              value={form.identifier} onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>Password</label>
            <input style={inp} type="password" placeholder="Your password"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <button onClick={handleSubmit} disabled={loading}
            style={{ width: '100%', padding: '13px', background: loading ? '#94a3b8' : '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' }}>
          New group? <Link to="/register" style={{ color: '#1a6b3c', fontWeight: 600 }}>Create account</Link>
        </p>
      </div>
    </div>
  )
}
