import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  CreditCard, DollarSign, X, Save, Search, Eye,
  Banknote, Wallet, Landmark, CheckCircle, Clock, Loader2
} from 'lucide-react'

const METODOS = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'transferencia', label: 'Transferencia', icon: Landmark },
  { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
]

const ESTADO_PAGO = {
  pendiente: 'bg-amber-100 text-amber-700',
  pagado: 'bg-green-100 text-green-700',
  parcial: 'bg-blue-100 text-blue-700',
}

export default function FacturacionPage() {
  const [turnos, setTurnos] = useState([])
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [showPagoForm, setShowPagoForm] = useState(null)
  const [coberturas, setCoberturas] = useState([])
  const [cierreCaja, setCierreCaja] = useState(null)

  const [pagoForm, setPagoForm] = useState({
    monto: '', metodo_pago: 'efectivo', cobertura_id: '', nro_autorizacion: '', observaciones: ''
  })

  useEffect(() => {
    fetchData()
  }, [fecha])

  async function fetchData() {
    setLoading(true)
    const [{ data: t }, { data: p }, { data: c }] = await Promise.all([
      supabase.from('turnos').select('*, profesionales(nombre, apellido), pagos(*)').eq('fecha_turno', fecha).eq('cancelado', false).order('hora'),
      supabase.from('pagos').select('*, turnos!inner(fecha_turno)').eq('turnos.fecha_turno', fecha),
      supabase.from('coberturas').select('*').eq('activo', true),
    ])
    setTurnos(t || [])
    setPagos(p || [])
    setCoberturas(c || [])

    // Calcular cierre de caja
    const pagosDelDia = p || []
    const cierre = {
      total: pagosDelDia.reduce((sum, pg) => sum + parseFloat(pg.monto || 0), 0),
      efectivo: pagosDelDia.filter(pg => pg.metodo_pago === 'efectivo').reduce((sum, pg) => sum + parseFloat(pg.monto || 0), 0),
      transferencia: pagosDelDia.filter(pg => pg.metodo_pago === 'transferencia').reduce((sum, pg) => sum + parseFloat(pg.monto || 0), 0),
      tarjeta: pagosDelDia.filter(pg => pg.metodo_pago === 'tarjeta').reduce((sum, pg) => sum + parseFloat(pg.monto || 0), 0),
      cantidad: pagosDelDia.length,
    }
    setCierreCaja(cierre)
    setLoading(false)
  }

  function openPago(turno) {
    setShowPagoForm(turno)
    setPagoForm({
      monto: turno.precio || '',
      metodo_pago: 'efectivo',
      cobertura_id: '', nro_autorizacion: '', observaciones: ''
    })
  }

  async function handleSavePago(e) {
    e.preventDefault()
    if (!pagoForm.monto) { toast.error('Ingresá el monto'); return }
    try {
      const { error } = await supabase.from('pagos').insert({
        turno_id: showPagoForm.id,
        monto: parseFloat(pagoForm.monto),
        metodo_pago: pagoForm.metodo_pago,
        cobertura_id: pagoForm.cobertura_id || null,
        nro_autorizacion: pagoForm.nro_autorizacion || null,
        observaciones: pagoForm.observaciones || null,
        estado_pago: 'pagado',
      })
      if (error) throw error
      toast.success('Pago registrado')
      setShowPagoForm(null)
      fetchData()
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
  }

  function getTurnoPago(turno) {
    if (turno.pagos && turno.pagos.length > 0) {
      const totalPagado = turno.pagos.reduce((s, p) => s + parseFloat(p.monto || 0), 0)
      const precio = parseFloat(turno.precio || 0)
      if (totalPagado >= precio && precio > 0) return 'pagado'
      if (totalPagado > 0) return 'parcial'
    }
    return 'pendiente'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Facturación</h1>
        <input type="date" className="form-input" value={fecha} onChange={e => setFecha(e.target.value)} />
      </div>

      {/* Cierre de caja */}
      {cierreCaja && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">${cierreCaja.total.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Total recaudado</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-xl font-bold text-green-700">${cierreCaja.efectivo.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">
              <Banknote className="w-3 h-3 inline" /> Efectivo
            </p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-xl font-bold text-blue-700">${cierreCaja.transferencia.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">
              <Landmark className="w-3 h-3 inline" /> Transferencia
            </p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-xl font-bold text-purple-700">${cierreCaja.tarjeta.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">
              <CreditCard className="w-3 h-3 inline" /> Tarjeta
            </p>
          </div>
        </div>
      )}

      {/* Lista de turnos del día */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Turnos del día</h2>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 skeleton rounded"></div>)}</div>
        ) : turnos.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Sin turnos para esta fecha</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-medical">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Servicio</th>
                  <th>Profesional</th>
                  <th>Precio</th>
                  <th>Estado Pago</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {turnos.map(turno => {
                  const estadoPago = getTurnoPago(turno)
                  return (
                    <tr key={turno.id}>
                      <td className="font-mono font-medium">{turno.hora?.slice(0, 5)}</td>
                      <td className="font-medium">{turno.nombre}</td>
                      <td className="text-sm text-gray-600">{turno.servicios || 'Consulta'}</td>
                      <td className="text-sm">{turno.profesionales ? `Dr. ${turno.profesionales.apellido}` : '—'}</td>
                      <td className="font-medium">${turno.precio || 0}</td>
                      <td>
                        <span className={`badge ${ESTADO_PAGO[estadoPago]}`}>{estadoPago}</span>
                      </td>
                      <td>
                        <button onClick={() => openPago(turno)} className="btn-secondary text-xs py-1 px-3">
                          <DollarSign className="w-3 h-3" />
                          {estadoPago === 'pendiente' ? 'Cobrar' : 'Nuevo pago'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Pago */}
      {showPagoForm && (
        <div className="modal-overlay" onClick={() => setShowPagoForm(null)}>
          <div className="modal-content w-full max-w-md p-6 m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Registrar Pago</h2>
              <button onClick={() => setShowPagoForm(null)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <p className="font-medium">{showPagoForm.nombre} — {showPagoForm.hora?.slice(0, 5)}</p>
              <p className="text-gray-500">{showPagoForm.servicios || 'Consulta'} | Precio: ${showPagoForm.precio || 0}</p>
            </div>

            <form onSubmit={handleSavePago} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Monto *</label>
                <input type="number" step="0.01" className="form-input" value={pagoForm.monto} onChange={e => setPagoForm({...pagoForm, monto: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Método de pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {METODOS.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setPagoForm({...pagoForm, metodo_pago: m.value})}
                      className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-1 transition ${
                        pagoForm.metodo_pago === m.value ? 'border-[#1B4F72] bg-blue-50 text-[#1B4F72]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <m.icon className="w-5 h-5" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Cobertura</label>
                <select className="form-input" value={pagoForm.cobertura_id} onChange={e => setPagoForm({...pagoForm, cobertura_id: e.target.value})}>
                  <option value="">Sin cobertura</option>
                  {coberturas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">N° Autorización</label>
                <input type="text" className="form-input" value={pagoForm.nro_autorizacion} onChange={e => setPagoForm({...pagoForm, nro_autorizacion: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Observaciones</label>
                <input type="text" className="form-input" value={pagoForm.observaciones} onChange={e => setPagoForm({...pagoForm, observaciones: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowPagoForm(null)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary"><Save className="w-4 h-4" /> Registrar Pago</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
