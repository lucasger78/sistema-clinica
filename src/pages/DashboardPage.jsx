import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  CalendarDays, Users, UserCheck, UserX, Clock, 
  CalendarPlus, Search, TrendingUp, Activity
} from 'lucide-react'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    turnosHoy: 0,
    confirmados: 0,
    ausentes: 0,
    cancelados: 0,
    pacientesNuevos: 0,
    turnosPendientes: 0,
  })
  const [turnosProximos, setTurnosProximos] = useState([])
  const [loading, setLoading] = useState(true)

  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'))
  const fechaLabel = format(parseISO(fecha), "EEEE d 'de' MMMM yyyy", { locale: es })

  useEffect(() => {
    fetchDashboardData()
  }, [fecha])

  async function fetchDashboardData() {
    try {
      // Turnos de hoy
      const { data: turnosHoy } = await supabase
        .from('turnos')
        .select('*')
        .eq('fecha_turno', fecha)

      const turnos = turnosHoy || []
      
      // Próximos turnos (siguientes 5 de hoy sin atender)
      const proximos = turnos
        .filter(t => !t.cancelado && !['asistido', 'ausente', 'cancelado'].includes(t.estado))
        .sort((a, b) => a.hora.localeCompare(b.hora))
        .slice(0, 6)

      // Pacientes nuevos este mes
      const inicioMes = format(new Date(), 'yyyy-MM-01')
      const { count: nuevos } = await supabase
        .from('pacientes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', inicioMes)

      setStats({
        turnosHoy: turnos.filter(t => !t.cancelado && t.estado !== 'cancelado').length,
        confirmados: turnos.filter(t => t.estado === 'confirmado' && !t.cancelado).length,
        ausentes: turnos.filter(t => t.estado === 'ausente' && !t.cancelado).length,
        cancelados: turnos.filter(t => t.cancelado || t.estado === 'cancelado').length,
        pacientesNuevos: nuevos || 0,
        turnosPendientes: turnos.filter(t => t.estado === 'reservado' && !t.cancelado).length,
      })
      setTurnosProximos(proximos)
    } catch (err) {
      console.error('Error cargando dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Turnos hoy', value: stats.turnosHoy, icon: CalendarDays, color: 'bg-blue-500', lightBg: 'bg-blue-50' },
    { label: 'Confirmados', value: stats.confirmados, icon: UserCheck, color: 'bg-green-500', lightBg: 'bg-green-50' },
    { label: 'Pendientes', value: stats.turnosPendientes, icon: Clock, color: 'bg-amber-500', lightBg: 'bg-amber-50' },
    { label: 'Ausentes', value: stats.ausentes, icon: UserX, color: 'bg-red-500', lightBg: 'bg-red-50' },
    { label: 'Cancelados', value: stats.cancelados, icon: UserX, color: 'bg-gray-500', lightBg: 'bg-gray-100' },
    { label: 'Pac. nuevos (mes)', value: stats.pacientesNuevos, icon: TrendingUp, color: 'bg-purple-500', lightBg: 'bg-purple-50' },
  ]

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 skeleton"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl"></div>)}
        </div>
        <div className="h-64 skeleton rounded-xl"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <input 
              type="date" 
              className="form-input text-sm py-1.5 px-3" 
              value={fecha} 
              onChange={e => setFecha(e.target.value)} 
            />
          </div>
          <p className="text-gray-500 text-sm capitalize mt-1">{fechaLabel}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/turnos/nuevo" className="btn-primary">
            <CalendarPlus className="w-4 h-4" />
            Nuevo Turno
          </Link>
          <Link to="/pacientes" className="btn-secondary">
            <Search className="w-4 h-4" />
            Buscar Paciente
          </Link>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="glass-card p-5 flex items-start gap-4 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <div className={`${card.lightBg} p-3 rounded-xl`}>
              <card.icon className={`w-5 h-5 ${card.color.replace('bg-', 'text-')}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Próximos turnos */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#1B4F72]" />
            Próximos turnos del día seleccionado
          </h2>
          <Link to="/agenda" className="text-sm text-[#1B4F72] hover:underline font-medium">
            Ver agenda completa →
          </Link>
        </div>

        {turnosProximos.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay turnos pendientes para hoy</p>
          </div>
        ) : (
          <div className="space-y-2">
            {turnosProximos.map((turno, i) => (
              <div 
                key={turno.id} 
                className={`flex items-center justify-between p-4 rounded-lg border transition-all hover:shadow-sm ${
                  turno.es_sobreturno ? 'sobreturno-border' : 'border-gray-100 bg-white'
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="text-center bg-gray-50 rounded-lg px-3 py-1.5 min-w-[60px]">
                    <p className="text-lg font-bold text-[#1B4F72]">{turno.hora?.slice(0,5)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {turno.nombre}
                      {turno.es_sobreturno && <span className="sobreturno-badge ml-2">ST</span>}
                    </p>
                    <p className="text-sm text-gray-500">{turno.servicios || 'Consulta general'}</p>
                  </div>
                </div>
                <span className={`badge badge-${turno.cancelado ? 'cancelado' : (turno.estado || 'reservado')}`}>
                  {turno.cancelado ? 'cancelado' : (turno.estado || 'reservado')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
