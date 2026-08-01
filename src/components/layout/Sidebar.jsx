import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard, Users, UserCog, Calendar, CalendarPlus,
  FileText, Clock, CreditCard, BarChart3, Settings,
  LogOut, Heart, ChevronLeft, ChevronRight, X
} from 'lucide-react'

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'secretaria', 'profesional'] },
  { path: '/pacientes', icon: Users, label: 'Pacientes', roles: ['admin', 'secretaria', 'profesional'] },
  { path: '/profesionales', icon: UserCog, label: 'Profesionales', roles: ['admin', 'secretaria'] },
  { path: '/agenda', icon: Calendar, label: 'Agenda', roles: ['admin', 'secretaria', 'profesional'] },
  { path: '/turnos/nuevo', icon: CalendarPlus, label: 'Nuevo Turno', roles: ['admin', 'secretaria'] },
  { path: '/lista-espera', icon: Clock, label: 'Lista de Espera', roles: ['admin', 'secretaria'] },
  { path: '/facturacion', icon: CreditCard, label: 'Facturación', roles: ['admin', 'secretaria'] },
  { path: '/reportes', icon: BarChart3, label: 'Reportes', roles: ['admin'] },
  { path: '/configuracion', icon: Settings, label: 'Configuración', roles: ['admin'] },
]

export default function Sidebar({ isOpen, onToggle, mobileOpen, onMobileClose }) {
  const { user, rol, logout } = useAuth()
  const navigate = useNavigate()

  const filteredItems = menuItems.filter(item => item.roles.includes(rol))

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="flex items-center justify-center w-10 h-10 bg-white/10 rounded-xl flex-shrink-0">
          <Heart className="w-5 h-5 text-white" />
        </div>
        {isOpen && (
          <div className="animate-fade-in overflow-hidden">
            <h1 className="text-white font-bold text-sm leading-tight">Centro Médico</h1>
            <p className="text-blue-200 text-xs">Patagonia</p>
          </div>
        )}
        {/* Botón cerrar en móvil */}
        <button 
          onClick={onMobileClose}
          className="ml-auto lg:hidden p-1 rounded hover:bg-white/10"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {filteredItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onMobileClose}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
              ${isActive 
                ? 'bg-white/15 text-white shadow-sm' 
                : 'text-blue-100/70 hover:text-white hover:bg-white/8'
              }
              ${!isOpen ? 'justify-center' : ''}
            `}
            title={!isOpen ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {isOpen && <span className="text-sm font-medium truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Usuario y logout */}
      <div className="border-t border-white/10 p-3">
        {isOpen && (
          <div className="px-2 mb-3">
            <p className="text-white text-sm font-medium truncate">{user?.email}</p>
            <p className="text-blue-200/60 text-xs capitalize">{rol}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-blue-100/70 hover:text-white hover:bg-white/8 transition-all ${!isOpen ? 'justify-center' : ''}`}
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isOpen && <span className="text-sm">Cerrar sesión</span>}
        </button>
      </div>

      {/* Toggle collapse (solo desktop) */}
      <button
        onClick={onToggle}
        className="hidden lg:flex items-center justify-center py-3 border-t border-white/10 text-blue-200/50 hover:text-white transition-colors"
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:block sidebar-transition bg-gradient-to-b from-[#0D2840] to-[#1B4F72] flex-shrink-0 ${isOpen ? 'w-[260px]' : 'w-16'}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[260px] bg-gradient-to-b from-[#0D2840] to-[#1B4F72] transform transition-transform duration-300 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
