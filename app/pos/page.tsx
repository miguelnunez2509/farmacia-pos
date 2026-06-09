'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Product, Customer, CartItem, PaymentEntry } from '@/lib/types'
import {
  Search, ShoppingCart, X, Plus, Minus, Trash2, User, CreditCard,
  Banknote, Send, Printer, CheckCircle, ChevronDown
} from 'lucide-react'

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

interface CompletedSale {
  id: string
  date: string
  customer: Customer | null
  items: CartItem[]
  payments: PaymentEntry[]
  subtotal: number
  discountTotal: number
  total: number
}

export default function POSPage() {
  const supabase = createClient()

  // Product search
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Cart
  const [cart, setCart] = useState<CartItem[]>([])

  // Customer
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [showCustomers, setShowCustomers] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Payment
  const [payments, setPayments] = useState<PaymentEntry[]>([])
  const [payMethod, setPayMethod] = useState<PaymentEntry['method']>('efectivo')
  const [payAmount, setPayAmount] = useState('')

  // State
  const [processing, setProcessing] = useState(false)
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null)

  // Computed totals
  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const discountTotal = cart.reduce((s, i) => s + i.discount * i.quantity, 0)
  const total = subtotal - discountTotal
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0)
  const remaining = total - paidTotal
  const change = paidTotal > total ? paidTotal - total : 0

  // Product search
  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); setShowResults(false); return }
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .or(`name.ilike.%${q}%,barcode.ilike.%${q}%,generic_name.ilike.%${q}%`)
      .order('name')
      .limit(10)
    setSearchResults((data as Product[]) ?? [])
    setShowResults(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(search), 250)
    return () => clearTimeout(timer)
  }, [search, searchProducts])

  // Customer search
  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim()) { setCustomerResults([]); setShowCustomers(false); return }
    const { data } = await supabase
      .from('customers')
      .select('*')
      .or(`name.ilike.%${q}%,document_id.ilike.%${q}%`)
      .limit(8)
    setCustomerResults((data as Customer[]) ?? [])
    setShowCustomers(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => searchCustomers(customerSearch), 250)
    return () => clearTimeout(timer)
  }, [customerSearch, searchCustomers])

  function addToCart(product: Product) {
    if (product.stock <= 0) { alert(`Sin stock disponible para "${product.name}"`); return }
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Stock máximo disponible: ${product.stock}`)
          return prev
        }
        return prev.map(i => i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1, line_total: (i.unit_price - i.discount) * (i.quantity + 1) }
          : i
        )
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        unit: product.unit,
        unit_price: product.sale_price,
        quantity: 1,
        discount: 0,
        line_total: product.sale_price,
        stock: product.stock,
      }]
    })
    setSearch('')
    setShowResults(false)
    searchRef.current?.focus()
  }

  function updateQuantity(productId: string, qty: number) {
    setCart(prev => prev.map(i => {
      if (i.product_id !== productId) return i
      const q = Math.max(1, Math.min(qty, i.stock))
      return { ...i, quantity: q, line_total: (i.unit_price - i.discount) * q }
    }))
  }

  function updateDiscount(productId: string, discount: number) {
    setCart(prev => prev.map(i => {
      if (i.product_id !== productId) return i
      const d = Math.max(0, Math.min(discount, i.unit_price))
      return { ...i, discount: d, line_total: (i.unit_price - d) * i.quantity }
    }))
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(i => i.product_id !== productId))
  }

  function addPayment() {
    const amt = parseFloat(payAmount)
    if (!amt || amt <= 0) return
    setPayments(prev => [...prev, { method: payMethod, amount: amt }])
    setPayAmount('')
  }

  function addExactPayment() {
    if (remaining <= 0) return
    setPayments(prev => [...prev, { method: payMethod, amount: Math.ceil(remaining * 100) / 100 }])
    setPayAmount('')
  }

  async function checkout() {
    if (cart.length === 0) { alert('Agrega productos al carrito'); return }
    if (remaining > 0.009) { alert('El pago no cubre el total'); return }
    setProcessing(true)

    const items = cart.map(i => ({
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      discount: i.discount,
      line_total: i.line_total,
    }))

    const { data, error } = await supabase.rpc('create_sale', {
      p_customer_id: selectedCustomer?.id ?? null,
      p_items: items,
      p_payments: payments,
      p_subtotal: subtotal,
      p_discount_total: discountTotal,
      p_total: total,
    })

    if (error) {
      alert('Error al procesar la venta: ' + error.message)
      setProcessing(false)
      return
    }

    setCompletedSale({
      id: data as string,
      date: new Date().toISOString(),
      customer: selectedCustomer,
      items: [...cart],
      payments: [...payments],
      subtotal,
      discountTotal,
      total,
    })

    setCart([])
    setPayments([])
    setSelectedCustomer(null)
    setCustomerSearch('')
    setProcessing(false)
  }

  function newSale() {
    setCompletedSale(null)
    searchRef.current?.focus()
  }

  return (
    <div className="flex h-full">
      {/* Left: Search + Cart */}
      <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
        {/* Search bar */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && searchResults.length === 1) addToCart(searchResults[0])
                if (e.key === 'Escape') { setSearch(''); setShowResults(false) }
              }}
              placeholder="Buscar por nombre, código de barras o principio activo..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
            {search && (
              <button onClick={() => { setSearch(''); setShowResults(false) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Search Results */}
          {showResults && searchResults.length > 0 && (
            <div ref={resultsRef} className="absolute z-20 mt-1 w-auto left-4 right-4 md:right-auto md:w-96 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {searchResults.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-green-50 text-left transition-colors border-b border-gray-100 last:border-0"
                >
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{product.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {product.barcode && <span className="font-mono mr-2">{product.barcode}</span>}
                      {product.generic_name && <span>{product.generic_name}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="font-semibold text-green-700 text-sm">{formatCurrency(product.sale_price)}</div>
                    <div className={`text-xs ${product.stock <= product.min_stock ? 'text-orange-500' : 'text-gray-400'}`}>
                      Stock: {product.stock}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {showResults && search && searchResults.length === 0 && (
            <div className="absolute z-20 mt-1 left-4 right-4 md:right-auto md:w-96 bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3 text-sm text-gray-400">
              Sin resultados para &quot;{search}&quot;
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <ShoppingCart className="h-16 w-16 mb-3" />
              <p className="font-medium text-gray-400">El carrito está vacío</p>
              <p className="text-sm text-gray-300 mt-1">Busca un producto para comenzar</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Producto</th>
                  <th className="text-center px-2 py-2.5 font-medium text-gray-600 w-28">Cantidad</th>
                  <th className="text-right px-2 py-2.5 font-medium text-gray-600 w-24">Precio</th>
                  <th className="text-right px-2 py-2.5 font-medium text-gray-600 w-24">Desc. $</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600 w-24">Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cart.map(item => (
                  <tr key={item.product_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">{item.product_name}</div>
                      <div className="text-xs text-gray-400">{item.unit}</div>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="h-6 w-6 rounded border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number" min="1" max={item.stock}
                          value={item.quantity}
                          onChange={e => updateQuantity(item.product_id, parseInt(e.target.value) || 1)}
                          className="w-12 text-center border border-gray-300 rounded text-sm py-0.5 focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="h-6 w-6 rounded border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                    <td className="px-2 py-2.5">
                      <input
                        type="number" min="0" step="0.01" max={item.unit_price}
                        value={item.discount || ''}
                        onChange={e => updateDiscount(item.product_id, parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full text-right border border-gray-300 rounded text-sm px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{formatCurrency(item.line_total)}</td>
                    <td className="pr-2 py-2.5">
                      <button onClick={() => removeFromCart(item.product_id)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Cart totals */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Descuento</span>
                  <span>-{formatCurrency(discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg text-gray-900 pt-1 border-t border-gray-200">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Customer + Payment */}
      <div className="w-80 flex flex-col bg-white overflow-y-auto">
        {/* Customer */}
        <div className="p-4 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cliente</p>
          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-green-700" />
                <span className="text-sm font-medium text-green-900">{selectedCustomer.name}</span>
              </div>
              <button onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }} className="text-green-400 hover:text-green-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                onFocus={() => customerSearch && setShowCustomers(true)}
                placeholder="Cliente de mostrador"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {showCustomers && customerResults.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                  {customerResults.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomers(false) }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <div className="font-medium text-gray-900">{c.name}</div>
                      {c.document_id && <div className="text-xs text-gray-400">{c.document_id}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="p-4 border-b border-gray-200 flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Forma de pago</p>

          {/* Method selector */}
          <div className="grid grid-cols-3 gap-1 mb-3">
            {(['efectivo', 'tarjeta', 'transferencia'] as const).map(method => (
              <button
                key={method}
                onClick={() => setPayMethod(method)}
                className={`flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  payMethod === method ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {method === 'efectivo' ? <Banknote className="h-4 w-4" /> : method === 'tarjeta' ? <CreditCard className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                {PAYMENT_LABELS[method]}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-2">
            <input
              type="number" min="0" step="0.01"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addPayment() }}
              placeholder="Monto..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button onClick={addPayment} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition-colors">
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {remaining > 0 && (
            <button
              onClick={addExactPayment}
              className="w-full text-left text-xs text-green-700 hover:text-green-800 mb-3 flex items-center gap-1"
            >
              <ChevronDown className="h-3 w-3" />
              Agregar {formatCurrency(remaining)} exactos
            </button>
          )}

          {/* Payments list */}
          <div className="space-y-1.5">
            {payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-600">{PAYMENT_LABELS[p.method]}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(p.amount)}</span>
                  <button onClick={() => setPayments(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Payment summary */}
          {payments.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Total a pagar</span>
                <span className="font-medium">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Pagado</span>
                <span className="font-medium text-green-700">{formatCurrency(paidTotal)}</span>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between text-orange-600 font-medium">
                  <span>Pendiente</span>
                  <span>{formatCurrency(remaining)}</span>
                </div>
              )}
              {change > 0 && (
                <div className="flex justify-between text-blue-600 font-medium">
                  <span>Cambio</span>
                  <span>{formatCurrency(change)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Checkout button */}
        <div className="p-4">
          <button
            onClick={checkout}
            disabled={processing || cart.length === 0 || remaining > 0.009}
            className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-semibold text-base transition-colors"
          >
            {processing ? 'Procesando...' : `Cobrar ${cart.length > 0 ? formatCurrency(total) : ''}`}
          </button>
          {cart.length > 0 && remaining > 0.009 && (
            <p className="text-center text-xs text-orange-500 mt-2">
              Faltan {formatCurrency(remaining)} por cubrir
            </p>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {completedSale && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 text-center border-b border-gray-200">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">¡Venta completada!</h2>
              <p className="text-sm text-gray-500 mt-1"># {completedSale.id.slice(-8).toUpperCase()}</p>
            </div>

            {/* Receipt content */}
            <div id="receipt-content" className="p-6">
              <div className="text-center mb-4">
                <h3 className="font-bold text-lg">FARMACIA POS</h3>
                <p className="text-xs text-gray-500">{formatDate(completedSale.date)}</p>
                {completedSale.customer && (
                  <p className="text-sm text-gray-600 mt-1">Cliente: {completedSale.customer.name}</p>
                )}
              </div>

              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1 font-medium text-gray-600">Producto</th>
                    <th className="text-center py-1 font-medium text-gray-600">Cant.</th>
                    <th className="text-right py-1 font-medium text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {completedSale.items.map(item => (
                    <tr key={item.product_id} className="border-b border-gray-100">
                      <td className="py-1.5">
                        <div>{item.product_name}</div>
                        <div className="text-xs text-gray-400">{formatCurrency(item.unit_price)} c/u{item.discount > 0 ? ` - ${formatCurrency(item.discount)} desc.` : ''}</div>
                      </td>
                      <td className="py-1.5 text-center">{item.quantity}</td>
                      <td className="py-1.5 text-right font-medium">{formatCurrency(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-1 text-sm border-t border-gray-200 pt-3">
                {completedSale.discountTotal > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Descuento</span>
                    <span>-{formatCurrency(completedSale.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base">
                  <span>TOTAL</span>
                  <span>{formatCurrency(completedSale.total)}</span>
                </div>
                <div className="pt-2 space-y-0.5">
                  {completedSale.payments.map((p, i) => (
                    <div key={i} className="flex justify-between text-gray-600">
                      <span>{PAYMENT_LABELS[p.method]}</span>
                      <span>{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                  {completedSale.payments.reduce((s, p) => s + p.amount, 0) > completedSale.total && (
                    <div className="flex justify-between text-blue-600 font-medium">
                      <span>Cambio</span>
                      <span>{formatCurrency(completedSale.payments.reduce((s, p) => s + p.amount, 0) - completedSale.total)}</span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-center text-xs text-gray-400 mt-4">¡Gracias por su compra!</p>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-300 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </button>
              <button
                onClick={newSale}
                className="flex-1 bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                Nueva venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
