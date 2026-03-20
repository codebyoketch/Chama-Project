import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

// ── Mini SVG bar chart ────────────────────────────────────────────────────────
const BarChart = ({ data, height = 120, colorA = '#1a6b3c', colorB = '#1d4ed8', showLegend = true }) => {
  if (!data?.length) return null
  const maxVal = Math.max(...data.map(d => (d.sacco || 0) + (d.tb || 0) + (d.total || 0)), 1)
  const w = 100 / data.length

  return (
    <div>
      {showLegend && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 11, color: '#64748b' }}>
          <span><span style={{ display:'inline-block', width:10, height:10, background:colorA, borderRadius:2, marginRight:4 }} />SACCO</span>
          <span><span style={{ display:'inline-block', width:10, height:10, background:colorB, borderRadius:2, marginRight:4 }} />Table Banking</span>
        </div>
      )}
      <svg viewBox={`0 0 100 ${height}`} style={{ width:'100%', height, overflow:'visible' }}>
        {data.map((d, i) => {
          const sacco = d.sacco || 0
          const tb = d.tb || 0
          const repay = d.total || 0
          const total = sacco + tb + repay
          const saccoH = ((sacco / maxVal) * (height - 20))
          const tbH = ((tb / maxVal) * (height - 20))
          const repayH = ((repay / maxVal) * (height - 20))
          const x = i * w + w * 0.15
          const barW = w * 0.35

          return (
            <g key={i}>
              {/* SACCO bar */}
              {sacco > 0 && (
                <rect x={x} y={height - 20 - saccoH} width={barW} height={saccoH}
                  fill={colorA} rx={2} opacity={0.9} />
              )}
              {/* TB bar */}
              {tb > 0 && (
                <rect x={x + barW + 1} y={height - 20 - tbH} width={barW} height={tbH}
                  fill={colorB} rx={2} opacity={0.9} />
              )}
              {/* Single bar (repayments) */}
              {repay > 0 && !sacco && !tb && (
                <rect x={x} y={height - 20 - repayH} width={barW * 2 + 1} height={repayH}
                  fill={colorA} rx={2} opacity={0.9} />
              )}
              <text x={i * w + w / 2} y={height - 4} textAnchor="middle"
                style={{ fontSize: 5, fill: '#94a3b8' }}>{d.month}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Donut/Pie chart ───────────────────────────────────────────────────────────
const DonutChart = ({ segments, size = 140, thickness = 28 }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ fontSize: 11, color: '#94a3b8' }}>No data</span>
    </div>
  )

  const r = size / 2 - thickness / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r

  let offset = 0
  const slices = segments.map(seg => {
    const pct = seg.value / total
    const dash = pct * circumference
    const gap = circumference - dash
    const slice = { ...seg, dash, gap, offset, pct }
    offset += dash
    return slice
  })

  return (
    <svg width={size} height={size}>
      {slices.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r}
          fill="none" stroke={s.color} strokeWidth={thickness}
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset + circumference * 0.25}
          style={{ transition: 'stroke-dasharray 0.5s' }} />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 13, fontWeight: 700, fill: '#374151' }}>
        KES
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: 9, fill: '#64748b' }}>
        {Number(total).toLocaleString()}
      </text>
    </svg>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
const ProgressBar = ({ value, max, color = '#1a6b3c', height = 6 }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ height, background: '#f1f5f9', borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: height, transition: 'width 0.5s' }} />
    </div>
  )
}

