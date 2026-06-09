'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/page-header'
import { formatDateShort } from '@/lib/format'
import type { Customer } from '@/lib/types'
import { Plus, Search, Users, ExternalLink } from 'lucide-react'

export default function CustomersPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('customers').select('*').order('name')
    if (search) query = query.or(`name.ilike.%${search}%,document_id.ilike.%${search}%,phone.ilike.%${search}%`)
    const { data } = await query
    setCustomers((data as Customer[]) ?? [])
    setLoading(false)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, 300)
    return () => clearTimeout(timer)
  }, [fetchCustomers])

  return (
    <div className="p-6">
      <PageHeader
        title="Clientes"
        description={`${customers.length} clientes registrados`}
        action={
          <Link
            href="/customers/new"
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </Link>
        }
      />

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, documento o teléfono..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Cargando...</div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">No se encontraron clientes</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Documento</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Registrado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map(customer => (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{customer.name}</td>
                  <td className="px-4 py-3 text-gray-500">{customer.document_id ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{customer.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{customer.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDateShort(customer.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                        title="Ver detalle"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
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
