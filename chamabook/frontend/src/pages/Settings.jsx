import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function Settings() {
  const { user, isAdmin } = useAuth()
  const [settings, setSettings] = useState(null)
  const [group, setGroup] = useState(null)
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState('general')
  const [form, setForm] = useState({})
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '', user_id: '' })
  const [members, setMembers] = useState([])

  useEffect(() => {
    api.get('/settings').then(r => {
      setSettings(r.data.settings)
      setGroup(r.data.group)
      setBranches(r.data.branches || [])
      const tb = r.data.branches?.find(b => b.type === 'table_banking')
      setForm({
        group_name:            r.data.group?.name || '',
        group_description:     r.data.group?.description || '',
        absent_fine:           r.data.settings?.absent_fine || 200,
        absent_no_apology_fine: r.data.settings?.absent_no_apology_fine || 500,
        late_fine:             r.data.settings?.late_fine || 100,
        table_banking_max:     tb?.max_members || 0,
        contribution_day:      r.data.settings?.contribution_day || 1,
        default_share_price:   r.data.settings?.default_share_price || 2500,
      })
    }).finally(() => setLoading(false))
    api.get('/members').then(r => setMembers(r.data.members || []))
  }, [])

  const handleSave = async () => {
    setSaving(true); setMsg('')
    try {
      await api.put('/settings', form)
      setMsg('✅ Settings saved successfully')
    } catch (e) { setMsg('❌ ' + (e.response?.data?.error || 'Failed to save')) }
    finally { setSaving(false) }
  }

  const handlePasswordUpdate = async () => {
    setMsg('')
    if (pwForm.new_password !== pwForm.confirm) return setMsg('❌ Passwords do not match')
    if (pwForm.new_password.length < 6) return setMsg('❌ Password must be at least 6 characters')
    try {
      await api.post('/auth/password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
        user_id: pwForm.user_id ? Number(pwForm.user_id) : 0,
      })
      setMsg('✅ Password updated')
      setPwForm({ current_password: '', new_password: '', confirm: '', user_id: '' })
    } catch (e) { setMsg('❌ ' + (e.response?.data?.error || 'Failed')) }
  }

  const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }
  const lbl = { fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 3 }

  if (loading) return <p>Loading...</p>

  return (
    <div style={{ maxWidth: 640 }}>
      <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700 }}>⚙️ Settings</h2>

      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14,
          background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
          color: msg.startsWith('✅') ? '#16a34a' : '#dc2626',
          border: `1px solid ${msg.startsWith('✅') ? '#bbf7d0' : '#fecaca'}` }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[['general', 'Group'], ['fines', 'Fines'], ['shares', 'Share Capital'], ['password', 'Passwords']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: tab === t ? 600 : 400, background: tab === t ? '#1a6b3c' : '#f1f5f9',
              color: tab === t ? 'white' : '#374151' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

        {/* ── General ── */}
        {tab === 'general' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={lbl}>Group Name</label>
              <input style={inp} value={form.group_name || ''}
                onChange={e => setForm(f => ({ ...f, group_name: e.target.value }))} />
            </div>
            <div>
              <label style={lbl}>Group Description</label>
              <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={form.group_description || ''}
                onChange={e => setForm(f => ({ ...f, group_description: e.target.value }))} />
            </div>
            <div>
              <label style={lbl}>Table Banking Max Members (0 = unlimited)</label>
              <input style={inp} type="number" min="0" value={form.table_banking_max || 0}
                onChange={e => setForm(f => ({ ...f, table_banking_max: Number(e.target.value) }))} />
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
                Current: {branches.find(b => b.type === 'table_banking')?.max_members || 0} members max
              </p>
            </div>
            <div>
              <label style={lbl}>Contribution Due Day (day of month)</label>
              <input style={inp} type="number" min="1" max="31" value={form.contribution_day || 1}
                onChange={e => setForm(f => ({ ...f, contribution_day: Number(e.target.value) }))} />
            </div>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '11px', background: saving ? '#94a3b8' : '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}

        {/* ── Fines ── */}
        {tab === 'fines' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e' }}>
              ⚠️ These are the default fine amounts used for all meetings. You can override them per meeting when scheduling or taking attendance.
            </div>
            <div>
              <label style={lbl}>Absent with Apology Fine (KES)</label>
              <input style={inp} type="number" value={form.absent_fine || 200}
                onChange={e => setForm(f => ({ ...f, absent_fine: Number(e.target.value) }))} />
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
                Issued to members who notify the group before missing a meeting.
              </p>
            </div>
            <div>
              <label style={lbl}>Absent without Apology Fine (KES)</label>
              <input style={inp} type="number" value={form.absent_no_apology_fine || 500}
                onChange={e => setForm(f => ({ ...f, absent_no_apology_fine: Number(e.target.value) }))} />
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
                Issued to members who miss a meeting without any notice.
              </p>
            </div>
            <div>
              <label style={lbl}>Late Arrival Fine (KES)</label>
              <input style={inp} type="number" value={form.late_fine ?? 100}
                onChange={e => setForm(f => ({ ...f, late_fine: Number(e.target.value) }))} />
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
                Issued to members who arrive late to a meeting. Set to 0 to disable late fines.
              </p>
            </div>

            {/* Fine preview */}
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Fine Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  ['Absent (No Apology)', form.absent_no_apology_fine || 500, '#fef2f2', '#dc2626'],
                  ['Absent (With Apology)', form.absent_fine || 200, '#fef3c7', '#d97706'],
                  ['Late Arrival', form.late_fine ?? 100, '#fff7ed', '#c2410c'],
                ].map(([label, amount, bg, color]) => (
                  <div key={label} style={{ background: bg, borderRadius: 6, padding: '10px', textAlign: 'center', border: `1px solid ${color}22` }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color }}>KES {Number(amount).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleSave} disabled={saving}
              style={{ padding: '11px', background: saving ? '#94a3b8' : '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
              {saving ? 'Saving...' : 'Save Fine Settings'}
            </button>
          </div>
        )}

        {/* ── Share Capital ── */}
        {tab === 'shares' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ background: '#f5f3ff', border: '1px solid #ede9fe', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#4c1d95' }}>
              📈 Every new SACCO member is automatically assigned <strong>1 share</strong> at registration.
              They have <strong>3 months</strong> to pay for it in installments.
              Set the default price of that share here.
            </div>
            <div>
              <label style={lbl}>Default Share Price (KES)</label>
              <input style={inp} type="number" min="1" placeholder="2500"
                value={form.default_share_price || 2500}
                onChange={e => setForm(f => ({ ...f, default_share_price: Number(e.target.value) }))} />
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
                Current default: KES {Number(settings?.default_share_price || 2500).toLocaleString()} per share.
                Applies to all new members going forward.
              </p>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                Installment breakdown at KES {Number(form.default_share_price || 2500).toLocaleString()}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  ['Pay in 1 month', form.default_share_price || 2500],
                  ['Pay in 2 months', Math.ceil((form.default_share_price || 2500) / 2)],
                  ['Pay in 3 months', Math.ceil((form.default_share_price || 2500) / 3)],
                ].map(([label, amount]) => (
                  <div key={label} style={{ background: 'white', borderRadius: 6, padding: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#7c3aed' }}>KES {Number(amount).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleSave} disabled={saving}
              style={{ padding: '11px', background: saving ? '#94a3b8' : '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
              {saving ? 'Saving...' : 'Save Share Settings'}
            </button>

            {isAdmin && (
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#374151', marginBottom: 6 }}>Existing Members</div>
                <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 0' }}>
                  Members who joined before this feature was added may not have a share assigned yet.
                  Use the Admin Portal → <strong>📈 Assign Default Shares</strong> button to assign shares to all eligible existing members.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Passwords ── */}
        {tab === 'password' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {isAdmin && (
              <div>
                <label style={lbl}>Reset Password For (leave empty to update your own)</label>
                <select style={inp} value={pwForm.user_id}
                  onChange={e => setPwForm(f => ({ ...f, user_id: e.target.value }))}>
                  <option value="">My own password</option>
                  {members.filter(m => m.ID !== user?.ID).map(m => (
                    <option key={m.ID} value={m.ID}>{m.name} ({m.account_number})</option>
                  ))}
                </select>
              </div>
            )}
            {!pwForm.user_id && (
              <div>
                <label style={lbl}>Current Password</label>
                <input style={inp} type="password" value={pwForm.current_password}
                  onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} />
              </div>
            )}
            <div>
              <label style={lbl}>New Password</label>
              <input style={inp} type="password" placeholder="Min 6 characters" value={pwForm.new_password}
                onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} />
            </div>
            <div>
              <label style={lbl}>Confirm New Password</label>
              <input style={inp} type="password" value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
            </div>
            <button onClick={handlePasswordUpdate}
              style={{ padding: '11px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
              Update Password
            </button>
          </div>
        )}
      </div>
    </div>
  )
}