import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken]       = useState(localStorage.getItem('chamabook_token') || null)
  const [user, setUser]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('chamabook_user')) } catch { return null }
  })
  const [group, setGroup]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('chamabook_group')) } catch { return null }
  })
  const [branches, setBranches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chamabook_branches')) || [] } catch { return [] }
  })

  const login = (token, user, group, branches = []) => {
    setToken(token); setUser(user); setGroup(group); setBranches(branches)
    localStorage.setItem('chamabook_token',    token)
    localStorage.setItem('chamabook_user',     JSON.stringify(user))
    localStorage.setItem('chamabook_group',    JSON.stringify(group))
    localStorage.setItem('chamabook_branches', JSON.stringify(branches))
  }

  const logout = () => {
    setToken(null); setUser(null); setGroup(null); setBranches([])
    localStorage.removeItem('chamabook_token')
    localStorage.removeItem('chamabook_user')
    localStorage.removeItem('chamabook_group')
    localStorage.removeItem('chamabook_branches')
  }

  // Role hierarchy — must match backend middleware exactly:
  // admin(6) > chairperson(5) > vice_chairperson(4) > treasurer(3) > secretary(2) > member(1)
  const roleLevel = (role) => ({
    admin:            6,
    chairperson:      5,
    vice_chairperson: 4, // 👈 new
    treasurer:        3,
    secretary:        2,
    member:           1,
  }[role] || 0)

  const currentLevel = roleLevel(user?.role)

  // Role checks
  const isAdmin                  = user?.role === 'admin'
  const isChairpersonOrAbove     = currentLevel >= 5  // chairperson + admin only
  const isViceChairpersonOrAbove = currentLevel >= 4  // vice_chairperson + chairperson + admin
  const isTreasurerOrAbove       = currentLevel >= 3  // treasurer + above
  const isSecretaryOrAbove       = currentLevel >= 2  // secretary + above
  const isMemberOnly             = user?.role === 'member'

  // Loan approval — secretary, vice_chairperson, chairperson, admin
  const canApproveLoan = ['secretary', 'vice_chairperson', 'chairperson', 'admin'].includes(user?.role)

  // Role display label
  const roleLabel = {
    admin:            '🔧 Admin',
    chairperson:      '👑 Chairperson',
    vice_chairperson: '🎖️ Vice Chairperson',
    treasurer:        '💰 Treasurer',
    secretary:        '📋 Secretary',
    member:           '👤 Member',
  }[user?.role] || user?.role

  return (
    <AuthContext.Provider value={{
      token, user, group, branches, login, logout,
      // Role booleans
      isAdmin,
      isChairpersonOrAbove,
      isViceChairpersonOrAbove,
      isTreasurerOrAbove,
      isSecretaryOrAbove,
      isMemberOnly,
      canApproveLoan,
      // Helpers
      roleLevel,
      roleLabel,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
