import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { Plus, Edit2, X, Save, Trash2, Settings, Users, Tag, Palette, Shield } from 'lucide-react'

function CrudSection({ title, icon: Icon, tableName, columns, colorField }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase.from(tableName).select('*').order('nombre')
    setItems(data || [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    const empty = {}
    columns.forEach(c => { empty[c.key] = c.default || '' })
    setForm(empty)
    setShowForm(true)
  }

  function openEdit(item) {
    setEditing(item)
    const f = {}
    columns.forEach(c => { f[c.key] = item[c.key] ?? c.default ?? '' })
    setForm(f)
    setShowForm(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    try {
      if (editing) {
        const { error } = await supabase.from(tableName).update(form).eq('id', editing.id)
        if (error) throw error
        toast.success('Actualizado')
      } else {
        const { error } = await supabase.from(tableName).insert(form)
        if (error) throw error
        toast.success('Creado')
      }
      setShowForm(false)
      fetchItems()
    } catch (err) { toast.error(err.message) }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar?')) return
    await supabase.from(tableName).delete().eq('id', id)
    toast.success('Eliminado')
    fetchItems()
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Icon className="w-5 h-5 text-[#1B4F72]" /> {title}</h3>
        <button onClick={openCreate} className="btn-secondary text-sm py-1.5"><Plus className="w-3.5 h-3.5" /> Nuevo</button>
      </div>
      {loading ? <div className="space-y-2">{[...Array(3)].map((_,i)=><div key={i} className="h-10 skeleton rounded"></div>)}</div> : items.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">Sin registros</p>
      ) : (
        <div className="space-y-1">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 group">
              <div className="flex items-center gap-3">
                {colorField && <div className="w-4 h-4 rounded-full border" style={{backgroundColor: item[colorField] || '#ccc'}}></div>}
                <span className="font-medium text-sm">{item.nombre}</span>
                {item.codigo && <span className="text-xs text-gray-400">({item.codigo})</span>}
                {item.activo === false && <span className="badge bg-gray-100 text-gray-500">Inactivo</span>}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-gray-200"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content w-full max-w-md p-6 m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editing ? 'Editar' : 'Nuevo'} {title.slice(0,-1)}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {columns.map(col => (
                <div key={col.key} className="form-group">
                  <label className="form-label">{col.label}</label>
                  {col.type === 'checkbox' ? (
                    <input type="checkbox" checked={form[col.key] ?? true} onChange={e => setForm({...form, [col.key]: e.target.checked})} className="w-4 h-4 rounded" />
                  ) : col.type === 'color' ? (
                    <div className="flex gap-2 items-center">
                      <input type="color" value={form[col.key] || '#3B82F6'} onChange={e => setForm({...form, [col.key]: e.target.value})} className="w-10 h-10 rounded cursor-pointer" />
                      <input type="text" className="form-input flex-1" value={form[col.key] || ''} onChange={e => setForm({...form, [col.key]: e.target.value})} />
                    </div>
                  ) : col.type === 'number' ? (
                    <input type="number" className="form-input" value={form[col.key] || ''} onChange={e => setForm({...form, [col.key]: e.target.value})} />
                  ) : (
                    <input type="text" className="form-input" value={form[col.key] || ''} onChange={e => setForm({...form, [col.key]: e.target.value})} required={col.required} />
                  )}
                </div>
              ))}
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

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Settings className="w-6 h-6" /> Configuración</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CrudSection title="Especialidades" icon={Tag} tableName="especialidades" columns={[
          { key: 'nombre', label: 'Nombre', type: 'text', required: true },
          { key: 'activo', label: 'Activo', type: 'checkbox', default: true },
        ]} />

        <CrudSection title="Coberturas" icon={Shield} tableName="coberturas" columns={[
          { key: 'nombre', label: 'Nombre', type: 'text', required: true },
          { key: 'codigo', label: 'Código', type: 'text' },
          { key: 'activo', label: 'Activo', type: 'checkbox', default: true },
        ]} />

        <CrudSection title="Prestaciones" icon={Palette} tableName="prestaciones" colorField="color_hex" columns={[
          { key: 'nombre', label: 'Nombre', type: 'text', required: true },
          { key: 'duracion_minutos', label: 'Duración (min)', type: 'number', default: 30 },
          { key: 'precio_base', label: 'Precio base', type: 'number' },
          { key: 'color_hex', label: 'Color', type: 'color', default: '#3B82F6' },
          { key: 'activo', label: 'Activo', type: 'checkbox', default: true },
        ]} />

        <UserManagement />
      </div>
    </div>
  )
}

function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', rol: 'secretaria' })

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data: { users: u } } = await supabase.auth.admin.listUsers()
    setUsers(u || [])
    setLoading(false)
  }

  async function createUser(e) {
    e.preventDefault()
    try {
      const { error } = await supabase.auth.admin.createUser({
        email: form.email, password: form.password,
        email_confirm: true, user_metadata: { rol: form.rol }
      })
      if (error) throw error
      toast.success('Usuario creado')
      setShowForm(false)
      setForm({ email: '', password: '', rol: 'secretaria' })
      fetchUsers()
    } catch (err) { toast.error(err.message) }
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Users className="w-5 h-5 text-[#1B4F72]" /> Usuarios</h3>
        <button onClick={() => setShowForm(true)} className="btn-secondary text-sm py-1.5"><Plus className="w-3.5 h-3.5" /> Nuevo</button>
      </div>
      {loading ? <div className="space-y-2">{[...Array(3)].map((_,i)=><div key={i} className="h-10 skeleton rounded"></div>)}</div> : (
        <div className="space-y-1">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
              <div>
                <p className="font-medium text-sm">{u.email}</p>
                <p className="text-xs text-gray-400 capitalize">{u.user_metadata?.rol || 'sin rol'}</p>
              </div>
              <span className={`badge ${u.email_confirmed_at ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {u.email_confirmed_at ? 'Activo' : 'Pendiente'}
              </span>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content w-full max-w-md p-6 m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Nuevo Usuario</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={createUser} className="space-y-4">
              <div className="form-group"><label className="form-label">Email *</label><input type="email" className="form-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Contraseña *</label><input type="password" className="form-input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required minLength={6} /></div>
              <div className="form-group">
                <label className="form-label">Rol *</label>
                <select className="form-input" value={form.rol} onChange={e => setForm({...form, rol: e.target.value})}>
                  <option value="admin">Admin</option>
                  <option value="secretaria">Secretaria</option>
                  <option value="profesional">Profesional</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary"><Save className="w-4 h-4" /> Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
