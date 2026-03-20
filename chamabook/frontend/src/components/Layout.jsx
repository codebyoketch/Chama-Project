import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { syncOfflineData } from '../services/sync'

export default function Layout() {
  const { user, group, branches, logout, isMemberOnly, isTreasurerOrAbove, isSecretaryOrAbove, isChairpersonOrAbove, isAdmin } = useAuth()
  const { isOnline, pendingSync } = useOnlineStatus()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }
  const handleSync = async () => {
    if (!isOnline) return alert('You are offline.')
    const result = await syncOfflineData()
    alert(`Synced ${result.synced} records!`)
  }

  const navItems = isMemberOnly
    ? [{ to: '/portal', label: 'My Account', icon: '👤', end: true }]
    : [
        { to: '/', label: 'Dashboard', icon: '📊', end: true },
        { to: '/members', label: 'Members', icon: '👥' },
        { to: '/contributions', label: 'Contributions', icon: '💰' },
        { to: '/loans', label: 'Loans', icon: '🏦' },
        ...(isTreasurerOrAbove ? [{ to: '/welfare', label: 'Welfare', icon: '❤️' }] : []),
        ...(isTreasurerOrAbove ? [{ to: '/sharecapital', label: 'Share Capital', icon: '📈' }] : []),
        ...(isSecretaryOrAbove ? [{ to: '/meetings', label: 'Meetings & Fines', icon: '📅' }] : []),
        { to: '/reports', label: 'Reports', icon: '📈' },
        { to: '/statements', label: 'Statements', icon: '🧾' },
        { to: '/settings', label: 'Settings', icon: '⚙️' },
        ...(isAdmin ? [{ to: '/admin', label: 'Admin Portal', icon: '🔧' }] : []),
      ]

  const bottomItems = isMemberOnly
    ? [{ to: '/portal', label: 'My Account', icon: '👤', end: true }]
    : [
        { to: '/', label: 'Dashboard', icon: '📊', end: true },
        { to: '/members', label: 'Members', icon: '👥' },
        { to: '/contributions', label: 'Contributions', icon: '💰' },
        { to: '/loans', label: 'Loans', icon: '🏦' },
        { to: '/meetings', label: 'Meetings', icon: '📅' },
      ]

  const isMobile = () => window.innerWidth < 768
  const currentPage = navItems.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to))

  const ROLE_BG = { admin: '#fef3c7', chairperson: '#dbeafe', treasurer: '#d1fae5', secretary: '#ede9fe', member: '#f1f5f9' }
  const ROLE_COLOR = { admin: '#92400e', chairperson: '#1e40af', treasurer: '#065f46', secretary: '#4c1d95', member: '#374151' }

  const navStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 24px', color: 'white', textDecoration: 'none',
    fontSize: 14, fontWeight: isActive ? 600 : 400,
    background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
    borderLeft: isActive ? '3px solid white' : '3px solid transparent',
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} />}

      <aside style={{ width: 240, background: '#1a6b3c', color: 'white', display: 'flex', flexDirection: 'column', padding: '24px 0',
        position: isMobile() ? 'fixed' : 'relative', top: 0, left: 0, height: '100vh',
        transform: isMobile() ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: 'transform 0.25s ease', zIndex: 50 }}>
        <div style={{ padding: '0 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🌱 ChamaBook</h1>
              <p style={{ margin: '2px 0 0', fontSize: 11, opacity: 0.75 }}>{group?.name}</p>
            </div>
            {isMobile() && <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}>✕</button>}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {branches.map(b => (
              <span key={b.ID} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600 }}>
                {b.type === 'sacco' ? '🏦' : '💼'} {b.name}
              </span>
            ))}
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setSidebarOpen(false)} style={navStyle}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOnline ? '#4ade80' : '#f87171', display: 'inline-block' }} />
            {isOnline ? 'Online' : 'Offline'}
            {pendingSync > 0 && <span style={{ background: '#f59e0b', padding: '1px 7px', borderRadius: 10, fontSize: 11 }}>{pendingSync}</span>}
          </div>
          {pendingSync > 0 && isOnline && (
            <button onClick={handleSync} style={{ width: '100%', padding: '6px', marginBottom: 8, fontSize: 12, background: '#f59e0b', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              🔄 Sync Now
            </button>
          )}
          <div style={{ fontSize: 12, marginBottom: 2, opacity: 0.9 }}>👤 {user?.name}</div>
          <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 6 }}>🏦 {user?.account_number}</div>
          <span style={{ display: 'inline-block', fontSize: 10, padding: '2px 8px', borderRadius: 10, marginBottom: 10,
            background: ROLE_BG[user?.role], color: ROLE_COLOR[user?.role], fontWeight: 600 }}>
            {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
          </span>
          <button onClick={handleLogout} style={{ display: 'block', width: '100%', padding: '7px', fontSize: 13, background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="mobile-header" style={{ display: 'none', background: '#1a6b3c', color: 'white', padding: '12px 16px', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 30 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>☰</button>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{currentPage?.icon} {currentPage?.label || 'ChamaBook'}</span>
          <div style={{ marginLeft: 'auto', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: isOnline ? '#4ade80' : '#f87171', display: 'inline-block' }} />
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </header>

        <main className="main-content" style={{ flex: 1, padding: '24px', background: '#f8fafc', overflowY: 'auto' }}>
          {!isOnline && <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 14, color: '#92400e' }}>
            ⚠️ Offline — changes save locally and sync when you reconnect.
          </div>}
          <Outlet />
        </main>

        <nav className="bottom-nav" style={{ display: 'none' }}>
          {bottomItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              style={({ isActive }) => ({
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '8px 4px', textDecoration: 'none',
                color: isActive ? '#1a6b3c' : '#94a3b8', fontSize: 10, fontWeight: isActive ? 700 : 400,
                gap: 3, borderTop: isActive ? '2px solid #1a6b3c' : '2px solid transparent',
              })}>
              <span style={{ fontSize: 20 }}>{item.icon}</span><span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-header { display: flex !important; }
          .bottom-nav { display: flex !important; background: white; border-top: 1px solid #e2e8f0; position: sticky; bottom: 0; z-index: 30; }
          .main-content { padding: 16px !important; padding-bottom: 80px !important; }
        }
        @media (max-width: 640px) { table { display: block; overflow-x: auto; white-space: nowrap; } }
        input, select, textarea { font-size: 16px !important; }
      `}</style>
    </div>
  )
}
