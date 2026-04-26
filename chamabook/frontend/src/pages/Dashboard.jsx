import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  sacco:   '#166534',
  saccoLt: '#f0fdf4',
  saccoBd: '#bbf7d0',
  tb:      '#1e40af',
  tbLt:    '#eff6ff',
  tbBd:    '#bfdbfe',
  welfare: '#be185d',
  welfareLt:'#fdf2f8',
  shares:  '#6d28d9',
  sharesLt:'#f5f3ff',
  fines:   '#b91c1c',
  finesLt: '#fef2f2',
  loans:   '#b45309',
  loansLt: '#fffbeb',
  text:    '#0f172a',
  muted:   '#64748b',
  faint:   '#94a3b8',
  border:  '#e2e8f0',
  surface: '#f8fafc',
}

const mono = { fontFamily: "'DM Mono', 'Courier New', monospace" }
const sans = { fontFamily: "'Outfit', 'Segoe UI', sans-serif" }

// ── Tiny icons ────────────────────────────────────────────────────────────────
const Ic = {
  users: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>),
  money: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
    </svg>),
  bank: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2L2 7h20L12 2z"/>
    </svg>),
  heart: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>),
  trend: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>),
  warn: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>),
  chart: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>),
  calendar: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>),
  arrowRight: (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>),
  briefcase: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="12"/>
    </svg>),
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
const BarChart = ({ data, height = 120, colorA = C.sacco, colorB = C.tb, showLegend = true }) => {
  if (!data?.length) return null
  const maxVal = Math.max(...data.map(d => (d.sacco || 0) + (d.tb || 0) + (d.total || 0)), 1)
  const w = 100 / data.length
  return (
    <div>
      {showLegend && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 11, color: C.muted }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: colorA, display: 'inline-block' }} />SACCO
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: colorB, display: 'inline-block' }} />Table Banking
          </span>
        </div>
      )}
      <svg viewBox={`0 0 100 ${height}`} style={{ width: '100%', height, overflow: 'visible' }}>
        {data.map((d, i) => {
          const sacco = d.sacco || 0, tb = d.tb || 0, repay = d.total || 0
          const saccoH = (sacco / maxVal) * (height - 20)
          const tbH    = (tb    / maxVal) * (height - 20)
          const repayH = (repay / maxVal) * (height - 20)
          const x = i * w + w * 0.15, barW = w * 0.33
          return (
            <g key={i}>
              {sacco > 0 && <rect x={x} y={height - 20 - saccoH} width={barW} height={saccoH} fill={colorA} rx={2} opacity={0.85} />}
              {tb    > 0 && <rect x={x + barW + 1} y={height - 20 - tbH} width={barW} height={tbH} fill={colorB} rx={2} opacity={0.85} />}
              {repay > 0 && !sacco && !tb && <rect x={x} y={height - 20 - repayH} width={barW * 2 + 1} height={repayH} fill={colorA} rx={2} opacity={0.85} />}
              <text x={i * w + w / 2} y={height - 4} textAnchor="middle" style={{ fontSize: 5, fill: C.faint }}>{d.month}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Donut chart ───────────────────────────────────────────────────────────────
const DonutChart = ({ segments, size = 140, thickness = 28 }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 11, color: C.faint }}>No data</span>
    </div>
  )
  const r = size / 2 - thickness / 2, cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  let offset = 0
  const slices = segments.map(seg => {
    const pct = seg.value / total
    const dash = pct * circ, gap = circ - dash
    const slice = { ...seg, dash, gap, offset }
    offset += dash
    return slice
  })
  return (
    <svg width={size} height={size}>
      {slices.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset + circ * 0.25}
          style={{ transition: 'stroke-dasharray 0.5s' }} />
      ))}
      <text x={cx} y={cy - 5} textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: '#1e293b', fontFamily: 'DM Mono, monospace' }}>KES</text>
      <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: 8, fill: C.muted, fontFamily: 'DM Mono, monospace' }}>
        {Number(total).toLocaleString()}
      </text>
    </svg>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
