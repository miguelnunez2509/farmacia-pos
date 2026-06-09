'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ProductForm from '@/components/products/product-form'
import type { Product } from '@/lib/types'

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('products').select('*, categories(name)').eq('id', id).single()
      .then(({ data }) => { setProduct(data as Product); setLoading(false) })
  }, [id])

  if (loading) return <div className="p-6 text-gray-400 text-sm">Cargando...</div>
  if (!product) return <div className="p-6 text-red-500 text-sm">Producto no encontrado</div>

  return <ProductForm product={product} />
}
