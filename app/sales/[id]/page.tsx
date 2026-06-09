'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Sale } from '@/lib/types'
import { ChevronLeft, Printer } from 'lucide-react'

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('sales')
      .select('*, customers(*), sale_items(*), payments(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => { setSale(data as Sale); setLoading(false) })
  }, [id])

  if (loading) return <div className="p-6 text-gray-400 text-sm">Cargando...</div>
  if (!sale) return <div className="p-6 text-red-500 text-sm">Venta no encontrada</div>

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <Link href="/sales" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" />
          Volver a Ventas
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 no-print"
        >
          <Printer className="h-4 w-4" />
          Imprimir
        </button>
      </div>

      <div id="receipt-print" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 text-center">
          <h1 className="text-2xl font-bold text-gray-900">FARMACIA POS</h1>
          <p className="text-sm text-gray-500 mt-1">{formatDate(sale.created_at)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Venta # {sale.id.slice(-8).toUpperCase()}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cliente</p>
            <p className="text-gray-900">
              {(sale.customers as unknown as { name: string })?.name ?? 'Cliente de mostrador'}
            </p>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Productos</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 font-medium text-gray-600">Producto</th>
                  <th className="text-center py-1.5 font-medium text-gray-600 w-16">Cant.</th>
                  <th className="text-right py-1.5 font-medium text-gray-600 w-24">Precio</th>
                  <th className="text-right py-1.5 font-medium text-gray-600 w-24">Desc.</th>
                  <th className="text-right py-1.5 font-medium text-gray-600 w-24">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sale.sale_items?.map(item => (
                  <tr key={item.id}>
                    <td className="py-2 text-gray-900 font-medium">{item.product_name}</td>
                    <td className="py-2 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-2 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                    <td className="py-2 text-right text-red-500">
                      {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '—'}
                    </td>
                    <td className="py-2 text-right font-semibold text-gray-900">{formatCurrency(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount_total > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Descuento</span>
                <span>-{formatCurrency(sale.discount_total)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg text-gray-900 pt-1">
              <span>TOTAL</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
          </div>

          {/* Payments */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pagos recibidos</p>
            <div className="space-y-1">
              {sale.payments?.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600">{PAYMENT_LABELS[p.method] ?? p.method}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(p.amount)}</span>
                </div>
              ))}
              {(sale.payments?.reduce((s, p) => s + p.amount, 0) ?? 0) > sale.total && (
                <div className="flex justify-between text-sm text-blue-600 font-medium pt-1 border-t border-gray-200">
                  <span>Cambio entregado</span>
                  <span>{formatCurrency((sale.payments?.reduce((s, p) => s + p.amount, 0) ?? 0) - sale.total)}</span>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 pt-2 border-t border-gray-200">
            ¡Gracias por su compra! — Farmacia POS
          </p>
        </div>
      </div>
    </div>
  )
}
