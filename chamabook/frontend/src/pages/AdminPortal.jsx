import { useState, useEffect } from 'react'
import api from '../services/api'

const TABS = [
  { key: 'members', label: '👥 Members' },
  { key: 'contributions', label: '💰 Contributions' },
  { key: 'payouts', label: '📤 Con. Payouts' },
  { key: 'loans', label: '🏦 Loans' },
  { key: 'fines', label: '⚠️ Fines' },
  { key: 'welfare', label: '❤️ Welfare In' },
  { key: 'disbursements', label: '💸 Welfare Out' },
  { key: 'sharecapital', label: '📈 Shares' },
  { key: 'withdrawals', label: '📤 Share W/D' },
  { key: 'meetings', label: '📅 Meetings' },
]

const COLUMNS = {
  members: ['ID', 'name', 'phone', 'id_number', 'account_number', 'email', 'role', 'membership_type', 'is_active'],
  contributions: ['ID', 'user_id', 'amount', 'fines_deducted', 'net_amount', 'period', 'paid_at', 'branch_name', 'recorded_by_name', 'notes'],
  payouts: ['ID', 'user_id', 'amount', 'reason', 'period', 'approved_by_name', 'notes'],
  loans: ['ID', 'user_id', 'amount', 'interest_rate', 'interest_type', 'term_months', 'monthly_payment', 'total_due', 'total_paid', 'balance', 'status', 'due_at'],
  fines: ['ID', 'user_id', 'amount', 'reason', 'period', 'type', 'status', 'issued_by_name'],
  welfare: ['ID', 'user_id', 'amount', 'period', 'paid_at', 'recorded_by_name', 'notes'],
  disbursements: ['ID', 'user_id', 'amount', 'reason', 'approved_by_name', 'notes'],
  sharecapital: ['ID', 'user_id', 'shares', 'share_price', 'amount', 'type', 'paid_at', 'recorded_by_name', 'notes'],
  withdrawals: ['ID', 'user_id', 'shares', 'amount_per_share', 'total_amount', 'reason', 'approved_by_name'],
  meetings: ['ID', 'title', 'scheduled_at', 'location', 'status', 'fine_absent', 'fine_absent_apology'],
}

const EDITABLE_TABS = ['members', 'contributions', 'loans', 'fines']

const AMOUNT_COLS = ['amount', 'fines_deducted', 'net_amount', 'monthly_payment', 'total_due',
  'total_paid', 'balance', 'share_price', 'total_amount', 'amount_per_share', 'fine_absent', 'fine_absent_apology']

