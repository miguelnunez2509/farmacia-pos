'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  Receipt,
  Cross,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/pos', label: 'Punto de Venta', icon: ShoppingCart },
  { href: '/products', label: 'Productos', icon: Package },
  { href: '/inventory', label: 'Inventario', icon: BarChart3 },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/sales', label: 'Ventas', icon: Receipt },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-green-900 text-white flex flex-col shrink-0 no-print">
      <div className="p-5 border-b border-green-800">
        <div className="flex items-center gap-3">
          <div className="bg-green-700 rounded-lg p-2">
            <Cross className="h-5 w-5 text-green-200" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-none">Farmacia POS</h1>
            <p className="text-green-400 text-xs mt-0.5">Sistema de Ventas</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-green-700 text-white'
                  : 'text-green-200 hover:bg-green-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-green-800">
        <p className="text-green-500 text-xs text-center">© 2026 Farmacia POS</p>
      </div>
    </aside>
  )
}