const ProgressBar = ({ value, max, color = C.sacco, height = 5 }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ height, background: '#f1f5f9', borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: height, transition: 'width 0.5s' }} />
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, iconColor, bg, label, value, sub, onClick }) => (
  <div onClick={onClick} style={{ background: 'white', borderRadius: 14, padding: '18px 20px', cursor: 'pointer',
    border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.15s' }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor }}>
        {icon}
      </div>
      <span style={{ fontSize: 11, color: C.faint, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
        Details {Ic.arrowRight}
      </span>
    </div>
    <div style={{ fontSize: 20, fontWeight: 700, color: iconColor, ...mono, letterSpacing: '-0.5px' }}>{value}</div>
    <div style={{ fontSize: 12, color: C.muted, marginTop: 3, fontWeight: 500 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>{sub}</div>}
  </div>
)

// ── Section header ────────────────────────────────────────────────────────────
const SectionHeader = ({ title, icon, onNavigate, navLabel }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: C.text }}>
      {icon} {title}
    </div>
    {onNavigate && (
      <button onClick={onNavigate} style={{ fontSize: 12, color: C.sacco, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
        {navLabel || 'View all'} {Ic.arrowRight}
      </button>
    )}
  </div>
)

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, group, branches, isMemberOnly } = useAuth()
  const navigate = useNavigate()
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [activeModal, setActiveModal] = useState(null)
  const [modalData, setModalData]     = useState(null)
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => {
    if (isMemberOnly) { navigate('/portal'); return }
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [isMemberOnly])

  const openModal = async (type) => {
    setActiveModal(type); setModalData(null); setModalLoading(true)
    try {
      const eps = { members: '/members', contributions: '/contributions', loans: '/loans', welfare: '/welfare', sharecapital: '/sharecapital', fines: '/fines' }
      const res = await api.get(eps[type])
      setModalData(res.data)
    } catch (e) { console.error(e) }
    setModalLoading(false)
  }

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: C.faint, ...sans }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTopColor: C.sacco, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
      Loading dashboard…
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
  if (!data) return null

  const funds = data.total_funds || {}, contribs = data.contributions || {},
        loans = data.loans || {}, welfare = data.welfare || {},
        shares = data.share_capital || {}, fines = data.fines || {},
        trend = data.monthly_contributions || [], repayTrend = data.monthly_repayments || []

  const fundSegments = [
    { label: 'SACCO Savings',  value: funds.sacco_savings || 0,  color: C.sacco   },
    { label: 'Table Banking',  value: funds.tb_savings    || 0,  color: C.tb      },
    { label: 'Welfare',        value: funds.welfare       || 0,  color: C.welfare },
    { label: 'Share Capital',  value: funds.share_capital || 0,  color: C.shares  },
  ].filter(s => s.value > 0)

  // ── Modal content ───────────────────────────────────────────────────────────
  const renderModal = () => {
    if (modalLoading) return (
      <div style={{ padding: 40, textAlign: 'center', color: C.faint }}>
        <div style={{ width: 28, height: 28, border: `3px solid ${C.border}`, borderTopColor: C.sacco, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
    if (!modalData) return null

    const Card3 = ({ items }) => (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 10, marginBottom: 20 }}>
        {items.map(([l, v, c, bg]) => (
          <div key={l} style={{ background: bg || C.surface, borderRadius: 10, padding: 12, textAlign: 'center', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: c, ...mono }}>{v}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
    )

    const NavBtn = ({ label, color, path }) => (
      <button onClick={() => { setActiveModal(null); navigate(path) }}
        style={{ width: '100%', marginTop: 16, padding: '11px', background: color, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {label} {Ic.arrowRight}
      </button>
    )

    switch (activeModal) {
      case 'members': {
        const members = modalData.members || []
        const roleColors = { admin: '#92400e', chairperson: '#1e40af', vice_chairperson: '#4338ca', treasurer: '#065f46', secretary: '#4c1d95', member: '#374151' }
        const byRole = ['admin','chairperson','vice_chairperson','treasurer','secretary','member']
          .map(r => ({ role: r, count: members.filter(m => m.role === r).length })).filter(r => r.count > 0)
        return (
          <div>
            <Card3 items={[
              ['Total', members.length, C.sacco, C.saccoLt],
              ['SACCO + TB', members.filter(m => m.membership_type !== 'sacco_only').length, C.tb, C.tbLt],
              ['SACCO only', members.filter(m => m.membership_type === 'sacco_only').length, C.shares, '#f5f3ff'],
            ]} />
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>By Role</div>
            {byRole.map(({ role, count }) => (
              <div key={role} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ textTransform: 'capitalize', color: roleColors[role] || C.text, fontWeight: 500 }}>{role.replace(/_/g, ' ')}</span>
                  <span style={{ fontWeight: 700, ...mono }}>{count}</span>
                </div>
                <ProgressBar value={count} max={members.length} color={roleColors[role] || C.sacco} />
              </div>
            ))}
            <NavBtn label="View All Members" color={C.sacco} path="/members" />
          </div>
        )
      }

      case 'contributions': {
        const items = modalData.contributions || []
        const byPeriod = {}, bySacco = {}, byTB = {}
        items.forEach(c => {
          const p = c.period || 'Unknown'
          byPeriod[p] = (byPeriod[p] || 0) + Number(c.amount)
          if (c.type === 'sacco_savings') bySacco[p] = (bySacco[p] || 0) + Number(c.amount)
          if (c.type === 'tb_contribution') byTB[p] = (byTB[p] || 0) + Number(c.amount)
        })
        const periods = Object.keys(byPeriod).sort((a,b) => b.localeCompare(a)).slice(0,6)
        const chartData = periods.map(p => ({ month: p.slice(-4), sacco: bySacco[p]||0, tb: byTB[p]||0 })).reverse()
        return (
          <div>
            <Card3 items={[
              ['SACCO', `KES ${Number(contribs.sacco_total||0).toLocaleString()}`, C.sacco, C.saccoLt],
              ['Table Banking', `KES ${Number(contribs.tb_total||0).toLocaleString()}`, C.tb, C.tbLt],
            ]} />
            {chartData.length > 0 && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Trend</div><BarChart data={chartData} height={90} /></div>}
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent</div>
            {items.slice(0, 5).map(c => (
              <div key={c.ID} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <div><div style={{ fontWeight: 500 }}>{c.user?.name}</div><div style={{ fontSize: 11, color: C.faint }}>{c.period} · {c.branch_name || 'General'}</div></div>
                <span style={{ fontWeight: 700, color: C.sacco, ...mono }}>KES {Number(c.amount).toLocaleString()}</span>
              </div>
            ))}
            <NavBtn label="View All Contributions" color={C.tb} path="/contributions" />
          </div>
        )
      }

      case 'loans': {
        const loanList = modalData.loans || []
        const active  = loanList.filter(l => l.status === 'active')
        const cleared = loanList.filter(l => l.status === 'cleared')
        const pending = loanList.filter(l => l.status === 'pending')
        const overdue = active.filter(l => new Date(l.due_at) < new Date())
        return (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                ['SACCO Loaned', loans.sacco_loaned, C.sacco, C.saccoLt],
                ['TB Loaned',    loans.tb_loaned,    C.tb,    C.tbLt],
                ['SACCO Balance',loans.sacco_balance, C.loans, C.loansLt],
                ['TB Balance',   loans.tb_balance,   '#c2410c','#fff7ed'],
              ].map(([l,v,c,bg]) => (
                <div key={l} style={{ background: bg, borderRadius: 10, padding: 12, textAlign: 'center', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: c, ...mono }}>KES {Number(v||0).toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[['Active',active.length,C.loansLt,C.loans],['Cleared',cleared.length,C.saccoLt,'#16a34a'],['Pending',pending.length,C.surface,C.text],['Overdue',overdue.length,C.finesLt,C.fines]].map(([l,v,bg,c]) => (
                <div key={l} style={{ flex: 1, background: bg, borderRadius: 8, padding: 8, textAlign: 'center', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: c, ...mono }}>{v}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{l}</div>
                </div>
              ))}
            </div>
            {active.slice(0, 5).map(l => (
              <div key={l.ID} style={{ marginBottom: 10, background: C.surface, borderRadius: 8, padding: '10px 12px', border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{l.user?.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.loans, ...mono }}>KES {Number(l.balance||0).toLocaleString()}</span>
                </div>
                <ProgressBar value={l.total_paid||0} max={l.total_due||1} color={C.sacco} />
                <div style={{ fontSize: 10, color: C.faint, marginTop: 3 }}>{Math.round(((l.total_paid||0)/(l.total_due||1))*100)}% repaid</div>
              </div>
            ))}
            <NavBtn label="View All Loans" color={C.loans} path="/loans" />
          </div>
        )
      }

      case 'welfare': {
        const { contributions = [], disbursements = [] } = modalData
        const recent = [...contributions.map(c => ({...c, _t:'in'})), ...disbursements.map(d => ({...d, _t:'out'}))]
          .sort((a,b) => new Date(b.CreatedAt) - new Date(a.CreatedAt)).slice(0, 8)
        return (
          <div>
            <Card3 items={[
              ['Balance',   `KES ${Number(welfare.balance||0).toLocaleString()}`,   '#16a34a', C.saccoLt],
              ['Total In',  `KES ${Number(welfare.total_in||0).toLocaleString()}`,  C.tb,      C.tbLt   ],
              ['Total Out', `KES ${Number(welfare.total_out||0).toLocaleString()}`, C.fines,   C.finesLt],
            ]} />
            {recent.map(item => (
              <div key={`${item._t}-${item.ID}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <div><div style={{ fontWeight: 500 }}>{item.user?.name}</div><div style={{ fontSize: 11, color: C.faint }}>{item._t==='out' ? item.reason : item.period||'Contribution'}</div></div>
                <span style={{ fontWeight: 700, color: item._t==='in' ? '#16a34a' : C.fines, ...mono }}>
                  {item._t==='in' ? '+' : '−'}KES {Number(item.amount).toLocaleString()}
                </span>
              </div>
            ))}
            {recent.length === 0 && <p style={{ color: C.faint, textAlign: 'center', padding: 20 }}>No activity yet.</p>}
            <NavBtn label="View Welfare Fund" color={C.welfare} path="/welfare" />
          </div>
        )
      }

      case 'sharecapital': {
        const { summaries = [], grand_total = 0, net_total = 0 } = modalData
        const top = [...summaries].sort((a,b) => b.net_amount - a.net_amount).slice(0, 6)
        const maxS = Math.max(...top.map(s => s.net_amount), 1)
        return (
          <div>
            <Card3 items={[
              ['Committed', `KES ${Number(grand_total||0).toLocaleString()}`,    C.shares, '#f5f3ff'],
              ['Paid In',   `KES ${Number(shares.paid_in||0).toLocaleString()}`, '#16a34a', C.saccoLt],
              ['Net Capital',`KES ${Number(net_total||0).toLocaleString()}`,     C.tb,     C.tbLt   ],
            ]} />
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Shareholders</div>
            {top.map(s => (
              <div key={s.user_id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                  <span>{s.user_name}</span>
                  <span style={{ fontWeight: 700, color: C.shares, ...mono }}>KES {Number(s.net_amount).toLocaleString()}</span>
                </div>
                <ProgressBar value={s.net_amount} max={maxS} color={C.shares} />
              </div>
            ))}
            <NavBtn label="View Share Capital" color={C.shares} path="/sharecapital" />
          </div>
        )
      }

      case 'fines': {
        const fineList = modalData.fines || []
        const unpaid = fineList.filter(f => f.status === 'unpaid')
        const waived = fineList.filter(f => f.status === 'waived')
        return (
          <div>
            <Card3 items={[
              ['Unpaid',    `KES ${Number(fines.unpaid||0).toLocaleString()}`, C.fines,  C.finesLt],
              ['Collected', `KES ${Number(fines.paid||0).toLocaleString()}`,   '#16a34a',C.saccoLt],
              ['Waived',    waived.length,                                     C.shares, '#f5f3ff'],
            ]} />
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outstanding</div>
            {unpaid.slice(0, 6).map(f => (
              <div key={f.ID} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <div><div style={{ fontWeight: 500 }}>{f.user?.name}</div><div style={{ fontSize: 11, color: C.faint }}>{f.reason} · {f.period}</div></div>
                <span style={{ fontWeight: 700, color: C.fines, ...mono }}>KES {Number(f.amount).toLocaleString()}</span>
              </div>
            ))}
            {unpaid.length === 0 && (
              <div style={{ background: C.saccoLt, borderRadius: 8, padding: 16, textAlign: 'center', fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                All fines are settled.
              </div>
            )}
            <NavBtn label="View Fines" color={C.fines} path="/meetings" />
          </div>
        )
      }
      default: return null
    }
  }

  const modalMeta = {
    members: { title: 'Members', icon: Ic.users, color: C.sacco },
    contributions: { title: 'Contributions', icon: Ic.money, color: C.tb },
    loans: { title: 'Loans', icon: Ic.bank, color: C.loans },
    welfare: { title: 'Welfare Fund', icon: Ic.heart, color: C.welfare },
    sharecapital: { title: 'Share Capital', icon: Ic.trend, color: C.shares },
    fines: { title: 'Fines', icon: Ic.warn, color: C.fines },
  }

  return (
    <div style={{ ...sans }}>
      {/* Font import */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap'); @keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: C.sacco, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            {Ic.chart}
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Dashboard</h2>
        </div>
        <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>Welcome back, {user?.name} · {group?.name}</p>
      </div>

      {/* ── Branch pills ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {branches.map(b => (
          <div key={b.ID} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: b.type === 'sacco' ? C.saccoLt : C.tbLt,
            color: b.type === 'sacco' ? C.sacco : C.tb,
            border: `1px solid ${b.type === 'sacco' ? C.saccoBd : C.tbBd}` }}>
            {b.name}
          </div>
        ))}
      </div>

      {/* ── Total Funds ──────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #14532d 0%, #166534 60%, #1d4ed8 140%)', borderRadius: 18, padding: '26px 28px', color: 'white', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        {/* Subtle grid texture */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '24px 24px', borderRadius: 18 }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Total Group Funds</div>
            <div style={{ fontSize: 36, fontWeight: 700, ...mono, letterSpacing: '-1px' }}>KES {Number(funds.total||0).toLocaleString()}</div>
            <div style={{ fontSize: 12, opacity: 0.5, marginTop: 5 }}>All accounts · Active loans excluded</div>
          </div>
          <DonutChart segments={fundSegments} size={118} thickness={22} />
        </div>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginTop: 20 }}>
          {[
            ['SACCO Savings', funds.sacco_savings],
            ['Table Banking', funds.tb_savings],
            ['Welfare Fund',  funds.welfare],
            ['Share Capital', funds.share_capital],
          ].map(([label, value]) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 14px', backdropFilter: 'blur(4px)' }}>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, ...mono }}>KES {Number(value||0).toLocaleString()}</div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${funds.total > 0 ? Math.min(((value||0)/funds.total)*100, 100) : 0}%`, background: 'rgba(255,255,255,0.65)', borderRadius: 2, transition: 'width 0.6s' }} />
              </div>
              <div style={{ fontSize: 10, opacity: 0.5, marginTop: 3 }}>
                {funds.total > 0 ? `${Math.round(((value||0)/funds.total)*100)}%` : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Key Stats ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard key="members" icon={Ic.users} iconColor={C.sacco} bg={C.saccoLt}
          label="Total Members" value={data.member_count}
          sub={`${data.pending_loans||0} loan${data.pending_loans!==1?'s':''} pending`}
          onClick={() => openModal('members')} />
        <StatCard key="contributions" icon={Ic.money} iconColor={C.tb} bg={C.tbLt}
          label="Contributions" value={`KES ${Number(contribs.total||0).toLocaleString()}`}
          sub={`SACCO: KES ${Number(contribs.sacco_total||0).toLocaleString()}`}
          onClick={() => openModal('contributions')} />
        <StatCard key="loans" icon={Ic.bank} iconColor={C.loans} bg={C.loansLt}
          label="Active Loans" value={data.active_loans}
          sub={`KES ${Number(loans.total_balance||0).toLocaleString()} outstanding`}
          onClick={() => openModal('loans')} />
        <StatCard key="welfare" icon={Ic.heart} iconColor={C.welfare} bg={C.welfareLt}
          label="Welfare Balance" value={`KES ${Number(welfare.balance||0).toLocaleString()}`}
          sub={`Out: KES ${Number(welfare.total_out||0).toLocaleString()}`}
          onClick={() => openModal('welfare')} />
        <StatCard key="sharecapital" icon={Ic.trend} iconColor={C.shares} bg={C.sharesLt}
          label="Share Capital" value={`KES ${Number(shares.paid_in||0).toLocaleString()}`}
          sub={`Committed: KES ${Number(shares.committed||0).toLocaleString()}`}
          onClick={() => openModal('sharecapital')} />
        <StatCard key="fines" icon={Ic.warn} iconColor={C.fines} bg={C.finesLt}
          label="Unpaid Fines" value={`KES ${Number(fines.unpaid||0).toLocaleString()}`}
          sub={`Collected: KES ${Number(fines.paid||0).toLocaleString()}`}
          onClick={() => openModal('fines')} />
      </div>

      {/* ── Charts Row ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <SectionHeader title="Monthly Contributions" icon={Ic.chart} onNavigate={() => navigate('/contributions')} />
          <BarChart data={trend} height={110} colorA={C.sacco} colorB={C.tb} />
          {trend.length === 0 && <p style={{ textAlign: 'center', color: C.faint, fontSize: 13 }}>No data yet</p>}
        </div>

        <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <SectionHeader title="Loan Repayments" icon={Ic.bank} onNavigate={() => navigate('/loans')} />
          <BarChart data={repayTrend} height={110} colorA={C.loans} colorB={C.loans} showLegend={false} />
          {repayTrend.length === 0 && <p style={{ textAlign: 'center', color: C.faint, fontSize: 13 }}>No repayments yet</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            {[['Total Loaned', loans.total_loaned, C.loans, C.loansLt], ['Total Repaid', loans.total_repaid, '#16a34a', C.saccoLt]].map(([l,v,c,bg]) => (
              <div key={l} style={{ background: bg, borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: 11, color: C.muted }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: c, ...mono }}>KES {Number(v||0).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <SectionHeader title="Fund Distribution" icon={Ic.chart} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <DonutChart segments={fundSegments} size={120} thickness={24} />
            <div style={{ flex: 1 }}>
              {fundSegments.map(s => (
                <div key={s.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: C.text }}>{s.label}</span>
                    <span style={{ fontWeight: 600, color: s.color, fontSize: 11, ...mono }}>
                      {funds.total > 0 ? `${Math.round((s.value/funds.total)*100)}%` : '0%'}
                    </span>
                  </div>
                  <ProgressBar value={s.value} max={funds.total||1} color={s.color} height={5} />
                  <div style={{ fontSize: 10, color: C.faint, marginTop: 2, ...mono }}>KES {Number(s.value).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SACCO vs TB Comparison ───────────────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 20 }}>
        <SectionHeader title="SACCO vs Table Banking" icon={Ic.bank} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'SACCO', color: C.sacco, bg: C.saccoLt, bd: C.saccoBd, savings: funds.sacco_savings, loaned: loans.sacco_loaned, balance: loans.sacco_balance, repaid: loans.sacco_repaid },
            { label: 'Table Banking', color: C.tb, bg: C.tbLt, bd: C.tbBd, savings: funds.tb_savings, loaned: loans.tb_loaned, balance: loans.tb_balance, repaid: loans.tb_repaid },
          ].map(branch => (
            <div key={branch.label} style={{ background: branch.bg, borderRadius: 12, padding: 16, border: `1px solid ${branch.bd}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: branch.color, marginBottom: 12 }}>{branch.label}</div>
              {[['Savings Balance', branch.savings, branch.color], ['Active Loans', branch.loaned, C.loans], ['Loan Balance', branch.balance, C.fines], ['Loan Repaid', branch.repaid, '#16a34a']].map(([l,v,c]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid rgba(0,0,0,0.05)`, fontSize: 13 }}>
                  <span style={{ color: C.muted }}>{l}</span>
                  <strong style={{ color: c, ...mono }}>KES {Number(v||0).toLocaleString()}</strong>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Row ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 16 }}>
        {/* Recent Contributions */}
        <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <SectionHeader title="Recent Contributions" icon={Ic.money} onNavigate={() => navigate('/contributions')} />
          {!data.recent_contributions?.length
            ? <p style={{ color: C.faint, fontSize: 13 }}>No contributions yet.</p>
            : data.recent_contributions.map(c => (
              <div key={c.ID} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.surface}`, fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{c.user?.name}</div>
                  <div style={{ fontSize: 11, color: C.faint }}>{c.period} · {c.branch_name || 'General'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: C.sacco, ...mono }}>KES {c.amount?.toLocaleString()}</div>
                  {c.fines_deducted > 0 && <div style={{ fontSize: 10, color: C.fines }}>−{c.fines_deducted?.toLocaleString()} fines</div>}
                </div>
              </div>
            ))}
        </div>

        {/* Upcoming Meetings */}
        <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <SectionHeader title="Upcoming Meetings" icon={Ic.calendar} onNavigate={() => navigate('/meetings')} />
          {!data.upcoming_meetings?.length
            ? <p style={{ color: C.faint, fontSize: 13 }}>No upcoming meetings.</p>
            : data.upcoming_meetings.map(m => (
              <div key={m.ID} style={{ padding: '10px 0', borderBottom: `1px solid ${C.surface}` }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                  {new Date(m.scheduled_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
                  {m.location && ` · ${m.location}`}
                </div>
                {m.fine_absent > 0 && <div style={{ fontSize: 11, color: C.fines, marginTop: 3 }}>Absent fine: KES {m.fine_absent}</div>}
              </div>
            ))}
        </div>

        {/* Quick Links */}
        <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>Quick Links</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['Contributions', '/contributions', C.saccoLt, C.sacco],
              ['Loans',         '/loans',         C.tbLt,    C.tb   ],
              ['Welfare',       '/welfare',       C.welfareLt, C.welfare],
              ['Share Capital', '/sharecapital',  C.sharesLt, C.shares],
              ['Members',       '/members',       C.surface,  C.text ],
              ['Meetings',      '/meetings',      C.loansLt,  C.loans],
            ].map(([l, p, bg, c]) => (
              <button key={p} onClick={() => navigate(p)}
                style={{ padding: '11px 12px', background: bg, color: c, border: `1px solid ${C.border}`, borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, textAlign: 'left', transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Modal ────────────────────────────────────────────────────────────── */}
      {activeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(2px)' }}
          onClick={() => setActiveModal(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 18, padding: 28, width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: modalMeta[activeModal]?.color + '18', color: modalMeta[activeModal]?.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {modalMeta[activeModal]?.icon}
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>{modalMeta[activeModal]?.title}</h3>
              </div>
              <button onClick={() => setActiveModal(null)}
                style={{ background: C.surface, border: `1px solid ${C.border}`, width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
                ✕
              </button>
            </div>
            {renderModal()}
          </div>
        </div>
      )}
    </div>
  )
}