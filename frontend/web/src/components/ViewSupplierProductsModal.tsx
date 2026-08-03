'use client'

import { useState } from 'react'

type Product = {
  id: number
  name: string
  sku: string | null
  category: string | null
  price: number
  quantity: number
  reorderLevel: number | null
  lowStock: boolean
}

function getProductTone(product: Product) {
  if (product.quantity === 0) return 'bg-red-50 text-red-700'
  if (product.lowStock) return 'bg-amber-50 text-amber-700'
  return 'bg-emerald-50 text-emerald-700'
}

function getProductLabel(product: Product) {
  if (product.quantity === 0) return 'Out of stock'
  if (product.lowStock) return 'Low stock'
  return 'In stock'
}

export default function ViewSupplierProductsModal({ supplierId, supplierName }: { supplierId: number; supplierName: string }) {
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  async function handleOpen() {
    setOpen(true)
    setLoading(true)
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/products`)
      const data = await res.json().catch(() => [])
      setProducts(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  const lowStockCount = products.filter((product) => product.lowStock && product.quantity > 0).length
  const outOfStockCount = products.filter((product) => product.quantity === 0).length

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 rounded-xl border border-paper-3 px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:bg-paper hover:text-ink"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
        </svg>
        Products
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="flex max-h-[76vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{supplierName}</h3>
                  <p className="mt-1 text-sm text-slate-500">Products from this supplier</p>
                </div>
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {!loading && products.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700">
                    {products.length} product{products.length !== 1 ? 's' : ''}
                  </div>
                  <div className="rounded-full bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                    {lowStockCount} low stock
                  </div>
                  <div className="rounded-full bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    {outOfStockCount} out of stock
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-sm text-slate-400">Loading products...</div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2">
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                  </svg>
                  <p className="text-sm font-medium">No products from this supplier yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map((product) => (
                    <div key={product.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{product.name}</p>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                            {product.sku && <span className="font-mono">{product.sku}</span>}
                            {product.category && <span>{product.category}</span>}
                            {product.reorderLevel != null && <span>Reorder at {product.reorderLevel}</span>}
                          </div>
                        </div>

                        <div className="flex flex-col items-start gap-2 sm:items-end">
                          <p className="text-sm font-semibold text-slate-900">NPR {Number(product.price).toLocaleString()}</p>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getProductTone(product)}`}>
                            {getProductLabel(product)}
                          </span>
                          <p className="text-xs text-slate-500">{product.quantity} left</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
