import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import PacientesPage from './pages/PacientesPage'
import ProfesionalesPage from './pages/ProfesionalesPage'
import AgendaPage from './pages/AgendaPage'
import TurnosPage from './pages/TurnosPage'
import HistoriaClinicaPage from './pages/HistoriaClinicaPage'
import ListaEsperaPage from './pages/ListaEsperaPage'
import FacturacionPage from './pages/FacturacionPage'
import ReportesPage from './pages/ReportesPage'
import ConfiguracionPage from './pages/ConfiguracionPage'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, rol, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
          <p className="text-gray-500 text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(rol)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  const { user, loading } = useAuth()

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
          <p className="text-gray-500 text-sm">Iniciando sistema...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="pacientes" element={<PacientesPage />} />
        <Route path="profesionales" element={
          <ProtectedRoute allowedRoles={['admin', 'secretaria']}>
            <ProfesionalesPage />
          </ProtectedRoute>
        } />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="turnos/nuevo" element={<TurnosPage />} />
        <Route path="historia-clinica/:pacienteId" element={<HistoriaClinicaPage />} />
        <Route path="lista-espera" element={
          <ProtectedRoute allowedRoles={['admin', 'secretaria']}>
            <ListaEsperaPage />
          </ProtectedRoute>
        } />
        <Route path="facturacion" element={
          <ProtectedRoute allowedRoles={['admin', 'secretaria']}>
            <FacturacionPage />
          </ProtectedRoute>
        } />
        <Route path="reportes" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ReportesPage />
          </ProtectedRoute>
        } />
        <Route path="configuracion" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ConfiguracionPage />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
