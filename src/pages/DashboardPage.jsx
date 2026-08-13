import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, parseISO, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { 
  CalendarDays, Users, UserCheck, UserX, Clock, 
  CalendarPlus, Search, TrendingUp, Activity, ArrowUpRight, Zap
} from 'lucide-react'

const RADIAN = Math.PI / 180
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-2.5 text-sm">
        <p className="font-semibold text-gray-700">{label}</p>
        <p className="text-[#1B4F72] font-bold mt-0.5">{payload[0].value} turnos</p>
      </div>
    )
  }
  return null
}

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
  const [semanalData, setSemanalData] = useState([])
  const [estadosData, setEstadosData] = useState([])
  const [loading, setLoading] = useState(true)

  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'))
  const fechaLabel = format(parseISO(fecha), "EEEE d 'de' MMMM yyyy", { locale: es })

  useEffect(() => {
    fetchDashboardData()
  }, [fecha])

  async function fetchDashboardData() {
    try {
      // 1. Turnos de la fecha seleccionada
      const { data: turnosHoy } = await supabase
        .from('turnos')
        .select('*, profesionales(nombre, apellido)')
        .eq('fecha_turno', fecha)

      const turnos = turnosHoy || []
      
      // Próximos turnos (siguientes 6 del día sin atender)
      const proximos = turnos
        .filter(t => !t.cancelado && !['asistido', 'ausente', 'cancelado'].includes(t.estado))
        .sort((a, b) => a.hora.localeCompare(b.hora))
        .slice(0, 6)

      // Pacientes nuevos este mes
      const inicioMes = format(parseISO(fecha), 'yyyy-MM-01')
      const { count: nuevos } = await supabase
        .from('pacientes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', inicioMes)

      // 2. Turnos de los últimos 7 días (para el gráfico de tendencia)
      const fechaInicioSemana = format(subDays(parseISO(fecha), 6), 'yyyy-MM-dd')
      const { data: turnosSemana } = await supabase
        .from('turnos')
        .select('fecha_turno, cancelado')
        .gte('fecha_turno', fechaInicioSemana)
        .lte('fecha_turno', fecha)
        .eq('cancelado', false)

      const turnosSemanaList = turnosSemana || []
      const last7 = []
      for (let i = 6; i >= 0; i--) {
        const d = subDays(parseISO(fecha), i)
        const dStr = format(d, 'yyyy-MM-dd')
        const count = turnosSemanaList.filter(t => t.fecha_turno === dStr).length
        last7.push({
          dia: format(d, 'EEE', { locale: es }),
          turnos: count,
          fechaCompleta: dStr
        })
      }

      // Distribución de estados para la torta
      const estados = [
        { name: 'Reservados', value: turnos.filter(t => t.estado === 'reservado' && !t.cancelado).length, color: '#3B82F6' },
        { name: 'Confirmados', value: turnos.filter(t => t.estado === 'confirmado' && !t.cancelado).length, color: '#10B981' },
        { name: 'Asistidos', value: turnos.filter(t => t.estado === 'asistido' && !t.cancelado).length, color: '#059669' },
        { name: 'Ausentes', value: turnos.filter(t => t.estado === 'ausente' && !t.cancelado).length, color: '#EF4444' },
        { name: 'Cancelados', value: turnos.filter(t => t.cancelado || t.estado === 'cancelado').length, color: '#9CA3AF' },
      ].filter(e => e.value > 0)

      setStats({
        turnosHoy: turnos.filter(t => !t.cancelado && t.estado !== 'cancelado').length,
        confirmados: turnos.filter(t => t.estado === 'confirmado' && !t.cancelado).length,
        ausentes: turnos.filter(t => t.estado === 'ausente' && !t.cancelado).length,
        cancelados: turnos.filter(t => t.cancelado || t.estado === 'cancelado').length,
        pacientesNuevos: nuevos || 0,
        turnosPendientes: turnos.filter(t => t.estado === 'reservado' && !t.cancelado).length,
      })
      setTurnosProximos(proximos)
      setSemanalData(last7)
      setEstadosData(estados)
    } catch (err) {
      console.error('Error cargando dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Turnos Hoy', value: stats.turnosHoy, icon: CalendarDays, gradient: 'from-blue-500 to-blue-600', lightBg: 'bg-blue-50', text: 'text-blue-600', border: 'border-l-4 border-blue-500' },
    { label: 'Confirmados', value: stats.confirmados, icon: UserCheck, gradient: 'from-emerald-500 to-green-600', lightBg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-l-4 border-emerald-500' },
    { label: 'Pendientes', value: stats.turnosPendientes, icon: Clock, gradient: 'from-amber-500 to-amber-600', lightBg: 'bg-amber-50', text: 'text-amber-600', border: 'border-l-4 border-amber-500' },
    { label: 'Ausentes', value: stats.ausentes, icon: UserX, gradient: 'from-red-500 to-red-600', lightBg: 'bg-red-50', text: 'text-red-600', border: 'border-l-4 border-red-500' },
    { label: 'Cancelados', value: stats.cancelados, icon: UserX, gradient: 'from-gray-500 to-gray-600', lightBg: 'bg-gray-100', text: 'text-gray-600', border: 'border-l-4 border-gray-400' },
    { label: 'Pacientes Nuevos', value: stats.pacientesNuevos, icon: TrendingUp, gradient: 'from-purple-500 to-indigo-600', lightBg: 'bg-purple-50', text: 'text-purple-600', border: 'border-l-4 border-purple-500' },
  ]

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 skeleton rounded-xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 skeleton rounded-xl lg:col-span-2"></div>
          <div className="h-80 skeleton rounded-xl"></div>
        </div>
        <div className="h-64 skeleton rounded-xl"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">Centro Médico Patagonia</h1>
            {/* Blinking Live Dot */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-[0.7rem] text-green-700 font-semibold uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              En Vivo
            </div>
          </div>
          <p className="text-gray-500 text-sm capitalize mt-1 flex items-center gap-1.5">
            {fechaLabel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="date" 
            className="form-input text-sm py-1.5 px-3 bg-white shadow-sm" 
            value={fecha} 
            onChange={e => setFecha(e.target.value)} 
          />
          <Link to="/turnos/nuevo" className="btn-primary gap-2">
            <CalendarPlus className="w-4 h-4" />
            Nuevo Turno
          </Link>
        </div>
      </div>

      {/* ── Tarjetas de estadísticas ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <div 
            key={i} 
            className={`glass-card p-4 flex flex-col justify-between hover:shadow-md transition-all relative group overflow-hidden ${card.border}`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className={`${card.lightBg} p-2 rounded-xl`}>
                <card.icon className={`w-5 h-5 ${card.text}`} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-800 tracking-tight">{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Gráficos del Dashboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico de Área - Tendencia Semanal */}
        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#1B4F72]" />
            Tendencia Semanal (Últimos 7 días)
          </h3>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={semanalData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTurnos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1B4F72" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#1B4F72" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="turnos" 
                stroke="#1B4F72" 
                strokeWidth={2.5} 
                fill="url(#colorTurnos)" 
                dot={{ r: 4, fill: '#1B4F72', strokeWidth: 0 }} 
                activeDot={{ r: 6, fill: '#1B4F72' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Torta - Distribución de Estados */}
        <div className="glass-card p-5 flex flex-col justify-between">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[#1E8449]" />
            Distribución del Día
          </h3>
          {estadosData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
              <CalendarDays className="w-8 h-8 opacity-40" />
              Sin turnos registrados hoy
            </div>
          ) : (
            <>
              <div className="flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={estadosData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {estadosData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} turnos`, 'Cantidad']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Leyenda personalizada */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                {estadosData.map((item, index) => (
                  <div key={index} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span className="truncate">{item.name}: <strong>{item.value}</strong></span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>

      {/* ── Próximos turnos ── */}
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
            <p>No hay turnos pendientes para esta fecha</p>
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
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span>{turno.servicios || 'Consulta general'}</span>
                      {turno.profesionales && (
                        <span>• Dr. {turno.profesionales.apellido}</span>
                      )}
                    </div>
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
