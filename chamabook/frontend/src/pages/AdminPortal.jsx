import { useState, useEffect } from 'react'
import api from '../services/api'

// ── Design tokens (same as Dashboard) ────────────────────────────────────────
const C = {
  sacco: '#166534', saccoLt: '#f0fdf4', saccoBd: '#bbf7d0',
  tb: '#1e40af', tbLt: '#eff6ff', tbBd: '#bfdbfe',
  fines: '#b91c1c', finesLt: '#fef2f2',
  shares: '#6d28d9', sharesLt: '#f5f3ff',
  loans: '#b45309', loansLt: '#fffbeb',
  welfare: '#be185d',
  text: '#0f172a', muted: '#64748b', faint: '#94a3b8',
  border: '#e2e8f0', surface: '#f8fafc',
}
const mono = { fontFamily: "'DM Mono', 'Courier New', monospace" }
const sans = { fontFamily: "'Outfit', 'Segoe UI', sans-serif" }

const TABS = [
  { key: 'members',       label: 'Members'       },
  { key: 'contributions', label: 'Contributions' },
  { key: 'payouts',       label: 'Payouts'       },
  { key: 'loans',         label: 'Loans'         },
  { key: 'fines',         label: 'Fines'         },
  { key: 'welfare',       label: 'Welfare In'    },
  { key: 'disbursements', label: 'Welfare Out'   },
  { key: 'sharecapital',  label: 'Shares'        },
  { key: 'withdrawals',   label: 'Share W/D'     },
  { key: 'meetings',      label: 'Meetings'      },
]

const COLUMNS = {
  members:       ['ID','name','phone','id_number','account_number','email','role','membership_type','is_active'],
  contributions: ['ID','user_id','amount','fines_deducted','net_amount','period','paid_at','branch_name','recorded_by_name','notes'],
  payouts:       ['ID','user_id','amount','reason','period','approved_by_name','notes'],
  loans:         ['ID','user_id','amount','interest_rate','interest_type','term_months','monthly_payment','total_due','total_paid','balance','status','due_at'],
  fines:         ['ID','user_id','amount','reason','period','type','status','issued_by_name'],
  welfare:       ['ID','user_id','amount','period','paid_at','recorded_by_name','notes'],
  disbursements: ['ID','user_id','amount','reason','approved_by_name','notes'],
  sharecapital:  ['ID','user_id','shares','share_price','amount','type','paid_at','recorded_by_name','notes'],
  withdrawals:   ['ID','user_id','shares','amount_per_share','total_amount','reason','approved_by_name'],
  meetings:      ['ID','title','scheduled_at','location','status','fine_absent','fine_absent_apology'],
}
const EDITABLE = ['members','contributions','loans','fines']
const AMT_COLS = ['amount','fines_deducted','net_amount','monthly_payment','total_due','total_paid','balance','share_price','total_amount','amount_per_share','fine_absent','fine_absent_apology']

// ── Inline icons ──────────────────────────────────────────────────────────────
const EditIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const TrashIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
)
const UploadIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)
const RefreshIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)