export default function Dashboard() {
  const { user, group, branches, isMemberOnly } = useAuth()
  const navigate = useNavigate()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
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
      const endpoints = {
        members: '/members', contributions: '/contributions',
        loans: '/loans', welfare: '/welfare',
        sharecapital: '/sharecapital', fines: '/fines',
      }
      const res = await api.get(endpoints[type])
      setModalData(res.data)
    } catch (e) { console.error(e) }
    setModalLoading(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading dashboard...</div>
  if (!data) return null

  const funds     = data.total_funds || {}
  const contribs  = data.contributions || {}
  const loans     = data.loans || {}
  const welfare   = data.welfare || {}
  const shares    = data.share_capital || {}
  const fines     = data.fines || {}
  const trend     = data.monthly_contributions || []
  const repayTrend = data.monthly_repayments || []

  // Fund distribution for donut chart
  const fundSegments = [
    { label: '🏦 SACCO Savings',   value: funds.sacco_savings || 0,  color: '#1a6b3c' },
    { label: '💼 Table Banking',    value: funds.tb_savings || 0,     color: '#1d4ed8' },
    { label: '❤️ Welfare',          value: funds.welfare || 0,         color: '#db2777' },
    { label: '📈 Share Capital',    value: funds.share_capital || 0,  color: '#7c3aed' },
  ].filter(s => s.value > 0)

  const lbl = { fontSize: 11, color: '#64748b', fontWeight: 600 }

  // ── Modal renderers ──────────────────────────────────────────────────────────
  const renderModal = () => {
    if (modalLoading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
    if (!modalData) return null

    switch (activeModal) {
      case 'members': {
        const members = modalData.members || []
        const byRole = ['admin','chairperson','vice_chairperson','treasurer','secretary','member']
          .map(r => ({ role: r, count: members.filter(m => m.role === r).length }))
          .filter(r => r.count > 0)
        const roleColors = { admin:'#92400e', chairperson:'#1e40af', vice_chairperson:'#4338ca', treasurer:'#065f46', secretary:'#4c1d95', member:'#374151' }
        return (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
              {[['Total', members.length, '#1a6b3c'],
                ['SACCO+TB', members.filter(m=>m.membership_type!=='sacco_only').length, '#1d4ed8'],
                ['SACCO only', members.filter(m=>m.membership_type==='sacco_only').length, '#7c3aed']
              ].map(([l,v,c]) => (
                <div key={l} style={{ background:'#f8fafc', borderRadius:10, padding:12, textAlign:'center' }}>
                  <div style={{ fontSize:22, fontWeight:700, color:c }}>{v}</div>
                  <div style={{ fontSize:11, color:'#64748b' }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>By Role</div>
            {byRole.map(({ role, count }) => (
              <div key={role} style={{ marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                  <span style={{ textTransform:'capitalize', color:roleColors[role] || '#374151' }}>{role.replace('_',' ')}</span>
                  <span style={{ fontWeight:700 }}>{count}</span>
                </div>
                <ProgressBar value={count} max={members.length} color={roleColors[role] || '#1a6b3c'} />
              </div>
            ))}
            <button onClick={() => { setActiveModal(null); navigate('/members') }}
              style={{ width:'100%', marginTop:16, padding:10, background:'#1a6b3c', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>
              View All Members →
            </button>
          </div>
        )
      }

      case 'contributions': {
        const items = modalData.contributions || []
        const byPeriod = {}
        const bySacco = {}, byTB = {}
        items.forEach(c => {
          const p = c.period || 'Unknown'
          byPeriod[p] = (byPeriod[p] || 0) + Number(c.amount)
          if (c.type === 'sacco_savings') bySacco[p] = (bySacco[p] || 0) + Number(c.amount)
          if (c.type === 'tb_contribution') byTB[p] = (byTB[p] || 0) + Number(c.amount)
        })
        const periods = Object.keys(byPeriod).sort((a,b) => b.localeCompare(a)).slice(0,6)
        const chartData = periods.map(p => ({ month: p.slice(-6), sacco: bySacco[p]||0, tb: byTB[p]||0 })).reverse()
        return (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:16 }}>
              {[['🏦 SACCO', contribs.sacco_total, '#f0fdf4', '#1a6b3c'],
                ['💼 Table Banking', contribs.tb_total, '#eff6ff', '#1d4ed8']
              ].map(([l,v,bg,c]) => (
                <div key={l} style={{ background:bg, borderRadius:10, padding:12, textAlign:'center' }}>
                  <div style={{ fontSize:15, fontWeight:700, color:c }}>KES {Number(v||0).toLocaleString()}</div>
                  <div style={{ fontSize:11, color:'#64748b' }}>{l}</div>
                </div>
              ))}
            </div>
            {chartData.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Monthly Trend</div>
                <BarChart data={chartData} height={100} />
              </div>
            )}
            <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Recent</div>
            {items.slice(0,5).map(c => (
              <div key={c.ID} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f1f5f9', fontSize:13 }}>
                <div>
                  <div style={{ fontWeight:500 }}>{c.user?.name}</div>
                  <div style={{ fontSize:11, color:'#94a3b8' }}>{c.period} · {c.branch_name||'General'}</div>
                </div>
                <span style={{ fontWeight:700, color:'#1a6b3c' }}>KES {Number(c.amount).toLocaleString()}</span>
              </div>
            ))}
            <button onClick={() => { setActiveModal(null); navigate('/contributions') }}
              style={{ width:'100%', marginTop:16, padding:10, background:'#1d4ed8', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>
              View All Contributions →
            </button>
          </div>
        )
      }

      case 'loans': {
        const loanList = modalData.loans || []
        const active   = loanList.filter(l => l.status === 'active')
        const cleared  = loanList.filter(l => l.status === 'cleared')
        const pending  = loanList.filter(l => l.status === 'pending')
        const overdue  = active.filter(l => new Date(l.due_at) < new Date())
        return (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:16 }}>
              {[['🏦 SACCO Loaned', loans.sacco_loaned, '#f0fdf4', '#1a6b3c'],
                ['💼 TB Loaned', loans.tb_loaned, '#eff6ff', '#1d4ed8'],
                ['🏦 SACCO Balance', loans.sacco_balance, '#fef3c7', '#d97706'],
                ['💼 TB Balance', loans.tb_balance, '#fff7ed', '#c2410c'],
              ].map(([l,v,bg,c]) => (
                <div key={l} style={{ background:bg, borderRadius:10, padding:12, textAlign:'center' }}>
                  <div style={{ fontSize:14, fontWeight:700, color:c }}>KES {Number(v||0).toLocaleString()}</div>
                  <div style={{ fontSize:11, color:'#64748b' }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              {[['Active', active.length, '#fef3c7', '#d97706'],
                ['Cleared', cleared.length, '#f0fdf4', '#16a34a'],
                ['Pending', pending.length, '#f3f4f6', '#374151'],
                ['Overdue', overdue.length, '#fef2f2', '#dc2626'],
              ].map(([l,v,bg,c]) => (
                <div key={l} style={{ flex:1, background:bg, borderRadius:8, padding:'8px', textAlign:'center' }}>
                  <div style={{ fontSize:18, fontWeight:700, color:c }}>{v}</div>
                  <div style={{ fontSize:10, color:'#64748b' }}>{l}</div>
                </div>
              ))}
            </div>
            {active.slice(0,5).map(l => (
              <div key={l.ID} style={{ marginBottom:10, background:'#f8fafc', borderRadius:8, padding:'10px 12px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontWeight:600, fontSize:13 }}>{l.user?.name}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:'#d97706' }}>KES {Number(l.balance||0).toLocaleString()}</span>
                </div>
                <ProgressBar value={l.total_paid||0} max={l.total_due||1} color="#1a6b3c" />
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:3 }}>{Math.round(((l.total_paid||0)/(l.total_due||1))*100)}% repaid</div>
              </div>
            ))}
            <button onClick={() => { setActiveModal(null); navigate('/loans') }}
              style={{ width:'100%', marginTop:8, padding:10, background:'#d97706', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>
              View All Loans →
            </button>
          </div>
        )
      }

      case 'welfare': {
        const { contributions=[], disbursements=[] } = modalData
        const recent = [...contributions.map(c=>({...c,_type:'in'})), ...disbursements.map(d=>({...d,_type:'out'}))]
          .sort((a,b) => new Date(b.CreatedAt)-new Date(a.CreatedAt)).slice(0,8)
        return (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
              {[['Balance', welfare.balance, '#f0fdf4', '#16a34a'],
                ['Total In', welfare.total_in, '#eff6ff', '#1d4ed8'],
                ['Total Out', welfare.total_out, '#fef2f2', '#dc2626'],
              ].map(([l,v,bg,c]) => (
                <div key={l} style={{ background:bg, borderRadius:10, padding:12, textAlign:'center' }}>
                  <div style={{ fontSize:14, fontWeight:700, color:c }}>KES {Number(v||0).toLocaleString()}</div>
                  <div style={{ fontSize:11, color:'#64748b' }}>{l}</div>
                </div>
              ))}
            </div>
            {recent.map(item => (
              <div key={`${item._type}-${item.ID}`} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f1f5f9', fontSize:13 }}>
                <div>
                  <div style={{ fontWeight:500 }}>{item.user?.name}</div>
                  <div style={{ fontSize:11, color:'#94a3b8' }}>{item._type==='out' ? item.reason : item.period||'Contribution'}</div>
                </div>
                <span style={{ fontWeight:700, color:item._type==='in'?'#16a34a':'#dc2626' }}>
                  {item._type==='in'?'+':'-'}KES {Number(item.amount).toLocaleString()}
                </span>
              </div>
            ))}
            {recent.length===0 && <p style={{ color:'#94a3b8', textAlign:'center', padding:20 }}>No activity yet.</p>}
            <button onClick={() => { setActiveModal(null); navigate('/welfare') }}
              style={{ width:'100%', marginTop:16, padding:10, background:'#db2777', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>
              View Welfare Fund →
            </button>
          </div>
        )
      }

      case 'sharecapital': {
        const { summaries=[], grand_total=0, total_withdrawn=0, net_total=0 } = modalData
        const top = [...summaries].sort((a,b) => b.net_amount - a.net_amount).slice(0,6)
        const maxShares = Math.max(...top.map(s => s.net_amount), 1)
        return (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
              {[['Committed', grand_total, '#f5f3ff', '#7c3aed'],
                ['Paid In', shares.paid_in, '#f0fdf4', '#16a34a'],
                ['Net Capital', net_total, '#eff6ff', '#1d4ed8'],
              ].map(([l,v,bg,c]) => (
                <div key={l} style={{ background:bg, borderRadius:10, padding:12, textAlign:'center' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:c }}>KES {Number(v||0).toLocaleString()}</div>
                  <div style={{ fontSize:11, color:'#64748b' }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>Top Shareholders</div>
            {top.map(s => (
              <div key={s.user_id} style={{ marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:3 }}>
                  <span>{s.user_name}</span>
                  <span style={{ fontWeight:700, color:'#7c3aed' }}>KES {Number(s.net_amount).toLocaleString()}</span>
                </div>
                <ProgressBar value={s.net_amount} max={maxShares} color="#7c3aed" />
              </div>
            ))}
            <button onClick={() => { setActiveModal(null); navigate('/sharecapital') }}
              style={{ width:'100%', marginTop:16, padding:10, background:'#7c3aed', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>
              View Share Capital →
            </button>
          </div>
        )
      }

      case 'fines': {
        const fineList = modalData.fines || []
        const unpaid = fineList.filter(f => f.status==='unpaid')
        const paid   = fineList.filter(f => f.status==='paid')
        const waived = fineList.filter(f => f.status==='waived')
        return (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
              {[['Unpaid', fines.unpaid, '#fef2f2', '#dc2626'],
                ['Collected', fines.paid, '#f0fdf4', '#16a34a'],
                ['Waived', waived.length, '#f5f3ff', '#7c3aed'],
              ].map(([l,v,bg,c]) => (
                <div key={l} style={{ background:bg, borderRadius:10, padding:12, textAlign:'center' }}>
                  <div style={{ fontSize:15, fontWeight:700, color:c }}>
                    {l==='Waived' ? v : `KES ${Number(v||0).toLocaleString()}`}
                  </div>
                  <div style={{ fontSize:11, color:'#64748b' }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Outstanding Fines</div>
            {unpaid.slice(0,6).map(f => (
              <div key={f.ID} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f1f5f9', fontSize:13 }}>
                <div>
                  <div style={{ fontWeight:500 }}>{f.user?.name}</div>
                  <div style={{ fontSize:11, color:'#94a3b8' }}>{f.reason} · {f.period}</div>
                </div>
                <span style={{ fontWeight:700, color:'#dc2626' }}>KES {Number(f.amount).toLocaleString()}</span>
              </div>
            ))}
            {unpaid.length===0 && <p style={{ color:'#16a34a', textAlign:'center', padding:20, fontWeight:600 }}>🎉 No unpaid fines!</p>}
            <button onClick={() => { setActiveModal(null); navigate('/meetings') }}
              style={{ width:'100%', marginTop:16, padding:10, background:'#dc2626', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>
              View Fines →
            </button>
          </div>
        )
      }

      default: return null
    }
  }

  const modalTitles = {
    members:'👥 Members', contributions:'💰 Contributions',
    loans:'🏦 Loans', welfare:'❤️ Welfare',
    sharecapital:'📈 Share Capital', fines:'⚠️ Fines',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>📊 Dashboard</h2>
        <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:14 }}>
          Welcome back, {user?.name} · {group?.name}
        </p>
      </div>

      {/* Branch pills */}
      <div style={{ display:'flex', gap:10, marginBottom:24, flexWrap:'wrap' }}>
        {branches.map(b => (
          <div key={b.ID} style={{ padding:'6px 16px', borderRadius:20, fontSize:13, fontWeight:600,
            background: b.type==='sacco'?'#f0fdf4':'#eff6ff',
            color: b.type==='sacco'?'#1a6b3c':'#1d4ed8',
            border: `1px solid ${b.type==='sacco'?'#bbf7d0':'#bfdbfe'}` }}>
            {b.type==='sacco'?'🏦':'💼'} {b.name}
          </div>
        ))}
      </div>

      {/* ── Total Funds Card ─────────────────────────────────────────────────── */}
      <div style={{ background:'linear-gradient(135deg,#1a6b3c,#134d2c)', borderRadius:16, padding:'24px 28px', color:'white', marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ fontSize:13, opacity:0.75, marginBottom:4 }}>Total Group Funds</div>
            <div style={{ fontSize:34, fontWeight:700 }}>KES {Number(funds.total||0).toLocaleString()}</div>
            <div style={{ fontSize:12, opacity:0.65, marginTop:4 }}>Across all accounts · Active loans excluded</div>
          </div>
          <DonutChart segments={fundSegments} size={120} thickness={22} />
        </div>

        {/* Fund breakdown */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px,1fr))', gap:10, marginTop:20 }}>
          {[
            ['🏦 SACCO Savings', funds.sacco_savings, '#bbf7d0', '#1a6b3c'],
            ['💼 Table Banking', funds.tb_savings,    '#bfdbfe', '#1d4ed8'],
            ['❤️ Welfare Fund',  funds.welfare,        '#fbcfe8', '#db2777'],
            ['📈 Share Capital', funds.share_capital,  '#ddd6fe', '#7c3aed'],
          ].map(([label, value, bg, color]) => (
            <div key={label} style={{ background:'rgba(255,255,255,0.12)', borderRadius:10, padding:'12px 14px' }}>
              <div style={{ fontSize:11, opacity:0.8, marginBottom:4 }}>{label}</div>
              <div style={{ fontSize:16, fontWeight:700 }}>KES {Number(value||0).toLocaleString()}</div>
              <div style={{ height:3, background:'rgba(255,255,255,0.2)', borderRadius:2, marginTop:6, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${funds.total>0?Math.min(((value||0)/funds.total)*100,100):0}%`, background:'rgba(255,255,255,0.7)', borderRadius:2 }} />
              </div>
              <div style={{ fontSize:10, opacity:0.6, marginTop:2 }}>
                {funds.total>0 ? `${Math.round(((value||0)/funds.total)*100)}% of total` : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Key Stats Grid ───────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:14, marginBottom:20 }}>
        {[
          { key:'members',      label:'Total Members',     value:data.member_count,                             icon:'👥', color:'#1a6b3c', bg:'#f0fdf4', sub:`${data.pending_loans||0} loan${data.pending_loans!==1?'s':''} pending` },
          { key:'contributions',label:'Contributions',     value:`KES ${Number(contribs.total||0).toLocaleString()}`, icon:'💰', color:'#1d4ed8', bg:'#eff6ff', sub:`SACCO: KES ${Number(contribs.sacco_total||0).toLocaleString()}` },
          { key:'loans',        label:'Active Loans',      value:data.active_loans,                             icon:'🏦', color:'#d97706', bg:'#fffbeb', sub:`KES ${Number(loans.total_balance||0).toLocaleString()} outstanding` },
          { key:'welfare',      label:'Welfare Balance',   value:`KES ${Number(welfare.balance||0).toLocaleString()}`, icon:'❤️', color:'#db2777', bg:'#fdf2f8', sub:`Out: KES ${Number(welfare.total_out||0).toLocaleString()}` },
          { key:'sharecapital', label:'Share Capital',     value:`KES ${Number(shares.paid_in||0).toLocaleString()}`, icon:'📈', color:'#7c3aed', bg:'#f5f3ff', sub:`Committed: KES ${Number(shares.committed||0).toLocaleString()}` },
          { key:'fines',        label:'Unpaid Fines',      value:`KES ${Number(fines.unpaid||0).toLocaleString()}`,   icon:'⚠️', color:'#dc2626', bg:'#fef2f2', sub:`Collected: KES ${Number(fines.paid||0).toLocaleString()}` },
        ].map(s => (
          <div key={s.key} onClick={() => openModal(s.key)}
            style={{ background:s.bg, borderRadius:12, padding:'16px 18px', cursor:'pointer',
              boxShadow:'0 1px 3px rgba(0,0,0,0.06)', transition:'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ fontSize:22 }}>{s.icon}</div>
              <span style={{ fontSize:10, color:s.color, opacity:0.7, fontWeight:600 }}>Details ›</span>
            </div>
            <div style={{ fontSize:20, fontWeight:700, color:s.color, marginTop:6 }}>{s.value}</div>
            <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{s.label}</div>
            {s.sub && <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Charts Row ───────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px,1fr))', gap:16, marginBottom:20 }}>

        {/* Contribution trend */}
        <div style={{ background:'white', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:600 }}>💰 Monthly Contributions</div>
            <button onClick={() => navigate('/contributions')} style={{ fontSize:11, color:'#1a6b3c', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>View →</button>
          </div>
          <BarChart data={trend} height={110} colorA="#1a6b3c" colorB="#1d4ed8" />
          {trend.length === 0 && <p style={{ textAlign:'center', color:'#94a3b8', fontSize:13 }}>No data yet</p>}
        </div>

        {/* Loan repayments trend */}
        <div style={{ background:'white', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:600 }}>🏦 Monthly Loan Repayments</div>
            <button onClick={() => navigate('/loans')} style={{ fontSize:11, color:'#1a6b3c', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>View →</button>
          </div>
          <BarChart data={repayTrend} height={110} colorA="#d97706" colorB="#d97706" showLegend={false} />
          {repayTrend.length === 0 && <p style={{ textAlign:'center', color:'#94a3b8', fontSize:13 }}>No repayments yet</p>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:12 }}>
            <div style={{ background:'#fffbeb', borderRadius:8, padding:'8px 12px' }}>
              <div style={{ fontSize:11, color:'#64748b' }}>Total Loaned (Active)</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#d97706' }}>KES {Number(loans.total_loaned||0).toLocaleString()}</div>
            </div>
            <div style={{ background:'#f0fdf4', borderRadius:8, padding:'8px 12px' }}>
              <div style={{ fontSize:11, color:'#64748b' }}>Total Repaid</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#16a34a' }}>KES {Number(loans.total_repaid||0).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Fund distribution donut */}
        <div style={{ background:'white', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>📊 Fund Distribution</div>
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <DonutChart segments={fundSegments} size={130} thickness={26} />
            <div style={{ flex:1 }}>
              {fundSegments.map(s => (
                <div key={s.label} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                    <span style={{ color:'#374151' }}>{s.label}</span>
                    <span style={{ fontWeight:600, color:s.color, fontSize:11 }}>
                      {funds.total>0 ? `${Math.round((s.value/funds.total)*100)}%` : '0%'}
                    </span>
                  </div>
                  <ProgressBar value={s.value} max={funds.total||1} color={s.color} height={5} />
                  <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>KES {Number(s.value).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SACCO vs TB Comparison ───────────────────────────────────────────── */}
      <div style={{ background:'white', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', marginBottom:20 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>🏦 SACCO vs 💼 Table Banking</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {[
            { label:'🏦 SACCO', color:'#1a6b3c', bg:'#f0fdf4', savings: funds.sacco_savings, loaned: loans.sacco_loaned, balance: loans.sacco_balance, repaid: loans.sacco_repaid },
            { label:'💼 Table Banking', color:'#1d4ed8', bg:'#eff6ff', savings: funds.tb_savings, loaned: loans.tb_loaned, balance: loans.tb_balance, repaid: loans.tb_repaid },
          ].map(branch => (
            <div key={branch.label} style={{ background:branch.bg, borderRadius:10, padding:'16px' }}>
              <div style={{ fontSize:15, fontWeight:700, color:branch.color, marginBottom:12 }}>{branch.label}</div>
              {[
                ['Savings Balance', branch.savings, branch.color],
                ['Active Loans',    branch.loaned,  '#d97706'],
                ['Loan Balance',    branch.balance,  '#dc2626'],
                ['Loan Repaid',     branch.repaid,   '#16a34a'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(0,0,0,0.04)', fontSize:13 }}>
                  <span style={{ color:'#64748b' }}>{l}</span>
                  <strong style={{ color:c }}>KES {Number(v||0).toLocaleString()}</strong>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Row ───────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px,1fr))', gap:16 }}>

        {/* Recent contributions */}
        <div style={{ background:'white', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <h3 style={{ margin:0, fontSize:14, fontWeight:600 }}>Recent Contributions</h3>
            <button onClick={() => navigate('/contributions')} style={{ fontSize:11, color:'#1a6b3c', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>View all →</button>
          </div>
          {data.recent_contributions?.length === 0
            ? <p style={{ color:'#94a3b8', fontSize:13 }}>No contributions yet.</p>
            : data.recent_contributions?.map(c => (
              <div key={c.ID} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f8fafc', fontSize:13 }}>
                <div>
                  <div style={{ fontWeight:500 }}>{c.user?.name}</div>
                  <div style={{ fontSize:11, color:'#94a3b8' }}>{c.period} · {c.branch_name||'General'}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:700, color:'#1a6b3c' }}>KES {c.amount?.toLocaleString()}</div>
                  {c.fines_deducted > 0 && <div style={{ fontSize:10, color:'#dc2626' }}>-{c.fines_deducted?.toLocaleString()} fines</div>}
                </div>
              </div>
            ))}
        </div>

        {/* Upcoming meetings */}
        <div style={{ background:'white', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <h3 style={{ margin:0, fontSize:14, fontWeight:600 }}>Upcoming Meetings</h3>
            <button onClick={() => navigate('/meetings')} style={{ fontSize:11, color:'#1a6b3c', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>View all →</button>
          </div>
          {data.upcoming_meetings?.length === 0
            ? <p style={{ color:'#94a3b8', fontSize:13 }}>No upcoming meetings.</p>
            : data.upcoming_meetings?.map(m => (
              <div key={m.ID} style={{ padding:'10px 0', borderBottom:'1px solid #f8fafc' }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{m.title}</div>
                <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
                  📅 {new Date(m.scheduled_at).toLocaleDateString('en-KE', { dateStyle:'medium' })}
                  {m.location && ` · 📍 ${m.location}`}
                </div>
                {m.fine_absent > 0 && <div style={{ fontSize:11, color:'#dc2626', marginTop:2 }}>Absent fine: KES {m.fine_absent}</div>}
              </div>
            ))}
        </div>

        {/* Quick links */}
        <div style={{ background:'white', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin:'0 0 14px', fontSize:14, fontWeight:600 }}>Quick Links</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              { label:'💰 Contributions', path:'/contributions', color:'#f0fdf4', text:'#1a6b3c' },
              { label:'🏦 Loans',         path:'/loans',         color:'#eff6ff', text:'#1d4ed8' },
              { label:'❤️ Welfare',       path:'/welfare',       color:'#fdf2f8', text:'#db2777' },
              { label:'📈 Share Capital', path:'/sharecapital',  color:'#f5f3ff', text:'#7c3aed' },
              { label:'👥 Members',       path:'/members',       color:'#f8fafc', text:'#374151' },
              { label:'📅 Meetings',      path:'/meetings',      color:'#fffbeb', text:'#d97706' },
            ].map(link => (
              <button key={link.path} onClick={() => navigate(link.path)}
                style={{ padding:'11px', background:link.color, color:link.text, border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, textAlign:'left' }}>
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {activeModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setActiveModal(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:480, maxHeight:'88vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ margin:0, fontSize:17 }}>{modalTitles[activeModal]}</h3>
              <button onClick={() => setActiveModal(null)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>✕</button>
            </div>
            {renderModal()}
          </div>
        </div>
      )}
    </div>
  )
}
