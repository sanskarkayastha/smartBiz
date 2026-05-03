import { requireSession, apiFetch } from '@/src/lib/session'
import AddProductModal from '@/src/components/AddProductModal'

type Product = {
  id: number
  name: string
  sku: string | null
  category: string | null
  price: number
  quantity: number
  reorderLevel: number | null
  supplier: string | null
}

function statusLabel(quantity: number, reorderLevel: number | null) {
  if (quantity === 0) return { text: 'Out of Stock', cls: 'bg-red-50 text-red-600' }
  if (reorderLevel !== null && quantity <= reorderLevel) return { text: 'Low Stock', cls: 'bg-yellow-50 text-yellow-700' }
  return { text: 'In Stock', cls: 'bg-green-50 text-green-700' }
}

export default async function InventoryPage() {
  const session = await requireSession()
  const products = await apiFetch<Product[]>('/inventory/products', session)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">{products?.length ?? 0} products</p>
        </div>
        <AddProductModal />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {products && products.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const status = statusLabel(p.quantity, p.reorderLevel)
                return (
                  <tr key={p.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      {p.supplier && <p className="text-xs text-gray-400">{p.supplier}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">{p.sku ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{p.category ?? '—'}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">NPR {Number(p.price).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">{p.quantity}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
                        {status.text}
                      </span>
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
            <p className="text-sm font-medium">No products yet</p>
            <p className="text-xs mt-1">Click &quot;Add Product&quot; to create your first product</p>
          </div>
        )}
      </div>
    </div>
  )
}
