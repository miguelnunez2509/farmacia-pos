'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft } from 'lucide-react'

export default function NewCustomerPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    document_id: '',
    phone: '',
    email: '',
    address: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    setLoading(true)
    setError('')

    const { error: err } = await supabase.from('customers').insert({
      name: form.name.trim(),
      document_id: form.document_id.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
    })

    if (err) { setError(err.message); setLoading(false); return }
    router.push('/customers')
  }

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="p-6 max-w-xl">
      <Link href="/customers" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft className="h-4 w-4" />
        Volver a Clientes
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nuevo Cliente</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}
        <div>
          <label className={labelClass}>Nombre completo <span className="text-red-500">*</span></label>
          <input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Cédula / Documento</label>
            <input className={inputClass} value={form.document_id} onChange={e => set('document_id', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input className={inputClass} value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input className={inputClass} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Dirección</label>
          <input className={inputClass} value={form.address} onChange={e => set('address', e.target.value)} />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? 'Guardando...' : 'Crear cliente'}
          </button>
          <Link href="/customers" className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
