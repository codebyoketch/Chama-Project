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
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
