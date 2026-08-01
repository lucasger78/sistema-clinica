import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Search, Plus, Edit2, Eye, FileText, X, Save,
  User, Phone, Mail, MapPin, Shield, AlertCircle, Check
} from 'lucide-react'

// Debounce helper
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const ESTADO_COLORS = {
  activo: 'bg-green-100 text-green-700',
  inactivo: 'bg-gray-100 text-gray-600',
  restringido: 'bg-red-100 text-red-700',
}

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingPaciente, setEditingPaciente] = useState(null)
  const [showDetail, setShowDetail] = useState(null)
  const [turnosHistorial, setTurnosHistorial] = useState([])
  const [coberturas, setCoberturas] = useState([])
  const debouncedSearch = useDebounce(search, 300)

  const [form, setForm] = useState({
    dni: '', nombre: '', apellido: '', email: '', telefono: '',
    fecha_nacimiento: '', sexo: '', localidad: '', domicilio: '',
    cobertura_id: '', nro_afiliado: '', observaciones: '',
    acepta_comunicaciones: true, estado: 'activo'
  })

  useEffect(() => {
    fetchCoberturas()
  }, [])

  useEffect(() => {
    fetchPacientes()
  }, [debouncedSearch])

  async function fetchCoberturas() {
    try {
      let { data } = await supabase.from('coberturas').select('*').order('nombre')
      
      // Auto-insertar coberturas por defecto si la tabla está vacía
      if (!data || data.length === 0) {
        const defaultCoberturas = [
          { nombre: 'PAMI', codigo: 'PAMI', activo: true },
          { nombre: 'OSDE', codigo: 'OSDE', activo: true },
          { nombre: 'Swiss Medical', codigo: 'SWISS', activo: true },
          { nombre: 'Medife', codigo: 'MEDIFE', activo: true },
          { nombre: 'IOSFA', codigo: 'IOSFA', activo: true },
          { nombre: 'OSYC', codigo: 'OSYC', activo: true },
          { nombre: 'Accord Salud', codigo: 'ACCORD', activo: true },
          { nombre: 'Particular', codigo: 'PARTICULAR', activo: true }
        ]
        await supabase.from('coberturas').insert(defaultCoberturas)
        const { data: newData } = await supabase.from('coberturas').select('*').order('nombre')
        data = newData
      }
      
      setCoberturas(data?.filter(c => c.activo) || [])
    } catch (err) {
      console.error('Error auto-poblando coberturas:', err)
      setCoberturas([])
    }
  }

  async function fetchPacientes() {
    setLoading(true)
    try {
      let query = supabase.from('pacientes').select('*, coberturas(nombre)').order('nombre').limit(100)
      if (debouncedSearch) {
        const isNumeric = /^\d+$/.test(debouncedSearch)
        if (isNumeric) {
          query = query.or(`dni.eq.${debouncedSearch},telefono.ilike.%${debouncedSearch}%`)
        } else {
          query = query.or(`nombre.ilike.%${debouncedSearch}%,apellido.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`)
        }
      }
      const { data, error } = await query
      if (error) throw error
      setPacientes(data || [])
    } catch (err) {
      toast.error('Error buscando pacientes')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditingPaciente(null)
    setForm({
      dni: '', nombre: '', apellido: '', email: '', telefono: '',
      fecha_nacimiento: '', sexo: '', localidad: '', domicilio: '',
      cobertura_id: '', nro_afiliado: '', observaciones: '',
      acepta_comunicaciones: true, estado: 'activo'
    })
    setShowForm(true)
  }

  function openEdit(pac) {
    setEditingPaciente(pac)
    setForm({
      dni: pac.dni || '',
      nombre: pac.nombre || '',
      apellido: pac.apellido || '',
      email: pac.email || '',
      telefono: pac.telefono || '',
      fecha_nacimiento: pac.fecha_nacimiento || '',
      sexo: pac.sexo || '',
      localidad: pac.localidad || '',
      domicilio: pac.domicilio || '',
      cobertura_id: pac.cobertura_id || '',
      nro_afiliado: pac.nro_afiliado || '',
      observaciones: pac.observaciones || '',
      acepta_comunicaciones: pac.acepta_comunicaciones ?? true,
      estado: pac.estado || 'activo',
    })
    setShowForm(true)
  }

  async function openDetail(pac) {
    setShowDetail(pac)
    const { data } = await supabase
      .from('turnos')
      .select('*')
      .eq('dni', pac.dni)
      .order('fecha_turno', { ascending: false })
      .limit(10)
    setTurnosHistorial(data || [])
  }

  async function handleSave(e) {
    e.preventDefault()
    try {
      // Validar DNI duplicado en alta
      if (!editingPaciente) {
        const { data: existing } = await supabase
          .from('pacientes')
          .select('id')
          .eq('dni', parseInt(form.dni))
          .limit(1)
        if (existing && existing.length > 0) {
          toast.error('Ya existe un paciente con ese DNI')
          return
        }
      }

      const pacienteData = {
        ...form,
        dni: parseInt(form.dni),
        cobertura_id: form.cobertura_id || null,
        fecha_nacimiento: form.fecha_nacimiento || null,
      }

      if (editingPaciente) {
        const { error } = await supabase
          .from('pacientes')
          .update(pacienteData)
          .eq('id', editingPaciente.id)
        if (error) throw error
        toast.success('Paciente actualizado')
      } else {
        const { error } = await supabase
          .from('pacientes')
          .insert(pacienteData)
        if (error) throw error
        toast.success('Paciente creado exitosamente')
      }

      setShowForm(false)
      fetchPacientes()
    } catch (err) {
      toast.error('Error guardando paciente: ' + err.message)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Pacientes</h1>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo Paciente
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI, teléfono o email..."
            className="form-input w-full pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabla de pacientes */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 skeleton rounded"></div>)}
          </div>
        ) : pacientes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No se encontraron pacientes</p>
            {search && <p className="text-sm mt-1">Probá con otra búsqueda</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-medical">
              <thead>
                <tr>
                  <th>DNI</th>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Cobertura</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pacientes.map((pac, i) => (
                  <tr key={pac.id} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="font-mono text-sm font-medium">{pac.dni}</td>
                    <td className="font-medium text-gray-800">
                      {pac.nombre} {pac.apellido || ''}
                    </td>
                    <td>
                      {pac.telefono && (
                        <span className="flex items-center gap-1 text-gray-600">
                          <Phone className="w-3.5 h-3.5" /> {pac.telefono}
                        </span>
                      )}
                    </td>
                    <td className="text-gray-600 text-sm">{pac.email || '—'}</td>
                    <td className="text-sm">{pac.coberturas?.nombre || '—'}</td>
                    <td>
                      <span className={`badge ${ESTADO_COLORS[pac.estado] || ESTADO_COLORS.activo}`}>
                        {pac.estado || 'activo'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openDetail(pac)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600" title="Ver detalle">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(pac)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-amber-600" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <Link to={`/historia-clinica/${pac.id}`} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-green-600" title="Historia Clínica">
                          <FileText className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Formulario */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content w-full max-w-2xl p-6 m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingPaciente ? 'Editar Paciente' : 'Nuevo Paciente'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">DNI *</label>
                  <input type="number" className="form-input" value={form.dni} onChange={e => setForm({...form, dni: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input type="text" className="form-input" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido</label>
                  <input type="text" className="form-input" value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input type="text" className="form-input" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de Nacimiento</label>
                  <input type="date" className="form-input" value={form.fecha_nacimiento} onChange={e => setForm({...form, fecha_nacimiento: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Sexo</label>
                  <select className="form-input" value={form.sexo} onChange={e => setForm({...form, sexo: e.target.value})}>
                    <option value="">Seleccionar</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Localidad</label>
                  <input type="text" className="form-input" value={form.localidad} onChange={e => setForm({...form, localidad: e.target.value})} />
                </div>
                <div className="form-group md:col-span-2">
                  <label className="form-label">Domicilio</label>
                  <input type="text" className="form-input" value={form.domicilio} onChange={e => setForm({...form, domicilio: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cobertura Médica</label>
                  <select className="form-input" value={form.cobertura_id} onChange={e => setForm({...form, cobertura_id: e.target.value})}>
                    <option value="">Sin cobertura</option>
                    {coberturas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">N° Afiliado</label>
                  <input type="text" className="form-input" value={form.nro_afiliado} onChange={e => setForm({...form, nro_afiliado: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select className="form-input" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="restringido">Restringido</option>
                  </select>
                </div>
                <div className="form-group flex items-center gap-2 pt-6">
                  <input type="checkbox" id="acepta_com" checked={form.acepta_comunicaciones} onChange={e => setForm({...form, acepta_comunicaciones: e.target.checked})} className="w-4 h-4 rounded" />
                  <label htmlFor="acepta_com" className="text-sm text-gray-700">Acepta comunicaciones</label>
                </div>
                <div className="form-group md:col-span-2">
                  <label className="form-label">Observaciones</label>
                  <textarea className="form-input" rows={2} value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary"><Save className="w-4 h-4" /> Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal-content w-full max-w-2xl p-6 m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Detalle del Paciente</h2>
              <button onClick={() => setShowDetail(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div><span className="text-xs text-gray-500">DNI</span><p className="font-medium">{showDetail.dni}</p></div>
              <div><span className="text-xs text-gray-500">Nombre</span><p className="font-medium">{showDetail.nombre} {showDetail.apellido || ''}</p></div>
              <div><span className="text-xs text-gray-500">Email</span><p>{showDetail.email || '—'}</p></div>
              <div><span className="text-xs text-gray-500">Teléfono</span><p>{showDetail.telefono || '—'}</p></div>
              <div><span className="text-xs text-gray-500">Fecha Nac.</span><p>{showDetail.fecha_nacimiento || '—'}</p></div>
              <div><span className="text-xs text-gray-500">Cobertura</span><p>{showDetail.coberturas?.nombre || 'Sin cobertura'}</p></div>
              {showDetail.localidad && <div><span className="text-xs text-gray-500">Localidad</span><p>{showDetail.localidad}</p></div>}
              {showDetail.domicilio && <div><span className="text-xs text-gray-500">Domicilio</span><p>{showDetail.domicilio}</p></div>}
            </div>

            <h3 className="font-semibold text-gray-700 mb-3">Últimos 10 turnos</h3>
            {turnosHistorial.length === 0 ? (
              <p className="text-gray-400 text-sm">Sin turnos registrados</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {turnosHistorial.map(t => (
                  <div key={t.id} className={`flex items-center justify-between p-3 rounded-lg border border-gray-100 text-sm ${t.es_sobreturno ? 'sobreturno-border' : ''}`}>
                    <div>
                      <span className="font-medium">{t.fecha_turno}</span>
                      <span className="text-gray-400 mx-2">|</span>
                      <span>{t.hora?.slice(0,5)}</span>
                      <span className="text-gray-400 mx-2">|</span>
                      <span className="text-gray-600">{t.servicios || 'Consulta'}</span>
                      {t.es_sobreturno && <span className="sobreturno-badge ml-2">ST</span>}
                    </div>
                    <span className={`badge badge-${t.cancelado ? 'cancelado' : (t.estado || 'reservado')}`}>{t.cancelado ? 'cancelado' : (t.estado || 'reservado')}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Link to={`/historia-clinica/${showDetail.id}`} className="btn-primary">
                <FileText className="w-4 h-4" /> Historia Clínica
              </Link>
              <button onClick={() => { setShowDetail(null); openEdit(showDetail); }} className="btn-secondary">
                <Edit2 className="w-4 h-4" /> Editar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
