import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'
import * as XLSX from 'xlsx'
import { Download, BarChart3, TrendingUp, Calendar } from 'lucide-react'

const COLORS = ['#1B4F72', '#1E8449', '#E67E22', '#E74C3C', '#8E44AD', '#2E86C1']

export default function ReportesPage() {
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')
  const [turnosPorDia, setTurnosPorDia] = useState([])
  const [ocupacion, setOcupacion] = useState([])
  const [cancelaciones, setCancelaciones] = useState([])
  const [pacientesNuevos, setPacientesNuevos] = useState([])
  const [facturacion, setFacturacion] = useState([])

  useEffect(() => { fetchReportes() }, [periodo])

  async function fetchReportes() {
    setLoading(true)
    try {
      const hoy = new Date()
      let fechaDesde
      if (periodo === 'semana') fechaDesde = format(subDays(hoy, 7), 'yyyy-MM-dd')
      else if (periodo === 'mes') fechaDesde = format(startOfMonth(hoy), 'yyyy-MM-dd')
      else fechaDesde = format(subMonths(hoy, 3), 'yyyy-MM-dd')

      const { data: turnos } = await supabase.from('turnos')
        .select('fecha_turno, estado, canal_origen, profesional_id, profesionales(apellido), precio')
        .gte('fecha_turno', fechaDesde).lte('fecha_turno', format(hoy, 'yyyy-MM-dd')).eq('cancelado', false)

      const porDia = {}
      ;(turnos || []).forEach(t => { porDia[t.fecha_turno] = (porDia[t.fecha_turno] || 0) + 1 })
      setTurnosPorDia(Object.entries(porDia).map(([fecha, cantidad]) => ({ fecha: fecha.slice(5), cantidad })).slice(-30))

      const porProf = {}
      ;(turnos || []).forEach(t => { const p = t.profesionales?.apellido || 'N/A'; porProf[p] = (porProf[p] || 0) + 1 })
      setOcupacion(Object.entries(porProf).map(([nombre, turnos]) => ({ nombre, turnos })))

      const { data: cancelados } = await supabase.from('turnos').select('canal_origen')
        .gte('fecha_turno', fechaDesde).eq('cancelado', true)
      const porCanal = {}
      ;(cancelados || []).forEach(t => { const c = t.canal_origen || 'bot'; porCanal[c] = (porCanal[c] || 0) + 1 })
      setCancelaciones(Object.entries(porCanal).map(([name, value]) => ({ name, value })))

      const meses = []
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(hoy, i)
        const { count } = await supabase.from('pacientes').select('*', { count: 'exact', head: true })
          .gte('created_at', format(startOfMonth(m), 'yyyy-MM-dd')).lte('created_at', format(endOfMonth(m), 'yyyy-MM-dd') + 'T23:59:59')
        meses.push({ mes: format(m, 'MMM yy'), cantidad: count || 0 })
      }
      setPacientesNuevos(meses)

      const factProf = {}
      ;(turnos || []).forEach(t => { const p = t.profesionales?.apellido || 'N/A'; factProf[p] = (factProf[p] || 0) + parseFloat(t.precio || 0) })
      setFacturacion(Object.entries(factProf).map(([nombre, total]) => ({ nombre, total })))
    } catch (err) { toast.error('Error cargando reportes') }
    setLoading(false)
  }

  function exportarExcel() {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(turnosPorDia), 'Turnos')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ocupacion), 'Ocupación')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(facturacion), 'Facturación')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pacientesNuevos), 'Pac Nuevos')
    XLSX.writeFile(wb, `reporte_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    toast.success('Reporte exportado')
  }

  if (loading) return <div className="space-y-6"><div className="h-8 w-48 skeleton"></div><div className="grid grid-cols-2 gap-6">{[...Array(4)].map((_,i) => <div key={i} className="h-72 skeleton rounded-xl"></div>)}</div></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {['semana','mes','trimestre'].map(p => (
              <button key={p} onClick={() => setPeriodo(p)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition capitalize ${periodo === p ? 'bg-white shadow-sm text-[#1B4F72]' : 'text-gray-500'}`}>{p}</button>
            ))}
          </div>
          <button onClick={exportarExcel} className="btn-primary"><Download className="w-4 h-4" /> Excel</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-[#1B4F72]" /> Turnos por día</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={turnosPorDia}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="fecha" tick={{fontSize:11}} /><YAxis tick={{fontSize:11}} /><Tooltip /><Bar dataKey="cantidad" fill="#1B4F72" radius={[4,4,0,0]} /></BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-semibold text-gray-700 mb-4">Cancelaciones por canal</h3>
          {cancelaciones.length === 0 ? <div className="flex items-center justify-center h-[250px] text-gray-400">Sin cancelaciones</div> : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart><Pie data={cancelaciones} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,value}) => `${name}: ${value}`}>
                {cancelaciones.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Legend /><Tooltip /></PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-6">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-4"><Calendar className="w-5 h-5 text-[#1E8449]" /> Turnos por profesional</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ocupacion} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis type="number" tick={{fontSize:11}} /><YAxis dataKey="nombre" type="category" tick={{fontSize:11}} width={100} /><Tooltip /><Bar dataKey="turnos" fill="#1E8449" radius={[0,4,4,0]} /></BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-4"><TrendingUp className="w-5 h-5 text-[#8E44AD]" /> Pacientes nuevos / mes</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={pacientesNuevos}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="mes" tick={{fontSize:11}} /><YAxis tick={{fontSize:11}} /><Tooltip /><Line type="monotone" dataKey="cantidad" stroke="#8E44AD" strokeWidth={2} dot={{r:4}} /></LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="font-semibold text-gray-700 mb-4">Facturación por profesional</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={facturacion}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="nombre" tick={{fontSize:11}} /><YAxis tick={{fontSize:11}} /><Tooltip formatter={(v) => [`$${v.toLocaleString()}`,'Total']} /><Bar dataKey="total" fill="#E67E22" radius={[4,4,0,0]} /></BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
