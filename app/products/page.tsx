'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/page-header'
import { formatCurrency } from '@/lib/format'
import type { Product, Category } from '@/lib/types'
import { Plus, Search, Edit, Eye, EyeOff, Package } from 'lucide-react'

export default function ProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('products')
      .select('*, categories(name)')
      .order('name')

    if (search) query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%,generic_name.ilike.%${search}%`)
    if (categoryFilter) query = query.eq('category_id', categoryFilter)

    const { data } = await query
    setProducts((data as Product[]) ?? [])
    setLoading(false)
  }, [search, categoryFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase.from('categories').select('*').order('name')
      .then(({ data }) => setCategories((data as Category[]) ?? []))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300)
    return () => clearTimeout(timer)
  }, [fetchProducts])

  async function toggleActive(product: Product) {
    await supabase
      .from('products')
      .update({ active: !product.active, updated_at: new Date().toISOString() })
      .eq('id', product.id)
    fetchProducts()
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Productos"
        description={`${products.length} productos en catálogo`}
        action={
          <Link
            href="/products/new"
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </Link>
        }
      />

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, código o principio activo..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">Todas las categorías</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            Cargando productos...
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Package className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">No se encontraron productos</p>
            <p className="text-sm mt-1">
              {search || categoryFilter ? 'Intenta con otros filtros' : 'Crea tu primer producto'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Producto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Código</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Unidad</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Precio</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Stock</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(product => (
                <tr key={product.id} className={`hover:bg-gray-50 transition-colors ${!product.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    {product.generic_name && (
                      <div className="text-xs text-gray-400">{product.generic_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{product.barcode ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {(product.categories as unknown as Category)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{product.unit}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(product.sale_price)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${product.stock <= product.min_stock ? 'text-red-600' : 'text-gray-900'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        product.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {product.active ? 'Activo' : 'Inactivo'}
                      </span>
                      {product.requires_prescription && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          Receta
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/products/${product.id}/edit`}
                        className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => toggleActive(product)}
                        className="p-1.5 rounded text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                        title={product.active ? 'Desactivar' : 'Activar'}
                      >
                        {product.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
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
