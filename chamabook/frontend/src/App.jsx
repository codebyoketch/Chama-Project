import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Contributions from './pages/Contributions'
import Loans from './pages/Loans'
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
}

export default function App() {
  return (
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
  )
}
