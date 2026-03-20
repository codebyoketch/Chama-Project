import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }
const lbl = { fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 3 }

const printMinutes = (meeting, report) => {
  const win = window.open('', '_blank')
  const present = report?.present || []
  const absentApology = report?.absent_apology || []
  const absent = report?.absent || []
  const late = report?.late || []

  const attendanceRows = [
    ...present.map(a => `<tr><td>${a.user?.name}</td><td>${a.user?.account_number}</td><td style="color:#16a34a;font-weight:600">Present</td><td>—</td></tr>`),
    ...late.map(a => `<tr><td>${a.user?.name}</td><td>${a.user?.account_number}</td><td style="color:#d97706;font-weight:600">Late</td><td style="color:#d97706">KES ${a.fine_amount?.toLocaleString()}</td></tr>`),
    ...absentApology.map(a => `<tr><td>${a.user?.name}</td><td>${a.user?.account_number}</td><td style="color:#d97706;font-weight:600">Absent (Apology)</td><td style="color:#dc2626">KES ${a.fine_amount?.toLocaleString()}</td></tr>`),
    ...absent.map(a => `<tr><td>${a.user?.name}</td><td>${a.user?.account_number}</td><td style="color:#dc2626;font-weight:600">Absent</td><td style="color:#dc2626">KES ${a.fine_amount?.toLocaleString()}</td></tr>`),
  ].join('')

  let minutesHtml = ''
  try {
    const items = JSON.parse(meeting.minutes || '[]')
    if (Array.isArray(items) && items.length > 0) {
      minutesHtml = items.map((item, i) => `
        <div style="margin-bottom:16px">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${i + 1}. ${item.title || ''}</div>
          <div style="font-size:13px;color:#374151;white-space:pre-wrap">${item.content || ''}</div>
        </div>`).join('')
    } else {
      minutesHtml = `<p style="font-size:13px;color:#374151;white-space:pre-wrap">${meeting.minutes || 'No minutes recorded.'}</p>`
    }
  } catch {
    minutesHtml = `<p style="font-size:13px;color:#374151;white-space:pre-wrap">${meeting.minutes || 'No minutes recorded.'}</p>`
  }

  win.document.write(`<!DOCTYPE html><html><head><title>Meeting Minutes — ${meeting.title}</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 800px; margin: 30px auto; color: #1e293b; font-size: 13px; }
      h1 { color: #1a6b3c; font-size: 20px; border-bottom: 2px solid #1a6b3c; padding-bottom: 8px; margin-bottom: 4px; }
      h2 { font-size: 14px; color: #374151; margin: 20px 0 8px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
      .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
      .summary { display: flex; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
      .badge { padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th { background: #f0fdf4; color: #166534; padding: 8px 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
      td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
      .sig { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
      .sig-line { border-top: 1px solid #374151; padding-top: 6px; font-size: 12px; color: #64748b; margin-top: 40px; }
      @media print { body { margin: 10px; } }
    </style></head><body>
    <h1>🌱 ChamaBook — Meeting Minutes</h1>
    <p class="meta">
      <strong>${meeting.title}</strong> &nbsp;·&nbsp;
      ${new Date(meeting.scheduled_at).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      ${meeting.location ? ` &nbsp;·&nbsp; 📍 ${meeting.location}` : ''}
    </p>

    <div class="summary">
      <span class="badge" style="background:#f0fdf4;color:#16a34a">✅ Present: ${present.length}</span>
      <span class="badge" style="background:#fef3c7;color:#d97706">⏰ Late: ${late.length}</span>
      <span class="badge" style="background:#fff7ed;color:#c2410c">🙏 Apology: ${absentApology.length}</span>
      <span class="badge" style="background:#fef2f2;color:#dc2626">❌ Absent: ${absent.length}</span>
      ${report?.total_fines > 0 ? `<span class="badge" style="background:#fef2f2;color:#dc2626">💰 Fines: KES ${report.total_fines?.toLocaleString()}</span>` : ''}
    </div>

    ${meeting.agenda ? `<h2>Agenda</h2><p style="font-size:13px;white-space:pre-wrap">${meeting.agenda}</p>` : ''}

    <h2>Attendance Register</h2>
    <table>
      <thead><tr><th>Name</th><th>Account No.</th><th>Status</th><th>Fine</th></tr></thead>
      <tbody>${attendanceRows}</tbody>
    </table>

    <h2>Minutes</h2>
    ${minutesHtml}

    <div class="sig">
      <div>
        <div class="sig-line">Chairperson Signature &amp; Date</div>
      </div>
      <div>
        <div class="sig-line">Secretary Signature &amp; Date</div>
      </div>
    </div>
    </body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 600)
}

export default function Meetings() {
  const { isTreasurerOrAbove, isSecretaryOrAbove, isAdmin } = useAuth()
  const [meetings, setMeetings] = useState([])
  const [members, setMembers] = useState([])
  const [settings, setSettings] = useState({ absent_fine: 200, absent_no_apology_fine: 500, late_fine: 100 })
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showAttendance, setShowAttendance] = useState(null)
  const [showReport, setShowReport] = useState(null)
  const [report, setReport] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', scheduled_at: '', location: '', agenda: '' })
  const [attendance, setAttendance] = useState({})
  const [attendanceForm, setAttendanceForm] = useState({
    absent_fine: 200, absent_no_apology_fine: 500, fine_late: 100, minutes: ''
  })
  const [minutesItems, setMinutesItems] = useState([{ title: '', content: '' }])

  useEffect(() => {
    fetchMeetings()
    api.get('/members').then(r => setMembers(r.data.members || []))
    api.get('/settings').then(r => {
      const s = r.data.settings || {}
      setSettings(s)
      setAttendanceForm(f => ({
        ...f,
        absent_fine: s.absent_fine || 200,
        absent_no_apology_fine: s.absent_no_apology_fine || 500,
        fine_late: s.late_fine || 100,
      }))
    })
  }, [])

  const fetchMeetings = async () => {
    try { const r = await api.get('/meetings'); setMeetings(r.data.meetings || []) }
    finally { setLoading(false) }
  }

  const handleAdd = async () => {
    setError('')
    if (!form.title || !form.scheduled_at) return setError('Title and date/time are required')
    try {
      await api.post('/meetings', {
        ...form,
        fine_absent: attendanceForm.absent_fine,
        fine_absent_apology: attendanceForm.absent_no_apology_fine,
        fine_late: attendanceForm.fine_late,
      })
      setShowAdd(false)
      setForm({ title: '', scheduled_at: '', location: '', agenda: '' })
      fetchMeetings()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const openAttendance = (meeting) => {
    const att = {}
    members.forEach(m => { att[m.ID] = 'present' })
    meeting.attendance?.forEach(a => { att[a.user_id] = a.status })
    setAttendance(att)
    setMinutesItems([{ title: '', content: '' }])
    setAttendanceForm(f => ({
      ...f,
      absent_fine: meeting.fine_absent || settings.absent_fine || 200,
      absent_no_apology_fine: meeting.fine_absent_apology || settings.absent_no_apology_fine || 500,
      fine_late: meeting.fine_late || settings.late_fine || 100,
      minutes: '',
    }))
    setShowAttendance(meeting)
  }

  const handleCloseAttendance = async () => {
    setError('')
    const attendanceList = Object.entries(attendance).map(([userId, status]) => ({
      user_id: Number(userId), status
    }))
    // Serialize minutes items to JSON
    const minutesJson = JSON.stringify(minutesItems.filter(i => i.title || i.content))
    try {
      const r = await api.post(`/meetings/${showAttendance.ID}/close`, {
        attendance: attendanceList,
        absent_fine: attendanceForm.absent_fine,
        absent_no_apology_fine: attendanceForm.absent_no_apology_fine,
        fine_late: attendanceForm.fine_late,
        minutes: minutesJson,
      })
      alert(`✅ ${r.data.message}`)
      setShowAttendance(null)
      fetchMeetings()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const loadReport = async (meeting) => {
    const r = await api.get(`/meetings/${meeting.ID}/report`)
    setReport(r.data)
    setShowReport(meeting)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this meeting?')) return
    await api.delete(`/meetings/${id}`)
    fetchMeetings()
  }

  const attCount = (att) => ({
    present: Object.values(att).filter(s => s === 'present').length,
    late: Object.values(att).filter(s => s === 'late').length,
    absent: Object.values(att).filter(s => s === 'absent').length,
    apology: Object.values(att).filter(s => s === 'absent_apology').length,
  })

  const statusColor = {
    scheduled: ['#eff6ff', '#1d4ed8'],
    completed: ['#f0fdf4', '#16a34a'],
    cancelled: ['#fef2f2', '#dc2626'],
  }

  const upcoming = meetings.filter(m => m.status === 'scheduled')
  const past = meetings.filter(m => m.status !== 'scheduled')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📅 Meetings</h2>
        {isSecretaryOrAbove && (
          <button onClick={() => { setError(''); setShowAdd(true) }}
            style={{ padding: '9px 20px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            + Schedule Meeting
          </button>
        )}
      </div>

      {loading ? <p>Loading...</p> : (
        <>
          {upcoming.length > 0 && (
            <>
              <h3 style={{ margin: '0 0 14px', fontSize: 14, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Upcoming</h3>
              <div style={{ display: 'grid', gap: 14, marginBottom: 28 }}>
                {upcoming.map(m => (
                  <div key={m.ID} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #eff6ff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{m.title}</div>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                          📅 {new Date(m.scheduled_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                          {m.location && ` · 📍 ${m.location}`}
                        </div>
                        {m.agenda && <div style={{ fontSize: 13, color: '#374151', marginTop: 8, whiteSpace: 'pre-wrap' }}>{m.agenda}</div>}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                          {[
                            [`⚠️ Absent: KES ${m.fine_absent || 0}`, '#fef2f2', '#dc2626'],
                            [`🙏 Apology: KES ${m.fine_absent_apology || 0}`, '#fef3c7', '#d97706'],
                            [`⏰ Late: KES ${m.fine_late || 0}`, '#fff7ed', '#c2410c'],
                          ].map(([label, bg, color]) => (
                            <span key={label} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: bg, color, fontWeight: 600 }}>{label}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {isTreasurerOrAbove && (
                          <button onClick={() => openAttendance(m)}
                            style={{ padding: '6px 14px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                            📋 Take Attendance
                          </button>
                        )}
                        {(isAdmin || isSecretaryOrAbove) && (
                          <button onClick={() => handleDelete(m.ID)}
                            style={{ padding: '6px 10px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {past.length > 0 && (
            <>
              <h3 style={{ margin: '0 0 14px', fontSize: 14, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Past Meetings</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {past.map(m => {
                  const [sbg, sc] = statusColor[m.status] || statusColor.completed
                  const presentCount = m.attendance?.filter(a => a.status === 'present').length || 0
                  const totalAtt = m.attendance?.length || 0
                  return (
                    <div key={m.ID} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', flexWrap: 'wrap', gap: 10 }}
                        onClick={() => setExpandedId(expandedId === m.ID ? null : m.ID)}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 15 }}>{m.title}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>
                            {new Date(m.scheduled_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
                            {m.location && ` · ${m.location}`}
                            {totalAtt > 0 && ` · ${presentCount}/${totalAtt} present`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: sbg, color: sc }}>{m.status}</span>
                          <span style={{ color: '#94a3b8' }}>{expandedId === m.ID ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {expandedId === m.ID && (
                        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f1f5f9' }}>
                          {m.attendance?.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Attendance</div>
                              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {[
                                  ['Present', m.attendance.filter(a => a.status === 'present').length, '#f0fdf4', '#16a34a'],
                                  ['Late', m.attendance.filter(a => a.status === 'late').length, '#fff7ed', '#c2410c'],
                                  ['Apology', m.attendance.filter(a => a.status === 'absent_apology').length, '#fffbeb', '#d97706'],
                                  ['Absent', m.attendance.filter(a => a.status === 'absent').length, '#fef2f2', '#dc2626'],
                                ].map(([label, count, bg, color]) => count > 0 && (
                                  <div key={label} style={{ background: bg, borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, color }}>{label}: {count}</div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                            <button onClick={() => loadReport(m)}
                              style={{ padding: '6px 14px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                              📊 Full Report
                            </button>
                            {isTreasurerOrAbove && (
                              <button onClick={() => openAttendance(m)}
                                style={{ padding: '6px 14px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                                ✏️ Edit Attendance
                              </button>
                            )}
                            {(isAdmin || isSecretaryOrAbove) && (
                              <button onClick={() => handleDelete(m.ID)}
                                style={{ padding: '6px 10px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                                🗑 Delete
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
          {meetings.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No meetings yet.</p>}
        </>
      )}

      {/* Schedule Meeting Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowAdd(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Schedule Meeting</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 14, marginBottom: 16 }}>{error}</div>}
            <div style={{ display: 'grid', gap: 14 }}>
              <div><label style={lbl}>Title *</label><input style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><label style={lbl}>Date & Time *</label><input style={inp} type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} /></div>
              <div><label style={lbl}>Location</label><input style={inp} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
              <div><label style={lbl}>Agenda</label><textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={form.agenda} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))} /></div>
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 10 }}>⚠️ Fine Amounts for this Meeting</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <div>
                    <label style={{ ...lbl, color: '#92400e' }}>Absent (KES)</label>
                    <input style={inp} type="number" value={attendanceForm.absent_fine}
                      onChange={e => setAttendanceForm(f => ({ ...f, absent_fine: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label style={{ ...lbl, color: '#92400e' }}>Apology (KES)</label>
                    <input style={inp} type="number" value={attendanceForm.absent_no_apology_fine}
                      onChange={e => setAttendanceForm(f => ({ ...f, absent_no_apology_fine: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label style={{ ...lbl, color: '#92400e' }}>Late (KES)</label>
                    <input style={inp} type="number" value={attendanceForm.fine_late}
                      onChange={e => setAttendanceForm(f => ({ ...f, fine_late: Number(e.target.value) }))} />
                  </div>
                </div>
              </div>
              <button onClick={handleAdd} style={{ padding: '11px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
                Schedule Meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendance && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowAttendance(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>📋 {showAttendance.title}</h3>
              <button onClick={() => setShowAttendance(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
              {new Date(showAttendance.scheduled_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
              {showAttendance.location && ` · 📍 ${showAttendance.location}`}
            </p>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 14, marginBottom: 16 }}>{error}</div>}

            {/* Fine amounts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: 14 }}>
              <div>
                <label style={{ ...lbl, color: '#92400e' }}>Absent Fine (KES)</label>
                <input style={inp} type="number" value={attendanceForm.absent_fine}
                  onChange={e => setAttendanceForm(f => ({ ...f, absent_fine: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={{ ...lbl, color: '#92400e' }}>Apology Fine (KES)</label>
                <input style={inp} type="number" value={attendanceForm.absent_no_apology_fine}
                  onChange={e => setAttendanceForm(f => ({ ...f, absent_no_apology_fine: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={{ ...lbl, color: '#92400e' }}>Late Fine (KES)</label>
                <input style={inp} type="number" value={attendanceForm.fine_late}
                  onChange={e => setAttendanceForm(f => ({ ...f, fine_late: Number(e.target.value) }))} />
              </div>
            </div>

            {/* Live count */}
            {(() => {
              const c = attCount(attendance)
              return (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[
                    ['Present', c.present, '#f0fdf4', '#16a34a'],
                    ['Late', c.late, '#fff7ed', '#c2410c'],
                    ['Apology', c.apology, '#fffbeb', '#d97706'],
                    ['Absent', c.absent, '#fef2f2', '#dc2626'],
                  ].map(([label, count, bg, color]) => (
                    <div key={label} style={{ background: bg, borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, color }}>{label}: {count}</div>
                  ))}
                </div>
              )
            })()}

            {/* Member list */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
              {members.map((m, i) => (
                <div key={m.ID} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px',
                  borderBottom: i < members.length - 1 ? '1px solid #f1f5f9' : 'none',
                  background: attendance[m.ID] === 'absent' ? '#fff8f8' : attendance[m.ID] === 'absent_apology' ? '#fffef5' : attendance[m.ID] === 'late' ? '#fff8f0' : 'white' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{m.account_number}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {[
                      ['present', '✅', '#f0fdf4', '#16a34a', 'Present'],
                      ['late', '⏰', '#fff7ed', '#c2410c', 'Late'],
                      ['absent_apology', '🙏', '#fffbeb', '#d97706', 'Apology'],
                      ['absent', '❌', '#fef2f2', '#dc2626', 'Absent'],
                    ].map(([val, icon, bg, color, label]) => (
                      <button key={val} onClick={() => setAttendance(a => ({ ...a, [m.ID]: val }))}
                        style={{ padding: '4px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                          background: attendance[m.ID] === val ? color : bg,
                          color: attendance[m.ID] === val ? 'white' : color }}>
                        {icon} {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Minutes — structured agenda items */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ ...lbl, marginBottom: 0 }}>Meeting Minutes</label>
                <button onClick={() => setMinutesItems(i => [...i, { title: '', content: '' }])}
                  style={{ padding: '4px 12px', background: '#f0fdf4', color: '#1a6b3c', border: '1px solid #bbf7d0', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  + Add Item
                </button>
              </div>
              {minutesItems.map((item, idx) => (
                <div key={idx} style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', marginBottom: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Agenda Item {idx + 1}</span>
                    {minutesItems.length > 1 && (
                      <button onClick={() => setMinutesItems(items => items.filter((_, i) => i !== idx))}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>✕</button>
                    )}
                  </div>
                  <input style={{ ...inp, marginBottom: 8 }} placeholder="Item title e.g. Treasurer's Report"
                    value={item.title} onChange={e => setMinutesItems(items => items.map((it, i) => i === idx ? { ...it, title: e.target.value } : it))} />
                  <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} placeholder="Discussion and resolution..."
                    value={item.content} onChange={e => setMinutesItems(items => items.map((it, i) => i === idx ? { ...it, content: e.target.value } : it))} />
                </div>
              ))}
            </div>

            <button onClick={handleCloseAttendance}
              style={{ width: '100%', padding: '12px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
              Save Attendance & Issue Fines
            </button>
          </div>
        </div>
      )}

      {/* Meeting Report Modal */}
      {showReport && report && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowReport(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>📊 Meeting Report</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => printMinutes(showReport, report)}
                  style={{ padding: '7px 14px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  🖨️ Download Minutes PDF
                </button>
                <button onClick={() => setShowReport(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{report.meeting?.title}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                {new Date(report.meeting?.scheduled_at).toLocaleString('en-KE', { dateStyle: 'long', timeStyle: 'short' })}
                {report.meeting?.location && ` · ${report.meeting.location}`}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
              {[
                ['Total', report.summary?.total, '#f8fafc', '#374151'],
                ['Present', report.summary?.present, '#f0fdf4', '#16a34a'],
                ['Late', report.summary?.late, '#fff7ed', '#c2410c'],
                ['Apology', report.summary?.absent_apology, '#fffbeb', '#d97706'],
                ['Absent', report.summary?.absent, '#fef2f2', '#dc2626'],
              ].map(([label, val, bg, color]) => (
                <div key={label} style={{ background: bg, borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color }}>{val || 0}</div>
                </div>
              ))}
            </div>

            {report.total_fines > 0 && (
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 14 }}>
                💰 Total fines issued: <strong>KES {report.total_fines?.toLocaleString()}</strong>
                <span style={{ marginLeft: 10, fontSize: 12, color: '#92400e' }}>
                  Absent: KES {report.meeting?.fine_absent} · Apology: KES {report.meeting?.fine_absent_apology} · Late: KES {report.meeting?.fine_late}
                </span>
              </div>
            )}

            {[
              ['✅ Present', report.present, '#f0fdf4', '#16a34a'],
              ['⏰ Late', report.late, '#fff7ed', '#c2410c'],
              ['🙏 Absent with Apology', report.absent_apology, '#fffbeb', '#d97706'],
              ['❌ Absent', report.absent, '#fef2f2', '#dc2626'],
            ].map(([title, list, bg, color]) => list?.length > 0 && (
              <div key={title} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{title} ({list.length})</div>
                <div style={{ background: bg, borderRadius: 8, padding: '8px 12px' }}>
                  {list.map(a => (
                    <div key={a.ID} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                      <span>{a.user?.name} <span style={{ fontSize: 11, color: '#94a3b8' }}>{a.user?.account_number}</span></span>
                      {a.fine_amount > 0 && <span style={{ color, fontWeight: 600 }}>KES {a.fine_amount?.toLocaleString()}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Minutes display */}
            {report.meeting?.minutes && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>📝 Minutes</div>
                {(() => {
                  try {
                    const items = JSON.parse(report.meeting.minutes)
                    if (Array.isArray(items) && items.length > 0) {
                      return items.map((item, idx) => (
                        <div key={idx} style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{idx + 1}. {item.title}</div>
                          <div style={{ fontSize: 13, color: '#64748b', whiteSpace: 'pre-wrap' }}>{item.content}</div>
                        </div>
                      ))
                    }
                  } catch {}
                  return <div style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', background: '#f8fafc', borderRadius: 8, padding: '12px 14px' }}>{report.meeting.minutes}</div>
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
