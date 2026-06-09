export type Category = {
  id: string
  name: string
  created_at: string
}

export type Product = {
  id: string
  barcode: string | null
  name: string
  generic_name: string | null
  description: string | null
  category_id: string | null
  manufacturer: string | null
  requires_prescription: boolean
  unit: string
  sale_price: number
  cost_price: number
  stock: number
  min_stock: number
  active: boolean
  created_at: string
  updated_at: string
  categories?: Category | null
}

export type Customer = {
  id: string
  name: string
  document_id: string | null
  phone: string | null
  email: string | null
  address: string | null
  created_at: string
}

export type Sale = {
  id: string
  customer_id: string | null
  subtotal: number
  discount_total: number
  tax_total: number
  total: number
  status: string
  created_at: string
  customers?: Customer | null
  sale_items?: SaleItem[]
  payments?: Payment[]
}

export type SaleItem = {
  id: string
  sale_id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  discount: number
  line_total: number
}

export type Payment = {
  id: string
  sale_id: string
  method: string
  amount: number
}

export type InventoryMovement = {
  id: string
  product_id: string | null
  change: number
  reason: string
  sale_id: string | null
  note: string | null
  created_at: string
  products?: { name: string } | null
}

export type CartItem = {
  product_id: string
  product_name: string
  unit: string
  unit_price: number
  quantity: number
  discount: number
  line_total: number
  stock: number
}

export type PaymentEntry = {
  method: 'efectivo' | 'tarjeta' | 'transferencia'
  amount: number
}
