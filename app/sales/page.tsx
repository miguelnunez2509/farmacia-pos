'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/page-header'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Sale } from '@/lib/types'
import { Receipt, ExternalLink } from 'lucide-react'

export default function SalesPage() {
  const supabase = createClient()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('sales')
      .select('*, customers(name), sale_items(product_name, quantity, line_total), payments(method, amount)')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => { setSales((data as Sale[]) ?? []); setLoading(false) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totalToday = sales
    .filter(s => new Date(s.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + s.total, 0)

  return (
    <div className="p-6">
      <PageHeader
        title="Ventas"
        description="Historial de transacciones"
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Ventas hoy</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {sales.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString()).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Ingresos hoy</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{formatCurrency(totalToday)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total registradas</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{sales.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Cargando ventas...</div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Receipt className="h-10 w-10 mb-3 opacity-30" />
            <p>No hay ventas registradas</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Productos</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pago</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sales.map(sale => {
                const payMethods = [...new Set(sale.payments?.map(p => p.method) ?? [])].join(' + ')
                const itemNames = sale.sale_items?.map(i => `${i.product_name} (${i.quantity})`).join(', ')
                return (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(sale.created_at)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {(sale.customers as unknown as { name: string })?.name ?? (
                        <span className="text-gray-400 italic">Mostrador</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={itemNames}>{itemNames}</td>
                    <td className="px-4 py-3">
                      {payMethods && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 capitalize">
                          {payMethods}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(sale.total)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/sales/${sale.id}`}
                        className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 inline-flex transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
