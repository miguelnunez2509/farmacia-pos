'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Product, Category } from '@/lib/types'
import { ChevronLeft, Plus } from 'lucide-react'

interface ProductFormProps {
  product?: Product
}

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)

  const [form, setForm] = useState({
    barcode: product?.barcode ?? '',
    name: product?.name ?? '',
    generic_name: product?.generic_name ?? '',
    description: product?.description ?? '',
    category_id: product?.category_id ?? '',
    manufacturer: product?.manufacturer ?? '',
    requires_prescription: product?.requires_prescription ?? false,
    unit: product?.unit ?? 'unidad',
    sale_price: product?.sale_price?.toString() ?? '',
    cost_price: product?.cost_price?.toString() ?? '',
    stock: product?.stock?.toString() ?? '0',
    min_stock: product?.min_stock?.toString() ?? '0',
    active: product?.active ?? true,
  })

  useEffect(() => {
    supabase.from('categories').select('*').order('name')
      .then(({ data }) => setCategories((data as Category[]) ?? []))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return
    const { data, error: catError } = await supabase
      .from('categories')
      .insert({ name: newCategoryName.trim() })
      .select()
      .single()
    if (catError) { setError(catError.message); return }
    if (data) {
      setCategories(prev => [...prev, data as Category])
      set('category_id', (data as Category).id)
      setNewCategoryName('')
      setShowNewCategory(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    setLoading(true)
    setError('')

    const payload = {
      barcode: form.barcode.trim() || null,
      name: form.name.trim(),
      generic_name: form.generic_name.trim() || null,
      description: form.description.trim() || null,
      category_id: form.category_id || null,
      manufacturer: form.manufacturer.trim() || null,
      requires_prescription: form.requires_prescription,
      unit: form.unit,
      sale_price: parseFloat(form.sale_price) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      stock: parseInt(form.stock) || 0,
      min_stock: parseInt(form.min_stock) || 0,
      active: form.active,
      updated_at: new Date().toISOString(),
    }

    if (product) {
      const { error: updateError } = await supabase.from('products').update(payload).eq('id', product.id)
      if (updateError) { setError(updateError.message); setLoading(false); return }

      const stockDiff = (parseInt(form.stock) || 0) - product.stock
      if (stockDiff !== 0) {
        await supabase.from('inventory_movements').insert({
          product_id: product.id,
          change: stockDiff,
          reason: 'ajuste',
          note: 'Ajuste desde edición de producto',
        })
      }
    } else {
      const { data: newProduct, error: insertError } = await supabase
        .from('products').insert(payload).select().single()
      if (insertError) { setError(insertError.message); setLoading(false); return }

      if (payload.stock > 0 && newProduct) {
        await supabase.from('inventory_movements').insert({
          product_id: (newProduct as Product).id,
          change: payload.stock,
          reason: 'compra',
          note: 'Stock inicial del producto',
        })
      }
    }

    router.push('/products')
    router.refresh()
  }

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Link href="/products" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ChevronLeft className="h-4 w-4" />
          Volver a Productos
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {product ? 'Editar Producto' : 'Nuevo Producto'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Nombre <span className="text-red-500">*</span></label>
            <input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Principio activo / Nombre genérico</label>
            <input className={inputClass} value={form.generic_name} onChange={e => set('generic_name', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Código de barras</label>
            <input className={inputClass} value={form.barcode} onChange={e => set('barcode', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Laboratorio / Fabricante</label>
            <input className={inputClass} value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Unidad</label>
            <select className={inputClass} value={form.unit} onChange={e => set('unit', e.target.value)}>
              {['unidad', 'caja', 'frasco', 'tableta', 'ampolla', 'sobre', 'tubo', 'pomo', 'rollo'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className={labelClass}>Categoría</label>
          <div className="flex gap-2">
            <select className={`${inputClass} flex-1`} value={form.category_id} onChange={e => set('category_id', e.target.value)}>
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setShowNewCategory(!showNewCategory)}
              className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {showNewCategory && (
            <div className="flex gap-2 mt-2">
              <input
                className={`${inputClass} flex-1`}
                placeholder="Nueva categoría..."
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory() } }}
              />
              <button
                type="button"
                onClick={handleCreateCategory}
                className="px-3 py-2 bg-green-700 text-white rounded-lg text-sm hover:bg-green-800"
              >
                Crear
              </button>
            </div>
          )}
        </div>

        {/* Prices & Stock */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Precio de venta ($) <span className="text-red-500">*</span></label>
            <input
              className={inputClass} type="number" min="0" step="0.01"
              value={form.sale_price} onChange={e => set('sale_price', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Precio de costo ($)</label>
            <input
              className={inputClass} type="number" min="0" step="0.01"
              value={form.cost_price} onChange={e => set('cost_price', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{product ? 'Stock actual' : 'Stock inicial'}</label>
            <input
              className={inputClass} type="number" min="0"
              value={form.stock} onChange={e => set('stock', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Stock mínimo</label>
            <input
              className={inputClass} type="number" min="0"
              value={form.min_stock} onChange={e => set('min_stock', e.target.value)}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>Descripción</label>
          <textarea
            className={`${inputClass} resize-none`}
            rows={3}
            value={form.description}
            onChange={e => set('description', e.target.value)}
          />
        </div>

        {/* Toggles */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.requires_prescription}
              onChange={e => set('requires_prescription', e.target.checked)}
              className="h-4 w-4 rounded text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">Requiere receta médica</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => set('active', e.target.checked)}
              className="h-4 w-4 rounded text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">Producto activo</span>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? 'Guardando...' : (product ? 'Guardar cambios' : 'Crear producto')}
          </button>
          <Link href="/products" className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