// ── Bulk Import ───────────────────────────────────────────────────────────────
function BulkImport({ onDone }) {
  const [file, setFile] = useState(null)
  const [rows, setRows] = useState([])
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const ALL_COLS = ['name','phone','id_number','email','role','membership_type','password','contrib_balance','contrib_period','loan_balance','loan_interest_rate','loan_term_months','welfare_balance','share_capital','share_price','shares']

  const downloadTemplate = () => {
    const header = ALL_COLS.join(',')
    const example = ['Jane Doe','0712345678','12345678','jane@email.com','member','both','','15000','2025-01','5000','10','12','2000','3000','300','10'].join(',')
    const notes = [
      '# INSTRUCTIONS — DELETE THESE COMMENT LINES BEFORE UPLOADING',
      '# name - Required. phone - Required.',
      '# role: admin/chairperson/treasurer/secretary/member (default: member)',
      '# membership_type: both/sacco_only (default: both)',
      '# password: defaults to phone number if blank',
    ].join('\n')
    const blob = new Blob([`${notes}\n${header}\n${example}`], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'chamabook_import_template.csv'
    a.click()
  }

  const handleFile = (e) => {
    const f = e.target.files[0]; if (!f) return
    setFile(f); setError(''); setResults(null); setRows([])
    const reader = new FileReader()
    reader.onload = (evt) => {
      const lines = evt.target.result.split('\n').filter(l => !l.startsWith('#') && l.trim())
      if (lines.length < 2) { setError('File must have a header row and at least one data row'); return }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g,'_'))
      if (!headers.includes('name') || !headers.includes('phone')) {
        setError('Missing required columns: "name" and/or "phone". Please use the template.'); return
      }
      const parsed = []
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g,''))
        if (vals.every(v => !v)) continue
        const obj = {}
        headers.forEach((h, idx) => { obj[h] = vals[idx] || '' })
        for (const nf of ['contrib_balance','loan_balance','loan_interest_rate','loan_term_months','welfare_balance','share_capital','share_price','shares']) {
          obj[nf] = obj[nf] ? Number(obj[nf]) : 0
        }
        parsed.push(obj)
      }
      setRows(parsed)
    }
    reader.readAsText(f)
  }

  const handleImport = async () => {
    if (!rows.length) return setError('No valid rows to import')
    setLoading(true)
    try {
      const res = await api.post('/admin/import', rows)
      setResults(res.data)
      if (res.data.imported > 0) setTimeout(onDone, 3000)
    } catch (e) { setError(e.response?.data?.error || 'Import failed') }
    setLoading(false)
  }

  const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, boxSizing: 'border-box' }

  return (
    <div style={{ ...sans }}>
      {/* Instructions */}
      <div style={{ background: C.saccoLt, border: `1px solid ${C.saccoBd}`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
        <div style={{ fontWeight: 700, color: C.sacco, marginBottom: 6 }}>How to import members</div>
        <ol style={{ margin: 0, paddingLeft: 18, color: C.text, lineHeight: 2 }}>
          <li>Download the CSV template</li>
          <li>Open in Excel or Google Sheets and fill in your members</li>
          <li>Only <strong>name</strong> and <strong>phone</strong> are required</li>
          <li>Save as <strong>.csv</strong> and upload here</li>
        </ol>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Default password for each member is their phone number unless specified.</div>
      </div>

      <button onClick={downloadTemplate}
        style={{ width: '100%', padding: 11, marginBottom: 16, background: C.sharesLt, color: C.shares, border: `1px solid #ede9fe`, borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <UploadIcon /> Download CSV Template
      </button>

      {/* Column reference */}
      <details style={{ marginBottom: 16 }}>
        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.muted, padding: '6px 0' }}>Column Reference</summary>
        <div style={{ marginTop: 8, background: C.surface, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.saccoLt }}>
                {['Column','Required','Notes'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.sacco, fontWeight: 600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['name','Yes','Full name of member'],['phone','Yes','Must be unique'],
                ['id_number','No','National ID'],['email','No',''],
                ['role','No','member/treasurer/secretary/chairperson/admin'],
                ['membership_type','No','both (default) / sacco_only'],
                ['password','No','Defaults to phone'],
                ['contrib_balance','No','Opening contribution KES'],
                ['loan_balance','No','Outstanding loan KES'],
                ['share_capital','No','Total share capital KES'],
              ].map(([col, req, ex]) => (
                <tr key={col} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '7px 12px', fontWeight: 600, color: C.text }}>{col}</td>
                  <td style={{ padding: '7px 12px', color: req==='Yes' ? '#16a34a' : C.muted }}>{req}</td>
                  <td style={{ padding: '7px 12px', color: C.faint, fontSize: 11 }}>{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Drop zone */}
      <div style={{ border: `2px dashed ${file ? C.saccoBd : C.border}`, borderRadius: 10, padding: 24, textAlign: 'center', marginBottom: 16, cursor: 'pointer', background: file ? C.saccoLt : 'white', transition: 'all 0.2s' }}
        onClick={() => document.getElementById('csv-upload').click()}>
        <input id="csv-upload" type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
        <div style={{ fontSize: 32, marginBottom: 8 }}>{file ? '✓' : '↑'}</div>
        <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{file ? file.name : 'Click to select CSV file'}</div>
        <div style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>Only .csv files accepted</div>
      </div>

      {error && (
        <div style={{ background: C.finesLt, border: `1px solid #fecaca`, borderRadius: 8, padding: '10px 14px', color: C.fines, fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && !results && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>{rows.length} row{rows.length !== 1 ? 's' : ''} ready to import</div>
          <div style={{ background: C.surface, borderRadius: 8, overflow: 'hidden', maxHeight: 200, overflowY: 'auto', border: `1px solid ${C.border}` }}>
            {rows.slice(0, 8).map((r, i) => (
              <div key={i} style={{ padding: '9px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{r.name}</strong>
                  <span style={{ color: C.muted, marginLeft: 8 }}>{r.phone}</span>
                  {r.role && r.role !== 'member' && <span style={{ marginLeft: 8, padding: '1px 7px', borderRadius: 20, fontSize: 11, background: C.saccoLt, color: C.sacco }}>{r.role}</span>}
                </div>
                <div style={{ color: C.muted, fontSize: 12, display: 'flex', gap: 8 }}>
                  {r.contrib_balance > 0 && <span style={mono}>KES {Number(r.contrib_balance).toLocaleString()}</span>}
                </div>
              </div>
            ))}
            {rows.length > 8 && <div style={{ padding: '8px 14px', color: C.faint, fontSize: 12 }}>…and {rows.length - 8} more</div>}
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
            {[['Imported', results.imported,'#16a34a',C.saccoLt],['Skipped',results.skipped,C.loans,C.loansLt],['Errors',results.errors,C.fines,C.finesLt]].map(([l,v,c,bg]) => (
              <div key={l} style={{ background: bg, borderRadius: 8, padding: 12, textAlign: 'center', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: c, ...mono }}>{v}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
            {results.results.map((r, i) => (
              <div key={i} style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><strong>Row {r.row}</strong> · {r.name}</span>
                <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: r.status==='imported' ? C.saccoLt : r.status==='error' ? C.finesLt : C.loansLt,
                  color: r.status==='imported' ? '#16a34a' : r.status==='error' ? C.fines : C.loans }}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
          {results.imported > 0 && (
            <div style={{ marginTop: 10, background: C.saccoLt, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.sacco, fontWeight: 600, border: `1px solid ${C.saccoBd}` }}>
              {results.imported} member{results.imported !== 1 ? 's' : ''} imported successfully. Closing shortly…
            </div>
          )}
        </div>
      )}

      {rows.length > 0 && !results && (
        <button onClick={handleImport} disabled={loading}
          style={{ width: '100%', padding: 12, background: loading ? C.faint : C.sacco, color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15 }}>
          {loading ? 'Importing…' : `Import ${rows.length} Member${rows.length !== 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  )
}

// ── Main AdminPortal ──────────────────────────────────────────────────────────
export default function AdminPortal() {
  const [data, setData]           = useState({})
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('members')
  const [editing, setEditing]     = useState(null)
  const [editForm, setEditForm]   = useState({})
  const [search, setSearch]       = useState('')
  const [showImport, setShowImport] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [adminRes, payoutsRes, scRes] = await Promise.all([
        api.get('/admin/all'),
        api.get('/contributions/payouts'),
        api.get('/sharecapital'),
      ])
      setData({
        ...adminRes.data,
        payouts: payoutsRes.data.payouts || [],
        sharecapital: scRes.data.records || [],
        withdrawals: scRes.data.withdrawals || [],
      })
    } finally { setLoading(false) }
  }

  const handleEdit = (record) => { setEditing(record); setEditForm({ ...record }) }

  const handleSave = async () => {
    const ep = { members:'members', contributions:'contributions', loans:'loans', fines:'fines' }[tab]
    if (!ep) return
    try { await api.put(`/admin/${ep}/${editing.ID}`, editForm); setEditing(null); fetchAll() }
    catch (e) { alert(e.response?.data?.error || 'Failed to save') }
  }

  const handleDelete = async (id) => {
    const ep = { members:'members', contributions:'contributions', loans:'loans', fines:'fines' }[tab]
    if (!ep) return
    if (!confirm('Permanently delete this record? This cannot be undone.')) return
    try { await api.delete(`/admin/${ep}/${id}`); fetchAll() }
    catch (e) { alert(e.response?.data?.error || 'Failed to delete') }
  }

  const canEdit = EDITABLE.includes(tab)
  const cols = COLUMNS[tab] || []
  const records = (data[tab] || []).filter(r => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))

  const renderCell = (col, value) => {
    if (value === null || value === undefined) return <span style={{ color: C.faint }}>—</span>
    if (typeof value === 'object') return ''
    if (typeof value === 'boolean') return (
      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: value ? C.saccoLt : C.finesLt, color: value ? '#16a34a' : C.fines }}>
        {value ? 'Yes' : 'No'}
      </span>
    )
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      try { return <span style={{ color: C.muted }}>{new Date(value).toLocaleDateString('en-KE')}</span> } catch { return value }
    }
    if (col === 'status') {
      const map = { active:['#eff6ff',C.tb], cleared:[C.saccoLt,'#16a34a'], completed:[C.saccoLt,'#16a34a'], defaulted:[C.finesLt,C.fines], paid:[C.saccoLt,'#16a34a'], unpaid:[C.finesLt,C.fines], waived:[C.sharesLt,C.shares], scheduled:[C.tbLt,C.tb] }
      const [bg, color] = map[value] || [C.surface, C.text]
      return <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg, color }}>{value}</span>
    }
    if (col === 'membership_type') return (
      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: value==='sacco_only' ? C.tbLt : C.sharesLt, color: value==='sacco_only' ? C.tb : C.shares }}>
        {value==='sacco_only' ? 'SACCO only' : 'SACCO + TB'}
      </span>
    )
    if (col === 'role') {
      const bg = { admin:'#fef3c7', chairperson:'#dbeafe', treasurer:'#d1fae5', secretary:'#ede9fe', member: C.surface }
      const color = { admin:'#92400e', chairperson:'#1e40af', treasurer:'#065f46', secretary:'#4c1d95', member: C.text }
      return <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg[value]||C.surface, color: color[value]||C.text }}>{value}</span>
    }
    if (AMT_COLS.includes(col) && typeof value === 'number' && value > 0) {
      return <span style={mono}>KES {value.toLocaleString()}</span>
    }
    if (typeof value === 'number') return <span style={mono}>{value.toLocaleString()}</span>
    return String(value)
  }

  const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, boxSizing: 'border-box' }
  const lbl = { fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 3, textTransform: 'capitalize' }

  return (
    <div style={{ ...sans }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Admin Portal</h2>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: C.muted }}>Manage and view all group data</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <input placeholder="Search all fields…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding: '8px 12px 8px 34px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, width: 200, background: 'white', color: C.text }} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.faint} strokeWidth="2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <button onClick={() => setShowImport(true)}
            style={{ padding: '8px 16px', background: C.sacco, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <UploadIcon /> Bulk Import
          </button>
          <button onClick={fetchAll}
            style={{ padding: '8px 12px', background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshIcon /> Refresh
          </button>
        </div>
      </div>

      {/* Warning banner */}
      <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Edits and deletions are permanent. Edit/Delete is available only for Members, Contributions, Loans, and Fines.
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap', background: C.surface, padding: '4px', borderRadius: 12, border: `1px solid ${C.border}` }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch('') }}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.key ? 600 : 400,
              background: tab === t.key ? 'white' : 'transparent',
              color: tab === t.key ? C.text : C.muted,
              boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s' }}>
            {t.label}
            {data[t.key] ? <span style={{ marginLeft: 5, fontSize: 11, ...mono, color: tab === t.key ? C.sacco : C.faint }}>({data[t.key].length})</span> : ''}
          </button>
        ))}
      </div>

      {/* Record count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: C.muted, ...mono }}>{records.length} record{records.length !== 1 ? 's' : ''}</span>
        {!canEdit && (
          <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: C.surface, color: C.faint, fontWeight: 600, border: `1px solid ${C.border}` }}>
            View only
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: C.faint }}>Loading all data…</div>
      ) : (
        <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.surface, borderBottom: `2px solid ${C.border}` }}>
                  {cols.map(col => (
                    <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: C.muted,
                      whiteSpace: 'nowrap', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {col.replace(/_/g,' ')}
                    </th>
                  ))}
                  {canEdit && <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={cols.length + 1} style={{ textAlign: 'center', padding: 48, color: C.faint, fontSize: 14 }}>No records found.</td></tr>
                ) : records.map(record => (
                  <tr key={record.ID} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surface}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    {cols.map(col => (
                      <td key={col} style={{ padding: '10px 16px', color: C.text, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {renderCell(col, record[col])}
                      </td>
                    ))}
                    {canEdit && (
                      <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => handleEdit(record)}
                          style={{ padding: '5px 10px', background: C.tbLt, color: C.tb, border: `1px solid ${C.tbBd}`, borderRadius: 6, cursor: 'pointer', fontSize: 12, marginRight: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <EditIcon /> Edit
                        </button>
                        <button onClick={() => handleDelete(record.ID)}
                          style={{ padding: '5px 10px', background: C.finesLt, color: C.fines, border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <TrashIcon /> Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(2px)' }}
          onClick={() => setEditing(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 18, padding: 28, width: '100%', maxWidth: 500, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>Edit Record #{editing.ID}</h3>
              <button onClick={() => setEditing(null)} style={{ background: C.surface, border: `1px solid ${C.border}`, width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>✕</button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {cols.filter(c => c !== 'ID').map(col => (
                <div key={col}>
                  <label style={lbl}>{col.replace(/_/g,' ')}</label>
                  {col === 'is_active' ? (
                    <select style={inp} value={editForm[col] ? 'true' : 'false'} onChange={e => setEditForm(f => ({ ...f, [col]: e.target.value === 'true' }))}>
                      <option value="true">Active</option><option value="false">Inactive</option>
                    </select>
                  ) : col === 'role' ? (
                    <select style={inp} value={editForm[col]||''} onChange={e => setEditForm(f => ({ ...f, [col]: e.target.value }))}>
                      {['admin','chairperson','treasurer','secretary','member'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                    </select>
                  ) : col === 'membership_type' ? (
                    <select style={inp} value={editForm[col]||'both'} onChange={e => setEditForm(f => ({ ...f, [col]: e.target.value }))}>
                      <option value="both">SACCO + Table Banking</option>
                      <option value="sacco_only">SACCO only</option>
                    </select>
                  ) : col === 'status' && tab === 'loans' ? (
                    <select style={inp} value={editForm[col]||''} onChange={e => setEditForm(f => ({ ...f, [col]: e.target.value }))}>
                      {['active','cleared','defaulted'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : col === 'status' && tab === 'fines' ? (
                    <select style={inp} value={editForm[col]||''} onChange={e => setEditForm(f => ({ ...f, [col]: e.target.value }))}>
                      {['unpaid','paid','waived'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : col === 'interest_type' ? (
                    <select style={inp} value={editForm[col]||''} onChange={e => setEditForm(f => ({ ...f, [col]: e.target.value }))}>
                      <option value="flat">Flat Rate</option>
                      <option value="reducing">Reducing Balance</option>
                    </select>
                  ) : (
                    <input style={inp} value={editForm[col] ?? ''} onChange={e => setEditForm(f => ({ ...f, [col]: e.target.value }))} />
                  )}
                </div>
              ))}
              <div style={{ background: C.finesLt, border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.fines }}>
                Changes are permanent and take effect immediately.
              </div>
              <button onClick={handleSave}
                style={{ padding: 11, background: C.sacco, color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(2px)' }}
          onClick={() => setShowImport(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 18, padding: 28, width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>Bulk Import Members</h3>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: C.muted }}>Upload a CSV file to import multiple members at once</p>
              </div>
              <button onClick={() => setShowImport(false)} style={{ background: C.surface, border: `1px solid ${C.border}`, width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>✕</button>
            </div>
            <BulkImport onDone={() => { setShowImport(false); fetchAll() }} />
          </div>
        </div>
      )}
    </div>
  )
}