// ── Bulk Import Component ────────────────────────────────────────────────────
function BulkImport({ onDone }) {
  const [file, setFile] = useState(null)
  const [rows, setRows] = useState([])
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const REQUIRED_COLS = ['name', 'phone']
  const ALL_COLS = [
    'name', 'phone', 'id_number', 'email', 'role', 'membership_type', 'password',
    'contrib_balance', 'contrib_period', 'loan_balance', 'loan_interest_rate',
    'loan_term_months', 'welfare_balance', 'share_capital', 'share_price', 'shares'
  ]

  const downloadTemplate = () => {
    const header = ALL_COLS.join(',')
    const example = [
      'Jane Doe', '0712345678', '12345678', 'jane@email.com', 'member', 'both', '',
      '15000', '2025-01', '5000', '10', '12', '2000', '3000', '300', '10'
    ].join(',')
    const notes = [
      '# INSTRUCTIONS — DELETE THESE COMMENT LINES BEFORE UPLOADING',
      '# name - Required. Full name of member',
      '# phone - Required. Must be unique per group',
      '# id_number - Optional. National ID number',
      '# email - Optional',
      '# role - Optional. admin/chairperson/treasurer/secretary/member (default: member)',
      '# membership_type - Optional. both/sacco_only (default: both)',
      '# password - Optional. Defaults to phone number if blank',
      '# contrib_balance - Optional. Opening contribution balance in KES',
      '# contrib_period - Optional. Period for opening contribution e.g. 2025-01',
      '# loan_balance - Optional. Outstanding loan balance in KES',
      '# loan_interest_rate - Optional. Interest rate % (default: 10)',
      '# loan_term_months - Optional. Loan term in months (default: 12)',
      '# welfare_balance - Optional. Opening welfare contribution in KES',
      '# share_capital - Optional. Total share capital value in KES',
      '# share_price - Optional. Price per share in KES',
      '# shares - Optional. Number of shares (calculated if blank)',
    ].join('\n')
    const csv = `${notes}\n${header}\n${example}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'chamabook_import_template.csv'
    a.click()
  }

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setError('')
    setResults(null)
    setRows([])

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target.result
      const lines = text.split('\n').filter(l => !l.startsWith('#') && l.trim())
      if (lines.length < 2) { setError('File must have a header row and at least one data row'); return }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))

      for (const req of REQUIRED_COLS) {
        if (!headers.includes(req)) {
          setError(`Missing required column: "${req}". Please use the downloaded template.`)
          return
        }
      }

      const parsed = []
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        if (vals.every(v => !v)) continue
        const obj = {}
        headers.forEach((h, idx) => { obj[h] = vals[idx] || '' })
        for (const numField of ['contrib_balance', 'loan_balance', 'loan_interest_rate', 'loan_term_months', 'welfare_balance', 'share_capital', 'share_price', 'shares']) {
          obj[numField] = obj[numField] ? Number(obj[numField]) : 0
        }
        parsed.push(obj)
      }
      setRows(parsed)
    }
    reader.readAsText(f)
  }

  const handleImport = async () => {
    if (rows.length === 0) return setError('No valid rows to import')
    setLoading(true)
    try {
      const res = await api.post('/admin/import', rows)
      setResults(res.data)
      if (res.data.imported > 0) setTimeout(onDone, 3000)
    } catch (e) {
      setError(e.response?.data?.error || 'Import failed')
    }
    setLoading(false)
  }

  const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }

  return (
    <div>
      {/* How to use */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
        <div style={{ fontWeight: 700, color: '#166534', marginBottom: 6 }}>📋 How to import members</div>
        <div style={{ color: '#374151', lineHeight: 1.8 }}>
          1. Download the CSV template below<br />
          2. Open in <strong>Excel</strong> or Google Sheets<br />
          3. Fill in your members — only <strong>name</strong> and <strong>phone</strong> are required<br />
          4. Leave optional columns blank — sensible defaults will be applied<br />
          5. Save as <strong>.csv</strong> and upload here<br />
          <span style={{ color: '#64748b' }}>💡 Default password for each member is their phone number unless you set one</span>
        </div>
      </div>

      {/* Template download */}
      <button onClick={downloadTemplate}
        style={{ width: '100%', padding: '11px', marginBottom: 16, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ede9fe', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
        📥 Download CSV Template
      </button>

      {/* Column reference */}
      <details style={{ marginBottom: 16 }}>
        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b', padding: '6px 0' }}>
          📖 Column Reference (click to expand)
        </summary>
        <div style={{ marginTop: 8, background: '#f8fafc', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f0fdf4' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#166534' }}>Column</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#166534' }}>Required</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#166534' }}>Example / Notes</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['name', '✅ Yes', 'Jane Doe'],
                ['phone', '✅ Yes', '0712345678 — must be unique'],
                ['id_number', 'No', '12345678'],
                ['email', 'No', 'jane@email.com'],
                ['role', 'No', 'member / treasurer / secretary / chairperson / admin'],
                ['membership_type', 'No', 'both (default) / sacco_only'],
                ['password', 'No', 'Leave blank → phone number becomes password'],
                ['contrib_balance', 'No', '15000 — opening contribution balance in KES'],
                ['contrib_period', 'No', '2025-01 — month of opening balance'],
                ['loan_balance', 'No', '5000 — outstanding loan balance in KES'],
                ['loan_interest_rate', 'No', '10 — percent (default 10%)'],
                ['loan_term_months', 'No', '12 — months (default 12)'],
                ['welfare_balance', 'No', '2000 — opening welfare contribution in KES'],
                ['share_capital', 'No', '3000 — total share capital value in KES'],
                ['share_price', 'No', '300 — price per share in KES'],
                ['shares', 'No', '10 — number of shares (auto-calculated if blank)'],
              ].map(([col, req, ex]) => (
                <tr key={col} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '7px 12px', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{col}</td>
                  <td style={{ padding: '7px 12px', color: req.includes('Yes') ? '#16a34a' : '#64748b', whiteSpace: 'nowrap' }}>{req}</td>
                  <td style={{ padding: '7px 12px', color: '#94a3b8', fontSize: 11 }}>{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* File upload area */}
      <div style={{ border: '2px dashed #e2e8f0', borderRadius: 8, padding: '24px', textAlign: 'center', marginBottom: 16, cursor: 'pointer',
        background: file ? '#f0fdf4' : 'white', borderColor: file ? '#bbf7d0' : '#e2e8f0' }}
        onClick={() => document.getElementById('csv-upload').click()}>
        <input id="csv-upload" type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
        <div style={{ fontSize: 28, marginBottom: 8 }}>{file ? '✅' : '📂'}</div>
        <div style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>{file ? file.name : 'Click to select CSV file'}</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Only .csv files accepted</div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && !results && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            👀 Preview — {rows.length} row{rows.length !== 1 ? 's' : ''} ready to import
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 8, overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
            {rows.slice(0, 8).map((r, i) => (
              <div key={i} style={{ padding: '9px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{r.name}</strong>
                  <span style={{ color: '#64748b', marginLeft: 8 }}>{r.phone}</span>
                  {r.role && r.role !== 'member' && (
                    <span style={{ marginLeft: 8, padding: '1px 7px', borderRadius: 20, fontSize: 11, background: '#f0fdf4', color: '#166534' }}>{r.role}</span>
                  )}
                </div>
                <div style={{ color: '#64748b', fontSize: 12, display: 'flex', gap: 8 }}>
                  {r.contrib_balance > 0 && <span>💰 KES {Number(r.contrib_balance).toLocaleString()}</span>}
                  {r.loan_balance > 0 && <span>🏦 KES {Number(r.loan_balance).toLocaleString()}</span>}
                  {r.share_capital > 0 && <span>📈 KES {Number(r.share_capital).toLocaleString()}</span>}
                  {r.welfare_balance > 0 && <span>❤️ KES {Number(r.welfare_balance).toLocaleString()}</span>}
                </div>
              </div>
            ))}
            {rows.length > 8 && (
              <div style={{ padding: '8px 14px', color: '#94a3b8', fontSize: 12 }}>...and {rows.length - 8} more rows</div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
            {[
              ['Imported', results.imported, '#f0fdf4', '#16a34a'],
              ['Skipped', results.skipped, '#fef3c7', '#d97706'],
              ['Errors', results.errors, '#fef2f2', '#dc2626'],
            ].map(([l, v, bg, c]) => (
              <div key={l} style={{ background: bg, borderRadius: 8, padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto', background: '#f8fafc', borderRadius: 8 }}>
            {results.results.map((r, i) => (
              <div key={i} style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><strong>Row {r.row}</strong> · {r.name}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {r.message && <span style={{ color: '#64748b', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.message}</span>}
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                    background: r.status === 'imported' ? '#f0fdf4' : r.status === 'error' ? '#fef2f2' : '#fef3c7',
                    color: r.status === 'imported' ? '#16a34a' : r.status === 'error' ? '#dc2626' : '#d97706' }}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {results.imported > 0 && (
            <div style={{ marginTop: 10, background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#166534', fontWeight: 600 }}>
              ✅ {results.imported} member{results.imported !== 1 ? 's' : ''} imported successfully! Closing shortly...
            </div>
          )}
        </div>
      )}

      {rows.length > 0 && !results && (
        <button onClick={handleImport} disabled={loading}
          style={{ width: '100%', padding: '12px', background: loading ? '#94a3b8' : '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15 }}>
          {loading ? '⏳ Importing...' : `🚀 Import ${rows.length} Member${rows.length !== 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  )
}

// ── Main AdminPortal ─────────────────────────────────────────────────────────
export default function AdminPortal() {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('members')
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [search, setSearch] = useState('')
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

  const handleEdit = (record) => {
    setEditing(record)
    setEditForm({ ...record })
  }

  const handleSave = async () => {
    const endpointMap = {
      members: 'members', contributions: 'contributions',
      loans: 'loans', fines: 'fines'
    }
    const endpoint = endpointMap[tab]
    if (!endpoint) return
    try {
      await api.put(`/admin/${endpoint}/${editing.ID}`, editForm)
      setEditing(null)
      fetchAll()
    } catch (e) { alert(e.response?.data?.error || 'Failed to save') }
  }

  const handleDelete = async (id) => {
    const endpointMap = {
      members: 'members', contributions: 'contributions',
      loans: 'loans', fines: 'fines'
    }
    const endpoint = endpointMap[tab]
    if (!endpoint) return
    if (!confirm(`Permanently delete this record? This cannot be undone.`)) return
    try {
      await api.delete(`/admin/${endpoint}/${id}`)
      fetchAll()
    } catch (e) { alert(e.response?.data?.error || 'Failed to delete') }
  }

  const canEdit = EDITABLE_TABS.includes(tab)
  const cols = COLUMNS[tab] || []

  const records = (data[tab] || []).filter(r => {
    if (!search) return true
    return JSON.stringify(r).toLowerCase().includes(search.toLowerCase())
  })

  const renderCell = (col, value) => {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'object') return ''
    if (typeof value === 'boolean') return value ? '✅' : '❌'
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      try { return new Date(value).toLocaleDateString('en-KE') } catch { return value }
    }
    if (col === 'status') {
      const map = {
        active: ['#eff6ff', '#1d4ed8'], cleared: ['#f0fdf4', '#166534'],
        completed: ['#f0fdf4', '#166534'], defaulted: ['#fef2f2', '#dc2626'],
        paid: ['#f0fdf4', '#166534'], unpaid: ['#fef2f2', '#dc2626'],
        waived: ['#f5f3ff', '#7c3aed'], scheduled: ['#eff6ff', '#1d4ed8'],
      }
      const [bg, color] = map[value] || ['#f1f5f9', '#374151']
      return <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg, color }}>{value}</span>
    }
    if (col === 'membership_type') {
      return <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        background: value === 'sacco_only' ? '#eff6ff' : '#f5f3ff',
        color: value === 'sacco_only' ? '#1d4ed8' : '#7c3aed' }}>
        {value === 'sacco_only' ? 'SACCO only' : 'SACCO + TB'}
      </span>
    }
    if (col === 'role') {
      const bg = { admin: '#fef3c7', chairperson: '#dbeafe', treasurer: '#d1fae5', secretary: '#ede9fe', member: '#f1f5f9' }
      const color = { admin: '#92400e', chairperson: '#1e40af', treasurer: '#065f46', secretary: '#4c1d95', member: '#374151' }
      return <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg[value] || '#f1f5f9', color: color[value] || '#374151' }}>{value}</span>
    }
    if (col === 'type' && tab === 'sharecapital') {
      return <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        background: value === 'purchase' ? '#f5f3ff' : '#eff6ff',
        color: value === 'purchase' ? '#7c3aed' : '#1d4ed8' }}>{value}</span>
    }
    if (AMOUNT_COLS.includes(col) && typeof value === 'number' && value > 0) {
      return `KES ${value.toLocaleString()}`
    }
    if (typeof value === 'number') return value.toLocaleString()
    return String(value)
  }

  const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }
  const lbl = { fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 3, textTransform: 'capitalize' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🔧 Admin Portal</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input placeholder="Search all fields..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, width: 220 }} />
          <button onClick={() => setShowImport(true)}
            style={{ padding: '8px 16px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            📥 Bulk Import
          </button>
          <button onClick={fetchAll}
            style={{ padding: '8px 16px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Warning */}
      <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#92400e' }}>
        ⚠️ Admin Portal — edits and deletions are permanent. Edit/Delete is only available for Members, Contributions, Loans and Fines. All other tabs are view-only.
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch('') }}
            style={{ padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12,
              fontWeight: tab === t.key ? 600 : 400,
              background: tab === t.key ? '#1a6b3c' : '#f1f5f9',
              color: tab === t.key ? 'white' : '#374151' }}>
            {t.label} {data[t.key] ? `(${data[t.key].length})` : ''}
          </button>
        ))}
      </div>

      {/* Record count + view-only badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>{records.length} record{records.length !== 1 ? 's' : ''}</span>
        {!canEdit && (
          <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>
            👁 View only
          </span>
        )}
      </div>

      {loading ? <p style={{ padding: 20, color: '#94a3b8' }}>Loading all data...</p> : (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {cols.map(col => (
                    <th key={col} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: '#374151',
                      whiteSpace: 'nowrap', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                  {canEdit && <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: 12 }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={cols.length + 1} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No records found.</td></tr>
                ) : records.map(record => (
                  <tr key={record.ID} style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    {cols.map(col => (
                      <td key={col} style={{ padding: '10px 14px', color: '#374151', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {renderCell(col, record[col])}
                      </td>
                    ))}
                    {canEdit && (
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => handleEdit(record)}
                          style={{ padding: '4px 12px', background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, marginRight: 6 }}>
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleDelete(record.ID)}
                          style={{ padding: '4px 10px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                          🗑 Del
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setEditing(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>✏️ Edit #{editing.ID}</h3>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {cols.filter(c => c !== 'ID').map(col => (
                <div key={col}>
                  <label style={lbl}>{col.replace(/_/g, ' ')}</label>
                  {col === 'is_active' ? (
                    <select style={inp} value={editForm[col] ? 'true' : 'false'}
                      onChange={e => setEditForm(f => ({ ...f, [col]: e.target.value === 'true' }))}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  ) : col === 'role' ? (
                    <select style={inp} value={editForm[col] || ''}
                      onChange={e => setEditForm(f => ({ ...f, [col]: e.target.value }))}>
                      {['admin', 'chairperson', 'treasurer', 'secretary', 'member'].map(r => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>
                  ) : col === 'membership_type' ? (
                    <select style={inp} value={editForm[col] || 'both'}
                      onChange={e => setEditForm(f => ({ ...f, [col]: e.target.value }))}>
                      <option value="both">SACCO + Table Banking</option>
                      <option value="sacco_only">SACCO only</option>
                    </select>
                  ) : col === 'status' && tab === 'loans' ? (
                    <select style={inp} value={editForm[col] || ''}
                      onChange={e => setEditForm(f => ({ ...f, [col]: e.target.value }))}>
                      {['active', 'cleared', 'defaulted'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : col === 'status' && tab === 'fines' ? (
                    <select style={inp} value={editForm[col] || ''}
                      onChange={e => setEditForm(f => ({ ...f, [col]: e.target.value }))}>
                      {['unpaid', 'paid', 'waived'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : col === 'interest_type' ? (
                    <select style={inp} value={editForm[col] || ''}
                      onChange={e => setEditForm(f => ({ ...f, [col]: e.target.value }))}>
                      <option value="flat">Flat Rate</option>
                      <option value="reducing">Reducing Balance</option>
                    </select>
                  ) : (
                    <input style={inp} value={editForm[col] ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, [col]: e.target.value }))} />
                  )}
                </div>
              ))}
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
                ⚠️ Changes are permanent and immediate.
              </div>
              <button onClick={handleSave}
                style={{ padding: '11px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowImport(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>📥 Bulk Import Members</h3>
              <button onClick={() => setShowImport(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <BulkImport onDone={() => { setShowImport(false); fetchAll() }} />
          </div>
        </div>
      )}
    </div>
  )
}