import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Plus, Edit2, X, Save, Trash2, UserCog, Clock, Calendar,
  Shield, CheckCircle, XCircle, ChevronDown, ChevronUp
} from 'lucide-react'

export default function ProfesionalesPage() {
  const navigate = useNavigate()
  const [profesionales, setProfesionales] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [reglas, setReglas] = useState([])
  const [bloqueos, setBloqueos] = useState([])
  const [showReglaForm, setShowReglaForm] = useState(false)
  const [showBloqueoForm, setShowBloqueoForm] = useState(false)

  const [form, setForm] = useState({
    nombre: '', apellido: '', especialidad: '', matricula: '',
    modalidad: 'presencial', duracion_slot: 30, permite_sobreturnos: false, activo: true,
  })

  const [reglaForm, setReglaForm] = useState({
    dia_semana: 1, hora_inicio: '08:00', hora_fin: '17:00', duracion_slot: 30, buffer_minutos: 0,
  })

  const [bloqueoForm, setBloqueoForm] = useState({
    fecha_inicio: '', fecha_fin: '', motivo: '',
  })

  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

  useEffect(() => { fetchProfesionales() }, [])

  async function fetchProfesionales() {
    setLoading(true)
    const { data, error } = await supabase.from('profesionales').select('*').order('apellido')
    if (error) toast.error('Error cargando profesionales')
    setProfesionales(data || [])
    setLoading(false)
  }

  async function fetchAgendaConfig(profId) {
    const [{ data: r }, { data: b }] = await Promise.all([
      supabase.from('agenda_reglas').select('*').eq('profesional_id', profId).eq('activo', true).order('dia_semana'),
      supabase.from('agenda_bloqueos').select('*').eq('profesional_id', profId).order('fecha_inicio', { ascending: false }),
    ])
    setReglas(r || [])
    setBloqueos(b || [])
  }

  function toggleExpand(profId) {
    if (expandedId === profId) {
      setExpandedId(null)
    } else {
      setExpandedId(profId)
      fetchAgendaConfig(profId)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm({ nombre: '', apellido: '', especialidad: '', matricula: '', modalidad: 'presencial', duracion_slot: 30, permite_sobreturnos: false, activo: true })
    setShowForm(true)
  }

  function openEdit(prof) {
    setEditing(prof)
    setForm({
      nombre: prof.nombre, apellido: prof.apellido, especialidad: prof.especialidad || '',
      matricula: prof.matricula || '', modalidad: prof.modalidad || 'presencial',
      duracion_slot: prof.duracion_slot || 30, permite_sobreturnos: prof.permite_sobreturnos || false, activo: prof.activo,
    })
    setShowForm(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    try {
      if (editing) {
        const { error } = await supabase.from('profesionales').update(form).eq('id', editing.id)
        if (error) throw error
        toast.success('Profesional actualizado')
      } else {
        const { error } = await supabase.from('profesionales').insert(form)
        if (error) throw error
        toast.success('Profesional creado')
      }
      setShowForm(false)
      fetchProfesionales()
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
  }

  async function saveRegla(e) {
    e.preventDefault()
    try {
      const { error } = await supabase.from('agenda_reglas').insert({
        ...reglaForm, profesional_id: expandedId
      })
      if (error) throw error
      toast.success('Regla de agenda agregada')
      setShowReglaForm(false)
      setReglaForm({ dia_semana: 1, hora_inicio: '08:00', hora_fin: '17:00', duracion_slot: 30, buffer_minutos: 0 })
      fetchAgendaConfig(expandedId)
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
  }

  async function deleteRegla(id) {
    if (!confirm('¿Eliminar esta regla de agenda?')) return
    await supabase.from('agenda_reglas').delete().eq('id', id)
    toast.success('Regla eliminada')
    fetchAgendaConfig(expandedId)
  }

  async function saveBloqueo(e) {
    e.preventDefault()
    try {
      const { error } = await supabase.from('agenda_bloqueos').insert({
        ...bloqueoForm, profesional_id: expandedId,
      })
      if (error) throw error
      toast.success('Bloqueo agregado')
      setShowBloqueoForm(false)
      setBloqueoForm({ fecha_inicio: '', fecha_fin: '', motivo: '' })
      fetchAgendaConfig(expandedId)
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
  }

  async function deleteBloqueo(id) {
    if (!confirm('¿Eliminar este bloqueo?')) return
    await supabase.from('agenda_bloqueos').delete().eq('id', id)
    toast.success('Bloqueo eliminado')
    fetchAgendaConfig(expandedId)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Profesionales</h1>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nuevo Profesional</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 skeleton rounded-xl"></div>)}</div>
      ) : profesionales.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-400">
          <UserCog className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay profesionales registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profesionales.map(prof => (
            <div key={prof.id} className="glass-card overflow-hidden">
              <div className="flex items-center justify-between p-5 cursor-pointer" onClick={() => toggleExpand(prof.id)}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${prof.activo ? 'bg-[#1B4F72]' : 'bg-gray-400'}`}>
                    {prof.nombre[0]}{prof.apellido[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{prof.apellido}, {prof.nombre}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      {prof.especialidad && <span>{prof.especialidad}</span>}
                      {prof.matricula && <span>Mat: {prof.matricula}</span>}
                      <span className={`badge ${prof.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {prof.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      {prof.permite_sobreturnos && <span className="sobreturno-badge">ST</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(prof); }} className="p-2 rounded hover:bg-gray-100 text-gray-500">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {expandedId === prof.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </div>

              {/* Config de agenda expandida */}
              {expandedId === prof.id && (
                <div className="border-t border-gray-100 p-5 bg-gray-50/50 animate-fade-in">
                  <div className="flex justify-end mb-4">
                    <button onClick={() => navigate(`/agenda?profesional=${prof.id}&vista=mensual`)} className="btn-secondary text-sm flex items-center gap-2">
                       <Calendar className="w-4 h-4" /> Ver Agenda Mensual
                    </button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Reglas de agenda */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Calendar className="w-4 h-4" /> Horarios de atención</h3>
                        <button onClick={() => setShowReglaForm(!showReglaForm)} className="text-sm text-[#1B4F72] hover:underline flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5" /> Agregar
                        </button>
                      </div>

                      {showReglaForm && (
                        <form onSubmit={saveRegla} className="bg-white p-4 rounded-lg border mb-3 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="form-group">
                              <label className="form-label">Día</label>
                              <select className="form-input" value={reglaForm.dia_semana} onChange={e => setReglaForm({...reglaForm, dia_semana: parseInt(e.target.value)})}>
                                {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Duración slot</label>
                              <select className="form-input" value={reglaForm.duracion_slot} onChange={e => setReglaForm({...reglaForm, duracion_slot: parseInt(e.target.value)})}>
                                <option value={15}>15 min</option>
                                <option value={20}>20 min</option>
                                <option value={30}>30 min</option>
                                <option value={45}>45 min</option>
                                <option value={60}>60 min</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Hora inicio</label>
                              <input type="time" className="form-input" value={reglaForm.hora_inicio} onChange={e => setReglaForm({...reglaForm, hora_inicio: e.target.value})} required />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Hora fin</label>
                              <input type="time" className="form-input" value={reglaForm.hora_fin} onChange={e => setReglaForm({...reglaForm, hora_fin: e.target.value})} required />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button type="submit" className="btn-primary text-sm py-1.5"><Save className="w-3.5 h-3.5" /> Guardar</button>
                            <button type="button" onClick={() => setShowReglaForm(false)} className="btn-secondary text-sm py-1.5">Cancelar</button>
                          </div>
                        </form>
                      )}

                      {reglas.length === 0 ? (
                        <p className="text-sm text-gray-400">Sin horarios configurados</p>
                      ) : (
                        <div className="space-y-2">
                          {reglas.map(r => (
                            <div key={r.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 text-sm">
                              <div>
                                <span className="font-medium">{DIAS[r.dia_semana]}</span>
                                <span className="text-gray-400 mx-2">|</span>
                                <span>{r.hora_inicio?.slice(0,5)} - {r.hora_fin?.slice(0,5)}</span>
                                <span className="text-gray-400 mx-2">|</span>
                                <span className="text-gray-500">{r.duracion_slot} min</span>
                              </div>
                              <button onClick={() => deleteRegla(r.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bloqueos */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Shield className="w-4 h-4" /> Bloqueos</h3>
                        <button onClick={() => setShowBloqueoForm(!showBloqueoForm)} className="text-sm text-[#1B4F72] hover:underline flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5" /> Agregar
                        </button>
                      </div>

                      {showBloqueoForm && (
                        <form onSubmit={saveBloqueo} className="bg-white p-4 rounded-lg border mb-3 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="form-group">
                              <label className="form-label">Desde</label>
                              <input type="datetime-local" className="form-input" value={bloqueoForm.fecha_inicio} onChange={e => setBloqueoForm({...bloqueoForm, fecha_inicio: e.target.value})} required />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Hasta</label>
                              <input type="datetime-local" className="form-input" value={bloqueoForm.fecha_fin} onChange={e => setBloqueoForm({...bloqueoForm, fecha_fin: e.target.value})} required />
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Motivo</label>
                            <input type="text" className="form-input" value={bloqueoForm.motivo} onChange={e => setBloqueoForm({...bloqueoForm, motivo: e.target.value})} placeholder="Vacaciones, congreso, etc." />
                          </div>
                          <div className="flex gap-2">
                            <button type="submit" className="btn-primary text-sm py-1.5"><Save className="w-3.5 h-3.5" /> Guardar</button>
                            <button type="button" onClick={() => setShowBloqueoForm(false)} className="btn-secondary text-sm py-1.5">Cancelar</button>
                          </div>
                        </form>
                      )}

                      {bloqueos.length === 0 ? (
                        <p className="text-sm text-gray-400">Sin bloqueos activos</p>
                      ) : (
                        <div className="space-y-2">
                          {bloqueos.map(b => (
                            <div key={b.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-red-100 text-sm">
                              <div>
                                <p className="font-medium text-red-700">{b.motivo || 'Bloqueo'}</p>
                                <p className="text-gray-500 text-xs mt-0.5">
                                  {b.fecha_inicio?.slice(0, 16).replace('T', ' ')} → {b.fecha_fin?.slice(0, 16).replace('T', ' ')}
                                </p>
                              </div>
                              <button onClick={() => deleteBloqueo(b.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Formulario Profesional */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content w-full max-w-lg p-6 m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">{editing ? 'Editar Profesional' : 'Nuevo Profesional'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input type="text" className="form-input" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido *</label>
                  <input type="text" className="form-input" value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Especialidad</label>
                  <input type="text" className="form-input" value={form.especialidad} onChange={e => setForm({...form, especialidad: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Matrícula</label>
                  <input type="text" className="form-input" value={form.matricula} onChange={e => setForm({...form, matricula: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Modalidad</label>
                  <select className="form-input" value={form.modalidad} onChange={e => setForm({...form, modalidad: e.target.value})}>
                    <option value="presencial">Presencial</option>
                    <option value="virtual">Virtual</option>
                    <option value="ambas">Ambas</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Duración slot (min)</label>
                  <select className="form-input" value={form.duracion_slot} onChange={e => setForm({...form, duracion_slot: parseInt(e.target.value)})}>
                    <option value={15}>15</option><option value={20}>20</option><option value={30}>30</option><option value={45}>45</option><option value={60}>60</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.permite_sobreturnos} onChange={e => setForm({...form, permite_sobreturnos: e.target.checked})} className="w-4 h-4 rounded" />
                  Permite sobreturnos
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.activo} onChange={e => setForm({...form, activo: e.target.checked})} className="w-4 h-4 rounded" />
                  Activo
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary"><Save className="w-4 h-4" /> Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
