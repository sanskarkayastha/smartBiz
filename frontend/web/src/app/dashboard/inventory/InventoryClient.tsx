'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AddProductModal from '@/src/components/AddProductModal'
import Pagination from '@/src/components/Pagination'

type Product = {
  id: number
  name: string
  sku: string | null
  category: string | null
  price: number
  costPrice: number | null
  quantity: number
  reorderLevel: number | null
  supplier: string | null
}

function statusLabel(quantity: number, reorderLevel: number | null) {
  if (quantity === 0) return { text: 'Out of Stock', cls: 'bg-red-50 text-red-600' }
  if (reorderLevel !== null && quantity <= reorderLevel) return { text: 'Low Stock', cls: 'bg-yellow-50 text-yellow-700' }
  return { text: 'In Stock', cls: 'bg-green-50 text-green-700' }
}

export default function InventoryClient({
  initialProducts,
  currentPage,
  totalPages,
  totalElements,
  pageSize,
}: {
  initialProducts: Product[]
  currentPage: number
  totalPages: number
  totalElements: number
  pageSize: number
}) {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)

  useEffect(() => { setProducts(initialProducts) }, [initialProducts])

  const filtered = products.filter((p) => {
    const term = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(term) ||
      (p.sku?.toLowerCase().includes(term) ?? false) ||
      (p.category?.toLowerCase().includes(term) ?? false) ||
      (p.supplier?.toLowerCase().includes(term) ?? false)
    )
  })

  async function handleDelete(product: Product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    setDeleting(product.id)
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        setProducts((prev) => prev.filter((p) => p.id !== product.id))
      }
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">{products.length} products</p>
        </div>
        <AddProductModal onClose={() => router.refresh()} />
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Search by name, SKU, category, or supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#135BEC] focus:border-transparent bg-white"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cost Price</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Selling Price</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const status = statusLabel(p.quantity, p.reorderLevel)
                return (
                  <tr key={p.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      {p.supplier && <p className="text-xs text-gray-400">{p.supplier}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">{p.sku ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{p.category ?? '—'}</td>
                    <td className="px-5 py-3 text-right text-gray-500">
                      {p.costPrice != null ? `NPR ${Number(p.costPrice).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">NPR {Number(p.price).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">{p.quantity}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <AddProductModal product={p} onClose={() => router.refresh()} />
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={deleting === p.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {deleting === p.id ? (
                            <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" opacity=".3"/><path d="M12 2a10 10 0 0110 10"/></svg>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          )}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            </svg>
            <p className="text-sm font-medium">
              {search ? 'No matching products' : 'No products yet'}
            </p>
            <p className="text-xs mt-1">
              {search ? 'Try a different search term' : 'Click "Add Product" to create your first product'}
            </p>
          </div>
        )}
        <Pagination
          basePath="/dashboard/inventory"
          currentPage={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
        />
      </div>
    </div>
  )
}
