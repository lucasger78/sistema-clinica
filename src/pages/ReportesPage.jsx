import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { format, subDays, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  BarChart, Bar, LineChart, Line
} from 'recharts'
import * as XLSX from 'xlsx'
import {
  Download, BarChart3, TrendingUp, Calendar, CalendarDays,
  Users, UserCheck, UserX, Clock, Activity, Zap, ArrowUpRight,
  CheckCircle2, XCircle, AlertCircle
} from 'lucide-react'

const COLORS_ESTADO = {
  reservado: '#3B82F6',
  confirmado: '#10B981',
  asistido: '#059669',
  ausente: '#EF4444',
  cancelado: '#9CA3AF',
}

const PERIOD_OPTIONS = ['semana', 'mes', 'trimestre']

const RADIAN = Math.PI / 180
function renderDonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.06) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

function ChartTooltip({ active, payload, label, prefix = '', suffix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl px-4 py-2.5 text-sm">
      <p className="font-semibold text-gray-600 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold" style={{ color: p.color || p.stroke || '#1B4F72' }}>
          {prefix}{typeof p.value === 'number' ? p.value.toLocaleString('es-AR') : p.value}{suffix}
        </p>
      ))}
    </div>
  )
}

export default function ReportesPage() {
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')

  // Chart data states
  const [turnosPorDia, setTurnosPorDia] = useState([])
  const [ocupacion, setOcupacion] = useState([])
  const [cancelaciones, setCancelaciones] = useState([])
  const [pacientesNuevos, setPacientesNuevos] = useState([])
  const [facturacion, setFacturacion] = useState([])
  const [estadosHoy, setEstadosHoy] = useState([])

  // KPI totals
  const [kpis, setKpis] = useState({
    totalTurnos: 0,
    totalFacturacion: 0,
    tasaAsistencia: 0,
    tasaCancelacion: 0,
    pacientesNuevosMes: 0,
    promedioTurnosDia: 0,
  })

  useEffect(() => { fetchReportes() }, [periodo])

  async function fetchReportes() {
    setLoading(true)
    try {
      const hoy = new Date()
      let fechaDesde
      if (periodo === 'semana') fechaDesde = format(subDays(hoy, 7), 'yyyy-MM-dd')
      else if (periodo === 'mes') fechaDesde = format(startOfMonth(hoy), 'yyyy-MM-dd')
      else fechaDesde = format(subMonths(hoy, 3), 'yyyy-MM-dd')

      const fechaHasta = format(hoy, 'yyyy-MM-dd')

      // Turnos del período
      const { data: turnos } = await supabase.from('turnos')
        .select('fecha_turno, estado, canal_origen, profesional_id, profesionales(apellido), precio, cancelado')
        .gte('fecha_turno', fechaDesde)
        .lte('fecha_turno', fechaHasta)

      const todosTurnos = turnos || []
      const turnosActivos = todosTurnos.filter(t => !t.cancelado && t.estado !== 'cancelado')
      const turnosCancelados = todosTurnos.filter(t => t.cancelado || t.estado === 'cancelado')

      // Turnos por día
      const porDia = {}
      turnosActivos.forEach(t => { porDia[t.fecha_turno] = (porDia[t.fecha_turno] || 0) + 1 })
      const diasData = Object.entries(porDia)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fecha, cantidad]) => ({ fecha: fecha.slice(5), cantidad }))
        .slice(-30)
      setTurnosPorDia(diasData)

      // Turnos por profesional
      const porProf = {}
      turnosActivos.forEach(t => {
        const p = t.profesionales?.apellido || 'Sin asignar'
        porProf[p] = (porProf[p] || 0) + 1
      })
      setOcupacion(
        Object.entries(porProf)
          .map(([nombre, turnos]) => ({ nombre, turnos }))
          .sort((a, b) => b.turnos - a.turnos)
      )

      // Cancelaciones por canal
      const porCanal = {}
      turnosCancelados.forEach(t => {
        const c = t.canal_origen === 'bot' ? 'WhatsApp Bot' : t.canal_origen === 'panel' ? 'Panel Web' : (t.canal_origen || 'Otro')
        porCanal[c] = (porCanal[c] || 0) + 1
      })
      setCancelaciones(Object.entries(porCanal).map(([name, value]) => ({ name, value })))

      // Pacientes nuevos últimos 6 meses
      const meses = []
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(hoy, i)
        const { count } = await supabase.from('pacientes')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', format(startOfMonth(m), 'yyyy-MM-dd'))
          .lte('created_at', format(endOfMonth(m), 'yyyy-MM-dd') + 'T23:59:59')
        meses.push({ mes: format(m, 'MMM yy', { locale: es }), cantidad: count || 0 })
      }
      setPacientesNuevos(meses)

      // Facturación por profesional
      const factProf = {}
      turnosActivos.forEach(t => {
        const p = t.profesionales?.apellido || 'Sin asignar'
        factProf[p] = (factProf[p] || 0) + parseFloat(t.precio || 0)
      })
      setFacturacion(
        Object.entries(factProf)
          .map(([nombre, total]) => ({ nombre, total: Math.round(total) }))
          .sort((a, b) => b.total - a.total)
      )

      // Estados de hoy
      const turnosHoy = todosTurnos.filter(t => t.fecha_turno === fechaHasta)
      const estadosMap = [
        { name: 'Reservado', color: '#3B82F6' },
        { name: 'Confirmado', color: '#10B981' },
        { name: 'Asistido', color: '#059669' },
        { name: 'Ausente', color: '#EF4444' },
        { name: 'Cancelado', color: '#9CA3AF' },
      ].map(e => ({
        ...e,
        value: turnosHoy.filter(t => {
          if (e.name === 'Cancelado') return t.cancelado || t.estado === 'cancelado'
          return t.estado === e.name.toLowerCase() && !t.cancelado
        }).length
      })).filter(e => e.value > 0)
      setEstadosHoy(estadosMap)

      // KPIs
      const totalFacturacion = turnosActivos.reduce((acc, t) => acc + parseFloat(t.precio || 0), 0)
      const asistidos = turnosActivos.filter(t => t.estado === 'asistido').length
      const diasUnicos = Object.keys(porDia).length || 1
      setKpis({
        totalTurnos: turnosActivos.length,
        totalFacturacion: Math.round(totalFacturacion),
        tasaAsistencia: turnosActivos.length > 0 ? Math.round((asistidos / turnosActivos.length) * 100) : 0,
        tasaCancelacion: todosTurnos.length > 0 ? Math.round((turnosCancelados.length / todosTurnos.length) * 100) : 0,
        pacientesNuevosMes: meses[5]?.cantidad || 0,
        promedioTurnosDia: Math.round(turnosActivos.length / diasUnicos),
      })
    } catch (err) {
      console.error(err)
      toast.error('Error cargando reportes')
    }
    setLoading(false)
  }

  function exportarExcel() {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(turnosPorDia), 'Turnos por día')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ocupacion), 'Por profesional')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(facturacion), 'Facturación')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pacientesNuevos), 'Pac. Nuevos')
    XLSX.writeFile(wb, `reporte_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    toast.success('Reporte exportado correctamente')
  }

  const kpiCards = [
    { label: 'Total Turnos', value: kpis.totalTurnos, icon: CalendarDays, gradient: 'from-blue-500 to-blue-600', light: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Facturación', value: `$${kpis.totalFacturacion.toLocaleString('es-AR')}`, icon: TrendingUp, gradient: 'from-emerald-500 to-green-600', light: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'Tasa Asistencia', value: `${kpis.tasaAsistencia}%`, icon: UserCheck, gradient: 'from-teal-500 to-teal-600', light: 'bg-teal-50', text: 'text-teal-600' },
    { label: 'Tasa Cancelación', value: `${kpis.tasaCancelacion}%`, icon: XCircle, gradient: 'from-red-400 to-red-500', light: 'bg-red-50', text: 'text-red-500' },
    { label: 'Pac. Nuevos (mes)', value: kpis.pacientesNuevosMes, icon: Users, gradient: 'from-violet-500 to-purple-600', light: 'bg-violet-50', text: 'text-violet-600' },
    { label: 'Promedio / día', value: kpis.promedioTurnosDia, icon: Activity, gradient: 'from-orange-400 to-amber-500', light: 'bg-amber-50', text: 'text-amber-600' },
  ]

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-56 skeleton rounded-xl"></div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-28 skeleton rounded-2xl"></div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-72 skeleton rounded-2xl"></div>)}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#1B4F72]" />
            Reportes y Analítica
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Métricas del período seleccionado</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-xl p-1">
            {PERIOD_OPTIONS.map(p => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                  periodo === p
                    ? 'bg-white shadow-sm text-[#1B4F72] font-semibold'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button onClick={exportarExcel} className="btn-primary gap-2">
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((card, i) => (
          <div
            key={i}
            className="glass-card p-4 flex flex-col gap-3 animate-fade-in hover:shadow-md transition-all"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-sm`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Fila 1: Turnos por día + Cancelaciones ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Area chart — Turnos por día */}
        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-5">
            <span className="w-3 h-3 rounded-full bg-[#1B4F72] inline-block"></span>
            Turnos por día
          </h3>
          {turnosPorDia.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">Sin datos para este período</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={turnosPorDia} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTurnos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1B4F72" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#1B4F72" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip suffix=" turnos" />} />
                <Area
                  type="monotone"
                  dataKey="cantidad"
                  stroke="#1B4F72"
                  strokeWidth={2.5}
                  fill="url(#gradTurnos)"
                  dot={{ r: 3, fill: '#1B4F72', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#1B4F72' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut — Cancelaciones por canal */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-5">
            <span className="w-3 h-3 rounded-full bg-red-400 inline-block"></span>
            Cancelaciones
          </h3>
          {cancelaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[240px] text-gray-400 text-sm gap-2">
              <CheckCircle2 className="w-10 h-10 text-green-300" />
              Sin cancelaciones en el período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={cancelaciones}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  labelLine={false}
                  label={renderDonutLabel}
                >
                  {cancelaciones.map((_, i) => (
                    <Cell key={i} fill={['#EF4444', '#F97316', '#8B5CF6', '#6B7280'][i % 4]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Fila 2: Por profesional + Pacientes nuevos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Bar horizontal — Turnos por profesional */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-5">
            <span className="w-3 h-3 rounded-full bg-[#1E8449] inline-block"></span>
            Turnos por profesional
          </h3>
          {ocupacion.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, ocupacion.length * 48)}>
              <BarChart data={ocupacion} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="nombre" type="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<ChartTooltip suffix=" turnos" />} />
                <Bar dataKey="turnos" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  {ocupacion.map((_, i) => (
                    <Cell key={i} fill={['#1E8449', '#1B4F72', '#8E44AD', '#E67E22', '#2E86C1', '#E74C3C'][i % 6]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Line chart — Pacientes nuevos por mes */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-5">
            <span className="w-3 h-3 rounded-full bg-violet-500 inline-block"></span>
            Pacientes nuevos / mes
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={pacientesNuevos} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPacientes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip suffix=" pacientes" />} />
              <Area
                type="monotone"
                dataKey="cantidad"
                stroke="#8B5CF6"
                strokeWidth={2.5}
                fill="url(#gradPacientes)"
                dot={{ r: 4, fill: '#8B5CF6', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#8B5CF6' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Fila 3: Facturación por profesional (full width) ── */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
            Facturación por profesional
          </h3>
          <p className="text-sm text-gray-400">
            Total: <span className="font-bold text-gray-700">${kpis.totalFacturacion.toLocaleString('es-AR')}</span>
          </p>
        </div>
        {facturacion.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Sin datos de facturación</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={facturacion} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradFact" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={1} />
                  <stop offset="100%" stopColor="#D97706" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip prefix="$" />} formatter={(v) => [`$${v.toLocaleString('es-AR')}`, 'Total']} />
              <Bar dataKey="total" fill="url(#gradFact)" radius={[6, 6, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  )
}
