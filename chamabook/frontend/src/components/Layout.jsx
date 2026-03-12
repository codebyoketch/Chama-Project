import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { syncOfflineData } from '../services/sync'

export default function Layout() {
  const { user, group, logout } = useAuth()
  const { isOnline, pendingSync } = useOnlineStatus()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSync = async () => {
    if (!isOnline) return alert('You are offline. Connect to internet to sync.')
    const result = await syncOfflineData()
    alert(`Synced ${result.synced} records successfully!`)
  }

  const navItems = [
    { to: '/', label: '📊 Dashboard', end: true },
    { to: '/members', label: '👥 Members' },
    { to: '/contributions', label: '💰 Contributions' },
    { to: '/loans', label: '🏦 Loans' },
    { to: '/minutes', label: '📋 Minutes' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, background: '#1a6b3c', color: 'white',
        display: 'flex', flexDirection: 'column', padding: '24px 0'
      }}>
        {/* Logo */}
        <div style={{ padding: '0 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🌱 ChamaBook</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.8 }}>{group?.name}</p>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '16px 0' }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                display: 'block', padding: '10px 24px', color: 'white',
                textDecoration: 'none', fontSize: 14,
                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                borderLeft: isActive ? '3px solid white' : '3px solid transparent',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Sync + User */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          {/* Online/Offline indicator */}
          <div style={{ fontSize: 12, marginBottom: 8 }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: isOnline ? '#4ade80' : '#f87171', marginRight: 6
            }} />
            {isOnline ? 'Online' : 'Offline'}
            {pendingSync > 0 && (
              <span style={{ marginLeft: 8, background: '#f59e0b', padding: '1px 6px', borderRadius: 10, fontSize: 11 }}>
                {pendingSync} pending
              </span>
            )}
          </div>

          {pendingSync > 0 && isOnline && (
            <button
              onClick={handleSync}
              style={{
                width: '100%', padding: '6px', marginBottom: 8, fontSize: 12,
                background: '#f59e0b', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer'
              }}
            >
              🔄 Sync Now
            </button>
          )}

          <div style={{ fontSize: 13, marginBottom: 8 }}>👤 {user?.name}</div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '8px', fontSize: 13,
              background: 'rgba(255,255,255,0.1)', color: 'white',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: 32, background: '#f8fafc', overflowY: 'auto' }}>
        {/* Offline banner */}
        {!isOnline && (
          <div style={{
            background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8,
            padding: '10px 16px', marginBottom: 24, fontSize: 14, color: '#92400e'
          }}>
            ⚠️ You're offline. Changes will be saved locally and synced when you reconnect.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
