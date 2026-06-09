'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Customer, Sale } from '@/lib/types'
import { ChevronLeft, User, Phone, Mail, MapPin, FileText, ShoppingBag } from 'lucide-react'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', document_id: '', phone: '', email: '', address: '' })

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: s }] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id).single(),
        supabase.from('sales')
          .select('*, sale_items(*), payments(*)')
          .eq('customer_id', id)
          .order('created_at', { ascending: false }),
      ])
      if (c) {
        setCustomer(c as Customer)
        setForm({
          name: (c as Customer).name,
          document_id: (c as Customer).document_id ?? '',
          phone: (c as Customer).phone ?? '',
          email: (c as Customer).email ?? '',
          address: (c as Customer).address ?? '',
        })
      }
      setSales((s as Sale[]) ?? [])
      setLoading(false)
    }
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setSaving(true)
    const { data } = await supabase.from('customers').update({
      name: form.name.trim(),
      document_id: form.document_id.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
    }).eq('id', id).select().single()
    if (data) setCustomer(data as Customer)
    setSaving(false)
    setEditing(false)
  }

  if (loading) return <div className="p-6 text-gray-400 text-sm">Cargando...</div>
  if (!customer) return <div className="p-6 text-red-500 text-sm">Cliente no encontrado</div>

  const totalSpent = sales.reduce((sum, s) => sum + s.total, 0)
  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <div className="p-6 max-w-4xl">
      <Link href="/customers" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="h-4 w-4" />
        Volver a Clientes
      </Link>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Customer Info */}
        <div className="col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Información</h2>
            {!editing && (
              <button onClick={() => setEditing(true)} className="text-sm text-green-700 hover:text-green-800">
                Editar
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              {[
                { field: 'name', label: 'Nombre' },
                { field: 'document_id', label: 'Documento' },
                { field: 'phone', label: 'Teléfono' },
                { field: 'email', label: 'Email' },
                { field: 'address', label: 'Dirección' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">{label}</label>
                  <input
                    className={inputClass}
                    value={form[field as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button onClick={handleSave} disabled={saving} className="flex-1 bg-green-700 text-white py-1.5 rounded-lg text-sm hover:bg-green-800 disabled:opacity-60">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button onClick={() => setEditing(false)} className="flex-1 border border-gray-300 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="font-medium text-gray-900">{customer.name}</span>
              </div>
              {customer.document_id && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                  {customer.document_id}
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                  {customer.phone}
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  {customer.email}
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                  {customer.address}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="col-span-2 grid grid-cols-2 gap-4 content-start">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Total compras</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{sales.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Total gastado</p>
            <p className="text-3xl font-bold text-green-700 mt-1">{formatCurrency(totalSpent)}</p>
          </div>
        </div>
      </div>

      {/* Purchase History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Historial de compras</h2>
        </div>
        {sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <ShoppingBag className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">Sin compras registradas</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Productos</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Subtotal</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Descuento</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sales.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(sale.created_at)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {sale.sale_items?.map(i => i.product_name).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(sale.subtotal)}</td>
                  <td className="px-4 py-3 text-right text-red-500">
                    {sale.discount_total > 0 ? `-${formatCurrency(sale.discount_total)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(sale.total)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/sales/${sale.id}`} className="text-green-700 hover:text-green-800 text-xs font-medium">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
