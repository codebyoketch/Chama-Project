// Reusable branch tab selector used across pages
import { useAuth } from '../context/AuthContext'

export default function BranchTabs({ selected, onChange, includeAll = true }) {
  const { branches } = useAuth()

  const tabs = [
    ...(includeAll ? [{ ID: 0, name: 'All Branches', type: 'all' }] : []),
    ...branches
  ]

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
      {tabs.map(b => (
        <button key={b.ID} onClick={() => onChange(b.ID)}
          style={{
            padding: '7px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: selected === b.ID ? 600 : 400,
            background: selected === b.ID
              ? (b.type === 'sacco' ? '#1a6b3c' : b.type === 'table_banking' ? '#1d4ed8' : '#374151')
              : '#f1f5f9',
            color: selected === b.ID ? 'white' : '#374151',
          }}>
          {b.type === 'sacco' ? '🏦' : b.type === 'table_banking' ? '💼' : '📊'} {b.name}
        </button>
      ))}
    </div>
  )
}
