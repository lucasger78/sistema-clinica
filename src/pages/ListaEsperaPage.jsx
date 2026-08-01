import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import {
  Plus, Clock, X, Save, Trash2, CalendarPlus, AlertCircle,
  ArrowUp, ArrowDown, User, Search
} from 'lucide-react'

const PRIORIDAD_LABELS = {
  1: { label: 'Urgente', class: 'bg-red-100 text-red-700 border-red-200' },
  2: { label: 'Alta', class: 'bg-orange-100 text-orange-700 border-orange-200' },
  3: { label: 'Media-Alta', class: 'bg-amber-100 text-amber-700 border-amber-200' },
  4: { label: 'Media', class: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  5: { label: 'Normal', class: 'bg-blue-100 text-blue-700 border-blue-200' },
  6: { label: 'Baja', class: 'bg-gray-100 text-gray-600 border-gray-200' },
  7: { label: 'Muy Baja', class: 'bg-gray-50 text-gray-500 border-gray-100' },
}

export default function ListaEsperaPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [profesionales, setProfesionales] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [searchPaciente, setSearchPaciente] = useState('')
  const [pacientesResults, setPacientesResults] = useState([])

  const [form, setForm] = useState({
    paciente_id: null, pacienteNombre: '',
    profesional_id: '', especialidad_id: '',
    prioridad: 5, notas: '',
  })

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: items }, { data: profs }, { data: esps }] = await Promise.all([
      supabase.from('lista_espera').select('*, pacientes(nombre, apellido, dni, telefono), profesionales(nombre, apellido), especialidades(nombre)')
        .eq('estado', 'activa').order('prioridad').order('created_at'),
      supabase.from('profesionales').select('*').eq('activo', true).order('apellido'),
      supabase.from('especialidades').select('*').eq('activo', true).order('nombre'),
    ])
    setItems(items || [])
    setProfesionales(profs || [])
    setEspecialidades(esps || [])
    setLoading(false)
  }

  useEffect(() => {
    if (searchPaciente.length < 2) { setPacientesResults([]); return }
    const timer = setTimeout(async () => {
      const isNum = /^\d+$/.test(searchPaciente)
      let q = supabase.from('pacientes').select('*').limit(5)
      if (isNum) q = q.eq('dni', parseInt(searchPaciente))
      else q = q.or(`nombre.ilike.%${searchPaciente}%,apellido.ilike.%${searchPaciente}%`)
      const { data } = await q
      setPacientesResults(data || [])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchPaciente])

  async function handleSave(e) {
    e.preventDefault()
    if (!form.paciente_id) { toast.error('Seleccioná un paciente'); return }
    try {
      const { error } = await supabase.from('lista_espera').insert({
        paciente_id: form.paciente_id,
        profesional_id: form.profesional_id || null,
        especialidad_id: form.especialidad_id || null,
        prioridad: form.prioridad,
        notas: form.notas || null,
      })
      if (error) throw error
      toast.success('Agregado a lista de espera')
      setShowForm(false)
      setForm({ paciente_id: null, pacienteNombre: '', profesional_id: '', especialidad_id: '', prioridad: 5, notas: '' })
      setSearchPaciente('')
      fetchAll()
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
  }

  async function resolverItem(id) {
    await supabase.from('lista_espera').update({ estado: 'resuelta' }).eq('id', id)
    toast.success('Marcado como resuelto')
    fetchAll()
  }

  async function cancelarItem(id) {
    await supabase.from('lista_espera').update({ estado: 'cancelada' }).eq('id', id)
    toast.success('Cancelado')
    fetchAll()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Lista de Espera</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Agregar</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 skeleton rounded-xl"></div>)}</div>
      ) : items.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay pacientes en lista de espera</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const prio = PRIORIDAD_LABELS[item.prioridad] || PRIORIDAD_LABELS[5]
            return (
              <div key={item.id} className={`glass-card p-4 flex items-center gap-4 animate-fade-in priority-${item.prioridad}`} style={{ animationDelay: `${i * 40}ms` }}>
                <div className={`badge border ${prio.class} min-w-[80px] justify-center`}>
                  {prio.label}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">
                    {item.pacientes?.nombre} {item.pacientes?.apellido || ''}
                    <span className="text-gray-400 text-sm ml-2">DNI: {item.pacientes?.dni}</span>
                  </p>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    {item.profesionales && <span>Dr. {item.profesionales.apellido}</span>}
                    {item.especialidades && <span>{item.especialidades.nombre}</span>}
                    {item.notas && <span className="truncate max-w-[200px]">{item.notas}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => resolverItem(item.id)} className="p-2 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600" title="Ofrecer turno">
                    <CalendarPlus className="w-4 h-4" />
                  </button>
                  <button onClick={() => cancelarItem(item.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" title="Cancelar">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Formulario */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content w-full max-w-lg p-6 m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Agregar a Lista de Espera</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Buscar paciente */}
              <div className="form-group">
                <label className="form-label">Paciente *</label>
                {form.paciente_id ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <span className="font-medium text-green-800">{form.pacienteNombre}</span>
                    <button type="button" onClick={() => setForm({...form, paciente_id: null, pacienteNombre: ''})} className="text-green-600"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" className="form-input pl-9" placeholder="Buscar por nombre o DNI..." value={searchPaciente} onChange={e => setSearchPaciente(e.target.value)} />
                    </div>
                    {pacientesResults.length > 0 && (
                      <div className="mt-1 border rounded-lg max-h-40 overflow-y-auto">
                        {pacientesResults.map(p => (
                          <button key={p.id} type="button" onClick={() => { setForm({...form, paciente_id: p.id, pacienteNombre: `${p.nombre} ${p.apellido || ''} (DNI: ${p.dni})`}); setPacientesResults([]) }}
                            className="w-full text-left p-2 hover:bg-blue-50 text-sm">
                            {p.nombre} {p.apellido || ''} — DNI: {p.dni}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Profesional</label>
                  <select className="form-input" value={form.profesional_id} onChange={e => setForm({...form, profesional_id: e.target.value})}>
                    <option value="">Cualquiera</option>
                    {profesionales.map(p => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Especialidad</label>
                  <select className="form-input" value={form.especialidad_id} onChange={e => setForm({...form, especialidad_id: e.target.value})}>
                    <option value="">Cualquiera</option>
                    {especialidades.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Prioridad</label>
                <select className="form-input" value={form.prioridad} onChange={e => setForm({...form, prioridad: parseInt(e.target.value)})}>
                  {Object.entries(PRIORIDAD_LABELS).map(([val, info]) => (
                    <option key={val} value={val}>{info.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-input" rows={2} value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} placeholder="Preferencia horaria, motivo, etc." />
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
