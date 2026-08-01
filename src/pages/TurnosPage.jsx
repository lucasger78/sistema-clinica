import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Search, User, Calendar, Clock, Check, ChevronRight,
  ChevronLeft, AlertTriangle, X, Loader2, Plus, Save
} from 'lucide-react'

const STEPS = ['Paciente', 'Profesional y Fecha', 'Horario', 'Confirmar']

export default function TurnosPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const initialProf = searchParams.get('profesional')
  const initialFecha = searchParams.get('fecha')
  const initialHora = searchParams.get('hora')

  // Step 1: Paciente
  const [searchPaciente, setSearchPaciente] = useState('')
  const [pacientes, setPacientes] = useState([])
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [showNuevoPaciente, setShowNuevoPaciente] = useState(false)
  const [nuevoPacienteForm, setNuevoPacienteForm] = useState({
    nombre: '', apellido: '', dni: '', telefono: '', email: ''
  })
  const [guardandoPaciente, setGuardandoPaciente] = useState(false)

  // Step 2: Profesional y fecha
  const [profesionales, setProfesionales] = useState([])
  const [profSeleccionado, setProfSeleccionado] = useState(null)
  const [fechaTurno, setFechaTurno] = useState(initialFecha || format(new Date(), 'yyyy-MM-dd'))
  const [servicio, setServicio] = useState('')
  const [precio, setPrecio] = useState('')

  // Step 3: Horario
  const [slots, setSlots] = useState([])
  const [slotSeleccionado, setSlotSeleccionado] = useState(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [forzarSobreturno, setForzarSobreturno] = useState(false)
  const [motivoSobreturno, setMotivoSobreturno] = useState('')

  useEffect(() => {
    supabase.from('profesionales').select('*').eq('activo', true).order('apellido')
      .then(({ data }) => {
        const profs = data || []
        setProfesionales(profs)
        if (initialProf) {
          const pre = profs.find(p => p.id === initialProf)
          if (pre) setProfSeleccionado(pre)
        }
      })
  }, [])

  // Buscar pacientes
  useEffect(() => {
    if (searchPaciente.length < 2) { setPacientes([]); return }
    const timer = setTimeout(async () => {
      setBuscando(true)
      const isNum = /^\d+$/.test(searchPaciente)
      let query = supabase.from('pacientes').select('*').limit(10)
      if (isNum) {
        query = query.or(`dni.eq.${searchPaciente},telefono.ilike.%${searchPaciente}%`)
      } else {
        query = query.or(`nombre.ilike.%${searchPaciente}%,apellido.ilike.%${searchPaciente}%`)
      }
      const { data } = await query
      setPacientes(data || [])
      setBuscando(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchPaciente])

  // Obtener slots cuando se elige profesional y fecha
  async function fetchSlots() {
    if (!profSeleccionado) return
    setLoadingSlots(true)
    try {
      const { data, error } = await supabase.rpc('get_slots_disponibles', {
        p_profesional_id: profSeleccionado.id,
        p_fecha: fechaTurno
      })
      if (error) throw error
      const fetchedSlots = data || []
      setSlots(fetchedSlots)
      if (initialHora) {
        const found = fetchedSlots.find(s => s.hora_slot?.startsWith(initialHora))
        if (found) {
          setSlotSeleccionado(found)
          if (!found.disponible) {
            setForzarSobreturno(true)
          }
        }
      }
    } catch (err) {
      console.error(err)
      toast.error('Error obteniendo disponibilidad')
      setSlots([])
    }
    setLoadingSlots(false)
  }

  async function handleCrearPaciente(e) {
    e.preventDefault()
    setGuardandoPaciente(true)
    try {
      if (!nuevoPacienteForm.nombre || (!nuevoPacienteForm.dni && !nuevoPacienteForm.telefono)) {
        throw new Error('El nombre y al menos el DNI o Teléfono son requeridos')
      }
      
      const { data, error } = await supabase.from('pacientes').insert([nuevoPacienteForm]).select().single()
      if (error) {
        if (error.code === '23505') throw new Error('Ya existe un paciente con ese DNI o Email')
        throw error
      }
      
      toast.success('Paciente creado correctamente')
      setPacienteSeleccionado(data)
      setShowNuevoPaciente(false)
      setNuevoPacienteForm({ nombre: '', apellido: '', dni: '', telefono: '', email: '' })
    } catch (err) {
      toast.error(err.message || 'Error al crear paciente')
    }
    setGuardandoPaciente(false)
  }

  function goToStep3() {
    if (!profSeleccionado) { toast.error('Seleccioná un profesional'); return }
    fetchSlots()
    setStep(2)
  }

  function selectSlot(slot) {
    setSlotSeleccionado(slot)
    if (!slot.disponible) {
      setForzarSobreturno(false)
      setMotivoSobreturno('')
    }
  }

  async function confirmarTurno() {
    if (!pacienteSeleccionado || !profSeleccionado || !slotSeleccionado) return
    if (!slotSeleccionado.disponible && forzarSobreturno && !motivoSobreturno.trim()) {
      toast.error('Ingresá el motivo del sobreturno')
      return
    }

    setSaving(true)
    try {
      const { data, error } = await supabase.rpc('crear_turno_seguro', {
        p_fecha_turno: fechaTurno,
        p_hora: slotSeleccionado.hora_slot,
        p_dni: pacienteSeleccionado.dni,
        p_nombre: `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido || ''}`.trim(),
        p_email: pacienteSeleccionado.email || '',
        p_telefono: pacienteSeleccionado.telefono || '',
        p_servicios: servicio || 'Consulta general',
        p_precio: parseFloat(precio) || 0,
        p_profesional_id: profSeleccionado.id,
        p_canal_origen: 'panel',
        p_forzar_sobreturno: !slotSeleccionado.disponible ? forzarSobreturno : false,
        p_motivo_sobreturno: motivoSobreturno || null,
      })

      if (error) throw error

      const result = typeof data === 'string' ? JSON.parse(data) : data

      if (result.ok) {
        toast.success('Turno creado exitosamente (ID: ' + result.id + ')')
        navigate('/agenda')
      } else {
        toast.error(result.mensaje || 'No se pudo crear el turno')
      }
    } catch (err) {
      toast.error('Error creando turno: ' + err.message)
    }
    setSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-800">Nuevo Turno</h1>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all ${
              i < step ? 'bg-[#1E8449] text-white' :
              i === step ? 'bg-[#1B4F72] text-white shadow-lg' :
              'bg-gray-200 text-gray-500'
            }`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm hidden sm:block ${i === step ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-[#1E8449]' : 'bg-gray-200'}`}></div>}
          </div>
        ))}
      </div>

      {/* Step 1: Paciente */}
      {step === 0 && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><User className="w-5 h-5 text-[#1B4F72]" /> Buscar Paciente</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, DNI o teléfono..."
              className="form-input w-full pl-10"
              value={searchPaciente}
              onChange={e => setSearchPaciente(e.target.value)}
              autoFocus
            />
          </div>

          {pacienteSeleccionado && (
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <p className="font-semibold text-green-800">{pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido || ''}</p>
                <p className="text-sm text-green-600">DNI: {pacienteSeleccionado.dni} | Tel: {pacienteSeleccionado.telefono || '—'}</p>
              </div>
              <button onClick={() => setPacienteSeleccionado(null)} className="p-1 hover:bg-green-100 rounded"><X className="w-4 h-4 text-green-600" /></button>
            </div>
          )}

          {buscando && <div className="flex items-center gap-2 text-gray-400 text-sm"><div className="spinner"></div> Buscando...</div>}

          {!pacienteSeleccionado && !showNuevoPaciente && pacientes.length > 0 && (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {pacientes.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setPacienteSeleccionado(p); setPacientes([]) }}
                  className="w-full text-left p-3 rounded-lg hover:bg-blue-50 transition flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{p.nombre} {p.apellido || ''}</p>
                    <p className="text-sm text-gray-500">DNI: {p.dni} | {p.telefono || 'Sin tel.'}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}

          {!pacienteSeleccionado && !showNuevoPaciente && !buscando && searchPaciente.length >= 2 && (
            <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in">
              <p className="text-sm text-gray-500 mb-2">¿No encuentras al paciente o es nuevo?</p>
              <button 
                onClick={() => setShowNuevoPaciente(true)} 
                className="btn-secondary w-full text-sm py-2 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Registrar Nuevo Paciente
              </button>
            </div>
          )}

          {showNuevoPaciente && !pacienteSeleccionado && (
            <form onSubmit={handleCrearPaciente} className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg animate-fade-in space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-700">Nuevo Paciente</h3>
                <button type="button" onClick={() => setShowNuevoPaciente(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label text-xs">Nombre *</label>
                  <input type="text" className="form-input text-sm" value={nuevoPacienteForm.nombre} onChange={e => setNuevoPacienteForm({...nuevoPacienteForm, nombre: e.target.value})} required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs">Apellido</label>
                  <input type="text" className="form-input text-sm" value={nuevoPacienteForm.apellido} onChange={e => setNuevoPacienteForm({...nuevoPacienteForm, apellido: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs">DNI</label>
                  <input type="text" className="form-input text-sm" value={nuevoPacienteForm.dni} onChange={e => setNuevoPacienteForm({...nuevoPacienteForm, dni: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs">Teléfono</label>
                  <input type="text" className="form-input text-sm" value={nuevoPacienteForm.telefono} onChange={e => setNuevoPacienteForm({...nuevoPacienteForm, telefono: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label text-xs">Email</label>
                <input type="email" className="form-input text-sm" value={nuevoPacienteForm.email} onChange={e => setNuevoPacienteForm({...nuevoPacienteForm, email: e.target.value})} />
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={guardandoPaciente} className="btn-primary py-2 px-4 shadow-sm text-sm">
                  {guardandoPaciente ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Guardar y Seleccionar</>}
                </button>
              </div>
            </form>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(1)}
              disabled={!pacienteSeleccionado}
              className="btn-primary"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Profesional y fecha */}
      {step === 1 && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Calendar className="w-5 h-5 text-[#1B4F72]" /> Profesional y Fecha</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Profesional *</label>
              <select
                className="form-input"
                value={profSeleccionado?.id || ''}
                onChange={e => setProfSeleccionado(profesionales.find(p => p.id === e.target.value) || null)}
              >
                <option value="">Seleccionar profesional</option>
                {profesionales.map(p => (
                  <option key={p.id} value={p.id}>{p.apellido}, {p.nombre} — {p.especialidad || 'General'}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha *</label>
              <input type="date" className="form-input" value={fechaTurno} onChange={e => setFechaTurno(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} />
            </div>
            <div className="form-group">
              <label className="form-label">Servicio / Prestación</label>
              <input type="text" className="form-input" placeholder="Consulta general" value={servicio} onChange={e => setServicio(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Precio</label>
              <input type="number" className="form-input" placeholder="0.00" value={precio} onChange={e => setPrecio(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(0)} className="btn-secondary"><ChevronLeft className="w-4 h-4" /> Anterior</button>
            <button onClick={goToStep3} className="btn-primary">Siguiente <ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Step 3: Horario */}
      {step === 2 && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Clock className="w-5 h-5 text-[#1B4F72]" /> Elegir Horario</h2>
          <p className="text-sm text-gray-500">
            {profSeleccionado?.apellido}, {profSeleccionado?.nombre} — {fechaTurno}
          </p>

          {loadingSlots ? (
            <div className="flex items-center justify-center py-12 text-gray-400"><div className="spinner mr-2"></div> Consultando disponibilidad...</div>
          ) : slots.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay horarios configurados para este día</p>
              <p className="text-sm">Verificá la configuración de agenda del profesional</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {slots.map(slot => {
                  const horaStr = slot.hora_slot?.slice(0, 5)
                  const selected = slotSeleccionado?.hora_slot === slot.hora_slot
                  return (
                    <button
                      key={slot.hora_slot}
                      onClick={() => selectSlot(slot)}
                      className={`p-3 rounded-lg text-sm font-medium transition-all border ${
                        selected
                          ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-lg'
                          : slot.disponible
                            ? 'bg-white hover:bg-blue-50 border-gray-200 hover:border-[#1B4F72] text-gray-700'
                            : 'bg-red-50 border-red-200 text-red-400 hover:bg-red-100'
                      }`}
                    >
                      {horaStr}
                      {!slot.disponible && <span className="block text-[0.65rem]">Ocupado</span>}
                    </button>
                  )
                })}
              </div>

              {/* Checkbox sobreturno */}
              {slotSeleccionado && !slotSeleccionado.disponible && (
                <div className="p-4 bg-orange-50 border border-orange-300 rounded-lg animate-fade-in">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forzarSobreturno}
                      onChange={e => setForzarSobreturno(e.target.checked)}
                      className="w-5 h-5 rounded accent-orange-500"
                    />
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <span className="font-semibold text-orange-800">Forzar sobreturno</span>
                    </div>
                  </label>
                  {forzarSobreturno && (
                    <div className="mt-3 form-group animate-fade-in">
                      <label className="form-label text-orange-700">Motivo del sobreturno (obligatorio)</label>
                      <input
                        type="text"
                        className="form-input border-orange-300"
                        placeholder="Urgencia, paciente especial, etc."
                        value={motivoSobreturno}
                        onChange={e => setMotivoSobreturno(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(1)} className="btn-secondary"><ChevronLeft className="w-4 h-4" /> Anterior</button>
            <button
              onClick={() => setStep(3)}
              disabled={!slotSeleccionado || (!slotSeleccionado.disponible && !forzarSobreturno)}
              className="btn-primary"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmar */}
      {step === 3 && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Check className="w-5 h-5 text-[#1E8449]" /> Confirmar Turno</h2>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Paciente</span><p className="font-medium">{pacienteSeleccionado?.nombre} {pacienteSeleccionado?.apellido || ''}</p></div>
              <div><span className="text-gray-500">DNI</span><p className="font-medium">{pacienteSeleccionado?.dni}</p></div>
              <div><span className="text-gray-500">Profesional</span><p className="font-medium">Dr. {profSeleccionado?.apellido}, {profSeleccionado?.nombre}</p></div>
              <div><span className="text-gray-500">Especialidad</span><p>{profSeleccionado?.especialidad || 'General'}</p></div>
              <div><span className="text-gray-500">Fecha</span><p className="font-medium">{fechaTurno}</p></div>
              <div><span className="text-gray-500">Hora</span><p className="font-medium text-lg">{slotSeleccionado?.hora_slot?.slice(0, 5)}</p></div>
              <div><span className="text-gray-500">Servicio</span><p>{servicio || 'Consulta general'}</p></div>
              <div><span className="text-gray-500">Precio</span><p>${precio || '0'}</p></div>
            </div>

            {!slotSeleccionado?.disponible && forzarSobreturno && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-orange-800 text-sm">SOBRETURNO</p>
                  <p className="text-orange-700 text-xs">{motivoSobreturno}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(2)} className="btn-secondary"><ChevronLeft className="w-4 h-4" /> Anterior</button>
            <button onClick={confirmarTurno} disabled={saving} className="btn-primary py-3 px-6">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</> : <><Check className="w-4 h-4" /> Confirmar Turno</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
