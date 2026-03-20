<<<<<<< HEAD
import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load saved session on app start
  useEffect(() => {
    const savedUser = localStorage.getItem('chamabook_user')
    const savedGroup = localStorage.getItem('chamabook_group')
    if (savedUser) setUser(JSON.parse(savedUser))
    if (savedGroup) setGroup(JSON.parse(savedGroup))
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { token, user, group } = res.data
    localStorage.setItem('chamabook_token', token)
    localStorage.setItem('chamabook_user', JSON.stringify(user))
    localStorage.setItem('chamabook_group', JSON.stringify(group))
    setUser(user)
    setGroup(group)
    return res.data
  }

  const register = async (groupName, name, phone, email, password) => {
    const res = await api.post('/auth/register', { group_name: groupName, name, phone, email, password })
    const { token, user, group } = res.data
    localStorage.setItem('chamabook_token', token)
    localStorage.setItem('chamabook_user', JSON.stringify(user))
    localStorage.setItem('chamabook_group', JSON.stringify(group))
    setUser(user)
    setGroup(group)
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('chamabook_token')
    localStorage.removeItem('chamabook_user')
    localStorage.removeItem('chamabook_group')
    setUser(null)
    setGroup(null)
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'treasurer'

  return (
    <AuthContext.Provider value={{ user, group, loading, login, register, logout, isAdmin }}>
=======
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
>>>>>>> master
      {children}
    </AuthContext.Provider>
  )
}

<<<<<<< HEAD
export const useAuth = () => useContext(AuthContext)
=======
export const useAuth = () => useContext(AuthContext)
>>>>>>> master
