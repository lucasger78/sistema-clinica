import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'sonner'
import {
  ArrowLeft, Save, FileText, Upload, Trash2, Eye,
  Image as ImageIcon, File, X, Loader2, Download
} from 'lucide-react'

export default function HistoriaClinicaPage() {
  const { pacienteId } = useParams()
  const navigate = useNavigate()
  const { rol } = useAuth()
  const fileInputRef = useRef(null)

  const [paciente, setPaciente] = useState(null)
  const [contenido, setContenido] = useState('')
  const [nuevaNota, setNuevaNota] = useState('')
  const [archivos, setArchivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingNota, setSavingNota] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewFile, setPreviewFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  useEffect(() => {
    fetchData()
  }, [pacienteId])

  async function fetchData() {
    setLoading(true)
    try {
      // Datos del paciente
      const { data: pac } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', parseInt(pacienteId))
        .single()
      setPaciente(pac)

      // Historia clínica
      const { data: hc } = await supabase
        .from('historia_clinica')
        .select('*')
        .eq('paciente_id', parseInt(pacienteId))
        .single()
      setContenido(hc?.contenido || '')

      // Archivos adjuntos
      if (hc) {
        const { data: files } = await supabase
          .from('historia_clinica_archivos')
          .select('*')
          .eq('historia_clinica_id', hc.id)
          .order('created_at', { ascending: false })
        setArchivos(files || [])
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  async function guardarNota() {
    if (!nuevaNota.trim()) { toast.error('Escribí una nota antes de guardar'); return }
    setSavingNota(true)
    try {
      const { error } = await supabase.rpc('agregar_nota_hc', {
        p_paciente_id: parseInt(pacienteId),
        p_texto: nuevaNota.trim()
      })
      if (error) throw error
      toast.success('Nota guardada')
      setNuevaNota('')
      // Refrescar contenido
      const { data: hc } = await supabase
        .from('historia_clinica')
        .select('contenido')
        .eq('paciente_id', parseInt(pacienteId))
        .single()
      setContenido(hc?.contenido || '')
    } catch (err) {
      toast.error('Error guardando nota: ' + err.message)
    }
    setSavingNota(false)
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten archivos PDF, JPG o PNG')
      return
    }

    // Validar tamaño (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede superar los 10MB')
      return
    }

    // Preview para imágenes
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewFile({ file, url, name: file.name, type: 'image' })
    } else {
      setPreviewFile({ file, url: null, name: file.name, type: 'pdf' })
    }
  }

  async function confirmarSubida() {
    if (!previewFile) return
    setUploading(true)
    setUploadProgress(10)

    try {
      const file = previewFile.file
      const ext = file.name.split('.').pop()
      const storagePath = `paciente_${pacienteId}/${Date.now()}_${file.name}`

      setUploadProgress(30)

      // Subir archivo
      const { error: uploadError } = await supabase.storage
        .from('historia-clinica')
        .upload(storagePath, file)
      if (uploadError) throw uploadError

      setUploadProgress(70)

      // Asegurar que existe el registro de historia clínica
      await supabase.rpc('agregar_nota_hc', {
        p_paciente_id: parseInt(pacienteId),
        p_texto: `[Archivo adjunto: ${file.name}]`
      })

      // Obtener el historia_clinica_id
      const { data: hc } = await supabase
        .from('historia_clinica')
        .select('id')
        .eq('paciente_id', parseInt(pacienteId))
        .single()

      // Registrar en historia_clinica_archivos
      const { error: insertError } = await supabase
        .from('historia_clinica_archivos')
        .insert({
          historia_clinica_id: hc.id,
          nombre_archivo: file.name,
          tipo: ext.toLowerCase(),
          storage_path: storagePath,
          tamanio_bytes: file.size,
        })
      if (insertError) throw insertError

      setUploadProgress(100)
      toast.success('Archivo subido exitosamente')
      setPreviewFile(null)
      fetchData() // Refrescar
    } catch (err) {
      toast.error('Error subiendo archivo: ' + err.message)
    }
    setUploading(false)
    setUploadProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function verArchivo(archivo) {
    try {
      const { data, error } = await supabase.storage
        .from('historia-clinica')
        .createSignedUrl(archivo.storage_path, 3600)
      if (error) throw error

      if (['jpg', 'jpeg', 'png'].includes(archivo.tipo)) {
        setImagePreview({ url: data.signedUrl, nombre: archivo.nombre_archivo })
      } else {
        window.open(data.signedUrl, '_blank')
      }
    } catch (err) {
      toast.error('Error obteniendo archivo')
    }
  }

  async function eliminarArchivo(archivo) {
    if (!confirm('¿Eliminar este archivo? Esta acción no se puede deshacer.')) return
    try {
      await supabase.storage.from('historia-clinica').remove([archivo.storage_path])
      await supabase.from('historia_clinica_archivos').delete().eq('id', archivo.id)
      toast.success('Archivo eliminado')
      fetchData()
    } catch (err) {
      toast.error('Error eliminando archivo')
    }
  }

  function formatBytes(bytes) {
    if (!bytes) return '—'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 skeleton"></div>
        <div className="h-64 skeleton rounded-xl"></div>
        <div className="h-48 skeleton rounded-xl"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Historia Clínica</h1>
          <p className="text-gray-500">{paciente?.nombre} {paciente?.apellido || ''} — DNI: {paciente?.dni}</p>
        </div>
      </div>

      {/* Sección: Texto existente (solo lectura) */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-[#1B4F72]" />
          Notas clínicas
        </h2>
        {contenido ? (
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{contenido}</pre>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Sin notas registradas</p>
          </div>
        )}
      </div>

      {/* Sección: Agregar nota */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Agregar nota</h2>
        <textarea
          className="form-input w-full min-h-[150px] resize-y"
          rows={6}
          placeholder="Escribí la nota aquí..."
          value={nuevaNota}
          onChange={e => setNuevaNota(e.target.value)}
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={guardarNota}
            disabled={savingNota || !nuevaNota.trim()}
            className="btn-primary"
          >
            {savingNota ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4" /> Guardar nota</>}
          </button>
        </div>
      </div>

      {/* Sección: Archivos adjuntos */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#1B4F72]" />
            Archivos adjuntos
          </h2>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="btn-secondary cursor-pointer">
              <Upload className="w-4 h-4" /> Adjuntar archivo
            </label>
          </div>
        </div>

        {/* Preview antes de subir */}
        {previewFile && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-fade-in">
            <div className="flex items-center gap-4">
              {previewFile.type === 'image' ? (
                <img src={previewFile.url} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
              ) : (
                <div className="w-20 h-20 bg-red-100 rounded-lg flex items-center justify-center">
                  <File className="w-8 h-8 text-red-500" />
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">{previewFile.name}</p>
                <p className="text-xs text-gray-500">{formatBytes(previewFile.file.size)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setPreviewFile(null)} className="btn-secondary text-sm py-1.5">Cancelar</button>
                <button onClick={confirmarSubida} disabled={uploading} className="btn-primary text-sm py-1.5">
                  {uploading ? 'Subiendo...' : 'Confirmar'}
                </button>
              </div>
            </div>
            {uploading && (
              <div className="mt-3">
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div className="bg-[#1B4F72] h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <p className="text-xs text-blue-600 mt-1">{uploadProgress}%</p>
              </div>
            )}
          </div>
        )}

        {/* Grilla de archivos */}
        {archivos.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <File className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sin archivos adjuntos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {archivos.map(archivo => (
              <div key={archivo.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow group">
                {/* Thumbnail o icono */}
                <div
                  onClick={() => verArchivo(archivo)}
                  className="w-full h-24 bg-gray-50 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition"
                >
                  {['jpg', 'jpeg', 'png'].includes(archivo.tipo) ? (
                    <ImageIcon className="w-10 h-10 text-blue-400" />
                  ) : (
                    <File className="w-10 h-10 text-red-400" />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-700 truncate" title={archivo.nombre_archivo}>
                    {archivo.nombre_archivo}
                  </p>
                  <p className="text-[0.65rem] text-gray-400 mt-0.5">
                    {archivo.created_at?.slice(0, 10)} • {formatBytes(archivo.tamanio_bytes)}
                  </p>
                  <div className="flex gap-1 mt-2">
                    <button onClick={() => verArchivo(archivo)} className="flex-1 text-xs py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center justify-center gap-1">
                      <Eye className="w-3 h-3" /> Ver
                    </button>
                    {rol === 'admin' && (
                      <button onClick={() => eliminarArchivo(archivo)} className="text-xs py-1 px-2 bg-red-50 text-red-600 rounded hover:bg-red-100">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal preview de imagen */}
      {imagePreview && (
        <div className="modal-overlay" onClick={() => setImagePreview(null)}>
          <div className="modal-content max-w-4xl p-4 m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-sm">{imagePreview.nombre}</p>
              <button onClick={() => setImagePreview(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={imagePreview.url} alt={imagePreview.nombre} className="w-full rounded-lg max-h-[75vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}
