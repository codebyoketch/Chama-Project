import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
<<<<<<< HEAD
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { startSyncListener } from './services/sync'

// Pages
=======
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
>>>>>>> master
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Contributions from './pages/Contributions'
import Loans from './pages/Loans'
<<<<<<< HEAD
import Minutes from './pages/Minutes'
import Layout from './components/Layout'

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

const AppRoutes = () => {
  useEffect(() => {
    // Start listening for online/offline events for background sync
    startSyncListener()
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="members" element={<Members />} />
        <Route path="contributions" element={<Contributions />} />
        <Route path="loans" element={<Loans />} />
        <Route path="minutes" element={<Minutes />} />
      </Route>
    </Routes>
  )
=======
import Welfare from './pages/Welfare'
import MeetingsFines from './pages/MeetingsFines'
import Reports from './pages/Reports'
import MemberStatement from './pages/MemberStatement'
import AdminPortal from './pages/AdminPortal'
import MemberPortal from './pages/MemberPortal'
import ShareCapital from './pages/ShareCapital'
import Settings from './pages/Settings'

function PrivateRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" />
}

function AdminRoute({ children }) {
  const { user } = useAuth()
  return user?.role === 'admin' ? children : <Navigate to="/" />
}

function MemberRedirect() {
  const { isMemberOnly } = useAuth()
  return isMemberOnly ? <Navigate to="/portal" /> : <Dashboard />
>>>>>>> master
}

export default function App() {
  return (
<<<<<<< HEAD
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
=======
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<MemberRedirect />} />
            <Route path="portal" element={<MemberPortal />} />
            <Route path="members" element={<Members />} />
            <Route path="contributions" element={<Contributions />} />
            <Route path="loans" element={<Loans />} />
            <Route path="welfare" element={<Welfare />} />
            <Route path="meetings" element={<MeetingsFines />} />
            <Route path="reports" element={<Reports />} />
            <Route path="statements" element={<MemberStatement />} />
            <Route path="admin" element={<AdminRoute><AdminPortal /></AdminRoute>} />
            <Route path="sharecapital" element={<ShareCapital />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
>>>>>>> master
  )
}
