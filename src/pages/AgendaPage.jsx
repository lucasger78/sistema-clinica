import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { format, addDays, startOfWeek, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, CalendarDays, List, Eye, X, User,
  Clock, Edit2, CheckCircle, XCircle, UserX, AlertCircle, Plus
} from 'lucide-react'

const ESTADO_OPTIONS = [
  { value: 'reservado', label: 'Reservado' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'asistido', label: 'Asistido' },
  { value: 'ausente', label: 'Ausente' },
  { value: 'cancelado', label: 'Cancelado' },
]

export default function AgendaPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [vista, setVista] = useState(searchParams.get('vista') || 'diaria')
  const [fecha, setFecha] = useState(searchParams.get('fecha') || format(new Date(), 'yyyy-MM-dd'))
  const [profesionales, setProfesionales] = useState([])
  const [profSeleccionado, setProfSeleccionado] = useState(searchParams.get('profesional') || 'todos')
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [turnoDetalle, setTurnoDetalle] = useState(null)
  const [editingEstado, setEditingEstado] = useState(null)

  useEffect(() => {
    supabase.from('profesionales').select('*').eq('activo', true).order('apellido')
      .then(({ data }) => setProfesionales(data || []))
  }, [])

  useEffect(() => {
    fetchTurnos()
    // Sync URL with state
    setSearchParams({ vista, profesional: profSeleccionado, fecha })
  }, [fecha, profSeleccionado, vista])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('turnos-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'turnos'
      }, () => fetchTurnos())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fecha, vista, profSeleccionado])

  async function fetchTurnos() {
    setLoading(true)
    let query = supabase
      .from('turnos')
      .select('*, profesionales(nombre, apellido)')
      .order('hora')

    if (vista === 'mensual') {
      const inicio = startOfMonth(parseISO(fecha))
      const fin = endOfMonth(parseISO(fecha))
      query = query.gte('fecha_turno', format(inicio, 'yyyy-MM-dd')).lte('fecha_turno', format(fin, 'yyyy-MM-dd'))
    } else if (vista === 'semanal') {
      const inicio = startOfWeek(parseISO(fecha), { weekStartsOn: 1 })
      const fin = addDays(inicio, 6)
      query = query.gte('fecha_turno', format(inicio, 'yyyy-MM-dd')).lte('fecha_turno', format(fin, 'yyyy-MM-dd'))
    } else {
      query = query.eq('fecha_turno', fecha)
    }

    if (profSeleccionado !== 'todos') {
      query = query.eq('profesional_id', profSeleccionado)
    }

    const { data, error } = await query
    if (error) toast.error('Error cargando turnos')
    setTurnos(data || [])
    setLoading(false)
  }

  async function cambiarEstado(turnoId, nuevoEstado) {
    try {
      const updates = { estado: nuevoEstado }
      if (nuevoEstado === 'cancelado') updates.cancelado = true
      const { error } = await supabase.from('turnos').update(updates).eq('id', turnoId)
      if (error) throw error
      toast.success(`Turno marcado como ${nuevoEstado}`)
      setTurnoDetalle(null)
      fetchTurnos()
    } catch (err) {
      toast.error('Error al cambiar estado')
    }
  }

  async function cambiarProfesional(turnoId, nuevoProfId) {
    try {
      const dbValue = nuevoProfId === 'none' ? null : nuevoProfId
      const { error } = await supabase.from('turnos').update({ profesional_id: dbValue }).eq('id', turnoId)
      if (error) throw error
      toast.success('Profesional asignado correctamente')
      setTurnoDetalle(null)
      fetchTurnos()
    } catch (err) {
      toast.error('Error al reasignar profesional')
    }
  }

  function navegarFecha(dir) {
    const d = parseISO(fecha)
    const nueva = addDays(d, dir)
    setFecha(format(nueva, 'yyyy-MM-dd'))
  }

  const fechaLabel = format(parseISO(fecha), "EEEE d 'de' MMMM yyyy", { locale: es })

  // Generar horas para vista
  const horas = []
  for (let h = 7; h <= 21; h++) {
    horas.push(`${String(h).padStart(2, '0')}:00`)
    horas.push(`${String(h).padStart(2, '0')}:30`)
  }

  function getTurnoEnSlot(hora, profId, diaStr) {
    return turnos.find(t => {
      if (t.fecha_turno !== diaStr) return false;
      if (profId && t.profesional_id !== profId) return false;
      
      const hT = t.hora?.slice(0, 5);
      if (!hT) return false;
      
      const [h1, m1] = hora.split(':').map(Number);
      const [h2, m2] = hT.split(':').map(Number);
      const minBtn = h1 * 60 + m1;
      const minT = h2 * 60 + m2;
      return minT >= minBtn && minT < minBtn + 30;
    })
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Agenda</h1>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/turnos/nuevo')} 
            className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Nuevo Turno
          </button>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setVista('diaria')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${vista === 'diaria' ? 'bg-white shadow-sm text-[#1B4F72]' : 'text-gray-500'}`}>
              <List className="w-4 h-4 inline mr-1" /> Diaria
            </button>
            <button onClick={() => setVista('semanal')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${vista === 'semanal' ? 'bg-white shadow-sm text-[#1B4F72]' : 'text-gray-500'}`}>
              <CalendarDays className="w-4 h-4 inline mr-1" /> Semanal
            </button>
            <button onClick={() => setVista('mensual')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${vista === 'mensual' ? 'bg-white shadow-sm text-[#1B4F72]' : 'text-gray-500'}`}>
              <CalendarDays className="w-4 h-4 inline mr-1" /> Mensual
            </button>
          </div>
        </div>
      </div>

      {/* Controles de fecha y filtro */}
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navegarFecha(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-5 h-5" /></button>
          <div className="text-center">
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="form-input text-sm" />
            <p className="text-xs text-gray-500 mt-1 capitalize">{fechaLabel}</p>
          </div>
          <button onClick={() => navegarFecha(1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight className="w-5 h-5" /></button>
          <button onClick={() => setFecha(format(new Date(), 'yyyy-MM-dd'))} className="btn-secondary text-sm py-1.5">Hoy</button>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Profesional:</label>
          <select className="form-input text-sm" value={profSeleccionado} onChange={e => setProfSeleccionado(e.target.value)}>
            <option value="todos">Todos</option>
            {profesionales.map(p => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>)}
          </select>
        </div>
      </div>

      {/* Vista diaria */}
      {vista === 'diaria' && (
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-14 skeleton rounded"></div>)}</div>
          ) : turnos.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay turnos para esta fecha</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {turnos.map((turno, i) => (
                <div
                  key={turno.id}
                  onClick={() => setTurnoDetalle(turno)}
                  className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50/80 transition-all ${
                    turno.es_sobreturno ? 'sobreturno-border' : ''
                  } ${turno.estado === 'cancelado' ? 'opacity-50' : ''}`}
                >
                  <div className="text-center min-w-[60px]">
                    <p className="text-lg font-bold text-[#1B4F72]">{turno.hora?.slice(0, 5)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {turno.nombre}
                      {turno.es_sobreturno && <span className="sobreturno-badge ml-2">ST</span>}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{turno.servicios || 'Consulta'}</span>
                      {turno.profesionales && (
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> Dr. {turno.profesionales.apellido}</span>
                      )}
                      {turno.canal_origen && turno.canal_origen !== 'panel' && (
                        <span className="bg-purple-50 text-purple-600 text-xs px-2 py-0.5 rounded">{turno.canal_origen}</span>
                      )}
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
      )}

      {/* Vista semanal */}
      {vista === 'semanal' && (
        <div className="glass-card overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-[80px_repeat(6,1fr)] border-b">
              <div className="p-3 bg-gray-50 text-xs font-medium text-gray-500">Hora</div>
              {[1, 2, 3, 4, 5, 6].map(dayOffset => {
                const inicio = startOfWeek(parseISO(fecha), { weekStartsOn: 1 })
                const dia = addDays(inicio, dayOffset - 1)
                const diaStr = format(dia, 'yyyy-MM-dd')
                const isHoy = diaStr === format(new Date(), 'yyyy-MM-dd')
                return (
                  <div key={dayOffset} className={`p-3 text-center text-sm font-medium ${isHoy ? 'bg-blue-50 text-[#1B4F72]' : 'bg-gray-50 text-gray-600'}`}>
                    <div className="capitalize">{format(dia, 'EEE', { locale: es })}</div>
                    <div className="text-lg font-bold">{format(dia, 'd')}</div>
                  </div>
                )
              })}
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {horas.filter((_, i) => i % 2 === 0).map(hora => (
                <div key={hora} className="grid grid-cols-[80px_repeat(6,1fr)] border-b border-gray-50">
                  <div className="p-2 text-xs text-gray-400 text-right pr-3 pt-3">{hora}</div>
                  {[1, 2, 3, 4, 5, 6].map(dayOffset => {
                    const inicio = startOfWeek(parseISO(fecha), { weekStartsOn: 1 })
                    const dia = addDays(inicio, dayOffset - 1)
                    const diaStr = format(dia, 'yyyy-MM-dd')
                    const turnoEnSlot = getTurnoEnSlot(hora, null, diaStr)
                    return (
                      <div 
                        key={dayOffset} 
                        className="p-1 min-h-[48px] border-l border-gray-50 relative group transition-colors cursor-pointer hover:bg-green-50/30"
                        onClick={(e) => {
                          if (e.target === e.currentTarget && !turnoEnSlot) {
                            const q = profSeleccionado !== 'todos' ? `?profesional=${profSeleccionado}&fecha=${diaStr}&hora=${hora}` : `?fecha=${diaStr}&hora=${hora}`
                            navigate(`/turnos/nuevo${q}`)
                          }
                        }}
                      >
                        {turnoEnSlot && (
                          <div
                            onClick={(e) => { e.stopPropagation(); setTurnoDetalle(turnoEnSlot); }}
                            className={`text-xs p-1.5 rounded cursor-pointer truncate ${
                              turnoEnSlot.cancelado || turnoEnSlot.estado === 'cancelado'
                                ? 'bg-gray-50 border border-gray-200 text-gray-400 opacity-60 line-through'
                                : turnoEnSlot.es_sobreturno
                                ? 'bg-orange-50 border border-orange-300 text-orange-800'
                                : 'bg-blue-50 border border-blue-200 text-blue-800'
                            }`}
                          >
                            {turnoEnSlot.nombre?.split(' ')[0]}
                            {turnoEnSlot.es_sobreturno && <span className="sobreturno-badge ml-1 text-[0.6rem]">ST</span>}
                          </div>
                        )}
                        {!turnoEnSlot && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Plus className="w-4 h-4 text-green-600" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Vista mensual */}
      {vista === 'mensual' && (
        <div className="glass-card overflow-x-auto">
          <div className="min-w-[1200px]">
            <div className="grid grid-cols-[100px_repeat(16,1fr)] border-b bg-gray-50">
                <div className="p-3 bg-gray-100 text-xs font-bold text-gray-600 border-r sticky left-0 z-10 text-center">Día</div>
                {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'].map(hora => (
                  <div key={hora} className="p-2 text-center text-xs font-bold text-gray-600 uppercase">
                    {hora}
                  </div>
                ))}
              </div>
              <div className="max-h-[600px] overflow-y-auto pb-4">
                {eachDayOfInterval({ start: startOfMonth(parseISO(fecha)), end: endOfMonth(parseISO(fecha)) }).map(dia => {
                  const diaStr = format(dia, 'yyyy-MM-dd')
                  const isHoy = diaStr === format(new Date(), 'yyyy-MM-dd')
                  const esFinde = dia.getDay() === 0 || dia.getDay() === 6
                  return (
                    <div key={diaStr} className={`grid grid-cols-[100px_repeat(16,1fr)] border-b border-gray-100 hover:bg-gray-50/50 ${esFinde ? 'bg-gray-50/50' : ''}`}>
                      <div className={`p-2 border-r sticky left-0 z-10 flex flex-col justify-center items-center ${isHoy ? 'bg-blue-50 text-[#1B4F72] border-blue-200' : 'bg-white text-gray-600'}`}>
                        <span className="text-xs uppercase font-medium">{format(dia, 'EEE', { locale: es })}</span>
                        <span className="text-lg font-bold">{format(dia, 'd')}</span>
                      </div>
                      
                      {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'].map(hora => {
                        const turnoEnSlot = getTurnoEnSlot(hora, null, diaStr)
                        return (
                          <div 
                            key={`${diaStr}-${hora}`} 
                            className="p-1 min-h-[50px] border-r border-gray-50 relative group cursor-pointer hover:bg-green-50/30 transition-colors"
                            onClick={(e) => {
                              if (e.target === e.currentTarget && !turnoEnSlot) {
                                const q = profSeleccionado !== 'todos' ? `?profesional=${profSeleccionado}&fecha=${diaStr}&hora=${hora}` : `?fecha=${diaStr}&hora=${hora}`
                                navigate(`/turnos/nuevo${q}`)
                              }
                            }}
                          >
                            {turnoEnSlot && (
                              <div
                                onClick={(e) => { e.stopPropagation(); setTurnoDetalle(turnoEnSlot); }}
                                className={`w-full h-full text-[0.65rem] leading-tight p-1 rounded cursor-pointer overflow-hidden flex flex-col justify-center ${
                                  turnoEnSlot.cancelado || turnoEnSlot.estado === 'cancelado'
                                    ? 'bg-gray-100 border border-gray-200 text-gray-400 opacity-60 line-through'
                                    : turnoEnSlot.es_sobreturno
                                    ? 'bg-orange-100 border border-orange-300 text-orange-900 shadow-sm'
                                    : 'bg-blue-100 border border-blue-200 text-blue-900 shadow-sm hover:shadow-md transition-all'
                                }`}
                                title={turnoEnSlot.nombre}
                              >
                                <span>{turnoEnSlot.nombre?.split(' ')[0]}</span>
                                {turnoEnSlot.es_sobreturno && <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></span>}
                              </div>
                            )}
                            {!turnoEnSlot && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                <Plus className="w-3 h-3 text-green-600" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
        </div>
      )}

      {/* Modal Detalle Turno */}
      {turnoDetalle && (
        <div className="modal-overlay" onClick={() => setTurnoDetalle(null)}>
          <div className="modal-content w-full max-w-md p-6 m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Detalle del Turno</h2>
              <button onClick={() => setTurnoDetalle(null)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="w-5 h-5 text-[#1B4F72]" />
                <div>
                  <p className="font-bold text-lg">{turnoDetalle.hora?.slice(0, 5)}</p>
                  <p className="text-sm text-gray-500">{turnoDetalle.fecha_turno}</p>
                </div>
                {turnoDetalle.es_sobreturno && <span className="sobreturno-badge ml-auto">SOBRETURNO</span>}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Paciente</span><p className="font-medium">{turnoDetalle.nombre}</p></div>
                <div><span className="text-gray-500">DNI</span><p className="font-medium">{turnoDetalle.dni}</p></div>
                <div><span className="text-gray-500">Servicio</span><p>{turnoDetalle.servicios || 'Consulta'}</p></div>
                <div><span className="text-gray-500">Precio</span><p>${turnoDetalle.precio || '—'}</p></div>
                <div><span className="text-gray-500">Canal</span><p className="capitalize">{turnoDetalle.canal_origen || 'bot'}</p></div>
                <div><span className="text-gray-500">Estado</span><p><span className={`badge badge-${turnoDetalle.cancelado ? 'cancelado' : (turnoDetalle.estado || 'reservado')}`}>{turnoDetalle.cancelado ? 'cancelado' : (turnoDetalle.estado || 'reservado')}</span></p></div>
                
                <div className="col-span-2 mt-2">
                  <span className="text-gray-500 text-xs mb-1 block">Profesional Asignado</span>
                  <select 
                    className="form-input text-sm py-1.5 w-full bg-white border-gray-200"
                    value={turnoDetalle.profesional_id || 'none'}
                    onChange={(e) => cambiarProfesional(turnoDetalle.id, e.target.value)}
                  >
                    <option value="none">⚠️ Sin profesional asignado</option>
                    {profesionales.map(p => (
                      <option key={p.id} value={p.id}>Dr. {p.apellido}, {p.nombre}</option>
                    ))}
                  </select>
                </div>

                {turnoDetalle.motivo_sobreturno && (
                  <div className="col-span-2 pt-2"><span className="text-gray-500">Motivo sobreturno</span><p className="text-orange-700">{turnoDetalle.motivo_sobreturno}</p></div>
                )}
                {turnoDetalle.observaciones && (
                  <div className="col-span-2"><span className="text-gray-500">Observaciones</span><p>{turnoDetalle.observaciones}</p></div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-500 mb-3">Cambiar estado:</p>
              <div className="flex flex-wrap gap-2">
                {ESTADO_OPTIONS.filter(e => e.value !== turnoDetalle.estado).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => cambiarEstado(turnoDetalle.id, opt.value)}
                    className={`badge cursor-pointer hover:opacity-80 transition badge-${opt.value} px-3 py-1.5`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
