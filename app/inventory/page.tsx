'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/page-header'
import type { Product, Category, InventoryMovement } from '@/lib/types'
import { formatDate } from '@/lib/format'
import { AlertTriangle, Search, X, BarChart3 } from 'lucide-react'

type StockFilter = 'all' | 'low' | 'out'

interface AdjustModal {
  product: Product
  type: 'entrada' | 'salida'
  quantity: string
  note: string
}

export default function InventoryPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StockFilter>('all')
  const [modal, setModal] = useState<AdjustModal | null>(null)
  const [adjusting, setAdjusting] = useState(false)
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [movementsProduct, setMovementsProduct] = useState<Product | null>(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('products').select('*, categories(name)').order('name')
    if (search) query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%`)
    const { data } = await query
    let list = (data as Product[]) ?? []
    if (filter === 'low') list = list.filter(p => p.stock > 0 && p.stock <= p.min_stock)
    if (filter === 'out') list = list.filter(p => p.stock === 0)
    setProducts(list)
    setLoading(false)
  }, [search, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300)
    return () => clearTimeout(timer)
  }, [fetchProducts])

  async function handleAdjust() {
    if (!modal) return
    const qty = parseInt(modal.quantity)
    if (!qty || qty <= 0) return
    setAdjusting(true)

    const change = modal.type === 'entrada' ? qty : -qty
    const newStock = modal.product.stock + change

    if (newStock < 0) {
      alert('El stock no puede ser negativo')
      setAdjusting(false)
      return
    }

    await supabase.from('products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', modal.product.id)
    await supabase.from('inventory_movements').insert({
      product_id: modal.product.id,
      change,
      reason: modal.type === 'entrada' ? 'compra' : 'ajuste',
      note: modal.note || null,
    })

    setModal(null)
    setAdjusting(false)
    fetchProducts()
  }

  async function viewMovements(product: Product) {
    setMovementsProduct(product)
    const { data } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setMovements((data as InventoryMovement[]) ?? [])
  }

  const totalProducts = products.length
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.min_stock).length
  const outOfStock = products.filter(p => p.stock === 0).length

  return (
    <div className="p-6">
      <PageHeader title="Inventario" description="Control de stock y movimientos" />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total productos', value: totalProducts, color: 'text-gray-900', bg: 'bg-white' },
          { label: 'Stock bajo', value: lowStock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Sin stock', value: outOfStock, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} rounded-xl border border-gray-200 p-4`}>
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
          {(['all', 'low', 'out'] as StockFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 transition-colors ${filter === f ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {f === 'all' ? 'Todos' : f === 'low' ? 'Stock bajo' : 'Sin stock'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Cargando...</div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <BarChart3 className="h-10 w-10 mb-3 opacity-30" />
            <p>No hay productos con este filtro</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Producto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Stock actual</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Stock mínimo</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(product => {
                const stockStatus = product.stock === 0 ? 'out' : product.stock <= product.min_stock ? 'low' : 'ok'
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {stockStatus !== 'ok' && <AlertTriangle className={`h-4 w-4 shrink-0 ${stockStatus === 'out' ? 'text-red-500' : 'text-orange-400'}`} />}
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          {product.barcode && <div className="text-xs text-gray-400 font-mono">{product.barcode}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {(product.categories as unknown as Category)?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-lg font-bold ${stockStatus === 'out' ? 'text-red-600' : stockStatus === 'low' ? 'text-orange-500' : 'text-gray-900'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{product.min_stock}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        stockStatus === 'ok' ? 'bg-green-100 text-green-800' :
                        stockStatus === 'low' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {stockStatus === 'ok' ? 'Normal' : stockStatus === 'low' ? 'Bajo' : 'Agotado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setModal({ product, type: 'entrada', quantity: '', note: '' })}
                          className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-medium transition-colors"
                        >
                          Entrada
                        </button>
                        <button
                          onClick={() => setModal({ product, type: 'salida', quantity: '', note: '' })}
                          className="px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded text-xs font-medium transition-colors"
                        >
                          Salida
                        </button>
                        <button
                          onClick={() => viewMovements(product)}
                          className="px-3 py-1.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded text-xs font-medium transition-colors"
                        >
                          Historial
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Adjust Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                {modal.type === 'entrada' ? 'Entrada de stock' : 'Salida de stock'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Producto: <strong>{modal.product.name}</strong> — Stock actual: <strong>{modal.product.stock}</strong>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                <input
                  type="number" min="1"
                  value={modal.quantity}
                  onChange={e => setModal(m => m ? { ...m, quantity: e.target.value } : null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
                <input
                  type="text"
                  value={modal.note}
                  onChange={e => setModal(m => m ? { ...m, note: e.target.value } : null)}
                  placeholder="Ej: Compra a proveedor..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleAdjust}
                disabled={adjusting || !modal.quantity}
                className={`flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60 ${
                  modal.type === 'entrada' ? 'bg-green-700 hover:bg-green-800' : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {adjusting ? 'Guardando...' : `Registrar ${modal.type}`}
              </button>
              <button onClick={() => setModal(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movements Modal */}
      {movementsProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                Historial — {movementsProduct.name}
              </h2>
              <button onClick={() => setMovementsProduct(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {movements.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Sin movimientos registrados</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Fecha</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Razón</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Cambio</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {movements.map(m => (
                      <tr key={m.id}>
                        <td className="px-3 py-2 text-gray-500 text-xs">{formatDate(m.created_at)}</td>
                        <td className="px-3 py-2 capitalize text-gray-700">{m.reason}</td>
                        <td className={`px-3 py-2 text-right font-medium ${m.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {m.change > 0 ? '+' : ''}{m.change}
                        </td>
                        <td className="px-3 py-2 text-gray-400 text-xs">{m.note ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
